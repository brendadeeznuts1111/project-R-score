#!/usr/bin/env bun

/**
 * URL Handler Unit Tests
 *
 * Comprehensive tests for URL parsing, validation, and fragment handling
 */

import { describe, test, expect } from "bun:test";
import {
  EnhancedURL,
  URLHandler,
  URLFragmentUtils,
  FactoryWagerURLUtils
} from '../lib/core/url-handler.ts';
import { ValidationError } from '../lib/core/error-handling.ts';

describe('EnhancedURL', () => {
  test('should parse basic URL components', () => {
    const url = new EnhancedURL('https://example.com:8080/path/to/file?param=value&other=123#section-1');

    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('example.com');
    expect(url.port).toBe(8080);
    expect(url.pathname).toBe('/path/to/file');
    expect(url.search).toBe('?param=value&other=123');
    expect(url.fragment).toBe('section-1');
    expect(url.hash).toBe('#section-1');
    expect(url.hasFragment()).toBe(true);
  });

  test('should handle URLs without fragments', () => {
    const url = new EnhancedURL('https://example.com/path');

    expect(url.fragment).toBe('');
    expect(url.hash).toBe('');
    expect(url.hasFragment()).toBe(false);
  });

  test('should handle URLs with empty fragments', () => {
    const url = new EnhancedURL('https://example.com/path#');

    expect(url.fragment).toBe('');
    expect(url.hash).toBe('#');
    expect(url.hasFragment()).toBe(false);
  });

  test('should modify fragments correctly', () => {
    const url = new EnhancedURL('https://example.com/path');

    const withFragment = url.withFragment('test');
    expect(withFragment.hash).toBe('#test');

    const withoutFragment = withFragment.withoutFragment();
    expect(withoutFragment.hash).toBe('');
  });

  test('should handle search parameters', () => {
    const url = new EnhancedURL('https://example.com/path?param1=value1&param2=value2');

    expect(url.searchParams.get('param1')).toBe('value1');
    expect(url.searchParams.get('param2')).toBe('value2');

    const withNewParam = url.withSearchParam('param3', 'value3');
    expect(withNewParam.searchParams.get('param3')).toBe('value3');

    const withoutParam = withNewParam.withoutSearchParam('param1');
    expect(withoutParam.searchParams.get('param1')).toBe(null);
  });

  test('should handle relative URLs with base', () => {
    const url = new EnhancedURL('/relative/path', 'https://example.com/base/');

    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('example.com');
    expect(url.pathname).toBe('/relative/path');
  });

  test('should throw error for invalid URLs', () => {
    expect(() => new EnhancedURL('not-a-valid-url')).toThrow();
  });
});

describe('URLHandler', () => {
  describe('parse', () => {
    test('should parse valid URLs', () => {
      const url = URLHandler.parse('https://example.com/path#fragment');

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('example.com');
      expect(url.fragment).toBe('fragment');
    });

    test('should sanitize input', () => {
      const url = URLHandler.parse('  https://example.com/path  ');

      expect(url.toString()).toBe('https://example.com/path');
    });

    test('should reject empty URLs', () => {
      expect(() => URLHandler.parse('')).toThrow();
    });

    test('should reject overly long URLs', () => {
      const longURL = 'https://example.com/' + 'a'.repeat(3000);
      expect(() => URLHandler.parse(longURL)).toThrow();
    });
  });

  describe('validate', () => {
    test('should validate HTTPS URLs', () => {
      expect(URLHandler.validate('https://example.com', { requireHTTPS: true })).toBe(true);
      expect(URLHandler.validate('http://example.com', { requireHTTPS: true })).toBe(false);
    });

    test('should validate allowed protocols', () => {
      const options = { allowedProtocols: ['https:', 'wss:'] };

      expect(URLHandler.validate('https://example.com', options)).toBe(true);
      expect(URLHandler.validate('wss://example.com', options)).toBe(true);
      expect(URLHandler.validate('http://example.com', options)).toBe(false);
      expect(URLHandler.validate('ftp://example.com', options)).toBe(false);
    });

    test('should validate allowed hosts', () => {
      const options = { allowedHosts: ['example.com', 'test.com'] };

      expect(URLHandler.validate('https://example.com', options)).toBe(true);
      expect(URLHandler.validate('https://test.com', options)).toBe(true);
      expect(URLHandler.validate('https://other.com', options)).toBe(false);
    });

    test('should validate fragment allowance', () => {
      expect(URLHandler.validate('https://example.com#fragment', { allowFragments: true })).toBe(true);
      expect(URLHandler.validate('https://example.com#fragment', { allowFragments: false })).toBe(false);
    });
  });

  describe('fragment operations', () => {
    test('should extract fragments', () => {
      expect(URLHandler.getFragment('https://example.com/path#test-fragment')).toBe('test-fragment');
      expect(URLHandler.getFragment('https://example.com/path')).toBe('');
      expect(URLHandler.getFragment('https://example.com/path#')).toBe('');
    });

    test('should remove fragments', () => {
      expect(
        URLHandler.removeFragment('https://example.com/path#fragment')
      ).toBe('https://example.com/path');
      expect(
        URLHandler.removeFragment('https://example.com/path')
      ).toBe('https://example.com/path');
    });

    test('should add fragments', () => {
      expect(
        URLHandler.addFragment('https://example.com/path', 'new-fragment')
      ).toBe('https://example.com/path#new-fragment');
      expect(
        URLHandler.addFragment('https://example.com/path', '#existing-fragment')
      ).toBe('https://example.com/path#existing-fragment');
    });

    test('should check for fragments', () => {
      expect(URLHandler.hasFragment('https://example.com/path#fragment')).toBe(true);
      expect(URLHandler.hasFragment('https://example.com/path')).toBe(false);
      expect(URLHandler.hasFragment('https://example.com/path#')).toBe(false);
    });
  });

  describe('search parameter operations', () => {
    test('should get search parameters', () => {
      const params = URLHandler.getSearchParams('https://example.com/path?param1=value1&param2=value2');

      expect(params).not.toBeNull();
      expect(params!.get('param1')).toBe('value1');
      expect(params!.get('param2')).toBe('value2');
    });

    test('should get specific search parameter', () => {
      expect(
        URLHandler.getSearchParam('https://example.com/path?param1=value1&param2=value2', 'param1')
      ).toBe('value1');
      expect(
        URLHandler.getSearchParam('https://example.com/path?param1=value1&param2=value2', 'nonexistent')
      ).toBe(null);
    });
  });

  describe('build and normalize', () => {
    test('should build URL from components', () => {
      const components = {
        protocol: 'https:',
        hostname: 'example.com',
        port: 8080,
        pathname: '/path',
        search: '?param=value',
        fragment: 'section'
      };

      const url = URLHandler.build(components);
      expect(url).toBe('https://example.com:8080/path?param=value#section');
    });

    test('should normalize URLs', () => {
      const normalized = URLHandler.normalize('HTTPS://EXAMPLE.COM/PATH/?b=2&a=1');
      expect(normalized).toBe('https://example.com/PATH?a=1&b=2');
    });

    test('should compare URLs without fragments', () => {
      expect(
        URLHandler.compareWithoutFragment(
          'https://example.com/path#fragment1',
          'https://example.com/path#fragment2'
        )
      ).toBe(true);
      expect(
        URLHandler.compareWithoutFragment(
          'https://example.com/path1',
          'https://example.com/path2'
        )
      ).toBe(false);
    });
  });

  describe('utility methods', () => {
    test('should extract domain', () => {
      expect(URLHandler.getDomain('https://example.com/path')).toBe('example.com');
      expect(URLHandler.getDomain('https://sub.example.com/path')).toBe('sub.example.com');
      expect(URLHandler.getDomain('invalid-url')).toBe('');
    });

    test('should check if URL is absolute', () => {
      expect(URLHandler.isAbsolute('https://example.com/path')).toBe(true);
      expect(URLHandler.isAbsolute('http://example.com')).toBe(true);
      expect(URLHandler.isAbsolute('/relative/path')).toBe(false);
      expect(URLHandler.isAbsolute('relative-path')).toBe(false);
    });

    test('should resolve relative URLs', () => {
      expect(
        URLHandler.resolve('https://example.com/base/', 'relative/path')
      ).toBe('https://example.com/base/relative/path');
      expect(
        URLHandler.resolve('https://example.com/base/', '/absolute/path')
      ).toBe('https://example.com/absolute/path');
    });
  });
});

describe('URLFragmentUtils', () => {
  describe('parseFragment', () => {
    test('should parse simple fragment', () => {
      const params = URLFragmentUtils.parseFragment('key1=value1&key2=value2');

      expect(params.key1).toBe('value1');
      expect(params.key2).toBe('value2');
    });

    test('should handle empty values', () => {
      const params = URLFragmentUtils.parseFragment('key1=&key2=value2');

      expect(params.key1).toBe('');
      expect(params.key2).toBe('value2');
    });

    test('should handle URL encoding', () => {
      const params = URLFragmentUtils.parseFragment('key=hello%20world&special=%26%3D');

      expect(params.key).toBe('hello world');
      expect(params.special).toBe('&=');
    });

    test('should handle empty fragments', () => {
      const params = URLFragmentUtils.parseFragment('');
      expect(Object.keys(params).length).toBe(0);

      const params2 = URLFragmentUtils.parseFragment('#');
      expect(Object.keys(params2).length).toBe(0);
    });
  });

  describe('buildFragment', () => {
    test('should build simple fragment', () => {
      const fragment = URLFragmentUtils.buildFragment({
        key1: 'value1',
        key2: 'value2'
      });

      expect(fragment).toBe('#key1=value1&key2=value2');
    });

    test('should handle URL encoding', () => {
      const fragment = URLFragmentUtils.buildFragment({
        key: 'hello world',
        special: '&='
      });

      expect(fragment).toBe('#key=hello%20world&special=%26%3D');
    });

    test('should handle empty objects', () => {
      const fragment = URLFragmentUtils.buildFragment({});
      expect(fragment).toBe('');
    });

    test('should filter empty keys', () => {
      const fragment = URLFragmentUtils.buildFragment({
        '': 'empty-key',
        valid: 'valid-key'
      });

      expect(fragment).toBe('#valid=valid-key');
    });
  });

  describe('fragment parameter operations', () => {
    test('should get fragment parameter', () => {
      const value = URLFragmentUtils.getFragmentParam(
        'https://example.com/path#key1=value1&key2=value2',
        'key1'
      );

      expect(value).toBe('value1');
    });

    test('should set fragment parameter', () => {
      const url = URLFragmentUtils.setFragmentParam(
        'https://example.com/path#existing=value',
        'newKey',
        'newValue'
      );

      expect(url.includes('newKey=newValue')).toBe(true);
      expect(url.includes('existing=value')).toBe(true);
    });

    test('should remove fragment parameter', () => {
      const url = URLFragmentUtils.removeFragmentParam(
        'https://example.com/path#key1=value1&key2=value2',
        'key1'
      );

      expect(url.includes('key1=value1')).toBe(false);
      expect(url.includes('key2=value2')).toBe(true);
    });

    test('should remove entire fragment when empty', () => {
      const url = URLFragmentUtils.removeFragmentParam(
        'https://example.com/path#onlyKey=value',
        'onlyKey'
      );

      expect(url).toBe('https://example.com/path');
    });

    test('should check for fragment parameters', () => {
      expect(URLFragmentUtils.hasFragmentParams('https://example.com/path#key=value')).toBe(true);
      expect(URLFragmentUtils.hasFragmentParams('https://example.com/path#simple')).toBe(false);
      expect(URLFragmentUtils.hasFragmentParams('https://example.com/path')).toBe(false);
    });
  });
});

describe('FactoryWagerURLUtils', () => {
  describe('createAPIURL', () => {
    test('should create API URL with path', () => {
      const url = FactoryWagerURLUtils.createAPIURL('/test/endpoint');
      expect(url).toBe('https://factory-wager.com/api/test/endpoint');
    });

    test('should create API URL with parameters', () => {
      const url = FactoryWagerURLUtils.createAPIURL('/test', {
        param1: 'value1',
        param2: 'value2'
      });

      expect(url.includes('https://factory-wager.com/api/test')).toBe(true);
      expect(url.includes('param1=value1')).toBe(true);
      expect(url.includes('param2=value2')).toBe(true);
    });

    test('should handle path without leading slash', () => {
      const url = FactoryWagerURLUtils.createAPIURL('test/endpoint');
      expect(url).toBe('https://factory-wager.com/api/test/endpoint');
    });
  });

  describe('createDashboardURL', () => {
    test('should create dashboard URL', () => {
      const url = FactoryWagerURLUtils.createDashboardURL();
      expect(url).toBe('https://dashboard.factory-wager.com');
    });

    test('should create dashboard URL with section', () => {
      const url = FactoryWagerURLUtils.createDashboardURL('analytics');
      expect(url).toBe('https://dashboard.factory-wager.com/analytics');
    });

    test('should create dashboard URL with fragment', () => {
      const url = FactoryWagerURLUtils.createDashboardURL('analytics', {
        tab: 'overview',
        period: '7d'
      });

      expect(url.includes('https://dashboard.factory-wager.com/analytics')).toBe(true);
      expect(url.includes('tab=overview')).toBe(true);
      expect(url.includes('period=7d')).toBe(true);
    });
  });

  describe('createR2BrowserURL', () => {
    test('should create R2 browser URL', () => {
      const url = FactoryWagerURLUtils.createR2BrowserURL();
      expect(url).toBe('https://r2.factory-wager.com');
    });

    test('should create R2 browser URL with category', () => {
      const url = FactoryWagerURLUtils.createR2BrowserURL('diagnoses');
      expect(url).toBe('https://r2.factory-wager.com/diagnoses');
    });

    test('should create R2 browser URL with object fragment', () => {
      const url = FactoryWagerURLUtils.createR2BrowserURL('diagnoses', 'test-key.json');

      expect(url.includes('https://r2.factory-wager.com/diagnoses')).toBe(true);
      expect(url.includes('key=test-key.json')).toBe(true);
      expect(url.includes('view=object')).toBe(true);
    });
  });

  describe('validateFactoryWagerURL', () => {
    test('should validate FactoryWager URLs', () => {
      expect(FactoryWagerURLUtils.validateFactoryWagerURL('https://factory-wager.com')).toBe(true);
      expect(FactoryWagerURLUtils.validateFactoryWagerURL('https://dashboard.factory-wager.com')).toBe(true);
      expect(FactoryWagerURLUtils.validateFactoryWagerURL('https://r2.factory-wager.com')).toBe(true);
    });

    test('should reject non-FactoryWager URLs', () => {
      expect(FactoryWagerURLUtils.validateFactoryWagerURL('https://example.com')).toBe(false);
      expect(FactoryWagerURLUtils.validateFactoryWagerURL('http://factory-wager.com')).toBe(false);
    });
  });

  describe('extractService', () => {
    test('should extract service from URL', () => {
      expect(FactoryWagerURLUtils.extractService('https://dashboard.factory-wager.com')).toBe('dashboard');
      expect(FactoryWagerURLUtils.extractService('https://r2.factory-wager.com')).toBe('r2');
      expect(FactoryWagerURLUtils.extractService('https://api.factory-wager.com')).toBe('api');
      expect(FactoryWagerURLUtils.extractService('https://wiki.factory-wager.com')).toBe('wiki');
      expect(FactoryWagerURLUtils.extractService('https://duoplus.com')).toBe('duoplus');
      expect(FactoryWagerURLUtils.extractService('https://factory-wager.com')).toBe('main');
    });

    test('should handle invalid URLs', () => {
      expect(FactoryWagerURLUtils.extractService('invalid-url')).toBe('unknown');
    });
  });
});

describe('Edge Cases', () => {
  test('should handle internationalized domain names', () => {
    const url = URLHandler.parse('https://例子.测试/路径#片段');

    // URL API punycode-encodes internationalized domain names
    expect(url.hostname).toBe('xn--fsqu00a.xn--0zwm56d');
    expect(url.pathname).toBe('/%E8%B7%AF%E5%BE%84');
    expect(url.fragment).toBe('%E7%89%87%E6%AE%B5');
  });

  test('should handle complex fragments with special characters', () => {
    const fragment = 'key=value&special=hello%20world&empty=&unicode=测试';
    const params = URLFragmentUtils.parseFragment(fragment);

    expect(params.key).toBe('value');
    expect(params.special).toBe('hello world');
    expect(params.empty).toBe('');
    expect(params.unicode).toBe('测试');
  });

  test('should handle very long fragments', () => {
    const longValue = 'a'.repeat(1000);
    const fragment = `key=${longValue}`;

    const params = URLFragmentUtils.parseFragment(fragment);
    expect(params.key).toBe(longValue);

    const rebuilt = URLFragmentUtils.buildFragment(params);
    expect(rebuilt).toBe(`#${fragment}`);
  });

  test('should handle malformed URLs gracefully', () => {
    expect(URLHandler.validate('')).toBe(false);
    expect(URLHandler.validate('not-a-url')).toBe(false);
    expect(URLHandler.validate('://missing-protocol')).toBe(false);
  });

  test('should handle concurrent fragment operations', async () => {
    const baseURL = 'https://example.com/path';

    const operations = Array.from({ length: 100 }, (_, i) =>
      URLFragmentUtils.setFragmentParam(baseURL, `key${i}`, `value${i}`)
    );

    // All operations should complete without errors
    for (const url of operations) {
      expect(url.includes('key')).toBe(true);
      expect(url.includes('value')).toBe(true);
    }
  });
});
