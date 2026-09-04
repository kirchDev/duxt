<template>
  <!-- typeset gives a wide block horizontal scroll through `.typeset-scroll`,
       but Content renders a bare <table> and never wraps one — so a reference
       table with long code spans pushed the whole page sideways on a phone.
       The wrapper is what typeset expects; it also owns the flow margin. -->
  <div class="typeset-scroll">
    <table>
      <slot />
    </table>
  </div>
</template>
