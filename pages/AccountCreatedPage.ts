import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { HomePage } from './HomePage';

export class AccountCreatedPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get accountCreatedHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Account Created!', exact: true });
  }

  get continueLink(): Locator {
    return this.page.getByRole('link', { name: 'Continue', exact: true });
  }

  // ========== ACTIONS ==========

  async continue(): Promise<HomePage> {
    await this.continueLink.click();
    await this.waitForImageHeavyPage((url) => url.pathname === '/');
    await this.handleCookieConsent();
    return new HomePage(this.page);
  }
}
