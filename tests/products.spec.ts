import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Products Page', () => {
  test('should only display products matching the search term', { tag: '@smoke' }, async ({ productsPage }) => {
    const searchTerm = TestDataFactory.getSearchTerms().blue;

    await test.step('Search by keyword', async () => {
      await productsPage.searchProduct(searchTerm);
      await expect(productsPage.searchedProductsHeading).toBeVisible();
    });

    await test.step('Verify every result contains the search term', async () => {
      await expect(productsPage.productNames).not.toHaveCount(0);
      const resultCount = await productsPage.productNames.count();
      await expect(productsPage.productNames).toHaveText(Array(resultCount).fill(new RegExp(searchTerm, 'i')));
    });
  });

  test('should confirm the product was added when it is added to the cart', { tag: '@smoke' }, async ({ productsPage }) => {
    const product = TestDataFactory.getProducts().menTshirt;

    await test.step('Add product to cart', async () => {
      await productsPage.addProductToCart(product.name);
    });

    await test.step('Verify the confirmation modal', async () => {
      await expect(productsPage.cartModal.title).toBeVisible();
      await expect(productsPage.cartModal.message).toBeVisible();
      await expect(productsPage.cartModal.viewCartLink).toBeVisible();
    });

    await test.step('Continue shopping and verify modal closes', async () => {
      await productsPage.cartModal.continueShopping();
      await expect(productsPage.cartModal.root).toBeHidden();
    });
  });

  test('should display all products when search query is empty', { tag: '@regression' }, async ({ productsPage }) => {
    await expect(productsPage.productCards).not.toHaveCount(0);
    const allProductsCount = await productsPage.productCards.count();

    await productsPage.searchProduct(TestDataFactory.getSearchTerms().empty);

    await expect(productsPage.productCards).toHaveCount(allProductsCount);
  });

  test('should display no products when search returns no results', { tag: '@regression' }, async ({ productsPage }) => {
    const searchTerm = TestDataFactory.getSearchTerms().nonexistent;

    await productsPage.searchProduct(searchTerm);

    await expect(productsPage.searchedProductsHeading).toBeVisible();
    await expect(productsPage.productCards).toHaveCount(0);
  });

  test('should list only the products in the chosen category', { tag: '@regression' }, async ({ productsPage }) => {
    const listing = TestDataFactory.getCategoryListings().womenDress;

    await productsPage.filterByCategory(listing.category, listing.subcategory);

    await expect(productsPage.listingHeading(listing.heading)).toBeVisible();
    await expect(productsPage.productNames).toHaveText(listing.productNames);
  });

  test('should list only the products of the chosen brand', { tag: '@regression' }, async ({ productsPage }) => {
    const listing = TestDataFactory.getBrandListings().polo;

    await productsPage.filterByBrand(listing.brand);

    await expect(productsPage.listingHeading(listing.heading)).toBeVisible();
    await expect(productsPage.productNames).toHaveText(listing.productNames);
  });
});
