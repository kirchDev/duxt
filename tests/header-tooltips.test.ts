import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

/**
 * The header's icon-only controls say what they do without making two floating
 * primitives lose track of which trigger owns the dropdown anchor.
 *
 * The dropdown trigger owns a tooltip-aware BUTTON COMPONENT, matching
 * Gildstone's SidebarMenuButton composition. That component forwards the
 * dropdown primitive's attributes and listeners straight to the real button;
 * nesting both as-child triggers in DuxtLocale itself loses that boundary.
 */
describe('header tooltips', () => {
  it('forwards the locale dropdown through a tooltip-aware button', () => {
    const source = read('app/components/DuxtLocale.vue');
    const triggerPath = fileURLToPath(
      new URL('../app/components/DuxtLocaleTrigger.vue', import.meta.url)
    );

    expect(source).toContain('<DuxtLocaleTrigger');
    expect(source).not.toContain(
      "from '@duxt/components/DuxtLocaleTrigger.vue'"
    );
    expect(source).not.toContain(':title=');
    expect(source).toContain('@update:open="handleOpenChange"');
    expect(source).toContain('@pointerleave="clearTooltipSuppression"');
    expect(source).toMatch(
      /:tooltip="\s*localeTooltipSuppressed \? undefined : \$t\('duxt\.locale\.switch'\)\s*"/
    );
    expect(existsSync(triggerPath)).toBe(true);

    const trigger = readFileSync(triggerPath, 'utf8');

    expect(trigger).toContain('<UiTooltip v-else>');
    expect(trigger).toContain('inheritAttrs: false');
    expect(trigger).toContain('tooltip?: string');
    expect(trigger).toMatch(/<UiButton\s+v-if="!tooltip"/);
    expect(trigger).toContain('v-bind="$attrs"');
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
