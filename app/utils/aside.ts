import type { InjectionKey } from 'vue';

/**
 * A layout's answer to "is there room on the right?".
 *
 * `pages/[...slug].vue` draws the contents column, the aside's links and the
 * page's provenance in one sticky column, and for almost every page that is
 * right. A layout that fills the same side itself — `reference`, whose
 * operations put the request client there — provides `false` and the page
 * leaves the space alone.
 *
 * Provided rather than matched on a layout name: the layout is the only thing
 * that knows what it draws, and a name in a list in the page is a rule that
 * goes stale the first time a consumer ships a layout of their own.
 */
export const DUXT_ASIDE: InjectionKey<boolean> = Symbol('duxt-aside');
