<script setup lang="ts">
import type { DuxtOpenApiMediaType } from '../../openapi-model';

/**
 * One body, in each media type the document offers it in.
 *
 * The media type is a tab rather than a heading: `application/json` and
 * `multipart/form-data` are two spellings of ONE body, and stacking them reads
 * as two bodies a request would carry both of.
 */
const props = defineProps<{
  content?: DuxtOpenApiMediaType[];
  /**
   * Which way this body travels, and therefore which fields it can hold.
   *
   * Required rather than defaulted: this component draws the request body AND
   * every response, and a default would have to be wrong for one of them. The
   * only way a caller can forget is by not compiling.
   */
  direction: DuxtOpenApiDirection;
}>();

const types = computed(() => props.content ?? []);
const current = ref(0);

const media = computed(() => types.value[current.value] ?? types.value[0]);

/** The examples the document wrote, and — where it wrote none — a derived one. */
const examples = computed(() => {
  const written = media.value?.examples ?? [];
  if (written.length) return written;

  const derived = openApiExampleValue(media.value?.schema, props.direction);

  return derived === null ? [] : [{ name: 'example', value: derived }];
});
</script>

<template>
  <div v-if="types.length" class="min-w-0">
    <div v-if="types.length > 1" class="mb-3 flex flex-wrap gap-1.5">
      <button
        v-for="(entry, index) in types"
        :key="entry.type"
        type="button"
        class="rounded-md px-2 py-1 font-mono text-xs transition-colors"
        :class="
          index === current
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        :aria-pressed="index === current"
        @click="current = index"
      >
        {{ entry.type }}
      </button>
    </div>

    <p v-else class="mb-2 font-mono text-xs text-muted-foreground">
      {{ media?.type }}
    </p>

    <DuxtOpenApiSchema
      v-if="media?.schema"
      :schema="media.schema"
      :direction="direction"
    />

    <div v-for="example in examples" :key="example.name" class="mt-3">
      <p v-if="example.summary" class="mb-1 text-xs text-muted-foreground">
        {{ example.summary }}
      </p>

      <!-- An external example is a URL the document points at; showing the URL
           is the whole of what this build can honestly show. -->
      <p
        v-if="example.externalValue"
        class="font-mono text-xs break-all text-muted-foreground"
      >
        {{ example.externalValue }}
      </p>

      <DuxtCodeBlock
        v-else-if="example.value !== undefined"
        :code="openApiJson(example.value)"
        language="json"
      />
    </div>

    <!-- How each part of a multipart body is encoded, which is otherwise the
         one thing a reader cannot guess from the schema. -->
    <dl
      v-if="media?.encoding?.length"
      class="mt-3 space-y-1 text-xs text-muted-foreground"
    >
      <div
        v-for="entry in media.encoding"
        :key="entry.property"
        class="flex gap-2"
      >
        <dt class="font-mono">{{ entry.property }}</dt>
        <dd v-if="entry.contentType" class="font-mono">
          {{ entry.contentType }}
        </dd>
      </div>
    </dl>
  </div>
</template>
