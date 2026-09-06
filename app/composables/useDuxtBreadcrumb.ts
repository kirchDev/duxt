import type { ContentNavigationItem } from '@nuxt/content';
import type { MaybeRefOrGetter } from 'vue';

/**
 * The trail from the section down to a page.
 *
 * Lives in a composable rather than in `DuxtBreadcrumb` because two things want
 * it: the component draws it, and the page emits it as `BreadcrumbList`
 * JSON-LD. Computing it twice is how the drawn trail and the structured one
 * would come to disagree.
 */
export async function useDuxtBreadcrumb(path: MaybeRefOrGetter<string>) {
  // EVERY composable call happens before the await, deliberately. This is a
  // plain async function, not a `<script setup>` block, so nothing restores the
  // Nuxt instance after an await inside it — a call placed below one dies with
  // E1001 and takes the whole page render with it. `useAsyncData`'s return is
  // awaitable as well as reactive, which is what lets the fetch be started here
  // and waited for at the end.
  const navigation = useDuxtNavigation();
  const { source } = useDuxtCollection();
  const { section } = useDuxtSection(navigation.data);

  const trail = computed<ContentNavigationItem[]>(() => {
    const current = toValue(path);

    // The trail starts at the section — the entry the reader clicked in the row
    // above — and continues with what lies below the source's own prefix.
    const below = trailBelowPrefix(
      navigation.data.value ?? [],
      current,
      source.value?.prefix ?? ''
    );

    const head = section.value?.to
      ? [
          {
            title: section.value.label,
            path: section.value.to
          } as ContentNavigationItem
        ]
      : [];

    // A section's index page is the section: both carry `/duxt/getting-started`,
    // so the trail listed the same destination twice under two names — the
    // config's label and the page's own title. Keep the first of each path.
    const seen = new Set<string>();

    return [...head, ...below].filter((item) => {
      const itemPath = item.path ?? '';
      if (seen.has(itemPath)) return false;

      seen.add(itemPath);
      return true;
    });
  });

  await navigation;

  return trail;
}
