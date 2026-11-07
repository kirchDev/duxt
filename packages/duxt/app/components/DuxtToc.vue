<script setup lang="ts">
interface TocLink {
  id: string;
  text: string;
  depth: number;
  children?: TocLink[];
}

const props = defineProps<{ links: TocLink[] }>();

const duxt = useDuxtConfig();
const localeLink = useDuxtLink();

const headingIds = (links: TocLink[]): string[] =>
  links.flatMap((link) => [link.id, ...headingIds(link.children ?? [])]);
const ids = computed(() => headingIds(props.links));

const active = useActiveHeading(ids, duxt.toc?.scrollOffset);
</script>

<template>
  <div class="space-y-8 text-sm">
    <nav v-if="links?.length" :aria-label="$t('duxt.toc.title')">
      <p class="mb-3 font-medium">{{ $t('duxt.toc.title') }}</p>
      <DuxtTocList :links="links" :active="active" />
    </nav>

    <!-- The fixed link block that belongs on every page, configured once. -->
    <nav
      v-if="duxt.aside?.links?.length"
      :aria-label="duxt.aside.title ?? 'Community'"
    >
      <p class="mb-3 font-medium">{{ duxt.aside.title ?? 'Community' }}</p>
      <ul class="space-y-2">
        <li v-for="link in duxt.aside.links" :key="link.to">
          <NuxtLink
            :to="localeLink(link.to)"
            :target="link.external ? '_blank' : undefined"
            class="flex items-start gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <!-- `mt-0.5` centres the icon on the FIRST line, not on a label
                 that wrapped onto two. -->
            <Icon
              v-if="link.icon"
              :name="link.icon"
              class="mt-0.5 size-4 shrink-0"
            />
            <!-- The arrow stays with the label's last word: as a flex sibling
                 it was pushed to the row's far edge whenever the label
                 wrapped. See DuxtLinkLabel. -->
            <span class="min-w-0">
              <DuxtLinkLabel :label="link.label" :external="link.external" />
            </span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
