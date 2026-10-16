import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const VISUAL = /@visual/;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The target is a shared public site; a single CI worker avoids rate-limiting and ad-driven flakiness.
  workers: process.env.CI ? 1 : undefined,
  // CI runs are sharded, so each shard writes a blob report that the workflow merges into one HTML report.
  reporter: process.env.CI ? [['list'], ['github'], ['blob']] : 'html',
  // Baselines are only ever rendered in the Playwright Linux image, so the OS suffix would add nothing.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
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
      grepInvert: VISUAL,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grepInvert: VISUAL,
    },
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
      grepInvert: VISUAL,
    },
    // A phone only needs to prove the core journeys work; the regression detail is browser logic, not layout.
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      grep: /@smoke/,
    },
    // Screenshots differ between operating systems and browser builds, so this project runs in the Playwright
    // Docker image both locally (npm run test:visual) and in CI. It uses bundled Chromium because the image
    // ships no Google Chrome.
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      grep: VISUAL,
    },
  ],
});
