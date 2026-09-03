<script setup lang="ts">
const duxt = useDuxtConfig();
</script>

<template>
  <footer class="mt-16 border-t">
    <div class="mx-auto max-w-[90rem] px-4 py-10 lg:px-8">
      <div class="flex flex-col gap-12 lg:flex-row lg:gap-20">
        <div class="lg:max-w-sm">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 font-semibold tracking-tight"
          >
            <Icon name="lucide:book-open-text" class="size-5 text-primary" />
            {{ duxt.title }}
          </NuxtLink>
          <p
            v-if="duxt.footer?.note"
            class="mt-4 text-sm/6 text-balance text-muted-foreground"
          >
            {{ duxt.footer.note }}
          </p>

          <div v-if="duxt.links?.length" class="mt-6 flex items-center gap-1">
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

        <!-- The link columns carry no icons and no external marker: a footer is
             read as a list of words, and a glyph per row turns it into noise. -->
        <div
          v-if="duxt.footer?.columns?.length"
          class="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12"
        >
          <nav v-for="column in duxt.footer.columns" :key="column.title">
            <p
              class="text-xs font-medium tracking-widest text-muted-foreground uppercase"
            >
              {{ column.title }}
            </p>
            <ul class="mt-4 space-y-3 text-sm">
              <li v-for="link in column.links ?? []" :key="link.label">
                <NuxtLink
                  :to="link.to"
                  :target="link.external ? '_blank' : undefined"
                  :rel="link.external ? 'noopener' : undefined"
                  class="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {{ link.label }}
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
