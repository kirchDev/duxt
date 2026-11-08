import { loadWikiPages, WIKI_FIELDS } from '../../queries';

/** A request/payload-local metadata read in the active source's locale order. */
export function useWikiPages() {
  const { source, fallbacks } = useDuxtCollection();
  const { locale } = useI18n();
  const collections = computed(() =>
    [source.value, ...fallbacks.value]
      .filter(Boolean)
      .map((entry) => entry!.collection)
  );
  const result = useAsyncData(
    () => `wiki-pages-${locale.value}-${collections.value.join(',')}`,
    () =>
      loadWikiPages(
        async (collection, offset, limit) =>
          await queryCollection(collection as DuxtCollectionArg)
            .select(...WIKI_FIELDS)
            .order('path', 'ASC')
            .limit(limit)
            .skip(offset)
            .all(),
        collections.value
      ),
    { watch: [collections, locale] }
  );
  return { source, fallbacks, collections, pages: result.data, ready: result };
}
