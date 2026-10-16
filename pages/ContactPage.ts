import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get contactHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Get In Touch', exact: true });
  }

  get nameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Name', exact: true });
  }

  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Email', exact: true });
  }

  get subjectInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Subject', exact: true });
  }

  get messageTextarea(): Locator {
    return this.page.getByRole('textbox', { name: 'Your Message Here', exact: true });
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit', exact: true });
  }

  get successMessage(): Locator {
    return this.page.locator('#contact-page').getByText('Success! Your details have been submitted successfully.', { exact: true });
  }

  // ========== ACTIONS ==========

  async fillContactForm(formData: ContactFormData): Promise<void> {
    await this.nameInput.fill(formData.name);
    await this.emailInput.fill(formData.email);
    await this.subjectInput.fill(formData.subject);
    await this.messageTextarea.fill(formData.message);
  }

  async submitFormAndHandleAlert(): Promise<void> {
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await this.submitButton.click();
  }
}
