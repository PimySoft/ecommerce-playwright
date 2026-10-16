import { test as base, Page, Locator } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { CartPage } from '../pages/CartPage';
import { LoginPage } from '../pages/LoginPage';
import { ContactPage } from '../pages/ContactPage';

type TestFixtures = {
  homePage: HomePage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  loginPage: LoginPage;
  contactPage: ContactPage;
};

const AD_NETWORK_URLS = /googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google\.|adtrafficquality\.google/;

// ========== SELECTORS ==========

function getGoogleSurveyPopup(page: Page): Locator {
  return page.locator('[role="dialog"]').filter({ hasText: /answer questions to support/i });
}

function getGoogleSurveyCloseButton(page: Page): Locator {
  return page.getByRole('button', { name: /close/i })
    .or(page.locator('button[aria-label*="close" i]'))
    .or(page.locator('button[aria-label*="Close" i]'));
}

function getGoogleSurveyDoneButton(page: Page): Locator {
  return page.getByRole('button', { name: /done/i });
}

// ========== ACTIONS ==========

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use) => {
    // Third-party ads inject full-screen interstitials and delay the load event; they are not under test.
    await page.route(AD_NETWORK_URLS, (route) => route.abort());

    // Set localStorage before navigation to bypass popup
    // This is more reliable than clicking the popup after pge loads
    await page.addInitScript(() => {
      // Set consent in localStorage before page loads
      window.localStorage.setItem('fc_cookie_consent', 'accepted');
      window.localStorage.setItem('fc_cookieconsent', 'true');
      // Also try common cookie consent library storage keys
      window.localStorage.setItem('cookieconsent_status', 'allow');
    });

    // Register handler for Google survey popup - automatically dismisses when it appears
    await page.addLocatorHandler(
      getGoogleSurveyPopup(page),
      async () => {
        const popup = getGoogleSurveyPopup(page);
        const closeButton = getGoogleSurveyCloseButton(page);
        const closeCount = await closeButton.count();
        if (closeCount > 0) {
          await closeButton.first().click();
          await popup.waitFor({ state: 'hidden' });
          return;
        }

        const doneButton = getGoogleSurveyDoneButton(page);
        const doneCount = await doneButton.count();
        if (doneCount > 0) {
          await doneButton.first().click();
          await popup.waitFor({ state: 'hidden' });
        }
      }
    );
    
    await use(page);
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.goto('/');
    await use(homePage);
  },

  productsPage: async ({ page }, use) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto('/products');
    await use(productsPage);
  },

  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await cartPage.goto('/view_cart');
    await use(cartPage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/login');
    await use(loginPage);
  },

  contactPage: async ({ page }, use) => {
    const contactPage = new ContactPage(page);
    await contactPage.goto('/contact_us');
    await use(contactPage);
  },
});

export { expect } from '@playwright/test';

