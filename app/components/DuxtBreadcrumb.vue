<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';
// The path from the section down to this page, so a deep page says where it
// sits without the reader consulting the sidebar.
const props = defineProps<{ path: string }>();

const { data: navigation } = await useDuxtNavigation();

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
  return found;
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
