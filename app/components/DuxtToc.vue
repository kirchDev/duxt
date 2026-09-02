<script setup lang="ts">
interface TocLink {
  id: string;
  text: string;
  depth: number;
  children?: TocLink[];
}

defineProps<{ links: TocLink[] }>();

const { duxt } = useAppConfig();
</script>

<template>
  <div class="space-y-8 text-sm">
    <nav v-if="links?.length">
      <p class="mb-3 font-medium">On this page</p>
      <ul class="space-y-1 border-l">
        <li v-for="link in links" :key="link.id">
          <a
            :href="`#${link.id}`"
            class="-ml-px block border-l border-transparent py-1 pl-4 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            {{ link.text }}
          </a>
          <ul v-if="link.children?.length">
            <li v-for="child in link.children" :key="child.id">
              <a
                :href="`#${child.id}`"
                class="-ml-px block border-l border-transparent py-1 pl-7 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                {{ child.text }}
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- The community block nuxt.com carries beside the TOC: fixed links that
         belong on every page, configured once. -->
    <nav v-if="duxt.aside?.links?.length">
      <p class="mb-3 font-medium">{{ duxt.aside.title ?? 'Community' }}</p>
      <ul class="space-y-2">
        <li v-for="link in duxt.aside.links" :key="link.label">
          <NuxtLink
            :to="link.to"
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
