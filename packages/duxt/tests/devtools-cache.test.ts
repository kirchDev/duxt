import { afterAll, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cacheEntryToDrop,
  isListedCacheEntry,
  sameOriginMutation
} from '../server/devtools/entry-path';

/**
 * The one destructive thing the devtools tab can do, and the only part of it
 * worth a test: the name comes from a form field, so what it may resolve to is
 * the whole safety property.
 */
describe('cacheEntryToDrop', () => {
  const dataDir = '/site/.data/content';

  it('accepts a direct child of the cache directory', () => {
    expect(
      cacheEntryToDrop(dataDir, 'github.com-kirchDev-workflows-v0.7.0')
    ).toBe('/site/.data/content/github.com-kirchDev-workflows-v0.7.0');
  });

  it('refuses to climb out of it', () => {
    expect(cacheEntryToDrop(dataDir, '..')).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, '../..')).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, '../content')).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, 'a/../../b')).toBeUndefined();
  });

  it('refuses an absolute path, whatever it points at', () => {
    expect(cacheEntryToDrop(dataDir, '/etc')).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, '/site/.data/content')).toBeUndefined();
    // Even one that would resolve to a direct child: the field carries a name.
    expect(cacheEntryToDrop(dataDir, '/site/.data/content/x')).toBeUndefined();
  });

  it('refuses a nested entry, which Content never creates at the top level', () => {
    expect(cacheEntryToDrop(dataDir, 'a/b')).toBeUndefined();
  });

  it('refuses anything that is not a usable name', () => {
    expect(cacheEntryToDrop(dataDir, '')).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, '.')).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, undefined)).toBeUndefined();
    expect(cacheEntryToDrop(dataDir, 42)).toBeUndefined();
  });
});

/**
 * Any page the developer has open can POST a form at the local dev server, so
 * deleting a cache entry needs proof the request came from the tab itself.
 */
describe('sameOriginMutation', () => {
  const selfOrigin = 'http://localhost:3000';

  it('accepts the tab posting to itself', () => {
    expect(
      sameOriginMutation({ secFetchSite: 'same-origin', selfOrigin })
    ).toBe(true);
  });

  it.each(['cross-site', 'same-site', 'none'])(
    'refuses Sec-Fetch-Site %s',
    (secFetchSite) => {
      expect(
        sameOriginMutation({ secFetchSite, origin: selfOrigin, selfOrigin })
      ).toBe(false);
    }
  );

  it('falls back to Origin where Sec-Fetch-Site is absent', () => {
    expect(sameOriginMutation({ origin: selfOrigin, selfOrigin })).toBe(true);
    expect(
      sameOriginMutation({ origin: 'https://evil.test', selfOrigin })
    ).toBe(false);
    expect(sameOriginMutation({ origin: 'null', selfOrigin })).toBe(false);
  });

  it('lets a non-browser client through, which no other site can drive', () => {
    expect(sameOriginMutation({ selfOrigin })).toBe(true);
  });
});

/** Only what the panel lists — a downloaded repository's directory — may go. */
describe('isListedCacheEntry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'duxt-devtools-cache-'));
  mkdirSync(join(dir, 'github.com-o-r-main'));
  writeFileSync(join(dir, 'contents.sqlite'), '');
  symlinkSync(join(dir, 'github.com-o-r-main'), join(dir, 'link'));

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('accepts a directory', () => {
    expect(isListedCacheEntry(join(dir, 'github.com-o-r-main'))).toBe(true);
  });

  it('refuses the parse cache, a symlink and a missing name', () => {
    expect(isListedCacheEntry(join(dir, 'contents.sqlite'))).toBe(false);
    expect(isListedCacheEntry(join(dir, 'link'))).toBe(false);
    expect(isListedCacheEntry(join(dir, 'nope'))).toBe(false);
  });
});
