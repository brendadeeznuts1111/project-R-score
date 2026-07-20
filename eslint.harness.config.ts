/**
 * Global Bun harness ESLint config — lightweight, no type-checked project parsing.
 *
 * Wire boundary (parse once): docs/WIRE_BOUNDARY.md
 * Rules: config/eslint/plugin-harness/boundary.ts (BOUNDARY_POLICY)
 */
import tseslint from 'typescript-eslint';
import bunPlugin, { bunPluginRules } from './config/eslint/plugin-bun/index.ts';
import harnessPlugin, {
  HARNESS_BOUNDARY_STRICT_FILE_GLOBS,
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
    name: 'factorywager/harness-default',
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
      // Decode: always error (parse once at boundary) — docs/WIRE_BOUNDARY.md
      ...harnessBoundaryDecodeRules,
      // unknown params: warn on full harness (rollout)
      ...harnessBoundaryUnknownParamRules,
    },
  },
  // Branded forge + explicit boundary dirs: full error tier
  {
    name: 'factorywager/harness-boundary-strict-paths',
    files: [...HARNESS_BOUNDARY_STRICT_FILE_GLOBS],
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
