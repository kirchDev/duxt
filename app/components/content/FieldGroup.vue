<template>
  <!-- `::field-group` around several `::field` blocks. One border round the
       set, so a list of options reads as a table without being one — a table
       cell cannot hold the paragraph a field's description usually is. -->
  <div class="my-6 rounded-lg border px-4">
    <slot />
  </div>
</template>
