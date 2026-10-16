import { Page, Locator } from '@playwright/test';

type ReadyState = 'load' | 'domcontentloaded';

export class BasePage {
  constructor(protected readonly page: Page) {}

  // ========== SELECTORS ==========

  get consentDialog(): Locator {
    return this.page.locator('.fc-consent-root');
  }

  get cookieConsentAcceptButton(): Locator {
    return this.consentDialog.getByRole('button', { name: 'Consent', exact: true });
  }

  // ========== ACTIONS ==========

  async goto(path: string = '', waitUntil: ReadyState = 'load'): Promise<void> {
    await this.page.goto(path, { waitUntil });
    await this.handleCookieConsent();
  }

  async handleCookieConsent(): Promise<void> {
    if (await this.cookieConsentAcceptButton.count() === 0) {
      return;
    }

    await this.cookieConsentAcceptButton.click();
    await this.consentDialog.waitFor({ state: 'hidden' });
  }

  // The home and product listing pages load dozens of product images that the shared server can take 30s+ to
  // serve, holding back `load`. Page objects only need the DOM, and locators auto-wait for anything rendered later.
  // Use `goto(path, 'domcontentloaded')` for the same reason when opening those pages directly.
  protected async waitForImageHeavyPage(matches: (url: URL) => boolean): Promise<void> {
    await this.page.waitForURL(matches, { waitUntil: 'domcontentloaded' });
  }
}
