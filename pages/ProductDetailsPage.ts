import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { CartModal } from './components/CartModal';

export class ProductDetailsPage extends BasePage {
  // ========== SELECTORS ==========

  // The details panel has no landmark or heading that contains all of its fields.
  get productInformation(): Locator {
    return this.page.locator('.product-information');
  }

  get productName(): Locator {
    return this.productInformation.getByRole('heading', { level: 2 });
  }

  get category(): Locator {
    return this.detailParagraph('Category');
  }

  get price(): Locator {
    return this.productInformation.getByText(/^Rs\. \d+$/);
  }

  get availability(): Locator {
    return this.detailParagraph('Availability');
  }

  get condition(): Locator {
    return this.detailParagraph('Condition');
  }

  get brand(): Locator {
    return this.detailParagraph('Brand');
  }

  get quantityInput(): Locator {
    return this.productInformation.getByRole('spinbutton');
  }

  // The cart icon glyph is part of the name, so it is matched as a substring.
  get addToCartButton(): Locator {
    return this.productInformation.getByRole('button', { name: 'Add to cart' });
  }

  get cartModal(): CartModal {
    return new CartModal(this.page);
  }

  // Each detail is a paragraph whose label is in a nested <b>, so getByText alone would match only the label.
  private detailParagraph(label: string): Locator {
    return this.productInformation.getByRole('paragraph').filter({ hasText: new RegExp(`^${label}:`) });
  }

  // ========== ACTIONS ==========

  async addToCart(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
    await this.addToCartButton.click();
    await this.cartModal.root.waitFor({ state: 'visible' });
  }
}
