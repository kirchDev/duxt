import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { collectWikiMetadata } from '../metadata';
import { formatWikiMarkdown, renderWikiBody } from '../wikilinks';
import remarkWikilinks from '../remark-wikilinks';

const require = createRequire(import.meta.url);
const contentRequire = createRequire(require.resolve('@nuxt/content'));
const { parseMarkdown } = await import(
  pathToFileURL(
    join(dirname(contentRequire.resolve('@nuxtjs/mdc')), 'runtime/index.js')
  ).href
);
const { fromHast } = await import(
  pathToFileURL(contentRequire.resolve('minimark/hast')).href
);

async function render(rawbody: string) {
  const parsed = await parseMarkdown(rawbody, {
    highlight: false,
    remark: { plugins: { wiki: { instance: remarkWikilinks } } }
  });
  const body = fromHast(parsed.body);
  const page: Record<string, unknown> = { rawbody, body };
  const before = JSON.stringify(body);
  collectWikiMetadata(page);
  const rendered = renderWikiBody(
    body,
    (token) => ({
      href: `/wiki/${token.target.toLowerCase().replace('~/wiki/', '')}`,
      wanted: false
    }),
    rawbody
  );
  expect(JSON.stringify(body)).toBe(before);
  expect(page.rawbody).toBe(rawbody);
  return { page, body, rendered, text: JSON.stringify(rendered) };
}

it('keeps image alt twins and escaped occurrences literal', async () => {
  const { page, text } = await render(
    '![x [[Twin]]](image.png) and \\[[Twin]]'
  );
  expect(page.links).toEqual([]);
  expect(text).not.toContain('~/wiki/twin');
  expect(text).toContain('[[Twin]]');
});

it('resolves the valid occurrence after an ordinary anchor and escaped twin', async () => {
  const { page, text } = await render(
    '[ordinary [[Twin]]](https://example.com) and \\[[Twin]] and [[Twin]]'
  );
  expect(page.links).toEqual([
    { target: 'https://example.com', kind: 'markdown' },
    { target: 'Twin', kind: 'wiki' }
  ]);
  expect(text).toContain('"ordinary [[Twin]]"');
  expect(text).toContain(
    '" and [[Twin]] and ",["a",{"href":"~/wiki/twin"},"Twin"]'
  );
});

it('decodes an authored entity label with native Markdown semantics', async () => {
  const { page, text } = await render('[[Twin|R&amp;D]]');
  expect(page.links).toEqual([{ target: 'Twin', kind: 'wiki' }]);
  expect(text).toContain('["a",{"href":"~/wiki/twin"},"R&D"]');
});

it('preserves the authored strike on only the second root link', async () => {
  const { text } = await render('[[~/wiki/First]] and ~~[[~/wiki/Second]]~~');
  expect(text).toContain(
    '["del",{},["a",{"href":"~/wiki/second"},"~/wiki/Second"]]'
  );
  expect(text).toContain('["a",{"href":"~/wiki/first"},"~/wiki/First"]');
  expect(text).not.toContain('~~');
});

it('uses parser occurrence offsets for machine Markdown across protected contexts and entity labels', async () => {
  const rawbody =
    '---\ntitle: "[[Frontmatter]]"\n---\n\n  😀 é before\n\n[ordinary [[Twin]]](https://example.com) and \\[[Twin]] and [[Twin|R&amp;D]]\n\n![x [[Twin]]](image.png)\n\n    [[Indented]]\n\n`[[Inline]]`\n\n```md\n[[Fenced]]\n```';
  const { body } = await render(rawbody);
  const markdown = rawbody.slice(rawbody.indexOf('---\n', 4) + 4).trim();
  expect(formatWikiMarkdown(markdown, () => '/wiki/twin', body)).toBe(
    '😀 é before\n\n[ordinary [[Twin]]](https://example.com) and \\[[Twin]] and [R&D](/wiki/twin)\n\n![x [[Twin]]](image.png)\n\n    [[Indented]]\n\n`[[Inline]]`\n\n```md\n[[Fenced]]\n```'
  );
});

it.each([
  '[[Twin]](/ordinary)',
  '[ordinary [[Twin]]](https://example.com)',
  '[ordinary [[Twin]]][ref]\n\n[ref]: /ordinary',
  '![x [[Twin]]](image.png)',
  '`[[Twin]]`',
  '    [[Twin]]',
  '```md\n[[Twin]]\n```'
])(
  'keeps protected occurrences separate from valid/escaped twins in both orders: %s',
  async (protectedText) => {
    for (const twins of [
      '\\[[Twin]] and [[Twin]]',
      '[[Twin]] and \\[[Twin]]'
    ]) {
      for (const rawbody of [
        protectedText + '\n\n' + twins,
        twins + '\n\n' + protectedText
      ]) {
        const { page, body, text } = await render(rawbody);
        expect(
          (page.links as { kind: string }[]).filter(
            (link) => link.kind === 'wiki'
          )
        ).toEqual([{ target: 'Twin', kind: 'wiki' }]);
        expect(text.match(/"href":"~\/wiki\/twin"/g)).toHaveLength(1);
        const expected = rawbody.replace(
          twins,
          twins.replace(/(?<!\\)\[\[Twin\]\]/g, '[Twin](/wiki/twin)')
        );
        expect(
          formatWikiMarkdown(rawbody.trim(), () => '/wiki/twin', body)
        ).toBe(expected.trim());
      }
    }
  }
);

it('keeps adjacent tokens, malformed ordinary-link tails and native reference precedence', async () => {
  const { body, text } = await render(
    '[[Twin]][[Twin]] and [[Twin]](unfinished and [[Twin]][ref]\n\n[ref]: /ordinary'
  );
  expect(text.match(/"href":"~\/wiki\/twin"/g)).toHaveLength(3);
  expect(text).toContain('"href":"/ordinary"');
  expect(
    formatWikiMarkdown(
      '[[Twin]][[Twin]] and [[Twin]](unfinished and [[Twin]][ref]\n\n[ref]: /ordinary',
      () => '/wiki/twin',
      body
    )
  ).toBe(
    '[Twin](/wiki/twin)[Twin](/wiki/twin) and [Twin](/wiki/twin)(unfinished and [[Twin]][ref]\n\n[ref]: /ordinary'
  );
});

it('decodes native string entities and escapes without reinterpreting encoded delimiters', async () => {
  const { body, text } = await render(
    '[[Twin|R&amp;D &#x1F600; &copy; A&#93;B &#124; C\\|D \\*literal\\* &amp;copy;]]'
  );
  expect(text).toContain('R&D 😀 © A]B | C|D *literal* &copy;');
  const markdown = formatWikiMarkdown(
    '[[Twin|R&amp;D &#x1F600; &copy; A&#93;B &#124; C\\|D \\*literal\\* &amp;copy;]]',
    () => '/wiki/twin',
    body
  );
  const parsed = await parseMarkdown(markdown, { highlight: false });
  expect(JSON.stringify(parsed.body)).toContain(
    'R&D 😀 © A]B | C|D *literal* &copy;'
  );
  expect(JSON.stringify(parsed.body)).not.toContain('"tag":"em"');
});

it.each(['\n', '\r\n'])(
  'maps native offsets over frontmatter, leading whitespace, Unicode and %j',
  async (newline) => {
    const rawbody = [
      '---',
      'title: "[[Frontmatter]]"',
      '---',
      '',
      '  😀 é before',
      '',
      '[[Twin|R&amp;D]] and [[~/wiki/Twin]]',
      ''
    ].join(newline);
    const { body, page } = await render(rawbody);
    expect(page.links).toEqual([
      { target: 'Twin', kind: 'wiki' },
      { target: '~/wiki/Twin', kind: 'wiki' }
    ]);
    const markdown = [
      '😀 é before',
      '',
      '[[Twin|R&amp;D]] and [[~/wiki/Twin]]'
    ].join(newline);
    expect(formatWikiMarkdown(markdown, () => '/wiki/twin', body)).toBe(
      [
        '😀 é before',
        '',
        '[R&D](/wiki/twin) and [~/wiki/Twin](/wiki/twin)'
      ].join(newline)
    );
  }
);

it('bounds repeated malformed openers in the genuine native parser', async () => {
  const result = await promisify(execFile)(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
    import remarkWikilinks from ${JSON.stringify(new URL('../remark-wikilinks.ts', import.meta.url).href)};
    const { parseMarkdown } = await import(${JSON.stringify(pathToFileURL(join(dirname(contentRequire.resolve('@nuxtjs/mdc')), 'runtime/index.js')).href)});
    const parsed = await parseMarkdown('[['.repeat(20000) + '\\n[[Twin]]', { highlight: false, remark: { plugins: { wiki: { instance: remarkWikilinks } } } });
    process.stdout.write(JSON.stringify(parsed.body));
  `
    ],
    { timeout: 10000, maxBuffer: 1024 * 1024 }
  );
  expect(result.stdout).toContain('dataDuxtWiki');
  expect(result.stdout).toContain('Twin');
}, 15000);

it('keeps native Wiki nodes inside MDC component rows and rich target names', async () => {
  for (const authored of [
    String.raw`[[Target0: Farmer's 🚀; C:\path]]`,
    '::infobox\n:::infobox-row{label="Release"}\n[Release notes](/sprint) and [[Sprint|label]]\n:::\n::'
  ]) {
    const { page, body } = await render(authored);
    expect(
      (page.links as { kind: string }[]).filter((link) => link.kind === 'wiki'),
      JSON.stringify(body)
    ).toHaveLength(1);
    expect(JSON.stringify(body)).toContain('[[');
    if (authored.startsWith('::'))
      expect(JSON.stringify(body)).toContain('[[Sprint|label]]');
  }
});

it('keeps Unicode offsets and nested MDC contexts stable when one native processor is reused', async () => {
  const { createMarkdownParser } = await import(
    pathToFileURL(
      join(dirname(contentRequire.resolve('@nuxtjs/mdc')), 'runtime/index.js')
    ).href
  );
  const parse = await createMarkdownParser({
    highlight: false,
    remark: { plugins: { wiki: { instance: remarkWikilinks } } }
  });
  for (const rawbody of [
    '🚀 [[Twin|First]] and [[Twin|Second]]',
    '::callout\n🚀 [ordinary [[Twin]]](/ordinary) and [[Twin|Nested]]\n::',
    '\\[[Twin]] and [[Twin]]',
    '[[Twin]](/ordinary) and [[Twin]]'
  ]) {
    const parsed = await parse(rawbody);
    const body = fromHast(parsed.body);
    const before = JSON.stringify(body);
    const page: Record<string, unknown> = { rawbody, body };
    collectWikiMetadata(page);
    expect(
      (page.links as { kind: string }[]).filter((link) => link.kind === 'wiki')
    ).toHaveLength(1);
    const markdown = formatWikiMarkdown(rawbody, () => '/wiki/twin', body);
    expect(markdown).toContain('(/wiki/twin)');
    if (rawbody.startsWith('🚀'))
      expect(markdown).toBe('🚀 [First](/wiki/twin) and [Second](/wiki/twin)');
    expect(JSON.stringify(body)).toBe(before);
  }
});
