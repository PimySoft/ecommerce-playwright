import { authenticatedTest as test, expect } from './fixtures';

test.describe('Authenticated Session', () => {
  test('should show the user as logged in without logging in through the UI', { tag: '@smoke' }, async ({ homePage, sessionUser }) => {
    await expect(homePage.loggedInAsText(sessionUser.name)).toBeVisible();
    await expect(homePage.loginLink).toBeHidden();
  });
});
