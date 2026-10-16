import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get searchInput(): Locator {
    return this.page.getByPlaceholder(/search product/i);
  }

  get firstProductCard(): Locator {
    return this.page.getByRole('article').or(this.page.locator('.product-image-wrapper')).first();
  }

  get addToCartButtons(): Locator {
    return this.page.getByRole('button', { name: /add to cart/i })
      .or(this.page.locator('a, button, [role="button"]').filter({ hasText: /add to cart/i }));
  }

  get productModal(): Locator {
    return this.page.getByRole('dialog').or(this.page.locator('#cartModal'));
  }

  get continueShoppingButton(): Locator {
    return this.page.getByRole('button', { name: /continue shopping/i });
  }

  get viewCartButton(): Locator {
    return this.page.getByRole('link', { name: /view cart/i });
  }

  productCardByName(productName: string): Locator {
    // Filter on the card's full text: the site's ad script rewrites words in product titles into links,
    // which breaks a nested getByText match.
    return this.page.locator('.product-image-wrapper')
      .filter({ hasText: new RegExp(productName, 'i') })
      .first();
  }

  addToCartButtonForProduct(productName: string): Locator {
    const productCard = this.productCardByName(productName);
    return productCard.getByRole('button', { name: /add to cart/i })
      .or(productCard.getByRole('link', { name: /add to cart/i }))
      .or(productCard.locator('a, button, [role="button"]').filter({ hasText: /add to cart/i }))
      .first();
  }

  // ========== ACTIONS ==========

  async searchProduct(productName: string): Promise<void> {
    await this.searchInput.fill(productName);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
    await this.handleCookieConsent();
  }

  async addFirstProductToCart(): Promise<void> {
    await this.handleCookieConsent();
    await this.firstProductCard.waitFor({ state: 'visible' });
    await this.firstProductCard.hover();
    await this.addToCartButtons.first().click();
  }

  async addProductToCartByName(productName: string): Promise<void> {
    await this.goto('/products');
    const productCard = this.productCardByName(productName);
    await productCard.hover();
    const addButton = this.addToCartButtonForProduct(productName);
    await addButton.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  async goToCart(): Promise<void> {
    await this.viewCartButton.click();
    // cart.js binds the remove handlers at end of body; acting before `load` makes clicks no-ops.
    await this.page.waitForURL((url) => url.pathname === '/view_cart');
  }
}
