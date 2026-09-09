/**
 * A choice the reader made, remembered across pages.
 *
 * A cookie rather than localStorage, and the reason is the jump: storage is
 * readable only in the browser, so the server always renders the default and
 * the control visibly switches after hydration. Reading it earlier does not
 * help — the server has already sent the wrong markup. A cookie travels with
 * the request, so the first byte is already correct.
 *
 * Still privacy-clean: first-party, no identifier, no analytics, a value the
 * reader set by clicking a tab. Under GDPR/ePrivacy that is a functional
 * preference the reader asked for, not something needing consent — the same
 * category as a language or theme choice. SameSite=Lax keeps it off cross-site
 * requests, and it expires after a year.
 *
 * ONE PER KIND OF CONTROL, never one per instance: a reader who picked `pnpm`
 * on the install page means it on every other page, and the same is true of
 * `curl` over `fetch` and of the form over raw JSON. A component that stores
 * its own answer per block asks the same question again three screens later.
 */
export function useDuxtChoice(name: string) {
  return useCookie<string | undefined>(`duxt-${name}`, {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    // No `secure: true`: it would drop the cookie on a plain-HTTP preview.
    default: () => undefined
  });
}
