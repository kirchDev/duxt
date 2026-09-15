import { describe, expect, it } from 'vitest';
import { duxtPill } from '../app/utils/pill';

describe('duxtPill', () => {
  it('marks a pressed pill and leaves the others muted', () => {
    expect(duxtPill(true)).toContain('bg-background');
    expect(duxtPill(false)).toContain('text-muted-foreground');
    expect(duxtPill(false)).not.toContain('bg-background ');
  });

  it('keys a tab trigger off its own data-state rather than a prop', () => {
    const tab = duxtPill('tab');
    expect(tab).toContain('data-[state=active]:bg-background');
    expect(tab).toContain('data-[state=inactive]:text-muted-foreground');
  });

  it('marks a flat pill with a fill, because a shadow is lost on the page', () => {
    expect(duxtPill(true, { tone: 'flat' })).toContain('bg-muted');
    expect(duxtPill(true, { tone: 'flat' })).not.toContain('shadow');
  });

  it('sizes by name', () => {
    expect(duxtPill(false, { size: 'lg' })).toContain('text-sm');
    expect(duxtPill(false, { size: 'sm' })).toContain('py-0.5');
  });
});
