<script setup lang="ts">
/**
 * The small block under a page: a few actions, a few facts, one spacing rule.
 *
 * It exists because the rule kept being written by hand and kept coming out
 * differently — two links sat line on line with no gap at all while the note
 * under them was pushed away by a margin of its own, so the same block read as
 * cramped and loose at once. One container owns the gap here, and every item in
 * it is spaced the same whatever it is.
 *
 * ACTIONS are links with an icon; NOTES are lines of text. Anything that is
 * neither — a list of contributors, say — goes in the slot and is spaced as one
 * more item, because the container spaces its children rather than its content.
 *
 * TWO LAYOUTS, one gap. The column is what the aside gets; `row` is what a page
 * with no aside gets, where a stack hanging off the left edge under a
 * full-width rule reads as leftovers.
 *
 * It draws NOTHING when it is handed nothing — no rule across a page whose
 * source cannot be linked and whose history git could not be asked for.
 */
const props = withDefaults(
  defineProps<{
    /** Laid out as a row rather than a stack — see above. */
    row?: boolean;
    /**
     * A link with an icon beside it. `external` opens a new tab and is the only
     * reason this component knows what a target is: the caller decides whether
     * the link leaves the site.
     */
    actions?: {
      icon?: string;
      label: string;
      to: string;
      external?: boolean;
    }[];
    /** A line of text — already formatted, already translated. */
    notes?: string[];
  }>(),
  { actions: () => [], notes: () => [] }
);

const slots = useSlots();

const empty = computed(
  () => !props.actions.length && !props.notes.length && !slots.default
);
</script>

<template>
  <div
    v-if="!empty"
    class="mt-6 border-t pt-4 text-xs text-muted-foreground"
    :class="
      row
        ? 'flex flex-wrap items-center justify-end gap-x-6 gap-y-2'
        : 'space-y-2.5'
    "
  >
    <a
      v-for="action in actions"
      :key="action.to"
      :href="action.to"
      :target="action.external ? '_blank' : undefined"
      :rel="action.external ? 'noopener' : undefined"
      class="flex items-center gap-1.5 transition-colors hover:text-foreground"
    >
      <Icon v-if="action.icon" :name="action.icon" class="size-3.5 shrink-0" />
      {{ action.label }}
    </a>

    <p v-for="note in notes" :key="note">{{ note }}</p>

    <slot />
  </div>
</template>
