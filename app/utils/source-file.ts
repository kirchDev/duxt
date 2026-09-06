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
 * The link back to a file: an edit form where one is possible, a view where it
 * is not.
 *
 * A TAG CANNOT BE EDITED. GitHub's web editor commits to a branch, so
 * `/edit/v0.8.0/…` is a 404 for anyone signed in — and a version served from a
 * tag is exactly the case this layer creates. Sending that reader to the
 * default branch instead would be worse than the 404: they would be editing
 * today's documentation while believing they were fixing the version they were
 * reading.
 *
 * So a tag gets the source, not a form. The caller draws the label the kind
 * asks for.
 *
 * GitHub and GitLab spell both forms differently and every other host is left
 * alone — a wrong link is worse than none, so no button is drawn at all.
 */
export interface SourceLink {
  url: string;
  /** `edit` opens a form; `view` opens the file as it stands. */
  kind: 'edit' | 'view';
}

export function sourceLink(
  repositoryUrl: string | undefined,
  ref: string | undefined,
  refKind: 'branch' | 'tag' | undefined,
  file: string
): SourceLink | undefined {
  if (!repositoryUrl) return undefined;

  const base = repositoryUrl.replace(/\.git$/, '').replace(/\/+$/, '');

  // Without a ref there is nothing to open a form against either: `HEAD` is a
  // symbolic name the editor does not accept, though it reads fine.
  const editable = refKind !== 'tag' && Boolean(ref);
  const at = ref || 'HEAD';
  const kind = editable ? 'edit' : 'view';

  if (base.includes('gitlab')) {
    return {
      url: `${base}/-/${editable ? 'edit' : 'blob'}/${at}/${file}`,
      kind
    };
  }

  if (base.includes('github')) {
    return { url: `${base}/${editable ? 'edit' : 'blob'}/${at}/${file}`, kind };
  }

  return undefined;
}
