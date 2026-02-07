// lib/har-analyzer/domain-mapper.test.ts — Tests for domain classification and mapping

import { test, expect, describe, expectTypeOf } from 'bun:test';
import {
  DocumentationMapper,
  DocumentationProvider,
  DocumentationCategory,
  UrlType,
  classifyDomain,
  classifyAssetGroup,
  gradeTTFB,
  gradeSize,
  PERFORMANCE_THRESHOLDS,
} from './domain-mapper';
import type { DomainType, AssetGroup, TTFBGrade, SizeGrade } from './types';

// ─── Type tests ─────────────────────────────────────────────────────

expectTypeOf(classifyDomain).toBeFunction();
expectTypeOf(classifyDomain).parameters.toEqualTypeOf<[entryHost: string, pageHost: string]>();
expectTypeOf(classifyDomain).returns.toEqualTypeOf<DomainType>();

expectTypeOf(classifyAssetGroup).toBeFunction();
expectTypeOf(classifyAssetGroup).parameters.toEqualTypeOf<
  [mimeType: string, isFirstRequest: boolean]
>();
expectTypeOf(classifyAssetGroup).returns.toEqualTypeOf<AssetGroup>();

expectTypeOf(gradeTTFB).returns.toEqualTypeOf<TTFBGrade>();
expectTypeOf(gradeSize).returns.toEqualTypeOf<SizeGrade>();

expectTypeOf(DocumentationMapper.classify('')).toMatchObjectType<{
  provider: DocumentationProvider;
  category: DocumentationCategory;
  urlType: UrlType;
}>();

// ─── Runtime tests ──────────────────────────────────────────────────

describe('DocumentationMapper', () => {
  describe('getProvider', () => {
    test('should identify bun.sh URLs as the official Bun provider', () => {
      expect(DocumentationMapper.getProvider('https://bun.sh/docs/api/fetch')).toBe(
        DocumentationProvider.BUN_OFFICIAL
      );
    });

    test('should identify oven-sh/bun GitHub URLs as the Bun GitHub provider', () => {
      expect(DocumentationMapper.getProvider('https://github.com/oven-sh/bun/issues/123')).toBe(
        DocumentationProvider.BUN_GITHUB
      );
    });

    test('should identify npmjs.com/package/bun as the Bun NPM provider', () => {
      expect(DocumentationMapper.getProvider('https://www.npmjs.com/package/bun')).toBe(
        DocumentationProvider.BUN_NPM
      );
    });

    test('should identify stackoverflow.com as Stack Overflow provider', () => {
      expect(DocumentationMapper.getProvider('https://stackoverflow.com/questions/123')).toBe(
        DocumentationProvider.STACK_OVERFLOW
      );
    });

    test('should fall back to COMMUNITY for unrecognized domains', () => {
      expect(DocumentationMapper.getProvider('https://some-blog.dev/bun-tips')).toBe(
        DocumentationProvider.COMMUNITY
      );
    });

    test('should fall back to COMMUNITY for malformed URLs', () => {
      expect(DocumentationMapper.getProvider('not a url')).toBe(DocumentationProvider.COMMUNITY);
    });

    test('should not false-positive on domains that contain a known hostname as a substring', () => {
      expect(DocumentationMapper.getProvider('https://mybun.sh/docs')).toBe(
        DocumentationProvider.COMMUNITY
      );
      expect(DocumentationMapper.getProvider('https://notbun.sh/page')).toBe(
        DocumentationProvider.COMMUNITY
      );
      expect(DocumentationMapper.getProvider('https://fakestackoverflow.com/q')).toBe(
        DocumentationProvider.COMMUNITY
      );
    });

    test('should match subdomains of known providers', () => {
      expect(DocumentationMapper.getProvider('https://docs.bun.sh/api')).toBe(
        DocumentationProvider.BUN_OFFICIAL
      );
      expect(DocumentationMapper.getProvider('https://www.reddit.com/r/bun')).toBe(
        DocumentationProvider.REDDIT
      );
    });
  });

  describe('getCategory', () => {
    test('should classify /docs/api paths as the API category', () => {
      expect(DocumentationMapper.getCategory('https://bun.sh/docs/api/fetch')).toBe(
        DocumentationCategory.API
      );
    });

    test('should classify /docs/cli paths as the CLI category', () => {
      expect(DocumentationMapper.getCategory('https://bun.sh/docs/cli/run')).toBe(
        DocumentationCategory.CLI
      );
    });

    test('should classify /docs/runtime paths as the RUNTIME category', () => {
      expect(DocumentationMapper.getCategory('https://bun.sh/docs/runtime/loaders')).toBe(
        DocumentationCategory.RUNTIME
      );
    });

    test('should classify /faq paths as the FAQ category', () => {
      expect(DocumentationMapper.getCategory('https://bun.sh/faq')).toBe(DocumentationCategory.FAQ);
    });

    test('should fall back to REFERENCE for unrecognized paths', () => {
      expect(DocumentationMapper.getCategory('https://bun.sh/about')).toBe(
        DocumentationCategory.REFERENCE
      );
    });
  });

  describe('getUrlType', () => {
    test('should classify /docs paths as DOCUMENTATION type', () => {
      expect(DocumentationMapper.getUrlType('https://bun.sh/docs/api')).toBe(UrlType.DOCUMENTATION);
    });

    test('should classify GitHub /issues/ paths as GITHUB_ISSUE type', () => {
      expect(DocumentationMapper.getUrlType('https://github.com/oven-sh/bun/issues/5')).toBe(
        UrlType.GITHUB_ISSUE
      );
    });

    test('should classify GitHub /pull/ paths as GITHUB_PULL_REQUEST type', () => {
      expect(DocumentationMapper.getUrlType('https://github.com/oven-sh/bun/pull/42')).toBe(
        UrlType.GITHUB_PULL_REQUEST
      );
    });

    test('should classify YouTube /watch paths as VIDEO_TUTORIAL type', () => {
      expect(DocumentationMapper.getUrlType('https://youtube.com/watch?v=abc')).toBe(
        UrlType.VIDEO_TUTORIAL
      );
    });

    test('should fall back to GITHUB_SOURCE for generic GitHub repository URLs', () => {
      expect(DocumentationMapper.getUrlType('https://github.com/oven-sh/bun')).toBe(
        UrlType.GITHUB_SOURCE
      );
    });

    test('should fall back to EXTERNAL_REFERENCE for unrecognized URLs', () => {
      expect(DocumentationMapper.getUrlType('https://example.com/page')).toBe(
        UrlType.EXTERNAL_REFERENCE
      );
    });

    test("should not false-positive on domains containing 'github.com' as a substring", () => {
      expect(DocumentationMapper.getUrlType('https://mygithub.com/repo')).toBe(
        UrlType.EXTERNAL_REFERENCE
      );
      expect(DocumentationMapper.getUrlType('https://notgithub.com/foo')).toBe(
        UrlType.EXTERNAL_REFERENCE
      );
    });
  });

  describe('classify', () => {
    test('should return provider, category, and urlType in a single call', () => {
      const result = DocumentationMapper.classify('https://bun.sh/docs/api/fetch');
      expect(result.provider).toBe(DocumentationProvider.BUN_OFFICIAL);
      expect(result.category).toBe(DocumentationCategory.API);
      expect(result.urlType).toBe(UrlType.DOCUMENTATION);
    });
  });
});

// ─── Domain classification ───────────────────────────────────────────

describe('classifyDomain', () => {
  test('should classify matching hosts as first-party', () => {
    expect(classifyDomain('bun.sh', 'bun.sh')).toBe('first-party');
  });

  test('should classify hosts as first-party regardless of case', () => {
    expect(classifyDomain('EXAMPLE.COM', 'example.com')).toBe('first-party');
    expect(classifyDomain('Bun.SH', 'bun.sh')).toBe('first-party');
  });

  test('should classify google-analytics.com as a tracker', () => {
    expect(classifyDomain('google-analytics.com', 'bun.sh')).toBe('tracker');
  });

  test('should classify cdn.* subdomains as CDN', () => {
    expect(classifyDomain('cdn.example.com', 'example.com')).toBe('cdn');
  });

  test('should classify known CDN providers like jsdelivr as CDN', () => {
    expect(classifyDomain('cdn.jsdelivr.net', 'bun.sh')).toBe('cdn');
  });

  test('should classify unrelated domains as third-party', () => {
    expect(classifyDomain('other-site.com', 'bun.sh')).toBe('third-party');
  });

  test('should prioritize tracker detection over CDN pattern matching', () => {
    expect(classifyDomain('tracking.example.com', 'bun.sh')).toBe('tracker');
  });
});

// ─── Asset group classification ──────────────────────────────────────

describe('classifyAssetGroup', () => {
  test('should classify the first request as critical regardless of MIME type', () => {
    expect(classifyAssetGroup('text/html', true)).toBe('critical');
  });

  test('should classify text/html responses as critical', () => {
    expect(classifyAssetGroup('text/html', false)).toBe('critical');
  });

  test('should classify text/css responses as critical', () => {
    expect(classifyAssetGroup('text/css', false)).toBe('critical');
  });

  test('should classify JavaScript responses as important', () => {
    expect(classifyAssetGroup('application/javascript', false)).toBe('important');
  });

  test('should classify font responses as important', () => {
    expect(classifyAssetGroup('font/woff2', false)).toBe('important');
  });

  test('should classify image responses as async', () => {
    expect(classifyAssetGroup('image/png', false)).toBe('async');
  });

  test('should classify video responses as deferred', () => {
    expect(classifyAssetGroup('video/mp4', false)).toBe('deferred');
  });

  test('should handle MIME types with leading or trailing whitespace', () => {
    expect(classifyAssetGroup('  text/html  ', false)).toBe('critical');
    expect(classifyAssetGroup(' application/javascript ', false)).toBe('important');
  });
});

// ─── Grading helpers ─────────────────────────────────────────────────

describe('gradeTTFB', () => {
  test('should grade 100ms TTFB as good', () => {
    expect(gradeTTFB(100)).toBe('good');
  });

  test('should grade exactly the good threshold as good', () => {
    expect(gradeTTFB(PERFORMANCE_THRESHOLDS.TTFB.good)).toBe('good');
  });

  test('should grade 400ms TTFB as needs-improvement', () => {
    expect(gradeTTFB(400)).toBe('needs-improvement');
  });

  test('should grade 1500ms TTFB as poor', () => {
    expect(gradeTTFB(1500)).toBe('poor');
  });
});

describe('gradeSize', () => {
  test('should grade a 1KB response as small', () => {
    expect(gradeSize(1024)).toBe('small');
  });

  test('should grade a 50KB response as medium', () => {
    expect(gradeSize(50_000)).toBe('medium');
  });

  test('should grade a 200KB response as large', () => {
    expect(gradeSize(200_000)).toBe('large');
  });

  test('should grade a 2MB response as huge', () => {
    expect(gradeSize(2_000_000)).toBe('huge');
  });
});
