/**
 * Highlight a shell command with the same themes the Markdown fences use.
 *
 * The package-manager block builds its command at runtime from a prop, so it
 * never passes through Content's pipeline and came out as flat text beside
 * fences that were coloured. This runs on the server through useAsyncData, so
 * Shiki stays out of the client bundle and the result ships as markup.
 *
 * `defaultColor: false` emits both themes as custom properties per token,
 * matching how Content's own output is styled.
 */
let highlighter:
  | Promise<{ codeToHtml: (code: string, options: object) => string }>
  | undefined;

export async function highlightShell(code: string): Promise<string> {
  const { createHighlighter } = await import('shiki');

  // One highlighter for the process: loading the grammar per call would repeat
  // the most expensive part of this for every command on the page.
  highlighter ??= createHighlighter({
    langs: ['bash'],
    themes: ['github-light', 'github-dark']
  }) as never;

  const shiki = await highlighter;

  return shiki.codeToHtml(code, {
    lang: 'bash',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false
  });
}
