/**
 * How wide a documentation image really is, and which files must not be touched.
 *
 * THE LAYER OWNS THE COLUMN, NOT THE PROVIDER. `@nuxt/image` already decides
 * where an image is transformed — ipx on a Node server, nothing at all on a
 * Worker, a CDN wherever a consumer has configured one — and it already ships a
 * Tailwind-shaped `screens` map. None of that belongs here: a layer that pins a
 * provider is a layer every consumer has to undo, and a layer that restates the
 * breakpoints makes a consumer's own `image.screens` silently ineffective.
 *
 * What the layer does know, and `@nuxt/image` cannot, is the width of the box
 * the theme draws an image into. That is the whole contribution below: two
 * `sizes` policies, written in the module's own syntax, naming only the screens
 * it already ships so a consumer that redefines them keeps the redefinition.
 *
 * A `sizes` string is what turns a bare `src` into a `srcset`. Without one
 * `NuxtImg` emits a single file, so a 2400px screenshot is downloaded whole
 * onto a phone to be drawn into a 48rem column.
 */

/**
 * The prose column, in CSS pixels — `max-w-3xl` on the article in every layout
 * that renders Markdown.
 *
 * Stated as a number rather than only inside the policy string because it is
 * the fact the policy is derived FROM, and the thing that has to change first
 * if the column ever does.
 */
export const PROSE_COLUMN_PX = 768;

/**
 * The in-page image.
 *
 * Below `md` the column is the viewport less the layout's own `px-4` gutters,
 * and `95vw` is that minus a rounding margin — over-fetching a few pixels,
 * never under. From `md` up the article is capped at `max-w-3xl` whatever the
 * screen, so the slot stops growing and the policy says so with a fixed pixel
 * width instead of a fraction that would keep climbing on a 4K display.
 *
 * Two entries, not five: `@nuxt/image` gives the widest entry no media query
 * and hands every other one the query of the entry above it, so `lg`, `xl` and
 * `2xl` would each restate `768px` and buy nothing.
 */
export const PROSE_IMAGE_SIZES = 'sm:95vw md:768px';

/**
 * The same image in the zoom dialog, which is a different request on purpose.
 *
 * "Full size" used to mean whatever the author happened to upload, because
 * there was only ever one file. The dialog is `min(96vw, 80rem)` with an 8px
 * inset, so this policy tracks the viewport up to that cap and then stops —
 * four rungs rather than two because a dialog spans the width of the screen and
 * a phone opening one must not be handed a desktop file.
 *
 * A page's own `sizes` deliberately does not reach here: it describes where the
 * image sits in the prose, and the dialog is not in the prose.
 */
export const PROSE_IMAGE_ZOOM_SIZES = 'sm:96vw md:96vw lg:96vw xl:1264px';

/**
 * The policy for one image: the page's own, or the layer's.
 *
 * MDC hands every attribute over as a string, so `sizes=""` on a page that
 * meant to say nothing arrives as an empty string rather than as undefined —
 * and an empty `sizes` is not "no override", it is a policy with no entries,
 * which produces no `srcset` at all.
 */
export function proseImageSizes(sizes?: string): string {
  const own = sizes?.trim();

  return own ? own : PROSE_IMAGE_SIZES;
}

/**
 * Formats an image provider must be kept away from.
 *
 * An SVG has no pixels to resample — asking for a 608px wide one rasterises a
 * file that was sharp at every size — and a GIF run through a raster pipeline
 * comes back as its first frame, the animation silently gone. Both are served
 * as the author committed them, in the page and in the dialog alike.
 *
 * Stated by this component rather than assumed of the provider: some pass these
 * through, some do not, and a documentation layer cannot know which one a
 * consumer configured.
 *
 * The extension is read off the PATH. A query string is where a CDN puts its
 * own parameters and a fragment is not part of the file at all, so neither may
 * decide the format — and `/svg/shot.png` is a PNG in a directory, not a
 * vector.
 */
export function proseImagePassThrough(src?: string): boolean {
  if (!src) return false;

  const path = src.split(/[?#]/)[0] ?? '';

  return /\.(?:svg|gif)$/i.test(path);
}

/**
 * The images whose DIALOG variants a static build has to write ahead of time.
 *
 * A generated site learns which variants to produce from the URLs a render
 * emitted — `NuxtImg` appends each one to an `x-nitro-prerender` header and
 * Nitro's crawler prerenders what that header names. The dialog is not rendered
 * until someone opens it, so on a generated site its variants were requested by
 * nobody, written by nobody, and the first click found a 404.
 *
 * `ProseImg` therefore asks the provider for the dialog's sizes during
 * prerender, which registers the URLs without putting them in any markup. This
 * is the list it asks for, and it is a function rather than a loop in the
 * component because WHICH images belong on it is the part worth stating:
 *
 * - An image that cannot be zoomed has no dialog to open. Registering it writes
 *   a full set of dialog-sized files nobody can ever request — output inflation
 *   for a feature that is switched off on that image.
 * - A pass-through format is served exactly as committed, so there is no
 *   variant to write and asking for one would rasterise a vector.
 */
export function proseImageZoomPrerenderSources(
  zoomable: boolean,
  srcs: (string | undefined)[]
): string[] {
  if (!zoomable) return [];

  return srcs.filter(
    (src): src is string => Boolean(src) && !proseImagePassThrough(src)
  );
}
