import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['percySnapshot'] }],
      'playwright/no-nth-methods': 'error',
      'playwright/no-raw-locators': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/prefer-to-have-count': 'error',
      'playwright/prefer-locator': 'error',
      'playwright/no-get-by-title': 'error',
    },
  },
  {
    files: ['pages/**/*.ts'],
    plugins: { playwright },
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-nth-methods': 'warn',
      'playwright/prefer-locator': 'error',
    },
  },
);
