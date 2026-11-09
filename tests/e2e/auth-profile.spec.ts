import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('sign-in, profile edits, password changes, and logout update immediately without reloading', async ({
  page,
}) => {
  const username = `test-auth-${randomUUID().slice(0, 8)}`;
  const password = 'synthetic-profile-password-2027';
  const nextPassword = 'synthetic-replacement-password-2027';
  await page.goto('/account/');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .locator('form')
    .first()
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page).toHaveURL(/\/saved\/?$/);
  expect(
    await page.evaluate(
      async () =>
        (
          await (
            await fetch('/api/v1/sessions/current/', {
              credentials: 'same-origin',
            })
          ).json()
        ).data?.username
    )
  ).toBe(username);
  const header = page.getByRole('banner');
  await expect(header.getByText(username, { exact: true })).toBeVisible();
  await expect(
    header.getByRole('button', { name: 'Log out', exact: true })
  ).toBeVisible();
  await header
    .getByRole('link', { name: `Profile settings for ${username}` })
    .click();
  await page
    .getByLabel('Display name', { exact: true })
    .fill('Synthetic Listener');
  await page.getByLabel('Location', { exact: true }).fill('Example City');
  await page
    .getByLabel('Bio', { exact: true })
    .fill('Synthetic profile text, not real personal data.');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Profile saved.' })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Display name', { exact: true })).toHaveValue(
    'Synthetic Listener'
  );
  await expect(page.getByLabel('Location', { exact: true })).toHaveValue(
    'Example City'
  );
  await expect(page.getByLabel('Bio', { exact: true })).toHaveValue(
    'Synthetic profile text, not real personal data.'
  );
  await page
    .getByLabel('Current password', { exact: true })
    .first()
    .fill(password);
  await page.getByLabel('New password', { exact: true }).fill(nextPassword);
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill(nextPassword);
  await page
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Password changed.' })
  ).toBeVisible();
  await header.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(
    header.getByRole('link', { name: 'Sign in', exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await (await fetch('/api/v1/sessions/current/')).json()).data
    )
  ).toBeNull();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .locator('form')
    .first()
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'The username or password is incorrect.' })
  ).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page
    .locator('form')
    .first()
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();
  await expect(header.getByText(username, { exact: true })).toBeVisible();
  await expect(
    header.getByRole('link', { name: 'Sign in', exact: true })
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(header.getByText(username, { exact: true })).toBeVisible();
  await expect(
    header.getByRole('button', { name: 'Log out', exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBeTruthy();
});

test('sign-in never reports success when the browser did not retain the session cookie', async ({
  page,
}) => {
  await page.goto('/account/');
  await page.route('**/api/v1/sessions/', (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: {
          id: 'synthetic-cookie-less',
          username: 'test-cookie-less',
          role: 'user',
          email_notifications: false,
        },
      },
    })
  );
  await page.getByLabel('Username', { exact: true }).fill('test-cookie-less');
  await page
    .getByLabel('Password', { exact: true })
    .fill('synthetic-cookie-password');
  await page
    .locator('form')
    .first()
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'did not retain the sign-in cookie' })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/account\/?$/);
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Sign in', exact: true })
  ).toBeVisible();
});
