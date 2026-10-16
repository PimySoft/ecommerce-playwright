import { test, expect } from './fixtures';
import { REQUIRED_SIGNUP_FIELDS } from '../pages/SignupPage';

test.describe('User Registration', () => {
  test('should register a new account, show the user as logged in and delete the account', { tag: '@smoke' }, async ({ loginPage, newUser }) => {
    const signupPage = await test.step('Start signup with a name and email', async () => {
      const page = await loginPage.startSignup(newUser.name, newUser.email);
      await expect(page.accountInformationHeading).toBeVisible();
      await expect(page.emailInput).toHaveValue(newUser.email);
      return page;
    });

    const homePage = await test.step('Complete the account form', async () => {
      const accountCreatedPage = await signupPage.createAccount(newUser);
      await expect(accountCreatedPage.accountCreatedHeading).toBeVisible();
      return accountCreatedPage.continue();
    });

    await test.step('Verify the new user is logged in', async () => {
      await expect(homePage.loggedInAsText(newUser.name)).toBeVisible();
    });

    await test.step('Delete the account', async () => {
      const accountDeletedPage = await homePage.deleteAccount();
      await expect(accountDeletedPage.accountDeletedHeading).toBeVisible();
      const loggedOutHomePage = await accountDeletedPage.continue();
      await expect(loggedOutHomePage.loginLink).toBeVisible();
    });
  });

  test('should reject signup when the email is already registered', { tag: '@regression' }, async ({ loginPage, testUser }) => {
    await loginPage.submitSignup(testUser.name, testUser.email);

    await expect(loginPage.signupErrorMessage).toBeVisible();
  });

  // Each required field is left empty on its own, so a field that stops being required is caught individually.
  for (const field of REQUIRED_SIGNUP_FIELDS) {
    test(`should not create the account when ${field} is empty`, { tag: '@regression' }, async ({ loginPage, newUser }) => {
      const signupPage = await loginPage.startSignup(newUser.name, newUser.email);

      await signupPage.fillAccountForm(newUser);
      await signupPage.requiredField(field).clear();
      await signupPage.createAccountButton.click();

      // A blocked submit moves focus to the invalid field instead of leaving it on the button.
      await expect(signupPage.requiredField(field)).toBeFocused();
      await expect(signupPage.invalidFields).toHaveCount(1);
      await expect(signupPage.invalidRequiredField(field)).toBeVisible();
      await expect(signupPage.accountInformationHeading).toBeVisible();
    });
  }
});
