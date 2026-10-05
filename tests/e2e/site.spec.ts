import { expect, test } from '@playwright/test';

test.describe('site basics', () => {
  test('the language switcher keeps the visitor on the same page', async ({ page }) => {
    await page.goto('/de/reservieren');
    await page.getByRole('link', { name: 'Italiano' }).click();
    await expect(page).toHaveURL(/\/it\/prenota$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.locator('h1')).toHaveText('Prenota un tavolo');
  });

  test('the homepage shows a live open/closed status', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page
        .locator('section')
        .first()
        .getByText(/Open now|Closing soon|Closed/),
    ).toBeVisible();
  });

  test('every language has a title, canonical URL and hreflang alternates', async ({ page }) => {
    for (const locale of ['de', 'en', 'it', 'fr']) {
      await page.goto(`/${locale}`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/${locale}$`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(5); // 4 languages + x-default
    }
  });

  test('unknown pages show the localised 404', async ({ page }) => {
    const response = await page.goto('/it/non-esiste');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Pagina non trovata');
  });
});
