<script setup lang="ts">
import type { DuxtBrunoEntry } from '../../bruno-model';

/**
 * A dictionary block — headers, query parameters, a form body — as a table.
 *
 * Two columns and no third, because a Bruno collection has no third to give: it
 * carries a name and a value, and no type, no description and no statement of
 * whether the field is required. A table with an empty "Description" column
 * would be this type pretending to be `openapi`, which is the pretence the
 * issue behind it rejected conversion for.
 *
 * TWO THINGS ARE MARKED. A `~` entry is switched off in the collection and is
 * shown struck through rather than dropped — a reference that hid it would
 * describe a request the file does not make. A withheld value shows the badge
 * instead of the value: the name is the useful half (the endpoint wants an
 * `Authorization` header) and the value was a live credential.
 */
defineProps<{ entries?: DuxtBrunoEntry[] }>();
</script>

<template>
  <table v-if="entries?.length" class="w-full text-left text-sm">
    <thead>
      <tr class="border-b border-border/60">
        <th scope="col" class="py-2 pr-4 font-medium">
          {{ $t('duxt.bruno.name') }}
        </th>
        <th scope="col" class="py-2 font-medium">
          {{ $t('duxt.bruno.value') }}
        </th>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="entry in entries"
        :key="`${entry.name}-${entry.value}`"
        class="border-b border-border/40 last:border-b-0"
      >
        <td class="py-2 pr-4 align-top font-mono text-xs break-all">
          <span :class="entry.disabled && 'text-muted-foreground line-through'">
            {{ entry.name }}
          </span>
        </td>

        <td class="py-2 align-top font-mono text-xs break-all">
          <UiBadge v-if="entry.redacted" variant="secondary">
            {{ $t('duxt.bruno.withheld') }}
          </UiBadge>

          <span
            v-else
            :class="entry.disabled && 'text-muted-foreground line-through'"
          >
            {{ entry.value }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
