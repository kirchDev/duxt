/**
 * Does this heading's own content already contain a link?
 *
 * A Prose heading wraps the WHOLE heading in an anchor, because the words are
 * what a reader aims at when they want to link to a section. That cannot be
 * done when the heading is itself a link — `## [1.4.0](…/compare/…)`, which is
 * what release-please writes on every release, rendered as one page by the
 * changelog's `flat` granularity. An anchor inside an anchor is invalid HTML:
 * the parser closes the outer one early, and what is left is a link with no
 * text in it. `pnpm check:a11y` found it as five `link-name` violations, which
 * is the honest description — a link a screen reader announces as nothing.
 *
 * READ OFF THE VNODES rather than declared by the caller: a heading does not
 * know what a Markdown file put inside it, and asking is the only way to be
 * right for content nobody has written yet.
 *
 * `href` rather than the tag or the component: MDC renders a link as `ProseA`,
 * a raw one arrives as `a`, and both carry the prop. Recursive, because a
 * heading may wrap its link in emphasis.
 */
import type { VNode } from 'vue';

export function headingHasLink(nodes: unknown): boolean {
  if (Array.isArray(nodes)) return nodes.some(headingHasLink);
  if (!nodes || typeof nodes !== 'object') return false;

  const node = nodes as VNode;

  if (node.props && 'href' in node.props) return true;

  return headingHasLink(node.children);
}
