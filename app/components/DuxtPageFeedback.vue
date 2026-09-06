<script setup lang="ts">
/**
 * "Was this page helpful?"
 *
 * A SLOT WITH AN EVENT AND NO BACKEND, and that is the whole design. The layer
 * stores nothing and sends nothing: it has no business knowing where a
 * consumer's analytics live, and a documentation theme that phones home by
 * default is not one to publish. The answer lives in this component's own state
 * for the length of the visit and nowhere else.
 *
 * A consumer that wants the answer kept listens for it:
 *
 *     <DuxtPageFeedback @feedback="(helpful) => track(helpful)" />
 */
const emit = defineEmits<{ feedback: [helpful: boolean] }>();

const answered = ref<boolean | undefined>();

// A new page is a new question. Without this the answer given on one page
// follows the reader to the next.
const route = useRoute();
watch(
  () => route.fullPath,
  () => (answered.value = undefined)
);

function answer(helpful: boolean) {
  answered.value = helpful;
  emit('feedback', helpful);
}
</script>

<template>
  <slot :answered="answered" :answer="answer">
    <div
      class="mt-10 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <span>{{ $t('duxt.page.helpful.question') }}</span>

      <template v-if="answered === undefined">
        <Button size="sm" variant="outline" @click="answer(true)">
          <Icon name="lucide:thumbs-up" class="size-3.5" />
          {{ $t('duxt.page.helpful.yes') }}
        </Button>
        <Button size="sm" variant="outline" @click="answer(false)">
          <Icon name="lucide:thumbs-down" class="size-3.5" />
          {{ $t('duxt.page.helpful.no') }}
        </Button>
      </template>

      <span v-else role="status" class="text-muted-foreground">
        {{ $t('duxt.page.helpful.thanks') }}
      </span>
    </div>
  </slot>
</template>
