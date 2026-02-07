#!/usr/bin/env bun

/**
 * Documentation URL Handler Tests
 *
 * Comprehensive tests for documentation URL handling with fragment support
 */

import { describe, test, expect } from "bun:test";
import {
  DocumentationURLHandler,
  type DocumentationURLConfig
} from '../lib/core/documentation-url-handler.ts';
import {
  docs,
  buildDocsUrl,
  buildInteractiveDocsUrl,
  buildExampleDocsUrl,
  DocReferenceResolver
} from '../lib/docs/reference.ts';
import {
  UtilityFactory,
  UtilsCategory
} from '../lib/docs/constants/utils.ts';
import {
  CLIDocumentationHandler,
  CLICategory
} from '../lib/core/cli-documentation-handler.ts';
import { URLHandler, URLFragmentUtils } from '../lib/core/url-handler.ts';

describe('DocumentationURLHandler', () => {
  describe('generateDocumentationURL', () => {
    test('should generate basic Bun documentation URL', () => {
      const config: DocumentationURLConfig = {
        type: 'bun'
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      expect(url.includes('bun.sh')).toBe(true);
      expect(url.includes('/docs')).toBe(true);
    });

    test('should generate URL with fragment', () => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        fragment: {
          view: 'overview',
          theme: 'dark'
        }
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      expect(url.includes('#')).toBe(true);
      expect(url.includes('view=overview')).toBe(true);
      expect(url.includes('theme=dark')).toBe(true);
    });

    test('should generate utils documentation URL', () => {
      const config: DocumentationURLConfig = {
        type: 'utils',
        category: UtilsCategory.FILE_SYSTEM
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      expect(url.includes('bun.sh')).toBe(true);
      expect(url.includes('utils')).toBe(true);
    });

    test('should generate CLI documentation URL', () => {
      const config: DocumentationURLConfig = {
        type: 'cli',
        category: CLICategory.COMMANDS,
        page: 'TEST'
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      expect(url.includes('bun.sh')).toBe(true);
      expect(url.includes('cli')).toBe(true);
    });

    test('should generate URL with search parameters', () => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        search: {
          q: 'fetch',
          sort: 'relevance'
        }
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      expect(url.includes('?')).toBe(true);
      expect(url.includes('q=fetch')).toBe(true);
      expect(url.includes('sort=relevance')).toBe(true);
    });

    test('should handle anchor and fragment together', () => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        anchor: 'section1',
        fragment: {
          view: 'detailed'
        }
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      expect(url.includes('#')).toBe(true);
      expect(url.includes('section1')).toBe(true);
      expect(url.includes('view=detailed')).toBe(true);
    });
  });

  describe('parseDocumentationURL', () => {
    test('should parse basic Bun documentation URL', () => {
      const url = 'https://bun.sh/docs';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('bun');
    });

    test('should parse URL with fragment', () => {
      const url = 'https://bun.sh/docs#view=overview&theme=dark';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('bun');
      expect(parsed.fragment).toEqual({
        view: 'overview',
        theme: 'dark'
      });
    });

    test('should parse utils documentation URL', () => {
      const url = 'https://bun.sh/docs/api/utils#file-system';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('utils');
    });

    test('should parse CLI documentation URL', () => {
      const url = 'https://bun.sh/docs/cli/test#example=basic';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('cli');
    });

    test('should parse URL with search parameters', () => {
      const url = 'https://bun.sh/docs?q=fetch&sort=relevance#view=list';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.search).toEqual({
        q: 'fetch',
        sort: 'relevance'
      });
      expect(parsed.fragment).toEqual({
        view: 'list'
      });
    });

    test('should handle invalid URL gracefully', () => {
      const url = 'not-a-valid-url';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(false);
    });

    test('should extract anchor from fragment', () => {
      const url = 'https://bun.sh/docs#view=overview&anchor=section1';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.anchor).toBe('section1');
      expect(parsed.fragment).toEqual({
        view: 'overview'
      });
    });
  });

  describe('validateDocumentationURL', () => {
    test('should validate valid Bun URL', () => {
      const url = 'https://bun.sh/docs';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url);
      expect(isValid).toBe(true);
    });

    test('should validate URL with fragment', () => {
      const url = 'https://bun.sh/docs#view=overview';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url);
      expect(isValid).toBe(true);
    });

    test('should reject invalid URL', () => {
      const url = 'http://malicious.com/docs';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url);
      expect(isValid).toBe(false);
    });

    test('should reject non-HTTPS URL', () => {
      const url = 'http://bun.sh/docs';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url, {
        requireHTTPS: true
      });
      expect(isValid).toBe(false);
    });
  });

  describe('generateShareableLink', () => {
    test('should generate shareable link with timestamp', () => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        category: 'api'
      };

      const url = DocumentationURLHandler.generateShareableLink(config);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment?.shareable === 'true').toBe(true);
      expect(parsed.fragment?.timestamp !== undefined).toBe(true);
    });

    test('should generate shareable link with expiration', () => {
      const config: DocumentationURLConfig = {
        type: 'bun'
      };

      const url = DocumentationURLHandler.generateShareableLink(config, 3600);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment?.expires !== undefined).toBe(true);
    });
  });

  describe('generateBreadcrumbs', () => {
    test('should generate breadcrumbs for basic URL', () => {
      const url = 'https://bun.sh/docs';
      const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);

      expect(breadcrumbs.length >= 1).toBe(true);
      expect(breadcrumbs[0].name).toBe('Documentation');
      expect(breadcrumbs[0].type).toBe('bun');
    });

    test('should generate breadcrumbs for utils URL', () => {
      const url = 'https://bun.sh/docs/api/utils#file-system';
      const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);

      expect(breadcrumbs.length >= 2).toBe(true);
      expect(breadcrumbs[0].name).toBe('Documentation');
      expect(breadcrumbs[1].name).toBe('Utils');
    });

    test('should generate breadcrumbs for CLI URL', () => {
      const url = 'https://bun.sh/docs/cli/test#example=basic';
      const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);

      expect(breadcrumbs.length >= 2).toBe(true);
      expect(breadcrumbs[0].name).toBe('Documentation');
      expect(breadcrumbs[1].name).toBe('Cli');
    });
  });

  describe('generateSearchURL', () => {
    test('should generate search URL', () => {
      const url = DocumentationURLHandler.generateSearchURL('fetch');
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment?.search).toBe('fetch');
      expect(parsed.fragment?.type).toBe('documentation-search');
    });

    test('should generate typed search URL', () => {
      const url = DocumentationURLHandler.generateSearchURL('test', 'cli');
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment?.search).toBe('test');
      expect(parsed.fragment?.docType).toBe('cli');
    });
  });

  describe('generateExampleURL', () => {
    test('should generate example URL', () => {
      const config: DocumentationURLConfig & {
        example: string;
        language?: string;
        highlight?: boolean;
      } = {
        type: 'bun',
        example: 'console.log("Hello")',
        language: 'javascript',
        highlight: true
      };

      const url = DocumentationURLHandler.generateExampleURL(config);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment?.example).toBe('console.log("Hello")');
      expect(parsed.fragment?.language).toBe('javascript');
      expect(parsed.fragment?.highlight).toBe('true');
      expect(parsed.fragment?.type).toBe('code-example');
    });
  });

  describe('generateComparisonURL', () => {
    test('should generate comparison URL', () => {
      const configs = [
        { name: 'Bun', url: 'https://bun.sh/docs', type: 'bun' as const },
        { name: 'Node', url: 'https://nodejs.org/docs', type: 'custom' as const }
      ];

      const url = DocumentationURLHandler.generateComparisonURL(configs);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment?.type).toBe('comparison');
      expect(parsed.fragment?.items).toBe('Bun:bun,Node:custom');
      expect(parsed.fragment?.count).toBe('2');
    });
  });

  describe('getAvailableCategories', () => {
    test('should return utils categories', () => {
      const categories = DocumentationURLHandler.getAvailableCategories('utils');
      expect(categories.length > 0).toBe(true);
      expect(categories.every(cat => cat.type === 'utils')).toBe(true);
    });

    test('should return CLI categories', () => {
      const categories = DocumentationURLHandler.getAvailableCategories('cli');
      expect(categories.length > 0).toBe(true);
      expect(categories.every(cat => cat.type === 'cli')).toBe(true);
    });

    test('should return all categories when no type specified', () => {
      const categories = DocumentationURLHandler.getAvailableCategories();
      expect(categories.length > 0).toBe(true);
    });
  });

  describe('generateQuickReferenceURLs', () => {
    test('should generate quick reference URLs', () => {
      const urls = DocumentationURLHandler.generateQuickReferenceURLs();

      expect(urls.bunMain !== undefined).toBe(true);
      expect(urls.utilsMain !== undefined).toBe(true);
      expect(urls.bunCLI !== undefined).toBe(true);
      expect(urls.githubRepo !== undefined).toBe(true);
      expect(urls.search !== undefined).toBe(true);
      expect(urls.examples !== undefined).toBe(true);

      // Validate all URLs
      Object.values(urls).forEach(url => {
        const isValid = DocumentationURLHandler.validateDocumentationURL(url);
        expect(isValid).toBe(true);
      });
    });
  });
});

describe('Enhanced Docs Reference', () => {
  describe('buildUrl with fragments', () => {
    test('should build URL with fragment', () => {
      const url = buildDocsUrl('/docs/api/utils', undefined, {
        example: 'readFile',
        interactive: 'true'
      });

      expect(url.includes('bun.sh')).toBe(true);
      expect(url.includes('#')).toBe(true);
      expect(url.includes('example=readFile')).toBe(true);
      expect(url.includes('interactive=true')).toBe(true);
    });

    test('should build URL with hash and fragment', () => {
      const url = buildDocsUrl('/docs/api/utils', 'section1', {
        view: 'detailed'
      });

      expect(url.includes('#section1')).toBe(true);
      expect(url.includes('view=detailed')).toBe(true);
    });
  });

  describe('buildInteractiveDocsUrl', () => {
    test('should build interactive URL', () => {
      const url = buildInteractiveDocsUrl('/docs/api/utils', {
        theme: 'dark',
        editable: true
      });

      expect(url.includes('#')).toBe(true);
      expect(url.includes('interactive=true')).toBe(true);
      expect(url.includes('theme=dark')).toBe(true);
      expect(url.includes('editable=true')).toBe(true);
    });
  });

  describe('buildExampleDocsUrl', () => {
    test('should build example URL', () => {
      const url = buildExampleDocsUrl('/docs/api/utils', 'console.log("test")', 'javascript');

      expect(url.includes('#')).toBe(true);
      expect(url.includes('example=console.log("test")')).toBe(true);
      expect(url.includes('language=javascript')).toBe(true);
      expect(url.includes('highlight=true')).toBe(true);
      expect(url.includes('runnable=true')).toBe(true);
    });
  });

  describe('parseUrlWithFragments', () => {
    test('should parse URL with fragments', () => {
      const url = 'https://bun.sh/docs/api/utils#example=readFile&interactive=true&anchor=section1';
      const parsed = docs.parseUrlWithFragments(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.fragment).toEqual({
        example: 'readFile',
        interactive: 'true'
      });
      expect(parsed.anchor).toBe('section1');
    });
  });

  describe('generateInteractiveLinks', () => {
    test('should generate interactive links', () => {
      const links = docs.generateInteractiveLinks();
      expect(links.length > 0).toBe(true);

      links.forEach(link => {
        expect(link.url.includes('bun.sh')).toBe(true);
        expect(link.fragment.interactive === 'true').toBe(true);
        expect(link.name.length > 0).toBe(true);
        expect(link.description.length > 0).toBe(true);
      });
    });
  });
});

describe('DocReferenceResolver', () => {
  describe('resolve with fragments', () => {
    test('should resolve reference with fragment', () => {
      const url = DocReferenceResolver.resolve('bun.docs', {
        view: 'overview',
        theme: 'dark'
      });

      expect(url.includes('bun.sh/docs')).toBe(true);
      expect(url.includes('#')).toBe(true);
      expect(url.includes('view=overview')).toBe(true);
      expect(url.includes('theme=dark')).toBe(true);
    });

    test('should resolve reference without fragment', () => {
      const url = DocReferenceResolver.resolve('bun.docs');
      expect(url.includes('bun.sh/docs')).toBe(true);
      expect(url.includes('#')).toBe(false);
    });
  });

  describe('resolveWithFragment', () => {
    test('should resolve with fragment', () => {
      const url = DocReferenceResolver.resolveWithFragment('bun.api.utils', {
        example: 'fetch',
        interactive: 'true'
      });

      expect(url.includes('bun.sh/docs/api/utils')).toBe(true);
      expect(url.includes('#')).toBe(true);
      expect(url.includes('example=fetch')).toBe(true);
      expect(url.includes('interactive=true')).toBe(true);
    });
  });

  describe('generateInteractiveReferences', () => {
    test('should generate interactive references', () => {
      const refs = DocReferenceResolver.generateInteractiveReferences();
      expect(refs.length > 0).toBe(true);

      refs.forEach(ref => {
        expect(ref.url.includes('bun.sh')).toBe(true);
        expect(ref.interactiveUrl.includes('bun.sh')).toBe(true);
        expect(ref.interactiveUrl.includes('#')).toBe(true);
        expect(ref.interactiveUrl.includes('interactive=true')).toBe(true);
        expect(ref.key.length > 0).toBe(true);
        expect(ref.description.length > 0).toBe(true);
      });
    });
  });
});

describe('Enhanced Utility Factory', () => {
  describe('create with fragments', () => {
    test('should create utility with fragment', () => {
      const utility = UtilityFactory.create({
        id: 'test_utility',
        name: 'Test Utility',
        category: UtilsCategory.FILE_SYSTEM,
        docUrl: 'https://bun.sh/docs/api/utils#test',
        description: 'Test utility for fragment support',
        exampleCode: 'console.log("test");',
        fragment: {
          example: 'basic',
          interactive: 'true'
        }
      });

      expect(utility.id).toBe('test_utility');
      expect(utility.docUrl.includes('#')).toBe(true);
      expect(utility.docUrl.includes('example=basic')).toBe(true);
      expect(utility.docUrl.includes('interactive=true')).toBe(true);
      expect(utility.fragment).toEqual({
        example: 'basic',
        interactive: 'true'
      });
    });
  });

  describe('createInteractive', () => {
    test('should create interactive utility', () => {
      const utility = UtilityFactory.createInteractive({
        id: 'interactive_utility',
        name: 'Interactive Utility',
        category: UtilsCategory.NETWORKING,
        docUrl: 'https://bun.sh/docs/api/utils#fetch',
        description: 'Interactive fetch utility',
        exampleCode: 'await fetch("https://example.com");',
        options: {
          runnable: true,
          editable: true,
          theme: 'dark'
        }
      });

      expect(utility.docUrl.includes('#')).toBe(true);
      expect(utility.docUrl.includes('interactive=true')).toBe(true);
      expect(utility.docUrl.includes('runnable=true')).toBe(true);
      expect(utility.docUrl.includes('editable=true')).toBe(true);
      expect(utility.docUrl.includes('theme=dark')).toBe(true);
    });
  });

  describe('createWithExample', () => {
    test('should create utility with example', () => {
      const utility = UtilityFactory.createWithExample({
        id: 'example_utility',
        name: 'Example Utility',
        category: UtilsCategory.VALIDATION,
        docUrl: 'https://bun.sh/docs/api/utils#isstring',
        description: 'Validation utility with example',
        exampleCode: 'isString("test");',
        exampleName: 'string-validation',
        language: 'typescript'
      });

      expect(utility.docUrl.includes('#')).toBe(true);
      expect(utility.docUrl.includes('example=string-validation')).toBe(true);
      expect(utility.docUrl.includes('language=typescript')).toBe(true);
      expect(utility.docUrl.includes('highlight=true')).toBe(true);
    });
  });
});

describe('CLI Documentation Handler Integration', () => {
  describe('generateDocumentationURL integration', () => {
    test('should work with CLI documentation', () => {
      const url = CLIDocumentationHandler.generateDocumentationURL(
        CLICategory.COMMANDS,
        'TEST',
        {
          example: 'basic',
          highlight: 'true'
        }
      );

      expect(url.includes('bun.sh')).toBe(true);
      expect(url.includes('#')).toBe(true);
      expect(url.includes('example=basic')).toBe(true);
      expect(url.includes('highlight=true')).toBe(true);
    });
  });

  describe('parseDocumentationURL integration', () => {
    test('should parse CLI documentation URL', () => {
      const url = 'https://bun.sh/docs/cli/test#example=basic&highlight=true';
      const parsed = CLIDocumentationHandler.parseDocumentationURL(url);

      expect(parsed.valid).toBe(true);
      expect(parsed.category).toBe(CLICategory.COMMANDS);
      expect(parsed.page).toBe('TEST');
      expect(parsed.fragment).toEqual({
        example: 'basic',
        highlight: 'true'
      });
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle empty fragment gracefully', () => {
    const config: DocumentationURLConfig = {
      type: 'bun',
      fragment: {}
    };

    const url = DocumentationURLHandler.generateDocumentationURL(config);
    expect(url.includes('bun.sh')).toBe(true);
    expect(url.includes('#')).toBe(false);
  });

  test('should handle malformed URLs in parsing', () => {
    const malformedURLs = [
      'not-a-url',
      'ftp://invalid.protocol.com',
      'https://',
      ''
    ];

    malformedURLs.forEach(url => {
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);
      expect(parsed.valid).toBe(false);
    });
  });

  test('should handle special characters in fragments', () => {
    const config: DocumentationURLConfig = {
      type: 'bun',
      fragment: {
        query: 'hello world & special chars!',
        filter: 'test@example.com',
        unicode: '测试'
      }
    };

    const url = DocumentationURLHandler.generateDocumentationURL(config);
    const parsed = DocumentationURLHandler.parseDocumentationURL(url);

    expect(parsed.valid).toBe(true);
    expect(parsed.fragment?.query).toBe('hello world & special chars!');
    expect(parsed.fragment?.filter).toBe('test@example.com');
    expect(parsed.fragment?.unicode).toBe('测试');
  });

  test('should handle very long fragments', () => {
    const longValue = 'a'.repeat(1000);
    const config: DocumentationURLConfig = {
      type: 'bun',
      fragment: {
        long: longValue,
        normal: 'test'
      }
    };

    const url = DocumentationURLHandler.generateDocumentationURL(url);
    const parsed = DocumentationURLHandler.parseDocumentationURL(url);

    expect(parsed.valid).toBe(true);
    expect(parsed.fragment?.long).toBe(longValue);
    expect(parsed.fragment?.normal).toBe('test');
  });
});

describe('Performance Tests', () => {
  test('should handle rapid URL generation', () => {
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const config: DocumentationURLConfig = {
        type: 'bun',
        fragment: {
          test: i.toString(),
          random: Math.random().toString()
        }
      };

      DocumentationURLHandler.generateDocumentationURL(config);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration < 1000).toBe(true);
  });

  test('should handle rapid URL parsing', () => {
    const testURL = 'https://bun.sh/docs#test=value&example=basic';
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      DocumentationURLHandler.parseDocumentationURL(testURL);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration < 500).toBe(true);
  });
});
