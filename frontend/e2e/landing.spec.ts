import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays brand name and hero', async ({ page }) => {
    await expect(page.getByText('SafeLease').first()).toBeVisible();
    const heroHeading = page.getByRole('heading', { name: 'Check before you sign' });
    await expect(heroHeading).toBeVisible();
  });

  test('shows how-it-works section', async ({ page }) => {
    await expect(page.locator('text=How it works')).toBeVisible();
    await expect(page.locator('text=Paste your listing')).toBeVisible();
    await expect(page.locator('text=AI runs the checks')).toBeVisible();
    await expect(page.locator('text=Get your report')).toBeVisible();
  });

  test('shows features grid', async ({ page }) => {
    await expect(page.getByText('Six verification layers', { exact: true })).toBeVisible();
    await expect(page.getByText('Address verification')).toBeVisible();
    await expect(page.getByText('Price analysis')).toBeVisible();
    await expect(page.getByText('Scam pattern detection')).toBeVisible();
    await expect(page.getByText('Image forensics')).toBeVisible();
    await expect(page.getByText('Neighborhood analysis').first()).toBeVisible();
  });

  test('has text/url input toggle', async ({ page }) => {
    const textBtn = page.locator('button', { hasText: 'Paste Text' });
    const urlBtn = page.locator('button', { hasText: 'Paste URL' });

    await expect(textBtn).toBeVisible();
    await expect(urlBtn).toBeVisible();

    // Default is text mode — textarea should be visible
    await expect(page.locator('textarea')).toBeVisible();

    // Switch to URL mode
    await urlBtn.click();
    await expect(page.locator('input[type="url"]')).toBeVisible();
    await expect(page.locator('textarea')).not.toBeVisible();

    // Switch back
    await textBtn.click();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('submit button is disabled with empty input', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enables when text is entered', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('A'.repeat(150));

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
  });

  test('hero CTA scrolls to form', async ({ page }) => {
    const ctaBtn = page.locator('button', { hasText: 'Check a listing' });
    await ctaBtn.click();

    // The form section should be scrolled into view
    const formHeading = page.locator('h2', { hasText: 'Check a listing now' });
    await expect(formHeading).toBeInViewport();
  });

  test('footer is visible', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('text=SafeLease')).toBeVisible();
  });

  test('"skip and fill manually" link navigates to /review', async ({ page }) => {
    const skipLink = page.locator('a', { hasText: 'skip and fill the form manually' });
    await expect(skipLink).toBeVisible();
    await skipLink.click();
    await expect(page).toHaveURL(/\/review/);
  });
});
