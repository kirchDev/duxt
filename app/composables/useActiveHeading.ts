/**
 * The heading currently in view, for marking the table of contents.
 *
 * An IntersectionObserver over the rendered headings rather than a scroll
 * handler: it fires only when something crosses the threshold, and the
 * rootMargin puts the trigger line near the top of the viewport so a heading
 * counts as current once it reaches reading position, not when it first peeks
 * in at the bottom.
 */
export function useActiveHeading(ids: Ref<string[]>) {
  const active = ref<string>();

  let observer: IntersectionObserver | undefined;

  function observe() {
    observer?.disconnect();
    if (!ids.value.length) return;

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) active.value = visible[0].target.id;
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    for (const id of ids.value) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
  }

  onMounted(observe);
  watch(ids, () => nextTick(observe));
  onBeforeUnmount(() => observer?.disconnect());

  return active;
}
