import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  // ========== SELECTORS ==========

  get pageInstance(): Page {
    return this.page;
  }

  get consentDialog(): Locator {
    return this.page.locator('.fc-consent-root');
  }

  get cookieConsentAcceptButton(): Locator {
    return this.page.getByRole('button', { name: /accept|agree|ok|allow|consent/i });
  }

  // ========== ACTIONS ==========

  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path);
    await this.handleCookieConsent();
  }

  async handleCookieConsent(): Promise<void> {
    const dialogCount = await this.consentDialog.count();
    
    if (dialogCount === 0) {
      return;
    }

    const buttonCount = await this.cookieConsentAcceptButton.count();
    
    if (buttonCount > 0) {
      await this.cookieConsentAcceptButton.first().click();
      await this.consentDialog.waitFor({ state: 'hidden' });
    }
  }
}
