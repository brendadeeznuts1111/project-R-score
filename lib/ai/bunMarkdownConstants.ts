// lib/ai/bunMarkdownConstants.ts — Markdown configuration presets and renderers

import React from 'react';

// ============================================================================
// CORE PRESETS
// ============================================================================

/** Security presets for different trust levels */
export const MARKDOWN_SECURITY = {
  /** Maximum security - for untrusted user content */
  STRICT: {
    tagFilter: true,
    noHtmlBlocks: true,
    noHtmlSpans: true,
    autolinks: false,
    wikiLinks: false,
    latexMath: false,
    noIndentedCodeBlocks: false,
    hardSoftBreaks: false
  } as const,

  /** Moderate security - for trusted authors */
  MODERATE: {
    tagFilter: true,
    noHtmlBlocks: false,
    noHtmlSpans: false,
    autolinks: { url: true, www: true, email: false },
    wikiLinks: false,
    latexMath: false
  } as const,

  /** Developer content - internal/trusted */
  DEVELOPER: {
    tagFilter: false,
    noHtmlBlocks: false,
    noHtmlSpans: false,
    autolinks: true,
    wikiLinks: true,
    latexMath: true
  } as const
} as const;

/** Feature presets for different markdown flavors */
export const MARKDOWN_FEATURES = {
  /** GitHub Flavored Markdown */
  GFM: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    hardSoftBreaks: false,
    tagFilter: false
  } as const,

  /** CommonMark standard */
  COMMONMARK: {
    tables: false,
    strikethrough: false,
    tasklists: false,
    autolinks: false,
    hardSoftBreaks: false,
    noHtmlBlocks: false,
    noHtmlSpans: false
  } as const,

  /** Documentation sites (like docsify, mkdocs) */
  DOCS: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true, autolink: true },
    wikiLinks: true,
    hardSoftBreaks: false
  } as const,

  /** Blog/CMS content */
  BLOG: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true },
    hardSoftBreaks: false,
    underline: false,
    collapseWhitespace: true
  } as const,

  /** CLI/terminal output */
  TERMINAL: {
    tables: true,
    strikethrough: true,
    autolinks: true,
    hardSoftBreaks: true,
    collapseWhitespace: true,
    permissiveAtxHeaders: false
  } as const,

  /** Academic/technical writing */
  ACADEMIC: {
    tables: true,
    strikethrough: true,
    autolinks: true,
    headings: { ids: true },
    latexMath: true,
    hardSoftBreaks: false
  } as const
} as const;

/** Domain-specific presets for different applications */
export const MARKDOWN_DOMAINS = {
  /** Next.js/React apps */
  REACT_APP: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true },
    noHtmlBlocks: true,  // Prefer JSX over HTML
    noHtmlSpans: true
  } as const,

  /** Static site generators (11ty, Hugo) */
  STATIC_SITE: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true },
    wikiLinks: true,
    hardSoftBreaks: false
  } as const,

  /** API documentation */
  API_DOCS: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true, autolink: true },
    noHtmlBlocks: false,
    noHtmlSpans: false
  } as const,

  /** Internal wikis */
  WIKI: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true },
    wikiLinks: true,
    hardSoftBreaks: false
  } as const,

  /** Email/newsletter content */
  EMAIL: {
    tables: false,  // Email client compatibility
    strikethrough: false,
    tasklists: false,
    autolinks: true,
    headings: { ids: false },
    hardSoftBreaks: true,
    noHtmlBlocks: true,
    noHtmlSpans: true
  } as const
} as const;

// ============================================================================
// RENDERER TEMPLATES
// ============================================================================

/** HTML renderer constants with different CSS frameworks */
export const HTML_RENDERERS = {
  /** Tailwind CSS classes */
  TAILWIND: {
    heading: (children: string, { level, id }: { level: number; id?: string }) =>
      `<h${level} id="${id || ''}" class="font-bold ${level === 1 ? 'text-3xl' : level === 2 ? 'text-2xl' : 'text-xl'} mb-4">${children}</h${level}>`,

    paragraph: (children: string) =>
      `<p class="mb-4 text-gray-700 leading-relaxed">${children}</p>`,

    strong: (children: string) =>
      `<strong class="font-bold">${children}</strong>`,

    emphasis: (children: string) =>
      `<em class="italic">${children}</em>`,

    link: (children: string, { href }: { href: string }) =>
      `<a href="${href}" class="text-blue-600 hover:underline hover:text-blue-800">${children}</a>`,

    code: (children: string, { language }: { language?: string }) =>
      `<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto mb-4"><code class="language-${language || 'text'}">${children}</code></pre>`,

    codespan: (children: string) =>
      `<code class="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">${children}</code>`
  } as const,

  /** Bootstrap classes */
  BOOTSTRAP: {
    heading: (children: string, { level }: { level: number }) =>
      `<h${level} class="mb-3">${children}</h${level}>`,

    paragraph: (children: string) =>
      `<p class="mb-3">${children}</p>`,

    link: (children: string, { href }: { href: string }) =>
      `<a href="${href}" class="link-primary">${children}</a>`,

    code: (children: string) =>
      `<pre class="bg-light p-3 rounded mb-3"><code>${children}</code></pre>`
  } as const,

  /** Minimal/semantic */
  SEMANTIC: {
    heading: (children: string, { level, id }: { level: number; id?: string }) =>
      `<h${level} id="${id || ''}">${children}</h${level}>`,

    paragraph: (children: string) =>
      `<p>${children}</p>`,

    strong: (children: string) =>
      `<strong>${children}</strong>`,

    emphasis: (children: string) =>
      `<em>${children}</em>`,

    link: (children: string, { href, title }: { href: string; title?: string }) =>
      `<a href="${href}"${title ? ` title="${title}"` : ''}>${children}</a>`
  } as const
} as const;

/** Plain text renderers for different output formats */
export const TEXT_RENDERERS = {
  /** Plain text (strip all formatting) */
  PLAIN: {
    heading: (children: string) => `${children}\n`,
    paragraph: (children: string) => `${children}\n\n`,
    strong: (children: string) => children,
    emphasis: (children: string) => children,
    link: (children: string) => children,
    image: () => '',
    code: (children: string) => children,
    codespan: (children: string) => children,
    list: (children: string) => children,
    listItem: (children: string) => `• ${children}\n`
  } as const,

  /** Markdown output (convert to markdown) */
  MARKDOWN_OUTPUT: {
    heading: (children: string, { level }: { level: number }) => `${'#'.repeat(level)} ${children}\n\n`,
    paragraph: (children: string) => `${children}\n\n`,
    strong: (children: string) => `**${children}**`,
    emphasis: (children: string) => `*${children}*`,
    link: (children: string, { href }: { href: string }) => `[${children}](${href})`,
    image: (children: string, { src }: { src: string }) => `![${children}](${src})`,
    code: (children: string) => `\`\`\`\n${children}\n\`\`\`\n\n`,
    codespan: (children: string) => `\`${children}\``
  } as const,

  /** Slack/chat formatting */
  SLACK: {
    heading: (children: string, { level }: { level: number }) => `*${children}*\n`,
    paragraph: (children: string) => `${children}\n`,
    strong: (children: string) => `*${children}*`,
    emphasis: (children: string) => `_${children}_`,
    link: (children: string, { href }: { href: string }) => `<${href}|${children}>`,
    code: (children: string) => `\`\`\`\n${children}\n\`\`\``,
    codespan: (children: string) => `\`${children}\``
  } as const
} as const;

/** Terminal/ANSI renderers for CLI output */
export const TERMINAL_RENDERERS = {
  /** Colorful terminal output */
  COLOR: {
    heading: (children: string, { level }: { level: number }) => {
      const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;34m', '\x1b[1;33m', '\x1b[1;32m', '\x1b[1;31m'];
      return `${colors[level - 1] || '\x1b[1m'}${children}\x1b[0m\n`;
    },

    paragraph: (children: string) => `\x1b[0m${children}\n`,

    strong: (children: string) => `\x1b[1m${children}\x1b[22m`,

    emphasis: (children: string) => `\x1b[3m${children}\x1b[23m`,

    link: (children: string, { href }: { href: string }) => `\x1b[4;94m${children}\x1b[0m (\x1b[90m${href}\x1b[0m)`,

    code: (children: string) => `\x1b[48;5;235m${children}\x1b[0m`,

    codespan: (children: string) => `\x1b[48;5;236m\x1b[37m${children}\x1b[0m`
  } as const,

  /** Simple monochrome */
  MONOCHROME: {
    heading: (children: string, { level }: { level: number }) => `${'='.repeat(children.length)}\n${children}\n${'='.repeat(children.length)}\n`,
    paragraph: (children: string) => `${children}\n`,
    strong: (children: string) => children,
    emphasis: (children: string) => children,
    link: (children: string, { href }: { href: string }) => `${children} (${href})`,
    code: (children: string) => `${children}\n`,
    codespan: (children: string) => children
  } as const
} as const;

// ============================================================================
// REACT COMPONENT LIBRARIES
// ============================================================================

/** Popular UI framework components */
export const REACT_COMPONENTS = {
  /** Tailwind + @tailwindcss/typography */
  TAILWIND_TYPOGRAPHY: {
    h1: ({ children, id }: { children: React.ReactNode; id?: string }) => (
      <h1 id={id} className="text-4xl font-bold mb-6">
        {children}
      </h1>
    ),

    h2: ({ children, id }: { children: React.ReactNode; id?: string }) => (
      <h2 id={id} className="text-3xl font-bold mb-4 mt-8">
        {children}
      </h2>
    ),

    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-4 leading-relaxed">
        {children}
      </p>
    ),

    a: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 hover:underline"
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    code: ({ children }: { children: React.ReactNode }) => (
      <code className="bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm">
        {children}
      </code>
    ),

    pre: ({ language, children }: { language?: string; children: React.ReactNode }) => (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4">
        <code className={`language-${language}`}>
          {children}
        </code>
      </pre>
    )
  } as const
} as const;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/** Factory functions for creating markdown renderers */
export const MarkdownPresets = {
  /** Create HTML renderer with security */
  html: (preset: keyof typeof MARKDOWN_FEATURES = 'GFM', security: keyof typeof MARKDOWN_SECURITY = 'MODERATE') =>
    (markdown: string) => {
      // Runtime check for Bun API availability
      if (typeof Bun?.markdown?.html !== 'function') {
        throw new Error('Bun.markdown.html is not available. Please ensure you are running in Bun environment.');
      }

      // Input validation
      if (typeof markdown !== 'string') {
        throw new Error('Markdown content must be a string');
      }

      if (markdown.length > VALIDATION.MAX_SIZES.DOCUMENT) {
        throw new Error(ERRORS.MESSAGES.SIZE_ERROR);
      }

      const options = {
        ...MARKDOWN_FEATURES[preset],
        ...MARKDOWN_SECURITY[security]
      };

      try {
        return Bun.markdown.html(markdown, options);
      } catch (error) {
        throw new Error(`${ERRORS.CODES.PARSE_ERROR}: ${error.message}`);
      }
    },

  /** Create renderer with specific output format */
  render: (format: keyof typeof HTML_RENDERERS = 'TAILWIND', options: Record<string, any> = {}) =>
    (markdown: string) => {
      // Runtime check for Bun API availability
      if (typeof Bun?.markdown?.render !== 'function') {
        throw new Error('Bun.markdown.render is not available. Please ensure you are running in Bun environment.');
      }

      // Input validation
      if (typeof markdown !== 'string') {
        throw new Error('Markdown content must be a string');
      }

      if (markdown.length > VALIDATION.MAX_SIZES.DOCUMENT) {
        throw new Error(ERRORS.MESSAGES.SIZE_ERROR);
      }

      const renderer = HTML_RENDERERS[format];
      const featureOpts = { ...MARKDOWN_FEATURES.GFM, ...options };

      try {
        return Bun.markdown.render(markdown, renderer, featureOpts);
      } catch (error) {
        throw new Error(`${ERRORS.CODES.PARSE_ERROR}: ${error.message}`);
      }
    },

  /** Create React component with framework */
  react: (framework: keyof typeof REACT_COMPONENTS = 'TAILWIND_TYPOGRAPHY', options: Record<string, any> = {}) =>
    (markdown: string) => {
      // Runtime check for Bun API availability
      if (typeof Bun?.markdown?.react !== 'function') {
        throw new Error('Bun.markdown.react is not available. Please ensure you are running in Bun environment.');
      }

      // Input validation
      if (typeof markdown !== 'string') {
        throw new Error('Markdown content must be a string');
      }

      if (markdown.length > VALIDATION.MAX_SIZES.DOCUMENT) {
        throw new Error(ERRORS.MESSAGES.SIZE_ERROR);
      }

      const components = REACT_COMPONENTS[framework];
      const featureOpts = {
        ...MARKDOWN_FEATURES.GFM,
        ...MARKDOWN_DOMAINS.REACT_APP,
        ...options
      };

      try {
        return Bun.markdown.react(markdown, components, featureOpts);
      } catch (error) {
        throw new Error(`${ERRORS.CODES.PARSE_ERROR}: ${error.message}`);
      }
    }
} as const;

/** Cache factory functions */
export const MarkdownCache = {
  /** Generate secure cache key to prevent collisions */
  generateSecureCacheKey: (content: string, prefix = 'md'): string => {
    // Use a simple hash function for better key generation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${prefix}:${Math.abs(hash).toString(36)}:${content.length}`;
  },

  /** Simple in-memory cache */
  createMemoryCache: (maxSize = 100) => {
    const cache = new Map<string, any>();

    return {
      get: (key: string) => cache.get(key),
      set: (key: string, value: any) => {
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
      },
      clear: () => cache.clear(),
      has: (key: string) => cache.has(key),
      delete: (key: string) => cache.delete(key),
      size: () => cache.size
    };
  },

  /** LRU cache with TTL */
  createLRUCache: (maxSize = 100, ttl = 3600000) => {
    const cache = new Map<string, any>();
    const timestamps = new Map<string, number>();

    return {
      get: (key: string) => {
        if (!cache.has(key)) return null;

        const timestamp = timestamps.get(key);
        if (!timestamp || Date.now() - timestamp > ttl) {
          cache.delete(key);
          timestamps.delete(key);
          return null;
        }

        const value = cache.get(key);
        if (value !== undefined) {
          // Refresh position - move to end (LRU behavior)
          cache.delete(key);
          cache.set(key, value);
        }
        return value || null;
      },

      set: (key: string, value: any) => {
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
          timestamps.delete(firstKey);
        }

        cache.set(key, value);
        timestamps.set(key, Date.now());
      },

      clear: () => {
        cache.clear();
        timestamps.clear();
      },

      has: (key: string) => {
        if (!cache.has(key)) return false;

        const timestamp = timestamps.get(key);
        if (!timestamp || Date.now() - timestamp > ttl) {
          cache.delete(key);
          timestamps.delete(key);
          return false;
        }

        return true;
      },

      delete: (key: string) => {
        cache.delete(key);
        timestamps.delete(key);
      },

      size: () => cache.size
    };
  }
} as const;

// ============================================================================
// VALIDATION & SANITIZATION
// ============================================================================

/** Validation constants */
export const VALIDATION = {
  /** Maximum sizes (in characters) */
  MAX_SIZES: {
    DOCUMENT: 1000000,      // 1MB approx
    PARAGRAPH: 10000,
    HEADING: 500,
    LINK_TEXT: 200,
    IMAGE_ALT: 200
  } as const,

  /** Allowed protocols */
  ALLOWED_PROTOCOLS: [
    'http:',
    'https:',
    'mailto:',
    'tel:',
    '#'
  ] as const,

  /** Allowed image extensions */
  ALLOWED_IMAGE_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.avif', '.bmp', '.tiff'
  ] as const,

  /** Blacklisted patterns (regex) */
  BLACKLISTED_PATTERNS: [
    /<script\b[^>]*>/i,
    /on\w+\s*=/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ] as const
} as const;

/** Sanitization functions */
export const Sanitizers = {
  /** Escape HTML entities */
  escapeHtml: (text: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  /** Validate URL */
  validateUrl: (url: string) => {
    try {
      // Input validation
      if (typeof url !== 'string' || url.trim().length === 0) {
        return false;
      }

      // Length check to prevent extremely long URLs
      if (url.length > VALIDATION.MAX_SIZES.LINK_TEXT * 10) {
        return false;
      }

      const parsed = new URL(url, 'http://localhost');

      // Check protocol
      if (!VALIDATION.ALLOWED_PROTOCOLS.includes(parsed.protocol as any)) {
        return false;
      }

      // Check for blacklisted patterns
      return !VALIDATION.BLACKLISTED_PATTERNS.some(pattern =>
        pattern.test(url)
      );
    } catch {
      return false;
    }
  },

  /** Truncate to safe length */
  truncate: (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
} as const;

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

export const PERFORMANCE = {
  /** Debounce times for live preview */
  DEBOUNCE: {
    FAST: 100,      // For typing
    NORMAL: 300,    // For live preview
    SLOW: 1000      // For heavy processing
  } as const,

  /** Chunk sizes for large documents */
  CHUNK_SIZES: {
    PARAGRAPHS: 50,
    CHARACTERS: 10000,
    LINES: 500
  } as const,

  /** Memory limits */
  MEMORY_LIMITS: {
    CACHE_ENTRIES: 1000,
    CACHE_SIZE_MB: 100,
    DOCUMENT_SIZE_MB: 10
  } as const
} as const;

// ============================================================================
// ERROR CONSTANTS
// ============================================================================

export const ERRORS = {
  CODES: {
    PARSE_ERROR: 'MARKDOWN_PARSE_ERROR',
    SECURITY_ERROR: 'MARKDOWN_SECURITY_ERROR',
    SIZE_ERROR: 'MARKDOWN_SIZE_ERROR',
    VALIDATION_ERROR: 'MARKDOWN_VALIDATION_ERROR',
    CACHE_ERROR: 'MARKDOWN_CACHE_ERROR'
  } as const,

  MESSAGES: {
    PARSE_ERROR: 'Failed to parse markdown',
    SECURITY_ERROR: 'Content contains potentially unsafe elements',
    SIZE_ERROR: 'Content exceeds maximum allowed size',
    VALIDATION_ERROR: 'Content validation failed',
    CACHE_ERROR: 'Failed to cache markdown result'
  } as const,

  /** Recovery strategies */
  RECOVERY: {
    STRIP_AND_RETRY: 'strip_and_retry',
    TRUNCATE_AND_RETRY: 'truncate_and_retry',
    FALLBACK_TO_TEXT: 'fallback_to_text',
    RETURN_ERROR: 'return_error'
  } as const
} as const;

// ============================================================================
// CONFIGURATION MATRIX
// ============================================================================

export const CONFIG_MATRIX = {
  /** Use case → Recommended config */
  'User Comments': {
    features: MARKDOWN_FEATURES.BLOG,
    security: MARKDOWN_SECURITY.STRICT,
    renderer: HTML_RENDERERS.SEMANTIC,
    cache: MarkdownCache.createLRUCache(1000, 3600000)
  },

  'Technical Documentation': {
    features: MARKDOWN_FEATURES.DOCS,
    security: MARKDOWN_SECURITY.MODERATE,
    renderer: HTML_RENDERERS.TAILWIND,
    cache: MarkdownCache.createMemoryCache(500)
  },

  'Internal Wiki': {
    features: MARKDOWN_FEATURES.WIKI,
    security: MARKDOWN_SECURITY.DEVELOPER,
    renderer: HTML_RENDERERS.TAILWIND,
    components: REACT_COMPONENTS.TAILWIND_TYPOGRAPHY
  },

  'CLI Tool Output': {
    features: MARKDOWN_FEATURES.TERMINAL,
    security: MARKDOWN_SECURITY.MODERATE,
    renderer: TERMINAL_RENDERERS.COLOR,
    cache: null // No cache needed for CLI
  },

  'Email Newsletter': {
    features: MARKDOWN_DOMAINS.EMAIL,
    security: MARKDOWN_SECURITY.STRICT,
    renderer: HTML_RENDERERS.SEMANTIC,
    cache: MarkdownCache.createMemoryCache(100)
  }
} as const;

// ============================================================================
// MIGRATION CONSTANTS
// ============================================================================

export const MIGRATION = {
  /** Option mapping from other libraries */
  FROM_MARKED: {
    gfm: 'tables',
    breaks: 'hardSoftBreaks',
    headerIds: 'headings.ids',
    mangle: false, // Not supported
    sanitize: 'tagFilter'
  } as const,

  FROM_REMARK_REHYPE: {
    gfm: 'tables',
    footnotes: false, // Not supported
    remarkRehype: {
      allowDangerousHtml: '!noHtmlBlocks && !noHtmlSpans'
    }
  } as const,

  FROM_MARKDOWN_IT: {
    html: '!noHtmlBlocks && !noHtmlSpans',
    linkify: 'autolinks',
    typographer: 'latexMath'
  } as const
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Type for markdown security options */
export type MarkdownSecurityOptions = typeof MARKDOWN_SECURITY[keyof typeof MARKDOWN_SECURITY];

/** Type for markdown feature options */
export type MarkdownFeatureOptions = typeof MARKDOWN_FEATURES[keyof typeof MARKDOWN_FEATURES];

/** Type for HTML renderer functions */
export type HtmlRenderer = Record<string, (...args: any[]) => string>;

/** Type for React component props */
export interface ReactComponentProps {
  children?: React.ReactNode;
  [key: string]: any;
}

/** Type for React component map */
export type ReactComponents = Record<string, React.ComponentType<ReactComponentProps>>;

/** Type for cache interface */
export interface MarkdownCacheInterface {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  clear: () => void;
  has?: (key: string) => boolean;
  delete?: (key: string) => boolean;
  size?: () => number;
}

/** Type for error codes */
export type MarkdownErrorCode = typeof ERRORS.CODES[keyof typeof ERRORS.CODES];

/** Type for recovery strategies */
export type RecoveryStrategy = typeof ERRORS.RECOVERY[keyof typeof ERRORS.RECOVERY];

// ============================================================================
// BENCHMARKING UTILITIES
// ============================================================================

/**
 * Performance benchmark for Bun Markdown API
 * Tests both html() and render() methods with configurable iterations
 */
export function benchmark(iterations = 1000) {
  const markdown = `# Test\n\n**Bold** and *italic*`;

  console.time('Bun.markdown.html');
  for (let i = 0; i < iterations; i++) {
    Bun.markdown.html(markdown, { tables: true });
  }
  console.timeEnd('Bun.markdown.html');

  console.time('Bun.markdown.render');
  for (let i = 0; i < iterations; i++) {
    Bun.markdown.render(markdown, {
      heading: (c, { l }) => `<h${l}>${c}</h${l}>`,
      paragraph: c => `<p>${c}</p>`
    });
  }
  console.timeEnd('Bun.markdown.render');
}

/**
 * Memory usage measurement for Markdown processing
 * Measures heap usage before and after parsing large documents
 */
export function measureMemory(largeMarkdown: string) {
  const before = process.memoryUsage().heapUsed;
  const result = Bun.markdown.html(largeMarkdown);
  const after = process.memoryUsage().heapUsed;

  console.log(`Memory used: ${(after - before) / 1024 / 1024} MB`);
  return {
    memoryUsed: (after - before) / 1024 / 1024,
    result,
    before: before / 1024 / 1024,
    after: after / 1024 / 1024
  };
}

/**
 * Advanced benchmark with multiple document sizes and detailed metrics
 */
export function advancedBenchmark() {
  const testCases = [
    { name: 'Small', markdown: '# Test\n\n**Bold** text' },
    { name: 'Medium', markdown: '# Test\n\n**Bold** and *italic*\n\n- List item 1\n- List item 2\n\n| Col1 | Col2 |\n|------|------|\n| A    | B    |' },
    { name: 'Large', markdown: '# Test\n\n' + '**Bold** and *italic* text. '.repeat(100) + '\n\n' + '- '.repeat(50) + '\n\n' + '| Col1 | Col2 |\n|------|------|\n' + '| A    | B    |\n'.repeat(20) }
  ];

  testCases.forEach(testCase => {
    console.log(`\n=== ${testCase.name} Document ===`);

    // Warmup
    for (let i = 0; i < 10; i++) {
      Bun.markdown.html(testCase.markdown);
    }

    // Benchmark
    const iterations = testCase.name === 'Small' ? 10000 : testCase.name === 'Medium' ? 1000 : 100;

    console.time(`${testCase.name} - HTML`);
    for (let i = 0; i < iterations; i++) {
      Bun.markdown.html(testCase.markdown, { tables: true, strikethrough: true });
    }
    console.timeEnd(`${testCase.name} - HTML`);

    console.time(`${testCase.name} - Render`);
    for (let i = 0; i < iterations; i++) {
      Bun.markdown.render(testCase.markdown, {
        heading: (c, { l }) => `<h${l}>${c}</h${l}>`,
        paragraph: c => `<p>${c}</p>`,
        strong: c => `<strong>${c}</strong>`,
        emphasis: c => `<em>${c}</em>`
      });
    }
    console.timeEnd(`${testCase.name} - Render`);

    console.log(`Document size: ${testCase.markdown.length} characters`);
    console.log(`Iterations: ${iterations}`);
  });
}

/**
 * Memory stress test with garbage collection monitoring
 */
export function memoryStressTest() {
  const largeMarkdown = '# Test\n\n' + '**Bold** and *italic* text. '.repeat(1000) + '\n\n' +
    '- '.repeat(500) + '\n\n' +
    '| Col1 | Col2 | Col3 |\n|------|------|------|\n' +
    '| A    | B    | C    |\n'.repeat(100);

  console.log('Starting memory stress test...');

  const results = [];
  for (let round = 0; round < 10; round++) {
    // Force GC if available
    if (global.gc) global.gc();

    const measurement = measureMemory(largeMarkdown);
    results.push(measurement.memoryUsed);

    console.log(`Round ${round + 1}: ${measurement.memoryUsed.toFixed(2)} MB`);
  }

  const avgMemory = results.reduce((a, b) => a + b, 0) / results.length;
  const maxMemory = Math.max(...results);
  const minMemory = Math.min(...results);

  console.log(`\nMemory Stress Test Results:`);
  console.log(`Average: ${avgMemory.toFixed(2)} MB`);
  console.log(`Max: ${maxMemory.toFixed(2)} MB`);
  console.log(`Min: ${minMemory.toFixed(2)} MB`);
  console.log(`Variance: ${(maxMemory - minMemory).toFixed(2)} MB`);

  return { avgMemory, maxMemory, minMemory, results };
}
