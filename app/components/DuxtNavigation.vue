<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// The docs tree. A group is collapsible — open when it holds the current page,
// so arriving somewhere never hides where you are, and closed otherwise so a
// long tree stays scannable.
defineProps<{ items: ContentNavigationItem[] }>();

const route = useRoute();

/** `icon` comes from a page's frontmatter, which Content types as unknown. */
const iconOf = (item: ContentNavigationItem) =>
  typeof item.icon === 'string' ? item.icon : undefined;

const contains = (item: ContentNavigationItem): boolean =>
  route.path === item.path ||
  Boolean(item.children?.some((child) => contains(child)));
</script>

<template>
  <nav class="text-[13px]">
    <ul class="space-y-0.5">
      <li v-for="item in items" :key="item.path">
        <Collapsible
          v-if="item.children?.length"
          :default-open="contains(item)"
        >
          <CollapsibleTrigger
            class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Icon
              v-if="iconOf(item)"
              :name="iconOf(item)!"
              class="size-4 text-muted-foreground"
            />
            <span class="truncate">{{ item.title }}</span>
            <Icon
              name="lucide:chevron-right"
              class="ml-auto size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <!-- One rule down the left marks the nesting; the links themselves
                 stay flat so the active one is the only thing with weight. -->
            <ul class="mt-0.5 ml-3.5 space-y-0.5 border-l pl-2.5">
              <li v-for="child in item.children" :key="child.path">
                <DuxtNavigationLink :item="child" />
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <DuxtNavigationLink v-else :item="item" />
      </li>
    </ul>
  </nav>
</template>
