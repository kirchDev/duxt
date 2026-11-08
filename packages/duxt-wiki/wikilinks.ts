export interface WikiToken {
  start: number;
  end: number;
  target: string;
  label: string;
  section: string;
}

/** Authored offsets; code stays literal and malformed openers are scanned once. */
function scanWikiTokens(text: string, markdown = true): WikiToken[] {
  const tokens: WikiToken[] = [];
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
    if (escaped) {
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
        section: hash < 0 ? '' : destination.slice(hash + 1).trim()
      });
    at = end + 2;
  }
  return tokens;
}

export function wikiTokens(text: string, markdown = true): WikiToken[] {
  return scanWikiTokens(text, markdown);
}

export function formatWikiMarkdown(
  text: string,
  resolve: (token: WikiToken) => string | undefined,
  body?: unknown
): string {
  let at = 0;
  const parts: string[] = [];
  const tokens = body === undefined ? wikiTokens(text) : wikiBodyTokens(body);
  // MDC normalizes CRLF before parsing; map its UTF-16 offsets back to the authored bytes.
  const offsets: number[] = [];
  if (body !== undefined && text.includes('\r\n')) {
    for (let index = 0; index < text.length; index++) {
      if (text[index] === '\r' && text[index + 1] === '\n') continue;
      offsets.push(index);
    }
    offsets.push(text.length);
  }
  for (const parsed of tokens) {
    const token = offsets.length
      ? { ...parsed, start: offsets[parsed.start]!, end: offsets[parsed.end]! }
      : parsed;
    if (
      token.start < at ||
      token.end > text.length ||
      token.start < 0 ||
      token.end <= token.start
    )
      continue;
    parts.push(text.slice(at, token.start));
    const href = resolve(token);
    const literal = token.label.replace(/[\\`*_{}[\]<>]|&(?=#?\w+;)/g, '\\$&');
    const label =
      token.label.startsWith('~/') && !token.label.slice(1).includes('~')
        ? literal
        : literal.replace(/~/g, '\\$&');
    parts.push(href ? `[${label}](${href.replace(/\)/g, '%29')})` : label);
    at = token.end;
  }
  return parts.join('') + text.slice(at);
}

/** ProseA receives website-root paths; stored body nodes are never rewritten. */
export function renderWikiBody(
  body: unknown,
  resolve: (token: WikiToken) => { href: string; wanted: boolean },
  rawbody?: string
): unknown {
  const textNodes = (text: string): unknown[] => {
    const parts: unknown[] = [];
    let at = 0;
    for (const token of wikiTokens(text, false)) {
      if (token.start > at) parts.push(text.slice(at, token.start));
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
        const token = wikiNodeToken(node);
        if (token) return wikiAnchor(token, resolve(token));
        return [
          tag,
          props,
          ...children.flatMap((child) =>
            typeof child === 'string' && rawbody === undefined
              ? textNodes(child)
              : [walk(child)]
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
  return walk(body);
}

/** Parser-owned unresolved spans survive Content compression and JSON storage. */
export function wikiNodeToken(node: unknown): WikiToken | undefined {
  if (!Array.isArray(node) || node[0] !== 'span') return;
  const value = node[1]?.dataDuxtWiki ?? node[1]?.['data-duxt-wiki'];
  if (typeof value !== 'string') return;
  try {
    const token = JSON.parse(value);
    if (
      typeof token.target === 'string' &&
      typeof token.label === 'string' &&
      typeof token.section === 'string' &&
      Number.isInteger(token.start) &&
      Number.isInteger(token.end)
    )
      return token;
  } catch {
    /* An ordinary author-supplied span is not parser evidence. */
  }
}
function wikiAnchor(token: WikiToken, link: { href: string; wanted: boolean }) {
  return [
    'a',
    {
      href: `~${link.href}`,
      ...(link.wanted
        ? { class: 'wiki-red-link', rel: 'nofollow', 'data-wiki-red-link': '' }
        : {})
    },
    token.label
  ];
}

/** One page's parser evidence, used by the machine formatter as well as HTML. */
export function wikiBodyTokens(body: unknown): WikiToken[] {
  const tokens: WikiToken[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      const token = wikiNodeToken(node);
      if (token) {
        tokens.push(token);
        return;
      }
      if (['a', 'pre', 'code', 'img'].includes(node[0])) return;
      for (const child of node) walk(child);
    } else if (node && typeof node === 'object') {
      const document = node as { value?: unknown; children?: unknown };
      walk(document.value ?? document.children);
    }
  };
  walk(body);
  return tokens;
}
