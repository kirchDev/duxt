/**
 * Read the stored package manager before the app renders.
 *
 * Reading it in a component's onMounted is one tick too late: the server sends
 * the default, Vue hydrates with the default, and only then does the tab jump
 * — pnpm flicking to npm in front of the reader. Nuxt plugins run before the
 * app mounts, so the state is already right when the first frame is painted.
 */
export default defineNuxtPlugin({
  name: 'duxt:package-manager',
  enforce: 'pre',
  setup() {
    const manager = useState<string | undefined>(
      'duxt-package-manager',
      () => undefined
    );

    try {
      const stored = window.localStorage.getItem('duxt:package-manager');
      if (stored) manager.value = stored;
    } catch {
      // Storage can be blocked entirely; the default stands.
    }
  }
});
