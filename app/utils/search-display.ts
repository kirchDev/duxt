import { asText } from './duxt-text';

/**
 * How a search hit says where it came from.
 *
 * The search used to label a hit `[repo, version].join(' ') || prefix || '/'`,
 * which is a URL segment doing a name's job: the site's own documentation sits
 * at the root and therefore showed a bare `/`, and a source whose segment is an
 * abbreviation showed the abbreviation. Neither tells a reader which project
 * they are about to open.
 *
 * So provenance is resolved to a NAME here, once, off the same manifest the
 * rest of the theme reads — and `sources[].name` lets a consumer state the one
 * thing no rule can derive.
 */

/** Where one hit came from, as the dialog says it. */
export interface DuxtSearchProvenance {
  /** The source's display name — see `sourceDisplayNames`. */
  name: string;
  /** The generated artefact's own label, where the hit came out of one. */
  artefact?: string;
  /** The edition, where the site publishes more than one. */
  version?: string;
}

/** One search result, and whether it opens a run of shared provenance. */
export interface DuxtSearchRow<T> {
  hit: T;
  /**
   * Drawn above this hit, once per run. Decorative: the same text reaches a
   * screen reader through `provenance` on every row, so the visible caption is
   * `aria-hidden` and never read twice.
   */
  caption?: string;
  /** This hit's own provenance, whether or not it drew the caption. */
  provenance?: string;
}

/** `Demo · Demo API · v3.x` — source, artefact, edition, in that order. */
export const provenanceLabel = (source: DuxtSearchProvenance) =>
  [source.name, source.artefact, source.version].filter(Boolean).join(' · ');

/**
 * Results, with the repeated source label lifted off them.
 *
 * A badge on every row spelled the same source name five times down a list of
 * five hits from one repository — the noise this issue is about. A caption at
 * the head of each RUN says it once.
 *
 * A run is CONTIGUOUS, which is the whole constraint. Gathering every hit of
 * one source under a single heading would re-sort the list, and the ranking is
 * the thing the merge across sources exists to produce — see `useDuxtSearch`.
 * So provenance that comes back changes nothing about order: it simply opens a
 * second run.
 */
export function searchRows<T extends { source?: DuxtSearchProvenance }>(
  hits: T[]
): DuxtSearchRow<T>[] {
  let previous: string | undefined;

  return hits.map((hit) => {
    const provenance = hit.source ? provenanceLabel(hit.source) : undefined;
    const caption =
      provenance && provenance !== previous ? provenance : undefined;
    previous = provenance;

    return { hit, caption, provenance };
  });
}

/** How much of a section's text a preview may show. */
const EXCERPT_LENGTH = 160;

/**
 * A plain-text preview of the section a hit sits in.
 *
 * A title and a breadcrumb say where a result IS; they do not say whether it
 * answers the question, and that is the judgement a reader makes before opening
 * a page. So each hit carries a line or two of its own text.
 *
 * Whitespace is collapsed because Content's index stores a section as it was
 * written — newlines, indentation and all — and an excerpt taken raw would
 * spend half its budget on layout the reader cannot see.
 *
 * PLAIN TEXT, and it stays that way. What comes back is the section's
 * characters, `<` and `&` included; the component renders it through
 * interpolation, never `v-html`, so a document that happens to contain markup
 * shows markup rather than running it.
 */
export function searchExcerpt(
  content: string | undefined,
  term: string,
  max = EXCERPT_LENGTH
): string {
  const text = (content ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;

  // The window is anchored on the LITERAL term where the text carries it: a
  // preview whose match is off the end is a preview of the wrong sentence. FTS
  // and Fuse both match things a literal search does not, so this often finds
  // nothing — and the opening of a section is a good second answer, because a
  // section's first sentence is usually what it is about.
  const found = term.trim()
    ? text.toLowerCase().indexOf(term.trim().toLowerCase())
    : -1;

  if (found < 0) return `${cut(text, 0, max)}…`;

  // A third of the window ahead of the match, so the reader sees what leads
  // into it as well as what follows.
  const lead = Math.floor(max / 3);
  const start = Math.max(0, found - lead);
  const end = Math.min(text.length, start + max);

  return [
    start > 0 ? '…' : '',
    text.slice(start > 0 ? boundary(text, start) : 0, end).trim(),
    end < text.length ? '…' : ''
  ].join('');
}

/** Forward to the next word start, so a window never opens mid-word. */
function boundary(text: string, index: number) {
  const space = text.indexOf(' ', index);
  return space < 0 || space > index + 20 ? index : space + 1;
}

/** Back to the last whole word that fits, so a cut never splits one. */
function cut(text: string, start: number, max: number) {
  const slice = text.slice(start, start + max);
  const space = slice.lastIndexOf(' ');
  return (space > max / 2 ? slice.slice(0, space) : slice).trim();
}

/** As much of a resolved source as naming it needs. */
export interface DuxtSearchSourceInput {
  collection: string;
  /** The display name a consumer configured, already resolved for the locale. */
  name?: DuxtText;
  /** The source's own URL segment — its identity, where it has one. */
  repo?: string;
  /** `owner/name` of the repository behind it, where there is one. */
  repository?: string;
  /** Folder inside that repository holding the Markdown. */
  path: string;
}

/**
 * A slug as a reader would write it: `client-sdk` → `Client Sdk`.
 *
 * Deliberately not a title-caser — `of`, `and` and the rest are left capitalised
 * rather than guessed at per language, because this runs over a URL segment and
 * a wrong small word reads worse than a consistent one. A consumer who wants
 * the real spelling writes `name`.
 */
export const humanizeSlug = (value: string) =>
  value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * The name each collection shows, by collection.
 *
 * The ladder, in order, and every rung is a fallback for the one before it:
 *
 *  1. `sources[].name` — display only, and the only rung a consumer controls.
 *  2. The source's own SEGMENT, humanized. Usually this IS the repository's
 *     name: `repoSlug` derives the segment from it unless the source claimed a
 *     `slug`, and where a source did claim one, the claim is the deliberate
 *     spelling and the better name.
 *  3. The site's name — the answer for a source with no segment at all, which
 *     is the site's own root documentation. Unset, `duxt.title` is already the
 *     localized "Documentation" label, so that is the bottom rung and it needs
 *     no second string to translate.
 *
 * The REPOSITORY deliberately names nothing. Several sources may be read out of
 * one repository — this site's own demo tree and its documentation are — so a
 * repository identifies a source only sometimes, and a rule that is right only
 * sometimes attributes one section to another. It qualifies a collision below,
 * where it has a second name beside it to be read against, and nothing else.
 *
 * A collection never falls through to its own identifier or to `/`: both are
 * addresses, and this is the one place that must not show one.
 *
 * Two DIFFERENT sources landing on one name are then qualified — see
 * `qualified`. Two editions of the SAME source landing on one name are the
 * point of the exercise and left alone: a version and a translation are the
 * same project, and the version caption already tells them apart.
 */
export function sourceDisplayNames(
  sources: DuxtSearchSourceInput[],
  siteName: string
): Map<string, string> {
  const named = sources.map((source) => ({
    source,
    // The source's identity, not the collection's: every version and every
    // language of one source shares it, which is what keeps them one name.
    identity: source.repo ?? '',
    name:
      asText(source.name) ||
      (source.repo && humanizeSlug(source.repo)) ||
      siteName
  }));

  const identities = new Map<string, Set<string>>();
  for (const { name, identity } of named) {
    const claimed = identities.get(name) ?? new Set<string>();
    claimed.add(identity);
    identities.set(name, claimed);
  }

  return new Map(
    named.map(({ source, name }) => [
      source.collection,
      identities.get(name)!.size > 1 ? qualified(name, source, named) : name
    ])
  );
}

/**
 * One colliding name, told apart.
 *
 * The repository first, because "Reference (acme/api)" answers the reader's
 * actual question — which project is this. A monorepo publishing two sections
 * out of one repository cannot be told apart that way, so the folder is the
 * second rung: it is the only thing left that differs, and it is readable.
 */
function qualified(
  name: string,
  source: DuxtSearchSourceInput,
  named: { source: DuxtSearchSourceInput; identity: string; name: string }[]
) {
  const colliding = named.filter((entry) => entry.name === name);
  const repositories = new Set(
    colliding.map((entry) => entry.source.repository ?? '')
  );

  const qualifier =
    repositories.size > 1 && source.repository
      ? source.repository
      : source.path;

  return qualifier ? `${name} (${qualifier})` : name;
}
