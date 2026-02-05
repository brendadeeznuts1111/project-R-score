/**
 * @fileoverview Standalone Executable Compilation Tests
 * @description Tests for Bun.build() compile options with autoload flags
 * @module test/standalone-executable-compile
 */

import { describe, test, expect } from 'bun:test';
import { build } from 'bun';

describe('Standalone Executable Compilation', () => {
	describe('compile.autoloadTsconfig', () => {
		test('can enable tsconfig autoloading', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadTsconfig: true,
				},
			});

			expect(result.success).toBe(true);
		});

		test('can disable tsconfig autoloading (default)', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadTsconfig: false,
				},
			});

			expect(result.success).toBe(true);
		});
	});

	describe('compile.autoloadPackageJson', () => {
		test('can enable package.json autoloading', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadPackageJson: true,
				},
			});

			expect(result.success).toBe(true);
		});

		test('can disable package.json autoloading (default)', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadPackageJson: false,
				},
			});

			expect(result.success).toBe(true);
		});
	});

	describe('compile.autoloadDotenv', () => {
		test('can enable dotenv autoloading', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadDotenv: true,
				},
			});

			expect(result.success).toBe(true);
		});

		test('can disable dotenv autoloading (default)', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadDotenv: false,
				},
			});

			expect(result.success).toBe(true);
		});
	});

	describe('compile.autoloadBunfig', () => {
		test('can enable bunfig autoloading', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadBunfig: true,
				},
			});

			expect(result.success).toBe(true);
		});

		test('can disable bunfig autoloading (default)', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadBunfig: false,
				},
			});

			expect(result.success).toBe(true);
		});
	});

	describe('Multiple autoload options', () => {
		test('can enable all autoload options', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadTsconfig: true,
					autoloadPackageJson: true,
					autoloadDotenv: true,
					autoloadBunfig: true,
				},
			});

			expect(result.success).toBe(true);
		});

		test('can enable selective autoload options', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {
					autoloadPackageJson: true,
					autoloadDotenv: true,
					// tsconfig and bunfig disabled
				},
			});

			expect(result.success).toBe(true);
		});
	});

	describe('Default behavior (no autoload)', () => {
		test('compile: true does not autoload configs', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: true,  // Simple boolean - no autoload
			});

			expect(result.success).toBe(true);
		});

		test('compile: {} does not autoload configs', async () => {
			const result = await build({
				entrypoints: ['./test/fixtures/simple-app.ts'],
				outdir: './dist',
				compile: {},  // Empty object - no autoload
			});

			expect(result.success).toBe(true);
		});
	});
});
