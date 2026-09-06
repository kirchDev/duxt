import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The palette's contrast, measured rather than eyeballed.
 *
 * The accessibility check in `scripts/check-a11y.ts` cannot answer this: it
 * parses the built pages with jsdom, which has no layout engine and no
 * computed colour, so axe reports `color-contrast` as skipped. That leaves the
 * one accessibility rule this theme actually broke — shadcn's default
 * `--muted-foreground` gives 4.34:1 on `--muted`, and that token carries the
 * page descriptions, the table of contents and the breadcrumb — with nothing
 * enforcing it.
 *
 * So it is enforced here instead, over the tokens themselves. That is narrower
 * than a browser check (it says nothing about a colour composed at runtime, or
 * about text over an image) and it is the half that regresses: the risk is
 * somebody adjusting a token, not somebody inventing a new colour.
 *
 * Read out of `duxt.css` rather than restated, or the test would pass while
 * describing a palette the site no longer has.
 */
const css = readFileSync(
  fileURLToPath(new URL('../app/assets/css/duxt.css', import.meta.url)),
  'utf8'
);

/** The tokens of one block — `:root` for light, `.dark` for dark. */
function palette(selector: string): Record<string, [number, number, number]> {
  const block = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  if (!block) throw new Error(`no ${selector} block in duxt.css`);

  const tokens: Record<string, [number, number, number]> = {};

  for (const [, name, l, c, h] of block[1]!.matchAll(
    /--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g
  )) {
    tokens[name!] = [Number(l), Number(c), Number(h)];
  }

  return tokens;
}

/** oklch → linear sRGB, the one conversion this file needs. */
function linear([L, C, H]: [number, number, number]) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ] as const;
}

function contrast(
  foreground: [number, number, number],
  background: [number, number, number]
) {
  const luminance = (colour: readonly number[]) =>
    0.2126 * colour[0]! + 0.7152 * colour[1]! + 0.0722 * colour[2]!;

  const a = luminance(linear(foreground));
  const b = luminance(linear(background));
  const [high, low] = a > b ? [a, b] : [b, a];

  return (high + 0.05) / (low + 0.05);
}

/**
 * Foreground over background, as the theme actually pairs them.
 *
 * `--muted-foreground` appears three times because that is the point: it is
 * legible on the page and was not on the surfaces it is used on — a hovered
 * sidebar link, a badge, the mobile sheet.
 */
const PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'accent'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['success-foreground', 'success'],
  ['warning-foreground', 'warning'],
  ['info-foreground', 'info']
];

/** WCAG AA for body text. */
const AA = 4.5;

describe.each([
  ['light', ':root'],
  ['dark', '\\.dark']
])('%s palette', (_name, selector) => {
  const light = palette(':root');
  const tokens = { ...light, ...palette(selector) };

  it.each(PAIRS)('%s on %s reaches AA', (foreground, background) => {
    const front = tokens[foreground];
    const back = tokens[background];

    expect(front, `--${foreground} missing`).toBeDefined();
    expect(back, `--${background} missing`).toBeDefined();

    expect(contrast(front!, back!)).toBeGreaterThanOrEqual(AA);
  });
});
