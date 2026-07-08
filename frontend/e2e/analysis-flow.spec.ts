import { test, expect } from '@playwright/test';

const MOCK_EXTRACTED_DATA = {
  extracted_data: {
    address: 'Calle Mayor 10, Madrid',
    description: 'Beautiful apartment in the center of Madrid with two bedrooms.',
    property_type: 'apartment',
    price_details: '800 EUR/month',
    image_urls: [],
  },
};

const MOCK_ANALYSIS_RESPONSE = {
  job_id: '550e8400-e29b-41d4-a716-446655440000',
};

const MOCK_ANALYSIS_STATUS = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'COMPLETED',
  input_data: MOCK_EXTRACTED_DATA.extracted_data,
  final_report: {
    authenticity_score: 72,
    quality_score: 65,
    sidebar_summary: 'This listing appears mostly legitimate with some minor concerns.',
    explanation: 'The address was verified and the price is within market range.',
    suggested_actions: ['Verify the landlord identity', 'Visit the property in person'],
    flags: [{ category: 'Price', description: 'Price is slightly below market average' }],
  },
  created_at: new Date().toISOString(),
  analysis_steps: [],
  chat: { id: 'chat-123', messages: [] },
};

test.describe('Analysis Flow', () => {
  test('full flow: paste text -> review -> submit -> results', async ({ page }) => {
    // 1. Intercept API calls
    await page.route('**/api/v1/extract-data', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EXTRACTED_DATA),
      });
    });

    await page.route('**/api/v1/analysis', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYSIS_RESPONSE),
      });
    });

    await page.route('**/api/v1/analysis/550e8400*', async (route) => {
      if (route.request().url().includes('/stream')) {
        await route.abort();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYSIS_STATUS),
      });
    });

    await page.route('**/api/v1/analysis/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ history: [] }),
      });
    });

    // 2. Navigate to landing page and paste listing text
    await page.goto('/');
    const textarea = page.locator('textarea');
    await textarea.fill(
      'Beautiful apartment in Madrid. Calle Mayor 10. 2 bedrooms, fully furnished. ' +
      '800 EUR per month. Contact owner at owner@example.com. Available immediately. ' +
      'The apartment is located in the heart of the city with great transport links.'
    );

    // 3. Submit the form
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 4. Should navigate to /review with extracted data
    await expect(page).toHaveURL(/\/review/, { timeout: 10000 });
  });

  test('url mode: paste URL and extract', async ({ page }) => {
    await page.route('**/api/v1/extract-from-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_EXTRACTED_DATA,
          screenshot_url: null,
          scrape_source: 'playwright',
        }),
      });
    });

    await page.route('**/api/v1/analysis/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ history: [] }),
      });
    });

    await page.goto('/');

    // Switch to URL mode
    const urlBtn = page.locator('button', { hasText: 'Pegar URL' });
    await urlBtn.click();

    // Enter a URL
    const urlInput = page.locator('input[type="url"]');
    await urlInput.fill('https://www.idealista.com/inmueble/12345678/');

    // Submit
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should navigate to /review
    await expect(page).toHaveURL(/\/review/, { timeout: 10000 });
  });
});
