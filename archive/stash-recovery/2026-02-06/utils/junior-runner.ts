#!/usr/bin/env bun
// JuniorRunner - Zero-Thinking CLI for Junior Developers
// Usage: junior-run demo.md → Instant terminal + JSON!

import { LeadSpecProfile, validateLeadSpecProfile, determineComplexityTier, generateETag, generateIntegrityHash, DEFAULT_THRESHOLDS } from './lead-spec-profile';
import { join, resolve } from 'path';
import { 
  BENCHMARK_CONSTANTS, 
  BUN_MARKDOWN_CONFIG 
} from './constants';

// Import constants from shared configuration
const { DEFAULT_COLS, ENTERPRISE_COLS_THRESHOLD, LEAD_COLS_THRESHOLD, SENIOR_COLS_THRESHOLD, ALLOWED_DIRECTORIES, TIER_PERFORMANCE_SPECS } = BENCHMARK_CONSTANTS;

// HYPER-ENHANCED: Multi-Table + Perf + Crypto!
const COL_THRESHOLDS = { enterprise: 30, lead: 15, senior: 5, junior: 1 };

/**
 * Hyper-enhanced table detection with multi-table support and performance timing
 */
function detectTableColumns(markdown: string, opts: { multiTable: 'max' | 'sum' } = { multiTable: 'max' }): { cols: number; tables: number; detectTime: number } {
  const start = performance.now();
  
  // Simplified Regex: Basic table separators
  const tableSeparatorRegex = /^\|[\s\-\|:]+\|$/gm;  
  const allTableLines = markdown.match(/^\|[^\r\n]*\|$/gm) || [];
  
  if (allTableLines.length === 0) return { cols: DEFAULT_COLS, tables: 0, detectTime: performance.now() - start };
  
  const tables: number[] = [];
  let currentTable: string[] = [];
  let lastWasSeparator = false;
  
  allTableLines.forEach(line => {
    const isSeparator = tableSeparatorRegex.test(line);
    
    if (isSeparator) {
      // Separator is part of current table, not a terminator
      currentTable.push(line);
      lastWasSeparator = true;
    } else if (lastWasSeparator && currentTable.length > 2) {
      // New table after previous one ended (header + separator + at least one row)
      if (currentTable.length > 0) {
        const validRows = currentTable.filter(l => !tableSeparatorRegex.test(l));
        if (validRows.length > 0) {
          const colCounts = validRows.map(l => Math.max(1, (l.match(/\|/g) || []).length - 1));
          tables.push(Math.max(...colCounts));
        }
      }
      currentTable = [line]; // Start new table
      lastWasSeparator = false;
    } else {
      currentTable.push(line);
      lastWasSeparator = false;
    }
  });
  
  // Final table
  if (currentTable.length > 0) {
    const validRows = currentTable.filter(l => !tableSeparatorRegex.test(l));
    if (validRows.length > 0) {
      const colCounts = validRows.map(l => Math.max(1, (l.match(/\|/g) || []).length - 1));
      tables.push(Math.max(...colCounts));
    }
  }
  
  const totalTables = tables.length;
  
  // TUNED: Single table fast-path - No false multi-table detection
  if (totalTables === 1) {
    return { cols: tables[0], tables: 1, detectTime: performance.now() - start };
  }
  
  let cols = opts.multiTable === 'sum' ? tables.reduce((a, b) => a + b, 0) : Math.max(...tables, DEFAULT_COLS);
  
  return { cols: Math.min(cols, 100), tables: totalTables, detectTime: performance.now() - start };  // Cap crave!
}

/**
 * Escalation + Perf Multiplier
 */
function getTierAndMultiplier(cols: number): { tier: keyof typeof COL_THRESHOLDS; multiplier: number } {
  if (cols >= COL_THRESHOLDS.enterprise) return { tier: 'enterprise', multiplier: cols / 5 * 0.12 };
  if (cols >= COL_THRESHOLDS.lead) return { tier: 'lead', multiplier: cols / 5 * 0.12 };
  if (cols >= COL_THRESHOLDS.senior) return { tier: 'senior', multiplier: cols / 5 * 0.12 };
  return { tier: 'junior', multiplier: cols / 5 * 0.12 };
}

/**
 * Crypto Seal
 */
function sealCols(cols: number, secret: string): string {
  const h = new Bun.CryptoHasher("sha256", secret);
  h.update(`cols:${cols}`);
  return h.digest("hex").slice(0, 8);
}

/**
 * Extended feature counts interface for type safety
 */
interface ExtendedFeatureCounts {
  headings: number;
  tables: number;
  tableCols: number;
  codeBlocks: number;
  links: number;
  images: number;
  taskLists: number;
  strikethrough: number;
  blockquotes: number;
  lists: {
    ordered: number;
    unordered: number;
  };
  math: number;
  wikiLinks: number;
  gfmScore: number;
}

/**
 * FULL GFM SCANNER: Codeblocks + Etc!
 */
export function scanFeatures(markdown: string): { features: ExtendedFeatureCounts; scanTime: number } {
  const start = performance.now();
  
  // Regex Arsenal (Fast + Accurate) - Aligned with official Bun Markdown API
  const features: ExtendedFeatureCounts = {
    headings: (markdown.match(/^(#{1,6})\s+/gm) || []).length,
    tables: Math.round((markdown.match(/^\|[\s\S]*?\|$/gm) || []).length / 3),  // ~header+sep+row
    tableCols: detectTableColumns(markdown).cols,
    codeBlocks: Math.round((markdown.match(/```[\s\S]*?```|`{3,}[\s\S]*?`{3,}/gm) || []).length) + Math.round((markdown.match(/^( {4}|\t)[^\n]+/gm) || []).length / 2),
    links: (markdown.match(/\[([^\]]*)\]\([^)]+\)/g) || []).length,
    images: (markdown.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length,
    taskLists: (markdown.match(/^- \[(x| )\]/gm) || []).length,
    strikethrough: (markdown.match(/~~([^~]+)~~/g) || []).length,
    blockquotes: Math.round((markdown.match(/^> /gm) || []).length),  // Simplified counting
    lists: {
      ordered: (markdown.match(/^\d+\. /gm) || []).length,
      unordered: (markdown.match(/^[-*+] /gm) || []).length
    },
    math: (markdown.match(/\$[^\$]+\$/g) || []).length + (markdown.match(/\$\$[\s\S]*?\$\$/g) || []).length,
    wikiLinks: (markdown.match(/\[\[([^\]]+)\]\]/g) || []).length,
    gfmScore: 0  // Calc later
  };
  
  // GFM Score: Detected / Expected max (heuristic) - v2.7: Capped at 100
  const totalPossible = 12;  // headings+tables+code+links+images+tasks+strike+quotes+lists.o+u+math+wiki
  const totalHits = Object.values(features).reduce((sum, v) => sum + (typeof v === 'object' ? (v as any).ordered + (v as any).unordered : v), 0);
  features.gfmScore = Math.min(100, Math.round(totalHits / totalPossible * 100));
  
  return { features, scanTime: performance.now() - start };
}

/**
 * Validate file path to prevent directory traversal
 */
function validateFilePath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const isAllowed = ALLOWED_DIRECTORIES.some(dir => 
    resolvedPath.startsWith(resolve(dir))
  );
  
  if (!isAllowed) {
    throw new Error(`Access denied: File path outside allowed directories - ${filePath}`);
  }
  
  return resolvedPath;
}

/**
 * Junior-friendly markdown profiling with hyper-enhanced table detection
 * Simple, structured, no complex decisions required
 */
async function juniorProfile(mdFile: string, options: { lspSafe?: boolean } = {}): Promise<LeadSpecProfile> {
  const { lspSafe = false } = options;
  
  if (lspSafe) {
    console.log('\x1b[1;32m🛡️ LSP-SAFE MODE: No preview, fast scan\x1b[0m');
  }
  console.log(`\x1b[1;34m👤 Junior Runner: Processing ${mdFile}\x1b[0m`);
  
  // Junior Step 1: Validate and load file
  const validatedPath = validateFilePath(mdFile);
  const file = Bun.file(validatedPath);
  
  if (!await file.exists()) {
    throw new Error(`File not found: ${validatedPath}`);
  }
  
  const md = await file.text();
  const documentSize = md.length;
  
  // Initialize LeadSpecProfile structure
  const profile: LeadSpecProfile = {
    core: {
      documentSize,
      parseTime: 0,
      throughput: 0,
      memoryMB: 0
    },
    markdown: {
      parseTimeMs: 0,
      featureCounts: {},
      complexityTier: determineComplexityTier(documentSize, DEFAULT_THRESHOLDS),
      compliance: {
        gfm: 0,
        commonmark: 0
      },
      outputs: {
        htmlSize: 0,
        ansiSize: 0,
        reactEst: 0
      }
    },
    security: {
      etag: '',
      integrityHash: ''
    },
    audit: {
      timestamp: new Date().toISOString(),
      runner: 'junior',
      environment: `Bun ${Bun.version}`
    }
  };

  // Junior Step 2: Official Bun.markdown parsing
  const t0 = performance.now();
  const htmlOutput = Bun.markdown.html(md);
  const parseTimeMs = performance.now() - t0;
  
  profile.markdown.parseTimeMs = parseTimeMs;
  profile.markdown.outputs.htmlSize = htmlOutput.length;
  
  // Junior Step 3: Calculate throughput
  profile.core.throughput = documentSize / (parseTimeMs / 1000); // chars per second
  profile.core.parseTime = parseTimeMs;
  
  // Junior Step 4: HYPER-ENHANCED table detection with performance timing
  const tableResult = detectTableColumns(md, { multiTable: 'max' });
  const maxTableCols = tableResult.cols;
  const tableCount = tableResult.tables;
  const detectTime = tableResult.detectTime;
  
  // Get tier and performance multiplier
  const { tier, multiplier } = getTierAndMultiplier(maxTableCols);
  
  // Generate crypto seal for columns
  const colSeal = sealCols(maxTableCols, 'junior-secret');
  
  // Junior Step 5: FULL GFM FEATURE SCANNING
  const scanResult = scanFeatures(md);
  profile.markdown.featureCounts = scanResult.features;
  
  // Junior Step 6: ANSI output for terminal display
  const ansiOutput = Bun.markdown.render(md, {
    heading: (children, { level }) => `\x1b[1;3${level}m${children}\x1b[0m`,
    table: children => `\x1b[7m${children}\x1b[27m`,
    code: (children) => `\x1b[36m${children}\x1b[0m`,
    strong: (children) => `\x1b[1m${children}\x1b[0m`,
    emphasis: (children) => `\x1b[3m${children}\x1b[0m`
  });
  profile.markdown.outputs.ansiSize = ansiOutput.length;
  
  // Junior Step 7: Security (basic)
  profile.security.etag = generateETag(md);
  profile.security.integrityHash = generateIntegrityHash(md);
  
  // Junior Step 8: HYPER-ENHANCED complexity escalation with tier detection
  profile.markdown.complexityTier = tier;
  
  console.log(`\x1b[1;32mDetected: ${maxTableCols} Cols (${tableCount} tables, ${detectTime.toFixed(1)}μs, ${scanResult.scanTime.toFixed(1)}μs scan) → Tier: ${tier}\x1b[0m`);
  
  // ⚠️ API Stability Warning
  if (BUN_MARKDOWN_CONFIG.API_STATUS === 'unstable') {
    console.log(`\x1b[1;33m⚠️  Using Bun's unstable Markdown API - may change in future versions\x1b[0m`);
  }
  
  // Performance correlation with new multiplier and crypto seal
  profile.core.parseTime = parseTimeMs * multiplier;  // Apply performance multiplier
  profile.markdown.featureCounts.tableCols = maxTableCols;
  
  // Add crypto seal to security metadata
  profile.security.etag = `${profile.security.etag}-${colSeal}`;
  
  // Junior Step 8: Memory estimation (simple)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    profile.core.memoryMB = memUsage.heapUsed / 1024 / 1024;
  }
  
  // Validate profile
  if (!validateLeadSpecProfile(profile)) {
    throw new Error('Generated profile failed validation');
  }
  
  return profile;
}

/**
 * Junior-friendly terminal output
 */
function displayJuniorDashboard(profile: LeadSpecProfile, mdFile: string, md: string, lspSafe: boolean = false): void {
  console.log('\n\x1b[1;32m👤 Junior Dashboard\x1b[0m');
  console.log('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');
  
  // Core metrics table with HYPER-ENHANCED data
  const tableCols = (profile.markdown.featureCounts as ExtendedFeatureCounts).tableCols || DEFAULT_COLS;
  const complexityColor = profile.markdown.complexityTier === 'enterprise' ? '36' :
                         profile.markdown.complexityTier === 'lead' ? '33' : 
                         profile.markdown.complexityTier === 'senior' ? '35' : '32';
  
  // Extract crypto seal from etag
  const cryptoSeal = profile.security.etag.split('-').pop() || 'unknown';
  
  console.table({
    'Document Size': `${(profile.core.documentSize / 1024).toFixed(2)} KB`,
    'Parse Time': `${profile.markdown.parseTimeMs.toFixed(2)}ms`,
    'Throughput': `${Math.round(profile.core.throughput).toLocaleString()} chars/s`,
    'Complexity': `\x1b[1;${complexityColor}m${profile.markdown.complexityTier.toUpperCase()}\x1b[0m`,
    'Table Cols': tableCols >= ENTERPRISE_COLS_THRESHOLD ? `\x1b[1;36m${tableCols} (MEGA!)\x1b[0m` : 
                 tableCols >= LEAD_COLS_THRESHOLD ? `\x1b[1;33m${tableCols} (WIDE!)\x1b[0m` : tableCols,
    'Memory': `${profile.core.memoryMB.toFixed(2)} MB`,
    'Crypto Seal': `\x1b[1;35m${cryptoSeal}\x1b[0m`,
    'GFM Score': `${(profile.markdown.featureCounts as ExtendedFeatureCounts).gfmScore}%`
  });
  
  // Feature counts
  console.log('\n\x1b[1;33m📊 Feature Analysis:\x1b[0m');
  const features = profile.markdown.featureCounts;
  Object.entries(features).forEach(([key, value]) => {
    if (typeof value === 'object') {
      console.log(`  ${key}:`);
      Object.entries(value).forEach(([subKey, subValue]) => {
        console.log(`    ${subKey}: ${subValue}`);
      });
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });
  
  // ANSI preview (first 500 chars) - Skip in LSP-safe mode
  if (!lspSafe) {
    console.log('\n\x1b[1;35m📝 ANSI Preview (first 500 chars):\x1b[0m');
    const ansiOutput = Bun.markdown.render(md.slice(0, 500), {
      heading: (children, { level }) => `\x1b[1;3${level}m${children}\x1b[0m`,
      table: children => `\x1b[7m${children}\x1b[27m`,
      code: (children) => `\x1b[36m${children}\x1b[0m`,
      strong: (children) => `\x1b[1m${children}\x1b[0m`,
      emphasis: (children) => `\x1b[3m${children}\x1b[0m`
    });
    console.log(ansiOutput + '\x1b[0m...');
  } else {
    console.log('\n\x1b[1;32m🛡️ LSP-SAFE: ANSI preview skipped for performance\x1b[0m');
  }
  
  // Wide table alert
  if (tableCols >= ENTERPRISE_COLS_THRESHOLD) {
    console.log('\n\x1b[1;36m🏢 MEGA TABLE ALERT: 30+ columns detected!\x1b[0m');
    console.log('\x1b[1;36m   → Complexity auto-escalated to ENTERPRISE tier\x1b[0m');
    console.log('\x1b[1;36m   → Ready for enterprise deployment with full audit trail\x1b[0m');
  } else if (tableCols >= LEAD_COLS_THRESHOLD) {
    console.log('\n\x1b[1;33m⚡ WIDE TABLE ALERT: 15+ columns detected!\x1b[0m');
    console.log('\x1b[1;33m   → Complexity auto-escalated to LEAD tier\x1b[0m');
    console.log('\x1b[1;33m   → Ready for senior handoff with enhanced features\x1b[0m');
  }
  
  console.log('\x1b[1;32m✅ Junior profiling complete!\x1b[0m');
}

/**
 * Export results for senior developers
 */
async function exportForSeniors(profile: LeadSpecProfile): Promise<string> {
  const filename = `junior-${Date.now()}.json`;
  await Bun.write(filename, JSON.stringify(profile, null, 2));
  console.log(`\x1b[1;33m📁 Exported for seniors: ${filename}\x1b[0m`);
  return filename;
}

/**
 * Main CLI execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\x1b[1;31m❌ Usage: junior-run <markdown-file> [--lsp-safe]\x1b[0m');
    console.log('\x1b[1;36mExample: junior-run demo.md\x1b[0m');
    console.log('\x1b[1;36mExample: junior-run huge-50col.md --lsp-safe\x1b[0m');
    process.exit(1);
  }
  
  const mdFile = args[0];
  const lspSafe = args.includes('--lsp-safe');
  
  try {
    const profile = await juniorProfile(mdFile, { lspSafe });
    const md = await Bun.file(mdFile).text();
    displayJuniorDashboard(profile, mdFile, md, lspSafe);
    await exportForSeniors(profile);
  } catch (error) {
    console.error('\x1b[1;31m❌ Junior Error:\x1b[0m', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

// Export for use in hierarchy benchmark and debugging
export { juniorProfile, detectTableColumns };
