/**
 * Bun v1.3.7 API Integration Tests
 *
 * Tests for all six native API integrations:
 * - Bun.which()
 * - Bun.randomUUIDv7()
 * - Bun.peek()
 * - Bun.openInEditor()
 * - Bun.deepEquals()
 * - Bun.escapeHTML()
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  ExecutableResolver,
  MonotonicIDGenerator,
  PromiseOptimizer,
  EqualityChecker,
  HTMLEscaper,
  calculateCombinedRScore,
  which,
  generateId,
  escapeHtml,
  deepEqual,
} from './bun-v137-apis';

// ============================================================================
// Bun.which() Tests
// ============================================================================

describe('ExecutableResolver (Bun.which)', () => {
  let resolver: ExecutableResolver;

  beforeEach(() => {
    resolver = new ExecutableResolver();
  });

  it('should resolve bun executable', () => {
    const path = resolver.resolve('bun');
    expect(path).toBeTruthy();
    expect(path).toContain('bun');
  });

  it('should return null for non-existent command', () => {
    const path = resolver.resolve('definitely-not-a-real-command-12345');
    expect(path).toBeNull();
  });

  it('should cache results', () => {
    const path1 = resolver.resolve('bun');
    const path2 = resolver.resolve('bun');
    expect(path1).toBe(path2);
    
    const cache = resolver.getCache();
    expect(cache.has('bun')).toBe(true);
  });

  it('should validate toolchain', () => {
    const { available, missing, allPresent } = resolver.validateToolchain(['bun']);
    expect(available.length).toBe(1);
    expect(missing.length).toBe(0);
    expect(allPresent).toBe(true);
  });

  it('should report missing tools', () => {
    const { missing } = resolver.validateToolchain(['definitely-fake-12345']);
    expect(missing.length).toBe(1);
    expect(missing[0]).toBe('definitely-fake-12345');
  });

  it('should calculate R-Score', () => {
    const score = resolver.calculateRScore();
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe('which() convenience function', () => {
  it('should resolve bun', () => {
    const path = which('bun');
    expect(path).toBeTruthy();
  });

  it('should return null for unknown command', () => {
    expect(which('fake-command-12345')).toBeNull();
  });
});

// ============================================================================
// Bun.randomUUIDv7() Tests
// ============================================================================

describe('MonotonicIDGenerator (Bun.randomUUIDv7)', () => {
  let generator: MonotonicIDGenerator;

  beforeEach(() => {
    generator = new MonotonicIDGenerator();
  });

  it('should generate valid UUID v7', () => {
    const id = generator.generate();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate sortable IDs', () => {
    const id1 = generator.generate();
    const id2 = generator.generate();
    expect(id1).not.toBe(id2);
    // UUID v7 is time-ordered, so later ID should be greater
    expect(id2 > id1).toBe(true);
  });

  it('should generate namespaced IDs', () => {
    const id = generator.generateSortable('scan');
    expect(id.startsWith('scan-')).toBe(true);
    expect(id).toMatch(/^scan-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate sequential IDs', () => {
    const id1 = generator.generateSequential();
    const id2 = generator.generateSequential();
    expect(id2).toBe(id1 + 1);
  });

  it('should generate batch IDs efficiently', () => {
    const ids = generator.generateBatch(100);
    expect(ids.length).toBe(100);
    
    // All IDs should be unique
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it('should calculate R-Score', () => {
    const score = generator.calculateRScore();
    expect(score).toBeGreaterThan(0.85);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe('generateId() convenience function', () => {
  it('should generate UUID without namespace', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate namespaced UUID', () => {
    const id = generateId('task');
    expect(id.startsWith('task-')).toBe(true);
  });
});

// ============================================================================
// Bun.peek() Tests
// ============================================================================

describe('PromiseOptimizer (Bun.peek)', () => {
  it('should return resolved value immediately', () => {
    const promise = Promise.resolve(42);
    const result = PromiseOptimizer.checkResolved(promise);
    
    if (result.resolved) {
      expect(result.value).toBe(42);
    } else {
      throw new Error('Expected resolved promise');
    }
  });

  it('should detect pending promise', () => {
    const promise = new Promise(() => {}); // Never resolves
    const result = PromiseOptimizer.checkResolved(promise);
    expect(result.resolved).toBe(false);
  });

  it('should optimize Promise.all for resolved promises', async () => {
    const promises = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)];
    const result = PromiseOptimizer.optimizedAll(promises);
    
    // Should return array directly for resolved promises
    if (result instanceof Promise) {
      const awaited = await result;
      expect(awaited).toEqual([1, 2, 3]);
    } else {
      expect(result).toEqual([1, 2, 3]);
    }
  });

  it('should fall back to Promise.all for pending promises', async () => {
    const promises = [Promise.resolve(1), new Promise(r => setTimeout(() => r(2), 10))];
    const result = PromiseOptimizer.optimizedAll(promises);
    
    // Should return a Promise
    expect(result instanceof Promise).toBe(true);
    
    if (result instanceof Promise) {
      const awaited = await result;
      expect(awaited).toEqual([1, 2]);
    }
  });

  it('should calculate R-Score', () => {
    const score = PromiseOptimizer.calculateRScore();
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// Bun.deepEquals() Tests
// ============================================================================

describe('EqualityChecker (Bun.deepEquals)', () => {
  it('should compare primitives', () => {
    expect(EqualityChecker.deepEquals(1, 1)).toBe(true);
    expect(EqualityChecker.deepEquals(1, 2)).toBe(false);
    expect(EqualityChecker.deepEquals('hello', 'hello')).toBe(true);
    expect(EqualityChecker.deepEquals('hello', 'world')).toBe(false);
  });

  it('should compare objects deeply', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    const obj3 = { a: 1, b: { c: 3 } };
    
    expect(EqualityChecker.deepEquals(obj1, obj2)).toBe(true);
    expect(EqualityChecker.deepEquals(obj1, obj3)).toBe(false);
  });

  it('should compare arrays', () => {
    expect(EqualityChecker.deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(EqualityChecker.deepEquals([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it('should detect config changes', () => {
    const oldConfig = { version: '1.0.0', strict: true };
    const newConfig = { version: '1.0.0', strict: false };
    
    expect(EqualityChecker.configChanged(oldConfig, newConfig)).toBe(true);
    expect(EqualityChecker.configChanged(oldConfig, oldConfig)).toBe(false);
  });

  it('should find diff paths', () => {
    const oldObj = { a: 1, b: { c: 2, d: 3 } };
    const newObj = { a: 1, b: { c: 99, d: 3 } };
    
    const diffs = EqualityChecker.diffPaths(oldObj, newObj);
    expect(diffs).toContain('b.c');
    expect(diffs).not.toContain('a');
    expect(diffs).not.toContain('b.d');
  });

  it('should handle nested diffs', () => {
    const oldObj = { level1: { level2: { level3: 'value' } } };
    const newObj = { level1: { level2: { level3: 'changed' } } };
    
    const diffs = EqualityChecker.diffPaths(oldObj, newObj);
    expect(diffs).toContain('level1.level2.level3');
  });

  it('should create memoized checker', () => {
    const { check, getStats } = EqualityChecker.createMemoized();
    
    const obj = { a: 1 };
    check(obj, obj);
    check(obj, obj);
    
    const stats = getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should calculate R-Score', () => {
    const score = EqualityChecker.calculateRScore();
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe('deepEqual() convenience function', () => {
  it('should compare values', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

// ============================================================================
// Bun.escapeHTML() Tests
// ============================================================================

describe('HTMLEscaper (Bun.escapeHTML)', () => {
  it('should escape basic HTML entities', () => {
    expect(HTMLEscaper.escape('<script>')).toBe('&lt;script&gt;');
    expect(HTMLEscaper.escape('"quoted"')).toBe('&quot;quoted&quot;');
    expect(HTMLEscaper.escape("'single'")).toBe('&#x27;single&#x27;');
    expect(HTMLEscaper.escape('a & b')).toBe('a &amp; b');
  });

  it('should handle XSS attempts', () => {
    const xss = '<img src=x onerror=alert(1)>';
    const escaped = HTMLEscaper.escape(xss);
    // Angle brackets should be escaped, preventing tag execution
    expect(escaped).toContain('&lt;img');
    expect(escaped).toContain('&gt;');
    expect(escaped).not.toContain('<img');
    expect(escaped.startsWith('&lt;')).toBe(true);
    expect(escaped.endsWith('&gt;')).toBe(true);
  });

  it('should support template literals', () => {
    const userInput = '<script>alert(1)</script>';
    const html = HTMLEscaper.html`<div>${userInput}</div>`;
    expect(html).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  });

  it('should handle multiple interpolations', () => {
    const name = '<b>Admin</b>';
    const id = '123';
    const html = HTMLEscaper.html`<span data-id="${id}">${name}</span>`;
    expect(html).toBe('<span data-id="123">&lt;b&gt;Admin&lt;/b&gt;</span>');
  });

  it('should handle null and undefined in templates', () => {
    const html = HTMLEscaper.html`<div>${null} and ${undefined}</div>`;
    expect(html).toBe('<div> and </div>');
  });

  it('should detect HTML that needs escaping', () => {
    expect(HTMLEscaper.needsEscaping('<script>')).toBe(true);
    expect(HTMLEscaper.needsEscaping('safe text')).toBe(false);
    expect(HTMLEscaper.needsEscaping('a & b')).toBe(true);
  });

  it('should escape only when needed', () => {
    const safe = 'safe text';
    const unsafe = '<script>';
    
    expect(HTMLEscaper.escapeIfNeeded(safe)).toBe('safe text');
    expect(HTMLEscaper.escapeIfNeeded(unsafe)).toBe('&lt;script&gt;');
  });

  it('should batch escape efficiently', () => {
    const inputs = ['<a>', '<b>', '<c>'];
    const escaped = HTMLEscaper.escapeBatch(inputs);
    expect(escaped).toEqual(['&lt;a&gt;', '&lt;b&gt;', '&lt;c&gt;']);
  });

  it('should calculate R-Score', () => {
    const score = HTMLEscaper.calculateRScore();
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe('escapeHtml() convenience function', () => {
  it('should escape HTML', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });
});

// ============================================================================
// Combined R-Score Tests
// ============================================================================

describe('Combined R-Score Calculation', () => {
  it('should calculate combined R-Score', () => {
    const { combined, components } = calculateCombinedRScore();
    
    expect(combined).toBeGreaterThan(0.8);
    expect(combined).toBeLessThanOrEqual(1.0);
    
    // All components should be present
    expect(components).toHaveProperty('executableResolver');
    expect(components).toHaveProperty('monotonicIDGenerator');
    expect(components).toHaveProperty('promiseOptimizer');
    expect(components).toHaveProperty('editorIntegration');
    expect(components).toHaveProperty('equalityChecker');
    expect(components).toHaveProperty('htmlEscaper');
    
    // All components should have valid scores
    for (const [name, score] of Object.entries(components)) {
      expect(score, `Component ${name} should have valid score`).toBeGreaterThan(0);
      expect(score, `Component ${name} should have valid score`).toBeLessThanOrEqual(1);
    }
  });
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('Performance Benchmarks', () => {
  it('Bun.which should be fast', () => {
    const resolver = new ExecutableResolver();
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < 1000; i++) {
      resolver.resolve('bun');
    }
    
    const elapsed = (Bun.nanoseconds() - start) / 1e6;
    expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
  });

  it('Bun.randomUUIDv7 should be fast', () => {
    const generator = new MonotonicIDGenerator();
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < 10000; i++) {
      generator.generate();
    }
    
    const elapsed = (Bun.nanoseconds() - start) / 1e6;
    expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
  });

  it('Bun.deepEquals should be fast for large objects', () => {
    const obj = {
      nested: {
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
      },
    };
    
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < 1000; i++) {
      EqualityChecker.deepEquals(obj, obj);
    }
    
    const elapsed = (Bun.nanoseconds() - start) / 1e6;
    expect(elapsed).toBeLessThan(500); // Should complete in under 500ms
  });

  it('Bun.escapeHTML should be fast for large strings', () => {
    const html = '<script>alert("xss")</script>'.repeat(10000);
    
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < 100; i++) {
      HTMLEscaper.escape(html);
    }
    
    const elapsed = (Bun.nanoseconds() - start) / 1e6;
    expect(elapsed).toBeLessThan(1000); // Should complete in under 1s
  });
});
