import { describe, expect, it } from 'vitest';
import { cacheEntryToDrop } from '../server/devtools/entry-path';

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
