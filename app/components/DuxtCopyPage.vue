<script setup lang="ts">
/**
 * The top action: hand this page to a model, or read its source.
 *
 * A split control rather than four buttons — the common case is "copy it", and
 * the other three are the same intention through a different door. What all of
 * them hand over is the MARKDOWN, not the rendered page: a model given HTML has
 * to undo a layout to find a heading, and one given the source reads what the
 * author wrote.
 *
 * The external links need an absolute URL, and the origin is read from the
 * browser at click time rather than from config. That is not laziness — it is
 * the only value that is certainly right, including on a preview deployment
 * whose domain nobody wrote down.
 */
const props = defineProps<{
  path: string;
  title?: string;
  rawbody?: string;
}>();

const { t } = useI18n();
const notify = useDuxtToast();
const localeLink = useDuxtLink();
const duxt = useDuxtConfig();

const copied = ref(false);

const markdownPath = computed(
  () => `${localeLink(props.path) ?? props.path}.md`
);
const models = computed(() => duxt.copy?.models ?? []);

/** The prompt both models get: fetch the source, then answer about it. */
function prompt() {
  const url = `${window.location.origin}${markdownPath.value}`;

  return t('duxt.page.copy.prompt', { url, title: props.title ?? '' });
}

async function copy() {
  const raw = props.rawbody;
  if (!raw) return;

  // Without the frontmatter: what is copied should read as the page, not as
  // the file. Same call `llms-full.txt` makes over the same field.
  const text = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    notify.error(t('duxt.page.copyFailed'));
  }
}

function open(base: string) {
  window.open(
    `${base}${encodeURIComponent(prompt())}`,
    '_blank',
    'noopener,noreferrer'
  );
}
</script>

<template>
  <!-- `data-duxt-copy-page` is how `check:overflow` finds this control on a
       built page. It is not styling and not behaviour: matching on the utility
       classes instead would make any restyle silently stop checking anything,
       and matching on the button's own words would tie a gate to a translation
       string. `shrink-0` is deliberate — this holds a dropdown trigger and a
       link, and a squeezed control is worse than a wrapped one — so the row
       that carries it is the thing that has to give (see `[...slug].vue`). -->
  <div v-if="rawbody" data-duxt-copy-page class="flex shrink-0 items-stretch">
    <UiButton
      variant="outline"
      size="sm"
      class="gap-1.5 rounded-e-none border-e-0"
      @click="copy"
    >
      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
      {{ copied ? $t('duxt.code.copied') : $t('duxt.page.copy.label') }}
    </UiButton>

    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <UiButton
          variant="outline"
          size="sm"
          class="rounded-s-none px-1.5"
          :aria-label="$t('duxt.page.copy.more')"
        >
          <Icon name="lucide:chevron-down" class="size-3.5 opacity-60" />
        </UiButton>
      </UiDropdownMenuTrigger>

      <UiDropdownMenuContent align="end" class="w-56">
        <UiDropdownMenuItem as-child>
          <a :href="markdownPath" target="_blank" rel="noopener" class="gap-2">
            <Icon name="lucide:file-code-2" class="size-4" />
            {{ $t('duxt.page.copy.view') }}
          </a>
        </UiDropdownMenuItem>

        <!--
          Only when there is a second group to divide: `copy.models` is a
          consumer-owned list, and an empty one would otherwise leave a rule
          drawn under the last item with nothing beneath it.
        -->
        <UiDropdownMenuSeparator v-if="models.length" />

        <UiDropdownMenuItem
          v-for="model in models"
          :key="model.url"
          class="gap-2"
          @select="open(model.url)"
        >
          <Icon :name="model.icon" class="size-4" />
          {{ model.label }}
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
  </div>
</template>
