/**
 * [hyper-bun][types][feat][META:priority=high,status=production][metadata-types][#REF:TagManager]
 * Type definitions for metadata tag parsing and validation
 */

/**
 * Parsed metadata tag structure
 */
export interface MetadataTag {
  /** Domain identifier (e.g., 'hyper-bun') */
  domain: string;
  /** Scope identifier (e.g., 'utils', 'scheduler') */
  scope: string;
  /** Type identifier (e.g., 'feat', 'refactor', 'fix') */
  type: string;
  /** Metadata key-value pairs from META: section */
  meta: Record<string, string>;
  /** Class identifier */
  class: string;
  /** Reference identifier (e.g., '#REF:Bun.utils') */
  ref: string;
  /** File path where tag was found (optional, added during scanning) */
  file?: string;
  /** Line number where tag was found (optional, added during scanning) */
  line?: number;
}
