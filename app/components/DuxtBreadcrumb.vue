<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';
// The path from the section down to this page, so a deep page says where it
// sits without the reader consulting the sidebar.
const props = defineProps<{ path: string }>();

const { data: navigation } = await useDuxtNavigation();
const { source } = useDuxtCollection();
const { section } = useDuxtSection(navigation);

const trail = computed<ContentNavigationItem[]>(() => {
  // The trail starts at the section — the entry the reader clicked in the row
  // above — and continues with what lies below the source's own prefix.
  const below = trailBelowPrefix(
    navigation.value ?? [],
    props.path,
    source.value?.prefix ?? ''
  );

  const head = section.value?.to
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
