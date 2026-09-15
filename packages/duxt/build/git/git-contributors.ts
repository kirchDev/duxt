import { execFileSync } from 'node:child_process';

/**
 * Who wrote something, read out of git.
 *
 * TWO SURFACES ASK THIS, and they ask it about different things. A page asks
 * who touched the file it was parsed from — `modules/git-meta.ts`, indexed by
 * path. A release asks who wrote the commits it carries — the release history,
 * indexed by tag. What they share is the part that decides WHO A PERSON IS, and
 * that is the whole reason this file exists rather than two copies of it: an
 * identity computed twice is one reader shown as two people on one page and as
 * one on the next.
 *
 * Node-only, and a root module rather than something under `modules/`, for the
 * reason `repository-root.ts` is one: `sections-changelog.ts` reaches it out of
 * the Content config, and a Nuxt module drags a type graph that config has no
 * business resolving.
 *
 * NO EMAIL EVER LEAVES THIS FILE. It is the identity every answer below is
 * keyed by, and it is the one field a commit carries that a published page has
 * no business republishing: an address in a commit object is between a
 * repository and whoever clones it, where the same address on a prerendered,
 * crawled, indexed page is a harvesting target the person never agreed to.
 * `DuxtContributor` is therefore a name, a count and — where git itself
 * carries one — a GitHub handle, which is already public by construction.
 */
export interface DuxtContributor {
  name: string;
  commits: number;
  username?: string;
}

/** The fields either caller supplies about one commit. */
export interface DuxtCommitAuthor {
  name: string;
  email: string;
}

/**
 * One entry per person, most commits first.
 *
 * Identity is the email, not the name — the same person commits as "Titus
 * Kirch" and as "titus" and would otherwise appear twice. The GitHub username
 * is read out of a noreply address, which is the only place git actually
 * carries one; without it there is a name and no avatar, which is the truth.
 */
export function contributorsOf(commits: DuxtCommitAuthor[]): DuxtContributor[] {
  const people = new Map<string, DuxtContributor>();

  for (const commit of commits) {
    const key = commit.email.toLowerCase();
    const existing = people.get(key);

    if (existing) {
      existing.commits += 1;
      continue;
    }

    people.set(key, {
      name: commit.name,
      commits: 1,
      username: githubUsername(commit.email)
    });
  }

  return [...people.values()].sort((a, b) => b.commits - a.commits);
}

/** `1234567+octocat@users.noreply.github.com` becomes `octocat`. */
export function githubUsername(email: string): string | undefined {
  const match = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(
    email.trim()
  );

  return match?.[1];
}

/**
 * An address GitHub itself issued to an APP rather than to a person.
 *
 * READ, NEVER GUESSED. GitHub writes `<id>+<app>[bot]@users.noreply.github.com`
 * for every app installation, so the marker is the forge's own and not a
 * taxonomy of ours — the same standard the changelog's group names are held to.
 * The EMAIL is tested rather than the display name, because the email is
 * already the identity above and a person may call themselves anything.
 *
 * Read by the RELEASE history and not by the page history, which is a scope
 * line rather than an inconsistency: the issue this answers asks a release to
 * name the people who wrote it, and this repository's own releases would
 * otherwise each open with the bot that cut them. Whether "last touched by"
 * should read the same way is a question about another surface.
 */
export function isGitHubApp(author: DuxtCommitAuthor): boolean {
  return /\[bot\]@users\.noreply\.github\.com$/i.test(author.email.trim());
}

/**
 * The unit separator, not a comma or a pipe.
 *
 * An author name may hold anything a person is called and a decoration list is
 * comma-separated prose; the one byte that cannot appear in either is one git
 * will emit for us with `%x1f`.
 */
const SEPARATOR = '\u001f';

/** The record separator, marking where one commit's line begins. */
const RECORD = '\u0001';

/** The fields one record carries, in order. */
const FORMAT =
  `${RECORD}%H${SEPARATOR}%P${SEPARATOR}%an` + `${SEPARATOR}%ae${SEPARATOR}%D`;

/** What git is asked, and the whole of why each flag is there. */
const ARGUMENTS = [
  'log',
  // FROM THE TAGS, NOT FROM `HEAD`. A release tag is cut on the release branch,
  // so on an integration branch — which is what every pull request builds — all
  // but the oldest are unreachable and the history comes back empty. Walking
  // the tags also excludes, for free, the commits no release carries yet:
  // bucketing those into the newest tag would credit people for work that has
  // not shipped.
  '--tags',
  // Children before their parents is what lets the pass below propagate a
  // release through the graph. It does NOT make tag ranges contiguous: two
  // parents of one merge may be walked in either order.
  '--topo-order',
  '--decorate=short',
  '--decorate-refs=refs/tags/*',
  `--format=${FORMAT}`
];

/**
 * Every release tag, with the people whose commits it carries.
 *
 * ONE `git log` FOR THE WHOLE HISTORY, walked children-first and reconstructed
 * as a graph in memory. Every tag seeds a release number on its commit; that
 * number flows to its parents, while an older tag replaces a newer number at
 * its own boundary. A commit therefore belongs to the oldest tag that can
 * reach it — exactly the set `<previous tag>..<tag>` names — without paying for
 * one git process per release.
 *
 * THE GRAPH IS LOAD-BEARING. Tag markers do not delimit contiguous slices of a
 * topo-ordered log: where a release merge has the older tag on one parent and
 * new work on another, git may print the older tag before that parallel branch.
 * A mutable "current tag" then gives the work to the release before it and
 * leaves the release that merged it empty.
 *
 * A MERGE COMMIT SETS THE BOUNDARY AND CREDITS NOBODY. It has to be walked,
 * because release-please tags the merge commit its release pull request
 * produced and skipping it would lose the boundary altogether; it introduces no
 * change of its own, so its author did not write the diff the release carries.
 * The page history arrives at the same answer by another route — `--name-status`
 * prints nothing for a merge — which is why the two surfaces agree about it.
 */
export function parseReleaseContributors(
  output: string
): Map<string, DuxtContributor[]> {
  const commits: {
    hash: string;
    parents: string[];
    author: DuxtCommitAuthor;
    merge: boolean;
    tags: string[];
  }[] = [];
  const tagGroups: string[][] = [];

  for (const record of output.split(RECORD)) {
    if (!record.trim()) continue;

    const [hash, parents, name, email, decoration] = record
      .split('\n')[0]!
      .split(SEPARATOR);
    const tags = tagsOf(decoration ?? '');

    commits.push({
      hash: hash ?? '',
      parents: (parents ?? '').trim().split(/\s+/).filter(Boolean),
      author: { name: name ?? '', email: email ?? '' },
      merge: (parents ?? '').trim().includes(' '),
      tags
    });

    if (tags.length) tagGroups.push(tags);
  }

  /** The release each reachable commit belongs to, newest group numbered 0. */
  const owners = new Map<string, number>();
  const authors = tagGroups.map(() => [] as DuxtCommitAuthor[]);
  let group = 0;

  // Seed every boundary before walking. A newer release reaches an older tag's
  // commit too; the larger number there is what stops that propagation.
  for (const commit of commits) {
    if (!commit.tags.length) continue;
    owners.set(commit.hash, group);
    group += 1;
  }

  for (const commit of commits) {
    const owner = owners.get(commit.hash);
    if (owner === undefined) continue;

    // A merge carries more than one parent. It sets and propagates the boundary
    // but says nothing itself; apps are omitted for the same reason as before.
    if (!commit.merge && !isGitHubApp(commit.author)) {
      authors[owner]!.push(commit.author);
    }

    for (const parent of commit.parents) {
      const previous = owners.get(parent);
      if (previous === undefined || owner > previous) owners.set(parent, owner);
    }
  }

  const contributors = new Map<string, DuxtContributor[]>();
  for (const [index, tags] of tagGroups.entries()) {
    const people = contributorsOf(authors[index]!);
    for (const tag of tags) contributors.set(tag, people);
  }

  return contributors;
}

/**
 * The tag names in one commit's decoration.
 *
 * Every tag on a commit names the same range of history, so all of them are
 * kept: a project that tags `v1.0.0` and `1.0.0` at once is answered under
 * whichever spelling its changelog happens to use.
 */
function tagsOf(decoration: string): string[] {
  return decoration
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('tag: '))
    .map((entry) => entry.slice('tag: '.length).trim())
    .filter(Boolean);
}

/**
 * Two ways of writing a repository, reduced to the one thing that identifies it.
 *
 * `kirchDev/duxt` resolves to `https://github.com/kirchDev/duxt`, a checkout's
 * remote is routinely `git@github.com:kirchDev/duxt.git`, and both name the same
 * repository. Scheme, credentials, the scp-style colon, a trailing `.git` and
 * case go; GitHub treats owner and name case-insensitively, and so does this.
 */
export function sameRepository(a: string, b: string): boolean {
  const key = (url: string) =>
    url
      .trim()
      .replace(/^[a-z][a-z+.-]*:\/\//i, '')
      .replace(/^[^@/]+@/, '')
      .replace(/^([^/:]+):(?!\d+\/)/, '$1/')
      .replace(/\.git\/?$/i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

  return key(a) === key(b);
}

/**
 * The local checkout's history, where a DOWNLOADED source is this very
 * repository.
 *
 * Content clones a remote source at `--depth 1`, and a history like that is
 * wrong data rather than missing data — which is why a downloaded changelog
 * reads no contributors. But a site very often names ITS OWN repository as a
 * source, to publish the documentation of a tag rather than of the commit being
 * built, and then the full history is already on disk: the tags are the same
 * tags, so a release is the same range of commits whichever copy is asked.
 *
 * Every remote counts, not only `origin`: a fork's checkout calls the project
 * `upstream`. A failure is silent for the reason `releaseContributors` gives —
 * nothing was configured, so no git means what it meant before.
 */
export function localHistoryFor(url: string, root: string): string | undefined {
  try {
    const remotes = execFileSync('git', ['-C', root, 'remote', '-v'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    return remotes
      .split('\n')
      .map((line) => line.split(/\s+/)[1])
      .some((remote) => remote && sameRepository(remote, url))
      ? root
      : undefined;
  } catch {
    return undefined;
  }
}

/** One answer per repository, read the first time a section asks for it. */
const cache = new Map<string, Map<string, DuxtContributor[]>>();

/**
 * The releases of the checkout at `root`, by tag.
 *
 * A FAILURE IS SILENT, and deliberately not the reporting `sources-git.ts`
 * does: there, tags that cannot be read are a source a maintainer has to fix,
 * and "found no tags" sent them to edit a source that was never wrong. Here
 * nothing was configured at all — the history is read because it happens to be
 * there — so no git, no checkout and a repository that has never been tagged
 * all mean what they mean in `modules/git-meta.ts`: the page shows what it
 * showed before this module existed.
 */
export function releaseContributors(
  root: string
): Map<string, DuxtContributor[]> {
  const cached = cache.get(root);
  if (cached) return cached;

  let found: Map<string, DuxtContributor[]>;

  try {
    found = parseReleaseContributors(
      execFileSync('git', ['-C', root, ...ARGUMENTS], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        // A repository's whole log against execFileSync's 1 MB default is a
        // truncated history reported as a git failure.
        maxBuffer: Number.POSITIVE_INFINITY
      })
    );
  } catch {
    found = new Map();
  }

  cache.set(root, found);
  return found;
}

/**
 * The people a changelog's version names, matched to the tag it was cut as.
 *
 * A changelog heading says `0.2.0` and the tag says `v0.2.0` — release-please's
 * `include-v-in-tag` — so both spellings are tried, in both directions. Nothing
 * is inferred beyond that: a version with no tag is a release this checkout
 * cannot see (one cut after the build, or a hand-written fixture), and the
 * honest answer for it is no contributors rather than someone else's.
 */
export function contributorsForVersion(
  releases: Map<string, DuxtContributor[]> | undefined,
  version: string
): DuxtContributor[] | undefined {
  if (!releases) return undefined;

  const bare = version.replace(/^v/, '');

  return (
    releases.get(version) ?? releases.get(`v${bare}`) ?? releases.get(bare)
  );
}
