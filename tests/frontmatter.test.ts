import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { frontmatterBlock, stripFrontmatter } from '../frontmatter';

describe('frontmatterBlock', () => {
  it('writes values YAML reads back, colons included', () => {
    const block = frontmatterBlock({ title: 'GET /pets/{petId}: not found' });
    const yaml = block.replace(/^---\n|\n---$/g, '');

    expect(parseYaml(yaml)).toEqual({ title: 'GET /pets/{petId}: not found' });
  });

  it('writes no key for an absent or empty value', () => {
    expect(
      frontmatterBlock({ title: 'Pets', description: undefined, release: '' })
    ).toBe('---\ntitle: "Pets"\n---');
  });
});

describe('stripFrontmatter', () => {
  it('takes the block off and leaves the prose', () => {
    expect(stripFrontmatter('---\ntitle: "Pets"\n---\n# Pets\n')).toBe(
      '# Pets\n'
    );
  });

  it('understands Windows line endings', () => {
    expect(stripFrontmatter('---\r\ntitle: x\r\n---\r\nBody')).toBe('Body');
  });

  it('leaves a body without a block alone', () => {
    expect(stripFrontmatter('# Pets\n\n---\n')).toBe('# Pets\n\n---\n');
  });

  it('round-trips what the writer wrote', () => {
    const page = `${frontmatterBlock({ title: 'A: B' })}\n\nBody\n`;
    expect(stripFrontmatter(page)).toBe('\nBody\n');
  });
});
