import { queryCollection } from '@nuxt/content/nitro';
import type { H3Event } from 'h3';
import { splitLocalePath } from '../../app/utils/locale-path';
import {
  sourcesForRoute,
  type DuxtResolvedSource
} from '../../build/sources/sources-resolve';
import type { DuxtLocaleSetup } from './mcp-docs';

/** Request-bound lookup shared by HTTP Markdown and MCP, including provenance. */
export async function duxtDocPage(
  event: H3Event,
  path: string,
  sources: DuxtResolvedSource[],
  setup: DuxtLocaleSetup
) {
  const { locale, path: wanted } = splitLocalePath(path, setup.codes);
  for (const source of sourcesForRoute(
    wanted,
    locale ?? setup.defaultLocale,
    sources,
    setup.fallbackLocale
  )) {
    const page = await queryCollection(
      event,
      source.collection as Parameters<typeof queryCollection>[1]
    )
      .path(wanted)
      .select('title', 'description', 'rawbody')
      .first();
    if (page)
      return {
        page: page as {
          title?: string;
          description?: string;
          rawbody?: string;
        },
        source,
        locale,
        path: wanted
      };
  }
}
