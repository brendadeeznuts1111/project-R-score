#!/usr/bin/env bun

/**
 * 🔍 FactoryWager Native Audit Engine
 * Scans codebase for Node.js polyfills and maps to Bun-native replacements
 * v1.0 - Pure Bun verification system
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface ImportViolation {
  file: string;
  line: number;
  importName: string;
  type: 'polyfill' | 'node-suboptimal' | 'builtin';
  severity: 'error' | 'warning';
  replacement: string;
  rationale: string;
}

interface AuditResult {
  violations: ImportViolation[];
  purityScore: number;
  totalFiles: number;
  nativeApis: number;
  suboptimal: number;
  polyfills: number;
}

const BUN_NATIVE_APIS = new Set([
  'bun',
  'path',           // Bun supports, but path.join is native
  'process',        // Partial - process.env works, prefer Bun.env
  'stream',         // Bun has native stream support
  'util',           // Many utils native in Bun
  'url',            // URL global is native
]);

const NODE_SUBOPTIMAL = new Map<string, { replacement: string; rationale: string }>([
  ['fs', {
    replacement: 'Bun.file() / Bun.write()',
    rationale: 'Bun.file is 10-50x faster than fs.readFile'
  }],
  ['fs/promises', {
    replacement: 'Bun.file().text() / Bun.write()',
    rationale: 'Native promise-based file API'
  }],
  ['crypto', {
    replacement: 'Bun.hash.crc32 / Bun.hash.sha256 / globalThis.crypto',
    rationale: 'Hardware-accelerated hashing'
  }],
  ['http', {
    replacement: 'Bun.serve()',
    rationale: 'Native HTTP server with better performance'
  }],
  ['https', {
    replacement: 'Bun.serve() with tls option',
    rationale: 'Native TLS support'
  }],
  ['child_process', {
    replacement: 'Bun.spawn() / Bun.spawnSync()',
    rationale: 'Native process spawning'
  }],
  ['os', {
    replacement: 'process.platform / process.arch (limited)',
    rationale: 'Bun has partial os support, check compatibility'
  }],
  ['net', {
    replacement: 'Bun.serve() / Bun.connect()',
    rationale: 'Native networking'
  }],
  ['readline', {
    replacement: 'Bun.stdin.stream()',
    rationale: 'Native stream handling'
  }],
  ['events', {
    replacement: 'EventTarget / EventEmitter (limited)',
    rationale: 'Bun has EventTarget native'
  }],
]);

const POLYFILLS = new Map<string, { replacement: string; rationale: string }>([
  ['yaml', {
    replacement: 'Bun.YAML.parse() (when available) or native parser',
    rationale: 'Bun has built-in YAML support via Bun.file().json()'
  }],
  ['chalk', {
    replacement: 'Bun.color().ansi16m()',
    rationale: 'Native HSL/hex to ANSI conversion'
  }],
  ['colorette', {
    replacement: 'Bun.color().ansi16m()',
    rationale: 'Native color support'
  }],
  ['string-width', {
    replacement: 'Bun.stringWidth()',
    rationale: 'Native Unicode width calculation'
  }],
  ['strip-ansi', {
    replacement: 'str.replace(/\x1b\[[0-9;]*m/g, "")',
    rationale: 'Simple regex, no library needed'
  }],
  ['commander', {
    replacement: 'parseArgs from "util" or manual parsing',
    rationale: 'Reduce dependency footprint'
  }],
  ['yargs', {
    replacement: 'parseArgs from "util"',
    rationale: 'Native argument parsing'
  }],
  ['simple-git', {
    replacement: 'Bun.spawn(["git", ...])',
    rationale: 'Native process spawning'
  }],
  ['isomorphic-git', {
    replacement: 'Bun.spawn(["git", ...])',
    rationale: 'Native process spawning'
  }],
  ['marked', {
    replacement: 'Bun.markdown.render()',
    rationale: 'Native markdown rendering'
  }],
  ['remark', {
    replacement: 'Bun.markdown.render()',
    rationale: 'Native markdown support'
  }],
  ['front-matter', {
    replacement: 'Custom frontmatter parser using Bun.file()',
    rationale: 'Simple regex + YAML parse'
  }],
  ['dotenv', {
    replacement: 'Bun.env (automatic)',
    rationale: 'Bun loads .env automatically'
  }],
  ['cross-env', {
    replacement: 'Bun.env or --env flag',
    rationale: 'Native environment handling'
  }],
  ['rimraf', {
    replacement: 'Bun.spawn(["rm", "-rf", ...]) or fs native',
    rationale: 'Native file operations'
  }],
  ['mkdirp', {
    replacement: 'Bun.spawn(["mkdir", "-p", ...])',
    rationale: 'Native mkdir -p'
  }],
  ['node-fetch', {
    replacement: 'fetch() (global)',
    rationale: 'Native fetch API'
  }],
  ['axios', {
    replacement: 'fetch() (global)',
    rationale: 'Native fetch, zero dependencies'
  }],
  ['ws', {
    replacement: 'Bun.serve() with websocket handler',
    rationale: 'Native WebSocket support'
  }],
]);

export class NativeAuditor {
  private violations: ImportViolation[] = [];

  async auditDirectory(dir: string = './.factory-wager'): Promise<AuditResult> {
    const files = await this.getTsFiles(dir);
    let nativeCount = 0;
    let suboptimalCount = 0;
    let polyfillCount = 0;

    for (const file of files) {
      const content = await Bun.file(file).text();
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = this.parseImport(line);

        if (match) {
          const violation = this.classifyImport(file, i + 1, match);
          if (violation) {
            this.violations.push(violation);

            if (violation.type === 'builtin') nativeCount++;
            else if (violation.type === 'node-suboptimal') suboptimalCount++;
            else if (violation.type === 'polyfill') polyfillCount++;
          }
        }
      }
    }

    const totalImports = nativeCount + suboptimalCount + polyfillCount;
    const purityScore = totalImports > 0
      ? Math.round((nativeCount / totalImports) * 100)
      : 100;

    return {
      violations: this.violations,
      purityScore,
      totalFiles: files.length,
      nativeApis: nativeCount,
      suboptimal: suboptimalCount,
      polyfills: polyfillCount,
    };
  }

  private async getTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scanDirectory(currentDir: string) {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    }

    await scanDirectory(dir);
    return files;
  }

  private parseImport(line: string): string | null {
    // ES6 imports
    const es6Match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (es6Match) return es6Match[1];

    // CommonJS requires
    const cjsMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (cjsMatch) return cjsMatch[1];

    return null;
  }

  private classifyImport(file: string, line: number, module: string): ImportViolation | null {
    // Skip relative imports (internal modules)
    if (module.startsWith('./') || module.startsWith('../')) return null;

    // Skip URL imports (Bun supports these natively)
    if (module.startsWith('http://') || module.startsWith('https://')) {
      return {
        file,
        line,
        importName: module,
        type: 'builtin',
        severity: 'warning',
        replacement: 'Native URL import',
        rationale: 'Bun supports URL imports natively',
      };
    }

    // Check for polyfills (highest priority)
    if (POLYFILLS.has(module)) {
      const info = POLYFILLS.get(module)!;
      return {
        file,
        line,
        importName: module,
        type: 'polyfill',
        severity: 'error',
        replacement: info.replacement,
        rationale: info.rationale,
      };
    }

    // Check for Node.js suboptimal
    if (NODE_SUBOPTIMAL.has(module)) {
      const info = NODE_SUBOPTIMAL.get(module)!;
      return {
        file,
        line,
        importName: module,
        type: 'node-suboptimal',
        severity: 'warning',
        replacement: info.replacement,
        rationale: info.rationale,
      };
    }

    // Check if it's a Bun nativeAPI
    if (BUN_NATIVE_APIS.has(module)) {
      return {
        file,
        line,
        importName: module,
        type: 'builtin',
        severity: 'warning',
        replacement: 'Already native',
        rationale: 'Bun supports this module natively',
      };
    }

    // Unknown third-party module
    return {
      file,
      line,
      importName: module,
      type: 'polyfill',
      severity: 'error',
      replacement: 'Review for Bun-native alternative',
      rationale: 'Third-party dependency detected',
    };
  }

  generateReport(result: AuditResult): string {
    const gray = (s: string) => `\x1b[90m${s}\x1b[0m`;
    const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
    const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
    const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
    const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

    let output = '\n';
    output += green('╔════════════════════════════════════════════════════════════╗\n');
    output += green('║          FACTORYWAGER NATIVE AUDIT REPORT v1.0             ║\n');
    output += green('╚════════════════════════════════════════════════════════════╝\n\n');

    // Summary stats
    output += cyan('📊 Summary:\n');
    output += `  Files Scanned: ${result.totalFiles}\n`;
    output += `  Purity Score: ${result.purityScore >= 90 ? green(result.purityScore + '%') : result.purityScore >= 70 ? yellow(result.purityScore + '%') : red(result.purityScore + '%')}\n`;
    output += `  Native APIs: ${green(result.nativeApis.toString())}\n`;
    output += `  Suboptimal (Node.js): ${yellow(result.suboptimal.toString())}\n`;
    output += `  Polyfills to Remove: ${red(result.polyfills.toString())}\n\n`;

    // Violations by severity
    if (result.violations.length > 0) {
      output += yellow('⚠️  Issues Found:\n\n');

      // Group by file
      const byFile = new Map<string, ImportViolation[]>();
      for (const v of result.violations) {
        if (!byFile.has(v.file)) byFile.set(v.file, []);
        byFile.get(v.file)!.push(v);
      }

      for (const [file, violations] of byFile) {
        output += gray(`📁 ${file}\n`);
        for (const v of violations) {
          const icon = v.severity === 'error' ? red('❌') : yellow('⚠️');
          const typeLabel = v.type === 'polyfill' ? red('[POLYFILL]') :
                          v.type === 'node-suboptimal' ? yellow('[NODE.JS]') :
                          green('[OK]');
          output += `  ${icon} Line ${v.line}: ${typeLabel} ${cyan(v.importName)}\n`;
          output += gray(`     → Replace with: ${v.replacement}\n`);
          output += gray(`     → Why: ${v.rationale}\n`);
        }
        output += '\n';
      }
    } else {
      output += green('✅ No issues found! Codebase is 100% Bun-native.\n');
    }

    // Migration guide
    if (result.polyfills > 0) {
      output += yellow('\n📋 Migration Checklist:\n');
      const uniquePolyfills = new Set(result.violations
        .filter(v => v.type === 'polyfill')
        .map(v => v.importName));

      for (const pkg of uniquePolyfills) {
        const info = POLYFILLS.get(pkg);
        if (info) {
          output += `  ☐ Remove: npm uninstall ${pkg}\n`;
          output += `     Use: ${info.replacement}\n`;
        }
      }
    }

    return output;
  }
}

// CLI
if (import.meta.main) {
  const auditor = new NativeAuditor();
  const result = await auditor.auditDirectory(process.argv[2] || './.factory-wager');
  console.log(auditor.generateReport(result));

  process.exit(result.polyfills > 0 ? 1 : 0);
}

export default NativeAuditor;
