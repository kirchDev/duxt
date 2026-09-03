<script setup lang="ts">
const duxt = useDuxtConfig();
</script>

<template>
  <!-- One line, and only what a page footer owes: whose site this is, and the
       links the law asks for. Navigation lives in the header and the sidebar,
       so repeating it down here buys nothing. -->
  <footer class="mt-16 border-t">
    <div
      class="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"
    >
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 font-medium text-foreground"
        >
          <Icon name="lucide:book-open-text" class="size-4 text-primary" />
          {{ duxt.title }}
        </NuxtLink>
        <span v-if="duxt.footer?.copyright">{{ duxt.footer.copyright }}</span>
      </div>

      <!-- A consumer's legal links belong to the consumer: the layer offers the
           row and ships nothing in it, because an imprint is never the
           template's to claim. -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NuxtLink
          v-for="link in duxt.footer?.legal ?? []"
          :key="link.label"
          :to="link.to"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener' : undefined"
          class="transition-colors hover:text-foreground"
        >
          {{ link.label }}
        </NuxtLink>

        <div v-if="duxt.links?.length" class="-mr-2 flex items-center gap-1">
          <Button
            v-for="link in duxt.links"
            :key="link.label"
            as-child
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground"
          >
            <NuxtLink
              :to="link.to"
              :aria-label="link.label"
              :title="link.label"
              target="_blank"
              rel="noopener"
            >
              <Icon v-if="link.icon" :name="link.icon" class="size-4" />
            </NuxtLink>
          </Button>
        </div>
      </div>
    </div>
  </footer>
</template>
