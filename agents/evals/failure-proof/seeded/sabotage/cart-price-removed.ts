import type { Page } from '@playwright/test';

// A weak sabotage for the same fails-if line: it deletes the price cell, so the assertion fails on a missing element
// rather than a wrong price.
export async function sabotage(page: Page): Promise<void> {
  await page.route('**/view_cart', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<td class="cart_price">[\s\S]*?<\/td>/, '');
    await route.fulfill({ response, body });
  });
}
