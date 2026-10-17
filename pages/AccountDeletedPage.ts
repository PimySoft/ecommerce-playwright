import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { HomePage } from './HomePage';

export class AccountDeletedPage extends BasePage {
  // ========== SELECTORS ==========

  get accountDeletedHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Account Deleted!', exact: true });
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
