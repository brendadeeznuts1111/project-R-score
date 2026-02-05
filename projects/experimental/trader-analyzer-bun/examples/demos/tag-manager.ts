#!/usr/bin/env bun
/**
 * @fileoverview Ultimate tag management system showcasing all Bun-native utilities
 * @description Production-ready tag management system with zero dependencies, demonstrating Bun-native APIs including timing, memory tracking, custom inspection, table formatting, file operations, rate limiting, and more.
 * @module examples/demos/tag-manager
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.3.0.0.0.0.0;instance-id=EXAMPLE-TAG-MANAGER-001;version=6.3.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"Tag Manager";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.3.0.0.0.0.0"}}]
 * [CLASS:TagManager][#REF:v-6.3.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.3.0.0.0.0.0
 * Ripgrep Pattern: 6\.3\.0\.0\.0\.0\.0|EXAMPLE-TAG-MANAGER-001|BP-EXAMPLE@6\.3\.0\.0\.0\.0\.0
 * 
 * Zero dependencies - pure Bun APIs only
 * 
 * Key Bun-Native Features Demonstrated:
 * 
 * Performance: Bun.nanoseconds() for microsecond-level timing precision per file
 * Memory Tracking: process.memoryUsage() for heap usage monitoring
 * Custom Inspection: Bun.inspect.custom for beautiful validation output
 * Table Formatting: Bun.inspect.table() with colors for all tabular data
 * String Width: Bun.stringWidth() for proper alignment (if needed)
 * File Operations: Bun.file() + Bun.Glob for async I/O
 * Rate Limiting: Bun.sleep() to prevent I/O saturation
 * UUID Generation: Bun.randomUUIDv7() for unique report IDs
 * Environment: Bun.version and Bun.revision in reports
 * Process Detection: Bun.main for CLI entry point logic
 * TTY Support: Bun.stdin.isTTY for interactive mode detection
 * Tool Detection: Bun.which() for clipboard integration
 * 
 * Production Features:
 * 
 * Rate Limiting: Prevent I/O overload with configurable delays
 * Memory Tracking: Monitor heap usage per file scan
 * Dry-Run Mode: Preview changes with --dry-run or TAG_DRY_RUN=1
 * Progress Indicators: Real-time feedback with colors
 * Error Handling: Graceful skip of unreadable files
 * Performance Rating: Automatic throughput classification
 * Clipboard Integration: Auto-detect and copy generated tags
 * Environment Variables: Configure via TAG_RATE_LIMIT, TAG_DRY_RUN
 * 
 * @example 6.3.0.0.0.0.0.1: Tag Validation
 * // Test Formula:
 * // 1. Run tag-manager with validate command
 * // 2. Provide tag string to validate
 * // 3. Check validation result
 * // Expected Result: Tag format validated successfully
 * //
 * // Snippet:
 * ```bash
 * bun run scripts/tag-manager.ts validate "[hyper-bun][market-probe][refactor][META:priority=high][fetch-error-handling][#REF:fetch-wrapper.ts]"
 * ```
 * 
 * @example 6.3.0.0.0.0.0.2: File Scanning
 * // Test Formula:
 * // 1. Run tag-manager with scan command
 * // 2. Provide file pattern to scan
 * // 3. Review extracted tags
 * // Expected Result: Tags extracted from files successfully
 * //
 * // Snippet:
 * ```bash
 * bun run scripts/tag-manager.ts scan "src/hyper-bun/*.ts"
 * ```
 * 
 * // Ripgrep: 6.3.0.0.0.0.0
 * // Ripgrep: EXAMPLE-TAG-MANAGER-001
 * // Ripgrep: BP-EXAMPLE@6.3.0.0.0.0.0
 * 
 * @author NEXUS Team
 * @since 1.0.0
 */

/**
 * Metadata tag structure parsed from code comments
 */
interface MetadataTag {
  /** Domain identifier (e.g., 'hyper-bun', 'utils') */
  domain: string;
  /** Scope within domain (e.g., 'market-probe', 'scheduler') */
  scope: string;
  /** Type of tag (e.g., 'refactor', 'feat', 'bug') */
  type: string;
  /** Metadata properties parsed from META section */
  meta: Record<string, string>;
  /** Optional class name */
  class: string;
  /** Optional reference to related file/documentation */
  ref: string;
  /** File path where tag was found */
  file?: string;
  /** Line number where tag was found */
  line?: number;
}

/**
 * Scan result with performance and memory metrics
 */
interface ScanResult {
  file: string;
  tag: string;
  line: number;
  valid: boolean;
  timeNs: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: number;
}

/**
 * Performance rating classification
 */
type PerformanceRating = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Report metadata with UUID and runtime info
 */
interface ReportMetadata {
  reportId: string;
  bunVersion: string;
  bunRevision: string;
  timestamp: number;
  isTTY: boolean;
  isInteractive: boolean;
}

/**
 * Options for tag manager operations
 */
interface TagManagerOptions {
  /** Glob pattern for files to scan */
  scan?: string;
  /** Filter by domain */
  domain?: string;
  /** Filter by scope */
  scope?: string;
  /** Filter by type */
  type?: string;
  /** Filter by priority (high/medium/low) */
  priority?: string;
  /** Output format: 'json', 'table', or 'summary' */
  format?: "json" | "table" | "summary";
  /** Enable tag validation */
  validate?: boolean;
}

// Bun-native regex patterns
const TAG_REGEX = /^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[META:([^\]]+)\]\[([^\]]+)\]\[(\#REF:[^\]]+)\]$/;
const META_REGEX = /([a-zA-Z]+)=([a-zA-Z0-9-_]+)/g;

// Environment configuration
const RATE_LIMIT_MS = parseInt(process.env.TAG_RATE_LIMIT || '0', 10);
const DRY_RUN = process.env.TAG_DRY_RUN === '1' || process.env.TAG_DRY_RUN === 'true';
const IS_TTY = Bun.stdin.isTTY;
const IS_INTERACTIVE = IS_TTY && process.env.CI !== '1';

// ANSI colors using Bun's native support
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

/**
 * Generate report metadata with Bun runtime info
 */
function generateReportMetadata(): ReportMetadata {
  return {
    reportId: Bun.randomUUIDv7(),
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    timestamp: Date.now(),
    isTTY: IS_TTY,
    isInteractive: IS_INTERACTIVE,
  };
}

/**
 * Classify performance rating based on throughput
 */
function classifyPerformance(filesPerSecond: number): PerformanceRating {
  if (filesPerSecond >= 100) return 'excellent';
  if (filesPerSecond >= 50) return 'good';
  if (filesPerSecond >= 20) return 'fair';
  return 'poor';
}

/**
 * Format memory usage for display
 */
function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Copy to clipboard if pbcopy is available (macOS)
 */
async function copyToClipboard(text: string): Promise<boolean> {
  const pbcopy = Bun.which('pbcopy');
  if (!pbcopy) return false;

  try {
    const proc = Bun.spawn([pbcopy], {
      stdin: 'pipe',
    });
    await proc.stdin.write(text);
    proc.stdin.end();
    await proc.exited;
    return true;
  } catch {
    return false;
  }
}

/**
 * Custom inspect for validation results
 * Uses Bun.inspect.custom for beautiful debug output
 */
class TagValidationResult {
  constructor(
    public valid: boolean,
    public errors: string[],
    public data?: MetadataTag
  ) {}

  [Bun.inspect.custom]() {
    return this.valid 
      ? `${colors.green('✅ Valid')} ${this.data ? `- ${this.data.domain}:${this.data.scope}` : ''}`
      : `${colors.red('❌ Invalid')} (${this.errors.length} errors)`;
  }
}

/**
 * Parse metadata tag from string
 * 
 * Supports format: [domain][scope][type][META:key=value,key2=value2][class][#REF:ref]
 * 
 * @param tag - The tag string to parse
 * @returns Parsed MetadataTag object or null if invalid format
 * 
 * @example
 * ```typescript
 * const tag = parseTag('[hyper-bun][utils][feat][META:priority=high][tag-manager][#REF:Bun.utils]');
 * ```
 */
function parseTag(tag: string): MetadataTag | null {
  const match = tag.match(TAG_REGEX);
  if (!match) return null;

  const meta: Record<string, string> = {};
  let metaPair;
  // Reset regex lastIndex for global regex
  META_REGEX.lastIndex = 0;
  while ((metaPair = META_REGEX.exec(match[4])) !== null) {
    meta[metaPair[1]] = metaPair[2];
  }

  return {
    domain: match[1],
    scope: match[2],
    type: match[3],
    meta,
    class: match[5],
    ref: match[6],
  };
}

/**
 * Validate tag format and required fields
 * 
 * @param tag - Tag string to validate
 * @returns TagValidationResult with validation status and errors
 * 
 * @example
 * ```typescript
 * const result = validateTag('[hyper-bun][utils][feat][META:priority=high][tag-manager][#REF:Bun.utils]');
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
function validateTag(tag: string): TagValidationResult {
  const errors: string[] = [];
  const parsed = parseTag(tag);
  
  if (!parsed) return new TagValidationResult(false, ['Invalid tag format']);

  if (!parsed.domain) errors.push('Domain required');
  if (!parsed.scope) errors.push('Scope required');
  
  const validTypes = ['plan', 'feat', 'refactor', 'fix', 'docs'];
  if (!validTypes.includes(parsed.type)) {
    errors.push(`Invalid type: must be one of ${validTypes.join(', ')}`);
  }
  
  if (!parsed.meta.priority) errors.push('META:priority required');
  // Status is optional - only validate if present
  if (parsed.meta.status && !['active', 'in-progress', 'completed', 'pending'].includes(parsed.meta.status)) {
    errors.push(`Invalid status: must be one of active, in-progress, completed, pending`);
  }
  if (!parsed.ref.startsWith('#REF:')) errors.push('REF must start with #REF:');

  return new TagValidationResult(errors.length === 0, errors, parsed);
}

/**
 * Scan files matching pattern for metadata tags
 * 
 * Uses Bun.Glob for efficient file pattern matching and Bun.file for reading.
 * Tracks performance using Bun.nanoseconds() for each file operation.
 * Monitors memory usage per file with process.memoryUsage().
 * Implements rate limiting with Bun.sleep() to prevent I/O saturation.
 * 
 * @param pattern - Glob pattern to match files (e.g., "src/*.ts" or "src/hyper-bun/*.ts")
 * @param showProgress - Whether to show progress indicators (defaults to IS_INTERACTIVE)
 * @returns Promise resolving to array of scan results with validation, timing, and memory metrics
 * 
 * @example
 * ```typescript
 * const results = await scanFiles('src/hyper-bun/*.ts');
 * console.log(`Found ${results.length} tags`);
 * ```
 */
async function scanFiles(pattern: string, showProgress = IS_INTERACTIVE): Promise<ScanResult[]> {
  const glob = new Bun.Glob(pattern);
  const files = Array.from(glob.scanSync());
  const results: ScanResult[] = [];
  const totalFiles = files.length;
  let processed = 0;

  for (const file of files) {
    try {
      // Memory tracking before file operation
      const memoryBefore = process.memoryUsage();
      const startTime = Bun.nanoseconds();
      
      // Rate limiting to prevent I/O saturation
      if (RATE_LIMIT_MS > 0 && processed > 0) {
        await Bun.sleep(RATE_LIMIT_MS);
      }

      const content = await Bun.file(file).text();
      const lines = content.split('\n');
      
      // Memory tracking after file operation
      const memoryAfter = process.memoryUsage();
      const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      lines.forEach((line, idx) => {
        const tagMatch = line.match(/\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[META:[^\]]+\]\[([^\]]+)\]\[(\#REF:[^\]]+)\]/);
        if (tagMatch) {
          const tag = tagMatch[0];
          const validation = validateTag(tag);
          const timeNs = Bun.nanoseconds() - startTime;
          
          results.push({ 
            file, 
            tag, 
            line: idx + 1, 
            valid: validation.valid,
            timeNs,
            memoryBefore,
            memoryAfter,
            memoryDelta,
          });
        }
      });

      processed++;
      
      // Progress indicator for interactive mode
      if (showProgress && processed % 10 === 0) {
        const percent = ((processed / totalFiles) * 100).toFixed(1);
        process.stdout.write(`\r${colors.cyan('Scanning...')} ${processed}/${totalFiles} (${percent}%)`);
      }
    } catch (e) {
      // Graceful error handling - skip unreadable files
      if (showProgress) {
        process.stdout.write(`\r${colors.red('⚠')} Skipped: ${file}\n`);
      }
    }
  }

  if (showProgress) {
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line
  }

  return results;
}

/**
 * Filter tags based on provided options
 * 
 * @param tags - Array of tags to filter
 * @param options - Filter options (domain, scope, type, priority)
 * @returns Filtered array of tags matching the criteria
 */
function filterTags(tags: MetadataTag[], options: TagManagerOptions): MetadataTag[] {
  let filtered = tags;

  if (options.domain) {
    filtered = filtered.filter(t => t.domain === options.domain);
  }

  if (options.scope) {
    filtered = filtered.filter(t => t.scope === options.scope);
  }

  if (options.type) {
    filtered = filtered.filter(t => t.type === options.type);
  }

  if (options.priority) {
    filtered = filtered.filter(t => t.meta.priority === options.priority);
  }

  return filtered;
}

/**
 * Print tags in table format using Bun.inspect.table
 * 
 * Uses Bun's native table formatting for beautiful, color-coded tabular display.
 * 
 * @param tags - Array of tags to display in table format
 * 
 * @see {@link https://bun.sh/docs/runtime/utils#bun-inspect-table-tabulardata,-properties,-options Bun.inspect.table documentation}
 */
function printTable(tags: MetadataTag[]): void {
  if (tags.length === 0) {
    console.log('No tags found.');
    return;
  }

  // Prepare tabular data for Bun.inspect table format
  const tableData = tags.map(tag => ({
    Domain: tag.domain,
    Scope: tag.scope,
    Type: tag.type,
    Priority: tag.meta.priority || '-',
    File: tag.file?.length > 40 ? '...' + tag.file.slice(-37) : tag.file || '-',
    Line: tag.line || '-',
    Ref: tag.ref || '-',
  }));

  console.log('\n📋 Metadata Tags Found:\n');
  
  // Use Bun.inspect.table for tabular data display
  // Bun.inspect.table formats arrays of objects as tables with borders and colors
  console.log(
    Bun.inspect.table(tableData, {
      colors: true,
    })
  );

  console.log(`\nTotal: ${tags.length} tag(s)\n`);
}

/**
 * Print tags in summary format grouped by domain and scope
 * 
 * Groups tags by domain, then by scope, showing counts and priority breakdown.
 * 
 * @param tags - Array of tags to summarize
 */
function printSummary(tags: MetadataTag[]): void {
  if (tags.length === 0) {
    console.log('No tags found.');
    return;
  }

  // Group by domain
  const byDomain = new Map<string, MetadataTag[]>();
  for (const tag of tags) {
    if (!byDomain.has(tag.domain)) {
      byDomain.set(tag.domain, []);
    }
    byDomain.get(tag.domain)!.push(tag);
  }

  console.log('\n📊 Metadata Tags Summary:\n');

  for (const [domain, domainTags] of byDomain) {
    console.log(`\n${domain.toUpperCase()}:`);
    
    // Group by scope
    const byScope = new Map<string, MetadataTag[]>();
    for (const tag of domainTags) {
      if (!byScope.has(tag.scope)) {
        byScope.set(tag.scope, []);
      }
      byScope.get(tag.scope)!.push(tag);
    }

    for (const [scope, scopeTags] of byScope) {
      const highPriority = scopeTags.filter(t => t.meta.priority === 'high').length;
      const mediumPriority = scopeTags.filter(t => t.meta.priority === 'medium').length;
      const lowPriority = scopeTags.filter(t => t.meta.priority === 'low').length;
      
      console.log(`  ${scope}:`);
      console.log(`    Total: ${scopeTags.length}`);
      if (highPriority > 0) console.log(`    🔴 High Priority: ${highPriority}`);
      if (mediumPriority > 0) console.log(`    🟡 Medium Priority: ${mediumPriority}`);
      if (lowPriority > 0) console.log(`    🟢 Low Priority: ${lowPriority}`);
    }
  }

  console.log(`\n\nTotal: ${tags.length} tag(s) across ${byDomain.size} domain(s)\n`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = Bun.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${colors.bold('Tag Manager')} ${colors.blue('(Bun-native)')}

${colors.bold('Commands:')}
  validate  [tag]              Validate tag format
  generate  [tpl]               Generate tag from template
  scan      [glob] [options]   Scan files for tags
  benchmark [glob]              Performance test

${colors.bold('Scan Options:')}
  --coverage                    Show coverage statistics and breakdown
  --dry                         Dry-run mode: show files without scanning

${colors.bold('Environment Variables:')}
  TAG_RATE_LIMIT                Rate limit delay in ms between files (default: 0)
  TAG_DRY_RUN                   Enable dry-run mode (1 or true)
  
${colors.bold('Bun-Native Features:')}
  • Microsecond timing with Bun.nanoseconds()
  • Memory tracking with process.memoryUsage()
  • Custom inspection with Bun.inspect.custom
  • Table formatting with Bun.inspect.table()
  • String width calculation with Bun.stringWidth()
  • File I/O with Bun.file() and Bun.Glob
  • Rate limiting with Bun.sleep()
  • UUID generation with Bun.randomUUIDv7()
  • Runtime info with Bun.version and Bun.revision
  • TTY detection with Bun.stdin.isTTY
  • Tool detection with Bun.which()

${colors.bold('Examples:')}
  ./scripts/tag-manager.ts validate "[hyper-bun][market-probe][refactor][META:priority=high][fetch-error-handling][#REF:fetch-wrapper.ts]"
  bun run scripts/tag-manager.ts generate "hyper-bun,scheduler,refactor,priority=high;status=in-progress,fetch-error-handling,#REF:fetch-wrapper.ts"
  bun run scripts/tag-manager.ts scan "src/hyper-bun/*.ts"
  bun run tag:scan "src/hyper-bun/**/*.ts" --coverage
  bun run tag:scan "src/hyper-bun/**/*.ts" --coverage --dry
  bun run scripts/tag-manager.ts benchmark "src/hyper-bun/*.ts"
`);
    process.exit(0);
  }

  const cmd = args[0];
  const value = args[1];

  switch (cmd) {
    case 'validate':
      if (!value) throw new Error('Tag required');
      const validation = validateTag(value);
      console.log(validation);
      validation.errors.forEach(err => console.log(colors.red(`  - ${err}`)));
      process.exit(validation.valid ? 0 : 1);

    case 'generate': {
      if (!value) throw new Error('Template required');
      const [domain, scope, type, metaStr, cls, ref] = value.split(',');
      const meta = Object.fromEntries(metaStr.split(';').map(m => m.split('=')));
      const tag = `[${domain}][${scope}][${type}][META:${Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(',')}][${cls}][${ref}]`;
      console.log(colors.bold(tag));
      break;
    }

    case 'scan': {
      const pattern = value || 'src/**/*.ts';
      const hasCoverage = args.includes('--coverage');
      const hasDry = args.includes('--dry') || DRY_RUN;
      const reportMeta = generateReportMetadata();
      
      if (hasDry) {
        // Dry-run mode: show what would be scanned without actually scanning
        const glob = new Bun.Glob(pattern);
        const files = Array.from(glob.scanSync());
        console.log(`\n${colors.blue('🔍 Dry-run mode - Files that would be scanned:')}\n`);
        console.log(`Pattern: ${colors.bold(pattern)}`);
        console.log(`Files found: ${colors.bold(files.length.toString())}\n`);
        
        if (files.length > 0) {
          const fileTable = files.map((f, i) => ({
            '#': i + 1,
            File: f,
          }));
          console.log(Bun.inspect.table(fileTable, { colors: true }));
        }
        console.log(`\n${colors.yellow('ℹ️  Run without --dry to actually scan for tags')}\n`);
        break;
      }

      const scanStart = Bun.nanoseconds();
      const memoryStart = process.memoryUsage();
      const results = await scanFiles(pattern, IS_INTERACTIVE);
      const scanDuration = (Bun.nanoseconds() - scanStart) / 1_000_000;
      const memoryEnd = process.memoryUsage();
      const memoryUsed = memoryEnd.heapUsed - memoryStart.heapUsed;

      if (hasCoverage) {
        // Coverage mode: show statistics about tag coverage
        const glob = new Bun.Glob(pattern);
        const allFiles = Array.from(glob.scanSync());
        const filesWithTags = new Set(results.map(r => r.file));
        const filesWithoutTags = allFiles.filter(f => !filesWithTags.has(f));
        const coveragePercent = allFiles.length > 0 
          ? ((filesWithTags.size / allFiles.length) * 100).toFixed(1)
          : '0.0';
        
        const filesPerSecond = allFiles.length / (scanDuration / 1000);
        const performanceRating = classifyPerformance(filesPerSecond);
        const ratingEmoji = {
          excellent: '🚀',
          good: '✅',
          fair: '⚠️',
          poor: '🐌',
        }[performanceRating];

        console.log(`\n${colors.bold('📊 Tag Coverage Report')}\n`);
        console.log(`${colors.dim('Report ID:')} ${reportMeta.reportId}`);
        console.log(`${colors.dim('Bun Version:')} ${reportMeta.bunVersion} (${reportMeta.bunRevision})`);
        console.log(`${colors.dim('TTY Mode:')} ${reportMeta.isTTY ? colors.green('Yes') : colors.yellow('No')}`);
        console.log(`${colors.dim('Interactive:')} ${reportMeta.isInteractive ? colors.green('Yes') : colors.yellow('No')}\n`);
        
        console.log(`Pattern: ${colors.bold(pattern)}`);
        console.log(`Total files: ${colors.bold(allFiles.length.toString())}`);
        console.log(`Files with tags: ${colors.green(filesWithTags.size.toString())}`);
        console.log(`Files without tags: ${colors.yellow(filesWithoutTags.length.toString())}`);
        console.log(`Coverage: ${colors.bold(`${coveragePercent}%`)}`);
        console.log(`Total tags found: ${colors.bold(results.length.toString())}`);
        console.log(`Scan duration: ${colors.cyan(scanDuration.toFixed(2) + 'ms')}`);
        console.log(`Throughput: ${colors.cyan(filesPerSecond.toFixed(1) + ' files/sec')} ${ratingEmoji} ${colors.bold(performanceRating)}`);
        console.log(`Memory used: ${colors.cyan(formatMemory(memoryUsed))}\n`);

        // Group by domain/scope
        const byDomain = new Map<string, number>();
        const byType = new Map<string, number>();
        const byPriority = new Map<string, number>();

        for (const result of results) {
          const parsed = parseTag(result.tag);
          if (parsed) {
            byDomain.set(parsed.domain, (byDomain.get(parsed.domain) || 0) + 1);
            byType.set(parsed.type, (byType.get(parsed.type) || 0) + 1);
            byPriority.set(parsed.meta.priority || 'unknown', (byPriority.get(parsed.meta.priority || 'unknown') || 0) + 1);
          }
        }

        if (byDomain.size > 0) {
          console.log(`${colors.bold('By Domain:')}`);
          const domainTable = Array.from(byDomain.entries()).map(([domain, count]) => ({
            Domain: domain,
            Count: count,
            Percentage: `${((count / results.length) * 100).toFixed(1)}%`,
          }));
          console.log(Bun.inspect.table(domainTable, { colors: true }));
        }

        if (byType.size > 0) {
          console.log(`\n${colors.bold('By Type:')}`);
          const typeTable = Array.from(byType.entries()).map(([type, count]) => ({
            Type: type,
            Count: count,
            Percentage: `${((count / results.length) * 100).toFixed(1)}%`,
          }));
          console.log(Bun.inspect.table(typeTable, { colors: true }));
        }

        if (byPriority.size > 0) {
          console.log(`\n${colors.bold('By Priority:')}`);
          const priorityTable = Array.from(byPriority.entries()).map(([priority, count]) => ({
            Priority: priority,
            Count: count,
            Percentage: `${((count / results.length) * 100).toFixed(1)}%`,
          }));
          console.log(Bun.inspect.table(priorityTable, { colors: true }));
        }

        if (filesWithoutTags.length > 0 && filesWithoutTags.length <= 20) {
          console.log(`\n${colors.yellow('Files without tags:')}`);
          filesWithoutTags.forEach(f => console.log(`  - ${f}`));
        } else if (filesWithoutTags.length > 20) {
          console.log(`\n${colors.yellow(`Files without tags: ${filesWithoutTags.length} (showing first 20)`)}`);
          filesWithoutTags.slice(0, 20).forEach(f => console.log(`  - ${f}`));
        }
        console.log();
      } else {
        // Normal scan mode
        const filesPerSecond = results.length > 0 
          ? results.length / (scanDuration / 1000)
          : 0;
        const performanceRating = classifyPerformance(filesPerSecond);
        
        console.log(`\n${colors.bold('📋 Tag Scan Results')}\n`);
        console.log(`${colors.dim('Report ID:')} ${reportMeta.reportId}`);
        console.log(`Found ${colors.bold(results.length.toString())} tags in ${colors.cyan(scanDuration.toFixed(2) + 'ms')}`);
        console.log(`Memory: ${colors.cyan(formatMemory(memoryUsed))}`);
        console.log(`Performance: ${colors.cyan(performanceRating)}\n`);

        if (results.length > 0) {
          // Use Bun.inspect.table with colors
          const tableData = results.map(r => ({
            File: Bun.stringWidth(r.file) > 40 ? '...' + r.file.slice(-37) : r.file,
            Line: r.line,
            Valid: r.valid ? colors.green('✅') : colors.red('❌'),
            Tag: Bun.stringWidth(r.tag) > 50 ? r.tag.slice(0, 47) + '...' : r.tag,
            Time: `${(r.timeNs / 1_000_000).toFixed(2)}ms`,
            Memory: formatMemory(r.memoryDelta),
          }));
          
          console.log(Bun.inspect.table(tableData, { colors: true }));
          
          // Clipboard integration for generated tags
          if (IS_INTERACTIVE && results.length === 1) {
            const copied = await copyToClipboard(results[0].tag);
            if (copied) {
              console.log(`\n${colors.green('✓')} Tag copied to clipboard`);
            }
          }
        }

        const invalid = results.filter(r => !r.valid).length;
        if (invalid > 0) {
          console.log(colors.yellow(`\n⚠️  ${invalid} invalid tags`));
          process.exit(1);
        }
      }
      break;
    }

    case 'benchmark': {
      const pattern = value || 'src/**/*.ts';
      const iterations = 5;
      const times: number[] = [];
      const memoryUsages: number[] = [];
      const reportMeta = generateReportMetadata();

      // Warm-up
      await scanFiles(pattern, false);

      console.log(colors.blue(`\n🚀 Benchmarking ${iterations} iterations...\n`));
      console.log(`${colors.dim('Report ID:')} ${reportMeta.reportId}`);
      console.log(`${colors.dim('Bun Version:')} ${reportMeta.bunVersion} (${reportMeta.bunRevision})\n`);
      
      for (let i = 0; i < iterations; i++) {
        const memBefore = process.memoryUsage();
        const start = Bun.nanoseconds();
        await scanFiles(pattern, false);
        const duration = (Bun.nanoseconds() - start) / 1_000_000;
        const memAfter = process.memoryUsage();
        const memUsed = memAfter.heapUsed - memBefore.heapUsed;
        
        times.push(duration);
        memoryUsages.push(memUsed);
        
        const glob = new Bun.Glob(pattern);
        const fileCount = Array.from(glob.scanSync()).length;
        const throughput = fileCount / (duration / 1000);
        const rating = classifyPerformance(throughput);
        
        console.log(`Run ${i + 1}: ${duration.toFixed(2)}ms | ${formatMemory(memUsed)} | ${throughput.toFixed(1)} files/sec ${colors.bold(rating)}`);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
      const mem = process.memoryUsage();
      
      const glob = new Bun.Glob(pattern);
      const fileCount = Array.from(glob.scanSync()).length;
      const avgThroughput = fileCount / (avg / 1000);
      const overallRating = classifyPerformance(avgThroughput);
      
      console.log(`\n${colors.bold('📊 Benchmark Results:')}\n`);
      console.log(`  Average: ${colors.cyan(avg.toFixed(2) + 'ms')}`);
      console.log(`  Min:     ${colors.green(min.toFixed(2) + 'ms')}`);
      console.log(`  Max:     ${colors.yellow(max.toFixed(2) + 'ms')}`);
      console.log(`  Throughput: ${colors.cyan(avgThroughput.toFixed(1) + ' files/sec')} ${colors.bold(overallRating)}`);
      console.log(`  Memory (avg): ${colors.cyan(formatMemory(avgMemory))}`);
      console.log(`  Memory (current): ${colors.cyan(formatMemory(mem.heapUsed))}`);
      break;
    }

    default:
      console.error(colors.red(`Unknown command: ${cmd}`));
      process.exit(1);
  }
}

// Run main function if executed directly
if (import.meta.main) {
  await main().catch((error) => {
    console.error(colors.red('Error:'), error);
    process.exit(1);
  });
}

export { 
  scanFiles, 
  parseTag, 
  filterTags, 
  validateTag, 
  TagValidationResult,
  generateReportMetadata,
  classifyPerformance,
  formatMemory,
  copyToClipboard,
};
