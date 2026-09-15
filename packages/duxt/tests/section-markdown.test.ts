import { describe, expect, it } from 'vitest';
import {
  firstLine,
  pageOrder,
  urlSegment
} from '../build/sections/section-markdown';

describe('pageOrder', () => {
  it('pads to the width of the total, so ten pages sort as they read', () => {
    expect(pageOrder(0, 9)).toBe('1');
    expect(pageOrder(0, 10)).toBe('01');
    expect(pageOrder(9, 10)).toBe('10');
  });
});

describe('urlSegment', () => {
  it('lowercases and joins with dashes, dots included', () => {
    expect(urlSegment('Get User v1.2')).toBe('get-user-v1-2');
  });

  it('answers the fallback for a name made only of punctuation', () => {
    expect(urlSegment('***')).toBe('');
    expect(urlSegment('***', 'request')).toBe('request');
  });
});

describe('firstLine', () => {
  it('keeps the first paragraph, as one line of plain text', () => {
    expect(
      firstLine(
        'Find a **pet** by [id](https://x.test) with `GET`\nand an ![icon](a.png).\n\nMore.'
      )
    ).toBe('Find a pet by id with GET and an icon.');
  });

  it('answers nothing for nothing', () => {
    expect(firstLine(undefined)).toBeUndefined();
    expect(firstLine('   \n\nlater')).toBeUndefined();
  });
});
