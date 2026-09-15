import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

/**
 * The header's icon-only controls say what they do — but a DROPDOWN trigger
 * says it with `title`, never with a tooltip.
 *
 * The tooltip version had to swap its button for a second element when the
 * menu closed, and reka's dropdown stays anchored to the element it saw first:
 * the second open measured a detached node and drew the menu in the top-left
 * corner. Gildstone fixed the same drift on its collapsed sidebar dropdowns by
 * the same means (9122050).
 */
describe('header tooltips', () => {
  it('keeps the locale dropdown trigger one stable element', () => {
    const source = read('app/components/DuxtLocale.vue');
    const trigger = source.slice(
      source.indexOf('<UiDropdownMenuTrigger'),
      source.indexOf('</UiDropdownMenuTrigger>')
    );

    expect(trigger).toMatch(
      /<UiButton[^>]*:title="\$t\('duxt\.locale\.switch'\)"/
    );
    expect(trigger).not.toContain('Tooltip');
    expect(trigger).not.toContain('v-if="!');
    expect(
      existsSync(
        fileURLToPath(
          new URL('../app/components/DuxtLocaleTrigger.vue', import.meta.url)
        )
      )
    ).toBe(false);
  });

  it('shows the live shortcut inside the shortcut tooltip', () => {
    const source = read('app/components/DuxtShortcutsTrigger.vue');
    const tooltip = source.slice(source.indexOf('<UiTooltipContent'));

    expect(tooltip).toContain('v-if="helpHint"');
    expect(tooltip).toContain('{{ helpHint }}');
  });

  it('keeps styled tooltips dark in both colour modes', () => {
    const source = read('app/components/ui/tooltip/TooltipContent.vue');

    expect(source).toContain('bg-neutral-900 text-neutral-50');
    expect(source).toContain('bg-neutral-900 fill-neutral-900');
    expect(source).not.toContain('bg-foreground text-background');
  });
});
