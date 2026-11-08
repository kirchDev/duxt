import type { MaybeRefOrGetter } from 'vue';
import { loadWikiPages, WIKI_FIELDS } from '../../queries';
import { wikiTokens, renderWikiBody } from '../../wikilinks';
import {
  resolveWikiLink,
  wikiLinkCollections
} from '../../wikilink-resolution';
import {
  wikiOriginCollections,
  wikiViewerMaintenance
} from '../../wiki-viewer';
import { wikiMaintenance } from '../../wiki-maintenance';

/** Current metadata plus explicitly escaped sources, shared by body and backlinks. */
export function useWikiLinks(
  page: MaybeRefOrGetter<{ path: string; rawbody?: string; body?: unknown }>,
  from?: MaybeRefOrGetter<string | undefined>
) {
  const current = useWikiPages();
  const app = useNuxtApp();
  const duxt = useDuxtConfig();
  const { locale, fallbackLocale } = useI18n();
  const context = computed(() => {
    const delivered = toValue(from);
    const source =
      [current.source.value, ...current.fallbacks.value].find(
        (entry) => entry && delivered && entry.locale === delivered
      ) ?? current.source.value;
    return source
      ? {
          source,
          sources: duxt.resolvedSources ?? [],
          locale: locale.value,
          fallbackLocale: fallbackLocale.value as string | string[] | undefined
        }
      : undefined;
  });
  const extra = useAsyncData(
    () =>
      `wiki-link-extras-${locale.value}-${current.collections.value.join(',')}`,
    async () => {
      await current.ready;
      const tokens = (current.pages.value ?? []).flatMap((row) =>
        row.links
          .filter((link) => link.kind === 'wiki')
          .flatMap((link) => wikiTokens(`[[${link.target}]]`, false))
      );
      const collections = context.value
        ? [
            ...new Set([
              ...wikiLinkCollections(tokens, context.value),
              ...wikiOriginCollections(context.value)
            ])
          ].filter(
            (collection) => !current.collections.value.includes(collection)
          )
        : [];
      return loadWikiPages(
        async (collection, offset, limit) =>
          await app.runWithContext(() =>
            queryCollection(collection as DuxtCollectionArg)
              .select(...WIKI_FIELDS)
              .order('path', 'ASC')
              .limit(limit)
              .skip(offset)
              .all()
          ),
        collections
      );
    },
    { watch: [current.collections, locale] }
  );
  const pages = computed(() => [
    ...(current.pages.value ?? []),
    ...(extra.data.value ?? [])
  ]);
  const resolve = (token: Parameters<typeof resolveWikiLink>[1]) =>
    context.value
      ? resolveWikiLink(pages.value, token, context.value)
      : { href: '#', wanted: true };
  const body = computed(() => renderWikiBody(toValue(page).body, resolve));
  const maintenance = computed(() =>
    context.value
      ? wikiViewerMaintenance(pages.value, context.value)
      : wikiMaintenance([], [])
  );
  return {
    ...current,
    context,
    allPages: pages,
    body,
    maintenance,
    ready: Promise.all([current.ready, extra])
  };
}
