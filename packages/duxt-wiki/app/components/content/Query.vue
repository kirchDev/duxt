<script setup lang="ts">
import {
  INFOBOX_FIELDS,
  loadInfoboxPages,
  selectInfoboxPages,
  infoboxCell
} from '../../../query-infobox';
import { infoboxMessages } from '../../utils/infobox-messages';
const props = withDefaults(
  defineProps<{ type?: string; where?: string; columns?: string }>(),
  { type: '', where: '', columns: 'title' }
);
const { source, fallbacks, collection } = useDuxtCollection();
const app = useNuxtApp();
const { locale, t } = useI18n({ useScope: 'local', messages: infoboxMessages });
const collections = computed(() => {
  const chain = [source.value, ...fallbacks.value]
    .filter(Boolean)
    .map((entry) => entry!.collection);
  return chain.length ? chain : [collection.value];
});
const { data: pages } = await useAsyncData(
  () => `wiki-infobox-${locale.value}-${collections.value.join(',')}`,
  () =>
    loadInfoboxPages(
      async (name, offset, limit) =>
        await app.runWithContext(() =>
          queryCollection(name as DuxtCollectionArg)
            .select(...INFOBOX_FIELDS)
            .order('path', 'ASC')
            .limit(limit)
            .skip(offset)
            .all()
        ),
      collections.value
    ),
  { watch: [collections, locale] }
);
const rows = computed(() =>
  selectInfoboxPages(pages.value ?? [], props.type, props.where)
);
const columns = computed(() => [
  ...new Set(
    props.columns
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean)
  )
]);
const link = useDuxtLink();
</script>

<template>
  <div data-infobox-query data-not-typeset class="my-6 min-w-0 max-w-full">
    <div
      v-if="rows.length"
      class="overflow-x-auto rounded-md border"
      tabindex="0"
      role="region"
      :aria-label="type"
    >
      <table
        class="w-full border-collapse text-start text-sm whitespace-nowrap"
      >
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column"
              scope="col"
              class="border-b bg-muted/30 px-4 py-2 text-start font-medium"
            >
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.path"
            class="border-b last:border-b-0"
          >
            <td v-for="column in columns" :key="column" class="px-4 py-2">
              <NuxtLink
                v-if="column === 'title'"
                :to="link(row.path)"
                class="underline underline-offset-4"
                >{{ row.title }}</NuxtLink
              ><template v-else>{{ infoboxCell(row, column) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else data-infobox-empty class="text-sm text-muted-foreground">
      {{ t('empty') }}
    </p>
  </div>
</template>
