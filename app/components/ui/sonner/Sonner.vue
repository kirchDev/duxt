<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner';
import { Toaster as Sonner } from 'vue-sonner';

// Sonner needs to be told which theme it is in — it does not read the class
// itself. @nuxtjs/color-mode already tracks that, so the two stay in step.
const colorMode = useColorMode();

const {
  theme: _theme,
  closeButton = true,
  duration = 4000,
  position = 'bottom-right',
  ...forwarded
} = defineProps<ToasterProps>();

const theme = computed(() => (colorMode.value === 'dark' ? 'dark' : 'light'));
</script>

<template>
  <Sonner
    class="toaster group"
    :theme="theme"
    :close-button="closeButton"
    :duration="duration"
    :position="position"
    v-bind="forwarded"
    :toast-options="{
      classes: {
        toast:
          'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:gap-3',
        icon: 'self-start mt-0.5',
        content: 'grid gap-0.5',
        title: 'font-medium leading-tight text-foreground',
        description:
          'text-sm leading-relaxed group-[.toast]:text-muted-foreground',
        closeButton:
          'group-[.toast]:border-border group-[.toast]:bg-popover group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground',
        actionButton:
          'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton:
          'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
      }
    }"
  >
    <!-- Icons come from the layer's own icon component and take the semantic
         status tokens, so they follow the theme instead of a fixed palette. -->
    <template #success-icon>
      <Icon name="lucide:circle-check" class="size-4 text-success" />
    </template>
    <template #info-icon>
      <Icon name="lucide:info" class="size-4 text-info" />
    </template>
    <template #warning-icon>
      <Icon name="lucide:triangle-alert" class="size-4 text-warning" />
    </template>
    <template #error-icon>
      <Icon name="lucide:circle-x" class="size-4 text-destructive" />
    </template>
    <template #loading-icon>
      <Icon
        name="lucide:loader-circle"
        class="size-4 animate-spin text-muted-foreground"
      />
    </template>
  </Sonner>
</template>
