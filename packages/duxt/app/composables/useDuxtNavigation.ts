import type { ContentNavigationItem } from '@nuxt/content';
import { tfplugindocsNavigation } from '../../build/sources/tfplugindocs';

/**
 * Which collections the navigation is being fetched from.
 *
 * `useState`, and neither a module-level ref nor a closure, because the two
 * obvious options each break one half of this:
 *
 *  - A MODULE-LEVEL ref is one variable shared by every request the server has
 *    in flight. With two of them and two awaits in the handler below, one
 *    request could read what another had just written — the server then
 *    rendered one collection's navigation and the browser another, and the
 *    hydration mismatch took the page down with it.
 *  - A CLOSURE is a new function on every call, and Nuxt compares handlers by
 *    reference: several components asking for the same key with a handler each
 *    is NUXT_E3004, after which the first handler wins and the rest are
 *    silently ignored.
 *
 * `useState` is per request and reachable from a handler that stays one stable
 * function, which is what both halves need.
 */
const useNavigationSource = () =>
  useState('duxt-navigation-source', () => ({
    base: 'docs' as DuxtCollectionName,
    translation: 'docs' as DuxtCollectionName,
    // The base source's tfplugindocs prefix, or `undefined` for any other
    // flavour. Resolved in `useDuxtNavigation`, never in the handler — see
    // the note there.
    tfplugindocsPrefix: undefined as string | undefined
  }));

/**
 * The tree of the default language, wearing the translated titles.
 *
 * Never the translation's own tree: a partly translated documentation would
 * then lose every page it has not reached yet — pages the fallback serves
 * perfectly well, so hiding them from the sidebar leaves the reader with no way
 * to them at all. Structure from the original, wording from the translation;
 * see `overlayTranslations`.
 */
const handler = async (): Promise<ContentNavigationItem[]> => {
  // Read BEFORE the first await: after it, the route may have moved on — and
  // the Nuxt instance is gone. NOTHING below the first await may call a
  // composable: `useDuxtConfig()` sat under it once, threw E1001 on every
  // request, and the handler's error left every page without a sidebar.
  // `tests/async-data-context.test.ts` holds that line.
  const { base, translation, tfplugindocsPrefix } = useNavigationSource().value;

  const tree = await queryCollectionNavigation(base as DuxtCollectionArg, [
    'icon',
    'description',
    'subcategory'
  ]);

  // Before the overlay: a folder's title comes from its own index page, and a
  // translated index has to be able to carry that up with it.
  const named = titleFoldersFromIndex(tree);
  const navigable =
    tfplugindocsPrefix === undefined
      ? named
      : tfplugindocsNavigation(named, tfplugindocsPrefix);

  if (translation === base) return navigable;

  const translated = await queryCollection(translation as DuxtCollectionArg)
    .select('path', 'title', 'description')
    .all();

  return titleFoldersFromIndex(
    overlayTranslations(
      navigable,
      new Map(translated.map((page) => [page.path, page]))
    )
  );
};

/**
 * The navigation tree for the collection serving this route.
 *
 * The key tracks both collections: two sources are two trees and must not share
 * one cache entry, and neither may two languages of one.
 */
export function useDuxtNavigation() {
  const { collection, baseCollection, sources } = useDuxtCollection();
  const source = useNavigationSource();

  // Kept in step before every fetch, including the ones `watch` triggers.
  watchEffect(() => {
    const base = sources.value.find(
      (entry) => entry.collection === baseCollection.value
    );

    source.value = {
      base: baseCollection.value,
      translation: collection.value,
      tfplugindocsPrefix:
        base?.flavor === 'tfplugindocs' ? base.prefix : undefined
    };
  });

  return useAsyncData<ContentNavigationItem[]>(
    () => `duxt-navigation-${baseCollection.value}-${collection.value}`,
    handler,
    { watch: [collection, baseCollection] }
  );
}
