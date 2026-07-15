import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays brand name and hero', async ({ page }) => {
    await expect(page.getByText('NoPiques').first()).toBeVisible();
    const heroHeading = page.getByRole('heading', { name: /dudas.*reservar/i });
    await expect(heroHeading).toBeVisible();
  });

  test('shows how-it-works section', async ({ page }) => {
    await expect(page.locator('text=Cómo funciona').first()).toBeVisible();
    await expect(page.locator('text=Abre el anuncio')).toBeVisible();
    await expect(page.locator('text=La IA ejecuta las verificaciones')).toBeVisible();
    await expect(page.locator('text=Recibe tu informe')).toBeVisible();
  });

  test('shows features grid', async ({ page }) => {
    await expect(page.getByText('Seis capas de verificación', { exact: true })).toBeVisible();
    await expect(page.getByText('Verificación de dirección')).toBeVisible();
    await expect(page.getByText('Análisis de precio')).toBeVisible();
    await expect(page.getByText('Detección de patrones de estafa')).toBeVisible();
    await expect(page.getByText('Análisis forense de imágenes')).toBeVisible();
    await expect(page.getByText('Análisis del barrio').first()).toBeVisible();
  });

  test('has text/url input toggle', async ({ page }) => {
    const textBtn = page.locator('button', { hasText: 'Pegar texto' });
    const urlBtn = page.locator('button', { hasText: 'Pegar URL' });

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
    const ctaBtn = page.locator('button', { hasText: 'Verificar anuncio' });
    await ctaBtn.click();

    // The form section should be scrolled into view
    const formHeading = page.locator('h2', { hasText: 'Verifica un anuncio' });
    await expect(formHeading).toBeInViewport();
  });

  test('footer is visible', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('text=NoPiques')).toBeVisible();
  });

  test('"skip and fill manually" link navigates to /review', async ({ page }) => {
    const skipLink = page.locator('a', { hasText: 'salta y rellena el formulario manualmente' });
    await expect(skipLink).toBeVisible();
    await skipLink.click();
    await expect(page).toHaveURL(/\/review/);
  });
});
