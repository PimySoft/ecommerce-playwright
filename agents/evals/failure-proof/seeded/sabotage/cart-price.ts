import type { Page } from '@playwright/test';

// Fails if the cart doesn't show the product's price: the cart page reports Blue Top at Rs. 499 instead of Rs. 500.
export async function sabotage(page: Page): Promise<void> {
  await page.route('**/view_cart', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/(class="cart_price">\s*<p>)Rs\. 500(<\/p>)/, '$1Rs. 499$2');
    await route.fulfill({ response, body });
  });
}
