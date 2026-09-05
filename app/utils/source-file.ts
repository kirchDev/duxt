/**
 * From a page back to the file it was written in.
 *
 * "Edit this page" is the visible half; the same two functions answer "which
 * file is this" for anything else that needs it. Pure, because every part of
 * this is string arithmetic over a scheme with three moving pieces — the URL
 * prefix, the numbered folder names and the source's own docs folder — and the
 * only way that stays right is a test rather than a click.
 */

/**
 * The file's path inside its repository.
 *
 * `stem` is Content's own: the file path with the extension gone and the URL
 * prefix in front, and — unlike `path` — with the numbered folder names still
 * on it. `1.guides/2.add-a-body` renders at `/guides/add-a-body`, so the URL
 * cannot be turned back into a file name; the stem can.
 */
export function sourceFilePath(
  stem: string,
  prefix: string,
  folder: string
): string {
  const lead = prefix.replace(/^\//, '');
  const relative =
    lead && stem.startsWith(`${lead}/`) ? stem.slice(lead.length + 1) : stem;

  return [folder.replace(/\/+$/, ''), `${relative}.md`]
    .filter(Boolean)
    .join('/');
}

/**
 * The URL that opens that file for editing.
 *
 * GitHub and GitLab spell it differently and everything else is left alone —
 * a wrong link is worse than none, and the button is simply not drawn when the
 * host is not one of the two.
 */
export function sourceEditUrl(
  repositoryUrl: string | undefined,
  ref: string | undefined,
  file: string
): string | undefined {
  if (!repositoryUrl) return undefined;

  const base = repositoryUrl.replace(/\.git$/, '').replace(/\/+$/, '');
  const at = ref || 'HEAD';

  if (base.includes('gitlab')) return `${base}/-/edit/${at}/${file}`;
  if (base.includes('github')) return `${base}/edit/${at}/${file}`;

  return undefined;
}
