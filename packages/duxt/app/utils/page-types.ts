import type { PageCollectionItemBase } from '@nuxt/content';

/** The route owns loading and SEO; a template receives the delivered content. */
export interface DuxtPageTemplateProps {
  page: PageCollectionItemBase & { rawbody?: string };
  untranslated: boolean;
  from?: string;
}

/** Serializable image contract; component implementations stay in Nuxt layers. */
export interface DuxtPageTypeDefinition {
  layout: string;
  template: string;
}

export function duxtPageType(
  page: { type?: string | null } | undefined,
  source: { pageType?: string } | undefined,
  types: Record<string, DuxtPageTypeDefinition>
): DuxtPageTypeDefinition & { name: string } {
  const name = page?.type ?? source?.pageType ?? 'docs';
  const definition = Object.hasOwn(types, name) ? types[name] : undefined;
  if (!definition)
    throw new Error(
      `duxt: unknown page type "${name}". Register it in duxt.build.ts and build a new app image.`
    );
  return { name, ...definition };
}

/** A delivered page, including its locale and whether it has authored Markdown. */
export interface DuxtLoadedPage {
  page: PageCollectionItemBase & { type?: string };
  from?: string;
  asked: string;
  markdown?: boolean;
}
