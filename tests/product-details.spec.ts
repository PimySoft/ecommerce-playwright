import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Product Details', () => {
  test('should show the name, category, price, availability, condition and brand', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().blueTop;

    const detailsPage = await productsPage.viewProduct(product.name);

    await expect(detailsPage.productName).toHaveText(product.name);
    await expect(detailsPage.category).toHaveText(`Category: ${product.category}`);
    await expect(detailsPage.price).toHaveText(TestDataFactory.formatPrice(product.price));
    await expect(detailsPage.availability).toHaveText(`Availability: ${product.availability}`);
    await expect(detailsPage.condition).toHaveText(`Condition: ${product.condition}`);
    await expect(detailsPage.brand).toHaveText(`Brand: ${product.brand}`);
  });

  test('should add the chosen quantity to the cart', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().menTshirt;
    const quantity = TestDataFactory.createQuantity();

    const detailsPage = await test.step('Open the product details', async () => {
      return productsPage.viewProduct(product.name);
    });

    await test.step('Add the product with a custom quantity', async () => {
      await detailsPage.addToCart(quantity);
      await expect(detailsPage.cartModal.message).toBeVisible();
    });

    await test.step('Verify the cart line uses that quantity', async () => {
      const cartPage = await detailsPage.cartModal.viewCart();
      await expect(cartPage.cartItemQuantity(product.name)).toHaveText(String(quantity));
      await expect(cartPage.cartItemTotal(product.name)).toHaveText(TestDataFactory.formatPrice(product.price * quantity));
    });
  });
});
