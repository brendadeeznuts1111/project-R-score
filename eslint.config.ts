// eslint.config.ts — Composes global Bun harness + FactoryWager project overlays
import tseslint from 'typescript-eslint';
import { Linter } from 'eslint';
import importPlugin from 'eslint-plugin-import';
import security from 'eslint-plugin-security';
import { bunNativeLintRollout } from './config/eslint/bun-native.ts';
import { HARNESS_BUN_GLOBALS, HARNESS_PATHS } from './config/eslint/harness/rollout.ts';
import bunPlugin, { bunPluginRules } from './config/eslint/plugin-bun/index.ts';
import { projectEslintConfig } from './eslint.project.config.ts';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  // Base configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.bun/**',
      'coverage/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      'benchmarks/**',
      '**/*.d.ts',
      '**/generated/**',
    ],
    plugins: {
      security,
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.*.json'],
        tsconfigRootDir: import.meta.dirname,
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.d.ts'],
        },
      },
    },
  },

  // Core rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      security,
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.*.json'],
        tsconfigRootDir: import.meta.dirname,
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },
    rules: {
      // ────────────────────────────────────────────────────────────────
      // TypeScript-specific rules
      // ────────────────────────────────────────────────────────────────
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],

      '@typescript-eslint/explicit-module-boundary-types': [
        'error',
        {
          allowArgumentsExplicitlyTypedAsAny: false,
          allowDirectConstAssertionInArrowFunctions: true,
          allowedNames: [],
          allowHigherOrderFunctions: true,
          allowTypedFunctionExpressions: true,
        },
      ],

      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          fixToUnknown: true,
          ignoreRestArgs: false,
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
        },
      ],

      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],

      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      // Disabled until strictNullChecks is enabled in project tsconfig.
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // ────────────────────────────────────────────────────────────────
      // Enhanced code quality rules
      // ────────────────────────────────────────────────────────────────
      'no-console': [
        'error',
        {
          // console.table is intentionally NOT allowed — structured tabular
          // output goes through logTable (lib/console-depth.ts), enforced
          // for new code by scripts/lint-console-format.ts --staged.
          allow: ['warn', 'error', 'info', 'group', 'groupEnd'],
        },
      ],

      'no-debugger': 'error',
      'no-alert': 'error',

      'prefer-const': [
        'error',
        {
          destructuring: 'any',
          ignoreReadBeforeAssign: false,
        },
      ],

      'no-var': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': ['error', 'never'],

      'object-shorthand': [
        'error',
        'always',
        {
          ignoreConstructors: false,
          avoidQuotes: true,
        },
      ],

      'arrow-body-style': ['error', 'as-needed'],
      'arrow-spacing': ['error', { before: true, after: true }],

      // ────────────────────────────────────────────────────────────────
      // Performance and memory rules
      // ────────────────────────────────────────────────────────────────
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],

      'no-sequences': 'error',
      'no-void': ['error', { allowAsStatement: true }],

      // ────────────────────────────────────────────────────────────────
      // Security rules
      // ────────────────────────────────────────────────────────────────
      'no-eval': 'error',
      'no-implied-eval': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
      'no-new-func': 'error',

      // ────────────────────────────────────────────────────────────────
      // Error handling rules
      // ────────────────────────────────────────────────────────────────
      // Prevent floating promises (promises that aren't awaited or handled)
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: true,
          ignoreIIFE: true,
        },
      ],

      // Ensure proper handling of async functions
      '@typescript-eslint/await-thenable': 'error',

      // Prevent misuse of promises (e.g., passing async function where sync expected)
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: true,
            attributes: true,
            properties: true,
            returns: true,
          },
          checksConditionals: true,
        },
      ],

      // Require proper error types in Promise rejections
      '@typescript-eslint/prefer-promise-reject-errors': [
        'error',
        {
          allowEmptyReject: false,
        },
      ],

      // Prevent empty catch blocks
      'no-empty': [
        'error',
        {
          allowEmptyCatch: false,
        },
      ],

      // Prefer async/await over raw Promise then/catch
      '@typescript-eslint/promise-function-async': [
        'error',
        {
          allowAny: true,
          allowedPromiseNames: ['Thenable'],
          checkArrowFunctions: true,
          checkFunctionDeclarations: true,
          checkMethodDeclarations: true,
        },
      ],

      // Require try-catch for async operations
      'require-atomic-updates': 'error',

      // Prevent throwing literals (must throw Error objects)
      'no-throw-literal': 'error',
      '@typescript-eslint/only-throw-error': 'error',

      // Ensure rejections are handled in try-catch
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
          enforceForJSX: false,
        },
      ],

      // ────────────────────────────────────────────────────────────────
      // Complexity rules
      // ────────────────────────────────────────────────────────────────
      complexity: ['error', { max: 15 }],
      'max-depth': ['error', { max: 4 }],
      'max-params': ['error', { max: 5 }],
      'max-lines-per-function': [
        'error',
        {
          max: 100,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],

      'max-lines': [
        'error',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // ────────────────────────────────────────────────────────────────
      // Import/export rules
      // ────────────────────────────────────────────────────────────────
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'error',
    },
  },

  // Global Bun harness plugin rules (root paths only)
  {
    files: [...HARNESS_PATHS],
    plugins: { bun: bunPlugin },
    rules: bunPluginRules,
  },

  ...projectEslintConfig,

  // Type-checked rules (scope to TS files only)
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // Project override: keep strictNullChecks-dependent rule off until tsconfig strictNullChecks=true.
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },

  // Override rules for specific files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'import/order': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  {
    files: ['benchmarks/**/*.ts'],
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  {
    files: ['**/*.bench.ts'],
    rules: {
      'import/order': 'off',
      'no-console': 'off',
      'prefer-template': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Bun runtime globals (harness)
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: HARNESS_BUN_GLOBALS,
    },
  },

  // Bun-native API enforcement (error on harness paths)
  bunNativeLintRollout,
);

/**
 * Helper function to generate TypeScript configuration
 */
export function generateTypeScriptConfig(options: {
  strict?: boolean;
  noImplicitAny?: boolean;
  strictNullChecks?: boolean;
  target?: string;
  module?: string;
} = {}) {
  const {
    strict = true,
    noImplicitAny = true,
    strictNullChecks = true,
    target = 'ESNext',
    module = 'ESNext',
  } = options;

  return {
    compilerOptions: {
      target,
      module,
      lib: ['ESNext', 'DOM'],
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      allowJs: true,
      checkJs: false,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      outDir: './dist',
      removeComments: true,
      noEmit: true,
      isolatedModules: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict,
      noImplicitAny,
      strictNullChecks,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      noImplicitThis: true,
      useUnknownInCatchVariables: true,
      alwaysStrict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      noImplicitOverride: true,
      allowUnusedLabels: false,
      allowUnreachableCode: false,
      skipLibCheck: true,
    },
    include: [
      'src/**/*',
      'lib/**/*',
      'test/**/*',
      'benchmarks/**/*',
      '*.ts',
      '*.tsx',
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.bun',
      'coverage',
    ],
  };
}

/**
 * Script to run ESLint with project-specific options
 */
export async function runESLint(options: {
  fix?: boolean;
  cache?: boolean;
  maxWarnings?: number;
  format?: string;
  outputFile?: string;
} = {}) {
  const { fix = false, cache = true, maxWarnings = 100, format = 'stylish', outputFile } = options;
  
  const args = [
    'eslint',
    '--ext', '.ts,.tsx',
    '--config', 'eslint.config.ts',
  ];

  if (fix) args.push('--fix');
  if (cache) args.push('--cache');
  if (maxWarnings) args.push('--max-warnings', maxWarnings.toString());
  if (format) args.push('--format', format);
  if (outputFile) args.push('--output-file', outputFile);
  
  args.push('.');

  const process = Bun.spawn(args, {
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  const exitCode = await process.exited;
  return exitCode;
}

/**
 * Pre-commit hook configuration
 */
export const preCommitHook = `
#!/usr/bin/env bun

import { runESLint } from './eslint.config.ts';

// Run ESLint on staged files
const result = await runESLint({
  fix: true,
  maxWarnings: 50,
  format: 'compact',
});

if (result !== 0) {
  console.error('❌ ESLint check failed');
  process.exit(1);
}

console.info('✅ ESLint check passed');
`;

// Export utility for programmatic use
export const lintUtils = {
  generateTypeScriptConfig,
  runESLint,
  preCommitHook,
};

// Create configuration files if this module is run directly
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  
  if (args[0] === 'init') {
    // Write TypeScript config
    const config = generateTypeScriptConfig();
    await Bun.write('tsconfig.lint.json', JSON.stringify(config, null, 2));
    console.info('✅ Created tsconfig.lint.json');
    
    // Write pre-commit hook
    await Bun.write('.husky/pre-commit', preCommitHook);
    console.info('✅ Created .husky/pre-commit hook');
    
    console.info('\n🚀 ESLint configuration complete!');
    console.info('Run: bun eslint.config.ts lint');
  } else if (args[0] === 'lint') {
    const exitCode = await runESLint({
      fix: args.includes('--fix'),
      format: args.includes('--json') ? 'json' : 'stylish',
      outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1],
    });
    process.exit(exitCode);
  } else {
    console.info(`
Usage:
  bun eslint.config.ts init          Initialize ESLint configuration
  bun eslint.config.ts lint          Run ESLint
  bun eslint.config.ts lint --fix    Run ESLint with auto-fix
  bun eslint.config.ts lint --json   Output in JSON format

Options:
  --fix           Auto-fix problems
  --json          Output in JSON format
  --output=FILE   Write output to file
    `);
  }
}
