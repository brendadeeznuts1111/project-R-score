#!/usr/bin/env bun

/**
 * 🧪 URL Handler Unit Tests
 * 
 * Comprehensive tests for URL parsing, validation, and fragment handling
 */

import { describe, it, testUtils } from '../lib/core/unit-test-framework.ts';
import { 
  EnhancedURL, 
  URLHandler, 
  URLFragmentUtils, 
  FactoryWagerURLUtils 
} from '../lib/core/url-handler.ts';
import { ValidationError } from '../lib/core/error-handling.ts';

describe('EnhancedURL', () => {
  it('should parse basic URL components', (assert) => {
    const url = new EnhancedURL('https://example.com:8080/path/to/file?param=value&other=123#section-1');
    
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'example.com');
    assert.equal(url.port, 8080);
    assert.equal(url.pathname, '/path/to/file');
    assert.equal(url.search, '?param=value&other=123');
    assert.equal(url.fragment, 'section-1');
    assert.equal(url.hash, '#section-1');
    assert.isTrue(url.hasFragment());
  });

  it('should handle URLs without fragments', (assert) => {
    const url = new EnhancedURL('https://example.com/path');
    
    assert.equal(url.fragment, '');
    assert.equal(url.hash, '');
    assert.isFalse(url.hasFragment());
  });

  it('should handle URLs with empty fragments', (assert) => {
    const url = new EnhancedURL('https://example.com/path#');
    
    assert.equal(url.fragment, '');
    assert.equal(url.hash, '#');
    assert.isFalse(url.hasFragment());
  });

  it('should modify fragments correctly', (assert) => {
    const url = new EnhancedURL('https://example.com/path');
    
    const withFragment = url.withFragment('test');
    assert.equal(withFragment.hash, '#test');
    
    const withoutFragment = withFragment.withoutFragment();
    assert.equal(withoutFragment.hash, '');
  });

  it('should handle search parameters', (assert) => {
    const url = new EnhancedURL('https://example.com/path?param1=value1&param2=value2');
    
    assert.equal(url.searchParams.get('param1'), 'value1');
    assert.equal(url.searchParams.get('param2'), 'value2');
    
    const withNewParam = url.withSearchParam('param3', 'value3');
    assert.equal(withNewParam.searchParams.get('param3'), 'value3');
    
    const withoutParam = withNewParam.withoutSearchParam('param1');
    assert.equal(withoutParam.searchParams.get('param1'), null);
  });

  it('should handle relative URLs with base', (assert) => {
    const url = new EnhancedURL('/relative/path', 'https://example.com/base/');
    
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'example.com');
    assert.equal(url.pathname, '/relative/path');
  });

  it('should throw error for invalid URLs', (assert) => {
    assert.throws(() => new EnhancedURL('not-a-valid-url'));
  });
});

describe('URLHandler', () => {
  describe('parse', () => {
    it('should parse valid URLs', (assert) => {
      const url = URLHandler.parse('https://example.com/path#fragment');
      
      assert.equal(url.protocol, 'https:');
      assert.equal(url.hostname, 'example.com');
      assert.equal(url.fragment, 'fragment');
    });

    it('should sanitize input', (assert) => {
      const url = URLHandler.parse('  https://example.com/path  ');
      
      assert.equal(url.toString(), 'https://example.com/path');
    });

    it('should reject empty URLs', (assert) => {
      assert.throws(() => URLHandler.parse(''));
    });

    it('should reject overly long URLs', (assert) => {
      const longURL = 'https://example.com/' + 'a'.repeat(3000);
      assert.throws(() => URLHandler.parse(longURL));
    });
  });

  describe('validate', () => {
    it('should validate HTTPS URLs', (assert) => {
      assert.isTrue(URLHandler.validate('https://example.com', { requireHTTPS: true }));
      assert.isFalse(URLHandler.validate('http://example.com', { requireHTTPS: true }));
    });

    it('should validate allowed protocols', (assert) => {
      const options = { allowedProtocols: ['https:', 'wss:'] };
      
      assert.isTrue(URLHandler.validate('https://example.com', options));
      assert.isTrue(URLHandler.validate('wss://example.com', options));
      assert.isFalse(URLHandler.validate('http://example.com', options));
      assert.isFalse(URLHandler.validate('ftp://example.com', options));
    });

    it('should validate allowed hosts', (assert) => {
      const options = { allowedHosts: ['example.com', 'test.com'] };
      
      assert.isTrue(URLHandler.validate('https://example.com', options));
      assert.isTrue(URLHandler.validate('https://test.com', options));
      assert.isFalse(URLHandler.validate('https://other.com', options));
    });

    it('should validate fragment allowance', (assert) => {
      assert.isTrue(URLHandler.validate('https://example.com#fragment', { allowFragments: true }));
      assert.isFalse(URLHandler.validate('https://example.com#fragment', { allowFragments: false }));
    });
  });

  describe('fragment operations', () => {
    it('should extract fragments', (assert) => {
      assert.equal(URLHandler.getFragment('https://example.com/path#test-fragment'), 'test-fragment');
      assert.equal(URLHandler.getFragment('https://example.com/path'), '');
      assert.equal(URLHandler.getFragment('https://example.com/path#'), '');
    });

    it('should remove fragments', (assert) => {
      assert.equal(
        URLHandler.removeFragment('https://example.com/path#fragment'),
        'https://example.com/path'
      );
      assert.equal(
        URLHandler.removeFragment('https://example.com/path'),
        'https://example.com/path'
      );
    });

    it('should add fragments', (assert) => {
      assert.equal(
        URLHandler.addFragment('https://example.com/path', 'new-fragment'),
        'https://example.com/path#new-fragment'
      );
      assert.equal(
        URLHandler.addFragment('https://example.com/path', '#existing-fragment'),
        'https://example.com/path#existing-fragment'
      );
    });

    it('should check for fragments', (assert) => {
      assert.isTrue(URLHandler.hasFragment('https://example.com/path#fragment'));
      assert.isFalse(URLHandler.hasFragment('https://example.com/path'));
      assert.isFalse(URLHandler.hasFragment('https://example.com/path#'));
    });
  });

  describe('search parameter operations', () => {
    it('should get search parameters', (assert) => {
      const params = URLHandler.getSearchParams('https://example.com/path?param1=value1&param2=value2');
      
      assert.isNotNull(params);
      assert.equal(params!.get('param1'), 'value1');
      assert.equal(params!.get('param2'), 'value2');
    });

    it('should get specific search parameter', (assert) => {
      assert.equal(
        URLHandler.getSearchParam('https://example.com/path?param1=value1&param2=value2', 'param1'),
        'value1'
      );
      assert.equal(
        URLHandler.getSearchParam('https://example.com/path?param1=value1&param2=value2', 'nonexistent'),
        null
      );
    });
  });

  describe('build and normalize', () => {
    it('should build URL from components', (assert) => {
      const components = {
        protocol: 'https:',
        hostname: 'example.com',
        port: 8080,
        pathname: '/path',
        search: '?param=value',
        fragment: 'section'
      };

      const url = URLHandler.build(components);
      assert.equal(url, 'https://example.com:8080/path?param=value#section');
    });

    it('should normalize URLs', (assert) => {
      const normalized = URLHandler.normalize('HTTPS://EXAMPLE.COM/PATH/?b=2&a=1');
      assert.equal(normalized, 'https://example.com/PATH?a=1&b=2');
    });

    it('should compare URLs without fragments', (assert) => {
      assert.isTrue(
        URLHandler.compareWithoutFragment(
          'https://example.com/path#fragment1',
          'https://example.com/path#fragment2'
        )
      );
      assert.isFalse(
        URLHandler.compareWithoutFragment(
          'https://example.com/path1',
          'https://example.com/path2'
        )
      );
    });
  });

  describe('utility methods', () => {
    it('should extract domain', (assert) => {
      assert.equal(URLHandler.getDomain('https://example.com/path'), 'example.com');
      assert.equal(URLHandler.getDomain('https://sub.example.com/path'), 'sub.example.com');
      assert.equal(URLHandler.getDomain('invalid-url'), '');
    });

    it('should check if URL is absolute', (assert) => {
      assert.isTrue(URLHandler.isAbsolute('https://example.com/path'));
      assert.isTrue(URLHandler.isAbsolute('http://example.com'));
      assert.isFalse(URLHandler.isAbsolute('/relative/path'));
      assert.isFalse(URLHandler.isAbsolute('relative-path'));
    });

    it('should resolve relative URLs', (assert) => {
      assert.equal(
        URLHandler.resolve('https://example.com/base/', 'relative/path'),
        'https://example.com/relative/path'
      );
      assert.equal(
        URLHandler.resolve('https://example.com/base/', '/absolute/path'),
        'https://example.com/absolute/path'
      );
    });
  });
});

describe('URLFragmentUtils', () => {
  describe('parseFragment', () => {
    it('should parse simple fragment', (assert) => {
      const params = URLFragmentUtils.parseFragment('key1=value1&key2=value2');
      
      assert.equal(params.key1, 'value1');
      assert.equal(params.key2, 'value2');
    });

    it('should handle empty values', (assert) => {
      const params = URLFragmentUtils.parseFragment('key1=&key2=value2');
      
      assert.equal(params.key1, '');
      assert.equal(params.key2, 'value2');
    });

    it('should handle URL encoding', (assert) => {
      const params = URLFragmentUtils.parseFragment('key=hello%20world&special=%26%3D');
      
      assert.equal(params.key, 'hello world');
      assert.equal(params.special, '&=');
    });

    it('should handle empty fragments', (assert) => {
      const params = URLFragmentUtils.parseFragment('');
      assert.deepEqual(params, {});
      
      const params2 = URLFragmentUtils.parseFragment('#');
      assert.deepEqual(params2, {});
    });
  });

  describe('buildFragment', () => {
    it('should build simple fragment', (assert) => {
      const fragment = URLFragmentUtils.buildFragment({
        key1: 'value1',
        key2: 'value2'
      });
      
      assert.equal(fragment, '#key1=value1&key2=value2');
    });

    it('should handle URL encoding', (assert) => {
      const fragment = URLFragmentUtils.buildFragment({
        key: 'hello world',
        special: '&='
      });
      
      assert.equal(fragment, '#key=hello%20world&special=%26%3D');
    });

    it('should handle empty objects', (assert) => {
      const fragment = URLFragmentUtils.buildFragment({});
      assert.equal(fragment, '');
    });

    it('should filter empty keys', (assert) => {
      const fragment = URLFragmentUtils.buildFragment({
        '': 'empty-key',
        valid: 'valid-key'
      });
      
      assert.equal(fragment, '#valid=valid-key');
    });
  });

  describe('fragment parameter operations', () => {
    it('should get fragment parameter', (assert) => {
      const value = URLFragmentUtils.getFragmentParam(
        'https://example.com/path#key1=value1&key2=value2',
        'key1'
      );
      
      assert.equal(value, 'value1');
    });

    it('should set fragment parameter', (assert) => {
      const url = URLFragmentUtils.setFragmentParam(
        'https://example.com/path#existing=value',
        'newKey',
        'newValue'
      );
      
      assert.isTrue(url.includes('newKey=newValue'));
      assert.isTrue(url.includes('existing=value'));
    });

    it('should remove fragment parameter', (assert) => {
      const url = URLFragmentUtils.removeFragmentParam(
        'https://example.com/path#key1=value1&key2=value2',
        'key1'
      );
      
      assert.isFalse(url.includes('key1=value1'));
      assert.isTrue(url.includes('key2=value2'));
    });

    it('should remove entire fragment when empty', (assert) => {
      const url = URLFragmentUtils.removeFragmentParam(
        'https://example.com/path#onlyKey=value',
        'onlyKey'
      );
      
      assert.equal(url, 'https://example.com/path');
    });

    it('should check for fragment parameters', (assert) => {
      assert.isTrue(URLFragmentUtils.hasFragmentParams('https://example.com/path#key=value'));
      assert.isFalse(URLFragmentUtils.hasFragmentParams('https://example.com/path#simple'));
      assert.isFalse(URLFragmentUtils.hasFragmentParams('https://example.com/path'));
    });
  });
});

describe('FactoryWagerURLUtils', () => {
  describe('createAPIURL', () => {
    it('should create API URL with path', (assert) => {
      const url = FactoryWagerURLUtils.createAPIURL('/test/endpoint');
      assert.equal(url, 'https://factory-wager.com/api/test/endpoint');
    });

    it('should create API URL with parameters', (assert) => {
      const url = FactoryWagerURLUtils.createAPIURL('/test', {
        param1: 'value1',
        param2: 'value2'
      });
      
      assert.isTrue(url.includes('https://factory-wager.com/api/test'));
      assert.isTrue(url.includes('param1=value1'));
      assert.isTrue(url.includes('param2=value2'));
    });

    it('should handle path without leading slash', (assert) => {
      const url = FactoryWagerURLUtils.createAPIURL('test/endpoint');
      assert.equal(url, 'https://factory-wager.com/api/test/endpoint');
    });
  });

  describe('createDashboardURL', () => {
    it('should create dashboard URL', (assert) => {
      const url = FactoryWagerURLUtils.createDashboardURL();
      assert.equal(url, 'https://dashboard.factory-wager.com');
    });

    it('should create dashboard URL with section', (assert) => {
      const url = FactoryWagerURLUtils.createDashboardURL('analytics');
      assert.equal(url, 'https://dashboard.factory-wager.com/analytics');
    });

    it('should create dashboard URL with fragment', (assert) => {
      const url = FactoryWagerURLUtils.createDashboardURL('analytics', {
        tab: 'overview',
        period: '7d'
      });
      
      assert.isTrue(url.includes('https://dashboard.factory-wager.com/analytics'));
      assert.isTrue(url.includes('tab=overview'));
      assert.isTrue(url.includes('period=7d'));
    });
  });

  describe('createR2BrowserURL', () => {
    it('should create R2 browser URL', (assert) => {
      const url = FactoryWagerURLUtils.createR2BrowserURL();
      assert.equal(url, 'https://r2.factory-wager.com');
    });

    it('should create R2 browser URL with category', (assert) => {
      const url = FactoryWagerURLUtils.createR2BrowserURL('diagnoses');
      assert.equal(url, 'https://r2.factory-wager.com/diagnoses');
    });

    it('should create R2 browser URL with object fragment', (assert) => {
      const url = FactoryWagerURLUtils.createR2BrowserURL('diagnoses', 'test-key.json');
      
      assert.isTrue(url.includes('https://r2.factory-wager.com/diagnoses'));
      assert.isTrue(url.includes('key=test-key.json'));
      assert.isTrue(url.includes('view=object'));
    });
  });

  describe('validateFactoryWagerURL', () => {
    it('should validate FactoryWager URLs', (assert) => {
      assert.isTrue(FactoryWagerURLUtils.validateFactoryWagerURL('https://factory-wager.com'));
      assert.isTrue(FactoryWagerURLUtils.validateFactoryWagerURL('https://dashboard.factory-wager.com'));
      assert.isTrue(FactoryWagerURLUtils.validateFactoryWagerURL('https://r2.factory-wager.com'));
    });

    it('should reject non-FactoryWager URLs', (assert) => {
      assert.isFalse(FactoryWagerURLUtils.validateFactoryWagerURL('https://example.com'));
      assert.isFalse(FactoryWagerURLUtils.validateFactoryWagerURL('http://factory-wager.com'));
    });
  });

  describe('extractService', () => {
    it('should extract service from URL', (assert) => {
      assert.equal(FactoryWagerURLUtils.extractService('https://dashboard.factory-wager.com'), 'dashboard');
      assert.equal(FactoryWagerURLUtils.extractService('https://r2.factory-wager.com'), 'r2');
      assert.equal(FactoryWagerURLUtils.extractService('https://api.factory-wager.com'), 'api');
      assert.equal(FactoryWagerURLUtils.extractService('https://wiki.factory-wager.com'), 'wiki');
      assert.equal(FactoryWagerURLUtils.extractService('https://duoplus.com'), 'duoplus');
      assert.equal(FactoryWagerURLUtils.extractService('https://factory-wager.com'), 'main');
    });

    it('should handle invalid URLs', (assert) => {
      assert.equal(FactoryWagerURLUtils.extractService('invalid-url'), 'unknown');
    });
  });
});

describe('Edge Cases', () => {
  it('should handle internationalized domain names', (assert) => {
    const url = URLHandler.parse('https://例子.测试/路径#片段');
    
    assert.equal(url.hostname, '例子.测试');
    assert.equal(url.pathname, '/路径');
    assert.equal(url.fragment, '片段');
  });

  it('should handle complex fragments with special characters', (assert) => {
    const fragment = 'key=value&special=hello%20world&empty=&unicode=测试';
    const params = URLFragmentUtils.parseFragment(fragment);
    
    assert.equal(params.key, 'value');
    assert.equal(params.special, 'hello world');
    assert.equal(params.empty, '');
    assert.equal(params.unicode, '测试');
  });

  it('should handle very long fragments', (assert) => {
    const longValue = 'a'.repeat(1000);
    const fragment = `key=${longValue}`;
    
    const params = URLFragmentUtils.parseFragment(fragment);
    assert.equal(params.key, longValue);
    
    const rebuilt = URLFragmentUtils.buildFragment(params);
    assert.equal(rebuilt, `#${fragment}`);
  });

  it('should handle malformed URLs gracefully', (assert) => {
    assert.isFalse(URLHandler.validate(''));
    assert.isFalse(URLHandler.validate('not-a-url'));
    assert.isFalse(URLHandler.validate('://missing-protocol'));
  });

  it('should handle concurrent fragment operations', async (assert) => {
    const baseURL = 'https://example.com/path';
    
    const operations = Array.from({ length: 100 }, (_, i) => 
      URLFragmentUtils.setFragmentParam(baseURL, `key${i}`, `value${i}`)
    );

    // All operations should complete without errors
    for (const url of operations) {
      assert.isTrue(url.includes('key'));
      assert.isTrue(url.includes('value'));
    }
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const { runTests } = await import('../lib/core/unit-test-framework.ts');
  await runTests();
}
