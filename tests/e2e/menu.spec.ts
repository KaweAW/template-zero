import { expect, test } from '@playwright/test';

test.describe('menu (the page behind the table QR code)', () => {
  test('/menu redirects to the visitor language and keeps the QR tracking parameter', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'it-IT' });
    const page = await context.newPage();
    await page.goto('/menu?src=qr');
    await expect(page).toHaveURL(/\/it\/menu\?src=qr$/);
    await expect(page.locator('h1')).toHaveText('Menu');
    await context.close();
  });

  test('lists every dish and the sticky section navigation', async ({ page }) => {
    await page.goto('/en/menu');
    await expect(page.getByRole('navigation', { name: 'Menu sections' })).toBeVisible();
    await expect(page.locator('h3')).toHaveCount(18);
  });

  test('diet filters narrow the list and can be cleared', async ({ page }) => {
    await page.goto('/en/menu');
    await page.getByRole('button', { name: /Vegan/ }).click();
    await expect(page.locator('h3')).toHaveCount(2); // bruschetta, espresso
    await expect(page.getByText('2 dishes shown')).toBeVisible();

    await page.getByRole('button', { name: 'Show everything' }).click();
    await expect(page.locator('h3')).toHaveCount(18);
  });

  test('the menu is readable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/de/menu');
    await expect(page.locator('h3')).toHaveCount(18);
    await context.close();
  });
});
