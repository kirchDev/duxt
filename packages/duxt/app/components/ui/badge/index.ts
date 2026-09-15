import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Badge } from './Badge.vue';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        /**
         * TINTED, NOT FILLED — and that is a deliberate departure from shadcn's
         * own set, which fills this one with solid `--primary`.
         *
         * A badge marks something small: a release that is current, a page that
         * is new, an endpoint that is a webhook. A solid pill in the accent
         * colour is the loudest object on a page of grey text, and it was
         * louder than the changelog's filter chips sitting next to it — which
         * are built exactly this way and read better. So the chips won.
         *
         * The construction is theirs: a tenth of the colour as surface, a fifth
         * as border, the colour itself as text. `--primary` is measured as text
         * in `tests/contrast.test.ts`, because that is a use it did not have
         * before.
         */
        default:
          'border-primary/20 bg-primary/10 text-primary [a&]:hover:bg-primary/15',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        /**
         * The same tint, in the one other colour that survives being text: at
         * 4.91 on white it clears AA, where `--success` (3.26) and `--warning`
         * (2.29) do not — those are fill colours with a paired foreground and
         * are measured as such.
         */
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15',
        // Solid, because the palette carries `--success` and its paired
        // foreground and the pair is what clears contrast — see `destructive`
        // above for why this one cannot follow it.
        success:
          'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);
export type BadgeVariants = VariantProps<typeof badgeVariants>;
