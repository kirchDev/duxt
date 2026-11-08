import type { DuxtBuildContribution } from '@kirchdev/duxt/unstable';

export const infoboxSchema: NonNullable<DuxtBuildContribution['pageSchema']> = (
  z
) => ({
  infobox: z
    .object({ type: z.string(), values: z.record(z.string(), z.string()) })
    .nullable()
    .optional()
});
