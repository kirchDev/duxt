// The structural subset used from micromark/mdast keeps this parser extension
// dependency-free; MDC owns the parser and its native string/entity decoding.
type Code = number | null;
type State = (code: Code) => State | undefined;
interface Token {
  type: string;
  start: { offset: number };
  end: { offset: number };
}
interface Effects {
  enter(type: string, fields?: Record<string, unknown>): Token;
  exit(type: string): Token;
  consume(code: Code): void;
}
interface Node {
  type: string;
  value?: string;
  children?: Node[];
  position?: { start: { offset: number }; end: { offset: number } };
  data?: { hName?: string; hProperties?: Record<string, unknown> };
  wikiParts?: Partial<Record<'Target' | 'Section' | 'Label', string>>;
}
interface Compiler {
  stack: Node[];
  enter(node: Node, token: Token): void;
  exit(token: Token): void;
  buffer(): void;
  resume(): string;
}

/** Wiki syntax is consumed before GFM; lookups never run in the parser. */
export default function remarkWikilinks(this: {
  data(): Record<string, unknown[]>;
  parser: (source: string) => Node;
}) {
  const data = this.data();
  const nativeParser = this.parser;
  let protectedRanges: { start: number; end: number }[] = [];
  const extension = {
    text: {
      91: {
        name: 'duxtWiki',
        tokenize: function (
          this: Tokenizer,
          effects: Effects,
          ok: State,
          nok: State
        ) {
          const offset = this.now().offset;
          let low = 0;
          let high = protectedRanges.length;
          while (low < high) {
            const middle = (low + high) >>> 1;
            if (protectedRanges[middle]!.end <= offset) low = middle + 1;
            else high = middle;
          }
          const range = protectedRanges[low];
          return range && range.start <= offset
            ? nok
            : tokenize.call(this, effects, ok, nok);
        }
      }
    }
  };
  (data.micromarkExtensions ??= []).push(extension);
  this.parser = (source) => {
    if (!source.includes('[[')) return nativeParser(source);
    // Let the native parser decide actual anchors/references/images first. Its
    // source ranges, rather than raw spelling, protect ordinary Markdown syntax.
    const extensions = data.micromarkExtensions!;
    let native: Node;
    try {
      data.micromarkExtensions = extensions.filter(
        (item) => item !== extension
      );
      native = nativeParser(source);
    } finally {
      data.micromarkExtensions = extensions;
    }
    protectedRanges = [];
    const protect = (node: Node) => {
      if (
        [
          'link',
          'linkReference',
          'image',
          'imageReference',
          'code',
          'inlineCode'
        ].includes(node.type) &&
        node.position
      ) {
        protectedRanges.push({
          start: node.position.start.offset,
          end: node.position.end.offset
        });
        return;
      }
      for (const child of node.children ?? []) protect(child);
    };
    protect(native);
    try {
      return nativeParser(source);
    } finally {
      protectedRanges = [];
    }
  };
  (data.fromMarkdownExtensions ??= []).push({
    enter: {
      duxtWiki(this: Compiler, token: Token) {
        this.enter({ type: 'duxtWiki', value: '', wikiParts: {} }, token);
      },
      duxtWikiTarget(this: Compiler) {
        this.buffer();
      },
      duxtWikiSection(this: Compiler) {
        this.buffer();
      },
      duxtWikiLabel(this: Compiler) {
        this.buffer();
      }
    },
    exit: {
      duxtWikiTarget(this: Compiler) {
        const value = this.resume();
        this.stack.at(-1)!.wikiParts!.Target = value;
      },
      duxtWikiSection(this: Compiler) {
        const value = this.resume();
        this.stack.at(-1)!.wikiParts!.Section = value;
      },
      duxtWikiLabel(this: Compiler) {
        const value = this.resume();
        this.stack.at(-1)!.wikiParts!.Label = value;
      },
      duxtWiki(this: Compiler, token: Token) {
        const node = this.stack.at(-1)!;
        const parts = node.wikiParts!;
        const destination = (
          parts.Target +
          (parts.Section === undefined ? '' : '#' + parts.Section)
        ).trim();
        node.value =
          '[[' +
          destination +
          (parts.Label === undefined ? '' : '|' + parts.Label) +
          ']]';
        node.children = [{ type: 'text', value: node.value }];
        const target = (parts.Target ?? '').trim();
        if (target)
          node.data = {
            hName: 'span',
            hProperties: {
              'data-duxt-wiki': JSON.stringify({
                target,
                label: parts.Label?.trim() ?? destination,
                section: parts.Section?.trim() ?? ''
              })
            }
          };
        else node.type = 'text';
        delete node.wikiParts;
        this.exit(token);
      }
    }
  });
  return (tree: Node, file: { value: unknown }) => {
    const source = String(file.value);
    // Core's machine readers strip frontmatter and trim the prose. Store offsets
    // in that same normalized view; rawbody itself is never rewritten.
    const leading = source.length - source.trimStart().length;
    const walk = (node: Node, protectedContext = false) => {
      const blocked =
        protectedContext ||
        [
          'link',
          'linkReference',
          'image',
          'imageReference',
          'code',
          'inlineCode'
        ].includes(node.type);
      if (node.data?.hProperties?.['data-duxt-wiki']) {
        if (blocked) {
          delete node.data;
          node.type = 'text';
        } else {
          const token = JSON.parse(
            String(node.data.hProperties['data-duxt-wiki'])
          );
          token.start = node.position!.start.offset - leading;
          token.end = node.position!.end.offset - leading;
          node.data.hProperties['data-duxt-wiki'] = JSON.stringify(token);
        }
      }
      for (const child of node.children ?? []) walk(child, blocked);
    };
    walk(tree);
  };
}

interface Tokenizer {
  parser: object;
  now(): { offset: number };
}
const failedRanges = new WeakMap<object, { start: number; end: number }>();
function tokenize(
  this: Tokenizer,
  effects: Effects,
  ok: State,
  nok: State
): State {
  const context = this;
  const start = context.now().offset;
  const failed = failedRanges.get(context.parser);
  if (failed && start > failed.start && start < failed.end) return nok;
  const rejectRange = (code: Code) => {
    // Nested malformed openers share the same first closing bracket/line end.
    // Remember that failed scan so speculative parsing remains linear.
    failedRanges.set(context.parser, { start, end: context.now().offset });
    return nok(code);
  };
  let count = 0;
  let part = 'Target';
  return open;
  function open(code: Code): State | undefined {
    if (code !== 91) return nok(code);
    if (!count) effects.enter('duxtWiki');
    effects.enter('duxtWikiMarker');
    effects.consume(code);
    effects.exit('duxtWikiMarker');
    if (++count === 2) {
      effects.enter('duxtWikiTarget');
      effects.enter('chunkString', { contentType: 'string' });
      return value;
    }
    return open;
  }
  function value(code: Code): State | undefined {
    if (code === null || code === -4 || code === -5 || code === -3)
      return rejectRange(code);
    if (code === 93) {
      effects.exit('chunkString');
      effects.exit('duxtWiki' + part);
      effects.enter('duxtWikiMarker');
      effects.consume(code);
      return close;
    }
    if (
      (code === 35 && part === 'Target') ||
      (code === 124 && part !== 'Label')
    ) {
      effects.exit('chunkString');
      effects.exit('duxtWiki' + part);
      effects.enter('duxtWikiMarker');
      effects.consume(code);
      effects.exit('duxtWikiMarker');
      part = code === 35 ? 'Section' : 'Label';
      effects.enter('duxtWiki' + part);
      effects.enter('chunkString', { contentType: 'string' });
      return value;
    }
    effects.consume(code);
    return code === 92 ? escaped : value;
  }
  function escaped(code: Code): State | undefined {
    if (code === null || code === -4 || code === -5 || code === -3)
      return rejectRange(code);
    effects.consume(code);
    return value;
  }
  function close(code: Code): State | undefined {
    if (code !== 93) return rejectRange(code);
    effects.consume(code);
    effects.exit('duxtWikiMarker');
    effects.exit('duxtWiki');
    return ok;
  }
}
