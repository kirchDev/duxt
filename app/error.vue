<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

// A page missing from one version but present in another is the interesting
// case: the reader asked for something real, just not here.
const elsewhere = computed(
  () =>
    (
      props.error.data as {
        elsewhere?: { version: { label: string }; path: string }[];
      }
    )?.elsewhere ?? []
);
</script>

<template>
  <NuxtLayout>
    <div
      class="mx-auto flex max-w-2xl flex-col items-center px-4 py-32 text-center"
    >
      <p class="font-mono text-sm text-muted-foreground">
        {{ error.statusCode }}
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-balance">
        {{ error.statusMessage ?? 'Something went wrong' }}
      </h1>

      <div v-if="elsewhere.length" class="mt-8 w-full">
        <p class="mb-3 text-sm text-muted-foreground">It exists in:</p>
        <div class="flex flex-wrap justify-center gap-2">
          <Button
            v-for="entry in elsewhere"
            :key="entry.path"
            as-child
            variant="outline"
            size="sm"
          >
            <NuxtLink :to="entry.path" class="font-mono text-xs">
              {{ entry.version.label }}
            </NuxtLink>
          </Button>
        </div>
      </div>

      <Button as-child class="mt-10">
        <NuxtLink to="/">
          <Icon name="lucide:arrow-left" class="size-4" />
          Back to the documentation
        </NuxtLink>
      </Button>
    </div>
  </NuxtLayout>
</template>
