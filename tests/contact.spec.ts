import { test, expect } from './fixtures';
import { TestDataFactory } from '../test-data/TestDataFactory';

test.describe('Contact Form', () => {
  test('should submit contact form with valid data and show success message', { tag: '@regression' }, async ({ contactPage }) => {
    const formData = TestDataFactory.createContactFormData();

    await contactPage.fillContactForm(formData);
    await contactPage.submitFormAndHandleAlert();

    await expect(contactPage.successMessage).toBeVisible();
  });

});
