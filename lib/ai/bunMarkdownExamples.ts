// lib/ai/bunMarkdownExamples.ts — Markdown constants usage examples

import React, { useMemo, useState, useEffect } from 'react';
import {
  MARKDOWN_FEATURES,
  MARKDOWN_SECURITY,
  MARKDOWN_DOMAINS,
  HTML_RENDERERS,
  TEXT_RENDERERS,
  TERMINAL_RENDERERS,
  REACT_COMPONENTS,
  MarkdownPresets,
  MarkdownCache,
  VALIDATION,
  Sanitizers,
  PERFORMANCE,
  ERRORS,
  CONFIG_MATRIX,
  MIGRATION,
} from './bunMarkdownConstants';

// ============================================================================
// COMPLETE PRODUCTION SETUP
// ============================================================================

/** Production renderer for user content with strict security */
export const userContentRenderer = MarkdownPresets.render('TAILWIND', {
  ...MARKDOWN_FEATURES.BLOG,
  ...MARKDOWN_SECURITY.STRICT,
});

/** Production renderer for trusted content */
export const trustedContentRenderer = MarkdownPresets.render('TAILWIND', {
  ...MARKDOWN_FEATURES.DOCS,
  ...MARKDOWN_SECURITY.MODERATE,
});

/** React component for trusted content */
export const TrustedMarkdown = ({ content }: { content: string }) =>
  MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(content);

/** CLI renderer for terminal output */
export const cliRenderer = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);

// ============================================================================
// CACHED RENDERER SETUP
// ============================================================================

/** Simple hash function for cache keys */
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

/** Production cache with LRU and TTL */
const productionCache = MarkdownCache.createLRUCache(500, 3600000); // 500 items, 1 hour TTL

/** Cached renderer for performance */
export const cachedRender = (markdown: string, options?: Record<string, any>) => {
  const cacheKey = `markdown:${simpleHash(markdown)}:${JSON.stringify(options || {})}`;

  const cached = productionCache.get(cacheKey);
  if (cached) return cached;

  const result = userContentRenderer(markdown);
  productionCache.set(cacheKey, result);

  return result;
};

// ============================================================================
// VALIDATION WRAPPER
// ============================================================================

/** Safe markdown renderer with validation */
export const safeMarkdown = (markdown: string, options: Record<string, any> = {}) => {
  // Size validation
  if (markdown.length > VALIDATION.MAX_SIZES.DOCUMENT) {
    throw new Error(ERRORS.MESSAGES.SIZE_ERROR);
  }

  // Security validation
  if (VALIDATION.BLACKLISTED_PATTERNS.some(pattern => pattern.test(markdown))) {
    throw new Error(ERRORS.MESSAGES.SECURITY_ERROR);
  }

  return cachedRender(markdown, options);
};

/** Advanced validation with recovery */
export const safeMarkdownWithRecovery = (markdown: string, options: Record<string, any> = {}) => {
  try {
    return safeMarkdown(markdown, options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERRORS.MESSAGES.PARSE_ERROR;

    // Recovery strategies
    if (errorMessage.includes(ERRORS.MESSAGES.SIZE_ERROR)) {
      // Truncate and retry
      const truncated = Sanitizers.truncate(markdown, VALIDATION.MAX_SIZES.DOCUMENT);
      return cachedRender(truncated, options);
    }

    if (errorMessage.includes(ERRORS.MESSAGES.SECURITY_ERROR)) {
      // Strip HTML and retry
      const stripped = Sanitizers.escapeHtml(markdown);
      return cachedRender(stripped, options);
    }

    // Fallback to plain text
    return `<div class="error">${errorMessage}</div><pre>${Sanitizers.escapeHtml(markdown)}</pre>`;
  }
};

// ============================================================================
// REACT HOOK
// ============================================================================

interface UseMarkdownOptions {
  preset?: keyof typeof MARKDOWN_FEATURES;
  security?: keyof typeof MARKDOWN_SECURITY;
  debounceTime?: number;
  enableCache?: boolean;
}

interface UseMarkdownResult {
  result: string | React.ReactNode;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/** React hook for markdown processing */
export function useMarkdown(content: string, options: UseMarkdownOptions = {}): UseMarkdownResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | React.ReactNode>('');
  const [retryCount, setRetryCount] = useState(0);

  const {
    preset = 'BLOG',
    security = 'STRICT',
    debounceTime = PERFORMANCE.DEBOUNCE.NORMAL,
    enableCache = true,
  } = options;

  const renderer = useMemo(() => {
    if (preset === 'GFM' && security === 'STRICT') {
      return enableCache ? cachedRender : userContentRenderer;
    }
    return MarkdownPresets.html(preset, security);
  }, [preset, security, enableCache]);

  const retry = () => {
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!content.trim()) {
        setResult('');
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const rendered = renderer(content);
        setResult(rendered);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : ERRORS.MESSAGES.PARSE_ERROR;
        setError(errorMessage);
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [content, renderer, debounceTime, retryCount]);

  return { result, isLoading, error, retry };
}

// ============================================================================
// API ENDPOINT HANDLERS
// ============================================================================

/** API request/response types */
interface RenderMarkdownRequest {
  markdown: string;
  options?: {
    preset?: keyof typeof MARKDOWN_FEATURES;
    security?: keyof typeof MARKDOWN_SECURITY;
    format?: 'html' | 'react' | 'text' | 'terminal';
  };
}

interface RenderMarkdownResponse {
  success: boolean;
  html?: string;
  react?: string;
  text?: string;
  error?: {
    code: string;
    message: string;
  };
}

/** API endpoint for rendering markdown */
export async function renderMarkdownAPI(
  request: RenderMarkdownRequest
): Promise<RenderMarkdownResponse> {
  try {
    const { markdown, options = {} } = request;

    if (!markdown) {
      return {
        success: false,
        error: {
          code: ERRORS.CODES.VALIDATION_ERROR,
          message: 'Markdown content is required',
        },
      };
    }

    // Validate input
    if (markdown.length > VALIDATION.MAX_SIZES.DOCUMENT) {
      return {
        success: false,
        error: {
          code: ERRORS.CODES.SIZE_ERROR,
          message: ERRORS.MESSAGES.SIZE_ERROR,
        },
      };
    }

    // Security validation
    if (VALIDATION.BLACKLISTED_PATTERNS.some(pattern => pattern.test(markdown))) {
      return {
        success: false,
        error: {
          code: ERRORS.CODES.SECURITY_ERROR,
          message: ERRORS.MESSAGES.SECURITY_ERROR,
        },
      };
    }

    const { preset = 'GFM', security = 'MODERATE', format = 'html' } = options;

    // Sanitize input
    const sanitized = Sanitizers.escapeHtml(markdown);

    // Render based on format
    switch (format) {
      case 'html':
        const html = Bun.markdown.html(sanitized, {
          ...MARKDOWN_FEATURES[preset],
          ...MARKDOWN_SECURITY[security],
        });
        return { success: true, html };

      case 'react':
        const reactComponent = MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(sanitized);
        return { success: true, react: JSON.stringify(reactComponent) };

      case 'text':
        const text = Bun.markdown.render(sanitized, TEXT_RENDERERS.PLAIN, {
          ...MARKDOWN_FEATURES[preset],
        });
        return { success: true, text };

      case 'terminal':
        const terminal = Bun.markdown.render(sanitized, TERMINAL_RENDERERS.COLOR, {
          ...MARKDOWN_FEATURES.TERMINAL,
        });
        return { success: true, text: terminal };

      default:
        return {
          success: false,
          error: {
            code: ERRORS.CODES.VALIDATION_ERROR,
            message: 'Invalid format specified',
          },
        };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: ERRORS.CODES.PARSE_ERROR,
        message: error instanceof Error ? error.message : ERRORS.MESSAGES.PARSE_ERROR,
      },
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

interface BatchRenderItem {
  id: string;
  markdown: string;
  options?: RenderMarkdownRequest['options'];
}

interface BatchRenderResult {
  id: string;
  success: boolean;
  result?: string;
  error?: string;
}

/** Batch markdown processing with progress tracking */
export async function batchRenderMarkdown(
  items: BatchRenderItem[],
  onProgress?: (completed: number, total: number) => void
): Promise<BatchRenderResult[]> {
  const results: BatchRenderResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      const response = await renderMarkdownAPI({
        markdown: item.markdown,
        options: item.options,
      });

      results.push({
        id: item.id,
        success: response.success,
        result: response.html || response.text || response.react,
        error: response.error?.message,
      });
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  return results;
}

// ============================================================================
// CONFIGURATION BUILDER
// ============================================================================

interface MarkdownConfigBuilder {
  preset?: keyof typeof MARKDOWN_FEATURES;
  security?: keyof typeof MARKDOWN_SECURITY;
  renderer?: keyof typeof HTML_RENDERERS;
  cache?: boolean;
  customOptions?: Record<string, any>;
}

/** Builder pattern for markdown configuration */
export class MarkdownConfig {
  private config: MarkdownConfigBuilder = {};

  withPreset(preset: keyof typeof MARKDOWN_FEATURES): this {
    this.config.preset = preset;
    return this;
  }

  withSecurity(security: keyof typeof MARKDOWN_SECURITY): this {
    this.config.security = security;
    return this;
  }

  withRenderer(renderer: keyof typeof HTML_RENDERERS): this {
    this.config.renderer = renderer;
    return this;
  }

  withCache(enabled: boolean = true): this {
    this.config.cache = enabled;
    return this;
  }

  withCustomOptions(options: Record<string, any>): this {
    this.config.customOptions = { ...this.config.customOptions, ...options };
    return this;
  }

  build() {
    const {
      preset = 'GFM',
      security = 'MODERATE',
      renderer,
      cache = true,
      customOptions = {},
    } = this.config;

    const baseOptions = {
      ...MARKDOWN_FEATURES[preset],
      ...MARKDOWN_SECURITY[security],
      ...customOptions,
    };

    const renderFn = renderer
      ? MarkdownPresets.render(renderer, baseOptions)
      : MarkdownPresets.html(preset, security);

    return {
      render: cache ? (markdown: string) => cachedRender(markdown, baseOptions) : renderFn,
      config: baseOptions,
      preset,
      security,
      renderer,
    };
  }
}

// ============================================================================
// PRESET FACTORIES FOR COMMON USE CASES
// ============================================================================

/** Factory for user-generated content */
export const createUserContentRenderer = () =>
  new MarkdownConfig()
    .withPreset('BLOG')
    .withSecurity('STRICT')
    .withRenderer('TAILWIND')
    .withCache(true)
    .build();

/** Factory for documentation sites */
export const createDocumentationRenderer = () =>
  new MarkdownConfig()
    .withPreset('DOCS')
    .withSecurity('MODERATE')
    .withRenderer('TAILWIND')
    .withCache(true)
    .build();

/** Factory for internal wikis */
export const createWikiRenderer = () =>
  new MarkdownConfig()
    .withPreset('WIKI')
    .withSecurity('DEVELOPER')
    .withRenderer('TAILWIND')
    .withCache(false)
    .build();

/** Factory for CLI tools */
export const createCliRenderer = () =>
  new MarkdownConfig()
    .withPreset('TERMINAL')
    .withSecurity('MODERATE')
    .withRenderer('COLOR')
    .withCache(false)
    .build();

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/** Migrate from Marked.js options */
export const migrateFromMarked = (markedOptions: Record<string, any>) => {
  const bunOptions: Record<string, any> = {};

  Object.entries(MIGRATION.FROM_MARKED).forEach(([markedKey, bunKey]) => {
    if (markedKey in markedOptions) {
      if (typeof bunKey === 'string') {
        bunOptions[bunKey] = markedOptions[markedKey];
      } else if (typeof bunKey === 'object') {
        Object.entries(bunKey).forEach(([subKey, mapping]) => {
          if (typeof mapping === 'string' && mapping.startsWith('!')) {
            bunOptions[subKey] = !markedOptions[markedKey];
          } else {
            bunOptions[subKey] = markedOptions[markedKey];
          }
        });
      }
    }
  });

  return bunOptions;
};

/** Migrate from Markdown-it options */
export const migrateFromMarkdownIt = (mdOptions: Record<string, any>) => {
  const bunOptions: Record<string, any> = {};

  Object.entries(MIGRATION.FROM_MARKDOWN_IT).forEach(([mdKey, bunKey]) => {
    if (mdKey in mdOptions) {
      if (typeof bunKey === 'string' && bunKey.startsWith('!')) {
        const optionName = bunKey.slice(1);
        bunOptions[optionName] = !mdOptions[mdKey];
      } else {
        bunOptions[bunKey] = mdOptions[mdKey];
      }
    }
  });

  return bunOptions;
};

// ============================================================================
// QUICK START EXAMPLES
// ============================================================================

/** Example 1: Safe HTML for user content */
export const renderUserContent = MarkdownPresets.html('BLOG', 'STRICT');

/** Example 2: React component with Tailwind */
export const MarkdownComponent = ({ content }: { content: string }) =>
  MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(content);

/** Example 3: CLI output */
export const renderForTerminal = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);

/** Example 4: Email newsletter */
export const renderForEmail = MarkdownPresets.html('EMAIL', 'STRICT');

/** Example 5: Academic paper */
export const renderAcademic = MarkdownPresets.html('ACADEMIC', 'MODERATE');

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface PerformanceMetrics {
  renderTime: number;
  cacheHit: boolean;
  documentSize: number;
  timestamp: number;
}

/** Performance monitoring wrapper */
export const withPerformanceMonitoring = (renderFn: (markdown: string) => string) => {
  const metrics: PerformanceMetrics[] = [];

  return (markdown: string): string => {
    const startTime = performance.now();
    const documentSize = markdown.length;
    const timestamp = Date.now();

    const result = renderFn(markdown);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    metrics.push({
      renderTime,
      cacheHit: false, // Would need cache integration to detect this
      documentSize,
      timestamp,
    });

    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift();
    }

    return result;
  };
};

/** Get performance statistics */
export const getPerformanceStats = () => {
  // This would integrate with the monitoring wrapper above
  return {
    averageRenderTime: 0,
    cacheHitRate: 0,
    totalDocuments: 0,
    averageDocumentSize: 0,
  };
};

// ============================================================================
// EXPORT ALL EXAMPLES
// ============================================================================

export {
  // Core renderers
  userContentRenderer,
  trustedContentRenderer,
  TrustedMarkdown,
  cliRenderer,

  // Safe rendering
  safeMarkdown,
  safeMarkdownWithRecovery,
  cachedRender,

  // React integration
  useMarkdown,
  MarkdownComponent,

  // API integration
  renderMarkdownAPI,
  batchRenderMarkdown,

  // Configuration
  MarkdownConfig,
  createUserContentRenderer,
  createDocumentationRenderer,
  createWikiRenderer,
  createCliRenderer,

  // Migration
  migrateFromMarked,
  migrateFromMarkdownIt,

  // Quick examples
  renderUserContent,
  renderForTerminal,
  renderForEmail,
  renderAcademic,

  // Performance
  withPerformanceMonitoring,
  getPerformanceStats,
};
