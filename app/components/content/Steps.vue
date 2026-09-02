<template>
  <!-- Wraps an ordered list in Markdown into a stepped layout:
       `::steps` … `::` around the list. -->
  <div
    class="my-6 border-l pl-6 [counter-reset:step] [&>ol]:ml-0 [&>ol]:list-none [&>ol>li]:relative [&>ol>li]:my-6 [&>ol>li]:[counter-increment:step] before:[&>ol>li]:absolute before:[&>ol>li]:-left-[2.15rem] before:[&>ol>li]:flex before:[&>ol>li]:size-6 before:[&>ol>li]:items-center before:[&>ol>li]:justify-center before:[&>ol>li]:rounded-full before:[&>ol>li]:bg-muted before:[&>ol>li]:text-xs before:[&>ol>li]:font-medium before:[&>ol>li]:content-[counter(step)]"
  >
    <slot />
  </div>
</template>
