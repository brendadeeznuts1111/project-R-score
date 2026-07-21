/**
 * FactoryWager project-specific ESLint overlays (not global Bun harness rules).
 */
import type { Linter } from 'eslint';

export const projectNamingConvention: Linter.RulesRecord = {
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'variable',
      modifiers: ['const', 'exported'],
      format: ['UPPER_CASE'],
      leadingUnderscore: 'forbid',
      trailingUnderscore: 'forbid',
      filter: { regex: '^[A-Z][A-Z0-9_]+$', match: true },
      custom: { regex: '^(BUN|LEVENSHTEIN)_[A-Z0-9_]+$', match: true },
    },
    {
      selector: 'variable',
      modifiers: ['const', 'exported'],
      format: ['PascalCase', 'camelCase'],
      filter: { regex: '^[A-Z][A-Z0-9_]+$', match: false },
    },
    {
      selector: 'variable',
      modifiers: ['const'],
      format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'forbid',
      filter: { regex: '^(BUN|LEVENSHTEIN)_', match: false },
    },
    {
      selector: ['class', 'interface', 'typeAlias', 'enum'],
      modifiers: ['exported'],
      format: ['PascalCase'],
      leadingUnderscore: 'forbid',
      custom: { regex: '^[A-Z][a-zA-Z0-9]*$', match: true },
    },
    {
      selector: ['classProperty', 'classMethod', 'accessor'],
      modifiers: ['private'],
      format: ['camelCase'],
      leadingUnderscore: 'require',
    },
    {
      selector: ['classProperty', 'classMethod', 'accessor'],
      modifiers: ['protected'],
      format: ['camelCase'],
      leadingUnderscore: 'allow',
    },
    {
      selector: ['classProperty', 'classMethod', 'accessor'],
      modifiers: ['public'],
      format: ['camelCase'],
      leadingUnderscore: 'forbid',
    },
    { selector: 'function', format: ['camelCase'], leadingUnderscore: 'forbid' },
    { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
    {
      selector: 'typeParameter',
      format: ['PascalCase'],
      prefix: ['T'],
      custom: { regex: '^T[A-Z][a-zA-Z0-9]*$', match: true },
    },
    { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
  ],
};

export const projectBunColorRestrictions: Linter.RulesRecord = {
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.object.name='Bun'][callee.property.name='color']",
      message:
        'Direct Bun.color() is forbidden. Use utilities from lib/constants/color-constants.ts or lib/theme/colors.ts instead.',
    },
    {
      selector: "MemberExpression[object.name='Bun'][property.name='color']",
      message:
        'Direct Bun.color access is forbidden. Use utilities from lib/constants/color-constants.ts or lib/theme/colors.ts instead.',
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'bun',
          importNames: ['color'],
          message:
            'Import color utilities from lib/constants/color-constants.ts or lib/theme/colors.ts instead of directly from bun.',
        },
      ],
    },
  ],
};

export const projectImportRules: Linter.RulesRecord = {
  'import/no-default-export': 'error',
};

/** Project-specific ESLint config blocks to spread into root eslint.config.ts */
export const projectEslintConfig: Linter.Config[] = [
  {
    name: 'factorywager/project-core',
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      ...projectNamingConvention,
      ...projectBunColorRestrictions,
      ...projectImportRules,
    },
  },
  {
    name: 'factorywager/project-ai-legacy',
    files: ['lib/ai/**/*.ts', 'lib/ai/**/*.tsx'],
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-depth': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/consistent-generic-constructors': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'import/order': 'off',
      'import/no-duplicates': 'off',
      'import/no-default-export': 'off',
      'prefer-template': 'off',
      'object-shorthand': 'off',
      'arrow-body-style': 'off',
    },
  },
  {
    name: 'factorywager/project-ai-hardened',
    files: [
      'lib/ai/ai-operations-manager.ts',
      'lib/ai/anomaly-detector.ts',
    ],
    rules: {
      'import/order': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/promise-function-async': 'error',
    },
  },
  {
    name: 'factorywager/project-wiki-legacy',
    files: [
    ],
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-depth': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/consistent-generic-constructors': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'import/order': 'off',
      'import/no-duplicates': 'off',
      'import/no-default-export': 'off',
      'prefer-template': 'off',
      'object-shorthand': 'off',
    },
  },
];

export default projectEslintConfig;
