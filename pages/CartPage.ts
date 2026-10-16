import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get cartHeading(): Locator {
    return this.page.getByText(/shopping cart/i);
  }

  get proceedToCheckoutButton(): Locator {
    return this.page.getByRole('link', { name: /proceed to checkout/i });
  }

  get emptyCartMessage(): Locator {
    return this.page.getByText(/cart is empty/i);
  }

  cartItemRow(productName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: new RegExp(productName, 'i') }).first();
  }

  removeButton(productName: string): Locator {
    const row = this.cartItemRow(productName);
    return row.getByRole('link', { name: /remove|delete/i })
      .or(row.getByRole('button', { name: /remove|delete/i }))
      .or(row.locator('a.cart_quantity_delete, button.cart_quantity_delete, a[class*="delete"], button[class*="delete"]'))
      .first();
  }

  // ========== ACTIONS ==========

  async removeProduct(productName: string): Promise<void> {
    await this.removeButton(productName).click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
  }

  async removeProductAndWait(productName: string): Promise<void> {
    await this.removeProduct(productName);
    await expect(this.cartItemRow(productName)).toBeHidden();
  }
}

