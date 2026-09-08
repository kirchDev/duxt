/**
 * Generated sections: an artefact that is not Markdown, published as pages.
 *
 * A source declares `generated: [{ type, path, label }]` beside its docs tree,
 * and each entry becomes an ordinary Content collection at a URL prefix of its
 * own. That is the whole design decision: everything the layer can already do
 * hangs off a collection — search, `llms.txt`, the feed, the sitemap, the
 * redirects, the 404 fallback and the MCP tools all iterate the resolved
 * manifest — so a section that IS a collection inherits them instead of
 * rebuilding them one type at a time.
 *
 * Pure, and separate from `sections.ts` for the reason `sources-resolve.ts` is
 * separate from `sources.ts`: that half imports `@nuxt/content` and reads
 * files, and the browser refuses to follow either out of app code. This half is
 * a list in, a manifest out, which is what `app.config.ts` and the tests read.
 */
import type {
  DuxtRef,
  DuxtResolvedSource,
  DuxtSource,
  DuxtSourcesOptions
} from './sources-resolve';
import {
  expandSources,
  identifier,
  resolveSources,
  slugify
} from './sources-resolve';
import { changelogSectionType } from './sections-changelog';
import { openapiSectionType } from './sections-openapi';

/**
 * One artefact beside a source's Markdown, published as pages of the site.
 *
 * A LIST, because a monorepo is the normal case: `release-please-config.json`
 * already declares a `changelog-path` per package, so several artefacts beside
 * one docs tree is ordinary rather than exotic.
 *
 * Not called `sections`: `duxt.sections` is taken for the second navbar row,
 * and two meanings on one public name is a collision the layer pays for later.
 */
export interface DuxtGeneratedSection {
  /** The registry key of the type that parses it, e.g. `changelog`. */
  type: string;
  /**
   * The artefact, relative to the SOURCE'S OWN ROOT — the repository root for
   * a source read off disk, the root of the downloaded checkout for one Content
   * clones. One rule in both directions.
   *
   * A path only, never a URL: an arbitrary location would let an artefact be
   * fetched from anywhere and reopen the build-time-network question the
   * `sources` shorthand has already closed.
   */
  path: string;
  /**
   * The navbar entry's label, and — slugified — its URL segment.
   *
   * A plain string rather than a `DuxtText`, for the reason a version's label
   * is one: a translated text is not a stable URL. Same pair as `refs`.
   */
  label: string;
  /** URL segment for this section; defaults to the slugified label. */
  slug?: string;
  /**
   * The knobs THIS TYPE offers, as the site turned them.
   *
   * Opaque to the scaffold on purpose: a granularity means something to a
   * changelog and nothing to an API reference, and a scaffold that knew the
   * difference would have to grow a field per type. So it is carried, not
   * read — the type validates its own and says so in its own words.
   */
  options?: DuxtSectionOptions;
  /**
   * The artefact a LOCALE reads, where that locale ships one of its own.
   *
   * Only a `per-locale` type reads this — a `changelog` is written once by the
   * release tool and says so through the translation banner instead. Keyed by
   * the locale code the source declares, with the language alone accepted as
   * well, so `pt` answers for `pt-BR`.
   *
   * A locale absent from this map builds NO collection of its own, which is
   * the point: the existing `fallbackLocale` chain then resolves it to the
   * default language's section and `DuxtTranslationBanner` says the reader is
   * looking at the original. Declaring an artefact for every locale and
   * quietly serving the same file under each would leave that banner silent
   * and the reader unaware.
   */
  locales?: Record<string, string>;
  /**
   * Where its navbar entry goes.
   *
   * `sections` is the second navbar row — the existing "top-level parts of the
   * documentation" — and the default, so a declared section is findable
   * without further config. `navigation` is the narrow first row, which stays
   * a deliberate choice. `false` puts it nowhere and leaves the site to link
   * it.
   */
  navigation?: DuxtSectionPlacement;
  /** Icon for that entry; falls back to the type's own. */
  icon?: string;
}

export type DuxtSectionPlacement = 'navigation' | 'sections' | false;

/**
 * What a declaration hands its own type, and nothing else reads.
 *
 * A bag rather than a union of the known shapes: the registry is open, so the
 * set of types is not the layer's to enumerate — a consumer's own type gets the
 * same seam the built-in ones use.
 */
export type DuxtSectionOptions = Record<string, unknown>;

/** One page a type's parser produced out of an artefact. */
export interface DuxtSectionPage {
  /**
   * File name inside the section, extension included.
   *
   * Content reads the name the way it reads any other: a `NN.` prefix orders
   * the page and is stripped from the URL, so a changelog can be newest-first
   * without the order leaking into the address.
   */
  file: string;
  /** The whole file — frontmatter block and body. */
  body: string;
}

/** What the parser is told about the section it is filling. */
export interface DuxtSectionContext {
  /** The declared label, which is also the index page's title. */
  label: string;
  /** The URL prefix its pages are served at, e.g. `/releases`. */
  prefix: string;
  /** The declaration's own `options`, empty where it named none. */
  options: DuxtSectionOptions;
}

/**
 * A type in the registry: what turns one artefact into pages.
 *
 * The whole extension surface, and public from day one. While the package is
 * `0.x`, `bump-minor-pre-major` makes a `feat!:` a minor bump, so correcting
 * this shape costs no major release — the promise is reviewed once before
 * `1.0.0`, which is when it stops being cheap.
 */
export interface DuxtSectionType {
  /** The artefact, split into pages carrying their own frontmatter. */
  parse: (artefact: string, context: DuxtSectionContext) => DuxtSectionPage[];
  /**
   * How this type behaves against the one-collection-per-version mechanic.
   *
   * `global` is one history read from the default version and served at a
   * version-neutral URL, with the switcher suppressed — what a changelog is.
   * `per-version` is a section per version, like any other page.
   */
  versioning: 'global' | 'per-version';
  /**
   * What a localised site shows when the artefact has one language.
   *
   * `original` builds ONE collection from the default locale and lets the
   * existing translation banner say so — a release log is written once by the
   * release tool, and there is nothing per-locale about it.
   *
   * `per-locale` follows the source's own languages, as far as the declaration
   * reaches: a collection for the default language, and one for every locale
   * `DuxtGeneratedSection.locales` names an artefact for. A locale it does not
   * name builds NOTHING rather than a copy of the original — which is what
   * leaves `sourcesForRoute` free to fall through to the default entry and
   * `DuxtTranslationBanner` free to say the reader is looking at the original.
   */
  localisation: 'original' | 'per-locale';
  /**
   * The layout its pages render in, through the shared slot.
   *
   * A layout name a type binds is PUBLIC SURFACE — renaming one later is a
   * `feat!:`. Unset renders the section in the ordinary docs chrome.
   *
   * A FUNCTION where the declaration's own options decide: the same type can
   * produce two different things, and a changelog is the case that proves it —
   * split into a page per release it is a timeline with chrome of its own,
   * rendered as the one file it was written as it is an ordinary docs page and
   * wants the sidebar, the breadcrumb and the table of contents back.
   */
  layout?: string | ((options: DuxtSectionOptions) => string | undefined);
  /** Icon for the navbar entry, when the declaration names none. */
  icon?: string;
}

/** The registry: type name to type. */
export type DuxtSectionTypes = Record<string, DuxtSectionType>;

/** The types the layer ships. */
export const duxtBuiltinSectionTypes: DuxtSectionTypes = {
  changelog: changelogSectionType,
  openapi: openapiSectionType
};

/**
 * The registry, open for a consumer to add to.
 *
 * A merge rather than a mutable global: `content.config.ts` and the duxt module
 * are loaded through two different loaders, and a registry each of them wrote
 * into would be two registries. Handing the map in keeps both halves reading
 * the one the site declared — the same reason `sources` is data rather than a
 * hook. A consumer's entry wins, so a type can also be replaced.
 */
export function duxtSectionTypes(custom?: DuxtSectionTypes): DuxtSectionTypes {
  return { ...duxtBuiltinSectionTypes, ...custom };
}

/**
 * What a generated collection carries beyond an ordinary source.
 *
 * Lives under one key rather than as loose fields, so `source.generated` is the
 * single question anything downstream has to ask — the version switcher, the
 * layout slot and the "edit this page" link each ask it once.
 */
export interface DuxtGeneratedMeta {
  /** The registry key the artefact was parsed with. */
  type: string;
  /** The navbar label, as declared. */
  label: string;
  /** The URL segment, as resolved. */
  slug: string;
  /** Where its navbar entry goes. */
  navigation: DuxtSectionPlacement;
  /** Icon for that entry. */
  icon?: string;
  /** The layout its pages render in, when the type names one for these options. */
  layout?: string;
  /** The declaration's own options, where it named any. */
  options?: DuxtSectionOptions;
  /** The type's versioning policy — `global` suppresses the switcher. */
  versioning: 'global' | 'per-version';
  /** The type's localisation policy. */
  localisation: 'original' | 'per-locale';
  /** Whether Content downloads the repository this artefact sits in. */
  remote: boolean;
}

/**
 * The generated sections a source list declares, as manifest entries.
 *
 * They are ORDINARY resolved sources with one extra key, because that is what
 * makes the rest of the layer work on them unchanged: `sourcesForRoute` picks
 * the longest matching prefix, so `/releases` beats the docs tree at `/` with
 * no special case anywhere.
 */
export function resolveGeneratedSections(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {},
  types: DuxtSectionTypes = duxtSectionTypes()
): DuxtResolvedSource[] {
  const resolved = resolveSources(sources, options);
  const expanded = expandSources(sources, options);
  const generated: DuxtResolvedSource[] = [];

  // Claimed per locale, exactly as `resolveSources` claims its own prefixes:
  // two languages serving one prefix is not a collision, it is the point.
  const taken = new Map<string, string>(
    resolved.map((entry) => [
      `${entry.locale ?? ''}|${entry.prefix}`,
      `the documentation at "${entry.prefix || '/'}"`
    ])
  );

  sources.forEach((source) => {
    for (const declared of source.generated ?? []) {
      const type = types[declared.type];

      if (!type) {
        // Named rather than ignored: an unknown type is a typo in the site's
        // own config, and a section silently absent is the failure this layer
        // exists to stop.
        throw new Error(
          `duxt: the generated section "${declared.label}" asks for the type ` +
            `"${declared.type}", which no type in the registry answers to ` +
            `(${Object.keys(types).sort().join(', ') || 'none'}). ` +
            'Register it in `duxt.sectionTypes`.'
        );
      }

      const options = declared.options ?? {};

      // LOWERCASED, and that is not a style choice. Content slugifies a page's
      // own path with `lower: true`, so a section called `Releases` would be
      // served at `/releases` while the manifest said `/Releases` — and every
      // lookup that matches a route against a prefix would miss.
      const slug = slugify(declared.slug ?? declared.label).toLowerCase();

      if (!slug) {
        throw new Error(
          `duxt: the generated section "${declared.label}" resolves to an ` +
            'empty URL segment. Give it a `slug`.'
        );
      }

      for (const base of basesFor(source, resolved, expanded, type, declared)) {
        const prefix = `${base.entry.prefix}/${slug}`;
        const claim = `${base.entry.locale ?? ''}|${prefix}`;
        const previous = taken.get(claim);

        if (previous) {
          throw new Error(
            `duxt: the generated section "${declared.label}" resolves to the ` +
              `URL prefix "${prefix}", which ${previous} already claims. ` +
              'Give the section a `slug`.'
          );
        }

        taken.set(claim, `the generated section "${declared.label}"`);

        generated.push({
          collection: `${base.entry.collection}_${identifier(slug)}`,
          prefix,
          repo: base.entry.repo,
          // `global` is version-NEUTRAL, so it carries no version at all: the
          // switcher lists what has a version, and a changelog must not be
          // offered as one of the versions of the documentation beside it.
          version:
            type.versioning === 'per-version' ? base.entry.version : undefined,
          isDefault: true,
          repository: base.entry.repository,
          repositoryUrl: base.entry.repositoryUrl,
          ref: base.entry.ref,
          refKind: base.entry.refKind,
          // The ARTEFACT, not a folder: `DuxtPageInfo` links back to the file a
          // page was written in, and for a generated section every page in it
          // was written in this one. Per LOCALE where the declaration names one
          // — see `artefactFor`.
          path: base.path,
          locale: base.entry.locale,
          isDefaultLocale: base.entry.isDefaultLocale,
          status: base.entry.status,
          // Never read for history. Its pages have no file of their own on
          // disk, so `git log` would answer about nothing; a type that has
          // dates puts them in the frontmatter it writes.
          history: false,
          generated: {
            type: declared.type,
            label: declared.label,
            slug,
            navigation: declared.navigation ?? 'sections',
            icon: declared.icon ?? type.icon,
            layout:
              typeof type.layout === 'function'
                ? type.layout(options)
                : type.layout,
            versioning: type.versioning,
            localisation: type.localisation,
            remote: base.remote,
            // Only when the site named some: an empty object where there was
            // `undefined` is a different value in the manifest every page
            // ships, and this one changes on no site that declares nothing.
            ...(Object.keys(options).length ? { options } : {})
          }
        });
      }
    }
  });

  return generated;
}

/**
 * Which resolved entries a section hangs off, per the type's own policies.
 *
 * Making versioning and localisation POLICIES is what turns the sharpest
 * difference between two types into a parameter instead of a fork: a changelog
 * is one global history, an API reference genuinely is per version, and both
 * are then ordinary answers rather than special cases.
 */
function basesFor(
  source: DuxtSource,
  resolved: DuxtResolvedSource[],
  expanded: ReturnType<typeof expandSources>,
  type: DuxtSectionType,
  declared: DuxtGeneratedSection
): { entry: DuxtResolvedSource; path: string; remote: boolean }[] {
  const bases: { entry: DuxtResolvedSource; path: string; remote: boolean }[] =
    [];

  resolved.forEach((entry, index) => {
    const combination = expanded[index]!;
    if (combination.source !== source) return;

    if (type.localisation === 'original' && !entry.isDefaultLocale) return;
    if (type.versioning === 'global' && !entry.isDefault) return;

    const path = artefactFor(declared, entry);
    if (!path) return;

    bases.push({ entry, path, remote: Boolean(combination.effective.repo) });
  });

  return bases;
}

/**
 * The artefact one entry reads, or nothing where it reads none.
 *
 * The default language always reads the declared `path`; every other language
 * reads what `locales` names for it, and builds no collection at all when that
 * map is silent — see `DuxtGeneratedSection.locales` for why the silence is the
 * useful answer rather than a gap to paper over.
 */
function artefactFor(
  declared: DuxtGeneratedSection,
  entry: DuxtResolvedSource
): string | undefined {
  if (entry.isDefaultLocale || !entry.locale) return declared.path;

  const locales = declared.locales ?? {};

  // The language alone answers for a region, exactly as the locale FILES do:
  // one `pt` artefact serves `pt-PT` and `pt-BR`.
  return locales[entry.locale] ?? locales[entry.locale.split('-')[0]!];
}

/**
 * The ref an entry was read at, for the half of the build that downloads it.
 *
 * `DuxtResolvedSource` keeps a ref by NAME and a kind beside it, because that
 * is what a link back to the file needs; Content wants the pair as a `branch`
 * or a `tag` again. Rebuilding it here keeps that translation in one place.
 */
export function generatedSectionRef(
  entry: DuxtResolvedSource
): DuxtRef | undefined {
  if (!entry.ref) return undefined;

  return entry.refKind === 'tag' ? { tag: entry.ref } : { branch: entry.ref };
}

/**
 * The artefact, as its type reads it.
 *
 * Here rather than beside the file reading, so the SEVERITY POLICY is testable:
 * whether a finding fails the build or warns is one of this feature's stated
 * decisions, and it was decided per source kind rather than per finding. The
 * reading itself stays in `sections.ts`, which is the half that touches disk.
 *
 * A type that produces nothing out of a file that exists is the same finding as
 * a file that is not there, and carries the same severity — the section would
 * otherwise be an empty collection, which is a 404 on every URL it claims and
 * nothing said about why.
 */
export function sectionPages(
  entry: DuxtResolvedSource,
  type: DuxtSectionType,
  artefact: string
): DuxtSectionPage[] {
  const pages = type.parse(artefact, {
    label: entry.generated!.label,
    prefix: entry.prefix,
    options: entry.generated!.options ?? {}
  });

  if (!pages.length) {
    const problem =
      `holds nothing the "${entry.generated!.type}" type can read, so the ` +
      `section "${entry.generated!.label}" has no pages`;

    if (entry.generated!.remote) {
      console.warn(
        `[duxt] ${entry.path} in ${sectionOrigin(entry)} ${problem}.`
      );
    } else {
      throw new Error(`duxt: ${entry.path} ${problem}.`);
    }
  }

  return pages;
}

/**
 * A declared artefact that is not there.
 *
 * The severity is not uniform, and follows the rule `modules/validate.ts`
 * already states. A LOCAL source is the site's own configuration, so a path
 * that does not exist is a mistake in it and fails the build. A REMOTE one may
 * legitimately not have had the file at an older tag — a remote source can go
 * stale between releases without that being this build's fault — so it warns,
 * names the source and the ref, and the section is simply not built.
 *
 * Returns the pages a caller should carry on with, which for the warning case
 * is none — so the two severities read as one expression at both call sites.
 */
export function missingSectionArtefact(
  entry: DuxtResolvedSource,
  file: string
): DuxtSectionPage[] {
  if (entry.generated!.remote) {
    console.warn(
      `[duxt] the generated section "${entry.generated!.label}" declares ` +
        `${entry.path}, which ${sectionOrigin(entry)} does not have. ` +
        'The section is not built.'
    );
    return [];
  }

  throw new Error(
    `duxt: the generated section "${entry.generated!.label}" declares ` +
      `${entry.path}, which this repository does not have (looked in ${file}). ` +
      "A generated section resolves its path against the source's own root."
  );
}

/** The repository and ref an artefact was looked for in. */
function sectionOrigin(entry: DuxtResolvedSource): string {
  return `${entry.repository ?? entry.repositoryUrl ?? 'the source'}${
    entry.ref ? `@${entry.ref}` : ''
  }`;
}

/**
 * The whole manifest: the documentation, then whatever it generates beside it.
 *
 * `duxtSourceManifest` deliberately stays the documentation half alone —
 * `duxtSources` walks it index-for-index against `expandSources`, and an entry
 * appended there would put the two out of step. Everything that reads the
 * manifest to serve a site reads this one.
 */
export function duxtManifest(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {},
  types: DuxtSectionTypes = duxtSectionTypes()
): DuxtResolvedSource[] {
  return [
    ...resolveSources(sources, options),
    ...resolveGeneratedSections(sources, options, types)
  ];
}
