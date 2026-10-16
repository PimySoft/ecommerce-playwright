import { test, expect } from './fixtures';

test.describe('End-to-End User Workflow', () => {
  test('should complete end-to-end shopping workflow from product selection to cart', async ({ homePage, productsPage, cartPage }) => {
    await test.step('Navigate to products page', async () => {
      await homePage.navigateToProducts();
    });

    await test.step('Add product to cart', async () => {
      await productsPage.addFirstProductToCart();
      await productsPage.continueShopping();
    });

    await test.step('Navigate to cart and verify', async () => {
      await homePage.navigateToCart();
      await expect(cartPage.emptyCartMessage).toBeHidden();
    });
  });
});
