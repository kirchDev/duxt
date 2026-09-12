/** Where the dismissals are kept. Namespaced so a consumer's keys cannot collide. */
const STORAGE_KEY = 'duxt:announcements';

/**
 * The one timer the whole page needs, at module scope.
 *
 * Three placements mean up to three components asking the same question — when
 * does the next window open or close — and three timers firing at the same
 * millisecond to set the same value. Module scope is safe here because every
 * write below sits behind `import.meta.client`: in the browser the module is
 * one app for one page load, and on the server it is never touched at all.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
let scheduledFor: number | undefined;

/**
 * The announcements a placement should draw, and how a reader closes one.
 *
 * TWO configs are read, deliberately. The RESOLVED one is what the banner
 * prints — `useDuxtConfig()` has collapsed each `text` to the reader's own
 * language. The WRITTEN one is what a dismissal is remembered against, because
 * a derived identity has to survive a language change, and a sentence resolved
 * for `de-DE` is a different string from the same sentence resolved for
 * `en-GB`. The two lists are the same list in the same order, so an index
 * addresses the same announcement in both.
 */
export function useDuxtAnnouncements(placement: DuxtAnnouncementPlacement) {
  const appConfig = useAppConfig();
  const duxt = useDuxtConfig();

  /** As the consumer wrote it: every locale of every sentence, still together. */
  const written = computed<DuxtAnnouncement[]>(
    () => mergeDuxtConfig(appConfig.duxt, duxtDefaults).announcements ?? []
  );

  /**
   * The reader's clock, shared so the three placements never disagree about
   * what time it is mid-render.
   *
   * Seeded at `0` rather than at `Date.now()`: `0` is before every window a
   * consumer would write, so an announcement with a `startsAt` cannot flash
   * during hydration before the real time arrives.
   */
  const now = useState<number>('duxt-announcements-now', () => 0);

  /** The keys this reader has closed. Empty until the browser says otherwise. */
  const dismissed = useState<string[]>(
    'duxt-announcements-dismissed',
    () => []
  );

  function read(): string[] {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];

      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch {
      // Blocked storage, or a value someone else wrote — either way, nothing
      // has been dismissed and every due announcement shows.
      return [];
    }
  }

  /**
   * Keep only the keys the config still names.
   *
   * Without it the list grows for the life of the browser profile: every
   * announcement a site ever ran leaves a key behind, and none of them can ever
   * match anything again — a derived key changes with its sentence, and a
   * retired `id` is gone from the config.
   */
  function persist(keys: string[]) {
    const live = new Set(written.value.map(duxtAnnouncementKey));
    const next = keys.filter((key) => live.has(key));

    dismissed.value = next;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A dismissal that cannot be remembered still hides the banner for this
      // page. Not worth an error the reader would have to read.
    }
  }

  /**
   * Wake up exactly once, at the next moment the list changes.
   *
   * Not a poll: an announcement scheduled for next Tuesday costs one sleeping
   * timer rather than a tick every second for six days. `setTimeout` overflows
   * past 2^31 ms and fires immediately, so a longer wait is taken in day-long
   * steps — each one simply re-asks the same question.
   */
  function schedule() {
    if (!import.meta.client) return;

    const next = duxtNextAnnouncementChange(written.value, now.value);

    if (next === undefined) {
      scheduledFor = undefined;
      return;
    }

    if (timer !== undefined && scheduledFor === next) return;

    const DAY = 86_400_000;
    clearTimeout(timer);
    scheduledFor = next;
    timer = setTimeout(
      () => {
        timer = undefined;
        scheduledFor = undefined;
        now.value = Date.now();
        schedule();
      },
      Math.min(Math.max(next - Date.now(), 0), DAY)
    );
  }

  onMounted(() => {
    now.value = Date.now();
    persist(read());
    schedule();
  });

  const visible = computed(() => {
    const due = new Set(
      duxtVisibleAnnouncements(written.value, {
        placement,
        now: now.value,
        dismissed: dismissed.value,
        maxVisible: duxt.announcementOptions?.maxVisible
      })
    );

    // Paired back to the resolved list by POSITION: `resolveDuxtTexts` maps an
    // array one to one, so index `n` is the same announcement in both — which
    // is what lets the identity come from the written text and the words on
    // screen from the resolved one.
    return written.value.flatMap((announcement, index) =>
      due.has(announcement)
        ? [
            {
              key: duxtAnnouncementKey(announcement),
              text: duxt.announcements?.[index]?.text ?? '',
              link: duxt.announcements?.[index]?.link
            }
          ]
        : []
    );
  });

  function dismiss(key: string) {
    persist([...dismissed.value, key]);
  }

  return { visible, dismiss };
}
