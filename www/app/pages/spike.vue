<script setup lang="ts">
const { data: main } = await useAsyncData('main', () =>
  queryCollection('docsMain').all()
);
const { data: tagged } = await useAsyncData('tagged', () =>
  queryCollection('docsV07').all()
);
</script>

<template>
  <main>
    <h1 class="mb-6 text-2xl font-semibold">duxt spike</h1>
    <section>
      <h2>docsMain — {{ main?.length ?? 0 }} pages</h2>
      <ul>
        <li v-for="page in main" :key="page.id">
          {{ page.path }} — {{ page.title }}
        </li>
      </ul>
    </section>
    <section>
      <h2>docsV07 — {{ tagged?.length ?? 0 }} pages</h2>
      <ul>
        <li v-for="page in tagged" :key="page.id">
          {{ page.path }} — {{ page.title }}
        </li>
      </ul>
    </section>
  </main>
</template>
