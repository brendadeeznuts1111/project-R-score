/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Bun as the test environment
    environment: 'node',
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'examples/**',
      'demo-app/**',
      'scripts/**',
      'utilities/**',
      'factory/**',
      'data/**',
      'backups/**',
      'databases/**',
      'reports/**',
      'wiki/**',
      'pages/**',
      'styles/**',
      'components/**',
      'workflows/**'
    ],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        'examples/**',
        'scripts/**',
        'utilities/**',
        'tests/**',
        'factory/**',
        'data/**',
        'backups/**',
        'databases/**',
        'reports/**',
        'wiki/**',
        'pages/**',
        'styles/**',
        'components/**',
        'workflows/**',
        'demo-app/**',
        'monitoring/**',
        'shopping/**',
        'ai/**',
        'bench/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80
        }
      }
    },
    // Test timeout
    testTimeout: 10000,
    // Setup files
    setupFiles: ['tests/setup.ts'],
    // Globals
    globals: true,
    // Concurrent tests
    maxConcurrency: 5,
    // Bail on first failure in CI
    bail: process.env.CI ? 1 : 0
  }
});