import { faker } from '@faker-js/faker';
import { ContactFormData } from '../pages/ContactPage';

export interface Product {
  name: string;
  price: number;
  category: string;
  brand: string;
  availability: string;
  condition: string;
}

export interface ProductListing {
  heading: string;
  productNames: string[];
}

export interface CategoryListing extends ProductListing {
  category: string;
  subcategory: string;
}

export interface BrandListing extends ProductListing {
  brand: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
}

export interface User extends Credentials {
  name: string;
  title: 'Mr' | 'Mrs';
  birthDate: Date;
  address: Address;
}

export interface PaymentCard {
  nameOnCard: string;
  number: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
}

// The signup form's country dropdown only offers these values.
const SUPPORTED_COUNTRIES = ['India', 'United States', 'Canada', 'Australia', 'Israel', 'New Zealand', 'Singapore'];

export class TestDataFactory {
  // The site's catalogue is fixed, so products are known values rather than generated ones.
  static getProducts(): Record<'blueTop' | 'menTshirt', Product> {
    return {
      blueTop: {
        name: 'Blue Top', price: 500, category: 'Women > Tops', brand: 'Polo', availability: 'In Stock', condition: 'New',
      },
      menTshirt: {
        name: 'Men Tshirt', price: 400, category: 'Men > Tshirts', brand: 'H&M', availability: 'In Stock', condition: 'New',
      },
    };
  }

  static getCategoryListings(): Record<'womenDress', CategoryListing> {
    return {
      womenDress: {
        category: 'Women',
        subcategory: 'Dress',
        heading: 'Women - Dress Products',
        productNames: ['Sleeveless Dress', 'Stylish Dress', 'Rose Pink Embroidered Maxi Dress'],
      },
    };
  }

  static getBrandListings(): Record<'polo', BrandListing> {
    return {
      polo: {
        brand: 'Polo',
        heading: 'Brand - Polo Products',
        productNames: [
          'Blue Top',
          'Fancy Green Top',
          'Green Side Placket Detail T-Shirt',
          'Premium Polo T-Shirts',
          'Soft Stretch Jeans',
          'Grunt Blue Slim Fit Jeans',
        ],
      },
    };
  }

  // The site renders every amount as "Rs. <integer>".
  static formatPrice(amount: number): string {
    return `Rs. ${amount}`;
  }

  // Above 1, so a quantity that was ignored and defaulted to 1 is caught.
  static createQuantity(): number {
    return faker.number.int({ min: 2, max: 5 });
  }

  static createOrderComment(): string {
    return faker.lorem.sentence();
  }

  static getSearchTerms() {
    return {
      blue: 'blue',
      men: 'men',
      dress: 'dress',
      empty: '',
      nonexistent: 'nonexistentproductxyz123',
    };
  }

  // Accounts are shared across parallel workers and other people's runs on the public site,
  // so the email carries a random token on top of faker's name-based address.
  static createUser(overrides?: Partial<User>): User {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      name: `${firstName} ${lastName}`,
      email: TestDataFactory.createUniqueEmail(firstName, lastName),
      password: faker.internet.password({ length: 16 }),
      title: faker.helpers.arrayElement(['Mr', 'Mrs'] as const),
      birthDate: faker.date.birthdate({ mode: 'age', min: 18, max: 80 }),
      address: TestDataFactory.createAddress({ firstName, lastName }),
      ...overrides,
    };
  }

  static createAddress(overrides?: Partial<Address>): Address {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      company: faker.company.name(),
      address1: faker.location.streetAddress(),
      address2: faker.location.secondaryAddress(),
      country: faker.helpers.arrayElement(SUPPORTED_COUNTRIES),
      state: faker.location.state(),
      city: faker.location.city(),
      zipcode: faker.location.zipCode(),
      mobileNumber: faker.string.numeric(10),
      ...overrides,
    };
  }

  static createPaymentCard(overrides?: Partial<PaymentCard>): PaymentCard {
    const expiry = faker.date.future({ years: 5 });

    return {
      nameOnCard: faker.person.fullName(),
      number: faker.finance.creditCardNumber({ issuer: 'visa' }).replace(/\D/g, ''),
      cvc: faker.finance.creditCardCVV(),
      expiryMonth: String(expiry.getMonth() + 1).padStart(2, '0'),
      expiryYear: String(expiry.getFullYear()),
      ...overrides,
    };
  }

  // Unique per call, so the credentials can never match an account someone else created.
  static createUnregisteredCredentials(): Credentials {
    return {
      email: TestDataFactory.createUniqueEmail(faker.person.firstName(), faker.person.lastName()),
      password: faker.internet.password({ length: 16 }),
    };
  }

  static createSubscriptionEmail(): string {
    return TestDataFactory.createUniqueEmail(faker.person.firstName(), faker.person.lastName());
  }

  static getInvalidEmailFormats() {
    return {
      noAtSymbol: 'invalid-email',
      noDomain: 'test@',
      noTld: 'test@example',
      empty: '',
    };
  }

  static createContactFormData(overrides?: Partial<ContactFormData>): ContactFormData {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email({ provider: 'example.com' }),
      subject: faker.lorem.sentence({ min: 3, max: 6 }),
      message: faker.lorem.paragraph(),
      ...overrides,
    };
  }

  static createInvalidContactFormData(): Partial<ContactFormData> {
    return {
      name: '',
      email: 'invalid-email',
      subject: '',
      message: '',
    };
  }

  private static createUniqueEmail(firstName: string, lastName: string): string {
    const token = faker.string.alphanumeric({ length: 10, casing: 'lower' });
    return faker.internet.email({ firstName, lastName: `${lastName}.${token}`, provider: 'example.com' }).toLowerCase();
  }
}
