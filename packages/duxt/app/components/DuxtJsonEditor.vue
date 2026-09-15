<script setup lang="ts">
/**
 * A JSON box that knows it is JSON: highlighting, brackets, and the parse error
 * underlined where it is rather than reported after a 400.
 *
 * WHY NOT A TEXTAREA, which is what this was: the request body is the one field
 * in the try-it client a reader types more than a word into, and a textarea
 * says nothing until the server answers. A missing comma is a round trip and a
 * guess; here it is a red squiggle under the character that caused it.
 *
 * WHY NOT MONACO, which is the obvious name: it is an editor for editing files,
 * and it arrives with workers and several megabytes. This layer is a package
 * every consumer site carries, including the ones with no OpenAPI source at
 * all. CodeMirror 6 does the same job for this box at roughly a tenth of it —
 * and it is loaded the way `Mermaid.vue` loads mermaid: on demand, in the
 * browser, never in the bundle a page without it downloads.
 *
 * The TEXTAREA IS STILL HERE, under `<ClientOnly>`'s fallback and after a
 * failed import. The body of a request is not decoration: a reader whose
 * network dropped the chunk, or who has JavaScript half-loaded, still has to be
 * able to type into it.
 */
import type { EditorView as EditorViewType } from '@codemirror/view';
import type { DuxtOpenApiKey } from '@duxt/utils/openapi';

const model = defineModel<string>({ default: '' });

const props = withDefaults(
  defineProps<{
    ariaLabel?: string;
    minHeight?: string;
    /**
     * The keys this document says the body may carry.
     *
     * What turns a JSON box into one that knows the API: the completion list
     * offers them, and the linter marks a required one that is absent and a
     * key the document never described. Empty is a working editor with plain
     * JSON checking and nothing added — which is the honest state for a body
     * whose shape the document does not fix. See `openApiBodyKeys`.
     */
    keys?: DuxtOpenApiKey[];
  }>(),
  { minHeight: '12rem', keys: () => [] }
);

const container = useTemplateRef<HTMLElement>('container');
const colorMode = useColorMode();

/**
 * The keys, read through a ref inside the extensions.
 *
 * A CodeMirror extension is built once and holds whatever it closed over, so
 * reading the prop directly would freeze the schema of whichever media type
 * was selected when the editor mounted. Through the ref, switching the media
 * type above re-lints and re-completes with no rebuild.
 */
const keysRef = computed(() => props.keys);

/** Filled once the editor is up; until then the fallback box is what shows. */
const ready = ref(false);
let view: EditorViewType | undefined;

/**
 * The palette, taken from the page rather than from a CodeMirror theme.
 *
 * A bundled theme would be a second set of colours beside the one the site
 * already defines, and it would not follow a consumer who redefined a token.
 * `color-mode` swaps the variables underneath, so the editor follows the theme
 * with no second render — which is why there is no light/dark theme here at
 * all, only `dark: …` for the syntax layer's own decision.
 */
async function mount() {
  if (!import.meta.client || !container.value || view) return;

  try {
    const [
      { EditorState },
      view_,
      json,
      lint,
      commands,
      language,
      autocomplete,
      { tags }
    ] = await Promise.all([
      import('@codemirror/state'),
      import('@codemirror/view'),
      import('@codemirror/lang-json'),
      import('@codemirror/lint'),
      import('@codemirror/commands'),
      import('@codemirror/language'),
      import('@codemirror/autocomplete'),
      import('@lezer/highlight')
    ]);

    const { EditorView, keymap, lineNumbers, highlightActiveLine } = view_;

    const theme = EditorView.theme(
      {
        '&': {
          fontSize: '0.75rem',
          backgroundColor: 'transparent',
          color: 'var(--foreground)'
        },
        '&.cm-focused': { outline: 'none' },
        '.cm-content': {
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          padding: '0.75rem 0'
        },
        // CodeMirror's own defaults put the numbers against the border and the
        // text 2px off the gutter. A box a reader types JSON into wants the
        // same breathing room the code blocks on the page have.
        '.cm-line': { padding: '0 0.75rem' },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          color: 'var(--muted-foreground)',
          border: 'none',
          paddingLeft: '0.5rem'
        },
        '.cm-lineNumbers .cm-gutterElement': { paddingRight: '0.5rem' },
        '.cm-activeLine': {
          backgroundColor: 'color-mix(in oklab, var(--muted) 45%, transparent)'
        },
        '.cm-activeLineGutter': { backgroundColor: 'transparent' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-lintRange-error': {
          textDecoration: 'underline wavy var(--destructive)'
        }
      },
      { dark: colorMode.value === 'dark' }
    );

    view = new EditorView({
      parent: container.value,
      state: EditorState.create({
        doc: model.value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          language.bracketMatching(),
          language.syntaxHighlighting(
            language.HighlightStyle.define([
              { tag: tags.propertyName, color: 'var(--duxt-cm-key)' },
              { tag: tags.string, color: 'var(--duxt-cm-string)' },
              { tag: tags.number, color: 'var(--duxt-cm-value)' },
              { tag: tags.bool, color: 'var(--duxt-cm-value)' },
              { tag: tags.null, color: 'var(--duxt-cm-value)' },
              { tag: tags.keyword, color: 'var(--duxt-cm-keyword)' },
              { tag: tags.comment, color: 'var(--duxt-cm-comment)' }
            ]),
            { fallback: true }
          ),
          json.json(),
          lint.linter(json.jsonParseLinter()),

          /**
           * The DOCUMENT's own rules, beside the syntax ones.
           *
           * A second linter rather than one that does both: `jsonParseLinter`
           * answers "is this JSON", this answers "is this the body this
           * endpoint described", and the first has to keep working when the
           * schema says nothing at all. The arithmetic is pure and tested —
           * see `openApiBodyProblems`.
           */
          lint.linter((view) => {
            const text = view.state.doc.toString();

            return openApiBodyProblems(text, keysRef.value).map((problem) => ({
              from: Math.min(problem.from, text.length),
              to: Math.min(problem.to, text.length),
              severity: problem.severity,
              message: problem.message
            }));
          }),
          lint.lintGutter(),

          /**
           * The keys the document names, offered WHERE A KEY GOES.
           *
           * Read off the syntax tree rather than off the characters before
           * the cursor, which is what the first attempt did and why it only
           * sometimes worked: matching an open quote fires inside a string
           * VALUE too, so it offered key names where a value goes — and it
           * stayed silent directly after a `{` or a `,`, which is exactly
           * where the next key begins. The tree knows which of the three the
           * cursor is in.
           *
           * A value inside a property whose schema named an `enum` gets that
           * enum instead — a field the document restricted to three words is a
           * field worth being handed those three words.
           */
          autocomplete.autocompletion({
            override: [
              (context) => {
                const keys = keysRef.value;
                if (!keys.length) return null;

                const tree = language.syntaxTree(context.state);
                const node = tree.resolveInner(context.pos, -1);

                /**
                 * The object the cursor is in, found by WALKING UP.
                 *
                 * A body being typed is a broken document almost all of the
                 * time — a half-written key, no comma yet, no closing brace —
                 * and lezer answers with error nodes rather than the tidy
                 * `Property` a finished line produces. Asking "is this node a
                 * property name" therefore said no exactly while the reader was
                 * typing one, which is the whole moment this exists for.
                 * Walking up to the nearest object works on the broken document
                 * as well as on the finished one.
                 */
                let scope = node;
                while (scope.parent && scope.name !== 'Object') {
                  scope = scope.parent;
                }

                if (scope.name !== 'Object') return null;

                /** Inside a string: its own span is what gets replaced. */
                const inString =
                  node.name === 'String' || node.name === 'PropertyName';
                const from = inString ? node.from : context.pos;
                const to = inString ? node.to : context.pos;

                /**
                 * The property this string is the VALUE of, if it is one.
                 *
                 * Everything else in an object is a key: a finished
                 * `PropertyName`, a string with no property around it yet, and
                 * the empty spot after `{` or a comma.
                 */
                const property =
                  node.parent?.name === 'Property' ? node.parent : undefined;

                const namingKey =
                  !property ||
                  !property.firstChild ||
                  node.from <= property.firstChild.to;

                if (namingKey) {
                  return {
                    from,
                    to,
                    options: keys.map((key) => ({
                      label: JSON.stringify(key.name),
                      type: 'property',
                      detail: key.required
                        ? `${key.type} · required`
                        : key.type,
                      info: key.description
                    }))
                  };
                }

                // A value: which property is it the value of?
                if (!inString || !property?.firstChild) return null;

                const name = context.state.sliceDoc(
                  property.firstChild.from,
                  property.firstChild.to
                );

                const options = keys.find(
                  (key) => JSON.stringify(key.name) === name
                )?.enum;

                return options?.length
                  ? {
                      from,
                      to,
                      options: options.map((value) => ({
                        label: JSON.stringify(value),
                        type: 'enum'
                      }))
                    }
                  : null;
              }
            ]
          }),

          keymap.of([
            ...commands.defaultKeymap,
            ...autocomplete.completionKeymap,
            ...lint.lintKeymap
          ]),
          EditorView.lineWrapping,
          theme,
          EditorView.contentAttributes.of(
            props.ariaLabel ? { 'aria-label': props.ariaLabel } : {}
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) model.value = update.state.doc.toString();
          })
        ]
      })
    });

    ready.value = true;
  } catch {
    // The chunk did not arrive. The fallback box below is the whole answer:
    // this is an input, and an input that fails to load must still be typable.
    ready.value = false;
  }
}

onMounted(mount);

onBeforeUnmount(() => {
  view?.destroy();
  view = undefined;
});

/**
 * A change from OUTSIDE — the form view writing back, or the format button.
 *
 * Guarded against the echo of the editor's own edit: dispatching the document
 * the editor already holds would move the cursor to the end on every keystroke.
 */
watch(model, (value) => {
  if (!view || value === view.state.doc.toString()) return;

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value }
  });
});
</script>

<template>
  <div
    class="overflow-hidden rounded-md border border-input bg-transparent shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
  >
    <div
      ref="container"
      class="duxt-json-editor"
      :style="{ '--duxt-editor-min-height': minHeight }"
    />

    <!-- Before the editor is up, and after it failed to arrive. -->
    <UiTextarea
      v-if="!ready"
      v-model="model"
      :aria-label="ariaLabel"
      spellcheck="false"
      class="rounded-none border-0 p-3 font-mono text-xs shadow-none focus-visible:ring-0"
      :style="{ minHeight }"
    />
  </div>
</template>

<style>
.duxt-json-editor .cm-editor {
  min-height: var(--duxt-editor-min-height);
}

.duxt-json-editor .cm-scroller {
  max-height: 24rem;
}
</style>
