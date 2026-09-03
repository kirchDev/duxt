<script setup lang="ts">
const duxt = useDuxtConfig();
</script>

<template>
  <footer class="mt-16 border-t">
    <div class="mx-auto max-w-[90rem] px-4 py-10 lg:px-8">
      <div class="flex flex-col gap-10 lg:flex-row lg:justify-between">
        <div class="max-w-sm">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Icon name="lucide:book-open-text" class="size-5 text-primary" />
            {{ duxt.title }}
          </NuxtLink>
          <p
            v-if="duxt.footer?.note"
            class="mt-3 text-sm text-muted-foreground"
          >
            {{ duxt.footer.note }}
          </p>
        </div>

        <div
          v-if="duxt.footer?.columns?.length"
          class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          <nav v-for="column in duxt.footer.columns" :key="column.title">
            <p class="mb-3 text-sm font-medium">{{ column.title }}</p>
            <ul class="space-y-2 text-sm">
              <li v-for="link in column.links ?? []" :key="link.label">
                <NuxtLink
                  :to="link.to"
                  :target="link.external ? '_blank' : undefined"
                  class="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon v-if="link.icon" :name="link.icon" class="size-3.5" />
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
      </div>

      <!-- A consumer's legal links belong to the consumer: the layer offers the
           row and ships nothing in it, because an imprint is never the
           template's to claim. -->
      <div
        v-if="duxt.footer?.legal?.length || duxt.footer?.copyright"
        class="mt-10 flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
      >
        <p v-if="duxt.footer?.copyright">{{ duxt.footer.copyright }}</p>
        <nav class="flex flex-wrap items-center gap-4">
          <NuxtLink
            v-for="link in duxt.footer?.legal ?? []"
            :key="link.label"
            :to="link.to"
            :target="link.external ? '_blank' : undefined"
            class="transition-colors hover:text-foreground"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </div>
  </footer>
</template>
