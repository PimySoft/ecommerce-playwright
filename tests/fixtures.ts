import { test as base, expect, BrowserContext, Page, Locator } from '@playwright/test';
import { AccountApiClient } from '../api/AccountApiClient';
import { AccessibilityScanner } from '../accessibility/AccessibilityScanner';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { CartPage } from '../pages/CartPage';
import { LoginPage } from '../pages/LoginPage';
import { ContactPage } from '../pages/ContactPage';
import { TestDataFactory, User } from '../test-data/TestDataFactory';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

type TestFixtures = {
  homePage: HomePage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  loginPage: LoginPage;
  contactPage: ContactPage;
  accountApi: AccountApiClient;
  accessibilityScanner: AccessibilityScanner;
  testUser: User;
  newUser: User;
  requireTierTag: void;
};

type SessionWorkerFixtures = {
  sessionUser: User;
  sessionState: StorageState;
};

// Every test belongs to exactly one pipeline tier, so `--grep @smoke` and `--grep @regression` partition the suite.
const TIER_TAGS = ['@smoke', '@regression'];

const AD_NETWORK_URLS = /googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google\.|adtrafficquality\.google/;

// ========== SELECTORS ==========

function getGoogleSurveyDialog(page: Page): Locator {
  return page.getByRole('dialog').filter({ hasText: 'Answer questions to support' });
}

// ========== ACTIONS ==========

async function preparePage(page: Page): Promise<void> {
  // Third-party ads inject full-screen interstitials and delay the load event; they are not under test.
  await page.route(AD_NETWORK_URLS, (route) => route.abort());

  // Seeding consent before any script runs keeps the consent banner from covering the page.
  await page.addInitScript(() => {
    window.localStorage.setItem('fc_cookie_consent', 'accepted');
    window.localStorage.setItem('fc_cookieconsent', 'true');
    window.localStorage.setItem('cookieconsent_status', 'allow');
  });

  // The survey can appear at any point in a test, so it is dismissed whenever an action is blocked by it.
  await page.addLocatorHandler(getGoogleSurveyDialog(page), async (dialog) => {
    await dialog.getByRole('button', { name: 'Close' }).click();
  });
}

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use) => {
    await preparePage(page);
    await use(page);
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.goto('/', 'domcontentloaded');
    await use(homePage);
  },

  productsPage: async ({ page }, use) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto('/products', 'domcontentloaded');
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

  accountApi: async ({ request }, use) => {
    await use(new AccountApiClient(request));
  },

  accessibilityScanner: async ({ page }, use) => {
    await use(new AccessibilityScanner(page));
  },

  // Code after use() runs even when the test fails, so the account never outlives the test.
  testUser: async ({ accountApi }, use) => {
    const user = TestDataFactory.createUser();
    await accountApi.createAccount(user);
    await use(user);
    await accountApi.deleteAccount(user);
  },

  // For tests that register through the UI. The account may never be created, or the test may delete it
  // itself, so cleanup only runs if it still exists.
  newUser: async ({ accountApi }, use) => {
    const user = TestDataFactory.createUser();
    await use(user);
    if (await accountApi.accountExists(user)) {
      await accountApi.deleteAccount(user);
    }
  },

  requireTierTag: [async ({}, use, testInfo) => {
    const tiers = testInfo.tags.filter((tag) => TIER_TAGS.includes(tag));
    if (tiers.length !== 1) {
      throw new Error(`"${testInfo.title}" must have exactly one of ${TIER_TAGS.join(', ')}, found [${tiers.join(', ')}]`);
    }
    await use();
  }, { auto: true }],
});

// Each worker logs in through the UI once and its tests reuse the session. The account is per worker,
// not per run, because the cart belongs to the account and parallel workers would otherwise share it.
export const authenticatedTest = test.extend<object, SessionWorkerFixtures>({
  sessionUser: [async ({ playwright }, use, workerInfo) => {
    const request = await playwright.request.newContext({ baseURL: workerInfo.project.use.baseURL });
    const accountApi = new AccountApiClient(request);
    const user = TestDataFactory.createUser();
    await accountApi.createAccount(user);
    await use(user);
    await accountApi.deleteAccount(user);
    await request.dispose();
  }, { scope: 'worker' }],

  // A full UI login runs once per worker; its own budget keeps it from consuming the first test's timeout.
  sessionState: [async ({ playwright, browser, sessionUser }, use, workerInfo) => {
    const { baseURL, testIdAttribute } = workerInfo.project.use;
    // Playwright applies the configured testIdAttribute in a test-scoped fixture, which hasn't run yet here.
    if (testIdAttribute) {
      playwright.selectors.setTestIdAttribute(testIdAttribute);
    }
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await preparePage(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto('/login');
    const homePage = await loginPage.loginAs(sessionUser);
    await expect(homePage.loggedInAsText(sessionUser.name)).toBeVisible();

    const state = await context.storageState();
    await context.close();
    await use(state);
  }, { scope: 'worker', timeout: 60_000 }],

  storageState: async ({ sessionState }, use) => {
    await use(sessionState);
  },
});

export { expect };
