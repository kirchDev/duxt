import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredJson, writeStoredJson } from '../app/utils/stored-json';

function storage(entries: Record<string, string> = {}) {
  return {
    getItem: (key: string) => entries[key] ?? null,
    setItem: (key: string, value: string) => {
      entries[key] = value;
    },
    entries
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('readStoredJson', () => {
  it('reads back what was written', () => {
    const local = storage();
    vi.stubGlobal('window', { localStorage: local });

    expect(writeStoredJson('duxt:test', ['a'])).toBe(true);
    expect(readStoredJson('duxt:test')).toEqual(['a']);
  });

  it('answers nothing for a missing key or a value that is not JSON', () => {
    vi.stubGlobal('window', { localStorage: storage({ broken: '{nope' }) });

    expect(readStoredJson('missing')).toBeUndefined();
    expect(readStoredJson('broken')).toBeUndefined();
  });

  it('answers nothing, and keeps nothing, where storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };
    vi.stubGlobal('window', { localStorage: blocked });

    expect(readStoredJson('duxt:test')).toBeUndefined();
    expect(writeStoredJson('duxt:test', [])).toBe(false);
  });
});
