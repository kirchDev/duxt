<script setup lang="ts">
import type { DuxtOpenApiParameter } from '../../openapi-model';

/**
 * The parameters an operation takes, grouped by where they go.
 *
 * GROUPED, not one flat table: `in` is the single most load-bearing field a
 * parameter has — it decides whether the value goes in the URL, the query
 * string, a header or a cookie — and a column carrying it is a column readers
 * skim past. The heading says it once per group instead.
 *
 * A list rather than a `<table>` on purpose. A parameter is a name, a type, a
 * sentence and a nested schema, and the schema does not fit in a cell: the
 * table has to break out of itself for every object-shaped query parameter,
 * which is most of them on a real API.
 */
const props = defineProps<{ parameters?: DuxtOpenApiParameter[] }>();

const ORDER = ['path', 'query', 'header', 'cookie'] as const;

const groups = computed(() =>
  ORDER.map((where) => ({
    where,
    parameters: (props.parameters ?? []).filter(
      (parameter) => parameter.in === where
    )
  })).filter((group) => group.parameters.length)
);
</script>

<template>
  <section v-if="groups.length" class="mt-8">
    <h2 class="text-sm font-semibold tracking-wide uppercase">
      {{ $t('duxt.openapi.parameters') }}
    </h2>

    <div v-for="group in groups" :key="group.where" class="mt-4">
      <h3 class="text-xs font-medium text-muted-foreground">
        {{ $t(`duxt.openapi.in.${group.where}`) }}
      </h3>

      <ul class="mt-2 divide-y rounded-lg border">
        <li
          v-for="parameter in group.parameters"
          :key="parameter.name"
          class="px-4 py-3"
        >
          <DuxtOpenApiSchema
            :schema="parameter.schema"
            :name="parameter.name"
            :required="parameter.required"
          />

          <p
            v-if="parameter.description"
            class="mt-1 text-sm text-muted-foreground"
          >
            {{ parameter.description }}
          </p>

          <p
            v-if="parameter.deprecated"
            class="mt-1 text-xs text-muted-foreground"
          >
            {{ $t('duxt.openapi.deprecated') }}
          </p>

          <!-- `style` and `explode` decide how an array or an object becomes
               text in a URL, which is the difference between `?a=1&a=2` and
               `?a=1,2`. The specification's own words, so they are shown as
               written rather than translated into a paraphrase. -->
          <div
            v-if="
              parameter.style ||
              parameter.explode !== undefined ||
              parameter.allowEmptyValue
            "
            class="mt-1.5 flex flex-wrap gap-1.5"
          >
            <span
              v-if="parameter.style"
              class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
            >
              style={{ parameter.style }}
            </span>
            <span
              v-if="parameter.explode !== undefined"
              class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
            >
              explode={{ parameter.explode }}
            </span>
            <span
              v-if="parameter.allowEmptyValue"
              class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
            >
              allowEmptyValue
            </span>
          </div>

          <!-- `content` instead of `schema` is how a document says a parameter
               is serialised as a body — a JSON object in a query string. Rare,
               and invisible if it is not drawn. -->
          <div v-if="parameter.content?.length" class="mt-3">
            <DuxtOpenApiMedia :content="parameter.content" />
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
