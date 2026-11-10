import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', workers: 1, use: { baseURL: 'http://127.0.0.1:4173', launchOptions: { executablePath: '/usr/bin/google-chrome' } }, webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false } });
