// src/types/hyperlink-schema.ts
/**
 * §Pattern:132 - Hyperlink Schema Definition
 * @pattern Pattern:132
 * @perf <1ms validation
 * @roi ∞ (type safety)
 * @section §Types
 */

export interface HyperlinkSchema {
  osc8: {
    prefix: '\u001b]8;;';
    url: string;
    suffix: '\u001b\\';
    text: string;
    reset: '\u001b[0m';
  };
  constraints: {
    maxUrlLength: 2083;
    maxTextLength: 1000;
    minTextLength: 1;
  };
  categories: {
    'metric': { pattern: '^https://r2\\.dev/metric/' };
    'bench': { pattern: '^https://r2\\.dev/bench/' };
    'matrix': { pattern: '^https://dashboards\\.factory-wager\\.com/matrix' };
    'query': { pattern: '^bun://query/' };
    'farm': { pattern: '^bun://farm/' };
    'secrets': { pattern: '^bun://secrets/' };
    'verify': { pattern: '^bun://verify/' };
  };
}

export type HyperlinkCategory = keyof HyperlinkSchema['categories'];
