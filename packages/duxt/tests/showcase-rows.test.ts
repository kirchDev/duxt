import { describe, expect, it } from 'vitest';
import { duxtShowcaseRows } from '../app/utils/duxt-config';

/**
 * The bands alternate by position, so a band that draws two rows has to count
 * as two — otherwise every band after a split client repeats the side the row
 * above it just used, and the page stops alternating halfway down.
 */
describe('duxtShowcaseRows', () => {
  it('counts an ordinary band as one row', () => {
    expect(duxtShowcaseRows({ demo: { type: 'frame' } })).toBe(1);
    expect(duxtShowcaseRows({ demo: { type: 'code' } })).toBe(1);
    expect(duxtShowcaseRows({})).toBe(1);
  });

  it('counts a full-width operation demo as two', () => {
    expect(duxtShowcaseRows({ full: true, demo: { type: 'operation' } })).toBe(
      2
    );
  });

  it('counts a panel operation demo as one, full width or not', () => {
    expect(
      duxtShowcaseRows({
        full: true,
        demo: { type: 'operation', layout: 'panel' }
      })
    ).toBe(1);
    expect(duxtShowcaseRows({ demo: { type: 'operation' } })).toBe(1);
  });

  it('lets an explicit split win over the width', () => {
    expect(
      duxtShowcaseRows({ demo: { type: 'operation', layout: 'split' } })
    ).toBe(2);
  });
});
