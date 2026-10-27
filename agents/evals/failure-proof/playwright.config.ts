import { defineConfig } from '@playwright/test';
import config from '../../../playwright.config';

// The seeded specs aren't part of the suite, so only the failure-proof eval runs them, through this config.
export default defineConfig(config, { testDir: './seeded' });
