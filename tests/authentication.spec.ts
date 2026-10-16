import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('User Authentication', () => {
  test('should display all required login form elements', async ({ loginPage }) => {
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should display error message when login credentials are invalid', async ({ loginPage }) => {
    const invalidCredentials = TestDataFactory.getInvalidCredentials();

    await test.step('Attempt login with invalid credentials', async () => {
      await loginPage.login(invalidCredentials.email, invalidCredentials.password);
    });

    await test.step('Verify error message is displayed', async () => {
    await expect(loginPage.errorMessage).toBeVisible();
  });
  });

  test('should reject invalid email format in login form', async ({ loginPage }) => {
    const invalidEmail = TestDataFactory.getInvalidEmailFormats().noAtSymbol;
    const invalidCredentials = TestDataFactory.getInvalidCredentials();
    await loginPage.emailInput.fill(invalidEmail);
    await loginPage.passwordInput.fill(invalidCredentials.password);
    await loginPage.loginButton.click();
    await loginPage.emailInput.blur();

    await expect.poll(async () => {
      return await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    }).toBeFalsy();
  });
});
