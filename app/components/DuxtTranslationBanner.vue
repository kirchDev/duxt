<script setup lang="ts">
/**
 * The visible half of a missing translation.
 *
 * `noindex` and the canonical in `[...slug].vue` tell a crawler that this page
 * is not a German page; they tell the reader nothing, and the reader is the one
 * looking at English text on a URL that promised their language. Silently
 * serving the fallback is what Docusaurus and VitePress do, and it is why a
 * stale or absent translation there is invisible to everyone except the person
 * reading it.
 *
 * A 404 would be the other option and the worse one: it punishes a reader for a
 * gap the writer left.
 */
const props = defineProps<{
  /** The locale actually served; absent means the untranslated original. */
  from?: string;
}>();

const { locales, defaultLocale } = useI18n();

/**
 * The language's own name, not its code.
 *
 * `nuxt.config.ts` carries the endonym on every locale — each language written
 * in itself — because that is what a language switcher must show, and it is
 * what this sentence needs too.
 */
const languageOf = (code: string | undefined) =>
  locales.value.find((entry) =>
    typeof entry === 'string' ? entry === code : entry.code === code
  );

const shown = computed(() => {
  const entry = languageOf(props.from ?? defaultLocale);
  return typeof entry === 'string' ? entry : (entry?.name ?? entry?.code ?? '');
});
</script>

<template>
  <!-- Same shape as DuxtVersionBanner, deliberately: a reader learns what a
       bordered notice above the title means once, and a second style for a
       second kind of notice is one style too many. Sky, because this is
       information about the page rather than a warning about its content. -->
  <UiAlert
    role="status"
    class="mb-6 flex items-start gap-2.5 rounded-md border border-s-2 border-s-sky-500 bg-muted/30 px-3 py-2.5"
  >
    <Icon
      name="lucide:languages"
      class="mt-[3px] size-4 shrink-0 text-sky-500"
    />

    <div class="min-w-0 flex-1">
      <UiAlertTitle class="mb-0.5 font-medium text-foreground">
        {{ $t('duxt.page.untranslated.title') }}
      </UiAlertTitle>

      <UiAlertDescription class="text-muted-foreground">
        {{ $t('duxt.page.untranslated.description', { language: shown }) }}
      </UiAlertDescription>
    </div>
  </UiAlert>
</template>
