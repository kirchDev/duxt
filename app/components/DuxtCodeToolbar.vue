<template>
  <!-- The bar across the top of a code card: tabs or pills on one side, the
       copy button on the other. Four cards draw it — the code group, the
       preview, the package managers and the request samples — and a reader
       learns what that bar does once only if it is the same bar each time.

       A plain box, never the tablist itself: `role="tablist"` may only contain
       tabs, and the copy button beside them is not one. -->
  <div
    class="flex min-h-11 items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
  >
    <slot />
  </div>
</template>
