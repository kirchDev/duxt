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
    /** Which way the body this schema describes travels — see `excluded`. */
    direction: DuxtOpenApiDirection;
    depth?: number;
  }>(),
  { depth: 0 }
);

const DEPTH = 8;
const duxt = useDuxtConfig();

const schema = computed(() => props.schema);
const deep = computed(
  () => props.depth >= (duxt.openapi?.schemaDepth ?? DEPTH)
);

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

const { t } = useI18n();

/**
 * Type, format, constraints and flags as ONE grey run, `·` between them.
 *
 * They were a line of chips under the name, and a field cost two or three
 * lines: name and type, a red "required", then two boxes saying `min length 1`
 * and `max length 120`. An object with eight fields filled a screen with
 * twenty-four lines of furniture around eight facts. Set as one run —
 * `string · min 1 · max 120` — a field is a line, which is what it is.
 *
 * The enum stays in the run as alternatives (`round | square | other`) rather
 * than as one chip per value: they are one fact about the field, not five.
 */
const meta = computed(() => {
  const parts: string[] = [type.value];

  if (schema.value?.name) parts.push(schema.value.name);

  for (const constraint of constraints.value) {
    const label = t(`duxt.openapi.constraints.${constraint.key}`);

    parts.push(
      constraint.value === 'true' ? label : `${label} ${constraint.value}`
    );
  }

  const options = schema.value?.enum ?? [];
  if (options.length) parts.push(options.map(openApiJson).join(' | '));

  if (schema.value?.readOnly) parts.push(t('duxt.openapi.readOnly'));
  if (schema.value?.writeOnly) parts.push(t('duxt.openapi.writeOnly'));
  if (schema.value?.deprecated) parts.push(t('duxt.openapi.deprecated'));

  return parts.filter(Boolean);
});

/**
 * How many fields lie behind this row — the number the chip shows, and the
 * number the open-by-default rule reads.
 *
 * Through an ARRAY, because `items: Widget[]` is a row a reader opens to see a
 * widget: the array itself has no properties and the seven behind it are what
 * the click is worth.
 */
const size = computed(() => {
  const inner = items.value ?? schema.value;

  if (inner?.properties?.length) return inner.properties.length;
  if (branches.value.length) {
    return branches.value.reduce(
      (all, [, list]) => all + (list?.length ?? 0),
      0
    );
  }

  return nested.value ? 1 : 0;
});

/**
 * ONE THRESHOLD FOR TWO RULES: five fields is where a row starts closed, and
 * five is where the count is worth printing. Below it the chip would say
 * something nobody weighed a decision on ("1"), and the row would hide a line
 * and a half.
 */
const MANY = 5;

/**
 * A row can only close if it HAS a row: the media type's own schema, an array's
 * item and a branch of a `oneOf` arrive without a name, so there is nothing to
 * click and they are always drawn open.
 */
const collapsible = computed(
  () =>
    Boolean(props.name) &&
    nested.value &&
    !deep.value &&
    !schema.value?.circular
);

const open = computed(() => size.value < MANY);
</script>

<template>
  <!-- `details` only where there is a name to click: everything else is drawn
       open, because a summary nobody can aim at is a summary nobody can open.
       The TAG varies, the row does not — one block of markup either way, so a
       collapsed and an expanded field cannot drift apart. -->
  <component
    :is="collapsible ? 'details' : 'div'"
    :open="collapsible ? open : undefined"
    class="min-w-0"
  >
    <component
      :is="collapsible ? 'summary' : 'div'"
      :class="collapsible ? 'duxt-schema-row' : ''"
    >
      <span class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <!-- The mark is lucide's own `plus` and `minus`, one shown per state.
             It was two pseudo-elements before, and at 16 pixels the percentage
             insets that positioned them rounded to different thicknesses — a
             cross with one heavy stroke. An icon set that already draws this
             pair with round caps and one stroke width draws it better than an
             arithmetic of insets ever will.
             
             The TILE around it is what says "control" while nothing is being
             hovered, which a bare glyph in grey never did. -->
        <span v-if="collapsible" aria-hidden="true" class="duxt-schema-tile">
          <Icon name="lucide:plus" class="duxt-schema-plus size-2.5" />
          <Icon name="lucide:minus" class="duxt-schema-minus size-2.5" />
        </span>

        <code v-if="name" class="font-mono text-sm font-medium text-foreground">
          {{ name }}<!-- `required` FOLLOWS THE DIRECTION. A property may be
            `readOnly` and listed under `required`, which is the ordinary way to
            describe a field the server assigns — and OpenAPI then means it is
            required in the response, never in the request. Marking it required
            on a request body asked the reader to invent an id.

            A STAR, not the word: on a body with eight required fields, eight
            red words are a page that shouts, and a warning colour that appears
            everywhere warns of nothing. The word survives for a screen reader,
            which cannot see that the star is red. --><span
            v-if="required && !excluded(schema ?? {}, direction)"
            class="font-semibold text-destructive"
            :title="$t('duxt.openapi.required')"
            >*<span class="sr-only">
              {{ $t('duxt.openapi.required') }}</span
            ></span
          >
        </code>

        <!-- One run, `·` between: see `meta`. -->
        <span class="font-mono text-xs text-muted-foreground">
          <template v-for="(part, index) in meta" :key="index"
            ><span v-if="index" aria-hidden="true" class="px-1 opacity-50"
              >·</span
            >{{ part }}</template
          >
        </span>

        <!-- Only past the threshold, and it is the SAME threshold that closed
             the row: a chip therefore always means "this is bigger than you
             read in passing" rather than "this opens", which the tile already
             said. -->
        <span
          v-if="collapsible && size >= MANY"
          class="ml-auto rounded-md bg-muted px-1.5 font-mono text-[0.6875rem] text-muted-foreground tabular-nums"
          :aria-label="$t('duxt.openapi.fields', { count: size })"
        >
          {{ size }}
        </span>
      </span>

      <span v-if="schema?.title" class="mt-1 block text-sm font-medium">
        {{ schema.title }}
      </span>

      <span
        v-if="schema?.description"
        class="mt-1 block text-sm text-muted-foreground"
      >
        {{ schema.description }}
      </span>

      <!-- A reference this build could not follow. Said out loud rather than
           drawn as an empty object, which is what it would otherwise look
           like. -->
      <span
        v-if="schema?.external"
        class="mt-1 block text-sm text-muted-foreground"
      >
        {{ $t('duxt.openapi.externalRef') }}
        <code class="font-mono text-xs">{{ schema.ref }}</code>
      </span>

      <span
        v-else-if="schema?.circular"
        class="mt-1 block text-sm text-muted-foreground"
      >
        {{ $t('duxt.openapi.circular') }}
      </span>
    </component>

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
            :direction="direction"
            :depth="depth + 1"
          />
        </li>
      </ul>

      <div v-if="items" class="mt-3 border-l pl-4">
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.items') }}
        </p>
        <DuxtOpenApiSchema
          :schema="items"
          :direction="direction"
          :depth="depth + 1"
        />
      </div>

      <div v-if="additional" class="mt-3 border-l pl-4">
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.additionalProperties') }}
        </p>
        <DuxtOpenApiSchema
          :schema="additional"
          :direction="direction"
          :depth="depth + 1"
        />
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
            <DuxtOpenApiSchema
              :schema="branch"
              :direction="direction"
              :depth="depth + 1"
            />
          </li>
        </ul>
      </div>

      <div v-if="schema?.not" class="mt-3 border-l pl-4">
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.composition.not') }}
        </p>
        <DuxtOpenApiSchema
          :schema="schema.not"
          :direction="direction"
          :depth="depth + 1"
        />
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
  </component>
</template>
