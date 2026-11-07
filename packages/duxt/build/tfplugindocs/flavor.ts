/** The order Terraform Registry gives the generated provider categories. */
const CATEGORY_ORDER = [
  'index',
  'guides',
  'resources',
  'data-sources',
  'ephemeral-resources',
  'list-resources',
  'actions',
  'state-stores',
  'functions'
] as const;

type TfplugindocsPage = Record<string, unknown>;

/**
 * Bring tfplugindocs' Registry-oriented metadata into the ordinary page shape.
 *
 * The files remain ordinary Markdown pages: this only replaces the title a
 * sidebar reads and carries the generator's directory category forward. The
 * body is deliberately untouched, so a provider still renders on the Registry.
 */
export function normaliseTfplugindocsPage(
  page: TfplugindocsPage,
  file: string
) {
  const category = categoryForFile(file);
  const title =
    headingTitle(page.title) ?? pageTitle(page.page_title) ?? fileName(file);

  page.title = title;
  page.category = category;
  const rank = CATEGORY_ORDER.indexOf(
    category as (typeof CATEGORY_ORDER)[number]
  );
  page.navigationRank = rank < 0 ? CATEGORY_ORDER.length + 1 : rank + 1;
  if (typeof page.subcategory === 'string' && page.subcategory)
    page.navigationGroup = page.subcategory;
}

function headingTitle(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  return value.replace(/\s+\([^)]*\)\s*$/, '').trim();
}

function pageTitle(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  return (
    value
      // tfplugindocs writes `<name> <kind> - <provider>`; providers may call
      // themselves `linear` as well as `terraform-provider-linear`.
      .replace(/\s+-\s+[^\s]+\s*$/, '')
      .replace(
        /\s+(?:resource|data source|ephemeral resource|list resource|action|state store|function|provider)\s*$/i,
        ''
      )
      .trim()
  );
}

function fileName(file: string) {
  return (
    file
      .split('/')
      .at(-1)
      ?.replace(/\.[^.]+$/, '') || 'index'
  );
}

function categoryForFile(file: string) {
  const parts = file.split('/').filter(Boolean);
  const name = fileName(file);
  return name === 'index' ? 'index' : (parts.at(-2) ?? 'index');
}
