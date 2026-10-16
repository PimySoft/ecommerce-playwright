import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { AccountCreatedPage } from './AccountCreatedPage';
import { User } from '../test-data/TestDataFactory';

export const REQUIRED_SIGNUP_FIELDS = [
  'name', 'password', 'firstName', 'lastName', 'address', 'state', 'city', 'zipcode', 'mobileNumber',
] as const;

export type RequiredSignupField = typeof REQUIRED_SIGNUP_FIELDS[number];

export class SignupPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ========== SELECTORS ==========

  get accountInformationHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Enter Account Information', exact: true });
  }

  titleRadio(title: User['title']): Locator {
    return this.page.getByRole('radio', { name: `${title}.`, exact: true });
  }

  get nameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Name *', exact: true });
  }

  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Email *', exact: true });
  }

  get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password *', exact: true });
  }

  // The date-of-birth selects share one unassociated "Date of Birth" label.
  get birthDaySelect(): Locator {
    return this.page.getByTestId('days');
  }

  get birthMonthSelect(): Locator {
    return this.page.getByTestId('months');
  }

  get birthYearSelect(): Locator {
    return this.page.getByTestId('years');
  }

  get firstNameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'First name *', exact: true });
  }

  get lastNameInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Last name *', exact: true });
  }

  get companyInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Company', exact: true });
  }

  get addressInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Address * (Street address, P.O. Box, Company name, etc.)', exact: true });
  }

  get address2Input(): Locator {
    return this.page.getByRole('textbox', { name: 'Address 2', exact: true });
  }

  get countrySelect(): Locator {
    return this.page.getByRole('combobox', { name: 'Country *', exact: true });
  }

  get stateInput(): Locator {
    return this.page.getByRole('textbox', { name: 'State *', exact: true });
  }

  // The site labels both city and zipcode `for="city"`, so neither has a usable accessible name.
  get cityInput(): Locator {
    return this.page.getByTestId('city');
  }

  get zipcodeInput(): Locator {
    return this.page.getByTestId('zipcode');
  }

  get mobileNumberInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Mobile Number *', exact: true });
  }

  get createAccountButton(): Locator {
    return this.page.getByRole('button', { name: 'Create Account', exact: true });
  }

  // Constraint validation has no accessibility-tree equivalent, so it is read through :invalid.
  get invalidFields(): Locator {
    return this.page.locator('form:has([data-qa="create-account"]) :invalid');
  }

  invalidRequiredField(field: RequiredSignupField): Locator {
    return this.requiredField(field).and(this.page.locator(':invalid'));
  }

  requiredField(field: RequiredSignupField): Locator {
    const fields: Record<RequiredSignupField, Locator> = {
      name: this.nameInput,
      password: this.passwordInput,
      firstName: this.firstNameInput,
      lastName: this.lastNameInput,
      address: this.addressInput,
      state: this.stateInput,
      city: this.cityInput,
      zipcode: this.zipcodeInput,
      mobileNumber: this.mobileNumberInput,
    };
    return fields[field];
  }

  // ========== ACTIONS ==========

  async fillAccountForm(user: User): Promise<void> {
    const { address, birthDate } = user;
    await this.titleRadio(user.title).check();
    await this.nameInput.fill(user.name);
    await this.passwordInput.fill(user.password);
    await this.birthDaySelect.selectOption(String(birthDate.getDate()));
    await this.birthMonthSelect.selectOption(String(birthDate.getMonth() + 1));
    await this.birthYearSelect.selectOption(String(birthDate.getFullYear()));
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);
    await this.companyInput.fill(address.company);
    await this.addressInput.fill(address.address1);
    await this.address2Input.fill(address.address2);
    await this.countrySelect.selectOption(address.country);
    await this.stateInput.fill(address.state);
    await this.cityInput.fill(address.city);
    await this.zipcodeInput.fill(address.zipcode);
    await this.mobileNumberInput.fill(address.mobileNumber);
  }

  async createAccount(user: User): Promise<AccountCreatedPage> {
    await this.fillAccountForm(user);
    await this.createAccountButton.click();
    await this.page.waitForURL((url) => url.pathname === '/account_created');
    return new AccountCreatedPage(this.page);
  }
}
