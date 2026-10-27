import { Locator, Page } from '@playwright/test';
import { BasePage } from '../../../../pages/BasePage';

export class SeededCartPage extends BasePage {
  readonly emptyCartMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emptyCartMessage = page.getByText('Cart is empty!', { exact: true });
  }

  // ========== SELECTORS ==========

  /** Gets the proceed to checkout button. */
  get proceedToCheckoutButton(): Locator {
    return this.page.getByText(/proceed/i);
  }

  get loginLink(): Locator {
    return this.page.locator('a[href="/login"]');
  }

  cartItemRow(productName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: productName }).or(this.page.locator('tr').filter({ hasText: productName }));
  }

  // ========== ACTIONS ==========

  get removeButtons(): Locator {
    return this.page.locator('.cart_quantity_delete');
  }

  async removeProduct(productName: string) {
    await this.cartItemRow(productName).locator('.cart_quantity_delete').click();
  }

  async dismissConsent(): Promise<void> {
    await this.page.getByRole('button', { name: 'Consent', exact: true }).click().catch(() => {});
  }
}
