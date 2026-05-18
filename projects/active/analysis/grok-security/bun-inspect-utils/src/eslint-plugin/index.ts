/**
 * [SECURITY][LINTING][PLUGIN][META:{VERSION:1.0.0}][#REF:ESLint,table-enforcement]{BUN-NATIVE}
 * @bun/eslint-plugin-inspect-tables - ESLint plugin for table enforcement
 */

import minColumnsRule from "./rules/min-columns";
import { GENERIC_COLUMNS } from "../core/domain-models";

/**
 * ESLint plugin for Bun.inspect.table() enforcement
 * @example
 * // .eslintrc.json
 * {
 *   "plugins": ["@bun/eslint-plugin-inspect-tables"],
 *   "rules": {
 *     "bun-tables/min-columns": ["error", { "minColumns": 6 }]
 *   }
 * }
 */
const plugin = {
  rules: {
    "min-columns": minColumnsRule,
  },
  configs: {
    recommended: {
      plugins: ["@bun/eslint-plugin-inspect-tables"],
      rules: {
        "@bun/eslint-plugin-inspect-tables/min-columns": [
          "warn",
          { minColumns: 6, genericColumns: GENERIC_COLUMNS },
        ],
      },
    },
    strict: {
      plugins: ["@bun/eslint-plugin-inspect-tables"],
      rules: {
        "@bun/eslint-plugin-inspect-tables/min-columns": [
          "error",
          { minColumns: 6, genericColumns: GENERIC_COLUMNS },
        ],
      },
    },
  },
};

export default plugin;
