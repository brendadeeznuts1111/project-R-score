// lib/rip/utils.ts — Common utilities for code analysis and validation

import { spawn } from 'bun';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ScanResult {
  file: string;
  line: number;
  content: string;
  type: 'link' | 'nonbun' | 'pattern';
}

export interface ValidationReport {
  totalFiles: number;
  issuesFound: number;
  scanResults: ScanResult[];
  timestamp: number;
}

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

export const PATTERNS = {
  // Broken link patterns
  BROKEN_LINKS: [
    'https?://[^\\s\\)\\]\\}>]+',
    'www\\.[^\\s\\)\\]\\}>]+',
    'ftp://[^\\s\\)\\]\\}>]+',
  ],

  // Non-Bun code patterns
  NON_BUN_PATTERNS: [
    'require\\(',
    'module\\.exports',
    'exports\\.',
    'fs\\.',
    'child_process\\.',
    'path\\.',
    'util\\.',
    'process\\.exit',
    '__dirname',
    '__filename',
  ],

  // Security concerns
  SECURITY_PATTERNS: [
    'eval\\(',
    'Function\\(',
    'setTimeout\\(.*string',
    'setInterval\\(.*string',
    'innerHTML\\s*=',
    'outerHTML\\s*=',
  ],

  // Performance anti-patterns
  PERFORMANCE_PATTERNS: [
    'for\\s*\\(.*in.*\\)',
    'document\\.getElementById',
    'document\\.querySelector',
    'console\\.log',
    'debugger',
  ],
} as const;

// ============================================================================
// CORE UTILITIES
// ============================================================================

/**
 * Execute ripgrep command and return results
 */
export async function executeRipgrep(
  pattern: string,
  directory: string = '.',
  options: string[] = []
): Promise<string[]> {
  try {
    const args = [
      '--type',
      'js',
      '--type',
      'ts',
      '--type',
      'jsx',
      '--type',
      'tsx',
      '--no-heading',
      '--line-number',
      ...options,
      pattern,
      directory,
    ];

    const result = await spawn(['rg', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const text = await new Response(result.stdout).text();
    return text.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error(`❌ Ripgrep failed for pattern: ${pattern}`, error);
    return [];
  }
}

/**
 * Parse ripgrep output into structured results
 */
export function parseRipgrepOutput(output: string[], type: ScanResult['type']): ScanResult[] {
  return output.map(line => {
    const [lineNumber, ...contentParts] = line.split(':');
    const content = contentParts.join(':');

    // Extract file path from the beginning
    const pathMatch = content.match(/^([^:]+):/);
    const file = pathMatch ? pathMatch[1] : 'unknown';
    const fileContent = pathMatch ? content.replace(`${pathMatch[1]}:`, '') : content;

    return {
      file,
      line: parseInt(lineNumber) || 0,
      content: fileContent.trim(),
      type,
    };
  });
}

/**
 * Scan directory for multiple pattern types
 */
export async function scanDirectory(
  directory: string = '.',
  patterns: Partial<typeof PATTERNS> = PATTERNS
): Promise<ValidationReport> {
  const allResults: ScanResult[] = [];
  let totalFiles = 0;

  // Count total TypeScript/JavaScript files first
  try {
    // Use a pattern that matches any content in the files
    const countResult = await executeRipgrep(
      'import|export|function|class|const|let|var',
      directory,
      ['--files-with-matches', '--type', 'js', '--type', 'ts', '--type', 'jsx', '--type', 'tsx']
    );
    totalFiles = countResult.length;
  } catch (error) {
    console.warn('⚠️  Could not count total files with pattern, trying file list');
    // Fallback: use a simple pattern that matches anything
    try {
      const listResult = await executeRipgrep('\\w', directory, [
        '--files-with-matches',
        '--type',
        'js',
        '--type',
        'ts',
        '--type',
        'jsx',
        '--type',
        'tsx',
      ]);
      totalFiles = listResult.length;
    } catch (listError) {
      console.warn('⚠️  Could not list files either');
      // Final fallback: try to find any files with common patterns
      try {
        const fallbackResult = await executeRipgrep('.', directory, [
          '--files-with-matches',
          '--type',
          'js',
          '--type',
          'ts',
          '--type',
          'jsx',
          '--type',
          'tsx',
        ]);
        totalFiles = fallbackResult.length;
      } catch (fallbackError) {
        console.warn('⚠️  Could not count files with fallback pattern');
      }
    }
  }

  // Scan for each pattern type
  if (patterns.BROKEN_LINKS) {
    for (const pattern of patterns.BROKEN_LINKS) {
      const output = await executeRipgrep(pattern, directory);
      const results = parseRipgrepOutput(output, 'link');
      allResults.push(...results);
    }
  }

  if (patterns.NON_BUN_PATTERNS) {
    for (const pattern of patterns.NON_BUN_PATTERNS) {
      const output = await executeRipgrep(pattern, directory);
      const results = parseRipgrepOutput(output, 'nonbun');
      allResults.push(...results);
    }
  }

  if (patterns.SECURITY_PATTERNS) {
    for (const pattern of patterns.SECURITY_PATTERNS) {
      const output = await executeRipgrep(pattern, directory);
      const results = parseRipgrepOutput(output, 'pattern');
      allResults.push(...results);
    }
  }

  if (patterns.PERFORMANCE_PATTERNS) {
    for (const pattern of patterns.PERFORMANCE_PATTERNS) {
      const output = await executeRipgrep(pattern, directory);
      const results = parseRipgrepOutput(output, 'pattern');
      allResults.push(...results);
    }
  }

  return {
    totalFiles,
    issuesFound: allResults.length,
    scanResults: allResults,
    timestamp: Date.now(),
  };
}

/**
 * Generate suggestions for found issues
 */
export function generateSuggestions(results: ScanResult[]): string[] {
  const suggestions: string[] = [];
  const issues = new Set<string>();

  // Collect unique issues
  results.forEach(result => {
    if (result.type === 'nonbun') {
      if (result.content.includes('require(')) {
        issues.add('require-statements');
      }
      if (result.content.includes('fs.')) {
        issues.add('fs-module');
      }
      if (result.content.includes('module.exports')) {
        issues.add('module-exports');
      }
    }
    if (result.type === 'link') {
      issues.add('external-links');
    }
    if (result.type === 'pattern') {
      if (result.content.includes('eval(')) {
        issues.add('eval-usage');
      }
      if (result.content.includes('innerHTML')) {
        issues.add('inner-html');
      }
    }
  });

  // Generate suggestions based on issues
  if (issues.has('require-statements')) {
    suggestions.push('🔄 Replace require() with ES6 import statements');
  }
  if (issues.has('fs-module')) {
    suggestions.push('🔄 Replace fs.* with Bun.file() for better performance');
  }
  if (issues.has('module-exports')) {
    suggestions.push('🔄 Replace module.exports with ES6 export statements');
  }
  if (issues.has('external-links')) {
    suggestions.push('🔗 Validate external links and consider using relative paths');
  }
  if (issues.has('eval-usage')) {
    suggestions.push('⚠️  Remove eval() usage - security risk detected');
  }
  if (issues.has('inner-html')) {
    suggestions.push('⚠️  Consider safer alternatives to innerHTML');
  }

  return suggestions;
}

/**
 * Format validation report for display
 */
export function formatReport(report: ValidationReport): string {
  const { totalFiles, issuesFound, scanResults, timestamp } = report;
  const suggestions = generateSuggestions(scanResults);

  // Group results by type
  const grouped = scanResults.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, ScanResult[]>
  );

  let output = `
📊 VALIDATION REPORT
═══════════════════════════════════════════════════════════════

📁 Files Scanned: ${totalFiles}
⚠️  Issues Found: ${issuesFound}
🕐 Scan Time: ${new Date(timestamp).toISOString()}

`;

  // Add grouped results
  Object.entries(grouped).forEach(([type, results]) => {
    output += `
${type.toUpperCase()} ISSUES (${results.length})
─────────────────────────────────────────────────────────────────
`;

    results.slice(0, 10).forEach(result => {
      output += `  ${result.file}:${result.line} - ${result.content.substring(0, 80)}${result.content.length > 80 ? '...' : ''}\n`;
    });

    if (results.length > 10) {
      output += `  ... and ${results.length - 10} more\n`;
    }
  });

  // Add suggestions
  if (suggestions.length > 0) {
    output += `
💡 SUGGESTIONS
─────────────────────────────────────────────────────────────────
${suggestions.map(s => `  ${s}`).join('\n')}
`;
  }

  output += `═══════════════════════════════════════════════════════════════\n`;

  return output;
}

/**
 * Check if ripgrep is available
 */
export async function checkRipgrepAvailability(): Promise<boolean> {
  try {
    const result = await spawn(['rg', '--version'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });

    const version = await new Response(result.stdout).text();
    return version.includes('ripgrep');
  } catch (error) {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// All exports are already declared above with 'export' keyword
// No need for re-export block
