<script setup lang="ts">
interface TocLink {
  id: string;
  text: string;
  depth: number;
  children?: TocLink[];
}

defineProps<{ links: TocLink[] }>();
</script>

<template>
  <nav v-if="links?.length" class="text-sm">
    <p class="mb-2 font-medium">On this page</p>
    <ul class="space-y-1">
      <li v-for="link in links" :key="link.id">
        <a
          :href="`#${link.id}`"
          class="block text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ link.text }}
        </a>
        <ul v-if="link.children?.length" class="mt-1 ml-3 space-y-1">
          <li v-for="child in link.children" :key="child.id">
            <a
              :href="`#${child.id}`"
              class="block text-muted-foreground transition-colors hover:text-foreground"
            >
              {{ child.text }}
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
