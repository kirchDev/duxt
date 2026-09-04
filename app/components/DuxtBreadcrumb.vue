<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';
// The path from the section down to this page, so a deep page says where it
// sits without the reader consulting the sidebar.
const props = defineProps<{ path: string }>();

const { data: navigation } = await useDuxtNavigation();
const { source } = useDuxtCollection();
const { section } = useDuxtSection(navigation);

const trail = computed(() => {
  const found: ContentNavigationItem[] = [];

  const walk = (
    items: ContentNavigationItem[],
    ancestors: ContentNavigationItem[]
  ): boolean => {
    for (const item of items) {
      const chain = [...ancestors, item];

      if (item.path === props.path) {
        found.push(...chain);
        return true;
      }

      if (item.children?.length && walk(item.children, chain)) return true;
    }

    return false;
  };

  walk(navigation.value ?? [], []);

  // The trail starts at the section, which is the entry the reader clicked in
  // the row above, and continues with what lies below the source's own prefix.
  // Everything at or above that prefix is a wrapper Content creates for a
  // multi-segment path — on a versioned URL it showed up as an extra crumb
  // that the unversioned one did not have.
  const prefix = source.value?.prefix ?? '';
  const below = found.filter(
    (item) => (item.path?.length ?? 0) > prefix.length
  );

  const head: ContentNavigationItem[] = section.value?.to
    ? [
        {
          title: section.value.label,
          path: section.value.to
        } as ContentNavigationItem
      ]
    : [];

  return [...head, ...below];
});
</script>

<template>
  <Breadcrumb v-if="trail.length > 1">
    <BreadcrumbList>
      <template v-for="(item, index) in trail" :key="item.path">
        <BreadcrumbItem>
          <BreadcrumbPage v-if="index === trail.length - 1">{{
            item.title
          }}</BreadcrumbPage>
          <BreadcrumbLink v-else as-child>
            <NuxtLink :to="item.path">{{ item.title }}</NuxtLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < trail.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
