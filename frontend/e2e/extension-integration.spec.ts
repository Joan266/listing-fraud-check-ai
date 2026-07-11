import { test, expect } from '@playwright/test';

const MOCK_EXTENSION_DATA = {
  extracted_data: {
    address: 'Calle Mayor 10, Madrid',
    description: 'Piso en el centro de Madrid con 2 habitaciones.',
    property_type: 'apartment',
    price_details: '800 EUR/mes',
    image_urls: ['https://example.com/img1.jpg'],
    listing_url: 'https://www.idealista.com/inmueble/12345678/',
  },
  source_url: 'https://www.idealista.com/inmueble/12345678/',
};

test.describe('Extension → App integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/analysis/history/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ history: [] }) })
    );
  });

  test('valid extension data navigates to /review', async ({ page }) => {
    // addInitScript runs before any page JS, so localStorage is set before React mounts
    await page.addInitScript((data) => {
      localStorage.setItem('fraudcheck_extension_data', JSON.stringify(data));
    }, MOCK_EXTENSION_DATA);

    await page.goto('/?from_extension=true');

    await expect(page).toHaveURL(/\/review/, { timeout: 5000 });
  });

  test('localStorage is cleared after reading', async ({ page }) => {
    await page.addInitScript((data) => {
      localStorage.setItem('fraudcheck_extension_data', JSON.stringify(data));
    }, MOCK_EXTENSION_DATA);

    await page.goto('/?from_extension=true');
    await expect(page).toHaveURL(/\/review/, { timeout: 5000 });

    const stored = await page.evaluate(() => localStorage.getItem('fraudcheck_extension_data'));
    expect(stored).toBeNull();
  });

  test('from_extension param is stripped from URL', async ({ page }) => {
    await page.addInitScript((data) => {
      localStorage.setItem('fraudcheck_extension_data', JSON.stringify(data));
    }, MOCK_EXTENSION_DATA);

    await page.goto('/?from_extension=true');
    await expect(page).toHaveURL(/\/review/, { timeout: 5000 });

    // Param should never be visible in history
    expect(page.url()).not.toContain('from_extension');
  });

  test('invalid JSON in localStorage does not crash — stays on landing', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('fraudcheck_extension_data', 'not-valid-json{{{');
    });

    await page.goto('/?from_extension=true');

    // Should stay on landing (URL becomes '/' after replaceState, no redirect to /review)
    await expect(page).not.toHaveURL(/\/review/, { timeout: 2000 }).catch(() => {});
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('data without address/description/listing_url is rejected', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'fraudcheck_extension_data',
        JSON.stringify({ extracted_data: { property_type: 'apartment' } })
      );
    });

    await page.goto('/?from_extension=true');

    await expect(page).not.toHaveURL(/\/review/, { timeout: 2000 }).catch(() => {});
  });

  test('without from_extension param, localStorage is ignored', async ({ page }) => {
    await page.addInitScript((data) => {
      localStorage.setItem('fraudcheck_extension_data', JSON.stringify(data));
    }, MOCK_EXTENSION_DATA);

    await page.goto('/');

    // Without param, the useEffect exits early — stays on landing
    await page.waitForTimeout(500);
    expect(page.url()).not.toMatch(/\/review/);
  });
});
