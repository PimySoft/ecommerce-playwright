import { test, expect } from './fixtures';

test.describe('Home Page', () => {
  test('should display all navigation links and page heading', { tag: '@smoke' }, async ({ homePage }) => {
    await expect.soft(homePage.homeLink).toBeVisible();
    await expect.soft(homePage.productsLink).toBeVisible();
    await expect.soft(homePage.cartLink).toBeVisible();
    await expect.soft(homePage.loginLink).toBeVisible();
    await expect(homePage.pageHeading).toBeVisible();
  });
});
