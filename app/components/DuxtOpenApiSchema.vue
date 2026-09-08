<script setup lang="ts">
import type { DuxtOpenApiSchema } from '../../openapi-model';

/**
 * One schema, drawn as the tree it is — and recursive, because schemas are.
 *
 * The three things that make this more than an `<li>` per property:
 *
 * - **A `$ref` keeps its name.** The parser followed the reference and kept
 *   what it was followed through, so `Pet` is shown as `Pet` AND expanded. A
 *   reference drawn only as its expansion loses the vocabulary the API's own
 *   documentation uses everywhere else.
 * - **A cycle stops.** `Pet.friends: Pet[]` is ordinary, and the parser marked
 *   the second `Pet` as circular rather than expanding it; this draws that as
 *   the reference it is instead of recursing until the browser gives out.
 * - **Composition is drawn as composition.** `oneOf` and `anyOf` are branches a
 *   reader has to choose between, so they are labelled and nested rather than
 *   flattened into one list of properties that no single response ever has.
 *
 * `DEPTH` is a floor under all of that: a deeply self-referential document
 * would otherwise render until the tab stops responding, and a truncated tree
 * that says it is truncated is the honest answer.
 */
const props = withDefaults(
  defineProps<{
    schema?: DuxtOpenApiSchema;
    /** The property name this schema sits under, when it has one. */
    name?: string;
    required?: boolean;
    depth?: number;
  }>(),
  { depth: 0 }
);

const DEPTH = 8;

const schema = computed(() => props.schema);
const deep = computed(() => props.depth >= DEPTH);

const type = computed(() => openApiTypeLabel(schema.value));
const constraints = computed(() => openApiConstraints(schema.value));

const branches = computed(() =>
  (
    [
      ['oneOf', schema.value?.oneOf],
      ['anyOf', schema.value?.anyOf],
      ['allOf', schema.value?.allOf]
    ] as const
  ).filter(([, list]) => list?.length)
);

/** The array's element schema, drawn under the array rather than beside it. */
const items = computed(() =>
  schema.value?.types?.includes('array') || schema.value?.items
    ? schema.value?.items
    : undefined
);

// `true` never reaches here: the parser turns "any further property is
// allowed" into an empty schema, so the only two answers left are a schema
// that constrains them and `false`, which forbids them outright.
const additional = computed(() => {
  const value = schema.value?.additionalProperties;

  return value === false || value === undefined ? undefined : value;
});

const nested = computed(
  () =>
    Boolean(schema.value?.properties?.length) ||
    Boolean(branches.value.length) ||
    Boolean(items.value) ||
    Boolean(additional.value) ||
    Boolean(schema.value?.not)
);
</script>

<template>
  <div class="min-w-0">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <code v-if="name" class="font-mono text-sm font-medium text-foreground">
        {{ name }}
      </code>

      <span class="font-mono text-xs text-muted-foreground">{{ type }}</span>

      <span
        v-if="schema?.name"
        class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
      >
        {{ schema.name }}
      </span>

      <span v-if="required" class="text-xs font-medium text-destructive">
        {{ $t('duxt.openapi.required') }}
      </span>

      <span v-if="schema?.deprecated" class="text-xs text-muted-foreground">
        {{ $t('duxt.openapi.deprecated') }}
      </span>

      <span v-if="schema?.readOnly" class="text-xs text-muted-foreground">
        {{ $t('duxt.openapi.readOnly') }}
      </span>

      <span v-if="schema?.writeOnly" class="text-xs text-muted-foreground">
        {{ $t('duxt.openapi.writeOnly') }}
      </span>
    </div>

    <p v-if="schema?.title" class="mt-1 text-sm font-medium">
      {{ schema.title }}
    </p>

    <p v-if="schema?.description" class="mt-1 text-sm text-muted-foreground">
      {{ schema.description }}
    </p>

    <!-- A reference this build could not follow. Said out loud rather than
         drawn as an empty object, which is what it would otherwise look like. -->
    <p v-if="schema?.external" class="mt-1 text-sm text-muted-foreground">
      {{ $t('duxt.openapi.externalRef') }}
      <code class="font-mono text-xs">{{ schema.ref }}</code>
    </p>

    <p v-else-if="schema?.circular" class="mt-1 text-sm text-muted-foreground">
      {{ $t('duxt.openapi.circular') }}
    </p>

    <div
      v-if="constraints.length || schema?.enum?.length"
      class="mt-1.5 flex flex-wrap gap-1.5"
    >
      <!-- `uniqueItems: true` is a FLAG, and printing its value reads as
           "unique true". The label alone is the whole statement. -->
      <span
        v-for="constraint in constraints"
        :key="constraint.key"
        class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
      >
        {{ $t(`duxt.openapi.constraints.${constraint.key}`) }}
        <template v-if="constraint.value !== 'true'">
          {{ constraint.value }}
        </template>
      </span>

      <span
        v-for="(option, index) in schema?.enum ?? []"
        :key="`enum-${index}`"
        class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-foreground"
      >
        {{ openApiJson(option) }}
      </span>
    </div>

    <p v-if="nested && deep" class="mt-2 text-sm text-muted-foreground">
      {{ $t('duxt.openapi.truncated') }}
    </p>

    <template v-else-if="!schema?.circular">
      <ul
        v-if="schema?.properties?.length"
        class="mt-3 space-y-3 border-l pl-4"
      >
        <li v-for="property in schema.properties" :key="property.name">
          <DuxtOpenApiSchema
            :schema="property.schema"
            :name="property.name"
            :required="property.required"
            :depth="depth + 1"
          />
        </li>
      </ul>

      <div v-if="items" class="mt-3 border-l pl-4">
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.items') }}
        </p>
        <DuxtOpenApiSchema :schema="items" :depth="depth + 1" />
      </div>

      <div v-if="additional" class="mt-3 border-l pl-4">
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.additionalProperties') }}
        </p>
        <DuxtOpenApiSchema :schema="additional" :depth="depth + 1" />
      </div>

      <p
        v-else-if="schema?.additionalProperties === false"
        class="mt-2 text-xs text-muted-foreground"
      >
        {{ $t('duxt.openapi.noAdditionalProperties') }}
      </p>

      <div
        v-for="[kind, list] in branches"
        :key="kind"
        class="mt-3 border-l pl-4"
      >
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t(`duxt.openapi.composition.${kind}`) }}
        </p>
        <ul class="space-y-3">
          <li v-for="(branch, index) in list" :key="index">
            <DuxtOpenApiSchema :schema="branch" :depth="depth + 1" />
          </li>
        </ul>
      </div>

      <div v-if="schema?.not" class="mt-3 border-l pl-4">
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.composition.not') }}
        </p>
        <DuxtOpenApiSchema :schema="schema.not" :depth="depth + 1" />
      </div>

      <p v-if="schema?.externalDocs" class="mt-2 text-sm">
        <a
          :href="schema.externalDocs.url"
          rel="noopener noreferrer"
          target="_blank"
          class="text-primary underline underline-offset-4"
        >
          {{ schema.externalDocs.description ?? $t('duxt.openapi.moreInfo') }}
        </a>
      </p>

      <!-- The discriminator names the property a reader picks a branch by, and
           without it a `oneOf` of ten shapes is a guessing game. -->
      <p
        v-if="schema?.discriminator"
        class="mt-2 text-xs text-muted-foreground"
      >
        {{ $t('duxt.openapi.discriminator') }}
        <code class="font-mono">{{ schema.discriminator.propertyName }}</code>
      </p>
    </template>
  </div>
</template>
