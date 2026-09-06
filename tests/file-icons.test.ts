import { describe, expect, it } from 'vitest';
import { fileIcon, folderIcon } from '../app/utils/file-icons';

describe('fileIcon', () => {
  it('picks a whole filename over its extension', () => {
    // package.json is npm's, not JSON's — the name has to win.
    expect(fileIcon('package.json')).toBe('vscode-icons:file-type-npm');
    expect(fileIcon('data.json')).toBe('vscode-icons:file-type-json');
  });

  it('matches a filename inside a path', () => {
    expect(fileIcon('app/nuxt.config.ts')).toBe('vscode-icons:file-type-nuxt');
  });

  it('falls back to the extension for anything unnamed', () => {
    expect(fileIcon('Header.vue')).toBe('vscode-icons:file-type-vue');
    expect(fileIcon('README.md')).toBe('vscode-icons:file-type-markdown');
  });

  it('accepts a bare language id, which is how a code fence asks', () => {
    expect(fileIcon('ts')).toBe('vscode-icons:file-type-typescript');
    expect(fileIcon('bash')).toBe('vscode-icons:file-type-shell');
  });

  it('ignores case, because a filename is not a keyword', () => {
    expect(fileIcon('Dockerfile')).toBe('vscode-icons:file-type-docker');
  });

  it('returns the fallback for something it does not know', () => {
    expect(fileIcon('notes.xyz')).toBe('lucide:file');
    expect(fileIcon('notes.xyz', 'lucide:terminal')).toBe('lucide:terminal');
    expect(fileIcon(undefined)).toBe('lucide:file');
  });
});

describe('folderIcon', () => {
  it('opens and closes', () => {
    expect(folderIcon(false)).toBe('lucide:folder');
    expect(folderIcon(true)).toBe('lucide:folder-open');
  });
});
