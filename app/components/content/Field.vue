<script setup lang="ts">
/**
 * One parameter, property or option — the most-used component a docs theme is
 * missing.
 *
 *     ::field{name="showRepo" type="boolean" default="false"}
 *     Force a repository segment even with a single repository.
 *     ::
 *
 * A definition list would be the semantic choice and is the wrong one here: the
 * name, the type, the default and whether it is required are four different
 * things, and `<dt>` gives them one slot between them. So each is drawn as
 * itself, and the description is the only prose.
 */
defineProps<{
  name?: string;
  type?: string;
  default?: string;
  required?: boolean;
}>();
</script>

<template>
  <div class="border-b py-3 last:border-b-0">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <code class="font-mono text-sm font-medium text-foreground">{{
        name
      }}</code>

      <code v-if="type" class="font-mono text-xs text-muted-foreground">{{
        type
      }}</code>

      <Badge v-if="required" variant="secondary" class="text-[10px]">
        required
      </Badge>

      <code
        v-if="$props.default !== undefined"
        class="ml-auto font-mono text-xs text-muted-foreground"
      >
        = {{ $props.default }}
      </code>
    </div>

    <div class="mt-1.5 text-sm text-muted-foreground [&>*:last-child]:mb-0">
      <slot />
    </div>
  </div>
</template>
