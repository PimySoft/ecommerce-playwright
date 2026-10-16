import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Shopping Cart', () => {
  test('should successfully remove product from cart and update cart display', async ({ productsPage, cartPage }) => {
    const productName = TestDataFactory.getProductNames().menTshirt;

    await test.step('Add product to cart', async () => {
      await productsPage.addProductToCartByName(productName);
      await productsPage.goToCart();
    });

    await test.step('Verify product is in cart', async () => {
      await expect(cartPage.cartItemRow(productName)).toBeVisible();
    });

    await test.step('Remove product from cart', async () => {
      await cartPage.removeProductAndWait(productName);
    });

    await test.step('Verify product is removed', async () => {
      await expect(cartPage.cartItemRow(productName)).toBeHidden();
    });
  });

  test('should display empty cart message and hide checkout button when cart is empty', async ({ cartPage }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.proceedToCheckoutButton).toBeHidden();
  });
});
