import { test, expect } from '../../../../tests/fixtures';
import { TestDataFactory } from '../../../../test-data/TestDataFactory';
import { CartPage } from '../../../../pages/CartPage';

test.describe('Shopping Cart', () => {
  test('cart test', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().blueTop;

    await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
    });

    await expect(productsPage.cartModal.message).toBeVisible();
  });

  test('should show the product price in the cart', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().blueTop;

    await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
    });

    const cartPage = await test.step('Open the cart', async () => productsPage.cartModal.viewCart());

    await test.step('Verify the price', async () => {
      await expect(cartPage.cartItemPrice(product.name)).toBeVisible();
    });
  });

  test('should empty the cart when a product is added and removed', { tag: '@regression' }, async ({ productsPage }) => {
    const productName = TestDataFactory.getProducts().menTshirt.name;
    await productsPage.addProductToCart(productName);
    const cartPage = await productsPage.cartModal.viewCart();
    await expect(cartPage.cartItemRow(productName)).toBeVisible();
    await cartPage.removeProduct(productName);
    await expect(cartPage.emptyCartMessage).toBeVisible();
  });

  test('should open the cart from the products page', { tag: '@regression' }, async ({ productsPage, cartPage }) => {
    await productsPage.addProductToCart(TestDataFactory.getProducts().blueTop.name);

    await expect(cartPage.cartSection).toBeVisible();
  });

  test('should show the cart section on the cart page', { tag: '@regression' }, async ({ homePage, page }) => {
    await homePage.navigateToCart();
    const cartPage = new CartPage(page);

    await expect(cartPage.cartSection).toBeVisible({ timeout: 15_000 });
  });

  test('should not offer checkout for an empty cart', { tag: '@regression' }, async ({ cartPage }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.proceedToCheckoutButton).toBeHidden();
  });

  test('should confirm a newsletter subscription from the cart page', { tag: ['@smoke', '@regression'] }, async ({ homePage }) => {
    await homePage.subscribe('jane.doe@example.com');

    await expect(homePage.subscriptionSuccessMessage).toBeVisible();
  });
});
