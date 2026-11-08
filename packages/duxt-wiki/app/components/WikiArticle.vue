<script setup lang="ts">
import { splitWikiBody } from '../../article';
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

const parts = computed(() => splitWikiBody(page.value?.body));
</script>

<template>
  <div v-if="page" class="flex min-w-0 flex-1 justify-center gap-10">
    <article
      data-wiki-article
      class="min-w-0 flex-1 py-8"
      :class="controls.fullWidth ? undefined : 'max-w-5xl'"
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
        <ContentRenderer :value="{ ...page, body: parts.lead }" />
        <WikiToc v-if="outline.length" :links="outline" />
        <ContentRenderer :value="{ ...page, body: parts.rest }" />
        <slot />
      </div>

      <div
        v-if="controls.pageInfo"
        data-wiki-page-info
        class="mt-8 border-t pt-6"
      >
        <DuxtPageInfo :page="page" row />
      </div>

      <DuxtPageNav v-if="controls.prevNext" :path="path" />

      <DuxtPageFeedback v-if="controls.feedback" />
    </article>
  </div>
</template>
