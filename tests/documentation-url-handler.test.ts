#!/usr/bin/env bun

/**
 * 🧪 Documentation URL Handler Tests
 * 
 * Comprehensive tests for documentation URL handling with fragment support
 */

import { describe, it, testUtils } from '../lib/core/unit-test-framework.ts';
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
} from '../lib/docs-reference.ts';
import { 
  UtilityFactory,
  UtilsCategory 
} from '../lib/documentation/constants/utils.ts';
import { 
  CLIDocumentationHandler,
  CLICategory 
} from '../lib/core/cli-documentation-handler.ts';
import { URLHandler, URLFragmentUtils } from '../lib/core/url-handler.ts';

describe('DocumentationURLHandler', () => {
  describe('generateDocumentationURL', () => {
    it('should generate basic Bun documentation URL', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'bun'
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      assert.isTrue(url.includes('bun.sh'));
      assert.isTrue(url.includes('/docs'));
    });

    it('should generate URL with fragment', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        fragment: {
          view: 'overview',
          theme: 'dark'
        }
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('view=overview'));
      assert.isTrue(url.includes('theme=dark'));
    });

    it('should generate utils documentation URL', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'utils',
        category: UtilsCategory.FILE_SYSTEM
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      assert.isTrue(url.includes('bun.sh'));
      assert.isTrue(url.includes('utils'));
    });

    it('should generate CLI documentation URL', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'cli',
        category: CLICategory.COMMANDS,
        page: 'TEST'
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      assert.isTrue(url.includes('bun.sh'));
      assert.isTrue(url.includes('cli'));
    });

    it('should generate URL with search parameters', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        search: {
          q: 'fetch',
          sort: 'relevance'
        }
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      assert.isTrue(url.includes('?'));
      assert.isTrue(url.includes('q=fetch'));
      assert.isTrue(url.includes('sort=relevance'));
    });

    it('should handle anchor and fragment together', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        anchor: 'section1',
        fragment: {
          view: 'detailed'
        }
      };

      const url = DocumentationURLHandler.generateDocumentationURL(config);
      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('section1'));
      assert.isTrue(url.includes('view=detailed'));
    });
  });

  describe('parseDocumentationURL', () => {
    it('should parse basic Bun documentation URL', (assert) => {
      const url = 'https://bun.sh/docs';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.type, 'bun');
    });

    it('should parse URL with fragment', (assert) => {
      const url = 'https://bun.sh/docs#view=overview&theme=dark';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.type, 'bun');
      assert.deepEqual(parsed.fragment, {
        view: 'overview',
        theme: 'dark'
      });
    });

    it('should parse utils documentation URL', (assert) => {
      const url = 'https://bun.sh/docs/api/utils#file-system';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.type, 'utils');
    });

    it('should parse CLI documentation URL', (assert) => {
      const url = 'https://bun.sh/docs/cli/test#example=basic';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.type, 'cli');
    });

    it('should parse URL with search parameters', (assert) => {
      const url = 'https://bun.sh/docs?q=fetch&sort=relevance#view=list';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.deepEqual(parsed.search, {
        q: 'fetch',
        sort: 'relevance'
      });
      assert.deepEqual(parsed.fragment, {
        view: 'list'
      });
    });

    it('should handle invalid URL gracefully', (assert) => {
      const url = 'not-a-valid-url';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isFalse(parsed.valid);
    });

    it('should extract anchor from fragment', (assert) => {
      const url = 'https://bun.sh/docs#view=overview&anchor=section1';
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.anchor, 'section1');
      assert.deepEqual(parsed.fragment, {
        view: 'overview'
      });
    });
  });

  describe('validateDocumentationURL', () => {
    it('should validate valid Bun URL', (assert) => {
      const url = 'https://bun.sh/docs';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url);
      assert.isTrue(isValid);
    });

    it('should validate URL with fragment', (assert) => {
      const url = 'https://bun.sh/docs#view=overview';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url);
      assert.isTrue(isValid);
    });

    it('should reject invalid URL', (assert) => {
      const url = 'http://malicious.com/docs';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url);
      assert.isFalse(isValid);
    });

    it('should reject non-HTTPS URL', (assert) => {
      const url = 'http://bun.sh/docs';
      const isValid = DocumentationURLHandler.validateDocumentationURL(url, {
        requireHTTPS: true
      });
      assert.isFalse(isValid);
    });
  });

  describe('generateShareableLink', () => {
    it('should generate shareable link with timestamp', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'bun',
        category: 'api'
      };

      const url = DocumentationURLHandler.generateShareableLink(config);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.isTrue(parsed.fragment?.shareable === 'true');
      assert.isTrue(parsed.fragment?.timestamp !== undefined);
    });

    it('should generate shareable link with expiration', (assert) => {
      const config: DocumentationURLConfig = {
        type: 'bun'
      };

      const url = DocumentationURLHandler.generateShareableLink(config, 3600);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.isTrue(parsed.fragment?.expires !== undefined);
    });
  });

  describe('generateBreadcrumbs', () => {
    it('should generate breadcrumbs for basic URL', (assert) => {
      const url = 'https://bun.sh/docs';
      const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);

      assert.isTrue(breadcrumbs.length >= 1);
      assert.equal(breadcrumbs[0].name, 'Documentation');
      assert.equal(breadcrumbs[0].type, 'bun');
    });

    it('should generate breadcrumbs for utils URL', (assert) => {
      const url = 'https://bun.sh/docs/api/utils#file-system';
      const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);

      assert.isTrue(breadcrumbs.length >= 2);
      assert.equal(breadcrumbs[0].name, 'Documentation');
      assert.equal(breadcrumbs[1].name, 'Utils');
    });

    it('should generate breadcrumbs for CLI URL', (assert) => {
      const url = 'https://bun.sh/docs/cli/test#example=basic';
      const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);

      assert.isTrue(breadcrumbs.length >= 2);
      assert.equal(breadcrumbs[0].name, 'Documentation');
      assert.equal(breadcrumbs[1].name, 'Cli');
    });
  });

  describe('generateSearchURL', () => {
    it('should generate search URL', (assert) => {
      const url = DocumentationURLHandler.generateSearchURL('fetch');
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.fragment?.search, 'fetch');
      assert.equal(parsed.fragment?.type, 'documentation-search');
    });

    it('should generate typed search URL', (assert) => {
      const url = DocumentationURLHandler.generateSearchURL('test', 'cli');
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.fragment?.search, 'test');
      assert.equal(parsed.fragment?.docType, 'cli');
    });
  });

  describe('generateExampleURL', () => {
    it('should generate example URL', (assert) => {
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

      assert.isTrue(parsed.valid);
      assert.equal(parsed.fragment?.example, 'console.log("Hello")');
      assert.equal(parsed.fragment?.language, 'javascript');
      assert.equal(parsed.fragment?.highlight, 'true');
      assert.equal(parsed.fragment?.type, 'code-example');
    });
  });

  describe('generateComparisonURL', () => {
    it('should generate comparison URL', (assert) => {
      const configs = [
        { name: 'Bun', url: 'https://bun.sh/docs', type: 'bun' as const },
        { name: 'Node', url: 'https://nodejs.org/docs', type: 'custom' as const }
      ];

      const url = DocumentationURLHandler.generateComparisonURL(configs);
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.fragment?.type, 'comparison');
      assert.equal(parsed.fragment?.items, 'Bun:bun,Node:custom');
      assert.equal(parsed.fragment?.count, '2');
    });
  });

  describe('getAvailableCategories', () => {
    it('should return utils categories', (assert) => {
      const categories = DocumentationURLHandler.getAvailableCategories('utils');
      assert.isTrue(categories.length > 0);
      assert.isTrue(categories.every(cat => cat.type === 'utils'));
    });

    it('should return CLI categories', (assert) => {
      const categories = DocumentationURLHandler.getAvailableCategories('cli');
      assert.isTrue(categories.length > 0);
      assert.isTrue(categories.every(cat => cat.type === 'cli'));
    });

    it('should return all categories when no type specified', (assert) => {
      const categories = DocumentationURLHandler.getAvailableCategories();
      assert.isTrue(categories.length > 0);
    });
  });

  describe('generateQuickReferenceURLs', () => {
    it('should generate quick reference URLs', (assert) => {
      const urls = DocumentationURLHandler.generateQuickReferenceURLs();
      
      assert.isTrue(urls.bunMain !== undefined);
      assert.isTrue(urls.utilsMain !== undefined);
      assert.isTrue(urls.bunCLI !== undefined);
      assert.isTrue(urls.githubRepo !== undefined);
      assert.isTrue(urls.search !== undefined);
      assert.isTrue(urls.examples !== undefined);

      // Validate all URLs
      Object.values(urls).forEach(url => {
        const isValid = DocumentationURLHandler.validateDocumentationURL(url);
        assert.isTrue(isValid, `URL should be valid: ${url}`);
      });
    });
  });
});

describe('Enhanced Docs Reference', () => {
  describe('buildUrl with fragments', () => {
    it('should build URL with fragment', (assert) => {
      const url = buildDocsUrl('/docs/api/utils', undefined, {
        example: 'readFile',
        interactive: 'true'
      });

      assert.isTrue(url.includes('bun.sh'));
      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('example=readFile'));
      assert.isTrue(url.includes('interactive=true'));
    });

    it('should build URL with hash and fragment', (assert) => {
      const url = buildDocsUrl('/docs/api/utils', 'section1', {
        view: 'detailed'
      });

      assert.isTrue(url.includes('#section1'));
      assert.isTrue(url.includes('view=detailed'));
    });
  });

  describe('buildInteractiveDocsUrl', () => {
    it('should build interactive URL', (assert) => {
      const url = buildInteractiveDocsUrl('/docs/api/utils', {
        theme: 'dark',
        editable: true
      });

      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('interactive=true'));
      assert.isTrue(url.includes('theme=dark'));
      assert.isTrue(url.includes('editable=true'));
    });
  });

  describe('buildExampleDocsUrl', () => {
    it('should build example URL', (assert) => {
      const url = buildExampleDocsUrl('/docs/api/utils', 'console.log("test")', 'javascript');

      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('example=console.log("test")'));
      assert.isTrue(url.includes('language=javascript'));
      assert.isTrue(url.includes('highlight=true'));
      assert.isTrue(url.includes('runnable=true'));
    });
  });

  describe('parseUrlWithFragments', () => {
    it('should parse URL with fragments', (assert) => {
      const url = 'https://bun.sh/docs/api/utils#example=readFile&interactive=true&anchor=section1';
      const parsed = docs.parseUrlWithFragments(url);

      assert.isTrue(parsed.valid);
      assert.deepEqual(parsed.fragment, {
        example: 'readFile',
        interactive: 'true'
      });
      assert.equal(parsed.anchor, 'section1');
    });
  });

  describe('generateInteractiveLinks', () => {
    it('should generate interactive links', (assert) => {
      const links = docs.generateInteractiveLinks();
      assert.isTrue(links.length > 0);

      links.forEach(link => {
        assert.isTrue(link.url.includes('bun.sh'));
        assert.isTrue(link.fragment.interactive === 'true');
        assert.isTrue(link.name.length > 0);
        assert.isTrue(link.description.length > 0);
      });
    });
  });
});

describe('DocReferenceResolver', () => {
  describe('resolve with fragments', () => {
    it('should resolve reference with fragment', (assert) => {
      const url = DocReferenceResolver.resolve('bun.docs', {
        view: 'overview',
        theme: 'dark'
      });

      assert.isTrue(url.includes('bun.sh/docs'));
      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('view=overview'));
      assert.isTrue(url.includes('theme=dark'));
    });

    it('should resolve reference without fragment', (assert) => {
      const url = DocReferenceResolver.resolve('bun.docs');
      assert.isTrue(url.includes('bun.sh/docs'));
      assert.isFalse(url.includes('#'));
    });
  });

  describe('resolveWithFragment', () => {
    it('should resolve with fragment', (assert) => {
      const url = DocReferenceResolver.resolveWithFragment('bun.api.utils', {
        example: 'fetch',
        interactive: 'true'
      });

      assert.isTrue(url.includes('bun.sh/docs/api/utils'));
      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('example=fetch'));
      assert.isTrue(url.includes('interactive=true'));
    });
  });

  describe('generateInteractiveReferences', () => {
    it('should generate interactive references', (assert) => {
      const refs = DocReferenceResolver.generateInteractiveReferences();
      assert.isTrue(refs.length > 0);

      refs.forEach(ref => {
        assert.isTrue(ref.url.includes('bun.sh'));
        assert.isTrue(ref.interactiveUrl.includes('bun.sh'));
        assert.isTrue(ref.interactiveUrl.includes('#'));
        assert.isTrue(ref.interactiveUrl.includes('interactive=true'));
        assert.isTrue(ref.key.length > 0);
        assert.isTrue(ref.description.length > 0);
      });
    });
  });
});

describe('Enhanced Utility Factory', () => {
  describe('create with fragments', () => {
    it('should create utility with fragment', (assert) => {
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

      assert.equal(utility.id, 'test_utility');
      assert.isTrue(utility.docUrl.includes('#'));
      assert.isTrue(utility.docUrl.includes('example=basic'));
      assert.isTrue(utility.docUrl.includes('interactive=true'));
      assert.deepEqual(utility.fragment, {
        example: 'basic',
        interactive: 'true'
      });
    });
  });

  describe('createInteractive', () => {
    it('should create interactive utility', (assert) => {
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

      assert.isTrue(utility.docUrl.includes('#'));
      assert.isTrue(utility.docUrl.includes('interactive=true'));
      assert.isTrue(utility.docUrl.includes('runnable=true'));
      assert.isTrue(utility.docUrl.includes('editable=true'));
      assert.isTrue(utility.docUrl.includes('theme=dark'));
    });
  });

  describe('createWithExample', () => {
    it('should create utility with example', (assert) => {
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

      assert.isTrue(utility.docUrl.includes('#'));
      assert.isTrue(utility.docUrl.includes('example=string-validation'));
      assert.isTrue(utility.docUrl.includes('language=typescript'));
      assert.isTrue(utility.docUrl.includes('highlight=true'));
    });
  });
});

describe('CLI Documentation Handler Integration', () => {
  describe('generateDocumentationURL integration', () => {
    it('should work with CLI documentation', (assert) => {
      const url = CLIDocumentationHandler.generateDocumentationURL(
        CLICategory.COMMANDS,
        'TEST',
        {
          example: 'basic',
          highlight: 'true'
        }
      );

      assert.isTrue(url.includes('bun.sh'));
      assert.isTrue(url.includes('#'));
      assert.isTrue(url.includes('example=basic'));
      assert.isTrue(url.includes('highlight=true'));
    });
  });

  describe('parseDocumentationURL integration', () => {
    it('should parse CLI documentation URL', (assert) => {
      const url = 'https://bun.sh/docs/cli/test#example=basic&highlight=true';
      const parsed = CLIDocumentationHandler.parseDocumentationURL(url);

      assert.isTrue(parsed.valid);
      assert.equal(parsed.category, CLICategory.COMMANDS);
      assert.equal(parsed.page, 'TEST');
      assert.deepEqual(parsed.fragment, {
        example: 'basic',
        highlight: 'true'
      });
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle empty fragment gracefully', (assert) => {
    const config: DocumentationURLConfig = {
      type: 'bun',
      fragment: {}
    };

    const url = DocumentationURLHandler.generateDocumentationURL(config);
    assert.isTrue(url.includes('bun.sh'));
    assert.isFalse(url.includes('#'));
  });

  it('should handle malformed URLs in parsing', (assert) => {
    const malformedURLs = [
      'not-a-url',
      'ftp://invalid.protocol.com',
      'https://',
      ''
    ];

    malformedURLs.forEach(url => {
      const parsed = DocumentationURLHandler.parseDocumentationURL(url);
      assert.isFalse(parsed.valid, `Should be invalid: ${url}`);
    });
  });

  it('should handle special characters in fragments', (assert) => {
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

    assert.isTrue(parsed.valid);
    assert.equal(parsed.fragment?.query, 'hello world & special chars!');
    assert.equal(parsed.fragment?.filter, 'test@example.com');
    assert.equal(parsed.fragment?.unicode, '测试');
  });

  it('should handle very long fragments', (assert) => {
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

    assert.isTrue(parsed.valid);
    assert.equal(parsed.fragment?.long, longValue);
    assert.equal(parsed.fragment?.normal, 'test');
  });
});

describe('Performance Tests', () => {
  it('should handle rapid URL generation', (assert) => {
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
    
    assert.isTrue(duration < 1000, `Should generate 1000 URLs in less than 1 second, took ${duration}ms`);
  });

  it('should handle rapid URL parsing', (assert) => {
    const testURL = 'https://bun.sh/docs#test=value&example=basic';
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      DocumentationURLHandler.parseDocumentationURL(testURL);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    assert.isTrue(duration < 500, `Should parse 1000 URLs in less than 500ms, took ${duration}ms`);
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const { runTests } = await import('../lib/core/unit-test-framework.ts');
  await runTests();
}
