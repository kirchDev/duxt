/**
 * Move focus to the page's own heading after a client-side navigation.
 *
 * Vue Router replaces the view without touching focus, so after a sidebar click
 * the focus is still on the link that was left behind: a keyboard reader's next
 * Tab continues down the sidebar, and a screen reader is told nothing at all
 * about the page that just arrived. Focusing the `<h1>` puts both back at the
 * top of the new document.
 *
 * Not on the first paint. On a full load the focus is already at the start of
 * the document, and taking it would scroll past the header before the reader
 * has seen the page — so only a route CHANGE moves it.
 *
 * The announcement is a separate job, done by `<NuxtRouteAnnouncer>` in
 * `app.vue`, which reads the new title into a live region.
 */
export function useDuxtPageFocus() {
  const heading = ref<HTMLElement | null>(null);
  const route = useRoute();

  watch(
    () => route.fullPath,
    async () => {
      await nextTick();
      heading.value?.focus();
    }
  );

  return heading;
}
