import { describe, expect, it } from 'vitest';
import { contributorAvatar } from '../app/utils/contributor-avatar';

/**
 * The one place two surfaces turn a handle into a picture.
 *
 * Tested directly rather than through either component for the reason
 * `heading-link` is: what can go wrong here is a template that silently
 * produces a URL with `{username}` still in it, and a component test would
 * need a Nuxt environment to find out.
 */
describe('contributorAvatar', () => {
  it('puts the handle into the template a site configured', () => {
    expect(
      contributorAvatar('https://github.com/{username}.png?size=40', 'octocat')
    ).toBe('https://github.com/octocat.png?size=40');
  });

  it('gives nothing where git carried no handle', () => {
    // A name and no picture is the truth; a guessed avatar is somebody else.
    expect(
      contributorAvatar('https://github.com/{username}.png', undefined)
    ).toBeUndefined();
  });

  it('gives nothing where the site configured no template', () => {
    expect(contributorAvatar(undefined, 'octocat')).toBeUndefined();
    expect(contributorAvatar('', 'octocat')).toBeUndefined();
  });
});
