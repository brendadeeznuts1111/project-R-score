/**
 * Global Bun harness ESLint config — lightweight, no type-checked project parsing.
 */
import tseslint from 'typescript-eslint';
import bunPlugin, { bunPluginRules } from './config/eslint/plugin-bun/index.ts';
import { bunNativeLintRollout, bunNativeLintStrict } from './config/eslint/harness/bun-native.ts';
import { HARNESS_BUN_GLOBALS, HARNESS_PATHS } from './config/eslint/harness/rollout.ts';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'projects/**'],
  },
  {
    files: [...HARNESS_PATHS],
    plugins: {
      bun: bunPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: HARNESS_BUN_GLOBALS,
    },
    rules: {
      ...bunPluginRules,
    },
  },
  bunNativeLintStrict,
  bunNativeLintRollout
);
