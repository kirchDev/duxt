import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  diskSectionInput,
  sectionArtefactExists
} from '../build/sections/section-input';

/**
 * A remote repository controls the bytes of its own checkout, not the machine
 * that downloads it. A section artefact committed as a symlink pointing out of
 * the checkout — `CHANGELOG.md -> /proc/self/environ` — would otherwise be read
 * by the build and published as the section's content.
 */
describe('sectionArtefactExists', () => {
  const base = mkdtempSync(join(tmpdir(), 'duxt-section-input-'));
  const checkout = join(base, 'checkout');
  const outside = join(base, 'host-private');

  mkdirSync(join(checkout, 'api'), { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(outside, 'secret.txt'), 'NOT_FOR_PUBLICATION');
  writeFileSync(join(checkout, 'NOTES.md'), '# Notes');
  writeFileSync(join(checkout, 'api', 'a.bru'), 'meta {}');
  symlinkSync(join(outside, 'secret.txt'), join(checkout, 'CHANGELOG.md'));
  symlinkSync(outside, join(checkout, 'linked'));
  symlinkSync(join(checkout, 'NOTES.md'), join(checkout, 'INSIDE.md'));

  afterAll(() => rmSync(base, { recursive: true, force: true }));

  it('reads an ordinary artefact inside the checkout', () => {
    const file = join(checkout, 'NOTES.md');

    expect(sectionArtefactExists(file, 'file', checkout)).toBe(true);
    expect(diskSectionInput(file, 'NOTES.md', 'file').text()).toBe('# Notes');
  });

  it('accepts a symlink that stays inside the checkout', () => {
    expect(
      sectionArtefactExists(join(checkout, 'INSIDE.md'), 'file', checkout)
    ).toBe(true);
  });

  it('refuses a file artefact that links out of the checkout', () => {
    expect(() =>
      sectionArtefactExists(join(checkout, 'CHANGELOG.md'), 'file', checkout)
    ).toThrow(/resolves outside its checkout/);
  });

  it('refuses a directory artefact whose root links out of the checkout', () => {
    expect(() =>
      sectionArtefactExists(join(checkout, 'linked'), 'directory', checkout)
    ).toThrow(/resolves outside its checkout/);
  });

  it('still reports a missing artefact as missing', () => {
    expect(
      sectionArtefactExists(join(checkout, 'NOPE.md'), 'file', checkout)
    ).toBe(false);
  });
});
