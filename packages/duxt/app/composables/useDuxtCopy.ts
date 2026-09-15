/**
 * Copy a string to the clipboard, and say whether it worked.
 *
 * Every copy control on the site does the same four things — write, confirm
 * with a toast, show a check for two seconds, report a refusal — and seven of
 * them used to spell it out. The spellings had drifted: two reported a failure
 * in English whatever the reader's language, one never confirmed a success at
 * all, and none cleared its timer, so two copies inside two seconds reset the
 * icon early.
 *
 * Returns whether the text reached the clipboard, which is what a caller
 * reporting the copy needs: an analytics event for a copy the clipboard
 * refused would be a copy that never happened.
 *
 * `toast: false` for a control whose own label already changes to "Copied" —
 * a second confirmation in the corner says the same thing twice.
 */
export function useDuxtCopy({
  toast = true,
  failureKey = 'duxt.code.copyFailed'
}: { toast?: boolean; failureKey?: string } = {}) {
  const copied = ref(false);
  const notify = useDuxtToast();
  const { t } = useI18n();

  let reset: ReturnType<typeof setTimeout> | undefined;

  async function copy(text: string | undefined): Promise<boolean> {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Unavailable over plain HTTP, or refused by the browser.
      notify.error(t(failureKey));
      return false;
    }

    copied.value = true;
    if (toast) notify.success(t('duxt.code.copiedToast'));

    clearTimeout(reset);
    reset = setTimeout(() => (copied.value = false), 2000);

    return true;
  }

  onScopeDispose(() => clearTimeout(reset));

  return { copied, copy };
}
