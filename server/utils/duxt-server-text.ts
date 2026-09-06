import enDefaults from '../../i18n/locales/en/duxt/defaults.json' with { type: 'json' };
import { resolveDuxtTexts } from '../../app/utils/duxt-text';

/**
 * Resolve the config's text fields on the server, where there is no i18n.
 *
 * `llms.txt` and the feed are Nitro routes: no Vue app, no `useI18n`, and so no
 * translator. Before this, both printed the KEY — a feed whose description read
 * `duxt.defaults.landing.description` and an llms.txt that told a model the
 * same. Falling back to the layer's English messages is the honest answer: it
 * is what `fallbackLocale` already says a missing translation resolves to, and
 * these routes have no locale of their own to serve anyway.
 *
 * Only the layer's own defaults are looked up. A consumer's keys live in the
 * consumer's locale files, which Nitro has no reader for — those pass through
 * as written, exactly as an unregistered key does in the browser.
 */
const messages = enDefaults as Record<string, unknown>;

function lookup(key: string): string | undefined {
  let node: unknown = messages;

  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }

  return typeof node === 'string' ? node : undefined;
}

export function resolveServerTexts<T>(config: T): T {
  return resolveDuxtTexts(config, 'en-GB', lookup);
}

/**
 * The Markdown body without its frontmatter block.
 *
 * Content's `rawbody` is the file as it sits on disk, frontmatter included. A
 * reader wants the prose; a model handed `---\ntitle: …\n---` reads a page
 * whose first heading is a YAML fence.
 */
export function stripFrontmatter(body: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(body);

  return match ? body.slice(match[0].length) : body;
}
