<script setup lang="ts">
const duxt = useDuxtConfig();
</script>

<template>
  <footer class="mt-16 border-t">
    <div
      class="mx-auto flex max-w-[90rem] flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start lg:justify-between lg:px-8"
    >
      <div class="lg:max-w-md">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 font-semibold tracking-tight"
        >
          <Icon name="lucide:book-open-text" class="size-5 text-primary" />
          {{ duxt.title }}
        </NuxtLink>
        <p
          v-if="duxt.footer?.note"
          class="mt-3 text-sm/6 text-muted-foreground"
        >
          {{ duxt.footer.note }}
        </p>
        <!-- A consumer's legal links belong to the consumer: the layer offers
             the row and ships nothing in it, because an imprint is never the
             template's to claim. -->
        <p
          v-if="duxt.footer?.copyright || duxt.footer?.legal?.length"
          class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
        >
          <span v-if="duxt.footer?.copyright">{{ duxt.footer.copyright }}</span>
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
        </p>
      </div>

      <div class="flex flex-col items-start gap-4 lg:items-end">
        <nav
          v-if="duxt.footer?.links?.length"
          class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm lg:justify-end"
        >
          <NuxtLink
            v-for="link in duxt.footer.links"
            :key="link.label"
            :to="link.to"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener' : undefined"
            class="text-muted-foreground transition-colors hover:text-foreground"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div v-if="duxt.links?.length" class="flex items-center gap-1">
          <Button
            v-for="link in duxt.links"
            :key="link.label"
            as-child
            variant="ghost"
            size="icon"
            class="text-muted-foreground"
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
