import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Products Page', () => {
  test('should display matching products when searching by keyword', async ({ productsPage }) => {
    const searchTerm = TestDataFactory.getSearchTerms().blue;
    await productsPage.searchProduct(searchTerm);

    await expect(productsPage.productCardByName(searchTerm)).toBeVisible();
  });

  test('should add product to cart and show confirmation modal', async ({ productsPage }) => {
    await test.step('Add first product to cart', async () => {
      await productsPage.addFirstProductToCart();
    });

    await test.step('Verify product modal appears', async () => {
      await expect(productsPage.productModal).toBeVisible();
      await expect(productsPage.viewCartButton).toBeVisible();
    });

    await test.step('Continue shopping and verify modal closes', async () => {
      await productsPage.continueShopping();
      await expect(productsPage.productModal).toBeHidden();
    });
  });

  test('should display all products when search query is empty', async ({ productsPage }) => {
    await productsPage.searchProduct('');
    await expect(productsPage.firstProductCard).toBeVisible();
  });

  test('should display no products when search returns no results', async ({ productsPage }) => {
    const searchTerm = TestDataFactory.getSearchTerms().nonexistent;
    await productsPage.searchProduct(searchTerm);

    await expect(productsPage.productCardByName(searchTerm)).toHaveCount(0);
  });
});
