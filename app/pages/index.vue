<script setup lang="ts">
// The landing page is its own route, full width, no sidebar. A consumer that
// wants a different one drops an index.vue of its own — Nuxt's own layer
// override, no configuration.
const duxt = useDuxtConfig();

useSeoMeta({
  title: duxt.title,
  description: duxt.landing?.description
});
</script>

<template>
  <div>
    <section class="border-b">
      <div class="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32">
        <Badge v-if="duxt.landing?.badge" variant="secondary" class="mb-6">
          {{ duxt.landing.badge }}
        </Badge>

        <h1
          class="text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
        >
          {{ duxt.landing?.headline ?? duxt.title }}
        </h1>

        <p
          v-if="duxt.landing?.description"
          class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty"
        >
          {{ duxt.landing.description }}
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            v-for="action in duxt.landing?.actions ?? []"
            :key="action.to"
            as-child
            size="lg"
            :variant="action.variant ?? 'default'"
          >
            <NuxtLink
              :to="action.to"
              :target="action.external ? '_blank' : undefined"
            >
              <Icon v-if="action.icon" :name="action.icon" class="size-4" />
              {{ action.label }}
            </NuxtLink>
          </Button>
        </div>
      </div>
    </section>

    <section
      v-if="duxt.landing?.features?.length"
      class="mx-auto max-w-7xl px-4 py-20"
    >
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="feature in duxt.landing.features"
          :key="feature.title"
          class="h-full"
        >
          <CardHeader>
            <Icon
              v-if="feature.icon"
              :name="feature.icon"
              class="size-5 text-muted-foreground"
            />
            <CardTitle class="text-base">{{ feature.title }}</CardTitle>
            <CardDescription>{{ feature.description }}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  </div>
</template>
