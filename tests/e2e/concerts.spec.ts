import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import writeXlsxFile from 'write-excel-file/node';

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
  const privateUrl = page.url();
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
