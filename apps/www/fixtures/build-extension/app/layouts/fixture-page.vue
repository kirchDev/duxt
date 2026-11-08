<template>
  <div
    data-page-type-layout="fixture"
    class="min-h-screen bg-background text-foreground"
  >
    <DuxtSkipLink />
    <main id="duxt-main" tabindex="-1" class="mx-auto max-w-3xl p-6">
      <slot />
    </main>
  </div>
</template>
