import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { HomePage } from './HomePage';
import { SignupPage } from './SignupPage';
import { Credentials } from '../test-data/TestDataFactory';

export class LoginPage extends BasePage {
  // ========== SELECTORS ==========

  get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Login to your account', exact: true });
  }

  // The login and signup forms both have an "Email Address" textbox, and neither form is named.
  get emailInput(): Locator {
    return this.page.getByTestId('login-email');
  }

  get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password', exact: true });
  }

  // Constraint validation has no accessibility-tree equivalent, so it is read through :invalid.
  get invalidEmailInput(): Locator {
    return this.emailInput.and(this.page.locator(':invalid'));
  }

  get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login', exact: true });
  }

  get errorMessage(): Locator {
    return this.page.getByText('Your email or password is incorrect!', { exact: true });
  }

  get signupNameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Name', exact: true });
  }

  get signupEmailInput(): Locator {
    return this.page.getByTestId('signup-email');
  }

  get signupButton(): Locator {
    return this.page.getByRole('button', { name: 'Signup', exact: true });
  }

  get signupErrorMessage(): Locator {
    return this.page.getByText('Email Address already exist!', { exact: true });
  }

  // ========== ACTIONS ==========

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginAs({ email, password }: Credentials): Promise<HomePage> {
    await this.login(email, password);
    await this.waitForImageHeavyPage((url) => url.pathname === '/');
    await this.handleCookieConsent();
    return new HomePage(this.page);
  }

  async submitSignup(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }

  async startSignup(name: string, email: string): Promise<SignupPage> {
    await this.submitSignup(name, email);
    await this.page.waitForURL((url) => url.pathname === '/signup');
    await this.handleCookieConsent();
    return new SignupPage(this.page);
  }
}
