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

  const nameBox = page.getByLabel('Engineer name');
  await expect(nameBox).toHaveValue(/^\w+ \w+ \d{2}$/);
  const generated = await nameBox.inputValue();
  await page.getByRole('button', { name: /New name/ }).tap();
  await expect(nameBox).not.toHaveValue(generated);

  await page.getByRole('button', { name: /Type my own/ }).tap();
  const keyboard = page.getByRole('group', { name: 'On-screen keyboard' });
  await keyboard.getByRole('button', { name: 'Clear' }).tap();
  for (const key of ['G', 'R', 'A', 'C', 'E']) await keyboard.getByRole('button', { name: key, exact: true }).tap();
  await keyboard.getByRole('button', { name: 'Space', exact: true }).tap();
  await keyboard.getByRole('button', { name: 'H', exact: true }).tap();
  await expect(nameBox).toHaveValue('Grace H');
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
  await expect(page.getByRole('group', { name: 'Playback speed' })).toBeHidden();
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

test('a session can be restarted or ended from the top bar', async ({ page }) => {
  await page.goto('/#/engineer');
  const name = await page.getByLabel('Engineer name').inputValue();
  await page.getByRole('button', { name: /Start \d+-minute session/ }).tap();
  await expect(page).toHaveURL(/#\/engineer\/build$/);

  await page.getByRole('button', { name: /Laser rangefinder/ }).tap();
  await page.getByRole('button', { name: /Session/ }).tap();
  await page.getByRole('dialog').getByRole('button', { name: /Restart session/ }).tap();
  await expect(page).toHaveURL(/#\/engineer\/build$/);
  await expect(page.getByRole('button', { name: /Laser rangefinder/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(`👷 ${name}`)).toBeVisible();

  await page.getByRole('button', { name: /Session/ }).tap();
  await page.getByRole('dialog').getByRole('button', { name: /End session/ }).tap();
  await expect(page).toHaveURL(/#\/engineer$/);
  await expect(page.getByRole('timer')).toBeHidden();
  await expect(page.getByRole('button', { name: /Session/ })).toBeHidden();
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
]) {
  test(`every engineer screen fits one ${viewport.width}×${viewport.height} display without scrolling`, async ({
    page,
  }, testInfo) => {
    // Walks all four screens including a full fixed-speed maze run.
    testInfo.setTimeout(150_000);
    await page.setViewportSize(viewport);

    const expectNoScroll = async (screen: string) => {
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('.engineer-page')!;
        const doc = document.scrollingElement!;
        return {
          main: main.scrollHeight - main.clientHeight,
          mainX: main.scrollWidth - main.clientWidth,
          doc: doc.scrollHeight - doc.clientHeight,
        };
      });
      await page.screenshot({ path: testInfo.outputPath(`${screen}-${viewport.width}.png`) });
      expect(overflow, `${screen} overflows`).toEqual({ main: 0, mainX: 0, doc: 0 });
    };

    await page.evaluate(() => {
      const entries = Array.from({ length: 12 }, (_, index) => ({
        id: `seed-${index}`,
        name: `Seed Engineer ${index + 1}`,
        timeSeconds: 40 + index * 3,
        collisions: 0,
        energyUsed: 150,
        planner: 'astar',
        buildSummary: 'Carbon-fibre frame · 300 W brushless drive · Li-ion pack L · 360° LiDAR · Versal adaptive SoC · 100%',
        mapId: 'eng-maze-01',
        submittedAt: Date.now(),
      }));
      window.localStorage.setItem(
        'amd-rover:engineer-leaderboard',
        JSON.stringify({ version: 1, savedAt: Date.now(), data: { entries } }),
      );
    });
    await page.goto('/#/engineer');
    await page.reload();
    await page.getByRole('button', { name: /Type my own/ }).tap();
    await expectNoScroll('landing');

    await page.getByRole('button', { name: /Start \d+-minute session/ }).tap();
    await expect(page).toHaveURL(/#\/engineer\/build$/);
    await expectNoScroll('build');

    await page.getByRole('button', { name: /Go to the maze/ }).tap();
    await page.getByRole('button', { name: /Run$/ }).tap();
    await expect(page.getByText(/Exit reached in/)).toBeVisible({ timeout: 60_000 });
    await expectNoScroll('run');

    await page.getByRole('link', { name: 'Leaderboard' }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeVisible();
    await expectNoScroll('leaderboard');
  });
}
