import { expect, test } from '@playwright/test';

/**
 * The workshop happy path.
 *
 * This is the exact sequence a student team follows in the first hour:
 * register a team, open Mission 1, configure the rover, fix the program so the
 * rover actually turns, run the simulation, complete the mission and read the
 * report. If this test fails, the workshop does not work.
 */

const TEAM_NAME = 'Circuit Breakers';

test.beforeEach(async ({ page }) => {
  // Every team starts from a clean device.
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/');
});

test('a team can register, configure a rover, program it, and complete Mission 1', async ({
  page,
}) => {
  // --- 1. Start a new team -------------------------------------------------
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AMD AI Rover Challenge');
  await page.getByRole('button', { name: /Start new mission/ }).click();

  await expect(page).toHaveURL(/#\/team-setup$/);
  await page.getByLabel('Team name').fill(TEAM_NAME);
  await page.getByLabel('School or class (optional)').fill('Sec 2E');
  await page.getByRole('button', { name: /Create team and enter Command Centre/ }).click();

  // --- 2. Command Centre ---------------------------------------------------
  await expect(page).toHaveURL(/#\/command$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(TEAM_NAME);

  const missionOne = page.getByRole('button', { name: /First Movement/ });
  await expect(missionOne).toBeEnabled();
  // Later missions must stay locked until Mission 1 is passed.
  await expect(page.getByRole('button', { name: /Sense and Avoid/ })).toBeDisabled();

  // --- 3. Configure the rover ---------------------------------------------
  await page.getByRole('link', { name: 'Rover Workshop' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Build your rover' })).toBeVisible();

  const motorPower = page.getByLabel(/Motor power/);
  await motorPower.fill('60');
  await expect(page.getByText('Motor power: 60%')).toBeVisible();

  await expect(page.getByText('This rover is ready to run')).toBeVisible();
  await page.getByRole('button', { name: /Continue to Programming Lab/ }).click();

  // --- 4. Program the rover ------------------------------------------------
  await expect(page).toHaveURL(/#\/programming/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Decide how your rover thinks',
  );
  await page.getByLabel('Editing the program for').selectOption({ label: '1. First Movement' });

  // The starter program is "Always → drive forward", which crashes at the
  // corner. Add the turning rule the mission hint describes.
  const rules = page.locator('.rule-row');
  await expect(rules).toHaveCount(1);

  await page.getByRole('button', { name: '+ Add rule' }).click();
  await expect(rules).toHaveCount(2);

  // New rules are inserted above the catch-all so they are actually reachable.
  const newRule = rules.first();
  await expect(newRule.getByLabel('Name for rule 1')).toHaveValue('Rule 2');
  await newRule.getByLabel('Condition type').selectOption('distance_close');
  await newRule.getByLabel('Sensor threshold').fill('1');
  await newRule.getByLabel('Action for rule 1').selectOption({ label: 'Turn left' });

  // Order matters: the catch-all "Drive forward" rule stays at the bottom.
  await expect(rules.nth(1).getByLabel('Name for rule 2')).toHaveValue('Drive forward');

  await expect(page.getByText('No problems found')).toBeVisible();

  const runInSimulator = page.getByRole('button', { name: /Run in simulator/ });
  await expect(runInSimulator).toBeEnabled();
  await runInSimulator.click();

  // --- 5. Run the simulation ----------------------------------------------
  await expect(page).toHaveURL(/#\/mission\/m1-first-movement$/);

  const briefing = page.getByRole('dialog');
  await expect(briefing).toContainText('Mission 1: First Movement');
  await briefing.getByRole('button', { name: /Understood/ }).click();
  await expect(briefing).toBeHidden();

  await page.getByRole('button', { name: /Run$/ }).click();

  // --- 6. Complete the mission --------------------------------------------
  const completion = page.getByRole('dialog');
  await expect(completion).toBeVisible({ timeout: 30_000 });
  await expect(completion).toContainText('Mission complete');
  await expect(completion).toContainText(/You scored \d+ out of 100/);
  await completion.getByRole('button', { name: /View mission report/ }).click();

  // --- 7. Mission report ---------------------------------------------------
  await expect(page).toHaveURL(/#\/report\/m1-first-movement$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('First Movement');
  await expect(page.getByRole('img', { name: /^Score \d+ out of 100$/ })).toBeVisible();
  await expect(page.getByText('Mission accomplished')).toBeVisible();

  // The report has to explain the score, not just show it.
  await expect(page.getByRole('heading', { name: 'Score breakdown' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why the rover did what it did' })).toBeVisible();

  // --- 8. Progress is recorded --------------------------------------------
  await page.getByRole('link', { name: 'Command Centre' }).click();
  await expect(page.getByRole('button', { name: /Sense and Avoid/ })).toBeEnabled();
});

test('the starter program fails Mission 1, and the failure is explained', async ({ page }) => {
  await page.getByRole('button', { name: /Start new mission/ }).click();
  await page.getByLabel('Team name').fill(TEAM_NAME);
  await page.getByRole('button', { name: /Create team and enter Command Centre/ }).click();

  await page.getByRole('button', { name: /First Movement/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Understood/ }).click();
  await page.getByRole('button', { name: /Run$/ }).click();

  const completion = page.getByRole('dialog');
  await expect(completion).toBeVisible({ timeout: 30_000 });
  await expect(completion).toContainText('Mission failed');
  await expect(completion).toContainText('Failing is part of engineering');

  await completion.getByRole('button', { name: /View mission report/ }).click();
  await expect(page.getByText('Mission not completed')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to improve next time' })).toBeVisible();
});

test('a hint is available when a team is stuck', async ({ page }) => {
  await page.getByRole('button', { name: /Start new mission/ }).click();
  await page.getByLabel('Team name').fill(TEAM_NAME);
  await page.getByRole('button', { name: /Create team and enter Command Centre/ }).click();
  await page.getByRole('button', { name: /First Movement/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Understood/ }).click();

  await page.getByRole('button', { name: /Hint/ }).click();
  await expect(page.getByText('Hint 1')).toBeVisible();
});

test('progress survives a page reload', async ({ page }) => {
  await page.getByRole('button', { name: /Start new mission/ }).click();
  await page.getByLabel('Team name').fill(TEAM_NAME);
  await page.getByRole('button', { name: /Create team and enter Command Centre/ }).click();
  await expect(page).toHaveURL(/#\/command$/);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(TEAM_NAME);
});
