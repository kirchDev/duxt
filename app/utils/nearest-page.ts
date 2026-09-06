/**
 * The page a reader most likely meant.
 *
 * A 404 in versioned documentation is usually a URL that is nearly right: a
 * segment renamed between versions, a guessed path, a link with the version
 * prefix missing. An empty "not found" tells that reader nothing; the nearest
 * few real paths usually tell them everything.
 *
 * Scored on the SEGMENTS, not on the whole string. `/duxt/guide/deploying` and
 * `/workflows/guide/deploying` are one segment apart and read as the same page
 * in another place, which edit distance over the raw text would rank far below
 * a page whose name happens to share letters.
 */
export function nearestPages(
  wanted: string,
  candidates: { path: string; title?: string }[],
  limit = 4
): { path: string; title?: string }[] {
  const target = segments(wanted);
  if (!target.length) return [];

  return candidates
    .filter((candidate) => candidate.path && candidate.path !== wanted)
    .map((candidate) => ({
      candidate,
      score: score(target, segments(candidate.path))
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.candidate.path.localeCompare(b.candidate.path)
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

const segments = (path: string) => path.split('/').filter(Boolean);

/**
 * How much two paths have in common.
 *
 * The LAST segment is what the reader was actually after, so a match there is
 * worth more than one anywhere else; a shared prefix comes second, because it
 * says the reader was in the right part of the tree. A near-miss on the last
 * segment — one being contained in the other — still counts, which is what
 * catches a renamed page.
 */
function score(wanted: string[], candidate: string[]): number {
  let points = 0;

  const wantedLast = wanted.at(-1)!;
  const candidateLast = candidate.at(-1);

  if (candidateLast === wantedLast) points += 10;
  else if (
    candidateLast &&
    (candidateLast.includes(wantedLast) || wantedLast.includes(candidateLast))
  ) {
    points += 5;
  }

  for (const [index, segment] of wanted.entries()) {
    if (candidate[index] === segment) points += 2;
    else break;
  }

  for (const segment of wanted) {
    if (segment !== wantedLast && candidate.includes(segment)) points += 1;
  }

  return points;
}
