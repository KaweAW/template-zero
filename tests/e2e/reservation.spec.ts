import { expect, test } from '@playwright/test';

/** YYYY-MM-DD of the next given weekday (0 = Sunday) after today. */
function nextWeekday(day: number) {
  const d = new Date();
  do d.setDate(d.getDate() + 1);
  while (d.getDay() !== day);
  return d.toISOString().slice(0, 10);
}

test.describe('reservation form', () => {
  test('shows validation messages when submitted empty', async ({ page }) => {
    await page.goto('/en/reserve');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Pick a date.')).toBeVisible();
  });

  test('explains that the restaurant is closed on its rest day', async ({ page }) => {
    await page.goto('/en/reserve');
    await page.getByLabel('Date').fill(nextWeekday(1)); // Monday
    await expect(
      page.getByText('We are closed on that day. Please pick another date.'),
    ).toBeVisible();
  });

  test('only offers times inside the opening hours', async ({ page }) => {
    await page.goto('/en/reserve');
    await page.getByLabel('Date').fill(nextWeekday(3)); // Wednesday
    const options = await page.locator('#time option').allTextContents();
    expect(options).toContain('11:30');
    expect(options).toContain('21:30');
    expect(options).not.toContain('15:00');
  });

  test('sends a valid request and confirms it', async ({ page }) => {
    await page.goto('/en/reserve');
    await page.getByLabel('Name').fill('Anna Rossi');
    await page.getByLabel('Phone').fill('+49 151 1234567');
    await page.getByLabel('Date').fill(nextWeekday(3));
    await page.getByLabel('Time').selectOption('19:00');
    await page.getByLabel('Guests').selectOption('4');
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.getByRole('status')).toContainText('Request sent');
    await expect(page.getByRole('status')).toContainText('4 guests');
  });
});
