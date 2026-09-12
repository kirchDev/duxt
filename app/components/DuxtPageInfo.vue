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
        /**
         * The day a dated page names — a release, and nothing else so far.
         * It REPLACES the last commit rather than joining it: every release of
         * a changelog shares one file, so their last commit is the same date on
         * all of them and says nothing about any.
         */
        date?: string;
        /** The diff a release was cut from, where its heading linked one. */
        compare?: string;
        lastUpdated?: string;
        contributors?: { name: string; commits: number; username?: string }[];
      }
    | null
    | undefined;
}>();

const page = computed(() => props.page);

const { source } = useDuxtCollection();
const { locale, t } = useI18n();
const duxt = useDuxtConfig();

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

/**
 * The day this page names, where it names one.
 *
 * `timeZone: 'UTC'`, unlike the commit date below it: a release date is a
 * calendar day and not a moment, so read as local time it is the day before for
 * every reader west of Greenwich — and a different day on the server than in
 * the browser, which is a hydration mismatch as well as a wrong date. The
 * commit date IS a moment and is left alone.
 */
const released = computed(() => changelogDate(page.value?.date, locale.value));

const updated = computed(() => {
  // The page's own date wins. Both lines would be true and only one is useful:
  // a changelog's releases all live in one file, so the commit that last
  // touched it dates every release the same day, which is at best the newest
  // one's and at worst years off.
  if (page.value?.date) return undefined;

  const value = page.value?.lastUpdated;
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    date
  );
});

const contributors = computed(() => page.value?.contributors ?? []);
// `DuxtText` also permits a record of strings, so the resolved-config mapped
// type narrows this all-optional object too far. It remains an object at
// runtime; only its template is configurable.
const contributorConfig = duxt.contributors as unknown as
  | { avatarUrl?: string }
  | undefined;
const avatar = (username: string) =>
  contributorAvatar(contributorConfig?.avatarUrl, username);

/**
 * What this page lets a reader DO with where it came from.
 *
 * The compare link goes above the edit link, because the two are the same kind
 * of thing pointing at the same repository — where the page came FROM, rather
 * than what it says — and it is the one a reader of a release wants first: the
 * notes are the summary, the diff is what actually shipped.
 */
const actions = computed(() => {
  const entries: { icon: string; label: string; to: string; external: true }[] =
    [];

  // The diff a release links, where its heading linked an absolute one — see
  // the parser. `git-compare` rather than the crossed arrows: at 14 px beside a
  // pencil the arrows read as a knot rather than as two branches.
  if (page.value?.compare) {
    entries.push({
      icon: 'lucide:git-compare',
      label: t('duxt.page.compare'),
      to: page.value.compare,
      external: true
    });
  }

  // A tag has no edit form — see `sourceLink`. The label follows the kind
  // rather than promising a form that answers with a 404.
  if (link.value) {
    entries.push({
      icon: link.value.kind === 'edit' ? 'lucide:pencil' : 'lucide:file-code-2',
      label: t(
        link.value.kind === 'edit' ? 'duxt.page.edit' : 'duxt.page.view'
      ),
      to: link.value.url,
      external: true
    });
  }

  return entries;
});

/** The dated facts, in the order they are read. */
const notes = computed(() => {
  const lines: string[] = [];

  if (released.value) {
    lines.push(t('duxt.page.released', { date: released.value }));
  } else if (updated.value) {
    lines.push(t('duxt.page.lastUpdated', { date: updated.value }));
  }

  return lines;
});
</script>

<template>
  <!-- One block, one spacing rule — see `DuxtMetaList`. The contributors are
       the one part that is neither an action nor a line of text, so they go in
       the slot and are spaced as one more item. -->
  <DuxtMetaList :row="row" :actions="actions" :notes="notes">
    <div v-if="contributors.length" :class="row ? '' : 'space-y-1.5'">
      <p>{{ $t('duxt.page.contributors') }}</p>

      <ul class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <li
          v-for="person in contributors"
          :key="person.name"
          class="flex items-center gap-1.5"
        >
          <img
            v-if="person.username && avatar(person.username)"
            :src="avatar(person.username)"
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
    </div>
  </DuxtMetaList>
</template>
