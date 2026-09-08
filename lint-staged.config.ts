import type { Configuration } from 'lint-staged';

const config: Configuration = {
  '*.md': (filenames) => {
    // docs/ is MDC, not plain Markdown: oxfmt rewrites a component block's
    // YAML props into a list and indents its closing `::`, which silently
    // turns a rendered component back into literal text.
    const files = filenames.filter(
      (f) =>
        !/(?:^|\/)(README|CLAUDE|AGENTS)\.md$/.test(f) &&
        !/(?:^|\/)docs\//.test(f)
    );
    return files.length > 0 ? `pnpm exec oxfmt ${files.join(' ')}` : [];
  },
  '*.{json,jsonc,yml,yaml}': (filenames) => {
    const files = filenames.filter((f) => !f.includes('pnpm-lock.yaml'));
    return files.length > 0 ? `pnpm exec oxfmt ${files.join(' ')}` : [];
  },
  // `.vue` rides along with the scripts: oxlint and oxfmt both read an SFC,
  // and without it here the theme's components — nearly every file this repo
  // changes — passed the hook unchecked.
  '*.{js,ts,mjs,cjs,vue}': (filenames) => [
    `pnpm exec oxlint --fix --deny-warnings ${filenames.join(' ')}`,
    `pnpm exec oxfmt ${filenames.join(' ')}`
  ]
};

export default config;
