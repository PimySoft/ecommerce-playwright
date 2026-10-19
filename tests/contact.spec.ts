import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Contact Form', () => {
  test('should confirm the message was sent when the contact form is submitted', { tag: '@regression' }, async ({ contactPage }) => {
    const formData = TestDataFactory.createContactFormData();

    await contactPage.fillContactForm(formData);
    await contactPage.submit();

    await expect(contactPage.successMessage).toBeVisible();
  });
});
