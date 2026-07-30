/**
 * Global Bun harness ESLint config — lightweight, no type-checked project parsing.
 *
 * Wire boundary (parse once): docs/WIRE_BOUNDARY.md
 * Rules: config/eslint/plugin-harness/boundary.ts (BOUNDARY_POLICY)
 */
import tseslint from 'typescript-eslint';
import bunPlugin, { bunPluginRules } from './config/eslint/plugin-bun/index.ts';
import harnessPlugin, {
  harnessBoundaryDecodeRules,
  harnessBoundaryUnknownParamRules,
} from './config/eslint/plugin-harness/index.ts';
import { bunNativeLintRollout } from './config/eslint/harness/bun-native.ts';
import { HARNESS_BUN_GLOBALS, HARNESS_PATHS } from './config/eslint/harness/rollout.ts';

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
      // unknown params: error on full harness
      ...harnessBoundaryUnknownParamRules,
    },
  },
  bunNativeLintRollout
);
