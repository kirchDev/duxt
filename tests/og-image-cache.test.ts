import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  duxtOgImageBuildCache,
  duxtOgImageCacheCommand,
  duxtOgImageCacheKey,
  duxtOgImageCacheReport,
  duxtOgImageCacheState,
  duxtOgImageFingerprint,
  duxtOgImageRendererVersions,
  formatDuxtOgImageCacheKey,
  formatDuxtOgImageCacheReport
} from '../og-image-cache';

/**
 * When a rendered OG image may be reused, and when reusing one would be a lie.
 *
 * nuxt-og-image's own cache key already covers the page and the template, so
 * what is checked here is the part it cannot see: the fonts, the renderer
 * options and the renderer packages. Every one of those failures is silent —
 * the page renders, the build is green, and the image is a picture of the
 * previous design — so there is nowhere else this could be caught.
 *
 * The counts are checked for the same reason from the other side. A render that
 * runs out of time is logged and dropped; the page ships with no image at all
 * and nothing fails. What the report says about that is the only signal.
 */

describe('duxtOgImageFingerprint', () => {
  it('is the same for the same renderer configuration and versions', () => {
    const inputs = {
      options: { satoriOptions: { embedFont: true } },
      dependencies: { satori: '0.33.4' }
    };

    expect(duxtOgImageFingerprint(inputs)).toBe(
      duxtOgImageFingerprint(structuredClone(inputs))
    );
  });

  it('moves when a renderer dependency is upgraded', () => {
    const before = duxtOgImageFingerprint({
      dependencies: { satori: '0.33.4' }
    });
    const after = duxtOgImageFingerprint({
      dependencies: { satori: '0.34.0' }
    });

    expect(after).not.toBe(before);
  });
});

describe('duxtOgImageFingerprint invalidation', () => {
  it('moves when the fonts change', () => {
    const before = duxtOgImageFingerprint({
      options: { fonts: ['Inter:400'] }
    });
    const after = duxtOgImageFingerprint({
      options: { fonts: ['Inter:400', 'Inter:700'] }
    });

    expect(after).not.toBe(before);
  });

  it('moves when a renderer setting changes', () => {
    const before = duxtOgImageFingerprint({
      options: { resvgOptions: { fitTo: { mode: 'width', value: 1200 } } }
    });
    const after = duxtOgImageFingerprint({
      options: { resvgOptions: { fitTo: { mode: 'width', value: 2400 } } }
    });

    expect(after).not.toBe(before);
  });

  it('stands still when only the render BUDGET moves', () => {
    // A timeout cannot change a pixel, and it is the lever the prerender
    // concurrency work has to be free to move without discarding the cache.
    const before = duxtOgImageFingerprint({
      options: { satoriOptions: {}, security: { renderTimeout: 15_000 } }
    });
    const after = duxtOgImageFingerprint({
      options: { satoriOptions: {}, security: { renderTimeout: 60_000 } }
    });

    expect(after).toBe(before);
  });

  it('stands still when the same config is written in a different order', () => {
    const before = duxtOgImageFingerprint({
      options: { fontSubsets: ['latin'], satoriOptions: { embedFont: true } },
      dependencies: { satori: '0.33.4', 'nuxt-og-image': '6.7.8' }
    });
    const after = duxtOgImageFingerprint({
      options: { satoriOptions: { embedFont: true }, fontSubsets: ['latin'] },
      dependencies: { 'nuxt-og-image': '6.7.8', satori: '0.33.4' }
    });

    expect(after).toBe(before);
  });
});

describe('duxtOgImageBuildCache', () => {
  const site = () => mkdtempSync(join(tmpdir(), 'duxt-og-'));

  it('hands the module a base it resolves against the site root', () => {
    const rootDir = site();

    const cache = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });

    expect(isAbsolute(cache.base)).toBe(false);
    expect(join(rootDir, cache.base)).toBe(cache.dir);
  });

  it('keeps what a previous build rendered under the same fingerprint', () => {
    const rootDir = site();
    const first = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });
    writeFileSync(join(first.dir, 'kept.png'), 'rendered');

    const second = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });

    expect(second.reset).toBe(false);
    expect(existsSync(join(second.dir, 'kept.png'))).toBe(true);
  });

  it('throws away every image when the fingerprint has moved', () => {
    const rootDir = site();
    const first = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });
    writeFileSync(join(first.dir, 'stale.png'), 'rendered');

    const second = duxtOgImageBuildCache({ rootDir, fingerprint: 'def456' });

    expect(second.reset).toBe(true);
    expect(existsSync(join(second.dir, 'stale.png'))).toBe(false);
  });

  it('reports a site that had no cache as having thrown nothing away', () => {
    // `reset` is read off the removal rather than off a check before it, so the
    // one case a removal has to get right is the one where there is nothing to
    // remove. A first build must not claim it emptied anything.
    const rootDir = site();

    expect(
      duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' }).reset
    ).toBe(false);
  });

  it('throws away a directory that holds images and no stamp', () => {
    // A build killed between the mkdir and the stamp leaves images whose fonts
    // and renderer nothing can name. Unstamped is not "unchanged": the images
    // go, because the stamp is the only thing that ever licensed serving them.
    // This is the case a `held !== ''` guard would silently keep, and it passes
    // every other test in this block.
    const rootDir = site();
    const first = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });
    writeFileSync(join(first.dir, 'orphan.png'), 'rendered');
    for (const entry of readdirSync(first.dir)) {
      if (entry.startsWith('.')) rmSync(join(first.dir, entry));
    }

    const second = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });

    expect(second.reset).toBe(true);
    expect(existsSync(join(second.dir, 'orphan.png'))).toBe(false);
  });

  it('stamps the fingerprint where the module will not read it as an image', () => {
    // nuxt-og-image's own `prerender:done` cleanup reads every entry of this
    // directory as JSON and skips names starting with a dot. A stamp written
    // under any other name crashes its cleanup, not ours.
    const rootDir = site();

    const cache = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });

    expect(readdirSync(cache.dir).every((entry) => entry.startsWith('.'))).toBe(
      true
    );
  });
});

describe('duxtOgImageCacheReport', () => {
  const entries = (count: number, mtimeMs: number) =>
    Array.from({ length: count }, (_, index) => ({
      name: `${index}.png`,
      mtimeMs
    }));

  it('reports a fully warm build as having rendered nothing', () => {
    const report = duxtOgImageCacheReport({
      entries: entries(1053, 1_000),
      since: 2_000,
      images: 1053,
      timeouts: 0
    });

    expect(report).toMatchObject({
      restored: 1053,
      rendered: 0,
      reused: 1053,
      hitRate: 1,
      complete: true
    });
  });

  it('reports a cold build as having reused nothing', () => {
    const report = duxtOgImageCacheReport({
      entries: entries(1053, 3_000),
      since: 2_000,
      images: 1053,
      timeouts: 0
    });

    expect(report).toMatchObject({ restored: 0, rendered: 1053, reused: 0 });
    expect(report.hitRate).toBe(0);
  });

  it('counts the pages a warm build still had to render', () => {
    const report = duxtOgImageCacheReport({
      entries: [...entries(900, 1_000), ...entries(153, 3_000)],
      since: 2_000,
      images: 1053,
      timeouts: 0
    });

    expect(report).toMatchObject({ restored: 900, rendered: 153, reused: 900 });
  });

  it('never claims more reuse than there were images', () => {
    // An image rendered with no cache write behind it — the module only writes
    // an entry when the image carries a max age — would otherwise read as a
    // NEGATIVE render count.
    const report = duxtOgImageCacheReport({
      entries: entries(4, 3_000),
      since: 2_000,
      images: 2,
      timeouts: 0
    });

    expect(report.reused).toBe(0);
  });

  it('claims no reuse on a cold build that served its own repeats', () => {
    // 281 images out of 237 cache entries, with nothing restored: the other 44
    // were the SAME image asked for twice — one locale's page linking another's
    // — and answered from the build's own store. Not a render, and not the
    // persistent cache doing anything either, which is the whole difference.
    const report = duxtOgImageCacheReport({
      entries: Array.from({ length: 237 }, () => ({
        name: 'a',
        mtimeMs: 3_000
      })),
      since: 2_000,
      images: 281,
      timeouts: 0
    });

    expect(report.reused).toBe(0);
    expect(report.hitRate).toBe(0);
    expect(report.repeated).toBe(44);
  });

  it('reports a build that timed out as incomplete', () => {
    const report = duxtOgImageCacheReport({
      entries: entries(913, 3_000),
      since: 2_000,
      images: 913,
      timeouts: 140
    });

    expect(report).toMatchObject({ timeouts: 140, complete: false });
  });

  it('has no hit rate to report when nothing was rendered at all', () => {
    const report = duxtOgImageCacheReport({
      entries: [],
      since: 2_000,
      images: 0,
      timeouts: 0
    });

    expect(report.hitRate).toBe(0);
  });
});

describe('duxtOgImageCacheKey', () => {
  it('rolls forward per build so every run saves what it rendered', () => {
    // An exact key that hits is never re-saved, and this directory legitimately
    // grows: a new page is a new image. So the key carries the run and the
    // restore prefix is what makes the next build warm.
    const key = duxtOgImageCacheKey('abc123', 'deadbeef');

    expect(key.key.startsWith(key.restoreKeys[0])).toBe(true);
    expect(key.key).not.toBe(key.restoreKeys[0]);
    expect(key.key).toContain('deadbeef');
  });

  it('cannot restore across a fingerprint change', () => {
    const before = duxtOgImageCacheKey('abc123', 'deadbeef');
    const after = duxtOgImageCacheKey('def456', 'deadbeef');

    expect(after.key.startsWith(before.restoreKeys[0])).toBe(false);
    expect(before.key.startsWith(after.restoreKeys[0])).toBe(false);
  });
});

describe('formatDuxtOgImageCacheKey', () => {
  const cache = {
    base: '.cache/og-image',
    dir: '/repo/www/.cache/og-image',
    fingerprint: 'abc123',
    reset: false,
    path: 'www/.cache/og-image',
    ...duxtOgImageCacheKey('abc123', 'deadbeef')
  };

  it('writes the step outputs a cache action reads', () => {
    const { output, exitCode } = formatDuxtOgImageCacheKey(['--github'], cache);
    const lines = output.split('\n');

    expect(exitCode).toBe(0);
    expect(lines).toContain(`key=${cache.key}`);
    expect(lines).toContain('path=www/.cache/og-image');
    expect(lines).toContain('fingerprint=abc123');
    // `restore-keys` is a list, and `$GITHUB_OUTPUT` takes one only as a
    // heredoc — a bare newline would end the value at the first entry.
    expect(output).toMatch(/restore-keys<<(\S+)\n[\s\S]*\n\1/);
  });

  it('says why the key is what it is when nobody passed --github', () => {
    const { output } = formatDuxtOgImageCacheKey([], cache);

    expect(output).toContain('abc123');
    expect(output).toContain('www/.cache/og-image');
    expect(output).not.toContain('key=');
  });
});

describe('formatDuxtOgImageCacheReport', () => {
  const warm = duxtOgImageCacheReport({
    entries: [
      ...Array.from({ length: 1000 }, () => ({ name: 'a', mtimeMs: 1_000 })),
      ...Array.from({ length: 53 }, () => ({ name: 'b', mtimeMs: 3_000 }))
    ],
    since: 2_000,
    images: 1053,
    timeouts: 0
  });

  it('reports reuse and elapsed time as a table a summary can hold', () => {
    const { output } = formatDuxtOgImageCacheReport([], warm, {
      buildMs: 120_000,
      uploadMs: 8_000
    });

    expect(output).toContain('1053');
    expect(output).toContain('1000');
    expect(output).toContain('95%');
    // Build and upload are separated so the saving can be read off one of them
    // rather than off their sum.
    expect(output).toMatch(/build/i);
    expect(output).toMatch(/upload/i);
    expect(output).toContain('2m 0s');
    expect(output).toContain('8s');
  });

  it('names the renders that ran out of time rather than burying them', () => {
    const timedOut = duxtOgImageCacheReport({
      entries: [],
      since: 2_000,
      images: 913,
      timeouts: 140
    });

    const { output } = formatDuxtOgImageCacheReport([], timedOut, {});

    expect(output).toContain('140');
    expect(output).toMatch(/timed out|timeout/i);
  });

  it('writes the step outputs a workflow can branch on', () => {
    const { output, exitCode } = formatDuxtOgImageCacheReport(
      ['--github'],
      warm,
      {}
    );
    const lines = output.split('\n');

    expect(exitCode).toBe(0);
    expect(lines).toContain('images=1053');
    expect(lines).toContain('rendered=53');
    expect(lines).toContain('reused=1000');
    expect(lines).toContain('timeouts=0');
  });
});

describe('duxtOgImageRendererVersions', () => {
  it('reads a renderer nothing resolves to out of the lockfile', () => {
    // `satori` is a dependency of a dependency of a dependency here, so under
    // pnpm's isolated linker it sits nowhere a resolver starting at the site
    // would look. The lockfile names it anyway.
    const dir = mkdtempSync(join(tmpdir(), 'duxt-og-lock-'));
    writeFileSync(
      join(dir, 'pnpm-lock.yaml'),
      [
        'packages:',
        '',
        '  nuxt-og-image@6.7.8:',
        '    resolution: {integrity: sha512-x}',
        '',
        '  satori@0.33.4:',
        '    resolution: {integrity: sha512-y}',
        '',
        'snapshots:',
        '',
        '  satori@0.33.4:',
        '    dependencies: {}',
        ''
      ].join('\n')
    );
    mkdirSync(join(dir, 'www'), { recursive: true });

    expect(duxtOgImageRendererVersions(join(dir, 'www'))).toEqual({
      'nuxt-og-image': '6.7.8',
      satori: '0.33.4'
    });
  });

  it('reports a package installed at two versions as both', () => {
    const dir = mkdtempSync(join(tmpdir(), 'duxt-og-lock-'));
    writeFileSync(
      join(dir, 'pnpm-lock.yaml'),
      ['packages:', '  satori@0.33.4:', '  satori@0.34.0:', ''].join('\n')
    );

    expect(duxtOgImageRendererVersions(dir)).toEqual({
      satori: '0.33.4,0.34.0'
    });
  });

  it('reads a scoped renderer, whose lockfile key is quoted', () => {
    // pnpm quotes any key starting with `@`, and the native resvg binding is
    // the one renderer in this layer that is scoped.
    const dir = mkdtempSync(join(tmpdir(), 'duxt-og-lock-'));
    writeFileSync(
      join(dir, 'pnpm-lock.yaml'),
      [
        'packages:',
        "  '@resvg/resvg-js@2.6.2':",
        "  '@resvg/resvg-js-linux-x64-gnu@2.6.2':",
        ''
      ].join('\n')
    );

    expect(duxtOgImageRendererVersions(dir)).toEqual({
      '@resvg/resvg-js': '2.6.2'
    });
  });

  it('has nothing to say about a site installed without pnpm', () => {
    expect(
      duxtOgImageRendererVersions(mkdtempSync(join(tmpdir(), 'x-')))
    ).toEqual({});
  });
});

describe('duxtOgImageCacheState', () => {
  it('counts the images the build wrote and the renders it gave up on', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'duxt-og-site-'));
    // `_og/s/` is where nuxt-og-image 6 puts them, under a name that is the
    // image's own hash or its encoded parameters — never `og.png`, which is
    // what v3 wrote and what an out-of-date counter would look for.
    const images = join(rootDir, '.output/public/_og/s');
    mkdirSync(images, { recursive: true });
    writeFileSync(join(images, 'o_6b9j4k.png'), 'png');
    writeFileSync(join(images, 'c_Duxt,title_Webhooks.png'), 'png');
    // Not OG images, and the crawl writes thousands of the first beside them.
    writeFileSync(join(rootDir, '.output/public/index.html'), '<html>');
    writeFileSync(join(rootDir, '.output/public/apple-touch-icon.png'), 'png');

    const log = join(rootDir, 'build.log');
    writeFileSync(
      log,
      [
        'ℹ renderer.createImage timeout for /a/__og-image__/image/og.png',
        'ℹ Prerendered 1053 routes',
        'ℹ renderer.createImage timeout for /b/__og-image__/image/og.png'
      ].join('\n')
    );

    const report = duxtOgImageCacheState({ rootDir, since: 0, log });

    expect(report.images).toBe(2);
    expect(report.timeouts).toBe(2);
  });

  it('reads a site that has never been built as having rendered nothing', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'duxt-og-site-'));

    expect(duxtOgImageCacheState({ rootDir, since: 0 })).toMatchObject({
      images: 0,
      rendered: 0,
      timeouts: 0
    });
  });

  it('splits the cache directory by what this build wrote', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'duxt-og-site-'));
    const cache = duxtOgImageBuildCache({ rootDir, fingerprint: 'abc123' });
    writeFileSync(join(cache.dir, 'old.png'), 'x');
    utimesSync(join(cache.dir, 'old.png'), new Date(1_000), new Date(1_000));
    writeFileSync(join(cache.dir, 'new.png'), 'x');

    const report = duxtOgImageCacheState({ rootDir, since: 2_000 });

    // The stamp is not an image and must never be counted as one.
    expect(report.restored).toBe(1);
    expect(report.rendered).toBe(1);
  });
});

describe('duxtOgImageCacheCommand', () => {
  it('leaves out the elapsed time of a step that never ran', () => {
    // A workflow reporting after a failed build hands over `--build-ms ''`, and
    // `Number('')` is a finite zero.
    const rootDir = mkdtempSync(join(tmpdir(), 'duxt-og-site-'));
    const { output } = duxtOgImageCacheCommand([
      '--root',
      rootDir,
      '--report',
      '--since',
      '0',
      '--build-ms',
      '',
      '--upload-ms',
      ''
    ]);

    expect(output).not.toMatch(/\| Build \|/);
    expect(output).not.toMatch(/\| Upload \|/);
  });
});
