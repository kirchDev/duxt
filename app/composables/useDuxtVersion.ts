/**
 * What the reader needs to be told about the version they are in.
 *
 * Three questions, one answer, because they are the same question asked by
 * different parts of the page: the banner needs to know whether this version is
 * still the one to read, the head needs to know whether a crawler should index
 * it, and the switcher needs a badge per entry. All three follow from the
 * resolved source manifest — which version serves this path, which one serves
 * it without a prefix, and what the config says each is worth.
 */
export function useDuxtVersion() {
  const duxt = useDuxtConfig();
  const path = useDuxtPath();

  const sources = computed(() => duxt.resolvedSources ?? []);

  /** The source serving this route. */
  const current = computed(() => sourceForPath(path.value, sources.value));

  /**
   * The version to send the reader to instead — the default of the SAME
   * repository. Another project's default says nothing about this one.
   */
  const preferred = computed(() =>
    sources.value.find(
      (source) => source.isDefault && source.repo === current.value?.repo
    )
  );

  /** Is this the version a first-time reader should be on? */
  const isPreferred = computed(
    () => !current.value || current.value === preferred.value
  );

  const status = computed(() => current.value?.status ?? 'current');

  /**
   * WHICH KIND of "not the current version" this is.
   *
   * `isDefault` says only "not the one served by default", and that covers two
   * readers who need opposite things told: someone on a release from two years
   * ago should be told to upgrade, and someone on the branch documenting next
   * month's should be told that what they are reading may still change. Telling
   * the second one to upgrade is exactly backwards, which is what the banner
   * did before this.
   *
   * The config wins where it speaks — `status: 'upcoming'` on a branch called
   * `next` is a fact only the maintainer has. Where it does not, semver decides,
   * and where semver cannot (a branch beside a tag) the version is treated as
   * old: a tag next to a default branch is almost always a past release, and
   * the maintainer can say otherwise in one word.
   */
  const kind = computed<'current' | 'upcoming' | 'old' | 'deprecated' | 'eol'>(
    () => {
      if (status.value === 'eol') return 'eol';
      if (status.value === 'deprecated') return 'deprecated';
      if (status.value === 'upcoming') return 'upcoming';
      if (isPreferred.value) return 'current';

      return versionRelation(
        current.value?.version,
        preferred.value?.version
      ) === 'newer'
        ? 'upcoming'
        : 'old';
    }
  );

  /**
   * A crawler is as likely to serve v0.7.0 as the current docs, and nothing on
   * the page says which it is. So an older or dead version points at the
   * current one and asks not to be indexed itself — `follow`, because the links
   * out of it are still worth crawling.
   */
  const shouldIndex = computed(
    () => isPreferred.value && status.value !== 'eol'
  );

  /** The same page in the preferred version, for the banner and the canonical. */
  const preferredPath = computed(() =>
    versionPath(
      path.value,
      current.value?.prefix,
      preferred.value?.prefix || '/'
    )
  );

  const shouldWarn = computed(
    () =>
      Boolean(current.value?.version) &&
      (!isPreferred.value ||
        status.value === 'deprecated' ||
        status.value === 'eol')
  );

  return {
    sources,
    current,
    preferred,
    isPreferred,
    status,
    kind,
    shouldIndex,
    shouldWarn,
    preferredPath
  };
}
