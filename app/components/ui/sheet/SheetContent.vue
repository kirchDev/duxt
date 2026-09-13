<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits
} from 'reka-ui';
import { cn } from '@duxt/lib/utils';
import SheetOverlay from './SheetOverlay.vue';

/**
 * `start` and `end` are ADDED beside `left` and `right`, never instead of them.
 *
 * A consumer asking for `side="left"` means the left of the screen and should
 * keep getting it — a drawer pinned to a fixed edge is a legitimate thing to
 * want, and silently redefining the word would move somebody's sheet the first
 * time they shipped a right-to-left locale. `start` and `end` are the ones that
 * follow the reader, and they are what this layer's own navigation uses.
 *
 * THE DEFAULT IS LOGICAL, the same answer `SidebarProps.side` gives. The two
 * props ask one question and it would be strange to answer it twice: a sheet
 * opened with no side named is not a sheet somebody pinned to an edge, it is
 * one nobody thought about, and the theme's default for a thing nobody thought
 * about is to follow the reader. `end` resolves to `right` in every locale this
 * layer ships, so nothing moves today; what changes is the consumer who writes
 * a bare `<UiSheetContent>` and later declares `dir: 'rtl'`, for whom the panel
 * arrives on the side the page starts from rather than needing a second edit.
 * Naming `right` explicitly is still how you pin it to the screen's right.
 */
interface SheetContentProps extends DialogContentProps {
  class?: HTMLAttributes['class'];
  side?: 'top' | 'right' | 'bottom' | 'left' | 'start' | 'end';
}

defineOptions({
  inheritAttrs: false
});

const props = withDefaults(defineProps<SheetContentProps>(), {
  side: 'end'
});
const emits = defineEmits<DialogContentEmits>();

const delegatedProps = reactiveOmit(props, 'class', 'side');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      data-slot="sheet-content"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          // The logical pair. Everything but the slide is expressible
          // logically; `slide-in-from-*` names a physical edge and has no
          // logical spelling at all, so each direction states its own.
          side === 'start' &&
            'ltr:data-[state=closed]:slide-out-to-left ltr:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm',
          side === 'end' &&
            'ltr:data-[state=closed]:slide-out-to-right ltr:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm',
          props.class
        )
      "
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />

      <!-- A button, not a bare glyph: shadcn's default is a 16px icon with an
           opacity fade, which on a touch screen is both hard to see and under
           the 24px target size axe asks for. Same ghost treatment as every
           other icon button in the header, so it reads as one. -->
      <DialogClose
        class="ring-offset-background focus:ring-ring absolute top-3 end-3 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <Icon name="lucide:x" class="size-5" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
