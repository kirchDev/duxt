import { describe, expect, it } from 'vitest';
import { deploymentSummary, elapsed } from '../scripts/deploy-summary';

describe('elapsed', () => {
  it('reports a sub-minute wait in seconds', () => {
    expect(elapsed('2026-09-11T10:00:00Z', '2026-09-11T10:00:45Z')).toBe('45s');
  });

  it('reports minutes and seconds once it passes a minute', () => {
    // 4 minutes 12 seconds — a fast deploy of this site.
    expect(elapsed('2026-09-11T10:00:00Z', '2026-09-11T10:04:12Z')).toBe(
      '4m 12s'
    );
  });

  it('reports hours once it passes one', () => {
    // 1 hour 3 minutes 7 seconds — what a queue behind several pushes used to
    // look like, and the number this row exists to make visible.
    expect(elapsed('2026-09-11T10:00:00Z', '2026-09-11T11:03:07Z')).toBe(
      '1h 3m 7s'
    );
  });

  it('measures nothing it cannot measure', () => {
    // An amended commit date or a skewed clock puts the source AFTER the
    // publication. Reporting a negative age would read as a measurement; it
    // is the absence of one.
    expect(
      elapsed('2026-09-11T11:00:00Z', '2026-09-11T10:00:00Z')
    ).toBeUndefined();
    expect(elapsed('', '2026-09-11T10:00:00Z')).toBeUndefined();
    expect(elapsed('not a date', '2026-09-11T10:00:00Z')).toBeUndefined();
  });
});

describe('deploymentSummary', () => {
  const publication = {
    sha: '0123456789abcdef0123456789abcdef01234567',
    worker: 'duxt-www',
    trigger: 'push',
    committedAt: '2026-09-11T10:00:00Z',
    publishedAt: '2026-09-11T10:04:12Z'
  };

  it('carries the freshness of what it just published', () => {
    const summary = deploymentSummary(publication);

    expect(summary).toContain('| Time to publish | 4m 12s |');
    expect(summary).toContain('| Commit | `0123456` |');
    expect(summary).toContain('| Worker | `duxt-www` |');
    expect(summary).toContain('| Trigger | `push` |');
  });

  it('still reports a deploy whose freshness cannot be measured', () => {
    // Reported, not gated: there is no threshold here and nothing about this
    // row can fail a deploy that has already reached Cloudflare.
    const summary = deploymentSummary({ ...publication, committedAt: '' });

    expect(summary).toContain('| Time to publish | unknown |');
    expect(summary).toContain('| Worker | `duxt-www` |');
  });
});
