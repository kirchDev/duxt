import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The theme is written in LOGICAL directions, and every exception is declared.
 *
 * A locale entry carrying `dir: 'rtl'` flips `<html>` and the reka primitives
 * underneath it, and from there the layout is whatever the utility classes say.
 * A `pl-4` stays on the left in a right-to-left page; a `ps-4` follows the
 * reader. So the direction-awareness of this theme is not a feature that can be
 * switched on — it is a property of 130-odd class names, any one of which can
 * be typed back the old way in a component nobody reviewed for it.
 *
 * NOTHING ELSE CAN SEE THIS. `pnpm check:a11y` runs axe over the built pages in
 * jsdom, which has no layout engine at all, and no RTL locale ships — so a
 * `pl-` added tomorrow renders identically in every check this repo runs and
 * breaks only the language nobody has added yet. Same argument
 * `tests/contrast.test.ts` makes about computed colour, and the same answer:
 * check the source, here, rather than hope a gate in front of it notices.
 *
 * TWO SPELLINGS, ONE RULE. A direction-dependent rule can be written as a
 * utility class (`pl-4`) or as a hand-written declaration (`padding-left: 1rem`)
 * — in `duxt.css`, in `typeset.css`, or in a `style=""` attribute. The second
 * kind is the one that got past the first version of this guard: a declaration
 * tokenises to an empty utility and matched nothing, so every `padding-left:`
 * in the layer's own stylesheets passed silently while the commit message
 * claimed the opposite. Both spellings are scanned here, against the same
 * allowlist, because a reader cannot tell which one moved their bullet.
 *
 * THE ALLOWLIST IS THE REVIEW. Not every physical rule is a defect — a
 * centred dialog, a glyph inside an explicitly left-to-right code block, a
 * prop whose whole meaning is "the left edge of the screen", a renderer that
 * has no logical properties to offer. Those are decisions, and the point of
 * listing them here with a reason is that they stop being indistinguishable
 * from the ones nobody thought about.
 */

const appDir = fileURLToPath(new URL('../app', import.meta.url));

/**
 * Utilities that resolve to a fixed side of the screen.
 *
 * `inset-x-*` is deliberately absent: it sets both sides at once, so it means
 * the same thing whichever way the page runs. So are `*-y-*`, `top-`, `bottom-`
 * and the vertical halves of `rounded-t`/`rounded-b` — direction does not move
 * them.
 */
const PHYSICAL = [
  /^-?(ml|mr|pl|pr)-.+$/,
  /^-?(left|right)-.+$/,
  /^-?translate-x-.+$/,
  /^-?(scroll-(ml|mr|pl|pr))-.+$/,
  /^border-(l|r)(-.+)?$/,
  /^rounded-(l|r|tl|tr|bl|br)(-.+)?$/,
  /^text-(left|right)$/,
  /^(float|clear)-(left|right)$/,
  /^origin-(top-|bottom-)?(left|right)$/,
  /^slide-(in-from|out-to)-(left|right)(-.+)?$/
];

/**
 * Declarations whose PROPERTY names a fixed side.
 *
 * The logical spellings are the same word with `inline-start`/`inline-end` in
 * place of `left`/`right`: `padding-inline-start`, `border-inline-end-width`,
 * `inset-inline-start`. The bare `left:`/`right:` branch needs a boundary in
 * front of it so a custom property (`--duxt-sidebar-left:`) is not read as one;
 * `inset:` and `inset-block-*` set no single side and are absent on purpose,
 * as are `top`/`bottom` and the two vertical border radii.
 */
const PHYSICAL_PROPERTY =
  /(?:^|[\s;{}])((?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)(?:-(?:width|style|color))?|border-(?:top|bottom)-(?:left|right)-radius|left|right)\s*:/g;

/**
 * Declarations whose PROPERTY is neutral and whose VALUE names a side.
 *
 * `text-align: start`, `float: inline-start` and `clear: inline-end` are the
 * logical spellings, and all three are what a reader following a script wants.
 */
const PHYSICAL_VALUE =
  /(?:^|[\s;{}])(text-align|float|clear)\s*:\s*(left|right)\b/g;

/** Every `.vue`, `.ts` and `.css` file the layer ships, read rather than listed. */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(full);

    return /\.(vue|ts|css)$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Prose is not markup.
 *
 * A comment explaining why the right-hand column exists contains the word
 * "right-" and no class at all, so comments are blanked — length preserved, so
 * the line numbers in a failure still point somewhere.
 */
function markupOnly(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * The utility at the end of a class token, with its variant chain.
 *
 * Splits on the last `:` that is NOT inside brackets, because an arbitrary
 * variant carries its own colons — `[&>ol>li]:before:-left-9` is the variant
 * chain `[&>ol>li]:before` and the utility `-left-9`.
 */
function splitVariants(token: string): { variants: string[]; utility: string } {
  let depth = 0;
  let cut = -1;

  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    else if (ch === ':' && depth === 0) cut = i;
  }

  return cut === -1
    ? { variants: [], utility: token }
    : {
        variants: token.slice(0, cut).split(':'),
        utility: token.slice(cut + 1)
      };
}

/**
 * Physical utilities in one file, deduplicated.
 *
 * A token carrying an `ltr:` or `rtl:` variant is EXEMPT by construction: that
 * variant is the sanctioned way to say what a logical property cannot — a
 * one-pixel nudge, a slide-in animation, a transform — and a pair of them is
 * direction-aware by definition.
 */
function physicalUtilities(source: string): string[] {
  const found = new Set<string>();

  for (const chunk of markupOnly(source).split(/[\s"'`]+/)) {
    if (!chunk) continue;

    const { variants, utility } = splitVariants(chunk);
    if (variants.includes('ltr') || variants.includes('rtl')) continue;
    if (PHYSICAL.some((pattern) => pattern.test(utility))) found.add(utility);
  }

  return [...found].sort();
}

/**
 * Physical declarations in one file, deduplicated and normalised.
 *
 * Normalised, because the allowlist has to survive a value being tuned: an
 * indent moving from `1.05rem` to `1.2rem` is not a direction decision and must
 * not read as one. A property that is physical by its own name is recorded as
 * `padding-left:`; one that is physical only through its value keeps the value,
 * `text-align: right`. Both carry the shape of a declaration, so a failure line
 * says which of the two spellings it found without needing to explain itself.
 */
function physicalDeclarations(source: string): string[] {
  const markup = markupOnly(source);
  const found = new Set<string>();

  for (const match of markup.matchAll(PHYSICAL_PROPERTY))
    found.add(`${match[1]}:`);
  for (const match of markup.matchAll(PHYSICAL_VALUE))
    found.add(`${match[1]}: ${match[2]}`);

  return [...found].sort();
}

/** Both spellings of a direction-dependent rule, in one list. */
function physicalRules(source: string): string[] {
  return [...physicalUtilities(source), ...physicalDeclarations(source)].sort();
}

/**
 * Physical on purpose, with the purpose written down.
 *
 * Keyed by path relative to `app/`. An entry that stops matching the file is a
 * failure too — a stale reason reads exactly like a live one.
 */
const PHYSICAL_ON_PURPOSE: Record<
  string,
  { tokens: string[]; reason: string }[]
> = {
  'components/ui/dialog/DialogContent.vue': [
    {
      tokens: ['left-[50%]', 'translate-x-[-50%]'],
      reason:
        'Centring. Half the viewport in, half the box back — symmetric, so it lands in the same place whichever way the page runs, and there is no logical spelling of a centre.'
    }
  ],

  'components/ui/dropdown-menu/DropdownMenuContent.vue': [
    {
      tokens: ['slide-in-from-left-2', 'slide-in-from-right-2'],
      reason:
        'Keyed on `data-[side=…]`, which floating-ui has already resolved against the direction — an `align: start` menu opens on the right of an RTL trigger and is labelled `side=right` when it does. The class follows the resolved side, so it is physical because the attribute it matches is.'
    }
  ],

  'components/ui/dropdown-menu/DropdownMenuSubContent.vue': [
    {
      tokens: ['slide-in-from-left-2', 'slide-in-from-right-2'],
      reason: 'Same resolved `data-[side=…]` as DropdownMenuContent.'
    }
  ],

  'components/ui/select/SelectContent.vue': [
    {
      tokens: [
        '-translate-x-1',
        'translate-x-1',
        'slide-in-from-left-2',
        'slide-in-from-right-2'
      ],
      reason: 'Same resolved `data-[side=…]` as DropdownMenuContent.'
    }
  ],

  'components/ui/tooltip/TooltipContent.vue': [
    {
      tokens: ['slide-in-from-left-2', 'slide-in-from-right-2'],
      reason: 'Same resolved `data-[side=…]` as DropdownMenuContent.'
    }
  ],

  'components/ui/navigation-menu/NavigationMenuIndicator.vue': [
    {
      tokens: ['rounded-tl-sm'],
      reason:
        'A square rotated 45° into an arrowhead. The rounded corner is the tip of that arrow, picked out of the geometry after the rotation — it is not the top-left of anything a reader sees, and `rounded-ss` would round a different corner of the same diamond.'
    }
  ],

  'components/ui/navigation-menu/NavigationMenuViewport.vue': [
    {
      tokens: ['left-(--reka-navigation-menu-viewport-left)'],
      reason:
        'The value is a measurement. reka publishes the active trigger offset in pixels from the left of the menu, so the offset is already whatever the layout made it; reading it as an inline-start would subtract it from the wrong edge.'
    }
  ],

  'components/ui/sheet/SheetContent.vue': [
    {
      tokens: [
        'left-0',
        'right-0',
        'border-l',
        'border-r',
        'slide-in-from-left',
        'slide-in-from-right',
        'slide-out-to-left',
        'slide-out-to-right'
      ],
      reason:
        "The `left` and `right` variants, which mean the screen edge and keep meaning it. The logical pair lives beside them as `start`/`end` — see the prop — and is what this layer's own navigation uses."
    }
  ],

  'components/ui/sidebar/Sidebar.vue': [
    {
      tokens: [
        'left-0',
        'right-0',
        'left-[calc(var(--sidebar-width)*-1)]',
        'right-[calc(var(--sidebar-width)*-1)]',
        'border-l',
        'border-r'
      ],
      reason:
        'Downstream of `resolvedSide`, which turns a `start`/`end` prop into a physical side once. From here on the panel IS on a known edge of the screen, and the offset that hides it off-canvas has to name that same edge.'
    }
  ],

  'components/ui/sidebar/SidebarRail.vue': [
    {
      tokens: [
        'left-0',
        'left-1/2',
        'left-full',
        '-left-2',
        '-right-2',
        '-right-4',
        'translate-x-0',
        '-translate-x-1/2'
      ],
      reason:
        'The drag handle straddling the sidebar edge, positioned by the `[data-side=…]` attribute `Sidebar.vue` resolves. Same argument as Sidebar.vue: the side is settled before these classes are read.'
    }
  ],

  'assets/css/duxt.css': [
    {
      tokens: ['margin-right:', 'text-align: right'],
      reason:
        'The opt-in line numbers on a fenced block, drawn as a `::before` on `.duxt-line-numbers .line`. They sit inside `pre`/`code`, which the `unicode-bidi: isolate` rule at the top of this file pins left-to-right on purpose — a shell command is syntax, not prose. A gutter that followed the reader would end up on the opposite side of the run it numbers, and the digits right-align towards the code for the same reason they do in every editor.'
    }
  ],

  'components/OgImage/Duxt.satori.vue': [
    {
      tokens: ['margin-left:'],
      reason:
        'Rendered by satori, not by a browser: it implements a CSS subset over yoga and knows no logical property at all — `marginInlineStart` appears nowhere in its dist, so the declaration would be dropped and the gap would vanish rather than mirror. The image is also a fixed composition at a fixed size rather than chrome a reader reads, and it carries no `dir` to follow.'
    }
  ],

  'pages/index.vue': [
    {
      tokens: ['left-1/2', '-translate-x-1/2'],
      reason: 'Centring the hero glow, symmetric — same as DialogContent.'
    },
    {
      tokens: ['-right-32'],
      reason:
        'A blurred ornament bled off the corner. It carries no content and anchors nothing; mirroring it would move a smudge for no reader.'
    }
  ]
};

const files = walk(appDir).map((full) => [full.slice(appDir.length + 1), full]);

describe('direction-dependent rules', () => {
  it('are logical, or declared with a reason', () => {
    const undeclared: string[] = [];

    for (const [rel, full] of files) {
      const declared = new Set(
        (PHYSICAL_ON_PURPOSE[rel!] ?? []).flatMap((entry) => entry.tokens)
      );

      for (const utility of physicalRules(readFileSync(full!, 'utf8'))) {
        if (!declared.has(utility)) undeclared.push(`${rel}  ${utility}`);
      }
    }

    expect(undeclared).toEqual([]);
  });

  it('declare nothing the file no longer carries', () => {
    const stale: string[] = [];

    for (const [rel, full] of files) {
      const present = new Set(physicalRules(readFileSync(full!, 'utf8')));

      for (const entry of PHYSICAL_ON_PURPOSE[rel!] ?? []) {
        for (const token of entry.tokens) {
          if (!present.has(token)) stale.push(`${rel}  ${token}`);
        }
      }
    }

    expect(stale).toEqual([]);
  });

  it('names no file that does not exist', () => {
    const known = new Set(files.map(([rel]) => rel));

    expect(
      Object.keys(PHYSICAL_ON_PURPOSE).filter((rel) => !known.has(rel))
    ).toEqual([]);
  });
});
