import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import writeXlsxFile from 'write-excel-file/node';
import { concert } from '../fixtures';

test.use({ timezoneId: 'UTC' });

async function register(page: Page) {
  const username = `test-${randomUUID().slice(0, 12)}`;
  await page.goto('/account/');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page
    .getByLabel('Password', { exact: true })
    .fill('synthetic-browser-password-2027');
  await page
    .locator('form')
    .first()
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page).toHaveURL(/\/saved\/?$/);
  return username;
}

test('discovery searches support acts, venues, genres, and restores clear filters', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Find your next gig.' })
  ).toBeVisible();
  await expect(
    page.getByText('Stage diving or 2stepping in the pit, you choose.', {
      exact: true,
    })
  ).toBeVisible();
  await page.getByLabel('Who', { exact: true }).fill('Mock Support');
  await page.getByLabel('Where', { exact: true }).fill('Fictional Room');
  await page.getByRole('button', { name: 'Find shows', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'View Synthetic Paper Signals',
      exact: true,
    })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Rock', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No shows on this list.' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Metal', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'View Synthetic Paper Signals',
      exact: true,
    })
  ).toBeVisible();
});

test('city selection persists in URLs, resets pagination, clears, and includes zero-show venues', async ({
  page,
}) => {
  await page.goto('/?page=2');
  await page.getByLabel('Where', { exact: true }).fill('Other Example City');
  await page.getByRole('button', { name: 'Find shows', exact: true }).click();
  await expect(page).toHaveURL(/city=Other/);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await expect(
    page.getByRole('link', { name: 'View Synthetic Stereo Test', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Where', { exact: true })).toHaveValue(
    'Other Example City'
  );
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByLabel('Where', { exact: true })).toHaveValue('');
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toBeVisible();
  await register(page);
  await page.goto('/venues/?city=Quiet+Example+City');
  await expect(
    page.getByRole('heading', { name: 'Quiet Fictional Hall', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Fictional Room', exact: true })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Follow venue', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Following venue', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByLabel('Where', { exact: true })).toHaveValue(
    'Quiet Example City'
  );
  await expect(
    page.getByRole('button', { name: 'Following venue', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
});

test('date shortcuts, inclusive ranges, and date/band sorting persist in discovery URLs', async ({
  page,
}) => {
  await page.goto('/?period=today');
  await expect(
    page.getByRole('button', { name: 'Today', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('link', { name: 'View Synthetic Tonight', exact: true })
  ).toBeVisible();
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Past', exact: true }).click();
  await page.getByRole('button', { name: 'Find shows', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'View Synthetic Archive Show', exact: true })
  ).toBeVisible();
  await expect(page.locator('.event-card')).toHaveCount(1);
  const response = await page.request.get('/api/v1/events/?limit=100');
  const events = (await response.json()).data as {
    id: string;
    datetime: string;
  }[];
  const from = events
    .find((event) => event.id === 'source:synthetic-metal')!
    .datetime.slice(0, 10);
  const to = events
    .find((event) => event.id === 'source:synthetic-punk')!
    .datetime.slice(0, 10);
  await page.getByLabel('From', { exact: true }).fill(from);
  await page.getByLabel('To', { exact: true }).fill(to);
  await page.getByRole('button', { name: 'Find shows', exact: true }).click();
  await expect(page.locator('.event-card')).toHaveCount(2);
  await expect(page).toHaveURL(/date_from=/);
  await page.getByLabel('Sort by', { exact: true }).selectOption('band_desc');
  await expect(page.locator('.event-card h3').first()).toHaveText(
    'Synthetic Voltage'
  );
  await page.getByLabel('Sort by', { exact: true }).selectOption('date_desc');
  await expect(page.locator('.event-card h3').first()).toHaveText(
    'Synthetic Paper Signals'
  );
  await page.reload();
  await expect(page.getByLabel('From', { exact: true })).toHaveValue(from);
  await expect(page.getByLabel('Sort by', { exact: true })).toHaveValue(
    'date_desc'
  );
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByLabel('From', { exact: true })).toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'Upcoming', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sort by', { exact: true })).toHaveValue(
    'date_asc'
  );
  await page.goto('/venues/?period=past');
  await expect(
    page.getByText('1 matching show collected', { exact: true })
  ).toBeVisible();
  await page.getByRole('link', { name: 'See the lineup', exact: true }).click();
  await expect(page).toHaveURL(/period=past/);
  await expect(page).toHaveURL(/venue=/);
  await expect(
    page.getByRole('link', { name: 'View Synthetic Archive Show', exact: true })
  ).toBeVisible();
});

test('advanced venue choices show counts for the applied filters and exclude empty venues', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('Where', { exact: true })).toBeEnabled();
  await page.getByLabel('Where', { exact: true }).fill('Example City');
  await page.getByLabel('Who', { exact: true }).fill('Mock Support');
  await page.getByRole('button', { name: 'Find shows', exact: true }).click();
  await page.getByText('Advanced filters', { exact: true }).click();
  const venue = page.getByLabel('Venue', { exact: true });
  await expect(venue).toBeEnabled();
  await expect(venue.locator('option')).toHaveText([
    'All matching venues',
    'Fictional Room / Example City (1)',
  ]);
  await venue.selectOption({ label: 'Fictional Room / Example City (1)' });
  await page.getByRole('button', { name: 'Find shows', exact: true }).click();
  await expect(page).toHaveURL(/venue=/);
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Venue', { exact: true })).toHaveValue(
    'fictional room|example city|test country'
  );
  await expect(page.getByLabel('Where', { exact: true })).toHaveValue(
    'Example City'
  );
});

test('mosher branding loads from the shared mark and a valid home-screen icon', async ({
  page,
}) => {
  await page.goto('/');
  const logo = page
    .getByRole('link', { name: 'Find Concerts home' })
    .locator('img');
  await expect(logo).toBeVisible();
  await expect
    .poll(() =>
      logo.evaluate(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0
      )
    )
    .toBe(true);
  const icons = await page.evaluate(async () => {
    const mark = document.querySelector<HTMLImageElement>('.brand-mark img');
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const apple = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]'
    );
    if (!mark || !favicon || !apple)
      throw new Error('Branding assets are missing.');
    const image = new Image();
    image.src = apple.href;
    await image.decode();
    return {
      sharedMark: mark.currentSrc === favicon.href,
      homeScreenWidth: image.naturalWidth,
      homeScreenHeight: image.naturalHeight,
    };
  });
  expect(icons).toEqual({
    sharedMark: true,
    homeScreenWidth: 180,
    homeScreenHeight: 180,
  });
});

test('dark mode is the default even on light systems, persists, and synchronizes between tabs', async ({
  page,
  context,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const toggle = page.getByRole('button', { name: 'Dark mode', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({
    path: testInfo.outputPath('discovery-dark.png'),
    fullPage: true,
  });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#f5f6f2'
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({
    path: testInfo.outputPath('discovery-light.png'),
    fullPage: true,
  });
  const other = await context.newPage();
  try {
    await other.goto('/');
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
    await other.getByRole('button', { name: 'Dark mode', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  } finally {
    await other.close();
  }
});

test('theme changes report blocked preference storage instead of silently claiming persistence', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'find-concerts-theme')
        throw new Error('Synthetic blocked storage');
      original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'browser storage could not save it' })
  ).toBeVisible();
});

test('venue maps load only on request, keep the correct pin, and support keyboard show/hide', async ({
  page,
}) => {
  const maps: string[] = [];
  let lookups = 0;
  await page.route(/\/api\/v1\/events\/[^/]+\/location\/?$/, async (route) => {
    lookups++;
    await route.fulfill({
      status: 500,
      json: {
        error: {
          code: 'UNEXPECTED_LOOKUP',
          message: 'Listing coordinates should be used.',
        },
      },
    });
  });
  await page.route(
    'https://www.openstreetmap.org/export/embed.html?**',
    async (route) => {
      maps.push(route.request().url());
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Synthetic map</title><p>Synthetic map provider</p>',
      });
    }
  );
  await page.goto('/events/source%3Asynthetic-metal/');
  const map = page.getByTitle('Venue map for Fictional Room', { exact: true });
  await expect(map).toHaveCount(0);
  expect(maps).toHaveLength(0);
  const show = page.getByRole('button', {
    name: 'Show venue map',
    exact: true,
  });
  await expect(show).toBeVisible();
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(map).toBeVisible();
  await expect.poll(() => maps.length).toBe(1);
  expect(new URL(maps[0]).searchParams.get('marker')).toBe('12.5,-45.5');
  await expect(map).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(
    page.getByRole('link', { name: 'OpenStreetMap contributors', exact: true })
  ).toBeVisible();
  const hide = page.getByRole('button', {
    name: 'Hide venue map',
    exact: true,
  });
  await expect(hide).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(map).toHaveCount(0);
  expect(lookups).toBe(0);
});

test('missing venue coordinates have a recoverable lookup error without showing an invented pin', async ({
  page,
}) => {
  let lookups = 0;
  let releaseFirstResponse!: () => void;
  const firstResponse = new Promise<void>((resolve) => {
    releaseFirstResponse = resolve;
  });
  await page.route(/\/api\/v1\/events\/[^/]+\/location\/?$/, async (route) => {
    lookups++;
    if (lookups === 1) {
      await firstResponse;
      await route.fulfill({
        status: 503,
        json: {
          error: {
            code: 'VENUE_PROVIDER_REJECTED',
            message: 'Venue lookup is temporarily unavailable.',
          },
        },
      });
    } else {
      await route.fulfill({
        json: { data: { latitude: 13.5, longitude: -46.5 } },
      });
    }
  });
  await page.route(
    'https://www.openstreetmap.org/export/embed.html?**',
    (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Synthetic map</title><p>Synthetic map provider</p>',
      })
  );
  await page.goto('/events/source%3Asynthetic-punk/');
  expect(lookups).toBe(0);
  const show = page.getByRole('button', {
    name: 'Show venue map',
    exact: true,
  });
  await show.focus();
  await page.keyboard.press('Enter');
  try {
    const finding = page.getByRole('button', {
      name: 'Finding venue...',
      exact: true,
    });
    await expect(finding).toHaveAttribute('aria-busy', 'true');
    await expect(finding).toBeFocused();
    await page.keyboard.press('Enter');
    expect(lookups).toBe(1);
  } finally {
    releaseFirstResponse();
  }
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Venue lookup is temporarily unavailable.' })
  ).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(show).toBeFocused();
  await page.keyboard.press('Enter');
  const map = page.getByTitle('Venue map for Fictional Room', { exact: true });
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('src', /marker=13\.5%2C-46\.5/);
  expect(lookups).toBe(2);
});

test('saved concert statuses persist, filter the list, and recover from a rejected update', async ({
  page,
}) => {
  await register(page);
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Save Synthetic Voltage', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Unsave Synthetic Voltage', exact: true })
  ).toBeVisible();
  await page.goto('/saved/');
  const status = page.getByLabel('Your status for Synthetic Voltage', {
    exact: true,
  });
  await expect(status).toHaveValue('interested');
  const goingSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/me/saved/') &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
  await status.selectOption('going');
  await goingSaved;
  await expect(status).toBeEnabled();
  await page.reload();
  await expect(status).toHaveValue('going');

  const savedPath = '**/api/v1/me/saved/';
  let releaseRejectedStatus!: () => void;
  const rejectedStatus = new Promise<void>((resolve) => {
    releaseRejectedStatus = resolve;
  });
  await page.route(savedPath, async (route) => {
    await rejectedStatus;
    await route.fulfill({
      status: 503,
      json: {
        error: {
          code: 'SYNTHETIC_SAVE_REJECTED',
          message: 'Status was not saved. Try again.',
        },
      },
    });
  });
  await status.focus();
  try {
    await status.selectOption('not_going');
    await expect(status).toBeDisabled();
  } finally {
    releaseRejectedStatus();
  }
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Status was not saved. Try again.' })
  ).toBeVisible();
  await expect(status).toHaveValue('going');
  await expect(status).toBeFocused();
  await page.unroute(savedPath);
  const notGoingSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/me/saved/') &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
  await status.selectOption('not_going');
  await notGoingSaved;
  await expect(status).toBeEnabled();
  await page.reload();
  await expect(status).toHaveValue('not_going');
  await page
    .getByLabel('Filter by status', { exact: true })
    .selectOption('going');
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toHaveCount(0);
  await page
    .getByLabel('Filter by status', { exact: true })
    .selectOption('not_going');
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include('.saved-controls, .saved-concert-status')
        .analyze()
    ).violations
  ).toEqual([]);
  const goingAgain = page.waitForResponse(
    (response) =>
      response.url().endsWith('/me/saved/') &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
  await status.selectOption('going');
  await goingAgain;
  await expect(
    page.getByLabel('Filter by status', { exact: true })
  ).toBeFocused();
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toHaveCount(0);
  await page
    .getByLabel('Filter by status', { exact: true })
    .selectOption('going');
  await expect(status).toHaveValue('going');
  await page.goto('/events/source%3Asynthetic-metal/');
  await expect(status).toHaveValue('going');
});

test('guest archives filter all legacy saves before pagination and keep the last status when storage fails', async ({
  page,
}) => {
  const events = Array.from({ length: 45 }, (_, index) =>
    concert({
      id: `synthetic-guest-${index}`,
      title: `Synthetic Guest Show ${index}`,
      datetime:
        index < 30
          ? '2099-04-03'
          : `2000-04-${String(index - 29).padStart(2, '0')}`,
    })
  );
  await page.route(/\/api\/v1\/events\/\?/, (route) => {
    const query = new URL(route.request().url()).searchParams;
    const ids = (query.get('ids') || '').split(',').filter(Boolean);
    expect(ids.length).toBeLessThanOrEqual(30);
    const matching = ids.length
      ? events.filter((event) => ids.includes(event.id))
      : events;
    const limit = Number(query.get('limit') || 24);
    const current = Number(query.get('page') || 1);
    return route.fulfill({
      json: {
        data: matching.slice((current - 1) * limit, current * limit),
        meta: {
          total: matching.length,
          page: current,
          limit,
          has_next: current * limit < matching.length,
        },
      },
    });
  });
  await page.goto('/saved/');
  await expect(
    page.getByRole('heading', { name: 'No shows on this list.', exact: true })
  ).toBeVisible();
  await page.evaluate(
    (items) =>
      localStorage.setItem('find-concerts-saved', JSON.stringify(items)),
    events.map((event) => ({
      id: event.id,
      type: 'event',
      addedAt: '2020-01-01T00:00:00Z',
    }))
  );
  await page.reload();
  await expect(
    page.getByRole('status').filter({ hasText: '45 saved concerts' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '15 past concerts' })
  ).toBeVisible();
  await expect(page.locator('article.event-card')).toHaveCount(12);
  await expect(
    page.locator('.event-card').first().locator('.date-ticket')
  ).toContainText('2000');
  await expect(
    page.getByRole('link', {
      name: 'View Synthetic Guest Show 30',
      exact: true,
    })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('article.event-card')).toHaveCount(3);
  const status = page.getByLabel('Your status for Synthetic Guest Show 30', {
    exact: true,
  });
  await expect(status).toHaveValue('interested');
  await status.selectOption('went');
  await page
    .getByLabel('Filter by status', { exact: true })
    .selectOption('went');
  await expect(
    page.getByRole('status').filter({ hasText: '1 past concert' })
  ).toBeVisible();
  await expect(status).toHaveValue('went');
  await page.reload();
  await expect(status).toHaveValue('went');
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await page
    .getByLabel('Filter by status', { exact: true })
    .selectOption('went');
  await expect(status).toHaveValue('went');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'find-concerts-saved')
        throw new Error('Synthetic blocked storage');
      original.call(this, key, value);
    };
  });
  await status.selectOption('going');
  await expect(
    page.getByRole('alert').filter({ hasText: /browser storage/i })
  ).toBeVisible();
  await expect(status).toHaveValue('went');
  await page.reload();
  await expect(status).toHaveValue('went');
  await page.evaluate(() => localStorage.removeItem('find-concerts-saved'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'No shows on this list.', exact: true })
  ).toBeVisible();
});

test('account follows and saves survive reload and drive recommendations and calendar export', async ({
  page,
}) => {
  await register(page);
  await page.goto('/artists/');
  const follow = page.getByRole('button', {
    name: 'Follow Mock Support',
    exact: true,
  });
  await expect(follow).toBeEnabled();
  await follow.click();
  await expect(
    page.getByRole('button', { name: 'Unfollow Mock Support', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/');
  const save = page.getByRole('button', {
    name: 'Save Synthetic Voltage',
    exact: true,
  });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(
    page.getByRole('button', { name: 'Unsave Synthetic Voltage', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Unsave Synthetic Voltage', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'For you', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'View Synthetic Voltage / Second Night',
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toHaveCount(0);
  const calendar = await page.request.get(
    '/api/v1/events/source%3Asynthetic-metal/calendar/'
  );
  expect(calendar.ok()).toBeTruthy();
  expect(await calendar.text()).toContain('BEGIN:VCALENDAR');
  await page.goto('/events/source%3Asynthetic-metal/');
  await expect(
    page.getByRole('heading', {
      name: 'Synthetic Voltage',
      level: 1,
      exact: true,
    })
  ).toBeVisible();
  await page.goto('/saved/');
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Synthetic Voltage', exact: true }).last()
  ).toBeVisible();
});

test('synthetic XLSX imports stay private, persist, and never leak to public pages or another account', async ({
  page,
  browser,
}) => {
  await register(page);
  const title = 'Synthetic Private History';
  const buffer = await writeXlsxFile(
    [
      ['Name', 'Where', 'When', 'Notes'].map((value) => ({ value })),
      [
        { value: title },
        { value: 'Fictional Archive Hall' },
        { value: '2020-04-03' },
        { value: 'Synthetic note, not real data' },
      ],
      [null, { value: 'Synthetic invalid row without a title' }],
    ],
    { sheet: 'Synthetic archive' }
  ).toBuffer();
  await page.goto('/import/');
  await page.getByLabel('Choose your concert spreadsheet').setInputFiles({
    name: 'synthetic-concerts.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });
  await page.getByRole('button', { name: 'Inspect workbook' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check the mapping.' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Import selected sheets' }).click();
  await expect(
    page.getByRole('status').filter({
      hasText: '1 imported, 0 duplicates, 1 skipped, 1 error from 2 rows.',
    })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Import selected sheets' }).click();
  await expect(
    page.getByRole('status').filter({
      hasText: '0 imported, 1 duplicates, 1 skipped, 1 error from 2 rows.',
    })
  ).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: `View ${title}`, exact: true }).click();
  await expect(page).toHaveURL(/\/events\//);
  await expect(
    page.getByRole('heading', { name: title, level: 1, exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('Synthetic note, not real data', { exact: true })
  ).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0
  );
  await expect(
    page.getByRole('button', { name: 'Show venue map', exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Open OpenStreetMap', exact: true })
  ).toHaveAttribute('href', /^https:\/\/www\.openstreetmap\.org\/?$/);
  const privateUrl = page.url();
  await page.goto('/saved/');
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(
    page.getByRole('link', { name: `View ${title}`, exact: true })
  ).toBeVisible();
  const attendance = page.getByLabel(`Your status for ${title}`, {
    exact: true,
  });
  await expect(attendance).toHaveValue('');
  const attendanceSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/me/saved/') &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
  await attendance.selectOption('went');
  await attendanceSaved;
  await page.reload();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await page
    .getByLabel('Filter by status', { exact: true })
    .selectOption('went');
  await expect(attendance).toHaveValue('went');
  await page.goto(privateUrl);
  const feed = await page.request.get('/api/v1/events/?past=true&limit=100');
  expect(await feed.text()).not.toContain(title);
  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).not.toContain('private%3A');
  await page.goto('/account/');
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Log out', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your account.' })
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: title, exact: true })
  ).toHaveCount(0);
  const strangerContext = await browser.newContext();
  try {
    const stranger = await strangerContext.newPage();
    await register(stranger);
    await stranger.goto(privateUrl);
    await expect(
      stranger.getByRole('heading', { name: 'This show is not here.' })
    ).toBeVisible();
    const own = await stranger.request.get('/api/v1/me/events/');
    expect((await own.json()).data).toEqual([]);
    await stranger.goto('/saved/');
    await stranger
      .getByRole('button', { name: 'Archive', exact: true })
      .click();
    await expect(
      stranger.getByRole('link', { name: `View ${title}`, exact: true })
    ).toHaveCount(0);
  } finally {
    await strangerContext.close();
  }
});

test('mobile layout, keyboard navigation, and accessibility remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'View Synthetic Voltage', exact: true })
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' })
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  await expect(
    page.getByRole('button', { name: 'Close navigation' })
  ).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Open navigation' })
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('bounded synthetic API load stays below the documented p95 threshold', async () => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ['--import', 'tsx', 'scripts/load-test.ts'],
    {
      cwd: process.cwd(),
      env: { ...process.env, LOAD_TEST_URL: 'http://127.0.0.1:3100' },
      timeout: 30000,
    }
  );
  const report = JSON.parse(stdout);
  expect(report.requests).toBe(60);
  expect(report.failures).toBe(0);
  expect(report.p95_ms).toBeLessThan(1000);
});
