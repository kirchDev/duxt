import type { DuxtResolvedSource } from '@kirchdev/duxt/sources-resolve';

/** A proposal in the source's web editor; never a write or a tag edit. */
export function wikiCreateLink(
  source: DuxtResolvedSource,
  title: string
): { url: string; forge: string } | undefined {
  if (
    !source.repositoryUrl ||
    !source.ref ||
    source.refKind === 'tag' ||
    !title.trim() ||
    title.length > 300
  )
    return;
  const parts = title.trim().split('/');
  if (
    parts.some(
      (part) =>
        !part.trim() || part === '.' || part === '..' || part.includes('\\')
    )
  )
    return;
  const filename = parts
    .map((part) =>
      part
        .normalize('NFC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_. -]/gu, '')
        .replace(/\s+/g, '-')
    )
    .join('/');
  if (
    !filename ||
    filename.split('/').some((part) => !part || part === '.' || part === '..')
  )
    return;
  const file = `${source.originPath ?? source.path}/${filename}.md`.replace(
    /^\/+/,
    ''
  );
  const content = `---\ntitle: ${JSON.stringify(title)}\n---\n\n`;
  const base = source.repositoryUrl.replace(/\.git$/, '').replace(/\/+$/, '');
  let host: string;
  try {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol)) return;
    host = url.hostname;
  } catch {
    return;
  }
  const ref = encodeURIComponent(source.ref);
  if (host === 'github.com' || host.startsWith('github.')) {
    const query = new URLSearchParams({ filename: file, value: content });
    return { url: `${base}/new/${ref}?${query}`, forge: 'GitHub' };
  }
  if (host === 'gitlab.com' || host.startsWith('gitlab.')) {
    const query = new URLSearchParams({ file_name: file, content });
    return { url: `${base}/-/new/${ref}?${query}`, forge: 'GitLab' };
  }
}
