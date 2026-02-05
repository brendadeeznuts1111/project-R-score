// eslint.config.ts — Enhanced configuration for Levenshtein Tier-1380
import tseslint from 'typescript-eslint';
import { Linter } from 'eslint';
import { join } from 'path';
import importPlugin from 'eslint-plugin-import';

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
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.*.json'],
        tsconfigRootDir: import.meta.dirname,
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: join(import.meta.dirname, 'tsconfig.json'),
        },
      },
    },
  },

  // Core rules
  {
    rules: {
      // ────────────────────────────────────────────────────────────────
      // @typescript-eslint/naming-convention — Enhanced with project-specific rules
      // ────────────────────────────────────────────────────────────────
      '@typescript-eslint/naming-convention': [
        'error',
        {
          // Rule 1: Exported SCREAMING_SNAKE_CASE constants must start with BUN_ or LEVENSHTEIN_
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
            regex: '^(BUN|LEVENSHTEIN)_[A-Z0-9_]+$',
            match: true,
          },
        },

        // Rule 2: Exported non-SCREAMING_SNAKE constants → PascalCase or camelCase
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
          trailingUnderscore: 'forbid',
          filter: {
            regex: '^(BUN|LEVENSHTEIN)_',
            match: false,
          },
        },

        // Rule 4: Exported classes, interfaces, types, enums → PascalCase
        {
          selector: ['class', 'interface', 'typeAlias', 'enum'],
          modifiers: ['exported'],
          format: ['PascalCase'],
          leadingUnderscore: 'forbid',
          custom: {
            regex: '^[A-Z][a-zA-Z0-9]*$',
            match: true,
          },
        },

        // Rule 5: Private class members → prefix with _
        {
          selector: ['classProperty', 'classMethod', 'accessor'],
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },

        // Rule 6: Protected class members → prefix with _
        {
          selector: ['classProperty', 'classMethod', 'accessor'],
          modifiers: ['protected'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },

        // Rule 7: Public class members → camelCase
        {
          selector: ['classProperty', 'classMethod', 'accessor'],
          modifiers: ['public'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },

        // Rule 8: Functions → camelCase
        {
          selector: 'function',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },

        // Rule 9: Parameters → camelCase
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },

        // Rule 10: Type parameters (generics) → PascalCase with T prefix
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          prefix: ['T'],
          custom: {
            regex: '^T[A-Z][a-zA-Z0-9]*$',
            match: true,
          },
        },

        // Rule 11: Enum members → PascalCase for exported, UPPER_CASE for non-exported
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE'],
        },
      ],

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

      // ────────────────────────────────────────────────────────────────
      // Enhanced code quality rules
      // ────────────────────────────────────────────────────────────────
      'no-console': [
        'error',
        {
          allow: ['warn', 'error', 'info', 'table', 'group', 'groupEnd'],
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
      'import/no-default-export': 'error',
    },
  },

  // Type-checked rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Override rules for specific files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'no-console': 'off',
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

  // Environment-specific configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        Bun: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        Buffer: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        WebSocket: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        structuredClone: 'readonly',
        queueMicrotask: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        EventTarget: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        ByteLengthQueuingStrategy: 'readonly',
        CountQueuingStrategy: 'readonly',
        TextEncoderStream: 'readonly',
        TextDecoderStream: 'readonly',
        CompressionStream: 'readonly',
        DecompressionStream: 'readonly',
      },
    },
  },
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

console.log('✅ ESLint check passed');
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
    console.log('✅ Created tsconfig.lint.json');
    
    // Write pre-commit hook
    await Bun.write('.husky/pre-commit', preCommitHook);
    console.log('✅ Created .husky/pre-commit hook');
    
    console.log('\n🚀 ESLint configuration complete!');
    console.log('Run: bun eslint.config.ts lint');
  } else if (args[0] === 'lint') {
    const exitCode = await runESLint({
      fix: args.includes('--fix'),
      format: args.includes('--json') ? 'json' : 'stylish',
      outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1],
    });
    process.exit(exitCode);
  } else {
    console.log(`
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
