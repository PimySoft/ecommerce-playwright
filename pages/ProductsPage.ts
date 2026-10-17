import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ProductDetailsPage } from './ProductDetailsPage';
import { CartModal } from './components/CartModal';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactText(text: string): RegExp {
  return new RegExp(`^${escapeRegExp(text)}$`);
}

// Covers /products and the category and brand listings, which share its layout.
export class ProductsPage extends BasePage {
  // ========== SELECTORS ==========

  get searchInput(): Locator {
    return this.page.getByPlaceholder('Search Product', { exact: true });
  }

  // Icon-only button with no accessible name.
  get searchButton(): Locator {
    return this.page.locator('#submit_search');
  }

  get allProductsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'All Products', exact: true });
  }

  get searchedProductsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Searched Products', exact: true });
  }

  listingHeading(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true });
  }

  get productCards(): Locator {
    return this.page.locator('.features_items .product-image-wrapper');
  }

  get productNames(): Locator {
    return this.productCards.locator('.productinfo p');
  }

  get cartModal(): CartModal {
    return new CartModal(this.page);
  }

  // The accordion has no landmark or name of its own.
  get categorySidebar(): Locator {
    return this.page.locator('#accordian');
  }

  // Toggle names start with an icon glyph, and "Men" is a substring of "Women", so match the whole word at the end.
  categoryToggle(category: string): Locator {
    return this.categorySidebar.getByRole('link', { name: new RegExp(`\\b${escapeRegExp(category)}$`) });
  }

  // Each collapsible panel's id is its category name; "Dress" exists under both Women and Kids.
  subcategoryLink(category: string, subcategory: string): Locator {
    return this.categorySidebar.locator(`#${category}`).getByRole('link', { name: subcategory, exact: true });
  }

  // Brand links are named "(<count>) <brand>".
  brandLink(brand: string): Locator {
    return this.page.locator('.brands-name').getByRole('link', { name: new RegExp(`^\\(\\d+\\) ${escapeRegExp(brand)}$`) });
  }

  productCardByName(productName: string): Locator {
    // Match the name paragraph's full text rather than a nested getByText: the site's ad script
    // can rewrite words in product titles into links.
    return this.productCards.filter({
      has: this.page.locator('.productinfo p').filter({ hasText: exactText(productName) }),
    });
  }

  productPrice(productName: string): Locator {
    return this.productCardByName(productName).locator('.productinfo').getByRole('heading', { level: 2 });
  }

  // "Add to cart" is an <a> without href, so it has no link role. Each card also repeats it in a
  // hover overlay; the .productinfo copy is the one always in the layout.
  addToCartButton(productName: string): Locator {
    return this.productCardByName(productName).locator('.productinfo').getByText('Add to cart', { exact: true });
  }

  // The icon glyph is part of the name, so it is matched as a substring.
  viewProductLink(productName: string): Locator {
    return this.productCardByName(productName).getByRole('link', { name: 'View Product' });
  }

  // ========== ACTIONS ==========

  async searchProduct(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
    await this.waitForImageHeavyPage((url) => url.searchParams.has('search'));
    await this.handleCookieConsent();
  }

  async addProductToCart(productName: string): Promise<void> {
    await this.productCardByName(productName).hover();
    await this.addToCartButton(productName).click();
    await this.cartModal.root.waitFor({ state: 'visible' });
  }

  async viewProduct(productName: string): Promise<ProductDetailsPage> {
    await this.viewProductLink(productName).click();
    await this.page.waitForURL((url) => url.pathname.startsWith('/product_details/'));
    await this.handleCookieConsent();
    return new ProductDetailsPage(this.page);
  }

  async filterByCategory(category: string, subcategory: string): Promise<void> {
    await this.categoryToggle(category).click();
    await this.subcategoryLink(category, subcategory).click();
    await this.waitForImageHeavyPage((url) => url.pathname.startsWith('/category_products/'));
    await this.handleCookieConsent();
  }

  async filterByBrand(brand: string): Promise<void> {
    await this.brandLink(brand).click();
    await this.waitForImageHeavyPage((url) => url.pathname.startsWith('/brand_products/'));
    await this.handleCookieConsent();
  }
}
