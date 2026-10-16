import { test, expect } from './fixtures';

// Regions are chosen because they only change when the site's design does: no products, prices or user data.
test.describe('Visual Regression', () => {
  test.skip(!process.env.PLAYWRIGHT_DOCKER, 'Baselines are rendered in the Playwright Linux image; run npm run test:visual');

  test('should match the header baseline', { tag: ['@regression', '@visual'] }, async ({ homePage }) => {
    await expect(homePage.header).toHaveScreenshot('header.png');
  });

  test('should match the footer baseline', { tag: ['@regression', '@visual'] }, async ({ homePage }) => {
    // Scrolling the footer into view fades in the floating scroll-up button, which overlaps it.
    await expect(homePage.footer).toHaveScreenshot('footer.png', { mask: [homePage.scrollUpButton] });
  });

  test('should match the empty cart baseline', { tag: ['@regression', '@visual'] }, async ({ cartPage }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.cartSection).toHaveScreenshot('empty-cart.png');
  });

  test('should match the category sidebar baseline', { tag: ['@regression', '@visual'] }, async ({ productsPage }) => {
    await expect(productsPage.categorySidebar).toHaveScreenshot('category-sidebar.png');
  });
});
