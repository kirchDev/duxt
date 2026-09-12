import { describe, expect, it } from 'vitest';
import {
  contentQueryFootprint,
  pagefindQueryFootprint,
  searchIndexVerdict
} from '../scripts/search-index-bench';

/**
 * The arithmetic behind issue #33, which is the only part of that evaluation a
 * test can reach.
 *
 * What #33 asked for is a MEASUREMENT over `www/`'s real content, and the
 * numbers in `docs/99.adr/0010-*` were taken by building a Pagefind index from
 * 11,937 real records. Nothing here re-takes them: a test that built an index
 * would need the 57 MB platform binary in CI for a candidate the ADR rejected.
 *
 * What it does pin is the rule those numbers were read by — which files a query
 * actually costs, which of them a reader pays for again on the next query, and
 * the conditions under which a candidate index would replace Content's. A
 * benchmark whose conclusion is arithmetic somebody did once in a terminal is a
 * benchmark nobody can check a year later, which is exactly what
 * `prerender-bench` exists not to be.
 */

/**
 * A Pagefind index as `getFiles()` actually returns one, cut down to two
 * languages and the sizes measured on `www/`.
 *
 * REAL SIZES, because the whole point of the fixture is that the rule was read
 * against the shape Pagefind emits rather than an imagined one: the entry and
 * the loader are shared, but the wasm, the metadata and every chunk carry the
 * language in the FILENAME and sit in one flat directory — there is no
 * `en-GB/` to select by prefix.
 */
const index = [
  { path: 'pagefind.js', bytes: 45_555 },
  { path: 'pagefind-entry.json', bytes: 426 },
  { path: 'wasm.en-GB.pagefind', bytes: 72_209 },
  { path: 'wasm.de.pagefind', bytes: 70_562 },
  { path: 'pagefind.en-GB_be683bdd9372b.pf_meta', bytes: 18_543 },
  { path: 'pagefind.de_dd7c7a8e98.pf_meta', bytes: 15_366 },
  { path: 'index/en-GB_2d3475d.pf_index', bytes: 9269 },
  { path: 'index/en-GB_9f1c044.pf_index', bytes: 9423 },
  { path: 'index/de_4a81bb2.pf_index', bytes: 9942 },
  { path: 'fragment/en-GB_38cab17.pf_fragment', bytes: 392 },
  { path: 'fragment/en-GB_24964eb.pf_fragment', bytes: 681 },
  { path: 'fragment/de_01dc12d.pf_fragment', bytes: 405 }
];

describe('pagefindQueryFootprint', () => {
  it('charges a first query for the loader, the wasm, the metadata, one index chunk and one fragment per result shown', () => {
    const footprint = pagefindQueryFootprint(index, {
      language: 'en-GB',
      chunks: 1,
      results: 10
    });

    // 45,555 loader + 426 entry + 72,209 wasm + 18,543 metadata
    // + 9,346 (the mean en-GB chunk) + 10 × 536 (the mean en-GB fragment)
    // = 151,439.
    expect(footprint.bytes).toBe(151_439);
  });

  it('leaves the other languages out — an index is selected, not downloaded', () => {
    const english = pagefindQueryFootprint(index, {
      language: 'en-GB',
      chunks: 1,
      results: 10
    });
    const german = pagefindQueryFootprint(index, {
      language: 'de',
      chunks: 1,
      results: 10
    });

    expect(english.bytes).not.toBe(german.bytes);
    // 45,555 + 426 + 70,562 + 15,366 + 9,942 + 10 × 405 = 145,901.
    expect(german.bytes).toBe(145_901);
  });

  it('charges a second query for the chunk and the fragments alone', () => {
    const footprint = pagefindQueryFootprint(index, {
      language: 'en-GB',
      chunks: 1,
      results: 10,
      warm: true
    });

    // 9,346 one chunk + 10 × 536 = 14,706. The loader, the wasm and the
    // metadata are the constant a reader pays once per session.
    expect(footprint.bytes).toBe(14_706);
    expect(footprint.constant).toBe(0);
  });
});

/**
 * A finished build of `www/`, cut to the files search actually reaches for.
 *
 * The engine is Content's client database — a WASM build of SQLite and the
 * worker that drives it — and the payload is one whole `sql_dump.txt` per
 * collection the reader's scope puts in play. Sizes measured on the same build
 * the Pagefind fixture above was taken from.
 */
const built = [
  { path: '_nuxt/sqlite3.BVKGSWc-.wasm', bytes: 864_752 },
  { path: '_nuxt/sqlite3-worker1-Dla_zcLf.js', bytes: 210_721 },
  { path: '_nuxt/entry.Cx1s8-vK.js', bytes: 512_000 },
  { path: '__nuxt_content/docs/sql_dump.txt', bytes: 210_544 },
  { path: '__nuxt_content/docs_de/sql_dump.txt', bytes: 228_656 },
  { path: '__nuxt_content/docs_tf/sql_dump.txt', bytes: 53_244 },
  { path: '__nuxt_content/docs_releases/sql_dump.txt', bytes: 43_020 }
];

describe('contentQueryFootprint', () => {
  it('charges a first query for the database engine and one whole dump per collection in scope', () => {
    const footprint = contentQueryFootprint(built, {
      collections: ['docs', 'docs_tf', 'docs_releases']
    });

    // 864,752 wasm + 210,721 worker + 210,544 + 53,244 + 43,020 = 1,382,281.
    // The unrelated entry chunk is not search's to charge for.
    expect(footprint.bytes).toBe(1_382_281);
  });

  it('grows with the number of collections in scope, which is the whole complaint', () => {
    const english = contentQueryFootprint(built, {
      collections: ['docs', 'docs_tf', 'docs_releases']
    });
    const german = contentQueryFootprint(built, {
      collections: ['docs_de', 'docs', 'docs_tf', 'docs_releases']
    });

    expect(german.bytes - english.bytes).toBe(228_656);
  });

  it('charges a second query for nothing at all — the database is already in the browser', () => {
    const footprint = contentQueryFootprint(built, {
      collections: ['docs', 'docs_tf', 'docs_releases'],
      warm: true
    });

    expect(footprint.bytes).toBe(0);
    expect(footprint.variable).toBe(0);
  });
});

/**
 * The rule that decides, which is the half of #33 that outlives its numbers.
 *
 * Issue #33 listed six things the evaluation had to settle and left the
 * conclusion open — "it is genuinely open, because today's shape is also the
 * Nuxt norm". So the rule is written from those six rather than from the
 * outcome, and `pagefind` below is the measurement fed back through it: the
 * ADR's "no" is a value this function returns, not a sentence somebody typed.
 */

/** Pagefind 1.5.2 over `www/`'s 11,937 records, as measured for #33. */
const pagefind = {
  coldBytes: 149_919,
  warmBytes: 13_186,
  files: 12_066,
  rankedTogether: true,
  typoTolerant: false,
  buildTimeOnly: true,
  platforms: [
    'darwin-arm64',
    'darwin-x64',
    'freebsd-x64',
    'linux-arm64',
    'linux-x64',
    'windows-arm64',
    'windows-x64'
  ]
};

/** The same build, read by `contentQueryFootprint` above. */
const today = { coldBytes: 1_382_281, warmBytes: 0, files: 1414 };

describe('searchIndexVerdict', () => {
  it('rejects Pagefind, and names typo tolerance and the file count rather than the payload', () => {
    const verdict = searchIndexVerdict(today, pagefind, {
      ceiling: 20_000,
      platforms: ['linux-x64', 'darwin-arm64', 'windows-x64']
    });

    expect(verdict.replace).toBe(false);
    expect(verdict.failed).toEqual(['typo-tolerance', 'file-ceiling']);
    expect(verdict.passed).toContain('payload');
    expect(verdict.passed).toContain('ranked-together');
  });

  it('accepts a candidate that clears all six', () => {
    const verdict = searchIndexVerdict(
      today,
      { ...pagefind, typoTolerant: true, files: 3000 },
      { ceiling: 20_000, platforms: ['linux-x64'] }
    );

    expect(verdict.replace).toBe(true);
    expect(verdict.failed).toEqual([]);
  });

  it('rejects a candidate that merely ties on payload — a default is not changed for a rounding error', () => {
    const verdict = searchIndexVerdict(
      today,
      {
        ...pagefind,
        typoTolerant: true,
        files: 3000,
        coldBytes: today.coldBytes - 1
      },
      { ceiling: 20_000, platforms: ['linux-x64'] }
    );

    expect(verdict.replace).toBe(false);
    expect(verdict.failed).toEqual(['payload']);
  });

  it('rejects a candidate that cannot rank its sources in one list, however small it is', () => {
    const verdict = searchIndexVerdict(
      today,
      { ...pagefind, typoTolerant: true, files: 100, rankedTogether: false },
      { ceiling: 20_000, platforms: ['linux-x64'] }
    );

    expect(verdict.replace).toBe(false);
    expect(verdict.failed).toEqual(['ranked-together']);
  });

  it('rejects a candidate that refreshes at runtime, because ADR-0006 already settled that', () => {
    const verdict = searchIndexVerdict(
      today,
      { ...pagefind, typoTolerant: true, files: 100, buildTimeOnly: false },
      { ceiling: 20_000, platforms: ['linux-x64'] }
    );

    expect(verdict.failed).toEqual(['build-time']);
  });

  it('rejects a candidate whose binaries miss a platform `engines` promises', () => {
    const verdict = searchIndexVerdict(
      today,
      { ...pagefind, typoTolerant: true, files: 100 },
      { ceiling: 20_000, platforms: ['linux-x64', 'linux-riscv64'] }
    );

    expect(verdict.failed).toEqual(['platforms']);
  });
});
