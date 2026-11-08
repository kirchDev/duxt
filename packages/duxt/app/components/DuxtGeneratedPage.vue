<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
const props = defineProps<DuxtPageTemplateProps>();
const page = computed(() => props.page);
const path = useDuxtPath();
const duxt = useDuxtConfig();
const heading = useDuxtPageFocus();
const controls = computed(() =>
  duxtPageControls(page.value, {
    breadcrumb: duxt.breadcrumb,
    prevNext: duxt.prevNext,
    feedback: duxt.feedback,
    pageInfo: duxt.pageInfo,
    copyPage: duxt.copyPage,
    fullWidth: duxt.fullWidth,
    toc: duxt.toc?.enabled,
    tocMaxDepth: duxt.toc?.depth
  })
);

const generated = computed(() =>
  controls.value.toc
    ? generatedToc(page.value?.body, controls.value.tocMaxDepth)
    : []
);

const allowed = inject(DUXT_ASIDE, true);
const titled = computed(() => generatedTitle(page.value?.body));

/**
 * Does the shell draw the description, or has the body already said it?
 *
 * See `generatedLeadsWith`.
 */
const described = computed(() => {
  const description = page.value?.description;
  if (!description) return false;

  return !generatedLeadsWith(description, page.value?.body);
});

const aside = computed(
  () =>
    allowed &&
    (generated.value.length > 0 || (duxt.aside?.links?.length ?? 0) > 0)
);
</script>

<template>
  <div v-if="page" class="flex min-w-0 flex-1 gap-10">
    <div class="min-w-0 flex-1 py-8">
      <DuxtAnnouncements placement="above-content" />

      <DuxtVersionBanner />

      <DuxtTranslationBanner v-if="untranslated" :from="from" />

      <!-- THE SAME HEADER A WRITTEN PAGE GETS, for a type that draws no title
           of its own. A release page has a title, a description and a trail
           like any other, and the only reason it ever drew its own heading was
           that the layout drew none — which left the copy control floating in a
           row above a title it belongs beside. -->
      <!-- As wide as the page below it. The reading measure is the LAYOUT's
           to set — `changelog` caps its own column, `reference` deliberately
           does not — and a header narrower than the parameter tables under it
           draws a rule that stops halfway across the page. -->
      <header v-if="!titled" class="mb-8 border-b pb-8">
        <DuxtBreadcrumb v-if="controls.breadcrumb" :path="path" class="mb-3" />

        <!-- THE TITLE ROW, AND WHY IT IS ALLOWED TO WRAP. This shape repeats
             three times on this page — here, in the compact row below and in
             the written-page header further down — and at 320px all three used
             to push the document sideways. Nothing in the row could give: the
             copy control is `shrink-0` by choice, the row was `nowrap`, and an
             `<h1>` keeps `min-width: auto`, so a title whose longest word is
             wide at `text-4xl` pins the row at that word's min-content. Three
             of duxt's own pages overflowed, *Introduction* by 56px.

             Below `sm` the control drops to its own line instead, because at
             that width there is no room for a 36px title and a 145px control
             side by side, and a clipped title is worse than a wrapped control.
             `sm:flex-nowrap` keeps the control beside the title everywhere
             else: `flex-wrap` breaks lines on an item's MAX-content, so
             wrapping unconditionally would demote the control below any
             ordinary long title on a desktop, which is not the bug.

             `min-w-0` plus `wrap-break-word` on the heading is the backstop for
             the case wrapping cannot reach — a single word wider than the whole
             column. `overflow-wrap: break-word` does not lower an element's
             min-content width, so without `min-w-0` it can never act inside a
             flex row; and because it only breaks a word that fits on no line of
             its own, an ordinary title is left exactly as it was. -->
        <div
          class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 sm:flex-nowrap"
        >
          <h1
            ref="heading"
            tabindex="-1"
            class="min-w-0 text-4xl font-semibold tracking-tight text-balance wrap-break-word outline-none"
          >
            {{ page?.title }}
          </h1>

          <DuxtCopyPage
            v-if="controls.copyPage"
            class="mt-1 ms-auto"
            :path="path"
            :title="page?.title"
            :rawbody="(page as { rawbody?: string })?.rawbody"
          />
        </div>

        <!-- THE DESCRIPTION, unless the body already opens with it — see
             `generatedLead`. A page whose description Content derived from its
             own first paragraph would print that sentence twice, three lines
             apart; one whose type WROTE a description (an API document's
             `summary`, which appears nowhere in its prose) reads like every
             written page instead, with the lead under the title rather than
             below the rule. -->
        <p
          v-if="described"
          class="mt-3 text-lg text-muted-foreground text-pretty"
        >
          {{ page?.description }}
        </p>
      </header>

      <!-- A type that DOES draw its own title keeps the compact row: where the
           reader is, and what they can do with the page. -->
      <div
        v-else
        class="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 sm:flex-nowrap"
      >
        <DuxtBreadcrumb v-if="controls.breadcrumb" :path="path" />

        <DuxtCopyPage
          v-if="controls.copyPage"
          class="-mt-1 ms-auto"
          :path="path"
          :title="page?.title"
          :rawbody="(page as { rawbody?: string })?.rawbody"
        />
      </div>

      <div class="typeset typeset-docs">
        <ContentRenderer v-if="page" :value="page" />
      </div>

      <!-- The SECTION's own order, which is what a generated section has: the
           releases newest to oldest, the endpoints as the artefact listed them.
           `DuxtPageNav` walks the same navigation the sidebar draws and stops
           at the section's edge, so the links can only be siblings — and a
           release page that ended in whitespace now ends in the release before
           it, which is how a history is read. -->
      <DuxtPageNav v-if="controls.prevNext" :path="path" />

      <!-- Provenance survives the header, because it is the one part of it that
           is still true: every page of a generated section came out of one
           artefact, and `DuxtPageInfo` already links at that artefact rather
           than at a file named after the URL. It moves into the column beside
           the contents wherever there is one, exactly as in the docs shell. -->
      <!-- As a row, and as wide as the page: with no column to sit in it is a
           footer, and a rule that stopped at the reading measure under a page
           set wider than that ended halfway across. -->
      <DuxtPageInfo v-if="!aside && controls.pageInfo" row :page="page" />
    </div>

    <div v-if="aside" class="hidden w-56 shrink-0 xl:block">
      <div
        class="sticky top-[var(--duxt-header-offset)] max-h-[calc(100vh-var(--duxt-header-offset)-1.5rem)] overflow-y-auto py-8"
      >
        <DuxtToc :links="generated" />

        <DuxtPageInfo v-if="controls.pageInfo" :page="page" />
      </div>
    </div>
  </div>
</template>
