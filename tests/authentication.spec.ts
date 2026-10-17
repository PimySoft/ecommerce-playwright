import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('User Authentication', () => {
  test('should display all required login form elements', { tag: '@regression' }, async ({ loginPage }) => {
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should show the user as logged in when credentials are valid', { tag: '@smoke' }, async ({ loginPage, testUser }) => {
    const homePage = await test.step('Log in with the API-created account', async () => {
      return loginPage.loginAs(testUser);
    });

    await test.step('Verify the header shows the logged-in user', async () => {
      await expect(homePage.loggedInAsText(testUser.name)).toBeVisible();
    });
  });

  test('should reject login when the credentials are invalid', { tag: '@regression' }, async ({ loginPage }) => {
    const invalidCredentials = TestDataFactory.createUnregisteredCredentials();

    await test.step('Attempt login with invalid credentials', async () => {
      await loginPage.login(invalidCredentials.email, invalidCredentials.password);
    });

    await test.step('Verify error message is displayed', async () => {
      await expect(loginPage.errorMessage).toBeVisible();
    });
  });

  test('should block login when the email has no @ symbol', { tag: '@regression' }, async ({ loginPage }) => {
    const { password } = TestDataFactory.createUnregisteredCredentials();

    await test.step('Submit an email without an @ symbol', async () => {
      await loginPage.login(TestDataFactory.getEmailWithoutAtSymbol(), password);
    });

    await test.step('Verify the browser rejects the email and stays on the login form', async () => {
      await expect(loginPage.invalidEmailInput).toBeVisible();
      await expect(loginPage.loginHeading).toBeVisible();
    });
  });

  test('should return to the login page as a guest when the user logs out', { tag: '@regression' }, async ({ loginPage, testUser }) => {
    const homePage = await test.step('Log in', async () => {
      return loginPage.loginAs(testUser);
    });

    const loggedOutPage = await test.step('Log out', async () => {
      return homePage.logout();
    });

    await test.step('Verify the session has ended', async () => {
      await expect(loggedOutPage.loginHeading).toBeVisible();
      await expect(homePage.loggedInAsText(testUser.name)).toBeHidden();
      await expect(homePage.loginLink).toBeVisible();
    });
  });
});
