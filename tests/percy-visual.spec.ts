import percySnapshot from '@percy/playwright';
import { test, expect } from './fixtures';

test.describe('Percy Visual Regression Tests', () => {
  test.skip(!process.env.PERCY_TOKEN, 'Requires PERCY_TOKEN; run with npm run test:percy');

  test('should capture home page with Percy', { tag: ['@regression', '@visual'] }, async ({ page, homePage }) => {
    await expect(homePage.pageHeading).toBeVisible();

    await test.step('Take Percy snapshot of home page', async () => {
      await percySnapshot(page, 'Homepage', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture products page with Percy', { tag: ['@regression', '@visual'] }, async ({ page, productsPage }) => {
    await expect(productsPage.allProductsHeading).toBeVisible();

    await test.step('Take Percy snapshot of products page', async () => {
      await percySnapshot(page, 'Products Page', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture login page with Percy', { tag: ['@regression', '@visual'] }, async ({ page, loginPage }) => {
    await expect(loginPage.loginHeading).toBeVisible();

    await test.step('Take Percy snapshot of login page', async () => {
      await percySnapshot(page, 'Login Page', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture contact page with Percy', { tag: ['@regression', '@visual'] }, async ({ page, contactPage }) => {
    await expect(contactPage.contactHeading).toBeVisible();

    await test.step('Take Percy snapshot of contact page', async () => {
      await percySnapshot(page, 'Contact Page', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture cart page with Percy', { tag: ['@regression', '@visual'] }, async ({ page, cartPage }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();

    await test.step('Take Percy snapshot of cart page', async () => {
      await percySnapshot(page, 'Cart Page', {
        widths: [1280, 375],
      });
    });
  });
});

