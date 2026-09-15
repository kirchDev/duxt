import { describe, expect, it } from 'vitest';
import {
  DUXT_TOC_MAX_DEPTH,
  duxtPageControls,
  duxtPageSearchable,
  duxtTocLinks
} from '../app/utils/page-controls';

/**
 * The page controls are a CONTRACT, not a rendering detail.
 *
 * Every field here is a name a consumer writes into frontmatter, so renaming
 * one is a breaking change — which is exactly why the resolver is a pure
 * function with its own test rather than eight `v-if`s read off `page.value`
 * inside a component nothing can reach. The component asks one question and
 * gets one answer; this is where the answer is decided.
 */

describe('duxtPageControls', () => {
  it('draws every control on a page that asks for nothing', () => {
    expect(duxtPageControls({})).toEqual({
      toc: true,
      tocMaxDepth: DUXT_TOC_MAX_DEPTH,
      breadcrumb: true,
      prevNext: true,
      feedback: true,
      pageInfo: true,
      copyPage: true,
      fullWidth: false,
      search: true
    });
  });

  it('reads the same defaults off a page that is not there at all', () => {
    expect(duxtPageControls(undefined).toc).toBe(true);
    expect(duxtPageControls(null).search).toBe(true);
  });

  // The initial surface, decided on the issue: eight names and no more. A
  // ninth is a new public name, so it is a deliberate act rather than a field
  // that appeared because a component wanted one.
  it('carries exactly the decided control set', () => {
    expect(Object.keys(duxtPageControls({})).sort()).toEqual([
      'breadcrumb',
      'copyPage',
      'feedback',
      'fullWidth',
      'pageInfo',
      'prevNext',
      'search',
      'toc',
      'tocMaxDepth'
    ]);
  });

  it.each([
    ['breadcrumb'],
    ['prevNext'],
    ['feedback'],
    ['pageInfo'],
    ['copyPage'],
    ['search']
  ])('lets a page turn %s off', (field) => {
    const controls = duxtPageControls({ [field]: false }) as unknown as Record<
      string,
      unknown
    >;

    expect(controls[field]).toBe(false);
  });

  it('takes fullWidth as the one control that is off until asked for', () => {
    expect(duxtPageControls({ fullWidth: true }).fullWidth).toBe(true);
    expect(duxtPageControls({ fullWidth: false }).fullWidth).toBe(false);
  });

  /**
   * `fullWidth` removes the reading measure and NOTHING else — decided,
   * because the alternative is a field that silently means three things and
   * cannot be composed with the two it would have swallowed.
   */
  it('leaves the aside alone when a page goes full width', () => {
    const controls = duxtPageControls({ fullWidth: true });

    expect(controls.toc).toBe(true);
    expect(controls.pageInfo).toBe(true);
  });

  /** Decided: the copy control is not part of the provenance block. */
  it('hides the copy control independently of the page info', () => {
    expect(duxtPageControls({ copyPage: false }).pageInfo).toBe(true);
    expect(duxtPageControls({ pageInfo: false }).copyPage).toBe(true);
  });

  describe('toc', () => {
    it('drops the contents column on toc: false', () => {
      expect(duxtPageControls({ toc: false }).toc).toBe(false);
    });

    it('keeps the default maximum when the column is merely turned off', () => {
      expect(duxtPageControls({ toc: false }).tocMaxDepth).toBe(
        DUXT_TOC_MAX_DEPTH
      );
    });

    it.each([2, 3, 4, 5, 6])('takes maxDepth %i', (maxDepth) => {
      expect(duxtPageControls({ toc: { maxDepth } })).toMatchObject({
        toc: true,
        tocMaxDepth: maxDepth
      });
    });

    /**
     * A depth outside the decided range is a typo, and a typo must not silently
     * empty the column: `h1` is never in a contents list (the title is the
     * page's one `h1`) and there is no `h7`.
     */
    it.each([0, 1, 7, -3, 2.5, Number.NaN])(
      'falls back to the default on maxDepth %s',
      (maxDepth) => {
        expect(duxtPageControls({ toc: { maxDepth } }).tocMaxDepth).toBe(
          DUXT_TOC_MAX_DEPTH
        );
      }
    );

    it('ignores a toc object that names no depth', () => {
      expect(duxtPageControls({ toc: {} })).toMatchObject({
        toc: true,
        tocMaxDepth: DUXT_TOC_MAX_DEPTH
      });
    });

    it('takes the site depth when the page names none', () => {
      expect(duxtPageControls({}, { tocMaxDepth: 4 }).tocMaxDepth).toBe(4);
    });

    it('lets the page win over the site depth', () => {
      expect(
        duxtPageControls({ toc: { maxDepth: 2 } }, { tocMaxDepth: 5 })
          .tocMaxDepth
      ).toBe(2);
    });

    it('refuses a site depth outside the range too', () => {
      expect(duxtPageControls({}, { tocMaxDepth: 9 }).tocMaxDepth).toBe(
        DUXT_TOC_MAX_DEPTH
      );
    });
  });

  /**
   * The breadcrumb is the one control that had a site-wide switch BEFORE it had
   * a per-page one, so it is the one place the two have to compose. The page
   * wins where it speaks, which is what lets a site that hid the trail
   * everywhere put it back on the one page that needs it.
   */
  describe('breadcrumb against the site switch', () => {
    it('follows the site when the page says nothing', () => {
      expect(duxtPageControls({}, { breadcrumb: false }).breadcrumb).toBe(
        false
      );
    });

    it('lets the page turn it off under a site that shows it', () => {
      expect(
        duxtPageControls({ breadcrumb: false }, { breadcrumb: true }).breadcrumb
      ).toBe(false);
    });

    it('lets the page turn it back on under a site that hides it', () => {
      expect(
        duxtPageControls({ breadcrumb: true }, { breadcrumb: false }).breadcrumb
      ).toBe(true);
    });
  });

  /**
   * Frontmatter is YAML a human types, and Content stores what the schema
   * declares without asserting the value is the type it declared. A control is
   * only ever turned off by a real `false`.
   */
  it('ignores a value that is not a boolean', () => {
    expect(duxtPageControls({ feedback: 'no' }).feedback).toBe(true);
    expect(duxtPageControls({ prevNext: 0 }).prevNext).toBe(true);
    expect(duxtPageControls({ toc: 'false' }).toc).toBe(true);
  });
});

describe('duxtPageSearchable', () => {
  /**
   * ONE predicate for four surfaces. Client search, its fuzzy fallback, the MCP
   * search tool and the two llms indexes each decide this question, and a rule
   * written four times is a rule three of them will eventually disagree with.
   */
  it('keeps a page that says nothing', () => {
    expect(duxtPageSearchable({})).toBe(true);
    expect(duxtPageSearchable(undefined)).toBe(true);
  });

  it('drops a page that opts out', () => {
    expect(duxtPageSearchable({ search: false })).toBe(false);
  });

  it('keeps a page that opts in', () => {
    expect(duxtPageSearchable({ search: true })).toBe(true);
  });

  it('keeps a page whose value is not a boolean', () => {
    expect(duxtPageSearchable({ search: 'false' })).toBe(true);
  });
});

describe('duxtTocLinks', () => {
  const heading = (id: string, depth: number) => ({ id, text: id, depth });

  it('is empty for a page Content parsed no outline for', () => {
    expect(duxtTocLinks(undefined)).toEqual([]);
    expect(duxtTocLinks([])).toEqual([]);
  });

  it('keeps h2 and h3 by default', () => {
    expect(
      duxtTocLinks([{ ...heading('a', 2), children: [heading('b', 3)] }])
    ).toEqual([{ ...heading('a', 2), children: [heading('b', 3)] }]);
  });

  /**
   * Content nests by RELATIVE depth and as deep as the headings go; `DuxtToc`
   * draws two levels. So everything past the second is collapsed into it —
   * exactly what `generatedToc` already does, so the written page and the
   * generated one cannot draw the same outline two different ways.
   */
  it('collapses everything below h3 into the second level', () => {
    expect(
      duxtTocLinks(
        [
          {
            ...heading('a', 2),
            children: [{ ...heading('b', 3), children: [heading('c', 4)] }]
          }
        ],
        4
      )
    ).toEqual([
      { ...heading('a', 2), children: [heading('b', 3), heading('c', 4)] }
    ]);
  });

  it('drops a heading deeper than the maximum, children included', () => {
    expect(
      duxtTocLinks([
        {
          ...heading('a', 2),
          children: [{ ...heading('b', 3), children: [heading('c', 4)] }]
        }
      ])
    ).toEqual([{ ...heading('a', 2), children: [heading('b', 3)] }]);
  });

  it('keeps only the top level at maxDepth 2', () => {
    expect(
      duxtTocLinks(
        [{ ...heading('a', 2), children: [heading('b', 3)] }, heading('d', 2)],
        2
      )
    ).toEqual([heading('a', 2), heading('d', 2)]);
  });

  /** A page whose first heading is an `h3` still needs a row to hang under. */
  it('promotes a leading deep heading to the top level', () => {
    expect(duxtTocLinks([heading('a', 3)])).toEqual([
      { ...heading('a', 3), depth: 2 }
    ]);
  });

  it('reads the whole outline in document order', () => {
    expect(
      duxtTocLinks(
        [
          { ...heading('a', 2), children: [heading('b', 3)] },
          { ...heading('c', 2), children: [heading('d', 3)] }
        ],
        3
      ).map((link) => [link.id, (link.children ?? []).map((c) => c.id)])
    ).toEqual([
      ['a', ['b']],
      ['c', ['d']]
    ]);
  });

  it('leaves no empty children array behind', () => {
    const [link] = duxtTocLinks(
      [{ ...heading('a', 2), children: [heading('b', 3)] }],
      2
    );

    expect(link).not.toHaveProperty('children');
  });
});
