<template>
  <!-- Wraps an ordered list in Markdown into a stepped layout:
       `::steps` … `::` around the list.

       Two things are load-bearing here. The variant ORDER:
       `[&>ol>li]:before:absolute` compiles to `… > ol > li::before`, while the
       reverse spelling compiles to the container's own `::before` and the items
       get no marker at all. And the list PADDING: typeset gives every `ol` a
       `padding-inline-start` and every `li` one of its own, which pushed the
       items — and with them the markers, positioned relative to each item —
       clear of the rail they are supposed to sit on. `ps-0` on both puts the
       item's edge back at the container's own padding, which is what
       `-start-9` is measured against: 1.5rem in, 2.25rem back out, half a
       marker wide — centred on the line. The logical spellings matter twice
       over here: typeset's own indent is `padding-inline-start`, so a `pl-0`
       reset would miss it entirely in a right-to-left page. -->
  <div
    class="my-6 border-s ps-6 [counter-reset:step] [&>ol]:ms-0 [&>ol]:list-none [&>ol]:ps-0 [&>ol>li]:relative [&>ol>li]:my-6 [&>ol>li]:ps-0 [&>ol>li]:[counter-increment:step] [&>ol>li]:before:absolute [&>ol>li]:before:-start-9 [&>ol>li]:before:flex [&>ol>li]:before:size-6 [&>ol>li]:before:items-center [&>ol>li]:before:justify-center [&>ol>li]:before:rounded-full [&>ol>li]:before:bg-muted [&>ol>li]:before:text-xs [&>ol>li]:before:font-medium [&>ol>li]:before:text-foreground [&>ol>li]:before:content-[counter(step)]"
  >
    <slot />
  </div>
</template>
