import percySnapshot from '@percy/playwright';
import { test } from './fixtures';

test.describe('Percy Visual Regression Tests', () => {
  test.skip(!process.env.PERCY_TOKEN, 'Requires PERCY_TOKEN; run with npm run test:percy');

  test('should capture home page with Percy', async ({ homePage }) => {
    await test.step('Take Percy snapshot of home page', async () => {
      await percySnapshot(homePage.pageInstance, 'Homepage', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture products page with Percy', async ({ productsPage }) => {
    await test.step('Take Percy snapshot of products page', async () => {
      await percySnapshot(productsPage.pageInstance, 'Products Page', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture login page with Percy', async ({ loginPage }) => {
    await test.step('Take Percy snapshot of login page', async () => {
      await percySnapshot(loginPage.pageInstance, 'Login Page', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture contact page with Percy', async ({ contactPage }) => {
    await test.step('Take Percy snapshot of contact page', async () => {
      await percySnapshot(contactPage.pageInstance, 'Contact Page', {
        widths: [1280, 375],
      });
    });
  });

  test('should capture cart page with Percy', async ({ cartPage }) => {
    await test.step('Take Percy snapshot of cart page', async () => {
      await percySnapshot(cartPage.pageInstance, 'Cart Page', {
        widths: [1280, 375],
      });
    });
  });
});

