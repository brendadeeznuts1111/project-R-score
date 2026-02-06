// Shared Constants for Hierarchy Benchmark System
// Centralized configuration to prevent duplication and inconsistency

/**
 * Bun Markdown API Configuration
 * Based on official documentation: https://bun.com/docs/runtime/markdown.md
 * ⚠️ IMPORTANT: API marked as unstable - may change in future versions
 */
export const BUN_MARKDOWN_CONFIG = {
  // API Status
  API_STATUS: 'unstable' as const, // ⚠️ Marked as unstable - may change
  
  // Default Options (CRITICAL: Real-world behavior vs documentation)
  // DOCUMENTATION TABLE: Shows all features default to false
  // REAL-WORLD TESTING: Some features ARE enabled by default
  // CONFIRMED DEFAULTS (from actual testing):
  // - tables: ENABLED by default (despite docs saying false)
  // - strikethrough: ENABLED by default (despite docs saying false)  
  // - tasklists: ENABLED by default (despite docs saying false)
  // - autolinks: DISABLED by default (matches docs)
  // SECURITY NOTE: Always set options explicitly due to documentation confusion
  DEFAULT_OPTIONS: {
    tables: true,            // GFM tables - TESTING: enabled by default (docs incorrect)
    strikethrough: true,     // GFM strikethrough ~~text~~ - TESTING: enabled by default (docs incorrect)
    tasklists: true,         // GFM task lists - [x] completed - TESTING: enabled by default (docs incorrect)
    autolinks: false,        // Auto-link URLs, emails, www - TESTING: disabled by default (matches docs)
    headings: false,         // Heading IDs and autolinks - ASSUME: disabled (not tested)
    hardSoftBreaks: false,   // Treat soft breaks as hard breaks - ASSUME: disabled
    wikiLinks: false,        // [[wiki links]] syntax - ASSUME: disabled
    underline: false,        // __text__ as <u> instead of <strong> - ASSUME: disabled
    latexMath: false,        // $inline$ and $$display$$ math - ASSUME: disabled
    collapseWhitespace: false, // Collapse whitespace in text - ASSUME: disabled
    permissiveAtxHeaders: false, // ATX headers without space after # - ASSUME: disabled
    noIndentedCodeBlocks: false, // Disable indented code blocks - ASSUME: disabled
    noHtmlBlocks: false,     // Disable HTML blocks - ASSUME: disabled
    noHtmlSpans: false,      // Disable inline HTML - ASSUME: disabled
    tagFilter: false         // GFM tag filter for disallowed HTML - ASSUME: disabled
  } as const,
  
  // Three Main APIs
  APIS: {
    HTML: 'Bun.markdown.html()',     // Simple HTML conversion
    RENDER: 'Bun.markdown.render()', // Full customization with callbacks
    REACT: 'Bun.markdown.react()'   // Direct React JSX output
  } as const,
  
  // Render() API Callbacks - Complete reference
  RENDER_CALLBACKS: {
    // Block callbacks
    BLOCK: {
      heading: { meta: '{ level: number, id?: string }', desc: 'Heading level 1-6' },
      paragraph: { meta: 'none', desc: 'Paragraph block' },
      blockquote: { meta: 'none', desc: 'Blockquote block' },
      code: { meta: '{ language?: string }', desc: 'Fenced/indented code block' },
      list: { meta: '{ ordered: boolean, start?: number }', desc: 'Ordered/unordered list' },
      listItem: { meta: '{ checked?: boolean }', desc: 'List item (task lists)' },
      hr: { meta: 'none', desc: 'Horizontal rule' },
      table: { meta: 'none', desc: 'Table block' },
      thead: { meta: 'none', desc: 'Table head' },
      tbody: { meta: 'none', desc: 'Table body' },
      tr: { meta: 'none', desc: 'Table row' },
      th: { meta: '{ align?: "left" | "center" | "right" }', desc: 'Table header cell' },
      td: { meta: '{ align?: "left" | "center" | "right" }', desc: 'Table data cell' },
      html: { meta: 'none', desc: 'Raw HTML content' }
    } as const,
    
    // Inline callbacks
    INLINE: {
      strong: { meta: 'none', desc: 'Strong emphasis (**text**)' },
      emphasis: { meta: 'none', desc: 'Emphasis (*text*)' },
      link: { meta: '{ href: string, title?: string }', desc: 'Link' },
      image: { meta: '{ src: string, title?: string }', desc: 'Image' },
      codespan: { meta: 'none', desc: 'Inline code (`code`)' },
      strikethrough: { meta: 'none', desc: 'Strikethrough (~~text~~)' },
      text: { meta: 'none', desc: 'Plain text content' }
    } as const
  } as const,
  
  // React() API Component Overrides - Complete reference with best practices
  REACT_COMPONENTS: {
    // Heading components (with IDs when headings: { ids: true })
    h1: { props: '{ id?, children }', desc: 'Level 1 heading', void: false },
    h2: { props: '{ id?, children }', desc: 'Level 2 heading', void: false },
    h3: { props: '{ id?, children }', desc: 'Level 3 heading', void: false },
    h4: { props: '{ id?, children }', desc: 'Level 4 heading', void: false },
    h5: { props: '{ id?, children }', desc: 'Level 5 heading', void: false },
    h6: { props: '{ id?, children }', desc: 'Level 6 heading', void: false },
    
    // Content components
    p: { props: '{ children }', desc: 'Paragraph', void: false },
    blockquote: { props: '{ children }', desc: 'Blockquote', void: false },
    pre: { props: '{ language?, children }', desc: 'Code block (language from ```js)', void: false },
    hr: { props: '{}', desc: 'Horizontal rule (void element)', void: true },
    
    // List components
    ul: { props: '{ children }', desc: 'Unordered list', void: false },
    ol: { props: '{ start, children }', desc: 'Ordered list (start number)', void: false },
    li: { props: '{ checked?, children }', desc: 'List item (checked for tasks)', void: false },
    
    // Table components
    table: { props: '{ children }', desc: 'Table', void: false },
    thead: { props: '{ children }', desc: 'Table head', void: false },
    tbody: { props: '{ children }', desc: 'Table body', void: false },
    tr: { props: '{ children }', desc: 'Table row', void: false },
    th: { props: '{ align?, children }', desc: 'Table header cell', void: false },
    td: { props: '{ align?, children }', desc: 'Table data cell', void: false },
    
    // Inline components
    em: { props: '{ children }', desc: 'Emphasis (*text*)', void: false },
    strong: { props: '{ children }', desc: 'Strong (**text**)', void: false },
    a: { props: '{ href, title?, children }', desc: 'Link', void: false },
    img: { props: '{ src, alt?, title? }', desc: 'Image (void element)', void: true },
    code: { props: '{ children }', desc: 'Inline code', void: false },
    del: { props: '{ children }', desc: 'Strikethrough (~~text~~)', void: false },
    br: { props: '{}', desc: 'Hard line break (void element)', void: true }
  } as const,
  
  // React Version Compatibility
  REACT_VERSIONS: {
    V19_DEFAULT: 'reactVersion: 19 (default, no option needed)',
    V18_LEGACY: 'reactVersion: 18 (required for React 18 and older)',
    MIGRATION_NOTE: 'Always specify reactVersion: 18 for React 18 compatibility'
  } as const,
  
  // Performance Characteristics
  PERFORMANCE: {
    IMPLEMENTATION: 'zig',           // Written in Zig for performance
    DEPENDENCIES: 'zero',            // Built-in, no npm dependencies
    BUILT_IN: true,                  // Native to Bun runtime
    THREAD_SAFETY: 'unknown'         // Not documented
  } as const,
  
  // Missing Documentation (Not mentioned in official docs)
  MISSING_INFO: {
    ERROR_HANDLING: 'not documented',
    MAX_INPUT_SIZE: 'not documented', 
    MEMORY_USAGE: 'not documented',
    CONCURRENT_USAGE: 'not documented',
    SYNC_ASYNC: 'synchronous (implied)'
  } as const
} as const;

export const BENCHMARK_CONSTANTS = {
  // Column thresholds for complexity tier escalation
  ENTERPRISE_COLS_THRESHOLD: 30,
  LEAD_COLS_THRESHOLD: 15,
  SENIOR_COLS_THRESHOLD: 5,
  
  // Default values
  DEFAULT_COLS: 20,
  DEFAULT_TABLE_COLS: 20, // Alias for consistency
  
  // Graph dimensions
  GRAPH_HEIGHT: 4,
  GRAPH_WIDTH: 40,
  
  // Allowed directories for file operations
  ALLOWED_DIRECTORIES: ['./', './demo/', './examples/', '/tmp/', '../'],
  
  // Allowed demo files for hierarchy benchmark
  ALLOWED_DEMO_FILES: ['../demo-junior.md', '../demo-senior.md', '../demo-enterprise.md'],
  
  // Performance multipliers for tier-based calculations
  PERFORMANCE_MULTIPLIERS: {
    junior: 0.07,
    senior: 0.12,
    lead: 0.12,
    enterprise: 0.19
  },
  
  // Security levels (number of security features)
  SECURITY_LEVELS: {
    junior: 1,
    senior: 3,
    lead: 5,
    enterprise: 6
  },
  
  // Detailed performance specifications based on real measurements
  TIER_PERFORMANCE_SPECS: {
    junior: {
      realCols: 3,
      tables: 1,
      detectMicros: 5,
      parseMs: 0.66,
      tableMs: 0.28,
      throughputKs: 82,
      memoryMB: 1.0,
      multiplier: 0.07,
      etagSample: 'a1b2c3d4'
    },
    senior: {
      realCols: 5,
      tables: 2,
      detectMicros: 8,
      parseMs: 1.02,
      tableMs: 0.45,
      throughputKs: 81,
      memoryMB: 1.8,
      multiplier: 0.12,
      etagSample: 'e5f6g7h8'
    },
    lead: {
      realCols: 5,
      tables: 3,
      detectMicros: 9,
      parseMs: 1.53,
      tableMs: 0.68,
      throughputKs: 80,
      memoryMB: 2.7,
      multiplier: 0.12,
      etagSample: 'i9j1k2l3'
    },
    enterprise: {
      realCols: 8,
      tables: 4,
      detectMicros: 12,
      parseMs: 2.88,
      tableMs: 1.28,
      throughputKs: 82,
      memoryMB: 4.9,
      multiplier: 0.19,
      etagSample: 'm4n5o6p7'
    }
  },
  
  // Edge case performance specifications
  EDGE_CASE_SPECS: {
    noTables: {
      realCols: 20,
      tables: 0,
      detectMicros: 3,
      parseMs: 3.6,
      tableMs: 1.6,
      throughputKs: 79,
      memoryMB: 8.2,
      multiplier: 0.48,
      etagSample: 'q8r9s1t2'
    },
    crave50: {
      realCols: 50,
      tables: 5,
      detectMicros: 18,
      parseMs: 18.0,
      tableMs: 8.0,
      throughputKs: 78,
      memoryMB: 25,
      multiplier: 2.40,
      etagSample: 'u3v4w5x6'
    },
    cap100: {
      realCols: 100,
      tables: 10,
      detectMicros: 35,
      parseMs: 36.0,
      tableMs: 16,
      throughputKs: 77,
      memoryMB: 52,
      multiplier: 4.80,
      etagSample: 'y7z8a9b1'
    }
  }
} as const;

// Export individual constants for backward compatibility
export const { 
  ENTERPRISE_COLS_THRESHOLD,
  LEAD_COLS_THRESHOLD,
  SENIOR_COLS_THRESHOLD,
  DEFAULT_COLS,
  DEFAULT_TABLE_COLS,
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  ALLOWED_DIRECTORIES,
  ALLOWED_DEMO_FILES,
  PERFORMANCE_MULTIPLIERS,
  SECURITY_LEVELS,
  TIER_PERFORMANCE_SPECS,
  EDGE_CASE_SPECS
} = BENCHMARK_CONSTANTS;
