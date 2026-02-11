/**
 * Enhanced TypeScript Type Definitions
 * 
 * Additional type definitions for @bun-tools/markdown-constants
 */

// ============================================================================
// Markdown Options Types
// ============================================================================

/** Base markdown parsing options */
export interface MarkdownOptions {
  /** Enable GitHub Flavored Markdown tables */
  tables?: boolean;
  /** Enable strikethrough support */
  strikethrough?: boolean;
  /** Enable task lists */
  tasklists?: boolean;
  /** Enable automatic linking */
  autolinks?: boolean | { url?: boolean; www?: boolean; email?: boolean };
  /** Heading configuration */
  headings?: { ids?: boolean; autolink?: boolean };
  /** Enable wiki-style links */
  wikiLinks?: boolean;
  /** Enable LaTeX math support */
  latexMath?: boolean;
  /** Hard/soft breaks */
  hardSoftBreaks?: boolean;
  /** Enable tag filtering for security */
  tagFilter?: boolean;
  /** Disable HTML blocks */
  noHtmlBlocks?: boolean;
  /** Disable HTML spans */
  noHtmlSpans?: boolean;
  /** Disable indented code blocks */
  noIndentedCodeBlocks?: boolean;
  /** Enable underline */
  underline?: boolean;
  /** Collapse whitespace */
  collapseWhitespace?: boolean;
  /** Permissive ATX headers */
  permissiveAtxHeaders?: boolean;
}

/** HTML renderer options */
export interface HtmlRendererOptions extends MarkdownOptions {
  /** Security preset to use */
  security?: 'STRICT' | 'MODERATE' | 'DEVELOPER';
  /** Feature preset to use */
  preset?: 'GFM' | 'COMMONMARK' | 'DOCS' | 'BLOG' | 'TERMINAL' | 'ACADEMIC';
}

/** React renderer options */
export interface ReactRendererOptions extends HtmlRendererOptions {
  /** Component library to use */
  framework?: 'TAILWIND_TYPOGRAPHY' | string;
}

// ============================================================================
// Renderer Function Types
// ============================================================================

/** Heading renderer function */
export type HeadingRenderer = (children: string, props: { level: number; id?: string }) => string;

/** Paragraph renderer function */
export type ParagraphRenderer = (children: string) => string;

/** Link renderer function */
export type LinkRenderer = (children: string, props: { href: string; title?: string }) => string;

/** Code block renderer function */
export type CodeRenderer = (children: string, props: { language?: string }) => string;

/** Inline code renderer function */
export type CodeSpanRenderer = (children: string) => string;

/** Strong/bold renderer function */
export type StrongRenderer = (children: string) => string;

/** Emphasis/italic renderer function */
export type EmphasisRenderer = (children: string) => string;

/** HTML renderer collection */
export interface HtmlRendererCollection {
  heading?: HeadingRenderer;
  paragraph?: ParagraphRenderer;
  link?: LinkRenderer;
  code?: CodeRenderer;
  codespan?: CodeSpanRenderer;
  strong?: StrongRenderer;
  emphasis?: EmphasisRenderer;
  image?: (children: string, props: { src: string; alt?: string }) => string;
  list?: (children: string, props: { ordered: boolean; start?: number }) => string;
  listItem?: (children: string) => string;
  blockquote?: (children: string) => string;
  hr?: () => string;
  br?: () => string;
}

// ============================================================================
// Cache Types
// ============================================================================

/** Cache statistics */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/** Generic cache interface */
export interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  stats(): CacheStats;
}

/** LRU cache entry */
export interface LruCacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

// ============================================================================
// Benchmark Types
// ============================================================================

/** Benchmark result */
export interface BenchmarkResult {
  name: string;
  opsPerSec: number;
  avgTime: number;
  totalTime: number;
  iterations: number;
}

/** Benchmark suite results */
export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  timestamp: Date;
  bunVersion: string;
}

/** Memory measurement result */
export interface MemoryMeasurement {
  memoryUsed: number;
  before: number;
  after: number;
  result?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/** Security scan result */
export interface SecurityScanResult {
  safe: boolean;
  issues: Array<{
    type: 'dangerous_html' | 'blacklisted_pattern' | 'invalid_protocol';
    message: string;
    position?: number;
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

/** Markdown parse error */
export class MarkdownParseError extends Error {
  constructor(
    message: string,
    public code: string,
    public position?: number,
    public source?: string
  ) {
    super(message);
    this.name = 'MarkdownParseError';
  }
}

/** Security error */
export class MarkdownSecurityError extends Error {
  constructor(
    message: string,
    public issues: string[]
  ) {
    super(message);
    this.name = 'MarkdownSecurityError';
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Full configuration object */
export interface MarkdownConfig {
  features: MarkdownOptions;
  security: {
    tagFilter: boolean;
    noHtmlBlocks: boolean;
    noHtmlSpans: boolean;
    allowedProtocols: string[];
    blacklistedPatterns: RegExp[];
  };
  performance: {
    cacheEnabled: boolean;
    cacheSize: number;
    cacheTtl: number;
  };
}

/** Preset configuration */
export interface PresetConfig {
  name: string;
  description: string;
  features: MarkdownOptions;
  recommendedFor: string[];
}


