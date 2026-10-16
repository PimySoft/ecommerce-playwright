import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The target is a shared public site; a single CI worker avoids rate-limiting and ad-driven flakiness.
  workers: process.env.CI ? 1 : undefined,
  // CI runs are sharded, so each shard writes a blob report that the workflow merges into one HTML report.
  reporter: process.env.CI ? [['list'], ['github'], ['blob']] : 'html',
  use: {
    baseURL: 'https://automationexercise.com',
    // The site ships data-qa attributes as its own test hooks.
    testIdAttribute: 'data-qa',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
