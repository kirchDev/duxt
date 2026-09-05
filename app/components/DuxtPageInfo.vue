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

const file = computed(() =>
  page.value?.stem
    ? sourceFilePath(
        page.value.stem,
        source.value?.prefix ?? '',
        source.value?.path ?? 'docs'
      )
    : undefined
);

const editUrl = computed(() =>
  file.value
    ? sourceEditUrl(source.value?.repositoryUrl, source.value?.ref, file.value)
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
    v-if="editUrl || updated || contributors.length"
    class="mt-6 border-t pt-4 text-xs text-muted-foreground"
  >
    <a
      v-if="editUrl"
      :href="editUrl"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-1.5 transition-colors hover:text-foreground"
    >
      <Icon name="lucide:pencil" class="size-3.5 shrink-0" />
      {{ $t('duxt.page.edit') }}
    </a>

    <p v-if="updated" class="mt-3">
      {{ $t('duxt.page.lastUpdated', { date: updated }) }}
    </p>

    <template v-if="contributors.length">
      <p class="mt-3">{{ $t('duxt.page.contributors') }}</p>

      <ul class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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
