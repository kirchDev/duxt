<script setup lang="ts">
// One level of links in the mobile sheet. An entry with a menu goes one level
// deeper, which `DuxtSheetDrill` draws. In a mega menu's level a column is not a
// further level: it stands under its name, as it does in the panel.
defineProps<{
  links: DuxtLink[];
  grouped?: boolean;
}>();

const emit = defineEmits<{ drill: [link: DuxtLink, event: Event] }>();

const path = useDuxtPath();
const localeLink = useDuxtLink();

function current(to?: string) {
  if (!to) return undefined;
  if (path.value === to) return 'page';
  return to !== '/' && isInside(path.value, to) ? 'true' : undefined;
}

const keyOf = (link: DuxtLink) => link.to ?? asText(link.label) ?? '';
</script>

<template>
  <ul class="space-y-0.5 text-sm">
    <li v-for="link in links" :key="keyOf(link)">
      <template v-if="grouped && link.children?.length">
        <p
          class="mt-3 mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          {{ link.label }}
        </p>
        <DuxtSheetLinks
          :links="menuEntries(link)"
          @drill="(child, event) => emit('drill', child, event)"
        />
      </template>

      <button
        v-else-if="link.children?.length"
        type="button"
        class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
        :class="
          menuOwns(link, path)
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="emit('drill', link, $event)"
      >
        <Icon v-if="link.icon" :name="link.icon" class="size-4" />
        <span class="truncate">{{ link.label }}</span>
        <Icon
          name="lucide:chevron-right"
          class="ms-auto size-3.5 rtl:rotate-180"
        />
      </button>

      <NuxtLink
        v-else
        :to="localeLink(link.to)"
        :target="link.external ? '_blank' : undefined"
        :aria-current="current(link.to)"
        class="block rounded-md px-2 py-1.5 transition-colors"
        :class="
          current(link.to)
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        "
      >
        <DuxtNavigationMenuEntry :link="link" />
      </NuxtLink>
    </li>
  </ul>
</template>
