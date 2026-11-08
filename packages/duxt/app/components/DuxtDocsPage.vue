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

const outline = computed(() =>
  controls.value.toc
    ? authoredToc(page.value?.body, controls.value.tocMaxDepth)
    : []
);

const column = computed(
  () =>
    outline.value.length > 0 ||
    (duxt.aside?.links?.length ?? 0) > 0 ||
    controls.value.pageInfo
);
</script>

<template>
  <div v-if="page" class="flex min-w-0 flex-1 justify-center gap-10">
    <!-- `fullWidth` removes the reading measure and NOTHING else: the header,
         the left navigation and the column beside the article all stay, and a
         page that wants those gone says so with their own controls. It is the
         one page control that is off until asked for, because it removes a
         constraint rather than something the shell draws. -->
    <article
      class="min-w-0 flex-1 py-8"
      :class="controls.fullWidth ? undefined : 'max-w-3xl'"
    >
      <DuxtAnnouncements placement="above-content" />

      <DuxtVersionBanner />

      <DuxtTranslationBanner v-if="untranslated" :from="from" />

      <header class="mb-8 border-b pb-8">
        <DuxtBreadcrumb v-if="controls.breadcrumb" :path="path" class="mb-3" />
        <!-- The copy action sits with the title, not under the article: it is
             what a reader does with the page BEFORE reading it, and a control
             for that at the bottom is a control nobody finds. -->
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
        <p
          v-if="page?.description"
          class="mt-3 text-lg text-muted-foreground text-pretty"
        >
          {{ page.description }}
        </p>
      </header>

      <div class="typeset typeset-docs">
        <ContentRenderer v-if="page" :value="page" />
      </div>

      <DuxtPageNav v-if="controls.prevNext" :path="path" />

      <DuxtPageFeedback v-if="controls.feedback" />
    </article>

    <!-- A div for the same reason as the sidebar's: DuxtToc's two <nav>s are
         the landmarks, and both are labelled. -->
    <!-- It drops out entirely once a page has emptied it — see `column`. -->
    <div v-if="column" class="hidden w-56 shrink-0 xl:block">
      <div
        class="sticky top-[var(--duxt-header-offset)] max-h-[calc(100vh-var(--duxt-header-offset)-1.5rem)] overflow-y-auto py-8"
      >
        <DuxtToc :links="outline" />

        <!-- Provenance under the contents: where this page came from, when it
             last changed and who wrote it. On the right rather than under the
             article, where it read as an afterthought below the prev/next
             links — this column is already the one answering what a page IS
             rather than what it says. -->
        <DuxtPageInfo v-if="controls.pageInfo" :page="page" />
      </div>
    </div>
  </div>
</template>
