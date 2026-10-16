import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { OrderConfirmationPage } from './OrderConfirmationPage';
import { PaymentCard } from '../test-data/TestDataFactory';

export class PaymentPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get paymentHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Payment', exact: true });
  }

  // The card fields' labels are not associated with them, so they are located by the site's test hooks.
  get nameOnCardInput(): Locator {
    return this.page.getByTestId('name-on-card');
  }

  get cardNumberInput(): Locator {
    return this.page.getByTestId('card-number');
  }

  get cvcInput(): Locator {
    return this.page.getByTestId('cvc');
  }

  get expiryMonthInput(): Locator {
    return this.page.getByTestId('expiry-month');
  }

  get expiryYearInput(): Locator {
    return this.page.getByTestId('expiry-year');
  }

  get payButton(): Locator {
    return this.page.getByRole('button', { name: 'Pay and Confirm Order', exact: true });
  }

  // ========== ACTIONS ==========

  async pay(card: PaymentCard): Promise<OrderConfirmationPage> {
    await this.nameOnCardInput.fill(card.nameOnCard);
    await this.cardNumberInput.fill(card.number);
    await this.cvcInput.fill(card.cvc);
    await this.expiryMonthInput.fill(card.expiryMonth);
    await this.expiryYearInput.fill(card.expiryYear);
    await this.payButton.click();
    await this.page.waitForURL((url) => url.pathname.startsWith('/payment_done/'));
    await this.handleCookieConsent();
    return new OrderConfirmationPage(this.page);
  }
}
