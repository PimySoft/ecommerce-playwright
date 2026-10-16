import { test, expect } from './fixtures';
import { ACCESSIBILITY_BASELINE } from '../test-data/accessibilityBaseline';

test.describe('Accessibility', () => {
  test('should have no WCAG violations beyond the baseline on the home page', { tag: ['@regression', '@a11y'] }, async ({ homePage, accessibilityScanner }) => {
    await expect(homePage.pageHeading).toBeVisible();

    expect(await accessibilityScanner.findNewViolations(ACCESSIBILITY_BASELINE.home)).toEqual([]);
  });

  test('should have no WCAG violations beyond the baseline on the products page', { tag: ['@regression', '@a11y'] }, async ({ productsPage, accessibilityScanner }) => {
    await expect(productsPage.allProductsHeading).toBeVisible();

    expect(await accessibilityScanner.findNewViolations(ACCESSIBILITY_BASELINE.products)).toEqual([]);
  });

  test('should have no WCAG violations beyond the baseline on the empty cart page', { tag: ['@regression', '@a11y'] }, async ({ cartPage, accessibilityScanner }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();

    expect(await accessibilityScanner.findNewViolations(ACCESSIBILITY_BASELINE.cart)).toEqual([]);
  });

  test('should have no WCAG violations beyond the baseline on the login page', { tag: ['@regression', '@a11y'] }, async ({ loginPage, accessibilityScanner }) => {
    await expect(loginPage.loginHeading).toBeVisible();

    expect(await accessibilityScanner.findNewViolations(ACCESSIBILITY_BASELINE.login)).toEqual([]);
  });

  test('should have no WCAG violations beyond the baseline on the contact page', { tag: ['@regression', '@a11y'] }, async ({ contactPage, accessibilityScanner }) => {
    await expect(contactPage.contactHeading).toBeVisible();

    expect(await accessibilityScanner.findNewViolations(ACCESSIBILITY_BASELINE.contact)).toEqual([]);
  });
});
