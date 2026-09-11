import { describe, expect, it } from 'vitest';
import {
  duxtAnnouncementActive,
  duxtAnnouncementKey,
  duxtNextAnnouncementChange,
  duxtVisibleAnnouncements
} from '../app/utils/announcements';

const at = (iso: string) => Date.parse(iso);

describe('duxtAnnouncementKey', () => {
  it('is the configured id, whatever the text says', () => {
    expect(
      duxtAnnouncementKey({ id: 'v2-release', text: 'Version 2 is out' })
    ).toBe('v2-release');
  });

  it('follows the whole content where no id is set', () => {
    const english = duxtAnnouncementKey({
      text: { 'en-GB': 'Version 2 is out', 'de-DE': 'Version 2 ist da' }
    });

    // The same announcement, written with its locales the other way round: one
    // notice, so one identity — a reader who dismissed it must not meet it
    // again because the config file was tidied.
    expect(
      duxtAnnouncementKey({
        text: { 'de-DE': 'Version 2 ist da', 'en-GB': 'Version 2 is out' }
      })
    ).toBe(english);

    // A translation edited is a different announcement: only the German reader
    // was ever shown the old wording, and both must see the new one.
    expect(
      duxtAnnouncementKey({
        text: { 'en-GB': 'Version 2 is out', 'de-DE': 'Version 2 ist raus' }
      })
    ).not.toBe(english);
  });

  it('counts the link as content, and the placement and window as not', () => {
    const announcement: DuxtAnnouncement = {
      text: 'Version 2 is out',
      link: { label: 'Read the notes', to: '/releases/v2' }
    };
    const key = duxtAnnouncementKey(announcement);

    // A notice pointing somewhere else says something else.
    expect(
      duxtAnnouncementKey({
        ...announcement,
        link: { label: 'Read the notes', to: '/releases/v2.1' }
      })
    ).not.toBe(key);

    // Moving the same sentence, or extending how long it runs, is not a new
    // announcement — a reader who dismissed it is not shown it again.
    expect(
      duxtAnnouncementKey({
        ...announcement,
        placement: 'below-header',
        endsAt: '2026-12-31'
      })
    ).toBe(key);
  });
});

describe('duxtAnnouncementActive', () => {
  const text = 'Scheduled maintenance on Sunday';

  it('opens and closes on its own window', () => {
    const announcement: DuxtAnnouncement = {
      text,
      startsAt: '2026-03-01T09:00:00Z',
      endsAt: '2026-03-08T09:00:00Z'
    };

    expect(
      duxtAnnouncementActive(announcement, at('2026-02-28T23:59:59Z'))
    ).toBe(false);
    expect(
      duxtAnnouncementActive(announcement, at('2026-03-01T09:00:00Z'))
    ).toBe(true);
    expect(
      duxtAnnouncementActive(announcement, at('2026-03-07T12:00:00Z'))
    ).toBe(true);
    expect(
      duxtAnnouncementActive(announcement, at('2026-03-08T09:00:00Z'))
    ).toBe(false);
  });
});

describe('duxtVisibleAnnouncements', () => {
  const NOW = at('2026-03-05T12:00:00Z');

  const release: DuxtAnnouncement = { id: 'release', text: 'Version 2 is out' };
  const outage: DuxtAnnouncement = {
    id: 'outage',
    text: 'Maintenance on Sunday',
    placement: 'below-header'
  };
  const survey: DuxtAnnouncement = {
    id: 'survey',
    text: 'Tell us what you think'
  };

  it('takes one placement, in the configured order', () => {
    const visible = duxtVisibleAnnouncements([survey, outage, release], {
      placement: 'above-header',
      now: NOW,
      dismissed: []
    });

    expect(visible.map((entry) => entry.id)).toEqual(['survey', 'release']);
  });
});

describe('maxVisible', () => {
  const NOW = at('2026-03-05T12:00:00Z');

  const list: DuxtAnnouncement[] = [
    { id: 'release', text: 'Version 2 is out' },
    { id: 'survey', text: 'Tell us what you think' },
    { id: 'outage', text: 'Maintenance on Sunday', placement: 'below-header' }
  ];

  const shown = (
    placement: DuxtAnnouncementPlacement,
    dismissed: string[],
    maxVisible: DuxtAnnouncementMaxVisible
  ) =>
    duxtVisibleAnnouncements(list, {
      placement,
      now: NOW,
      dismissed,
      maxVisible
    }).map((entry) => entry.id);

  it('caps every placement separately, and fills the slot a dismissal frees', () => {
    // A number is a limit PER placement: the outage is not crowded out by a
    // release that has nothing to do with it.
    expect(shown('above-header', [], 1)).toEqual(['release']);
    expect(shown('below-header', [], 1)).toEqual(['outage']);

    // Dismissing the release does not cost the survey its turn — the cap is on
    // what is drawn, so the queue moves up.
    expect(shown('above-header', ['release'], 1)).toEqual(['survey']);
  });

  it('takes a limit per placement, and none at all for the rest', () => {
    expect(shown('above-header', [], { 'above-header': 1 })).toEqual([
      'release'
    ]);

    // A placement the object says nothing about is unlimited, exactly as an
    // omitted `maxVisible` is.
    expect(shown('below-header', [], { 'above-header': 1 })).toEqual([
      'outage'
    ]);

    // An explicit null is the same word for the same thing.
    expect(shown('above-header', [], { 'above-header': null })).toEqual([
      'release',
      'survey'
    ]);
  });

  it('is unlimited when it is not set', () => {
    expect(shown('above-header', [], undefined)).toEqual(['release', 'survey']);
    expect(shown('above-header', [], null)).toEqual(['release', 'survey']);
  });
});

describe('duxtNextAnnouncementChange', () => {
  const NOW = at('2026-03-05T12:00:00Z');

  it('is the next boundary a reader would see without reloading', () => {
    const list: DuxtAnnouncement[] = [
      // Already over: its boundaries are behind the reader.
      { text: 'Old', startsAt: '2026-01-01', endsAt: '2026-02-01' },
      { text: 'Showing now', endsAt: '2026-03-09T00:00:00Z' },
      { text: 'Opens sooner', startsAt: '2026-03-06T08:00:00Z' }
    ];

    expect(duxtNextAnnouncementChange(list, NOW)).toBe(
      at('2026-03-06T08:00:00Z')
    );
  });

  it('is nothing where no announcement is scheduled', () => {
    expect(
      duxtNextAnnouncementChange([{ text: 'Always' }], NOW)
    ).toBeUndefined();
    expect(duxtNextAnnouncementChange(undefined, NOW)).toBeUndefined();
  });
});
