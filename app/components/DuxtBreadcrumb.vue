<script setup lang="ts">
// The path from the section down to this page, so a deep page says where it
// sits without the reader consulting the sidebar.
//
// Rendered even when it holds a single entry — a section root, where the trail
// is just the section itself. The redundancy is real (the section tab above is
// already marked active, and the H1 below repeats the word) but it buys
// something worth more: the heading sits at the same height on every page.
// Showing it only where it has two entries made the title jump as the reader
// moved between a section root and a page inside it. nuxt.com makes the same
// trade, and prints the section above the title even where it matches it.
//
// The trail itself is computed in `useDuxtBreadcrumb`, because the page emits
// the same one as BreadcrumbList JSON-LD.
const props = defineProps<{ path: string }>();

const localeLink = useDuxtLink();
const trail = await useDuxtBreadcrumb(() => props.path);
</script>

<template>
  <Breadcrumb v-if="trail.length" :aria-label="$t('duxt.nav.breadcrumb')">
    <BreadcrumbList>
      <template v-for="(item, index) in trail" :key="item.path">
        <BreadcrumbItem>
          <BreadcrumbPage v-if="index === trail.length - 1">{{
            item.title
          }}</BreadcrumbPage>
          <BreadcrumbLink v-else as-child>
            <NuxtLink :to="localeLink(item.path)">{{ item.title }}</NuxtLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < trail.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
