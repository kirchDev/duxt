<script setup lang="ts">
/**
 * The locale button with its tooltip, kept behind a component boundary so an
 * outer `DropdownMenuTrigger as-child` can hand its complete trigger contract
 * to the actual button.
 *
 * This is the same shape as Gildstone's SidebarMenuButton: the wrapper owns the
 * tooltip, opts out of Vue's automatic fallthrough, and forwards `$attrs`
 * explicitly to the element both primitives operate. Putting both triggers
 * beside each other in DuxtLocale loses that forwarding path.
 */
defineOptions({
  inheritAttrs: false
});

defineProps<{
  flag?: string | null;
  label: string;
  tooltip?: string;
}>();
</script>

<template>
  <UiButton
    v-if="!tooltip"
    v-bind="$attrs"
    variant="ghost"
    size="icon"
    :aria-label="label"
  >
    <Icon v-if="flag" :name="flag" class="size-4 rounded-[2px]" />
    <Icon v-else name="lucide:languages" class="size-4" />
  </UiButton>

  <UiTooltip v-else>
    <UiTooltipTrigger as-child>
      <UiButton v-bind="$attrs" variant="ghost" size="icon" :aria-label="label">
        <Icon v-if="flag" :name="flag" class="size-4 rounded-[2px]" />
        <Icon v-else name="lucide:languages" class="size-4" />
      </UiButton>
    </UiTooltipTrigger>

    <UiTooltipContent side="bottom">
      {{ tooltip }}
    </UiTooltipContent>
  </UiTooltip>
</template>
