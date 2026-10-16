import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('End-to-End User Workflow', () => {
  test('should show the chosen product with its price, quantity and total in the cart', { tag: '@regression' }, async ({ homePage }) => {
    const product = TestDataFactory.getProducts().blueTop;
    const price = TestDataFactory.formatPrice(product.price);

    const productsPage = await test.step('Navigate from home to products page', async () => {
      const page = await homePage.navigateToProducts();
      await expect(page.allProductsHeading).toBeVisible();
      return page;
    });

    await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
      await expect(productsPage.cartModal.message).toBeVisible();
    });

    const cartPage = await test.step('Open the cart', async () => {
      return productsPage.cartModal.viewCart();
    });

    await test.step('Verify the line item', async () => {
      await expect(cartPage.cartItemRow(product.name)).toBeVisible();
      await expect(cartPage.cartItemPrice(product.name)).toHaveText(price);
      await expect(cartPage.cartItemQuantity(product.name)).toHaveText('1');
      await expect(cartPage.cartItemTotal(product.name)).toHaveText(price);
    });
  });
});
