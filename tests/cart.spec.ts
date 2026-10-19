import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Shopping Cart', () => {
  test('should show the added product with its price, quantity and total', { tag: '@regression' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().blueTop;
    const price = TestDataFactory.formatPrice(product.price);

    const cartPage = await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
      await expect(productsPage.cartModal.message).toBeVisible();
      return productsPage.cartModal.viewCart();
    });

    await test.step('Verify the line item', async () => {
      await expect(cartPage.cartItemRow(product.name)).toBeVisible();
      await expect(cartPage.cartItemPrice(product.name)).toHaveText(price);
      await expect(cartPage.cartItemQuantity(product.name)).toHaveText('1');
      await expect(cartPage.cartItemTotal(product.name)).toHaveText(price);
    });
  });

  test('should empty the cart when its only product is removed', { tag: '@regression' }, async ({ productsPage }) => {
    const productName = TestDataFactory.getProducts().menTshirt.name;

    const cartPage = await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(productName);
      return productsPage.cartModal.viewCart();
    });

    await test.step('Verify product is in cart', async () => {
      await expect(cartPage.cartItemRow(productName)).toBeVisible();
      await expect(cartPage.proceedToCheckoutButton).toBeVisible();
    });

    await test.step('Remove product from cart', async () => {
      await cartPage.removeProduct(productName);
    });

    await test.step('Verify product is removed and the cart is empty', async () => {
      await expect(cartPage.cartItemRow(productName)).toBeHidden();
      await expect(cartPage.emptyCartMessage).toBeVisible();
    });
  });

  test('should block checkout when the cart is empty', { tag: '@regression' }, async ({ cartPage }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.proceedToCheckoutButton).toBeHidden();
  });

  test('should keep the guest cart after the guest logs in at checkout', { tag: '@regression' }, async ({ productsPage, testUser }) => {
    const product = TestDataFactory.getProducts().blueTop;

    const cartPage = await test.step('Add a product as a guest', async () => {
      await productsPage.addProductToCart(product.name);
      return productsPage.cartModal.viewCart();
    });

    await test.step('Verify checkout asks the guest to register or log in', async () => {
      await cartPage.proceedToCheckoutAsGuest();
      await expect(cartPage.checkoutModalMessage).toBeVisible();
    });

    const homePage = await test.step('Log in from the checkout prompt', async () => {
      const loginPage = await cartPage.goToLoginFromCheckoutModal();
      return loginPage.loginAs(testUser);
    });

    await test.step('Verify the cart still holds the product', async () => {
      const loggedInCartPage = await homePage.navigateToCart();
      await expect(loggedInCartPage.cartItemRow(product.name)).toBeVisible();
      await expect(loggedInCartPage.cartItemQuantity(product.name)).toHaveText('1');
    });
  });
});
