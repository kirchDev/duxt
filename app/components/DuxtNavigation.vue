<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// Built on shadcn's Sidebar primitives rather than bare lists, so a consumer
// restyling SidebarMenuButton restyles the docs navigation with it.
defineProps<{ items: ContentNavigationItem[] }>();

const route = useRoute();
</script>

<template>
  <SidebarContent class="gap-0">
    <template v-for="item in items" :key="item.path">
      <!-- A section with children becomes a labelled group; a leaf stays a
           single entry, so a flat docs/ folder does not grow empty headings. -->
      <SidebarGroup v-if="item.children?.length">
        <SidebarGroupLabel>{{ item.title }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="child in item.children" :key="child.path">
              <SidebarMenuButton
                as-child
                :is-active="route.path === child.path"
              >
                <NuxtLink :to="child.path">{{ child.title }}</NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup v-else class="py-1">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="route.path === item.path">
                <NuxtLink :to="item.path">{{ item.title }}</NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </template>
  </SidebarContent>
</template>
