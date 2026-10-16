import { test, expect } from './fixtures';
import { TestDataFactory, User } from '../test-data/TestDataFactory';

// The checkout page prints the account address in this order and format.
function addressLines({ title, address }: User): string[] {
  return [
    `${title}. ${address.firstName} ${address.lastName}`,
    address.company,
    address.address1,
    address.address2,
    `${address.city} ${address.state} ${address.zipcode}`,
    address.country,
    address.mobileNumber,
  ];
}

test.describe('Checkout', () => {
  test('should place an order for several products and confirm it', { tag: '@smoke' }, async ({ loginPage, testUser }) => {
    const { blueTop, menTshirt } = TestDataFactory.getProducts();
    const products = [blueTop, menTshirt];
    const orderTotal = products.reduce((sum, product) => sum + product.price, 0);

    const homePage = await test.step('Log in', async () => {
      return loginPage.loginAs(testUser);
    });

    const cartPage = await test.step('Add several products to the cart', async () => {
      const productsPage = await homePage.navigateToProducts();
      await productsPage.addProductToCart(blueTop.name);
      await productsPage.cartModal.continueShopping();
      await productsPage.addProductToCart(menTshirt.name);
      return productsPage.cartModal.viewCart();
    });

    const checkoutPage = await test.step('Proceed to checkout', async () => {
      return cartPage.proceedToCheckout();
    });

    await test.step('Verify the delivery and billing addresses', async () => {
      await expect(checkoutPage.deliveryAddress).toHaveText(addressLines(testUser));
      await expect(checkoutPage.billingAddress).toHaveText(addressLines(testUser));
    });

    await test.step('Verify the order review', async () => {
      for (const product of products) {
        await expect(checkoutPage.orderItemPrice(product.name)).toHaveText(TestDataFactory.formatPrice(product.price));
        await expect(checkoutPage.orderItemQuantity(product.name)).toHaveText('1');
        await expect(checkoutPage.orderItemTotal(product.name)).toHaveText(TestDataFactory.formatPrice(product.price));
      }
      await expect(checkoutPage.totalAmount).toHaveText(TestDataFactory.formatPrice(orderTotal));
    });

    const confirmationPage = await test.step('Place the order and pay', async () => {
      const paymentPage = await checkoutPage.placeOrder(TestDataFactory.createOrderComment());
      return paymentPage.pay(TestDataFactory.createPaymentCard());
    });

    await test.step('Verify the order confirmation', async () => {
      await expect(confirmationPage.orderPlacedHeading).toBeVisible();
      await expect(confirmationPage.confirmationMessage).toBeVisible();
    });
  });

  test('should download an invoice naming the buyer and the order total', { tag: '@regression' }, async ({ loginPage, testUser }) => {
    const product = TestDataFactory.getProducts().blueTop;

    const confirmationPage = await test.step('Place an order', async () => {
      const homePage = await loginPage.loginAs(testUser);
      const productsPage = await homePage.navigateToProducts();
      await productsPage.addProductToCart(product.name);
      const cartPage = await productsPage.cartModal.viewCart();
      const checkoutPage = await cartPage.proceedToCheckout();
      const paymentPage = await checkoutPage.placeOrder(TestDataFactory.createOrderComment());
      return paymentPage.pay(TestDataFactory.createPaymentCard());
    });

    const invoice = await test.step('Download the invoice', async () => {
      return confirmationPage.downloadInvoice();
    });

    await test.step('Verify the invoice file', async () => {
      const { firstName, lastName } = testUser.address;
      expect(invoice.fileName).toBe('invoice.txt');
      expect(invoice.content).toBe(`Hi ${firstName} ${lastName}, Your total purchase amount is ${product.price}. Thank you`);
    });
  });
});
