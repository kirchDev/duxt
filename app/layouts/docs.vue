<script setup lang="ts">
const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs')
);
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <DuxtHeader />

    <!-- shadcn's Sidebar primitives read their state from SidebarProvider; used
         without it, inject() returns null and SSR dies. collapsible="none"
         because the header already owns the mobile trigger. -->
    <SidebarProvider class="min-h-0">
      <Sidebar
        collapsible="none"
        class="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-60 border-r bg-transparent lg:flex"
      >
        <DuxtNavigation :items="navigation ?? []" />
      </Sidebar>

      <SidebarInset class="min-w-0 bg-transparent">
        <slot />
      </SidebarInset>
    </SidebarProvider>

    <DuxtFooter />
  </div>
</template>
