import { afterEach, expect, it, vi } from 'vitest';
const renderer = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: renderer }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  vi.resetModules();
});
it('serialises global theme configuration with rendering and recovers after failure', async () => {
  vi.stubGlobal('document', { getElementById: () => null });
  const { renderDuxtMermaid } = await import('../app/utils/mermaid-render');
  let finish!: (value: { svg: string }) => void;
  renderer.render
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    )
    .mockRejectedValueOnce(new Error('Invalid source'))
    .mockResolvedValueOnce({ svg: '<svg id="third"/>' });
  const first = renderDuxtMermaid('first', 'graph TD; A-->B', false);
  await vi.waitFor(() => expect(renderer.render).toHaveBeenCalledOnce());
  const second = renderDuxtMermaid('second', 'invalid', true);
  const third = renderDuxtMermaid('third', 'graph TD; C-->D', false);
  expect(renderer.initialize).toHaveBeenCalledOnce();
  finish({ svg: '<svg id="first"/>' });
  await first;
  await expect(second).rejects.toThrow('Invalid source');
  await expect(third).resolves.toContain('third');
  expect(
    renderer.initialize.mock.calls.map(([options]) => options.theme)
  ).toEqual(['default', 'dark', 'default']);
  expect(
    renderer.initialize.mock.calls.every(
      ([options]) => options.securityLevel === 'strict'
    )
  ).toBe(true);
});
