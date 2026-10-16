import { Page, Locator } from '@playwright/test';
import { readFile } from 'fs/promises';
import { BasePage } from './BasePage';

export interface Invoice {
  fileName: string;
  content: string;
}

export class OrderConfirmationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get orderPlacedHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Order Placed!', exact: true });
  }

  get confirmationMessage(): Locator {
    return this.page.getByText('Congratulations! Your order has been confirmed!', { exact: true });
  }

  get downloadInvoiceLink(): Locator {
    return this.page.getByRole('link', { name: 'Download Invoice', exact: true });
  }

  // ========== ACTIONS ==========

  async downloadInvoice(): Promise<Invoice> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadInvoiceLink.click();
    const download = await downloadPromise;
    return {
      fileName: download.suggestedFilename(),
      content: await readFile(await download.path(), 'utf8'),
    };
  }
}
