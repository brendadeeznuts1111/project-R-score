#!/usr/bin/env bun

/**
 * 🛡️ BUN-FIRST GUARD
 *
 * Runtime guard that prevents Node.js API usage in favor of Bun-native APIs.
 * Can be imported at the top of files to enforce Bun-first compliance.
 *
 * @example
 * ```typescript
 * import '../lib/guards/bun-first-guard'; // Must be first import
 *
 * // This will throw if you try to use child_process
 * import { spawn } from 'child_process'; // ❌ Throws!
 * ```
 */

// Violation tracking
const violations: Array<{
  module: string;
  replacement: string;
  severity: 'error' | 'warn';
}> = [];

// Node.js modules that should be replaced with Bun-native APIs
const BUN_FIRST_VIOLATIONS: Record<string, { replacement: string; severity: 'error' | 'warn' }> = {
  // File system - CRITICAL
  fs: { replacement: 'Bun.file() / Bun.write()', severity: 'error' },
  'fs/promises': { replacement: 'Bun.file() / Bun.write()', severity: 'error' },
  'node:fs': { replacement: 'Bun.file() / Bun.write()', severity: 'error' },

  // Child process - CRITICAL
  child_process: { replacement: 'Bun.spawn() / Bun.spawnSync()', severity: 'error' },
  'node:child_process': { replacement: 'Bun.spawn() / Bun.spawnSync()', severity: 'error' },

  // Crypto - HIGH
  crypto: { replacement: 'Bun.hash() / Bun.password / bun:crypto', severity: 'error' },
  'node:crypto': { replacement: 'Bun.hash() / Bun.password / bun:crypto', severity: 'error' },

  // HTTP/HTTPS - MEDIUM (Bun.serve is preferred but fetch is ok)
  http: { replacement: 'Bun.serve()', severity: 'warn' },
  https: { replacement: 'Bun.serve()', severity: 'warn' },
  'node:http': { replacement: 'Bun.serve()', severity: 'warn' },
  'node:https': { replacement: 'Bun.serve()', severity: 'warn' },

  // Path - LOW (path is acceptable but Bun has native path handling)
  path: { replacement: 'Bun.path (when available)', severity: 'warn' },
  'node:path': { replacement: 'Bun.path (when available)', severity: 'warn' },

  // Zlib - HIGH
  zlib: { replacement: 'Bun.gzip() / Bun.deflate()', severity: 'error' },
  'node:zlib': { replacement: 'Bun.gzip() / Bun.deflate()', severity: 'error' },

  // Util - MEDIUM
  util: { replacement: 'Native alternatives / Bun utilities', severity: 'warn' },
  'node:util': { replacement: 'Native alternatives / Bun utilities', severity: 'warn' },

  // OS - LOW
  os: { replacement: 'Bun.platform / Bun.version', severity: 'warn' },
  'node:os': { replacement: 'Bun.platform / Bun.version', severity: 'warn' },
};

// Specific API patterns to detect
const API_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  replacement: string;
  severity: 'error' | 'warn';
}> = [
  // File system patterns
  {
    pattern: /fs\.readFileSync|readFileSync\s*\(/,
    message: 'fs.readFileSync detected',
    replacement: 'Use Bun.file(path).text() or Bun.file(path).json()',
    severity: 'error',
  },
  {
    pattern: /fs\.writeFileSync|writeFileSync\s*\(/,
    message: 'fs.writeFileSync detected',
    replacement: 'Use await Bun.write(path, data)',
    severity: 'error',
  },
  {
    pattern: /fs\.existsSync|existsSync\s*\(/,
    message: 'fs.existsSync detected',
    replacement: 'Use await Bun.file(path).exists()',
    severity: 'error',
  },
  {
    pattern: /fs\.createReadStream|createReadStream\s*\(/,
    message: 'fs.createReadStream detected',
    replacement: 'Use Bun.file(path).stream()',
    severity: 'error',
  },

  // Child process patterns (exclude Bun.spawn which is the replacement)
  {
    pattern: /(?<!Bun\.)spawn\s*\(|child_process\.spawn/,
    message: 'child_process.spawn detected',
    replacement: 'Use Bun.spawn() or Bun.spawnSync()',
    severity: 'error',
  },
  {
    pattern: /(?<!Bun\.)execSync\s*\(|child_process\.execSync/,
    message: 'child_process.execSync detected',
    replacement: 'Use Bun.spawnSync()',
    severity: 'error',
  },
  {
    pattern: /(?<!Bun\.)exec\s*\(|child_process\.exec/,
    message: 'child_process.exec detected',
    replacement: 'Use Bun.spawn() with stdio',
    severity: 'error',
  },

  // Crypto patterns
  {
    pattern: /createHash\s*\(|crypto\.createHash/,
    message: 'crypto.createHash detected',
    replacement: 'Use Bun.hash()',
    severity: 'error',
  },
  {
    pattern: /pbkdf2|crypto\.pbkdf2/,
    message: 'crypto.pbkdf2 detected',
    replacement: 'Use Bun.password.hash()',
    severity: 'error',
  },
  {
    pattern: /randomBytes|crypto\.randomBytes/,
    message: 'crypto.randomBytes detected',
    replacement: 'Use crypto.getRandomValues() from bun:crypto',
    severity: 'warn',
  },

  // HTTP patterns
  {
    pattern: /http\.createServer|createServer\s*\(/,
    message: 'http.createServer detected',
    replacement: 'Use Bun.serve()',
    severity: 'warn',
  },

  // Legacy patterns
  {
    pattern: /new\s+Promise.*setTimeout|setTimeout.*Promise/,
    message: 'Manual sleep implementation detected',
    replacement: 'Use Bun.sleep(ms)',
    severity: 'warn',
  },
  {
    pattern: /JSON\.stringify.*===.*JSON\.stringify/,
    message: 'JSON comparison for equality detected',
    replacement: 'Use Bun.deepEquals()',
    severity: 'warn',
  },
];

/**
 * Check if code contains Bun-first violations
 */
export function checkBunFirstCompliance(
  code: string,
  filename: string = 'unknown'
): {
  valid: boolean;
  violations: Array<{
    line: number;
    message: string;
    replacement: string;
    severity: 'error' | 'warn';
  }>;
} {
  const lines = code.split('\n');
  const foundViolations: Array<{
    line: number;
    message: string;
    replacement: string;
    severity: 'error' | 'warn';
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check import statements
    const importMatch = line.match(/from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (importMatch) {
      const moduleName = importMatch[1] || importMatch[2];

      if (BUN_FIRST_VIOLATIONS[moduleName]) {
        const violation = BUN_FIRST_VIOLATIONS[moduleName];
        foundViolations.push({
          line: lineNum,
          message: `Node.js module "${moduleName}" should not be used`,
          replacement: violation.replacement,
          severity: violation.severity,
        });
      }
    }

    // Check API patterns
    for (const apiPattern of API_PATTERNS) {
      if (apiPattern.pattern.test(line)) {
        foundViolations.push({
          line: lineNum,
          message: apiPattern.message,
          replacement: apiPattern.replacement,
          severity: apiPattern.severity,
        });
      }
    }
  }

  return {
    valid: foundViolations.length === 0,
    violations: foundViolations,
  };
}

/**
 * Guard function to use at module load time
 */
export function guardBunFirst(): void {
  // Store original require
  const originalRequire = (globalThis as any).require;

  if (originalRequire) {
    (globalThis as any).require = function (id: string) {
      if (BUN_FIRST_VIOLATIONS[id]) {
        const violation = BUN_FIRST_VIOLATIONS[id];
        const message = `🛡️ BUN-FIRST GUARD: "${id}" is blocked. Use ${violation.replacement} instead.`;

        if (violation.severity === 'error') {
          throw new Error(message);
        } else {
          console.warn(`⚠️ ${message}`);
        }
      }
      return originalRequire.apply(this, arguments);
    };
  }
}

/**
 * CLI to check files for compliance
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const files = args.filter(arg => !arg.startsWith('--'));

  if (files.length === 0) {
    console.log('🛡️ BUN-FIRST GUARD');
    console.log('Usage: bun run lib/guards/bun-first-guard.ts <file1.ts> <file2.ts> ...');
    console.log('');
    console.log('Checks TypeScript files for Bun-first compliance violations.');
    process.exit(0);
  }

  let totalViolations = 0;
  let totalErrors = 0;

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const result = checkBunFirstCompliance(content, file);

      if (!result.valid) {
        console.log(`\n❌ ${file}`);
        for (const v of result.violations) {
          const icon = v.severity === 'error' ? '🔴' : '🟡';
          console.log(`  ${icon} Line ${v.line}: ${v.message}`);
          console.log(`     💡 ${v.replacement}`);

          totalViolations++;
          if (v.severity === 'error') totalErrors++;
        }
      } else {
        console.log(`✅ ${file} - No violations`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    `Total violations: ${totalViolations} (${totalErrors} errors, ${totalViolations - totalErrors} warnings)`
  );

  if (totalErrors > 0) {
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { BUN_FIRST_VIOLATIONS, API_PATTERNS };
