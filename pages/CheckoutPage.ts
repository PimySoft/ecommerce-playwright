import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { PaymentPage } from './PaymentPage';

export class CheckoutPage extends BasePage {
  // ========== SELECTORS ==========

  get deliveryAddress(): Locator {
    return this.addressBlock('Your delivery address');
  }

  get billingAddress(): Locator {
    return this.addressBlock('Your billing address');
  }

  orderItemRow(productName: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('heading', { name: productName, exact: true }),
    });
  }

  // The cells have no headers association, so they are identified by their column class.
  orderItemPrice(productName: string): Locator {
    return this.orderItemRow(productName).locator('.cart_price');
  }

  orderItemQuantity(productName: string): Locator {
    return this.orderItemRow(productName).locator('.cart_quantity');
  }

  orderItemTotal(productName: string): Locator {
    return this.orderItemRow(productName).locator('.cart_total');
  }

  get totalAmount(): Locator {
    return this.page.getByRole('row')
      .filter({ has: this.page.getByRole('heading', { name: 'Total Amount', exact: true }) })
      .locator('.cart_total_price');
  }

  // The textarea's only label is not associated with it.
  get commentTextarea(): Locator {
    return this.page.locator('#ordermsg').getByRole('textbox');
  }

  get placeOrderLink(): Locator {
    return this.page.getByRole('link', { name: 'Place Order', exact: true });
  }

  // Each address is a list headed by its own list item; the remaining items are the address lines.
  private addressBlock(heading: string): Locator {
    return this.page.getByRole('list')
      .filter({ has: this.page.getByRole('heading', { name: heading, exact: true }) })
      .getByRole('listitem')
      .filter({ hasNot: this.page.getByRole('heading') });
  }

  // ========== ACTIONS ==========

  async placeOrder(comment: string): Promise<PaymentPage> {
    await this.commentTextarea.fill(comment);
    await this.placeOrderLink.click();
    await this.page.waitForURL((url) => url.pathname === '/payment');
    await this.handleCookieConsent();
    return new PaymentPage(this.page);
  }
}
