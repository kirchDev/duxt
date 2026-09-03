import { defineContentConfig } from '@nuxt/content';
import { duxtSources } from './sources';

// One source, no versions, no configuration — the case the brief calls the
// most common one. `duxtSources` resolves it against the repository root and
// serves it without any prefix at all.
//
// Content merges content.config.ts from every layer, so a consumer declaring
// its own sources replaces this collection rather than adding to it.
export default defineContentConfig({
  collections: duxtSources([{ path: 'docs' }])
});
