<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';
// `::page-cards` on a section's index page: one card per child, taken from the
// navigation, so a new page appears here without the index being edited.
const props = defineProps<{ path?: string }>();

const route = useRoute();

const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs')
);

const base = computed(() => props.path ?? route.path);

const items = computed(() => {
  const branch = navigation.value?.find((item) => item.path === base.value);
  return branch?.children?.filter((child) => child.path !== base.value) ?? [];
});

/** `icon` comes from frontmatter, which Content types as unknown. */
const iconOf = (item: ContentNavigationItem) =>
  typeof item.icon === 'string' ? item.icon : undefined;
</script>

<template>
  <div v-if="items.length" class="not-typeset my-8 grid gap-4 sm:grid-cols-2">
    <NuxtLink v-for="item in items" :key="item.path" :to="item.path">
      <Card
        class="h-full transition-colors hover:border-foreground/20 hover:bg-accent/30"
      >
        <CardHeader>
          <Icon
            v-if="iconOf(item)"
            :name="iconOf(item)!"
            class="size-5 text-muted-foreground"
          />
          <CardTitle class="text-base">{{ item.title }}</CardTitle>
          <CardDescription v-if="item.description">{{
            item.description
          }}</CardDescription>
        </CardHeader>
      </Card>
    </NuxtLink>
  </div>
</template>
