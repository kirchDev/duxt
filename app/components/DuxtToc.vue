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

// Flat list of every id, in document order, for the observer to watch.
const ids = computed(() =>
  props.links.flatMap((link) => [
    link.id,
    ...(link.children ?? []).map((child) => child.id)
  ])
);

const active = useActiveHeading(ids);
</script>

<template>
  <div class="space-y-8 text-sm">
    <nav v-if="links?.length">
      <p class="mb-3 font-medium">{{ $t('duxt.toc.title') }}</p>
      <ul class="space-y-1 border-l">
        <li v-for="link in links" :key="link.id">
          <a
            :href="`#${link.id}`"
            class="-ml-px block border-l py-1 pl-4 transition-colors"
            :class="
              active === link.id
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground'
            "
          >
            {{ link.text }}
          </a>
          <ul v-if="link.children?.length">
            <li v-for="child in link.children" :key="child.id">
              <a
                :href="`#${child.id}`"
                class="-ml-px block border-l py-1 pl-7 transition-colors"
                :class="
                  active === child.id
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground'
                "
              >
                {{ child.text }}
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- The fixed link block that belongs on every page, configured once. -->
    <nav v-if="duxt.aside?.links?.length">
      <p class="mb-3 font-medium">{{ duxt.aside.title ?? 'Community' }}</p>
      <ul class="space-y-2">
        <li v-for="link in duxt.aside.links" :key="link.label">
          <NuxtLink
            :to="localeLink(link.to)"
            :target="link.external ? '_blank' : undefined"
            class="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon v-if="link.icon" :name="link.icon" class="size-4" />
            {{ link.label }}
            <Icon
              v-if="link.external"
              name="lucide:arrow-up-right"
              class="size-3 opacity-50"
            />
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
