import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { readReportNotes, writeReportNotes } from '../build/cli/report-notes';

it('serves data-only report sections only for the active producer and matching content, leaving optional absence silent', () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-report-notes-'));
  const pages = [
    { collection: 'docs', path: '/a', file: 'a.md', content: { title: 'A' } }
  ];
  try {
    mkdirSync(join(root, '.data/duxt'), { recursive: true });
    writeFileSync(
      join(root, '.data/duxt/build-layers.json'),
      JSON.stringify({ layers: [{ dir: '/wiki' }] })
    );
    expect(readReportNotes(root, pages)).toBeUndefined();
    writeReportNotes(root, '/wiki', pages, {
      sections: [
        { heading: 'Wanted pages', lines: ['Missing (1 linking page)'] }
      ],
      warnings: []
    });
    expect(readReportNotes(root, pages)?.sections).toEqual([
      { heading: 'Wanted pages', lines: ['Missing (1 linking page)'] }
    ]);
    expect(
      readReportNotes(root, [{ ...pages[0]!, path: '/renamed' }])?.sections[0]
        ?.lines[0]
    ).toContain('stale');
    writeFileSync(
      join(root, '.data/duxt/build-layers.json'),
      JSON.stringify({ layers: [{ dir: '/ordinary' }] })
    );
    expect(readReportNotes(root, pages)).toBeUndefined();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
