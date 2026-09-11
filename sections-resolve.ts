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
  DuxtSourceStatus,
  DuxtSourcesOptions
} from './sources-resolve';
import {
  assertCollectionIdentities,
  expandSources,
  identifier,
  resolveSources,
  slugify
} from './sources-resolve';
import { brunoSectionType } from './sections-bruno';
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
/**
 * One version of a generated section — the artefact, and what it is called.
 *
 * `path` and `locales` are the declaration's own, overridden per version: a
 * translated artefact is translated per version, because that is the file that
 * exists.
 */
export interface DuxtGeneratedSectionVersion {
  /** Shown in the switcher and used in the URL. */
  version: string;
  /** The artefact this version reads; defaults to the declaration's. */
  path?: string;
  /** Per-locale artefacts for this version; defaults to the declaration's. */
  locales?: Record<string, string>;
  /** Lifecycle of this version. See `DuxtSourceStatus`. */
  status?: DuxtSourceStatus;
  /** Served without a version segment. Defaults to the first in the list. */
  default?: boolean;
}

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
   * The versions of THIS ARTEFACT, where the source's own refs do not name
   * them.
   *
   * A version is normally a checkout: list `refs` on the source and every
   * section it carries is published once per ref. An API is usually not kept
   * that way — `openapi/v1.yaml` sits beside `openapi/v2.yaml` in one
   * repository, versioned by FILE — and without this key the two are two
   * unrelated sections with two navbar entries.
   *
   * Declared HERE rather than as two sources, and that is the whole design: two
   * sections are offered as versions of one another only when they came from
   * one declaration (see `DuxtGeneratedMeta.declaration`), and a source always
   * publishes a documentation tree, so a source per API version would publish
   * the prose twice. One declaration, several versions, one artefact.
   *
   * Never beside a versioned SOURCE: the two would each want the same segment
   * of the URL, and the resolver says so rather than nesting them.
   */
  versions?: DuxtGeneratedSectionVersion[];
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

/**
 * The artefact a type reads, as the type reads it.
 *
 * A LAZY HANDLE rather than a string, and that is the whole of this seam's
 * second version. `parse` took `artefact: string`, which said one thing the
 * registry had never meant to promise: that an artefact is one file. A
 * changelog is, an OpenAPI document is — a Bruno collection is `bruno.json`
 * beside a directory of `.bru` files, `folder.bru` ordering and an
 * `environments/` folder nobody should publish, and no single string carries
 * it.
 *
 * So the type is handed WHERE its input is and is left to read it. The central
 * resolver keeps the severity policy, the report and the prefix; what a tree
 * means is the type's, which is the only place the knowledge belongs — a
 * resolver that walked a Bruno collection would have to walk the next type's
 * too.
 *
 * `text` throws rather than returning `''` for a directory: a type that asks a
 * directory for its contents has a bug, and an empty string turns it into an
 * empty section reported as a missing artefact three files away.
 */
export interface DuxtSectionInput {
  /** The declared path, relative to the source's own root. */
  path: string;
  /** Whether the declared path is one file or a tree. */
  kind: 'file' | 'directory';
  /** The whole file. Throws when the input is a directory. */
  text: () => string;
  /**
   * Every file under a directory input, as `/`-separated relative paths.
   *
   * Sorted, so a type that walks them produces the same pages on every machine
   * — a directory listing is not ordered, and a section whose page order
   * depended on the filesystem would reorder itself on a different one.
   *
   * Empty for a file input.
   */
  files: () => string[];
  /** One file under a directory input, by its relative path. */
  read: (file: string) => string;
}

/**
 * An input over files already in memory.
 *
 * The pure half of what `sections.ts` builds out of `node:fs`, so a type's
 * parser is testable without a fixture directory — and so a consumer's own type
 * can be given one.
 */
export function duxtSectionInput(
  path: string,
  files: Record<string, string> | string
): DuxtSectionInput {
  if (typeof files === 'string') {
    return {
      path,
      kind: 'file',
      text: () => files,
      files: () => [],
      read: () => ''
    };
  }

  const names = Object.keys(files).sort();

  return {
    path,
    kind: 'directory',
    text: () => {
      throw new Error(
        `duxt: "${path}" is a directory, and this type asked it for a file.`
      );
    },
    files: () => [...names],
    read: (file) => files[file] ?? ''
  };
}

/** What the parser is told about the section it is filling. */
export interface DuxtSectionContext {
  /** The declared label, which is also the index page's title. */
  label: string;
  /**
   * The Content collection these pages land in.
   *
   * The one identity that is unique per version AND per locale — a prefix is
   * not, since two languages deliberately claim the same one. A type that has
   * to name a build-time artefact of its own (the Bruno collection's ZIP) needs
   * a name the module emitting it can compute the same way, and this is it.
   */
  collection: string;
  /**
   * Whether the artefact came out of a repository Content downloads.
   *
   * A type that only turns a file into pages never asks. One whose section
   * offers something built BESIDE the pages does: `section-reports.ts` states
   * the limit this reflects — a remote checkout lands wherever Content's
   * hash-cache put it, which is a directory known only inside the collection
   * that declared it, so nothing outside can read the artefact a second time.
   */
  remote: boolean;
  /** The URL prefix its pages are served at, e.g. `/releases`. */
  prefix: string;
  /** The declaration's own `options`, empty where it named none. */
  options: DuxtSectionOptions;
  /**
   * What the type could not make sense of, but carried on past.
   *
   * NOT `console.warn`, which is what both built-in types did: an artefact is
   * parsed while the config is being loaded, so a warning printed there has
   * scrolled away long before anyone looks — the same failure the Checks panel
   * exists to fix. Collected here instead, the finding reaches
   * `DuxtSectionReport` and from there the ONE report this layer has: the build
   * validator prints it and the Checks panel keeps it.
   *
   * For findings the parser survives. What it cannot read at all it throws on,
   * and a section that produced no pages is reported by the scaffold rather
   * than by the type — neither needs this.
   *
   * Optional, because a type is called with a bare context in a test.
   */
  warn?: (message: string) => void;
}

/**
 * What reading one artefact said about it, for the report.
 *
 * On the manifest entry rather than in a registry of its own, and that is the
 * same decision `duxtSectionTypes` documents above: `content.config.ts` and the
 * duxt module are loaded through two different loaders, so a module-level
 * collector written by one of them is invisible to the other. A field on the
 * entry travels with the manifest that is already handed around — into
 * `app.config`, which is how the Checks panel sees it at all.
 */
export interface DuxtSectionReport {
  /** How many pages the type produced. */
  pages: number;
  /** What the type carried on past — see `DuxtSectionContext.warn`. */
  warnings: string[];
  /** Set when the declared artefact was not there to read. */
  missing?: boolean;
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
  parse: (
    input: DuxtSectionInput,
    context: DuxtSectionContext
  ) => DuxtSectionPage[];
  /**
   * Whether the declared path names a file or a directory.
   *
   * `file` is the default and what the first two types are: the path is opened
   * and its contents handed over. `directory` hands the type the tree instead —
   * `input.files()` and `input.read()` — and is what a client-side collection
   * like Bruno's needs, since there is no one file to open.
   *
   * A POLICY rather than a guess at the path: a type knows what it reads, and a
   * resolver that stat'ed the path would report a missing directory as a
   * missing file and say the wrong thing about both.
   */
  input?: 'file' | 'directory';
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
   * `feat!:`. Unset renders the section in the ordinary docs shell.
   *
   * A FUNCTION where the declaration's own options decide: the same type can
   * produce two different things, and a changelog is the case that proves it —
   * split into a page per release it is a timeline with a layout of its own,
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
  bruno: brunoSectionType,
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
  /**
   * WHICH DECLARATION produced this entry — the identity, not an address.
   *
   * A section is one collection per version and per locale, so a single
   * `generated: [...]` entry reaches the manifest as several sources, and the
   * navbar has to put ONE link in the row for all of them. Which of them belong
   * together is known exactly here, while `source.generated` is being iterated,
   * and nowhere else afterwards — so it is recorded rather than reconstructed.
   *
   * It was reconstructed, from `(slug, repository)`, and that guess is wrong in
   * both directions: two sources declaring a `Releases` section — per-package
   * docs trees in a monorepo, the shape this feature calls the normal case —
   * read as one declaration and lost an entry from the row, while nothing in
   * the resolver ever promised the pair was unique. Prefixes are claimed per
   * `(locale, prefix)`, so those two sections are not a collision and no error
   * is raised.
   *
   * Its VALUE means nothing: a counter over the declarations in the site's own
   * source list, only ever compared for equality inside one manifest.
   */
  declaration: number;
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
  /**
   * What reading the artefact said about it — see `DuxtSectionReport`.
   *
   * Absent until something has actually read it, which is not the resolver's
   * job: `resolveGeneratedSections` is pure and never touches disk. It is
   * filled by whoever reads the file — `sections.ts` while the collections are
   * being declared, and `readSectionReports` for the manifest the modules hold.
   * Absent therefore means "not read here", never "nothing to report", and the
   * checks are written to say nothing rather than guess.
   */
  report?: DuxtSectionReport;
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
    resolved.flatMap((entry, index) =>
      expanded[index]!.source.content === false
        ? []
        : [
            [
              `${entry.locale ?? ''}|${entry.prefix}`,
              `the documentation at "${entry.prefix || '/'}"`
            ] as [string, string]
          ]
    )
  );

  // Counted over the whole list rather than per source, so the identity is
  // unique across the manifest without anything having to pair it with a source
  // again. Incremented for every declaration, including one that resolves to no
  // entry at all: it names a declaration, not a row of the output.
  let declarations = 0;

  sources.forEach((source) => {
    for (const declared of source.generated ?? []) {
      const declaration = declarations++;
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

      // One pass where the declaration names no versions, so a section that
      // has none resolves exactly as it did.
      const editions: (DuxtGeneratedSectionVersion | undefined)[] = declared
        .versions?.length
        ? declared.versions
        : [undefined];

      for (const base of basesFor(source, resolved, expanded, type, declared)) {
        for (const [index, edition] of editions.entries()) {
          if (edition && base.entry.version) {
            throw new Error(
              `duxt: the generated section "${declared.label}" names its own ` +
                'versions and sits on a source that is versioned by refs. ' +
                'Both want the same segment of the URL — put the versions on ' +
                'one of the two.'
            );
          }

          // A version-NEUTRAL type has one history at one URL, so a list of
          // versions is a contradiction rather than a shape to resolve.
          if (edition && type.versioning === 'global') {
            throw new Error(
              `duxt: the generated section "${declared.label}" names versions, ` +
                `but the type "${declared.type}" publishes one history at a ` +
                'version-neutral URL.'
            );
          }

          const editionDefault =
            editions.length === 1 ||
            (edition?.default ??
              (!editions.some((entry) => entry?.default) && index === 0));

          const version = edition ? slugify(edition.version) : undefined;

          const segments = version && !editionDefault ? `/${version}` : '';
          const artefact = edition
            ? (artefactFor({ ...declared, ...edition }, base.entry) ??
              base.path)
            : base.path;

          const prefix = `${base.entry.prefix}${segments}/${slug}`;
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
            // THE VERSION IS PART OF THE NAME where the declaration owns it.
            // A ref-versioned source hands each version its own base entry, so
            // the base's name already differs; a declaration's versions share
            // one base, and without this both editions claimed one collection —
            // the second overwrote the first in `content.config.ts`, and the
            // default version 404'd while the older one rendered.
            collection: `${base.entry.collection}_${identifier(slug)}${
              version ? `_${identifier(version)}` : ''
            }`,
            prefix,
            repo: base.entry.repo,
            // The SOURCE's name, not the artefact's. A generated section is
            // published by the project its source is, and the artefact has a
            // label of its own that the search caption draws beside this.
            name: base.entry.name,
            // `global` is version-NEUTRAL, so it carries no version at all: the
            // switcher lists what has a version, and a changelog must not be
            // offered as one of the versions of the documentation beside it.
            version:
              type.versioning === 'per-version'
                ? (version ?? base.entry.version)
                : undefined,
            // FOLLOWS THE VERSION IT WAS READ AT, where there is one. This was
            // hard-wired to `true`, which is right for a `global` section — one
            // entry, served at a URL with no version in it — and wrong for every
            // other: it made the v1.9 reference claim to be the default as
            // loudly as the v2 one. Two things read that claim and both got it
            // wrong. `excludeOldVersionsFromSitemap` hides what is not the
            // default, so a deprecated reference stayed in the sitemap while the
            // deprecated documentation beside it was excluded; and the version
            // switcher captions the default, so it offered two of them.
            isDefault:
              type.versioning === 'per-version'
                ? base.entry.isDefault && editionDefault
                : true,
            repository: base.entry.repository,
            repositoryUrl: base.entry.repositoryUrl,
            ref: base.entry.ref,
            refKind: base.entry.refKind,
            // The ARTEFACT, not a folder: `DuxtPageInfo` links back to the file a
            // page was written in, and for a generated section every page in it
            // was written in this one. Per LOCALE where the declaration names one
            // — see `artefactFor`.
            path: artefact,
            locale: base.entry.locale,
            isDefaultLocale: base.entry.isDefaultLocale,
            status: edition?.status ?? base.entry.status,
            // Never read for history. Its pages have no file of their own on
            // disk, so `git log` would answer about nothing; a type that has
            // dates puts them in the frontmatter it writes.
            history: false,
            generated: {
              type: declared.type,
              label: declared.label,
              slug,
              declaration,
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
    }
  });

  assertCollectionIdentities([
    ...resolved.filter((_, index) => expanded[index]!.source.content !== false),
    ...generated
  ]);
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
  input: DuxtSectionInput
): DuxtSectionPage[] {
  const warnings: string[] = [];

  const pages = type.parse(input, {
    label: entry.generated!.label,
    collection: entry.collection,
    remote: entry.generated!.remote,
    prefix: entry.prefix,
    options: entry.generated!.options ?? {},
    warn: (message) => {
      // Deduplicated here rather than in each type: one unresolvable `$ref` is
      // reached from every operation that uses it, and a report that says the
      // same sentence forty times is a report nobody reads to the end.
      if (!warnings.includes(message)) warnings.push(message);
    }
  });

  entry.generated!.report = { pages: pages.length, warnings };

  // An EMPTY section is not reported here any more, in either direction beyond
  // the local throw. The report above says `pages: 0`, and `validate-report.ts`
  // turns that into a finding at the severity the source's kind asks for —
  // which is where every other finding in this layer already lives. A
  // `console.warn` beside it was a second reporting channel that scrolled away.
  if (!pages.length && !entry.generated!.remote) {
    throw new Error(
      `duxt: ${entry.path} holds nothing the "${entry.generated!.type}" type ` +
        `can read, so the section "${entry.generated!.label}" has no pages.`
    );
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
 * stale between releases without that being this build's fault — so it is
 * recorded as a finding, and the section is simply not built.
 *
 * Returns the pages a caller should carry on with, which for the recorded case
 * is none — so the two severities read as one expression at both call sites.
 */
export function missingSectionArtefact(
  entry: DuxtResolvedSource,
  file: string
): DuxtSectionPage[] {
  entry.generated!.report = { pages: 0, warnings: [], missing: true };

  // Remote: recorded, not printed. `validate-report.ts` reads the report and
  // says it once, in the same list as every other finding — see `sectionPages`.
  if (entry.generated!.remote) return [];

  throw new Error(
    `duxt: the generated section "${entry.generated!.label}" declares ` +
      `${entry.path}, which this repository does not have (looked in ${file}). ` +
      "A generated section resolves its path against the source's own root."
  );
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
  const resolved = resolveSources(sources, options);
  const expanded = expandSources(sources, options);

  return [
    ...resolved.filter((_, index) => expanded[index]!.source.content !== false),
    ...resolveGeneratedSections(sources, options, types)
  ];
}
