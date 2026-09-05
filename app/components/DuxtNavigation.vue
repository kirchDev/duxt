<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// The docs tree. Groups collapse, and the group holding the current page opens
// on every navigation — not only on first render.
const props = defineProps<{ items: ContentNavigationItem[] }>();

const path = useDuxtPath();

const iconOf = (item: ContentNavigationItem) =>
  typeof item.icon === 'string' ? item.icon : undefined;

const contains = (item: ContentNavigationItem): boolean =>
  path.value === item.path ||
  Boolean(item.children?.some((child) => contains(child)));

// `default-open` is the INITIAL state of an uncontrolled collapsible: read once
// and never again, so arriving in a collapsed group by search, a deep link or
// the back button left it shut. The open state therefore belongs to the route —
// but a group the reader closes by hand must stay closed, so the route only
// forces it open when it moves into that group.
const open = ref<Record<string, boolean>>({});

watchEffect(() => {
  for (const item of props.items) {
    if (item.path && contains(item)) open.value[item.path] = true;
  }
});

function isOpen(item: ContentNavigationItem) {
  return open.value[item.path ?? ''] ?? false;
}

function setOpen(item: ContentNavigationItem, value: boolean) {
  open.value[item.path ?? ''] = value;
}
</script>

<template>
  <nav class="text-[13px]" :aria-label="$t('duxt.nav.docs')">
    <ul class="space-y-0.5">
      <li v-for="item in items" :key="item.path">
        <Collapsible
          v-if="item.children?.length"
          :open="isOpen(item)"
          @update:open="(value) => setOpen(item, value)"
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
