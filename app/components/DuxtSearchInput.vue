<script setup lang="ts">
// The search dialog's input — reka's `ListboxFilter`, and NOT shadcn's
// `CommandInput`.
//
// `CommandInput` is `ListboxFilter` plus one line: it writes the term into
// Command's own `filterState`, and Command then scores the rendered list a
// SECOND time against its text — dropping entries that mounted after the term
// changed, and re-ranking what the database already ranked. So the term must
// never reach `filterState`, and the conclusion long drawn from that was to
// drop `ListboxFilter` along with it and type into a plain `<input>`.
//
// That threw away the half that was never the problem. `ListboxFilter` filters
// NOTHING. What it does is the combobox wiring: forward Arrow/Home/End to the
// listbox and Enter to the highlighted item, publish `aria-activedescendant`,
// and clear `focusable` so the list leaves the tab order and the input keeps
// focus while the list keeps the highlight. Without it the results were
// reachable by mouse only — #89.
//
// It is a component of its own because `highlightFirstItem` is reka's API for a
// DESCENDANT of the listbox root, and `DuxtSearch` is its PARENT: it renders
// the root, so it cannot reach in. One component inside the dialog can, and
// `refresh()` is what it hands back.
//
// No clear button: `DialogContent` already draws a close X, and two of them in
// the same corner is one too many.
import { ListboxFilter, injectListboxRootContext } from 'reka-ui';

const query = defineModel<string>({ default: '' });

const root = injectListboxRootContext();

/**
 * Re-seat the highlight on the first row once a search has settled.
 *
 * `ListboxFilter` highlights the first item on every KEYSTROKE, which is right
 * for a list filtered synchronously and wrong for one that is fetched: the
 * database answers a debounce later, and by then the row it highlighted has
 * unmounted. reka keeps the reference either way, so what is left is an
 * `aria-activedescendant` naming an element no longer in the document and an
 * Enter that does nothing — reka guards that one with `isConnected`. Those are
 * #89's two symptoms again, one step further along.
 *
 * A highlight still on a live row is left exactly where it is: the reader put
 * it there with the arrow keys, and a search that settles without changing the
 * rows must not move it.
 */
function refresh() {
  if (root.highlightedElement.value?.isConnected) return;

  // Cleared FIRST, so a search that found nothing ends with no active
  // descendant rather than a dangling one: `highlightFirstItem` only ever
  // assigns, and over an empty collection it does nothing at all.
  root.highlightedElement.value = null;
  root.highlightFirstItem();
}

defineExpose({ refresh });
</script>

<template>
  <div class="flex items-center gap-2 border-b px-3">
    <Icon name="lucide:search" class="size-4 shrink-0 text-muted-foreground" />
    <ListboxFilter
      v-model="query"
      auto-focus
      class="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      :placeholder="$t('duxt.search.placeholder')"
    />
  </div>
</template>
