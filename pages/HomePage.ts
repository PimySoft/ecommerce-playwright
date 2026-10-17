import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ProductsPage } from './ProductsPage';
import { CartPage } from './CartPage';
import { LoginPage } from './LoginPage';
import { AccountDeletedPage } from './AccountDeletedPage';

export class HomePage extends BasePage {
  // ========== SELECTORS ==========

  get header(): Locator {
    return this.page.getByRole('banner');
  }

  // The icon-font glyph in each nav link is part of its accessible name, so these match
  // by (case-insensitive substring) name, kept unambiguous by scoping to the header.
  get homeLink(): Locator {
    return this.header.getByRole('link', { name: 'Home' });
  }

  get productsLink(): Locator {
    return this.header.getByRole('link', { name: 'Products' });
  }

  get cartLink(): Locator {
    return this.header.getByRole('link', { name: 'Cart' });
  }

  get loginLink(): Locator {
    return this.header.getByRole('link', { name: 'Signup / Login' });
  }

  get logoutLink(): Locator {
    return this.header.getByRole('link', { name: 'Logout' });
  }

  get deleteAccountLink(): Locator {
    return this.header.getByRole('link', { name: 'Delete Account' });
  }

  // Rendered as an <a> without href, so it has no link role.
  loggedInAsText(name: string): Locator {
    return this.header.getByText(`Logged in as ${name}`, { exact: true });
  }

  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: 'AutomationExercise', exact: true });
  }

  get footer(): Locator {
    return this.page.getByRole('contentinfo');
  }

  get subscriptionEmailInput(): Locator {
    return this.footer.getByRole('textbox', { name: 'Your email address', exact: true });
  }

  // Icon-only button with no accessible name.
  get subscribeButton(): Locator {
    return this.footer.locator('#subscribe');
  }

  get subscriptionSuccessMessage(): Locator {
    return this.footer.getByText('You have been successfully subscribed!', { exact: true });
  }

  // Icon-only <a> with no text or label, fixed to the viewport and faded in by script on scroll.
  get scrollUpButton(): Locator {
    return this.page.locator('#scrollUp');
  }

  // ========== ACTIONS ==========

  async navigateToProducts(): Promise<ProductsPage> {
    await this.productsLink.click();
    await this.waitForImageHeavyPage((url) => url.pathname === '/products');
    await this.handleCookieConsent();
    return new ProductsPage(this.page);
  }

  async navigateToCart(): Promise<CartPage> {
    await this.cartLink.click();
    await this.page.waitForURL((url) => url.pathname === '/view_cart');
    await this.handleCookieConsent();
    return new CartPage(this.page);
  }

  async logout(): Promise<LoginPage> {
    await this.logoutLink.click();
    await this.page.waitForURL((url) => url.pathname === '/login');
    await this.handleCookieConsent();
    return new LoginPage(this.page);
  }

  async deleteAccount(): Promise<AccountDeletedPage> {
    await this.deleteAccountLink.click();
    await this.page.waitForURL((url) => url.pathname === '/delete_account');
    await this.handleCookieConsent();
    return new AccountDeletedPage(this.page);
  }

  async subscribe(email: string): Promise<void> {
    await this.subscriptionEmailInput.fill(email);
    await this.subscribeButton.click();
  }
}
