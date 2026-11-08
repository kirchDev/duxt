import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type { Browser, Page } from 'playwright-core';
import { hydrated } from './browser.ts';

export const INFOBOX_ROUTES = [
  '/wiki/infobox-sprint',
  '/wiki/infobox-catalog',
  '/de-DE/wiki/infobox-catalog'
];

export async function checkInfoboxFixtures(origin: string) {
  for (const path of INFOBOX_ROUTES) {
    const response = await fetch(origin + path, {
      headers: { accept: 'text/html' }
    });
    assert.equal(response.status, 200, `${path}: real fixture page`);
    const doc = new JSDOM(await response.text()).window.document;
    assert.ok(
      doc.querySelector('[data-wiki-article]'),
      `${path}: wiki article`
    );
    if (path.endsWith('infobox-sprint')) {
      const box = doc.querySelector('[data-infobox]')!;
      assert.ok(box, 'rendered infobox');
      assert.equal(box.getAttribute('aria-label'), 'Sprint facts');
      assert.ok(
        box.textContent?.includes('Sprint facts'),
        'visible infobox title'
      );
      assert.equal(box.querySelectorAll('[data-infobox-row]').length, 5);
      assert.deepEqual(
        [...box.querySelectorAll('[data-infobox-row] dt')].map((label) =>
          label.textContent?.trim()
        ),
        ['Status', 'Version', 'Release', 'Related', 'Duration']
      );
      const groups = [...box.querySelectorAll('[data-infobox-group] details')];
      assert.equal(groups.length, 2);
      assert.deepEqual(
        groups.map((group) =>
          group.querySelector('summary')?.textContent?.trim()
        ),
        ['Details', 'Optional facts']
      );
      assert.equal(
        groups[0]!.hasAttribute('open'),
        true,
        'normal group starts open'
      );
      assert.equal(
        groups[1]!.hasAttribute('open'),
        false,
        'collapsed group starts closed'
      );
      assert.equal(
        box.querySelector('a[href="/wiki/infobox-release"]')?.textContent,
        'Release notes'
      );
      assert.ok(
        [...box.querySelectorAll('a[href="/wiki/infobox-release"]')].some(
          (link) => link.textContent === 'Target label'
        ),
        'wikilink labels render in row values'
      );
      assert.ok(box.querySelector('strong'), 'row Markdown is retained');
      assert.ok(
        box
          .querySelector('img[srcset]')
          ?.closest('button')
          ?.getAttribute('aria-label'),
        'ProseImg zoom is retained'
      );
      assert.ok(
        doc.querySelector(
          '[data-wiki-backlinks] a[href="/wiki/infobox-release"]'
        ),
        'the fixture exercises containment before real backlinks'
      );
    } else {
      const titles = [
        ...doc.querySelectorAll('[data-infobox-query] tbody a')
      ].map((link) => link.textContent);
      assert.deepEqual(
        titles,
        path.startsWith('/de-DE')
          ? ['Sprintmodus']
          : ['Marathon mode', 'Sprint mode']
      );
      assert.deepEqual(
        [...doc.querySelectorAll('[data-infobox-query] thead th')].map((cell) =>
          cell.textContent?.trim()
        ),
        path.startsWith('/de-DE')
          ? ['title', 'version']
          : ['title', 'version', 'duration', 'release']
      );
      assert.deepEqual(
        [...doc.querySelectorAll('[data-infobox-query] tbody tr')].map((row) =>
          [...row.querySelectorAll('td')].map((cell) =>
            cell.textContent?.trim()
          )
        ),
        path.startsWith('/de-DE')
          ? [['Sprintmodus', '01']]
          : [
              ['Marathon mode', '1', 'A longer session', ''],
              ['Sprint mode', '01', 'Ten minutes', 'Release notes']
            ]
      );
      assert.equal(doc.querySelectorAll('[data-infobox-empty]').length, 1);
      assert.equal(
        doc.querySelector('[data-infobox-empty]')?.textContent?.trim(),
        path.startsWith('/de-DE')
          ? 'Keine passenden Seiten.'
          : 'No matching pages.'
      );
      assert.ok(
        doc.querySelector('[data-infobox-query] [role="region"]'),
        'table has its own scroll region'
      );
    }
  }
  for (const path of [
    '/demo/infobox-scope',
    '/demo/main/infobox-scope',
    '/demo/v2.x/infobox-scope'
  ]) {
    const response = await fetch(origin + path, {
      headers: { accept: 'text/html' }
    });
    assert.equal(response.status, 200, `${path}: source/version scope fixture`);
    const document = new JSDOM(await response.text()).window.document;
    assert.ok(
      document.querySelector('a[href="/wiki/infobox-sprint"]'),
      'the demo navigation exposes the rendered wiki infobox fixture'
    );
    const links = [
      ...document.querySelectorAll('[data-infobox-query] tbody a')
    ];
    assert.deepEqual(
      links.map((link) => link.textContent?.trim()),
      ['Separate infobox source'],
      `${path}: only its own source and version`
    );
    assert.deepEqual(
      links.map((link) => link.getAttribute('href')),
      [path],
      `${path}: no other edition of the same row leaks into the table`
    );
  }
  const response = await fetch(origin + '/api/infobox-fixture');
  assert.equal(response.status, 200);
  const data = await response.json();
  const sprint = data.pages.find(
    (page: { path: string }) => page.path === '/wiki/infobox-sprint'
  );
  assert.deepEqual(sprint.infobox, {
    type: 'mode',
    values: {
      status: 'Available',
      version: '01',
      release: 'Release notes',
      related: 'Target label',
      duration: 'Ten minutes'
    }
  });
  assert.deepEqual(
    data.matches.map((page: { title: string }) => page.title),
    ['Marathon mode', 'Sprint mode']
  );
}

async function infoboxImage(page: Page) {
  const image = page.locator('[data-infobox] img').first();
  const before = await image.boundingBox();
  await image.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const viewed = dialog.locator('[data-viewer-image]').first();
  await viewed.evaluate((img: HTMLImageElement) => img.decode());
  const [picture, close] = await Promise.all([
    viewed.boundingBox(),
    dialog.locator('[data-slot="dialog-close"]').boundingBox()
  ]);
  assert.ok(before && picture && close);
  assert.ok(picture.width > before.width, 'infobox viewer enlarges the image');
  assert.ok(
    close.y + close.height <= picture.y ||
      close.y >= picture.y + picture.height ||
      close.x + close.width <= picture.x ||
      close.x >= picture.x + picture.width,
    'viewer control keeps clear of the image'
  );
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
}

export async function checkInfoboxImage(browser: Browser, origin: string) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 }
  });
  try {
    await page.goto(origin + '/wiki/infobox-sprint');
    await hydrated(page);
    await infoboxImage(page);
  } finally {
    await page.close();
  }
}

export async function checkInfoboxLayout(browser: Browser, origin: string) {
  for (const width of [320, 412, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    try {
      await page.goto(origin + '/wiki/infobox-sprint');
      await hydrated(page);
      const geometry = await page.evaluate(() => {
        const box = document.querySelector<HTMLElement>('[data-infobox]')!;
        const body = box.closest('.typeset')!;
        const after = document.querySelector(
          '[data-wiki-backlinks], [data-wiki-page-info]'
        )!;
        const lead = [...body.querySelectorAll('p')].find((p) =>
          p.textContent?.trimStart().startsWith('Sprint is an available')
        )!;
        return {
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          float: getComputedStyle(box).cssFloat,
          box: box.getBoundingClientRect().toJSON(),
          body: body.getBoundingClientRect().toJSON(),
          after: after.getBoundingClientRect().toJSON(),
          lead: lead.getBoundingClientRect().toJSON()
        };
      });
      assert.equal(geometry.overflow, 0, `${width}px: no document overflow`);
      assert.ok(
        geometry.after.top >= geometry.box.bottom,
        `${width}px: float ends before article metadata/backlinks`
      );
      if (width < 1024) {
        assert.equal(geometry.float, 'none');
        assert.ok(
          Math.abs(geometry.box.width - geometry.body.width) < 1,
          `${width}px: box uses the article width`
        );
        assert.ok(
          geometry.lead.top >= geometry.box.bottom,
          `${width}px: box stacks before lead`
        );
      } else {
        assert.ok(
          ['inline-end', 'right'].includes(geometry.float),
          'wide box floats on the logical end'
        );
        assert.ok(
          geometry.lead.top < geometry.box.bottom,
          'wide prose flows beside the box'
        );
      }
      const collapsed = page.locator('[data-infobox-group] details').nth(1);
      assert.equal(
        await collapsed.getByText('Ten minutes', { exact: true }).isVisible(),
        false,
        'collapsed facts start hidden'
      );
      await collapsed.locator('summary').press('Enter');
      assert.ok(
        (await collapsed.getAttribute('open')) !== null,
        'collapsed group opens from the keyboard'
      );
      assert.equal(
        await collapsed.getByText('Ten minutes', { exact: true }).isVisible(),
        true,
        'opening the group reveals its facts'
      );
      await infoboxImage(page);
      if (width < 1024) {
        await page.goto(origin + '/wiki/infobox-catalog');
        await hydrated(page);
        assert.equal(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          ),
          0
        );
        assert.equal(
          await page
            .locator('[data-infobox-query] [role="region"]')
            .evaluate((element) => getComputedStyle(element).overflowX),
          'auto'
        );
        assert.ok(
          await page
            .locator('[data-infobox-query] [role="region"]')
            .evaluate((element) => element.scrollWidth > element.clientWidth),
          `${width}px: the wide table scrolls inside its own container`
        );
      }
    } finally {
      await page.close();
    }
  }
}
