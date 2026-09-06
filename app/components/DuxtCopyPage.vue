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

const copied = ref(false);

const markdownPath = computed(
  () => `${localeLink(props.path) ?? props.path}.md`
);

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
  <div v-if="rawbody" class="flex shrink-0 items-stretch">
    <Button
      variant="outline"
      size="sm"
      class="gap-1.5 rounded-r-none border-r-0"
      @click="copy"
    >
      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
      {{ copied ? $t('duxt.code.copied') : $t('duxt.page.copy.label') }}
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="outline"
          size="sm"
          class="rounded-l-none px-1.5"
          :aria-label="$t('duxt.page.copy.more')"
        >
          <Icon name="lucide:chevron-down" class="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuItem as-child>
          <a :href="markdownPath" target="_blank" rel="noopener" class="gap-2">
            <Icon name="lucide:file-code-2" class="size-4" />
            {{ $t('duxt.page.copy.view') }}
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          class="gap-2"
          @select="open('https://chatgpt.com/?q=')"
        >
          <Icon name="simple-icons:openai" class="size-4" />
          {{ $t('duxt.page.copy.chatgpt') }}
        </DropdownMenuItem>

        <DropdownMenuItem
          class="gap-2"
          @select="open('https://claude.ai/new?q=')"
        >
          <Icon name="simple-icons:claude" class="size-4" />
          {{ $t('duxt.page.copy.claude') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
