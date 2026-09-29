import { expect, test } from '@playwright/test';

// Engineers use tablets/touch screens: drive the UI with taps, not mouse clicks.
test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/');
});

test('an engineer can build a rover, run the maze and land on the leaderboard', async ({ page }) => {
  await page.getByRole('button', { name: /Engineer Challenge/ }).tap();
  await expect(page).toHaveURL(/#\/engineer$/);

  await page.getByLabel('Engineer name').fill('Grace H');
  await page.getByRole('button', { name: /Start \d+-minute session/ }).tap();

  await expect(page).toHaveURL(/#\/engineer\/build$/);
  await expect(page.getByRole('timer')).toBeVisible();
  const laser = page.getByRole('button', { name: /Laser rangefinder/ });
  await laser.tap();
  await expect(laser).toHaveAttribute('aria-pressed', 'true');
  await laser.tap();
  await expect(laser).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('radio', { name: 'A*' }).tap();
  await expect(page.getByRole('radio', { name: 'A*' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Increase Throttle' }).tap();
  await expect(page.getByRole('group', { name: 'Throttle' })).toContainText('85%');
  await page.getByRole('button', { name: 'Decrease Throttle' }).tap();

  await expect(page.getByRole('button', { name: /Full screen/ })).toBeVisible();
  await page.getByRole('button', { name: /Go to the maze/ }).tap();

  await expect(page).toHaveURL(/#\/engineer\/run$/);
  await page.getByRole('button', { name: '8×' }).tap();
  await page.getByRole('button', { name: /Run$/ }).tap();

  await expect(page.getByText(/Exit reached in [\d.]+ s/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Posted\. Your best is ranked #1\./)).toBeVisible();

  await page.getByRole('link', { name: 'Leaderboard' }).tap();
  await expect(page).toHaveURL(/#\/engineer\/leaderboard$/);
  await expect(page.getByRole('rowheader', { name: 'Grace H' })).toBeVisible();
});

test('build and run screens require an active session', async ({ page }) => {
  await page.goto('/#/engineer/run');
  await expect(page).toHaveURL(/#\/engineer$/);
  await expect(page.getByLabel('Engineer name')).toBeVisible();
});
