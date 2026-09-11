import { describe, expect, it } from 'vitest';
import {
  PROSE_COLUMN_PX,
  PROSE_IMAGE_SIZES,
  PROSE_IMAGE_ZOOM_SIZES,
  proseImagePassThrough,
  proseImageSizes
} from '../app/utils/prose-image';

/**
 * The two sizing policies `ProseImg` hands to `NuxtImg`, and the format rule
 * that keeps a provider away from a file it would ruin.
 *
 * WHY THESE ARE STRINGS AND NOT A CONFIG. `@nuxt/image` already owns the
 * breakpoint map, the provider and the density list; the layer's contribution
 * is the one fact it cannot know — how wide this theme's prose column is, and
 * how wide the zoom dialog is. Everything below asserts properties of those two
 * strings, never of the module that consumes them.
 *
 * THE EVALUATOR MIRRORS `@nuxt/image`, IT DOES NOT WRAP IT. `getSizes` is not
 * reachable outside a Nuxt app — it is built by a plugin around generated
 * options — so the semantics the policies are written against are restated here
 * instead. That is the point of the test: it says out loud what the strings are
 * expected to mean, so a policy edited without understanding them fails here
 * rather than in a phone's download.
 */

/** `@nuxt/image`'s default `screens`, which the layer deliberately does not restate. */
const SCREENS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

/** `@nuxt/image`'s default `densities`. */
const DENSITIES = [1, 2];

type Entry = { key: string; screen: number; size: string; width: number };

/** A policy string, split into its entries in ascending screen order. */
function entries(policy: string): Entry[] {
  return policy
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((part) => {
      const [key, size] = part.split(':');
      const screen = SCREENS[key!];

      if (screen === undefined || !size) {
        throw new Error(`not a default screen name: ${part}`);
      }

      return {
        key: key!,
        screen,
        size,
        width: size.endsWith('vw')
          ? Math.round((Number.parseInt(size, 10) / 100) * screen)
          : Number.parseInt(size, 10)
      };
    });
}

/**
 * The slot the browser computes at one viewport — the `sizes` attribute
 * evaluated.
 *
 * Each entry carries the media query of the entry ABOVE it, and the widest
 * entry carries none, which is `finaliseSizeVariants` restated.
 */
function slotAt(policy: string, viewport: number): number {
  const list = entries(policy);

  for (const [index, entry] of list.entries()) {
    const next = list[index + 1];

    if (!next || viewport < next.screen) {
      return entry.size.endsWith('vw')
        ? Math.round((Number.parseInt(entry.size, 10) / 100) * viewport)
        : Number.parseInt(entry.size, 10);
    }
  }

  throw new Error('a policy with no entries declares no slot');
}

/** Every candidate width a policy generates, ascending and deduplicated. */
function candidates(policy: string): number[] {
  const widths = entries(policy).flatMap((entry) =>
    DENSITIES.map((density) => entry.width * density)
  );

  return [...new Set(widths)].sort((a, b) => a - b);
}

/** What a browser picks: the narrowest candidate that still covers the slot. */
function chosen(policy: string, viewport: number, dpr: number): number {
  const need = slotAt(policy, viewport) * dpr;
  const list = candidates(policy);

  return list.find((width) => width >= need) ?? list.at(-1)!;
}

describe('the in-page policy', () => {
  it('names only screens @nuxt/image already ships, in ascending order', () => {
    const list = entries(PROSE_IMAGE_SIZES);

    expect(list.length).toBeGreaterThan(1);
    expect(list.map((entry) => entry.screen)).toStrictEqual(
      list.map((entry) => entry.screen).sort((a, b) => a - b)
    );
  });

  it('never asks for more than the prose column is wide', () => {
    for (const viewport of [768, 1024, 1280, 1536, 1920, 2560]) {
      expect(slotAt(PROSE_IMAGE_SIZES, viewport)).toBeLessThanOrEqual(
        PROSE_COLUMN_PX
      );
    }
  });

  it('lets a phone choose a smaller file than a desktop', () => {
    const phone = chosen(PROSE_IMAGE_SIZES, 320, 1);
    const desktop = chosen(PROSE_IMAGE_SIZES, 1280, 1);

    expect(phone).toBeLessThan(desktop);
    expect(chosen(PROSE_IMAGE_SIZES, 412, 1)).toBeLessThan(desktop);
  });

  it('offers a retina candidate for the same column', () => {
    expect(chosen(PROSE_IMAGE_SIZES, 1280, 2)).toBeGreaterThan(
      chosen(PROSE_IMAGE_SIZES, 1280, 1)
    );
  });
});

describe('the zoom policy', () => {
  it('names only screens @nuxt/image already ships, in ascending order', () => {
    const list = entries(PROSE_IMAGE_ZOOM_SIZES);

    expect(list.length).toBeGreaterThan(1);
    expect(list.map((entry) => entry.screen)).toStrictEqual(
      list.map((entry) => entry.screen).sort((a, b) => a - b)
    );
  });

  it('reaches past the column the page draws the image in', () => {
    expect(candidates(PROSE_IMAGE_ZOOM_SIZES).at(-1)!).toBeGreaterThan(
      candidates(PROSE_IMAGE_SIZES).at(-1)!
    );
  });

  it('picks a higher resolution than the page does, on a screen with room', () => {
    for (const viewport of [1280, 1536, 1920]) {
      expect(chosen(PROSE_IMAGE_ZOOM_SIZES, viewport, 1)).toBeGreaterThan(
        chosen(PROSE_IMAGE_SIZES, viewport, 1)
      );
    }
  });

  it('does not ask a phone for a desktop file', () => {
    expect(chosen(PROSE_IMAGE_ZOOM_SIZES, 320, 1)).toBeLessThan(
      candidates(PROSE_IMAGE_ZOOM_SIZES).at(-1)!
    );
  });
});

describe('proseImageSizes', () => {
  it('is the layer policy when a page says nothing', () => {
    expect(proseImageSizes()).toBe(PROSE_IMAGE_SIZES);
  });

  it('hands a page its own policy through untouched', () => {
    expect(proseImageSizes('sm:50vw md:400px')).toBe('sm:50vw md:400px');
  });

  it('treats an empty attribute as absent', () => {
    expect(proseImageSizes('')).toBe(PROSE_IMAGE_SIZES);
    expect(proseImageSizes('   ')).toBe(PROSE_IMAGE_SIZES);
  });

  it('trims what MDC hands it', () => {
    expect(proseImageSizes(' sm:50vw ')).toBe('sm:50vw');
  });
});

describe('proseImagePassThrough', () => {
  it('keeps a vector a vector', () => {
    expect(proseImagePassThrough('/diagram.svg')).toBe(true);
  });

  it('keeps an animation animated', () => {
    expect(proseImagePassThrough('/loop.gif')).toBe(true);
  });

  it('optimises the raster formats the zoom exists for', () => {
    for (const src of [
      '/shot.png',
      '/shot.jpg',
      '/shot.jpeg',
      '/shot.webp',
      '/shot.avif'
    ]) {
      expect(proseImagePassThrough(src)).toBe(false);
    }
  });

  it('reads the extension, not the rest of the URL', () => {
    expect(proseImagePassThrough('/diagram.svg?v=2')).toBe(true);
    expect(proseImagePassThrough('/diagram.svg#top')).toBe(true);
    expect(proseImagePassThrough('/DIAGRAM.SVG')).toBe(true);
    expect(proseImagePassThrough('https://example.com/a/b.gif?w=1')).toBe(true);
    expect(proseImagePassThrough('/svg/shot.png')).toBe(false);
  });

  it('says nothing about an image that has no source', () => {
    expect(proseImagePassThrough()).toBe(false);
    expect(proseImagePassThrough('')).toBe(false);
  });
});
