/**
 * The picture beside a contributor's name, from the template a site configured.
 *
 * Here rather than beside either caller because TWO PLACES draw the same
 * people — the meta column of a page (`DuxtPageInfo`) and the release history
 * (`ChangelogReleases`) — and a template interpolated twice is two chances to
 * show a face on one surface and a letter on the other.
 *
 * `duxt.contributors.avatarUrl` holds the whole URL with `{username}` in it, so
 * a site pointing at a different forge, an avatar proxy or nothing at all is a
 * config change rather than a component fork. UNDEFINED WHERE THERE IS NO
 * HANDLE, which is the honest answer and not a placeholder: git only carries a
 * username in a noreply address, and a guessed avatar is a picture of somebody
 * else.
 *
 * A plain replacement, deliberately not an encoding pass: every caller here
 * takes its username from `githubUsername`, which reads it out of an address
 * GitHub itself issued.
 */
export function contributorAvatar(
  template: string | undefined,
  username: string | undefined
): string | undefined {
  if (!template || !username) return undefined;

  return template.replace('{username}', username);
}
