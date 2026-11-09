import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import writeXlsxFile from 'write-excel-file/node';

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
    page.getByRole('heading', { name: 'Find your next front row.' })
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
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Make room for good nights.' })
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
