import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { CheckoutPage } from './CheckoutPage';
import { LoginPage } from './LoginPage';

export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  // An unnamed <section>, so it has no region role.
  get cartSection(): Locator {
    return this.page.locator('#cart_items');
  }

  // An <a> without href, so it has no link role.
  get proceedToCheckoutButton(): Locator {
    return this.page.getByText('Proceed To Checkout', { exact: true });
  }

  get emptyCartMessage(): Locator {
    return this.page.getByText('Cart is empty!', { exact: true });
  }

  cartItemRow(productName: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('heading', { name: productName, exact: true }),
    });
  }

  // The cells have no headers association, so they are identified by their column class.
  cartItemPrice(productName: string): Locator {
    return this.cartItemRow(productName).locator('.cart_price');
  }

  cartItemQuantity(productName: string): Locator {
    return this.cartItemRow(productName).locator('.cart_quantity');
  }

  cartItemTotal(productName: string): Locator {
    return this.cartItemRow(productName).locator('.cart_total');
  }

  // Icon-only <a> with no href, text or label.
  removeButton(productName: string): Locator {
    return this.cartItemRow(productName).locator('.cart_quantity_delete');
  }

  // Shown instead of the checkout page when a guest proceeds. Bootstrap modal without role="dialog".
  get checkoutModal(): Locator {
    return this.page.locator('#checkoutModal');
  }

  get checkoutModalMessage(): Locator {
    return this.checkoutModal.getByText('Register / Login account to proceed on checkout.', { exact: true });
  }

  get checkoutModalLoginLink(): Locator {
    return this.checkoutModal.getByRole('link', { name: 'Register / Login', exact: true });
  }

  // ========== ACTIONS ==========

  async removeProduct(productName: string): Promise<void> {
    await this.removeButton(productName).click();
    await this.cartItemRow(productName).waitFor({ state: 'hidden' });
  }

  async proceedToCheckout(): Promise<CheckoutPage> {
    await this.proceedToCheckoutButton.click();
    await this.page.waitForURL((url) => url.pathname === '/checkout');
    await this.handleCookieConsent();
    return new CheckoutPage(this.page);
  }

  async proceedToCheckoutAsGuest(): Promise<void> {
    await this.proceedToCheckoutButton.click();
    await this.checkoutModal.waitFor({ state: 'visible' });
  }

  async goToLoginFromCheckoutModal(): Promise<LoginPage> {
    await this.checkoutModalLoginLink.click();
    await this.page.waitForURL((url) => url.pathname === '/login');
    await this.handleCookieConsent();
    return new LoginPage(this.page);
  }
}
