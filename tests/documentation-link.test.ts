import { describe, expect, it } from 'vitest';
import { resolveDocumentationPath } from '../app/utils/documentation-link';

describe('resolveDocumentationPath', () => {
  it('keeps a root-source link at the website root', () => {
    expect(resolveDocumentationPath('/guide', '')).toBe('/guide');
  });

  it('keeps a normal link inside its prefixed source', () => {
    expect(resolveDocumentationPath('/guide', '/demo')).toBe('/demo/guide');
  });

  it('does not add a prefix a second time', () => {
    expect(resolveDocumentationPath('/demo/guide', '/demo')).toBe(
      '/demo/guide'
    );
  });

  it('resolves a tilde link from the website root', () => {
    expect(resolveDocumentationPath('~/reference/openapi', '/demo')).toBe(
      '/reference/openapi'
    );
  });
});
