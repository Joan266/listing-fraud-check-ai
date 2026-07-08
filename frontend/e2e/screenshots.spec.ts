import { test, expect } from '@playwright/test';

test.describe('Visual Review Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Mock history API to prevent errors
    await page.route('**/api/v1/analysis/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ history: [] }),
      });
    });
  });

  test('landing-dark', async ({ page }) => {
    await page.goto('/');
    // Wait for GSAP animations to finish
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/01-landing-dark-full.png', fullPage: true });
  });

  test('landing-dark-viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/02-landing-dark-viewport.png' });
  });

  test('landing-light', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Toggle to light mode
    const themeBtn = page.locator('header button').last();
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/03-landing-light-full.png', fullPage: true });
  });

  test('landing-light-viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const themeBtn = page.locator('header button').last();
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/04-landing-light-viewport.png' });
  });

  test('landing-url-mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Switch to URL mode
    const urlBtn = page.locator('button', { hasText: 'Pegar URL' });
    await urlBtn.click();
    await page.waitForTimeout(300);
    // Scroll to form
    await page.evaluate(() => {
      document.querySelector('#check-form')?.parentElement?.scrollIntoView();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/05-landing-url-mode.png' });
  });

  test('landing-text-filled', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Scroll to form and fill text
    const textarea = page.locator('textarea');
    await textarea.scrollIntoViewIfNeeded();
    await textarea.fill(
      'Beautiful apartment for rent in the heart of Madrid. Located at Calle Gran Via 25, ' +
      'this spacious 2-bedroom flat features hardwood floors, natural light, and a modern kitchen. ' +
      '850 EUR/month all inclusive. Contact Maria at maria@example.com or +34 612 345 678.'
    );
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/06-landing-text-filled.png' });
  });

  test('landing-mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/07-landing-mobile-full.png', fullPage: true });
  });

  test('landing-mobile-viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/08-landing-mobile-viewport.png' });
  });

  test('review-page-empty', async ({ page }) => {
    await page.goto('/review');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/09-review-page.png', fullPage: true });
  });

  test('sidebar-collapsed', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Click the sidebar collapse button
    const collapseBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    // The collapse button is the small circular one at the edge of the sidebar
    const sidebarToggle = page.locator('button.absolute.-right-3');
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'screenshots/10-sidebar-collapsed.png' });
  });
});
