import { APIRequestContext } from '@playwright/test';
import { Credentials, User } from '../test-data/TestDataFactory';

interface ApiResponse {
  responseCode: number;
  message: string;
}

export class AccountApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async createAccount(user: User): Promise<void> {
    const { address, birthDate } = user;
    await this.send('POST', '/api/createAccount', 201, {
      name: user.name,
      email: user.email,
      password: user.password,
      title: user.title,
      birth_date: String(birthDate.getDate()),
      birth_month: String(birthDate.getMonth() + 1),
      birth_year: String(birthDate.getFullYear()),
      firstname: address.firstName,
      lastname: address.lastName,
      company: address.company,
      address1: address.address1,
      address2: address.address2,
      country: address.country,
      zipcode: address.zipcode,
      state: address.state,
      city: address.city,
      mobile_number: address.mobileNumber,
    });
  }

  async accountExists({ email, password }: Credentials): Promise<boolean> {
    const { responseCode } = await this.call('POST', '/api/verifyLogin', { email, password });
    return responseCode === 200;
  }

  async deleteAccount({ email, password }: Credentials): Promise<void> {
    await this.send('DELETE', '/api/deleteAccount', 200, { email, password });
  }

  private async send(method: string, path: string, expectedCode: number, form: Record<string, string>): Promise<void> {
    const body = await this.call(method, path, form);
    if (body.responseCode !== expectedCode) {
      throw new Error(`${method} ${path} returned ${body.responseCode} "${body.message}", expected ${expectedCode}`);
    }
  }

  // The API always answers HTTP 200 and reports the real status in the body's responseCode,
  // and it serves JSON as text/html, so the body is parsed from text.
  private async call(method: string, path: string, form: Record<string, string>): Promise<ApiResponse> {
    const response = await this.request.fetch(path, { method, form });
    if (!response.ok()) {
      throw new Error(`${method} ${path} failed with HTTP ${response.status()}`);
    }
    return JSON.parse(await response.text()) as ApiResponse;
  }
}
