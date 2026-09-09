<script setup lang="ts">
/**
 * The SHAPE of a documentation page, for the moment before the real one is up.
 *
 * The landing page's window frames a second copy of the application, and
 * between the band arriving and that copy booting there was an empty box the
 * height of a page. A spinner would have said "wait"; this says what is coming.
 *
 * DRAWN RATHER THAN PHOTOGRAPHED, and that is the whole point of it. A
 * screenshot has to exist, has to be produced twice for the two themes, and is
 * wrong the day the theme changes — none of which a layer can ask of every site
 * that extends it. This is the theme's own tokens in the theme's own measures,
 * so it is correct in light and dark by construction and needs no asset. A site
 * that would rather show a real picture sets `duxt.landing.preview.src`.
 *
 * THE MEASURES ARE THE REAL ONES, not a sketch: `h-14` for the header, `w-56`
 * for each of the two columns, the section row at `lg` where `DuxtSections`
 * appears, the same `gap-8` and `max-w-[90rem]` the docs layout sets. A poster
 * whose columns sit somewhere else than the page's is a poster the reader
 * watches jump when the frame takes over — which is the one thing it exists to
 * prevent.
 *
 * Nothing here is content: no words, no links, no headings. It is `aria-hidden`
 * where it stands, and every bar is a rounded rectangle.
 */
</script>

<template>
  <div class="flex h-full w-full flex-col bg-background">
    <!-- The header: the wordmark, the navbar row, the version pill and search.
         `h-14` plus its border, as `DuxtHeader` sets it. -->
    <div class="flex h-14 shrink-0 items-center gap-4 border-b px-4 lg:px-8">
      <div class="h-4 w-16 rounded bg-muted" />

      <!-- The navbar row, then a clear gap, then the version pill, the search
           box at its real `w-56` and the three icons. Measured off the page
           this stands in for, not sketched. -->
      <div class="ml-auto hidden items-center gap-6 sm:flex">
        <div
          v-for="width in [32, 62, 50, 42]"
          :key="width"
          class="h-3 rounded bg-muted/60"
          :style="{ width: `${width}px` }"
        />
      </div>

      <div class="ml-6 flex items-center gap-6">
        <div class="h-5 w-12 rounded-full bg-muted/60" />
        <div class="h-8 w-56 rounded-md border bg-muted/30 max-sm:w-24" />
        <div class="hidden gap-6 sm:flex">
          <div
            v-for="icon in 3"
            :key="icon"
            class="size-4 rounded bg-muted/60"
          />
        </div>
      </div>
    </div>

    <!-- The section row. Hidden below `lg`, exactly where the real one is. -->
    <div
      class="hidden h-11 shrink-0 items-center gap-1 border-b px-4 lg:flex lg:px-8"
    >
      <div
        v-for="(width, index) in [58, 54, 40, 58, 72, 108, 24]"
        :key="width"
        class="flex items-center gap-2 rounded-md px-3 py-1.5"
        :class="index === 0 ? 'bg-accent' : ''"
      >
        <div class="size-3.5 rounded bg-muted/60" />
        <div class="h-3 rounded bg-muted/60" :style="{ width: `${width}px` }" />
      </div>
    </div>

    <div
      class="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 gap-8 px-4 lg:px-8"
    >
      <!-- The section's own pages, one line each — a docs sidebar lists a
           branch, not a table of contents. -->
      <div class="hidden w-56 shrink-0 flex-col gap-1 py-8 lg:flex">
        <div
          v-for="(width, index) in [64, 56, 76]"
          :key="width"
          class="flex items-center gap-2 rounded-md px-2 py-1.5"
          :class="index === 0 ? 'bg-accent' : ''"
        >
          <div class="size-3.5 rounded bg-muted/60" />
          <div
            class="h-3 rounded bg-muted/60"
            :style="{ width: `${width}px` }"
          />
        </div>
      </div>

      <!-- The article: breadcrumb, title with the copy control beside it, the
           lead, the rule under the header, then prose and a code card. -->
      <div class="flex min-w-0 max-w-3xl flex-1 flex-col py-8">
        <div class="h-2.5 w-16 rounded bg-muted/60" />

        <div class="mt-3 flex items-start justify-between gap-4">
          <div class="h-9 w-56 rounded bg-muted" />
          <div class="h-8 w-36 rounded-md border bg-muted/30" />
        </div>

        <div class="mt-4 h-3.5 w-4/5 rounded bg-muted/60" />

        <div class="my-8 h-px w-full bg-border" />

        <div class="flex flex-col gap-2.5">
          <div
            v-for="line in ['100%', '88%']"
            :key="line"
            class="h-2.5 rounded bg-muted/60"
            :style="{ width: line }"
          />
        </div>

        <div class="my-6 overflow-hidden rounded-lg border">
          <div class="flex h-11 items-center gap-2 border-b bg-muted/40 px-3">
            <div class="size-3.5 rounded bg-muted/60" />
            <div class="h-2.5 w-20 rounded bg-muted/60" />
          </div>
          <div class="flex flex-col gap-2 p-4">
            <div
              v-for="line in ['58%', '44%', '20%']"
              :key="line"
              class="h-2.5 rounded bg-muted/40"
              :style="{ width: line }"
            />
          </div>
        </div>

        <div class="h-2.5 w-3/5 rounded bg-muted/60" />
        <div class="mt-8 h-5 w-40 rounded bg-muted" />
      </div>

      <!-- The contents column: the page's own outline, then the aside's fixed
           links, then the provenance under a rule. -->
      <div class="hidden w-56 shrink-0 flex-col gap-6 py-8 xl:flex">
        <div class="flex flex-col gap-2">
          <div class="h-3 w-24 rounded bg-muted" />
          <div class="h-2.5 w-20 rounded bg-muted/60" />
          <div class="h-2.5 w-28 rounded bg-muted/60" />
        </div>

        <div class="flex flex-col gap-2">
          <div class="h-3 w-20 rounded bg-muted" />
          <div
            v-for="width in [76, 68, 88, 72]"
            :key="width"
            class="flex items-center gap-2"
          >
            <div class="size-3 rounded bg-muted/60" />
            <div
              class="h-2.5 rounded bg-muted/60"
              :style="{ width: `${width}px` }"
            />
          </div>
        </div>

        <!-- Provenance under its rule: the edit link, when it last changed,
             and who wrote it beside their avatar. -->
        <div class="flex flex-col gap-3 border-t pt-4">
          <div class="flex items-center gap-2">
            <div class="size-3 rounded bg-muted/60" />
            <div class="h-2.5 w-20 rounded bg-muted/60" />
          </div>
          <div class="h-2.5 w-32 rounded bg-muted/40" />
          <div class="h-2.5 w-16 rounded bg-muted/40" />
          <div class="flex items-center gap-2">
            <div class="size-4 rounded-full bg-muted/60" />
            <div class="h-2.5 w-16 rounded bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
