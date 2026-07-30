import { describe, expect, test } from 'bun:test';
import { findTierAInTree, summarizeWhy } from '../scripts/inventory-wrappers.ts';

describe('findTierAInTree', () => {
  test('extracts versions for Tier-A names from pm ls text', () => {
    const tree = `
├── chalk@4.1.2
│   └── strip-ansi@6.0.1
├── chalk@5.6.2
└── @iarna/toml@2.2.5
`;
    const hits = findTierAInTree(tree, ['chalk', 'strip-ansi', '@iarna/toml', 'toml']);
    expect([...hits.get('chalk')!].sort()).toEqual(['4.1.2', '5.6.2']);
    expect([...hits.get('strip-ansi')!]).toEqual(['6.0.1']);
    expect([...hits.get('@iarna/toml')!]).toEqual(['2.2.5']);
    expect(hits.has('toml')).toBe(false);
  });
});

describe('summarizeWhy', () => {
  test('returns first parent package from bun why text', () => {
    const why = `chalk@4.1.2
  └─ eslint@9.39.4 (requires ^4.0.0)
     └─ dev factorywager-enterprise (requires 9.39.4)
`;
    expect(summarizeWhy(why, 'chalk')).toBe('eslint@9.39.4');
  });
});
