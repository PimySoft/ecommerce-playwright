import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Newsletter Subscription', () => {
  test('should confirm the subscription when an email is submitted from the footer', { tag: '@regression' }, async ({ homePage }) => {
    await homePage.subscribe(TestDataFactory.createSubscriptionEmail());

    await expect(homePage.subscriptionSuccessMessage).toBeVisible();
  });
});
