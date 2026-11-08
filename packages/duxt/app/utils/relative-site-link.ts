export function isAbsoluteHttpLink(to: string | undefined) {
  return Boolean(to && /^https?:\/\//i.test(to));
}

/** Keep configured project links portable when they point to this very site. */
export function relativeSiteLink(to: string | undefined, siteUrl?: string) {
  if (!to || !siteUrl || !isAbsoluteHttpLink(to)) return to;

  try {
    const target = new URL(to);
    if (
      target.origin === new URL(siteUrl).origin &&
      !target.pathname.startsWith('//') &&
      !target.username &&
      !target.password
    ) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    // Invalid configuration is left intact for the link checker to report.
  }

  return to;
}
