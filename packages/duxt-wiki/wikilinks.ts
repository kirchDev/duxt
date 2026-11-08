export interface WikiToken {
  start: number;
  end: number;
  target: string;
  label: string;
  section: string;
}

/** Authored offsets; code stays literal and malformed openers are scanned once. */
function scanWikiTokens(
  text: string,
  markdown = true,
  includeEscaped = false
): (WikiToken & { escaped?: boolean })[] {
  const tokens: (WikiToken & { escaped?: boolean })[] = [];
  let fence = '';
  let inline = 0;
  for (let at = 0; at < text.length;) {
    if (markdown && (at === 0 || text[at - 1] === '\n')) {
      const end = text.indexOf('\n', at);
      const line = text.slice(at, end < 0 ? text.length : end);
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (
          marker &&
          marker[1]![0] === fence[0] &&
          marker[1]!.length >= fence.length &&
          !marker[2]!.trim()
        )
          fence = '';
        at = end < 0 ? text.length : end + 1;
        continue;
      }
      if (!inline && marker) {
        fence = marker[1]!;
        at = end < 0 ? text.length : end + 1;
        continue;
      }
    }
    if (markdown && text[at] === '`') {
      let end = at + 1;
      while (text[end] === '`') end++;
      const size = end - at;
      if (inline === size) inline = 0;
      else if (!inline && text.indexOf('`'.repeat(size), end) !== -1)
        inline = size;
      at = end;
      continue;
    }
    if (inline || text[at] !== '[' || text[at + 1] !== '[') {
      at++;
      continue;
    }
    let slashes = 0;
    for (let before = at - 1; text[before] === '\\'; before--) slashes++;
    const escaped = markdown && slashes % 2 === 1;
    if (escaped && !includeEscaped) {
      at += 2;
      continue;
    }
    let end = at + 2;
    while (end < text.length && text[end] !== ']' && text[end] !== '\n') end++;
    if (text[end] !== ']' || text[end + 1] !== ']') {
      at = end + 1;
      continue;
    }
    const inside = text.slice(at + 2, end);
    const separator = inside.indexOf('|');
    const destination = (
      separator < 0 ? inside : inside.slice(0, separator)
    ).trim();
    const hash = destination.indexOf('#');
    const target = (hash < 0 ? destination : destination.slice(0, hash)).trim();
    if (target)
      tokens.push({
        start: at,
        end: end + 2,
        target,
        label: separator < 0 ? destination : inside.slice(separator + 1).trim(),
        section: hash < 0 ? '' : destination.slice(hash + 1).trim(),
        ...(escaped ? { escaped: true } : {})
      });
    at = end + 2;
  }
  return tokens;
}

export function wikiTokens(text: string, markdown = true): WikiToken[] {
  return scanWikiTokens(text, markdown);
}

const bodyMarkdown = (rawbody: string) =>
  rawbody.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');

/** Match visible AST tokens to authored occurrences, retaining escaped twins as text. */
export function wikiTokenOccurrences(
  rawbody?: string
): (spelling: string) => boolean {
  if (rawbody === undefined) return () => true;
  const markdown = bodyMarkdown(rawbody);
  const occurrences = new Map<string, { escaped: boolean[]; at: number }>();
  for (const token of scanWikiTokens(markdown, true, true)) {
    const spelling = markdown.slice(token.start, token.end);
    const queue = occurrences.get(spelling) ?? { escaped: [], at: 0 };
    queue.escaped.push(Boolean(token.escaped));
    occurrences.set(spelling, queue);
  }
  return (spelling) => {
    const queue = occurrences.get(spelling);
    if (!queue || queue.at >= queue.escaped.length) return false;
    return !queue.escaped[queue.at++];
  };
}

export function formatWikiMarkdown(
  text: string,
  resolve: (token: WikiToken) => string | undefined
): string {
  let at = 0;
  const parts: string[] = [];
  for (const token of wikiTokens(text)) {
    parts.push(text.slice(at, token.start));
    const href = resolve(token);
    const label = token.label.replace(/[\\[\]]/g, '\\$&');
    parts.push(
      href ? `[${label}](${href.replace(/\)/g, '%29')})` : token.label
    );
    at = token.end;
  }
  return parts.join('') + text.slice(at);
}

/** Restore only GFM strike boundaries proven to belong to authored Wiki escapes. */
export function wikiBodyView(body: unknown, rawbody?: string): unknown {
  if (!rawbody?.includes('~/')) return body;
  const markdown = bodyMarkdown(rawbody);
  const authored = new Set(
    wikiTokens(markdown).map((token) => markdown.slice(token.start, token.end))
  );
  const repair = (children: unknown[]): unknown[] => {
    let text = '';
    const strikes: { node: unknown[]; start: number; end: number }[] = [];
    for (const child of children) {
      if (typeof child === 'string') text += child;
      else if (Array.isArray(child) && child[0] === 'del') {
        const start = text.length;
        text += '~';
        for (const nested of child.slice(2))
          text += typeof nested === 'string' ? nested : '\n';
        const end = text.length;
        text += '~';
        strikes.push({ node: child, start, end });
      } else text += '\n';
    }
    const boundaries = new Map(
      wikiTokens(text, false)
        .filter(
          (token) =>
            token.target.startsWith('~/') &&
            authored.has(text.slice(token.start, token.end))
        )
        .map((token) => [
          token.start + 2 + /^\s*/.exec(text.slice(token.start + 2))![0].length,
          token
        ])
    );
    const unwrap = new Set(
      strikes
        .filter(({ start, end }) => {
          const first = boundaries.get(start);
          const second = boundaries.get(end);
          return first || second;
        })
        .map(({ node }) => node)
    );
    const result: unknown[] = [];
    for (const child of children.flatMap((child) =>
      unwrap.has(child as unknown[])
        ? ['~', ...(child as unknown[]).slice(2), '~']
        : [child]
    )) {
      if (typeof child === 'string' && typeof result.at(-1) === 'string')
        result[result.length - 1] = String(result.at(-1)) + child;
      else result.push(child);
    }
    return result;
  };
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      const [tag, props, ...children] = node;
      if (
        typeof tag === 'string' &&
        props &&
        typeof props === 'object' &&
        !Array.isArray(props)
      ) {
        if (['code', 'pre', 'a'].includes(tag)) return node;
        return [tag, props, ...repair(children.map(walk))];
      }
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const document = node as Record<string, unknown>;
      return {
        ...document,
        ...(document.value ? { value: walk(document.value) } : {}),
        ...(document.children ? { children: walk(document.children) } : {})
      };
    }
    return node;
  };
  return walk(body);
}

/** ProseA receives website-root paths; stored body nodes are never rewritten. */
export function renderWikiBody(
  body: unknown,
  resolve: (token: WikiToken) => { href: string; wanted: boolean },
  rawbody?: string
): unknown {
  const authored = wikiTokenOccurrences(rawbody);
  const textNodes = (text: string): unknown[] => {
    const parts: unknown[] = [];
    let at = 0;
    for (const token of wikiTokens(text, false)) {
      if (token.start > at) parts.push(text.slice(at, token.start));
      if (!authored(text.slice(token.start, token.end))) {
        parts.push(text.slice(token.start, token.end));
        at = token.end;
        continue;
      }
      const link = resolve(token);
      parts.push([
        'a',
        {
          href: `~${link.href}`,
          ...(link.wanted
            ? {
                class: 'wiki-red-link',
                rel: 'nofollow',
                'data-wiki-red-link': ''
              }
            : {})
        },
        token.label
      ]);
      at = token.end;
    }
    if (at < text.length) parts.push(text.slice(at));
    return parts;
  };
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      const [tag, props, ...children] = node;
      if (
        typeof tag === 'string' &&
        props &&
        typeof props === 'object' &&
        !Array.isArray(props)
      ) {
        if (['code', 'pre', 'a'].includes(tag)) return node;
        return [
          tag,
          props,
          ...children.flatMap((child) =>
            typeof child === 'string' ? textNodes(child) : [walk(child)]
          )
        ];
      }
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const document = node as Record<string, unknown>;
      return {
        ...document,
        ...(document.value ? { value: walk(document.value) } : {}),
        ...(document.children ? { children: walk(document.children) } : {})
      };
    }
    return node;
  };
  return walk(wikiBodyView(body, rawbody));
}
