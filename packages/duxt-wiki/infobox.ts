export interface InfoboxData {
  type: string;
  values: Record<string, string>;
}

type Node = {
  tag: string;
  props: Record<string, unknown>;
  children: unknown[];
};

function node(value: unknown): Node | undefined {
  if (
    Array.isArray(value) &&
    typeof value[0] === 'string' &&
    value[1] &&
    typeof value[1] === 'object' &&
    !Array.isArray(value[1])
  )
    return { tag: value[0], props: value[1], children: value.slice(2) };
}

function children(value: unknown): unknown[] {
  const element = node(value);
  if (element) return element.children;
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const body = value as { value?: unknown[]; children?: unknown[] };
    return body.value ?? body.children ?? [];
  }
  return [];
}

/** Labels are prose; the target and markup are not part of a fact's text. */
function wikiLabels(text: string): string {
  let result = '';
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('[[', cursor);
    if (start === -1) return result + text.slice(cursor);
    result += text.slice(cursor, start);
    let end = start + 2;
    while (end < text.length && text[end] !== ']' && text[end] !== '\n') end++;
    if (end > start + 2 && text[end] === ']' && text[end + 1] === ']') {
      const authored = text.slice(start + 2, end);
      const pipe = authored.indexOf('|');
      result += pipe < 0 ? authored : authored.slice(pipe + 1);
      cursor = end + 2;
    } else {
      result += text.slice(start, end + 1);
      cursor = end + 1;
    }
  }
  return result;
}

function text(value: unknown, literal = false): string {
  if (typeof value === 'string') return literal ? value : wikiLabels(value);
  const element = node(value);
  const tag = element?.tag ?? '';
  const content = children(value)
    .map((child) => text(child, literal || tag === 'code' || tag === 'pre'))
    .join('');
  return /^(?:p|div|li|br|h[1-6])$/.test(tag) ? `${content} ` : content;
}

/** Persist facts before Vue consumes `key`; leave the authored body untouched. */
export function collectInfobox(page: Record<string, unknown>): void {
  let found: InfoboxData | undefined;
  const visit = (value: unknown): void => {
    if (found) return;
    const element = node(value);
    if (element?.tag === 'infobox') {
      const values: Record<string, string> = Object.create(null);
      const rows = (child: unknown): void => {
        const row = node(child);
        if (row?.tag === 'infobox') return;
        if (row?.tag === 'infobox-row') {
          const key =
            String(row.props.key ?? '').trim() ||
            String(row.props.label ?? '').trim();
          if (key)
            values[key] = row.children
              .map((part) => text(part))
              .join('')
              .replace(/\s+/g, ' ')
              .trim();
        } else for (const part of children(child)) rows(part);
      };
      element.children.forEach(rows);
      found = { type: String(element.props.type ?? ''), values };
      return;
    }
    for (const child of children(value)) visit(child);
  };
  visit(page.body);
  page.infobox = found ?? null;
}
