import { test, expect } from '@playwright/test';
import { runMedicationBottleChecks } from './medicationBottleChecks';

const base = process.env.BIGPHARMA_PREVIEW_URL || 'http://localhost:8081';
const session = process.env.BIGPHARMA_QA_STORAGE_STATE;
const medicationId = process.env.BIGPHARMA_QA_MEDICATION_ID;

test('Medication bottle labels and layout fixture checks', () => {
  expect(runMedicationBottleChecks()).toContain('passed');
});

test.describe('Default bottle on existing medication pages', () => {
  test.use({ storageState: session || undefined, reducedMotion: 'reduce' });
  for (const width of [320, 360, 375, 390, 414, 430]) {
    test(`${width}px labeled bottle`, async ({ page }, info) => {
      test.skip(!session || !medicationId, 'Requires a real authenticated QA session and saved medication; no account data is modified.');
      await page.setViewportSize({ width, height: 568 });
      await page.goto(`${base}/medication/${medicationId}`);
      await expect(page.getByTestId('detail-what-it-does')).toBeVisible({ timeout: 20000 });
      const bottle = page.getByTestId('medication-bottle').first();
      await expect(bottle).toBeVisible();
      await expect(bottle).toHaveAttribute('aria-label', /Illustrative (orange prescription bottle|inhaler|nasal spray), not actual product packaging/);
      const name = bottle.getByTestId('medication-bottle-name');
      await expect(name).not.toHaveText('');
      expect(await bottle.getByTestId('medication-bottle-strength').count()).toBeLessThanOrEqual(1);
      const layout = await bottle.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const label = element.querySelector('[data-testid="medication-bottle-name"]')!.getBoundingClientRect();
        return { within: label.left >= bounds.left && label.right <= bounds.right + 1, background: getComputedStyle(element).backgroundColor };
      });
      expect(layout.within).toBe(true);
      expect(layout.background).toBe('rgba(0, 0, 0, 0)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      await page.screenshot({ path: info.outputPath(`medication-bottle-${width}.png`) });
    });
  }
});
