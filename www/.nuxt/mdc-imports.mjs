import _RemarkEmoji from 'remark-emoji'
import _Highlight from '/root/projects/comGithub/kirchDev/duxt/node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/highlighter/rehype-nuxt.js'

export const remarkPlugins = {
  'remark-emoji': { instance: _RemarkEmoji },
}

export const rehypePlugins = {
  'highlight': { instance: _Highlight, options: {} },
}

export const highlight = {"theme":{"default":"github-light","dark":"github-dark"}}