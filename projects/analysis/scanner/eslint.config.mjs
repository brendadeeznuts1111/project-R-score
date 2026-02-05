import tseslint from 'typescript-eslint';
import bunPlugin from './eslint-plugin-bun.js';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
	{
		files: ['**/*.ts'],
		ignores: [
			'node_modules/**',
			'dist/**',
			'build/**',
			'.bun/**',
			'coverage/**',
			'**/*.test.ts',
			'benchmarks/**',
			'profiles/**',
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'bun': bunPlugin,
		},
		rules: {
			// ────────────────────────────────────────────────────────────────
			// Naming Convention
			// ────────────────────────────────────────────────────────────────
			'@typescript-eslint/naming-convention': [
				'error',
				// Rule 1: Exported SCREAMING_SNAKE_CASE → must start with BUN_
				{
					selector: 'variable',
					modifiers: ['const', 'exported'],
					format: ['UPPER_CASE'],
					leadingUnderscore: 'forbid',
					trailingUnderscore: 'forbid',
					filter: {
						regex: '^[A-Z][A-Z0-9_]+$',
						match: true,
					},
					custom: {
						regex: '^BUN_[A-Z0-9_]+$',
						match: true,
					},
				},
				// Rule 2: Exported non-SCREAMING constants → PascalCase or camelCase
				{
					selector: 'variable',
					modifiers: ['const', 'exported'],
					format: ['PascalCase', 'camelCase'],
					filter: {
						regex: '^[A-Z][A-Z0-9_]+$',
						match: false,
					},
				},
				// Rule 3: Non-exported constants → flexible (no BUN_ prefix needed)
				{
					selector: 'variable',
					modifiers: ['const'],
					format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
					leadingUnderscore: 'allow',
					filter: {
						regex: '^BUN_',
						match: false,
					},
				},
				// Rule 4: Exported classes and enums → PascalCase
				{
					selector: ['class', 'enum'],
					modifiers: ['exported'],
					format: ['PascalCase'],
					leadingUnderscore: 'forbid',
				},
				// Rule 5: Exported functions → camelCase
				{
					selector: 'function',
					modifiers: ['exported'],
					format: ['camelCase'],
					leadingUnderscore: 'forbid',
				},
			],

			// ────────────────────────────────────────────────────────────────
			// Type Safety
			// ────────────────────────────────────────────────────────────────
			'@typescript-eslint/no-explicit-any': [
				'warn',
				{
					ignoreRestArgs: true, // Allow rest args with any for Bun IPC handlers
					fixToUnknown: false,
				},
			],
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/strict-boolean-expressions': [
				'warn',
				{
					allowString: true, // Allow string checks (common in Bun APIs)
					allowNumber: true, // Allow number checks
					allowNullableObject: true, // Allow nullable object checks
					allowNullableBoolean: false,
					allowNullableString: true, // Allow nullable string checks
					allowNullableNumber: true,
					allowAny: false,
				},
			],

			// ────────────────────────────────────────────────────────────────
			// Code Quality
			// ────────────────────────────────────────────────────────────────
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-floating-promises': ['error', {ignoreVoid: true}],
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: false,
				},
			],
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-empty-function': ['error', {allow: ['arrowFunctions']}],
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/prefer-as-const': 'error',
			'@typescript-eslint/prefer-reduce-type-parameter': 'error',
			'@typescript-eslint/prefer-return-this-type': 'error',
			'@typescript-eslint/prefer-string-starts-ends-with': 'error',
			'@typescript-eslint/prefer-includes': 'error',
			'@typescript-eslint/prefer-readonly': 'warn',
			'@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for Bun APIs
			'@typescript-eslint/switch-exhaustiveness-check': 'error',

			// ────────────────────────────────────────────────────────────────
			// Best Practices
			// ────────────────────────────────────────────────────────────────
			'@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
			'@typescript-eslint/consistent-type-exports': [
				'error',
				{
					fixMixedExportsWithInlineTypeSpecifier: true,
				},
			],
			'@typescript-eslint/explicit-function-return-type': [
				'warn',
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowDirectConstAssertionInArrowFunctions: true,
				},
			],
			'@typescript-eslint/explicit-module-boundary-types': 'off', // Too verbose for internal functions
			'@typescript-eslint/no-confusing-void-expression': [
				'error',
				{
					ignoreArrowShorthand: true,
				},
			],
			'@typescript-eslint/no-redundant-type-constituents': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'warn',
			'@typescript-eslint/no-unnecessary-type-arguments': 'error',
			'@typescript-eslint/prefer-function-type': 'error',
			'@typescript-eslint/prefer-promise-reject-errors': 'error',
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'warn',
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: false,
					allowNullish: true, // Allow nullish in templates (common in Bun APIs)
				},
			],

			// ────────────────────────────────────────────────────────────────
			// Custom Bun-specific Rules
			// ────────────────────────────────────────────────────────────────
			'bun/require-bun-prefix': 'warn', // Warn on Bun-related constants without BUN_ prefix
			'bun/no-hardcoded-similarity-threshold': [
				'error',
				{
					allowedThresholds: [0], // Allow dist === 0 (exact match)
					functionNames: ['levenshtein', 'distance', 'similarity', 'editDistance'],
				},
			],
		},
	},
	// Separate config for test files (more lenient)
	{
		files: ['**/*.test.ts', '**/*.spec.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/consistent-type-definitions': 'off',
			'bun/require-bun-prefix': 'off', // Disable in test files
		},
	},
);
