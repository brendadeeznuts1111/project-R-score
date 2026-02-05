/**
 * [hyper-bun][types][feat][META:priority=high,status=production][env-types][#REF:Bun.TypeScript]
 * Strongly-typed environment variables for Hyper-Bun Tag Manager Suite
 */

declare module "bun" {
  interface Env {
    /** NODE_ENV: development | production | test */
    NODE_ENV: string;
    
    /** Debug level: 0=off, 1=errors, 2=warnings, 3=info, 4=verbose */
    DEBUG_LEVEL: string;
    
    /** Enable/disable ANSI colors in table output (default: true) */
    TAG_TABLE_COLORS: string;
    
    /** Max array length for table formatting (default: 10) */
    TAG_TABLE_MAX_ARRAY_LEN: string;
    
    /** Inspection depth for table objects (default: 2) */
    TAG_TABLE_DEPTH: string;
    
    /** Max column width for table cells (default: 30) */
    TAG_TABLE_MAX_WIDTH: string;
    
    /** Enable truncation of long values (default: true) */
    TAG_TABLE_TRUNCATE: string;
    
    /** Custom array format: dense | expanded | compact */
    TAG_ARRAY_FORMAT: string;
    
    /** Separator for array items (default: ", ") */
    TAG_ARRAY_SEP: string;
    
    /** Max length for arrays in output (default: 50) */
    TAG_MAX_ARRAY_LEN: string;
    
    /** Include execution context in tags (default: false) */
    TAG_INCLUDE_EXEC_CONTEXT: string;
    
    /** Include file context in tags (default: false) */
    TAG_INCLUDE_FILE_CONTEXT: string;
    
    /** Enable sensitive data redaction (default: true) */
    TAG_REDACT_SENSITIVE: string;
    
    /** Enable caching (default: false for development) */
    TAG_ENABLE_CACHE: string;
    
    /** Max cache size (default: 1000) */
    TAG_MAX_CACHE_SIZE: string;
    
    /** Dry-run mode: don't modify files (default: false) */
    TAG_DRY_RUN: string;
    
    /** Rate limit in ms between file operations (default: 0) */
    TAG_RATE_LIMIT: string;
    
    /** Auto-open generated reports in editor (default: false) */
    TAG_OPEN_REPORT: string;
    
    /** Custom properties to show in tables (comma-separated) */
    TAG_TABLE_PROPERTIES: string;
    
    /** Editor: code | vscode | subl | vim | nano | emacs */
    EDITOR: string;
    
    /** Visual editor override */
    VISUAL: string;
  }
}
