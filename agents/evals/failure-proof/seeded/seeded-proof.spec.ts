import { test, expect } from '../../../../tests/fixtures';
import { TestDataFactory } from '../../../../test-data/TestDataFactory';

test.describe('Failure proof seeds', () => {
  test('should show the product price in the cart', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().blueTop;

    const cartPage = await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
      return productsPage.cartModal.viewCart();
    });

    await test.step('Verify the price', async () => {
      await expect(cartPage.cartItemPrice(product.name)).toHaveText(TestDataFactory.formatPrice(product.price));
    });
  });

  test('should show the price of the added product', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().blueTop;

    const cartPage = await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
      return productsPage.cartModal.viewCart();
    });

    await test.step('Verify the price', async () => {
      await expect(cartPage.cartItemPrice(product.name)).toBeVisible();
    });
  });
});
