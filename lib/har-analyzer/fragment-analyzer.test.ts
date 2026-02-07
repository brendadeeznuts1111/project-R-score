// lib/har-analyzer/fragment-analyzer.test.ts — Tests for fragment classification

import { test, expect, describe, expectTypeOf } from 'bun:test';
import { analyzeFragment } from './fragment-analyzer';
import type { FragmentAnalysis, FragmentType, FragmentBehavior, FragmentContent } from './types';

// ─── Type tests ─────────────────────────────────────────────────────

expectTypeOf(analyzeFragment).toBeFunction();
expectTypeOf(analyzeFragment).parameters.toEqualTypeOf<[fragment?: string]>();
expectTypeOf(analyzeFragment).returns.toEqualTypeOf<FragmentAnalysis>();

expectTypeOf(analyzeFragment('test')).toMatchObjectType<{
  type: FragmentType;
  raw: string;
  content: FragmentContent;
  behavior: FragmentBehavior;
}>();

// ─── Runtime tests ──────────────────────────────────────────────────

describe('analyzeFragment', () => {
  describe('with empty input', () => {
    test('should return empty type and blank raw string for undefined input', () => {
      const result = analyzeFragment(undefined);
      expect(result.type).toBe('empty');
      expect(result.raw).toBe('');
      expect(result.behavior.triggersScroll).toBeFalse();
      expect(result.behavior.requiresJS).toBeFalse();
    });

    test('should return empty type for an empty string', () => {
      const result = analyzeFragment('');
      expect(result.type).toBe('empty');
    });
  });

  describe('with anchor fragments', () => {
    test('should classify a hyphenated identifier as an anchor', () => {
      const result = analyzeFragment('section-1');
      expect(result.type).toBe('anchor');
      expect(result.content.anchor).toBe('section-1');
      expect(result.behavior.triggersScroll).toBeTrue();
      expect(result.behavior.seoFriendly).toBeTrue();
      expect(result.behavior.shareable).toBeTrue();
      expect(result.behavior.requiresJS).toBeFalse();
    });

    test('should classify a single word as an anchor', () => {
      const result = analyzeFragment('top');
      expect(result.type).toBe('anchor');
      expect(result.content.anchor).toBe('top');
    });
  });

  describe('with hashbang fragments', () => {
    test('should classify !/path as hashbang with extracted route', () => {
      const result = analyzeFragment('!/path/to/page');
      expect(result.type).toBe('hashbang');
      expect(result.content.route?.path).toBe('/path/to/page');
      expect(result.behavior.requiresJS).toBeTrue();
      expect(result.behavior.seoFriendly).toBeFalse();
    });

    test('should handle hashbang root path', () => {
      const result = analyzeFragment('!/');
      expect(result.type).toBe('hashbang');
      expect(result.content.route?.path).toBe('/');
    });
  });

  describe('with route fragments', () => {
    test('should parse a multi-segment route path', () => {
      const result = analyzeFragment('/dashboard/settings');
      expect(result.type).toBe('route');
      expect(result.content.route?.path).toBe('/dashboard/settings');
      expect(result.content.route?.query).toEqual({});
      expect(result.behavior.requiresJS).toBeTrue();
      expect(result.behavior.shareable).toBeTrue();
    });

    test('should extract query parameters from a route fragment', () => {
      const result = analyzeFragment('/search?q=hello&page=2');
      expect(result.type).toBe('route');
      expect(result.content.route?.path).toBe('/search');
      expect(result.content.route?.query).toEqual({ q: 'hello', page: '2' });
    });
  });

  describe('with state fragments', () => {
    test('should parse multiple key=value pairs as state', () => {
      const result = analyzeFragment('color=red&size=lg');
      expect(result.type).toBe('state');
      expect(result.content.state).toEqual({ color: 'red', size: 'lg' });
      expect(result.behavior.requiresJS).toBeTrue();
      expect(result.behavior.shareable).toBeFalse();
    });

    test('should parse a single key=value pair as state', () => {
      const result = analyzeFragment('tab=settings');
      expect(result.type).toBe('state');
      expect(result.content.state).toEqual({ tab: 'settings' });
    });
  });

  describe('with media fragments', () => {
    test('should parse t=30 as a 30-second media timestamp', () => {
      const result = analyzeFragment('t=30');
      expect(result.type).toBe('media');
      expect(result.content.media?.type).toBe('t');
      expect(result.content.media?.value).toBe(30);
      expect(result.content.media?.formatted).toBe('30');
      expect(result.behavior.shareable).toBeTrue();
    });

    test('should convert t=1:30 (mm:ss) to 90 seconds', () => {
      const result = analyzeFragment('t=1:30');
      expect(result.type).toBe('media');
      expect(result.content.media?.value).toBe(90);
      expect(result.content.media?.formatted).toBe('1:30');
    });

    test('should convert t=1:05:30 (hh:mm:ss) to total seconds', () => {
      const result = analyzeFragment('t=1:05:30');
      expect(result.type).toBe('media');
      expect(result.content.media?.value).toBe(3930);
      expect(result.content.media?.formatted).toBe('65:30');
    });

    test('should fall back to 0 for non-numeric time value like t=abc', () => {
      const result = analyzeFragment('t=abc');
      expect(result.type).toBe('media');
      expect(result.content.media?.value).toBe(0);
      expect(result.content.media?.formatted).toBe('0');
    });

    test('should fall back to 0 for partially numeric time like t=1:foo', () => {
      const result = analyzeFragment('t=1:foo');
      expect(result.type).toBe('media');
      expect(result.content.media?.value).toBe(0);
    });
  });

  describe('with query fragments', () => {
    test('should parse ?search=foo as a query fragment', () => {
      const result = analyzeFragment('?search=foo');
      expect(result.type).toBe('query');
      expect(result.content.state).toEqual({ search: 'foo' });
      expect(result.behavior.requiresJS).toBeTrue();
    });

    test('should parse multiple query parameters from ?a=1&b=2', () => {
      const result = analyzeFragment('?a=1&b=2');
      expect(result.type).toBe('query');
      expect(result.content.state).toEqual({ a: '1', b: '2' });
    });

    test('should skip empty segments from double ampersands in query', () => {
      const result = analyzeFragment('?a=1&&b=2');
      expect(result.type).toBe('query');
      expect(result.content.state).toEqual({ a: '1', b: '2' });
      expect(result.content.state).not.toHaveProperty('');
    });
  });

  describe('with unknown fragments', () => {
    test('should classify special characters as unknown with no behaviors', () => {
      const result = analyzeFragment('@!$%^');
      expect(result.type).toBe('unknown');
      expect(result.behavior.triggersScroll).toBeFalse();
      expect(result.behavior.requiresJS).toBeFalse();
      expect(result.behavior.shareable).toBeFalse();
    });
  });
});
