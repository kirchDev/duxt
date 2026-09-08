<script setup lang="ts">
/**
 * Where the page came from, under the table of contents.
 *
 * Not at the foot of the ARTICLE, which is where it sat first and where it read
 * as an afterthought below the prev/next links. "Edit this page", when it last
 * changed and who wrote it are one question — provenance — and the right-hand
 * column is already the one answering what a page IS rather than what it says.
 *
 * Everything here is derived. The `sources` entry carries the repository, the
 * ref and the folder; the page carries its own file name and, where git could
 * be asked, its history.
 */
const props = defineProps<{
  /**
   * Lay it out as a ROW rather than a stack.
   *
   * The column form is the one this was written for; the row is what it needs
   * where there is no column to sit in — under the article of a page whose
   * layout fills the right-hand side itself, where a stack of three lines
   * hanging off the left edge under a full-width rule reads as leftovers.
   */
  row?: boolean;
  page:
    | {
        stem?: string;
        lastUpdated?: string;
        contributors?: { name: string; commits: number; username?: string }[];
      }
    | null
    | undefined;
}>();

const page = computed(() => props.page);

const { source } = useDuxtCollection();
const { locale } = useI18n();

const file = computed(() => {
  // A GENERATED SECTION has no file per page: every page in it was split out of
  // one artefact, and `path` is that artefact. Sending the reader to a file
  // named after the URL would be a 404 with an edit form on it.
  if (source.value?.generated) return source.value.path;

  return page.value?.stem
    ? sourceFilePath(
        page.value.stem,
        source.value?.prefix ?? '',
        source.value?.path ?? 'docs'
      )
    : undefined;
});

const link = computed(() =>
  file.value
    ? sourceLink(
        source.value?.repositoryUrl,
        source.value?.ref,
        source.value?.refKind,
        file.value
      )
    : undefined
);

const updated = computed(() => {
  const value = page.value?.lastUpdated;
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    date
  );
});

const contributors = computed(() => page.value?.contributors ?? []);
</script>

<template>
  <div
    v-if="link || updated || contributors.length"
    class="mt-6 border-t pt-4 text-xs text-muted-foreground"
    :class="
      row ? 'flex flex-wrap items-center justify-end gap-x-6 gap-y-2' : ''
    "
  >
    <!-- A tag has no edit form — see `sourceLink`. The label follows the kind
         rather than promising a form that answers with a 404. -->
    <a
      v-if="link"
      :href="link.url"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-1.5 transition-colors hover:text-foreground"
    >
      <Icon
        :name="link.kind === 'edit' ? 'lucide:pencil' : 'lucide:file-code-2'"
        class="size-3.5 shrink-0"
      />
      {{ link.kind === 'edit' ? $t('duxt.page.edit') : $t('duxt.page.view') }}
    </a>

    <p v-if="updated" :class="row ? '' : 'mt-3'">
      {{ $t('duxt.page.lastUpdated', { date: updated }) }}
    </p>

    <template v-if="contributors.length">
      <p :class="row ? '' : 'mt-3'">{{ $t('duxt.page.contributors') }}</p>

      <ul
        class="flex flex-wrap items-center gap-x-2 gap-y-1.5"
        :class="row ? '' : 'mt-1.5'"
      >
        <li
          v-for="person in contributors"
          :key="person.name"
          class="flex items-center gap-1.5"
        >
          <img
            v-if="person.username"
            :src="`https://github.com/${person.username}.png?size=40`"
            alt=""
            width="18"
            height="18"
            loading="lazy"
            class="size-[18px] rounded-full border"
          />
          <span
            v-else
            aria-hidden="true"
            class="flex size-[18px] items-center justify-center rounded-full border bg-muted text-[9px] font-medium"
          >
            {{ person.name.slice(0, 1).toUpperCase() }}
          </span>
          <span>{{ person.name }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>
