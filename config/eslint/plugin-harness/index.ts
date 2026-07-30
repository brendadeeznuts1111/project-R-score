/**
 * eslint-plugin-harness — FactoryWager harness / boundary rules.
 *
 * Policy SSOT (human): docs/WIRE_BOUNDARY.md
 * Policy SSOT (code):  ./boundary.ts → BOUNDARY_POLICY
 */
import type { ESLint, Linter } from 'eslint';
import {
  BOUNDARY_POLICY,
  noDecodeUnknownOutsideBoundary,
  noUnknownFunctionParamOutsideBoundary,
} from './boundary.ts';

export {
  BOUNDARY_POLICY,
  BOUNDARY_PATH_RE,
  BOUNDARY_FN_NAME_RE,
  DECODE_CALLEE_NAMES,
  isBoundaryFilename,
  isBoundaryFunctionName,
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
  [BOUNDARY_POLICY.eslintRules.decode]: 'error',
};

/**
 * `unknown` as fun arg only at boundary — **error** on full harness.
 * Parse at the edge with parse*, is*, or *FromUnknown names (BOUNDARY_FN_NAME_RE).
 * @see docs/WIRE_BOUNDARY.md
 */
export const harnessBoundaryUnknownParamRules: Linter.RulesRecord = {
  [BOUNDARY_POLICY.eslintRules.unknownParam]: 'error',
};
