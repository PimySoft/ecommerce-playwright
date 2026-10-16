import { Page, Locator } from '@playwright/test';
import { CartPage } from '../CartPage';

// The "Added!" confirmation shown by every page that has an add-to-cart button.
export class CartModal {
  constructor(private readonly page: Page) {}

  // ========== SELECTORS ==========

  // Bootstrap modal without role="dialog".
  get root(): Locator {
    return this.page.locator('#cartModal');
  }

  get title(): Locator {
    return this.root.getByRole('heading', { name: 'Added!', exact: true });
  }

  get message(): Locator {
    return this.root.getByText('Your product has been added to cart.', { exact: true });
  }

  get continueShoppingButton(): Locator {
    return this.root.getByRole('button', { name: 'Continue Shopping', exact: true });
  }

  get viewCartLink(): Locator {
    return this.root.getByRole('link', { name: 'View Cart', exact: true });
  }

  // ========== ACTIONS ==========

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
    // The fading backdrop intercepts clicks, so the next add-to-cart must wait for it to go.
    await this.root.waitFor({ state: 'hidden' });
  }

  async viewCart(): Promise<CartPage> {
    await this.viewCartLink.click();
    // cart.js binds the remove handlers at end of body; acting before `load` makes clicks no-ops.
    await this.page.waitForURL((url) => url.pathname === '/view_cart');
    return new CartPage(this.page);
  }
}
