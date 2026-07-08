import { test, expect } from '@playwright/test';

test.describe('Mobile Sidebar Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/analysis/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ history: [] }),
      });
    });
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('mobile-landing-sidebar-hidden', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/11-mobile-sidebar-hidden.png' });
  });

  test('mobile-landing-sidebar-open', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Click hamburger menu
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await menuBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/12-mobile-sidebar-open.png' });
  });

  test('mobile-landing-scrolled', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Scroll down to form
    await page.locator('text=Verifica un anuncio ahora').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/13-mobile-form-section.png' });
  });

  test('mobile-close-on-backdrop', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Open menu
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await menuBtn.click();
    await page.waitForTimeout(500);
    // Click backdrop to close
    await page.locator('.fixed.inset-0').click({ position: { x: 360, y: 400 } });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/14-mobile-after-close.png' });
  });
});
