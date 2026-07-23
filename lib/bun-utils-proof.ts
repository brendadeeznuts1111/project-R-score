// @see https://bun.com/docs/runtime/utils — Bun.inspect · .table · stringWidth · deepEquals
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Bun core-utils behavioral proof — stringWidth, deepEquals, inspect(depth).
 *
 * Produces a stable JSON record + SHA-256 proof hash for a given Bun version.
 * Baselines match **Bun runtime** (not Node util.inspect / string-width packages).
 */
import { inspect, stringWidth } from 'bun';
// Prefer strict shape: Bun.deepEquals(a, b, true)
import { deepEquals, deepEqualsLoose } from './deep-equals.ts';

export type BunUtilsCase = {
  utility: string;
  input: string;
  expected: unknown;
  actual: unknown;
  note: string;
  /** When set, pass uses this instead of Object.is(actual, expected). */
  pass?: boolean;
};

export type BunUtilsProofResult = {
  schemaVersion: 1;
  bunVersion: string;
  bunRevision: string;
  timestamp: string;
  testCases: BunUtilsCase[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  /** SHA-256 hex of canonical proof body (excludes this field). */
  proofHash?: string;
};

export type BuildBunUtilsProofOpts = {
  /** Override clock for tests. */
  now?: () => Date;
  /** Override version fields for tests. */
  bunVersion?: string;
  bunRevision?: string;
};

/** Stable JSON for hashing (sorted object keys, no whitespace variance). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = sortKeys(obj[k]);
  }
  return out;
}

export function sha256Hex(payload: string): string {
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex');
}

/**
 * Inspect depth semantics for Bun:
 * - depth 0 truncates first nested object to `[Object …]`
 * - depth 1 shows one level then truncates
 * - default (Bun.inspect default depth 2) still truncates `d` under `{a:{b:{c:{d}}}}`
 *   while expanding through `c`; full leaf appears at depth ≥ 3 or unlimited.
 */
export function inspectDepthPasses(actual: string, depth: 0 | 1 | 'default'): boolean {
  const compact = actual.replace(/\s+/g, ' ').trim();
  if (depth === 0) {
    return /a:\s*\[Object/.test(compact) && !/\bb:\s*\{/.test(compact);
  }
  if (depth === 1) {
    return /b:\s*\[Object/.test(compact) && !/\bc:\s*\{/.test(compact);
  }
  // default: shows c, truncates d (depth 2) OR expands fully — both OK if structure present
  return /a:\s*\{/.test(compact) && /b:\s*\{/.test(compact) && /c:\s*\{/.test(compact);
}

export function buildTestCases(): BunUtilsCase[] {
  const deep = { a: { b: { c: { d: 'e' } } } };
  const i0 = inspect(deep, { depth: 0 });
  const i1 = inspect(deep, { depth: 1 });
  const iDef = inspect(deep);

  const widthHello = stringWidth('hello');
  const widthEmoji = stringWidth('👨‍👩‍👧‍👦');
  const widthCjk = stringWidth('こんにちは');

  return [
    {
      utility: 'stringWidth',
      input: 'hello',
      expected: 5,
      actual: widthHello,
      note: 'ASCII',
    },
    {
      utility: 'stringWidth',
      input: '👨‍👩‍👧‍👦',
      // Bun measures ZWJ family as width 2 (not npm string-width's 1 / 2 variants).
      expected: 2,
      actual: widthEmoji,
      note: 'Emoji ZWJ family (Bun baseline)',
    },
    {
      utility: 'stringWidth',
      input: 'こんにちは',
      // Fullwidth CJK: 5 chars × 2 columns = 10.
      expected: 10,
      actual: widthCjk,
      note: 'CJK fullwidth (Bun baseline)',
    },
    {
      utility: 'deepEquals(strict)',
      input: '{a:1} == {a:1}',
      expected: true,
      actual: deepEquals({ a: 1 }, { a: 1 }),
      note: 'Same plain object · Bun.deepEquals(a,b,true)',
    },
    {
      utility: 'deepEquals(strict)',
      input: '{a:1} == {a:2}',
      expected: false,
      actual: deepEquals({ a: 1 }, { a: 2 }),
      note: 'Different value',
    },
    {
      utility: 'deepEquals(strict)',
      input: '[1,2] == [1,2]',
      expected: true,
      actual: deepEquals([1, 2], [1, 2]),
      note: 'Same array',
    },
    {
      utility: 'deepEquals(strict)',
      input: '[1,2] == [1,3]',
      expected: false,
      actual: deepEquals([1, 2], [1, 3]),
      note: 'Different array',
    },
    {
      utility: 'deepEquals(strict)',
      input: '{entries:[1,2]} vs +extra:undefined',
      expected: false,
      actual: (() => {
        const a = { entries: [1, 2] };
        const b = { entries: [1, 2], extra: undefined };
        return deepEquals(a, b); // strict default → false
      })(),
      note: 'undefined key ≠ missing (docs shape we want)',
    },
    {
      utility: 'deepEquals(loose)',
      input: '{entries:[1,2]} vs +extra:undefined',
      expected: true,
      actual: (() => {
        const a = { entries: [1, 2] };
        const b = { entries: [1, 2], extra: undefined };
        return deepEqualsLoose(a, b);
      })(),
      note: 'Bun.deepEquals(a,b) loose for contrast',
    },
    {
      utility: 'inspect (depth:0)',
      input: 'depth:0',
      expected: 'truncates at a → [Object …]',
      actual: i0,
      note: 'No recursion',
      pass: inspectDepthPasses(i0, 0),
    },
    {
      utility: 'inspect (depth:1)',
      input: 'depth:1',
      expected: 'shows b then [Object …]',
      actual: i1,
      note: 'One level',
      pass: inspectDepthPasses(i1, 1),
    },
    {
      utility: 'inspect (default)',
      input: 'default depth',
      expected: 'shows a.b.c structure',
      actual: iDef,
      note: 'Default depth ≥ 2',
      pass: inspectDepthPasses(iDef, 'default'),
    },
  ];
}

function casePassed(c: BunUtilsCase): boolean {
  if (typeof c.pass === 'boolean') return c.pass;
  return Object.is(c.actual, c.expected);
}

export function buildBunUtilsProof(opts: BuildBunUtilsProofOpts = {}): BunUtilsProofResult {
  const now = opts.now?.() ?? new Date();
  const testCases = buildTestCases();
  const passed = testCases.filter(casePassed).length;
  const body: BunUtilsProofResult = {
    schemaVersion: 1,
    bunVersion: opts.bunVersion ?? Bun.version,
    bunRevision: opts.bunRevision ?? (Bun.revision || 'unknown'),
    timestamp: now.toISOString(),
    testCases,
    summary: {
      total: testCases.length,
      passed,
      failed: testCases.length - passed,
    },
  };

  // Hash without proofHash field; attach after.
  const proofHash = sha256Hex(canonicalJson(body));
  return { ...body, proofHash };
}

export function tableRows(result: BunUtilsProofResult): Record<string, unknown>[] {
  return result.testCases.map(c => {
    const ok = typeof c.pass === 'boolean' ? c.pass : Object.is(c.actual, c.expected);
    return {
      Utility: c.utility,
      Input: c.input,
      Actual: typeof c.actual === 'string' ? c.actual.replace(/\n/g, '↵').slice(0, 48) : c.actual,
      Expected: c.expected,
      Note: c.note,
      Match: ok ? 'pass' : 'FAIL',
    };
  });
}
