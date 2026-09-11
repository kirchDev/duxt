/**
 * The rendered OG images, kept between builds, and the one rule that makes
 * keeping them safe.
 *
 * WHAT NUXT-OG-IMAGE ALREADY DOES. Its build cache keys every image by a hash
 * of three things: the page's own options (its title, its description, its
 * props), the SOURCE of the template component, and the module's own version.
 * Change a heading and that page's image is re-rendered; change the template
 * and every image is. That half needs nothing from this file — only a directory
 * that outlives the runner, which is what `ogImage.buildCache` is.
 *
 * WHAT IT DOES NOT COVER, and why this file exists. Nothing in that key sees
 * the FONTS, the renderer options (`satoriOptions`, `resvgOptions`), or the
 * version of `satori` and `@resvg/resvg-js` themselves — all of which decide
 * what an image looks like, and none of which is a per-image option. Change a
 * font and every cached image is a picture of the old one, served with no
 * warning anywhere: the page is fine, the build is green, and the image is
 * wrong. So the directory carries a STAMP of those inputs and is emptied when
 * it moves.
 *
 * TWO LEVELS, AND THEY ARE NOT THE SAME QUESTION. The stamp decides whether an
 * image may be SERVED and is written by the build, which can see the site's own
 * configuration. The CI key decides whether a tarball is worth DOWNLOADING and
 * is written by a command, which cannot — a site's renderer options live in a
 * `nuxt.config.ts` that would claim a Nuxt process if a command loaded it. So
 * the key is namespaced by the renderer versions alone. Being too generous
 * there costs one download of a directory the build then empties; being too
 * strict would cost every build its cache. Being wrong about the STAMP would
 * cost a thousand wrong images, which is why that one is the build's.
 *
 * WHAT IS DELIBERATELY NOT AN INPUT: the render budget. A timeout cannot change
 * a pixel, and it is the lever the prerender-concurrency work has to be free to
 * move without discarding everything rendered so far.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * The keys of `ogImage` that decide what a rendered image LOOKS like.
 *
 * Everything else the module takes is about when an image is rendered or where
 * it is kept — `buildCache`, `zeroRuntime`, `security.renderTimeout`, `debug`,
 * `enabled`, `runtimeCacheStorage`. None of them can change a pixel, and every
 * one of them is a lever someone will want to move without throwing away a
 * thousand rendered images, so none of them is in here.
 */
const RENDERING_KEYS = [
  'defaults',
  'fonts',
  'fontSubsets',
  'satoriOptions',
  'resvgOptions',
  'sharpOptions',
  'emojiStrategy',
  'browser'
] as const;

export interface DuxtOgImageFingerprintInputs {
  /** The site's `ogImage` config, as it is about to be handed to the module. */
  options?: Record<string, unknown>;
  /** Version per package, for the packages that do the rendering. */
  dependencies?: Record<string, string | undefined>;
}

/**
 * A digest of everything the module's own build-cache key leaves out.
 *
 * Two inputs, and the split is what keeps it honest: what the SITE declared,
 * narrowed to the keys above, and what is INSTALLED to do the rendering. A
 * fingerprint over the whole `ogImage` object would move whenever anyone
 * touched a timeout; one over the lockfile would move on every Dependabot
 * merge. Both are cheap to write and expensive to live with.
 *
 * Sixteen hex characters, because this names a directory and appears in a cache
 * key a person has to read in a log. It is not a security boundary — a
 * collision costs a stale image on a site the collider already controls.
 */
export function duxtOgImageFingerprint(
  inputs: DuxtOgImageFingerprintInputs
): string {
  const options = inputs.options ?? {};
  const rendering: Record<string, unknown> = {};

  for (const key of RENDERING_KEYS) {
    if (options[key] !== undefined) rendering[key] = options[key];
  }

  return createHash('sha256')
    .update(
      JSON.stringify([stable(rendering), stable(inputs.dependencies ?? {})])
    )
    .digest('hex')
    .slice(0, 16);
}

/** The same value whatever order its keys were written in. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)])
    );
  }

  return value;
}

/** Where the rendered images land, relative to the site's root. */
export const DUXT_OG_IMAGE_CACHE_DIR = '.cache/og-image';

/**
 * The name of the stamp, and why it starts with a dot.
 *
 * nuxt-og-image's own `prerender:done` cleanup walks this directory, skips
 * every name starting with `.`, and `JSON.parse`s the rest as a cache entry. A
 * stamp written under any other name would crash ITS cleanup rather than ours.
 */
const STAMP = '.duxt-fingerprint';

export interface DuxtOgImageBuildCacheOptions {
  /** The site being built — where `nuxt-og-image` resolves `base` against. */
  rootDir: string;
  /** The digest from `duxtOgImageFingerprint`. */
  fingerprint: string;
  /** Where the images go, relative to `rootDir`. */
  dir?: string;
}

export interface DuxtOgImageBuildCache {
  /** What `ogImage.buildCache.base` takes: relative to the site's root. */
  base: string;
  /** The same directory, absolute, for whoever has to read it. */
  dir: string;
  /** The fingerprint the directory now holds. */
  fingerprint: string;
  /** Whether this call threw away a previous build's images. */
  reset: boolean;
}

/**
 * The directory nuxt-og-image may keep rendered images in, emptied when the
 * inputs its own key does not cover have moved.
 *
 * ONE NAMESPACE, NOT ONE PER FINGERPRINT. A directory per digest never serves a
 * stale image either, and grows without bound on a machine that has built the
 * site more than twice — every superseded font, every reverted renderer option,
 * a thousand images each. Clearing in place keeps exactly one generation, which
 * is the only one any build can use.
 *
 * Deleting a cache when its inputs moved is what a cache IS, so this runs from
 * `nuxt.config.ts` without ceremony. The directory holds nothing that is not
 * reproducible by rendering it again.
 */
export function duxtOgImageBuildCache(
  options: DuxtOgImageBuildCacheOptions
): DuxtOgImageBuildCache {
  const base = options.dir ?? DUXT_OG_IMAGE_CACHE_DIR;
  const dir = join(options.rootDir, base);
  const stamp = join(dir, STAMP);

  const held = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : '';
  const reset = existsSync(dir) && held !== options.fingerprint;

  if (reset) rmSync(dir, { recursive: true, force: true });

  mkdirSync(dir, { recursive: true });
  if (held !== options.fingerprint) writeFileSync(stamp, options.fingerprint);

  return { base, dir, fingerprint: options.fingerprint, reset };
}

export interface DuxtOgImageCacheReportInput {
  /** What the cache directory holds now, one entry per rendered image. */
  entries: { name: string; mtimeMs: number }[];
  /** When the build started, in epoch milliseconds. */
  since: number;
  /** How many OG images the build wrote into its output. */
  images: number;
  /** How many renders the build gave up on. */
  timeouts: number;
}

export interface DuxtOgImageCacheReport {
  /** Entries a previous build wrote and this one carried in. */
  restored: number;
  /** Entries this build wrote, which is what it actually rendered. */
  rendered: number;
  /** Images a PREVIOUS build rendered and this one did not have to. */
  reused: number;
  /** Images this build was asked for twice and answered itself. */
  repeated: number;
  /** Images in the build's output. */
  images: number;
  /** Renders that ran out of time, and therefore pages with no image. */
  timeouts: number;
  /** `reused / images`, and zero when there were no images. */
  hitRate: number;
  /** Whether every image the build asked for came out of it. */
  complete: boolean;
}

/**
 * What the cache saved, counted from the directory rather than claimed.
 *
 * A HIT LEAVES NO TRACE, which is what makes this indirect. nuxt-og-image reads
 * a cached image and returns it without touching the file, so there is no hit
 * counter anywhere to read; what IS visible is which entries the build wrote,
 * because writing one sets its mtime. Everything older than the build started
 * came in with the cache and everything newer was rendered here.
 *
 * NOT EVERY IMAGE THAT WAS NOT RENDERED WAS REUSED, and getting that wrong is
 * how a report flatters itself. A cold build of this site wrote 281 images out
 * of 237 renders with nothing restored: the other 44 were the same image asked
 * for twice — one locale's page linking another's — and answered from the
 * build's own store, which exists whether or not anything persists between
 * runs. Counting them as reuse reported 16% on a build that reused nothing.
 *
 * So reuse is capped by what was actually carried in, and the remainder is
 * named rather than folded in. `images = rendered + reused + repeated` holds in
 * every case, which is the property that makes the table readable.
 *
 * WHERE THAT SPLIT IS STILL A GUESS: a build that changed the TEMPLATE carries
 * in entries it cannot use, because the template's source is in the module's
 * own key. Restored is then large and none of it was readable, so the repeats
 * are attributed to the cache instead — 44 of 281 on a measured run. `rendered`
 * is the number that is never ambiguous, and a build showing `rendered` and
 * `restored` both large is one whose cache was superseded rather than reused.
 */
export function duxtOgImageCacheReport(
  input: DuxtOgImageCacheReportInput
): DuxtOgImageCacheReport {
  let restored = 0;
  let rendered = 0;

  for (const entry of input.entries) {
    if (entry.mtimeMs >= input.since) rendered++;
    else restored++;
  }

  // An image rendered with NO cache write behind it — the module only writes an
  // entry for an image that carries a max age — would otherwise read as a
  // negative count, so the floor is here rather than in the subtraction below.
  const unrendered = Math.max(0, input.images - rendered);
  const reused = Math.min(restored, unrendered);

  return {
    restored,
    rendered,
    reused,
    repeated: unrendered - reused,
    images: input.images,
    timeouts: input.timeouts,
    hitRate: input.images ? reused / input.images : 0,
    complete: input.timeouts === 0
  };
}

/**
 * Bumped when what lands in the cache directory changes SHAPE rather than
 * content — the stamp's name, the entry format nuxt-og-image writes. A restored
 * entry a newer layer no longer understands is worse than no cache, and this
 * makes that a miss instead of a puzzle.
 */
const KEY_VERSION = 'v1';

/** The heredoc marker `--github` wraps its one multi-line value in. */
const OUTPUT_DELIMITER = '__DUXT_OG_CACHE__';

export interface DuxtOgImageCacheKey {
  /** The key this run saves under. */
  key: string;
  /** The prefixes this run restores from, newest entry first. */
  restoreKeys: string[];
}

/**
 * The key a CI run carries the rendered images under.
 *
 * A ROLLING KEY, where the download cache next door uses an exact one — and the
 * difference is what the directory holds. `.data/content` is a function of the
 * source list: pin the list, and one save serves every later run. This
 * directory is a function of the PAGES, so a commit that adds one adds an image
 * and every build legitimately has something new to save. An exact key would
 * hit, never re-save, and freeze the cache at whatever the first build wrote.
 *
 * So the key carries the run and `restore-keys` carries the reuse — and the
 * FINGERPRINT sits in front of both. A font or a renderer option that moved
 * must not merely empty the directory locally: it has to miss the restore as
 * well, or every build would download a tarball of images it is about to throw
 * away.
 */
export function duxtOgImageCacheKey(
  fingerprint: string,
  run: string
): DuxtOgImageCacheKey {
  const prefix = `duxt-og-image-${KEY_VERSION}-${fingerprint}-`;

  return { key: `${prefix}${run}`, restoreKeys: [prefix] };
}

export interface DuxtOgImageCacheLocation extends DuxtOgImageCacheKey {
  /** What `ogImage.buildCache.base` takes: relative to the site's root. */
  base: string;
  /** The same directory, absolute. */
  dir: string;
  /** The directory, relative to where the COMMAND ran rather than the site. */
  path: string;
  /** The digest the directory is namespaced by. */
  fingerprint: string;
  /** Whether a build emptied it on the way past. Absent for a read-only look. */
  reset?: boolean;
}

/**
 * The key step's two shapes: `name=value` lines for a workflow, prose for a
 * person asking why their cache missed.
 *
 * ALWAYS EXIT 0, for the reason the download cache states: "there is nothing to
 * reuse here" is an answer, not a failure.
 */
export function formatDuxtOgImageCacheKey(
  argv: string[],
  data: DuxtOgImageCacheLocation
): { output: string; exitCode: number } {
  if (argv.includes('--github')) {
    return {
      output: [
        `key=${data.key}`,
        `path=${data.path}`,
        `fingerprint=${data.fingerprint}`,
        `restore-keys<<${OUTPUT_DELIMITER}`,
        ...data.restoreKeys,
        OUTPUT_DELIMITER
      ].join('\n'),
      exitCode: 0
    };
  }

  return {
    output: [
      `key       ${data.key}`,
      `restore   ${data.restoreKeys.join(', ')}`,
      `path      ${data.path}`,
      `inputs    ${data.fingerprint}`,
      data.reset
        ? 'reset     yes — the rendering inputs moved, so the directory was emptied'
        : 'reset     no'
    ].join('\n'),
    exitCode: 0
  };
}

export interface DuxtOgImageTimings {
  /** How long the Nuxt build took, in milliseconds. */
  buildMs?: number;
  /** How long wrangler took to upload it, in milliseconds. */
  uploadMs?: number;
}

/**
 * The report, in the two shapes anyone asks for it.
 *
 * BUILD AND UPLOAD ARE SEPARATE NUMBERS, which is the only reason this takes
 * timings at all. A single "deploy took N" cannot say whether a cache helped:
 * the upload is a function of the output's size and moves for reasons that have
 * nothing to do with rendering. Split, the build half is comparable between a
 * cold run and a warm one, and the upload half is the control.
 */
export function formatDuxtOgImageCacheReport(
  argv: string[],
  report: DuxtOgImageCacheReport,
  timings: DuxtOgImageTimings = {}
): { output: string; exitCode: number } {
  const percent = `${Math.round(report.hitRate * 100)}%`;

  if (argv.includes('--github')) {
    return {
      output: [
        `images=${report.images}`,
        `rendered=${report.rendered}`,
        `reused=${report.reused}`,
        `repeated=${report.repeated}`,
        `restored=${report.restored}`,
        `timeouts=${report.timeouts}`,
        `hit-rate=${percent}`,
        `complete=${report.complete}`
      ].join('\n'),
      exitCode: 0
    };
  }

  const rows: [string, string][] = [
    ['OG images in the output', String(report.images)],
    ['Reused from the cache', `${report.reused} (${percent})`],
    ['Rendered this build', String(report.rendered)],
    ['Served twice from this build', String(report.repeated)],
    ['Entries restored', String(report.restored)]
  ];

  if (timings.buildMs !== undefined)
    rows.push(['Build', duration(timings.buildMs)]);
  if (timings.uploadMs !== undefined)
    rows.push(['Upload', duration(timings.uploadMs)]);

  const lines = [
    '### 🖼️ OG image cache',
    '',
    '| Measure | Value |',
    '|---------|-------|',
    ...rows.map(([name, value]) => `| ${name} | ${value} |`)
  ];

  // Not a table row: a page whose render timed out ships with no image at all,
  // and nothing else in the build says so. It is the one line here that is a
  // finding rather than a measurement.
  if (!report.complete) {
    lines.push(
      '',
      `> [!WARNING]`,
      `> ${report.timeouts} render${report.timeouts === 1 ? '' : 's'} timed out, so that many pages carry no OG image.`
    );
  }

  return { output: lines.join('\n'), exitCode: 0 };
}

/** Milliseconds as something a person reads off a summary. */
function duration(ms: number): string {
  const seconds = Math.round(ms / 1000);

  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * The packages whose version decides what a render comes out looking like.
 *
 * `nuxt-og-image` is in here even though its own build-cache key already
 * carries its version: the key is theirs to change, this is the layer's
 * statement about what the cache depends on, and a fingerprint that is only
 * correct while an upstream implementation detail holds is not one.
 *
 * Everything else in the graph is deliberately absent. A lockfile digest would
 * be simpler and would throw the cache away on every Dependabot merge — a cold
 * build a week for packages that cannot reach a pixel.
 */
const RENDERER_PACKAGES = [
  'nuxt-og-image',
  'satori',
  '@resvg/resvg-js',
  'sharp',
  '@takumi-rs/core'
];

/**
 * The installed versions of the renderers, read out of the pnpm lockfile.
 *
 * NOT `require.resolve`, which cannot see them. `nuxt-og-image` arrives as a
 * dependency of `@nuxtjs/seo` and `satori` as a dependency of that, so under
 * pnpm's isolated linker neither sits anywhere a resolver starting at the site
 * — or at this file — would look. The lockfile is the one place that names
 * every version regardless of who depends on it.
 *
 * A site installed with something other than pnpm gets an empty record and
 * therefore a fingerprint over its configuration alone. That is a smaller net
 * than this repo's, and it is stated rather than pretended: `nuxt-og-image`'s
 * own key still carries its own version, so what is lost is invalidation on a
 * `satori` bump.
 */
export function duxtOgImageRendererVersions(
  from: string,
  packages: string[] = RENDERER_PACKAGES
): Record<string, string> {
  let dir = resolve(from);
  let lockfile = '';

  for (;;) {
    const candidate = join(dir, 'pnpm-lock.yaml');

    if (existsSync(candidate)) {
      lockfile = readFileSync(candidate, 'utf8');
      break;
    }

    const parent = dirname(dir);
    if (parent === dir) return {};
    dir = parent;
  }

  const versions: Record<string, string> = {};

  for (const name of packages) {
    // `  name@version:` under `packages:`, and `  name@version(peers):` under
    // `snapshots:` — the same version either way, so the peer suffix is cut
    // rather than matched, and a package installed at two versions is reported
    // as both rather than as whichever came first.
    //
    // The optional quote is not cosmetic: pnpm quotes every key beginning with
    // `@`, which is every scoped package, which is the native resvg binding.
    const found = new Set<string>();
    const pattern = new RegExp(
      `^ {2}'?${name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([^(:\\s']+)`,
      'gm'
    );

    for (const match of lockfile.matchAll(pattern)) found.add(match[1]!);

    if (found.size) versions[name] = [...found].sort().join(',');
  }

  return versions;
}

export interface DuxtOgImageCacheOptions {
  /** The site being built — where `.cache/` and `.output/` live. */
  rootDir?: string;
  /** What makes this run's key unique. A commit sha in CI. */
  run?: string;
}

/**
 * Where the cache is and what it is keyed under, WITHOUT touching it.
 *
 * The workflow's key step runs before the cache is restored, so it must not
 * write the stamp — and it cannot compute the full fingerprint either: a site's
 * renderer options live in its `nuxt.config.ts`, and a command that loaded that
 * would claim the Nuxt process it is standing beside.
 *
 * So the KEY is namespaced by the renderer versions alone and the DIRECTORY is
 * stamped with everything, which is the right way round. The stamp is what
 * decides whether an image may be served, and it is read by the build, which
 * knows all of it. The key only decides whether a tarball is worth downloading;
 * being too generous there costs one download of a directory the build then
 * empties, and being too strict would cost every build its cache.
 */
export function duxtOgImageCacheLocation(
  options: DuxtOgImageCacheOptions = {}
): DuxtOgImageCacheLocation {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const fingerprint = duxtOgImageFingerprint({
    dependencies: duxtOgImageRendererVersions(rootDir)
  });

  const base = DUXT_OG_IMAGE_CACHE_DIR;
  const dir = join(rootDir, base);
  // Reported relative to where the COMMAND ran, not to the site: a workflow
  // hands this straight to a cache action, whose paths are workspace-relative.
  const here = relative(process.cwd(), dir);

  return {
    base,
    dir,
    path: here && !here.startsWith('..') ? here : dir,
    fingerprint,
    ...duxtOgImageCacheKey(fingerprint, options.run ?? 'local')
  };
}

export interface DuxtOgImageCacheStateOptions extends DuxtOgImageCacheOptions {
  /** When the build started, in epoch milliseconds. */
  since: number;
  /** The captured build log, for the renders that ran out of time. */
  log?: string;
}

/** What nuxt-og-image logs for a render that ran out of its budget. */
const TIMEOUT_LINE = /renderer\.createImage timeout/g;

/**
 * Where the prerender pass puts the images, and why this is a DIRECTORY rather
 * than a filename.
 *
 * nuxt-og-image 6 writes `_og/s/<hash>.png` — or `_og/s/<encoded params>.png`
 * for an unsigned one — so there is no fixed filename to match on. v3 wrote
 * `__og-image__/image/<route>/og.png`, which is what a counter written from
 * memory looks for and what it finds none of. Both prefixes are here so the
 * count does not silently go to zero on either side of that change.
 */
const IMAGE_DIRS = new Set(['_og', '__og-image__']);

/** An image, as opposed to the payloads and HTML written all around it. */
const IMAGE_FILE = /\.(png|jpe?g)$/;

/**
 * The build, counted off the disk it left behind.
 *
 * Everything here is a READ: the cache directory for what was written when, the
 * output for what came out, the log for what did not. Nothing in a report may
 * change the thing it reports on.
 */
export function duxtOgImageCacheState(
  options: DuxtOgImageCacheStateOptions
): DuxtOgImageCacheReport {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const dir = join(rootDir, DUXT_OG_IMAGE_CACHE_DIR);

  const entries = existsSync(dir)
    ? readdirSync(dir)
        // The stamp is not an image, and upstream's own cleanup skips it by the
        // same rule. Counting it would report one render that never happened.
        .filter((name) => !name.startsWith('.'))
        .map((name) => ({ name, mtimeMs: statSync(join(dir, name)).mtimeMs }))
    : [];

  const log =
    options.log && existsSync(options.log)
      ? readFileSync(options.log, 'utf8')
      : '';

  return duxtOgImageCacheReport({
    entries,
    since: options.since,
    images: countImages(join(rootDir, '.output/public')),
    timeouts: [...log.matchAll(TIMEOUT_LINE)].length
  });
}

/**
 * Every rendered OG image under a built site.
 *
 * Scoped to the module's own output directory rather than counting every PNG
 * in the build: a site's favicon, its apple-touch-icon and whatever `@nuxt/
 * image` produced are all PNGs, and none of them was rendered here.
 */
function countImages(publicDir: string): number {
  let found = 0;

  for (const name of IMAGE_DIRS) {
    const dir = join(publicDir, name);
    if (existsSync(dir)) found += countImageFiles(dir);
  }

  return found;
}

/** Image files under one directory, however deep the route nested them. */
function countImageFiles(dir: string): number {
  let found = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) found += countImageFiles(join(dir, entry.name));
    else if (IMAGE_FILE.test(entry.name)) found++;
  }

  return found;
}

/**
 * The command, dispatched on its one flag.
 *
 * Here rather than in `bin/duxt-og-cache.mjs` because that file is plain
 * JavaScript for a resolver's sake, and a decision made there is a decision
 * nothing typechecks and no test reaches.
 */
export function duxtOgImageCacheCommand(argv: string[]): {
  output: string;
  exitCode: number;
} {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const ms = (flag: string) => {
    const raw = value(flag);

    // An EMPTY string, not merely a missing flag. A workflow passing the
    // elapsed time of a step that never ran hands over `--build-ms ''`, and
    // `Number('')` is a perfectly finite zero — which would report a build
    // that failed as one that took no time at all.
    return raw === undefined || raw === '' || !Number.isFinite(Number(raw))
      ? undefined
      : Number(raw);
  };

  const rootDir = value('--root');

  if (argv.includes('--report')) {
    return formatDuxtOgImageCacheReport(
      argv,
      duxtOgImageCacheState({
        rootDir,
        since: ms('--since') ?? 0,
        log: value('--log')
      }),
      { buildMs: ms('--build-ms'), uploadMs: ms('--upload-ms') }
    );
  }

  return formatDuxtOgImageCacheKey(
    argv,
    duxtOgImageCacheLocation({ rootDir, run: value('--run') })
  );
}
