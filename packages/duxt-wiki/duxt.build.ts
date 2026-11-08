import type { DuxtBuildContribution } from '@kirchdev/duxt/unstable';

export default {
  pageSchema: (z) => ({
    links: z
      .array(
        z.object({ target: z.string(), kind: z.enum(['markdown', 'wiki']) })
      )
      .optional(),
    categories: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional()
  })
} satisfies DuxtBuildContribution;
