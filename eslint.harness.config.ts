/**
 * Global Bun harness ESLint config — lightweight, no type-checked project parsing.
 *
 * Boundary rules (harness-engineering): decodeUnknown* + unknown params only
 * at the wire edge — see config/eslint/plugin-harness/boundary.ts.
 */
import tseslint from 'typescript-eslint';
import bunPlugin, { bunPluginRules } from './config/eslint/plugin-bun/index.ts';
import harnessPlugin, {
  harnessBoundaryDecodeRules,
  harnessBoundaryUnknownParamRules,
  harnessBoundaryStrictRules,
} from './config/eslint/plugin-harness/index.ts';
import { bunNativeLintRollout, bunNativeLintStrict } from './config/eslint/harness/bun-native.ts';
import {
  HARNESS_BUN_GLOBALS,
  HARNESS_PATHS,
  STRICT_INVENTORY,
} from './config/eslint/harness/rollout.ts';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'projects/**'],
  },
  {
    files: [...HARNESS_PATHS],
    plugins: {
      bun: bunPlugin,
      harness: harnessPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: HARNESS_BUN_GLOBALS,
    },
    rules: {
      ...bunPluginRules,
      // Decode: always error (parse once at boundary)
      ...harnessBoundaryDecodeRules,
      // unknown params: warn on full harness (rollout)
      ...harnessBoundaryUnknownParamRules,
    },
  },
  // Branded forge + explicit boundary dirs: full error tier
  {
    name: 'factorywager/harness-boundary-strict-paths',
    files: [
      'lib/types/**/*.ts',
      'lib/security/**/*.ts',
      'lib/core/**/*.ts',
      '**/boundary/**/*.ts',
      '**/wire/**/*.ts',
      '**/ingress/**/*.ts',
    ],
    plugins: { harness: harnessPlugin },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: HARNESS_BUN_GLOBALS,
    },
    rules: {
      ...harnessBoundaryStrictRules,
    },
  },
  // STRICT_INVENTORY: same full error tier
  {
    name: 'factorywager/harness-boundary-strict-inventory',
    files: [...STRICT_INVENTORY],
    plugins: { harness: harnessPlugin },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: HARNESS_BUN_GLOBALS,
    },
    rules: {
      ...harnessBoundaryStrictRules,
    },
  },
  bunNativeLintStrict,
  bunNativeLintRollout
);
