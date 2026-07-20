/**
 * eslint-plugin-harness — FactoryWager harness / boundary rules.
 */
import type { ESLint, Linter } from 'eslint';
import {
  noDecodeUnknownOutsideBoundary,
  noUnknownFunctionParamOutsideBoundary,
} from './boundary.ts';

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-harness',
    version: '1.0.0',
  },
  rules: {
    'no-decode-unknown-outside-boundary': noDecodeUnknownOutsideBoundary,
    'no-unknown-function-param': noUnknownFunctionParamOutsideBoundary,
  },
};

export default plugin;

/** Decode at edge only — error everywhere (safe; rare call sites). */
export const harnessBoundaryDecodeRules: Linter.RulesRecord = {
  'harness/no-decode-unknown-outside-boundary': 'error',
};

/**
 * `unknown` as fun arg only at boundary.
 * Warn on full harness (rollout); agents must not introduce new ones without
 * boundary placement or eslint-disable with justification.
 */
export const harnessBoundaryUnknownParamRules: Linter.RulesRecord = {
  'harness/no-unknown-function-param': 'warn',
};

/** Strict tier: both rules error. */
export const harnessBoundaryStrictRules: Linter.RulesRecord = {
  'harness/no-decode-unknown-outside-boundary': 'error',
  'harness/no-unknown-function-param': 'error',
};
