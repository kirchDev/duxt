let queue: Promise<unknown> = Promise.resolve();

/** Mermaid owns global configuration: initialise and render as one operation. */
export function renderDuxtMermaid(
  id: string,
  source: string,
  dark: boolean,
  current: () => boolean = () => true
): Promise<string> {
  const render = queue
    .catch(() => {})
    .then(async () => {
      if (!current()) return '';
      const mermaid = (await import('mermaid')).default;
      if (!current()) return '';
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: dark ? 'dark' : 'default'
      });
      try {
        return (await mermaid.render(id, source)).svg;
      } finally {
        // A parser failure can leave Mermaid's temporary render container behind.
        document.getElementById(`d${id}`)?.remove();
      }
    });
  queue = render;
  return render;
}
