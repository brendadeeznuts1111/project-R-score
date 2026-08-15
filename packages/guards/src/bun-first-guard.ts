// @see https://bun.com/docs/runtime/file-io — Bun.file
// packages/guards/src/bun-first-guard.ts — Runtime guard enforcing Bun-native API usage

import {
  formatBunMessage,
  getRemediationByModule,
  getGuardApiPatterns,
  getGuardModuleViolations,
  type BunRemediationSeverity,
} from '../../../config/bun-remediation-catalog.ts';

export type GuardViolation = {
  line: number;
  message: string;
  replacement: string;
  severity: BunRemediationSeverity;
  docs?: string;
  catalogId?: string;
};

type RuntimeRequire = (moduleSpecifier: string) => unknown;

const MODULE_VIOLATIONS = getGuardModuleViolations();
const API_PATTERNS = getGuardApiPatterns();

/** @deprecated Use catalog-driven MODULE_VIOLATIONS */
export const BUN_FIRST_VIOLATIONS: Record<
  string,
  { replacement: string; severity: BunRemediationSeverity }
> = Object.fromEntries(
  Object.entries(MODULE_VIOLATIONS).map(([mod, v]) => [
    mod,
    { replacement: v.replacement, severity: v.severity },
  ])
);

/**
 * Check if code contains Bun-first violations
 */
export function checkBunFirstCompliance(
  code: string,
  _filename: string = 'unknown'
): {
  valid: boolean;
  violations: GuardViolation[];
} {
  const lines = code.split('\n');
  const foundViolations: GuardViolation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip embedded example snippets in template strings / quoted literals
    if (
      /^[`'"].*(?:node:fs|node:child_process|child_process|require\s*\(|from\s+['"]fs)/.test(
        trimmed
      )
    ) {
      continue;
    }

    const importMatch = line.match(/from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (importMatch) {
      const moduleName = importMatch[1] || importMatch[2]!;
      const violation = MODULE_VIOLATIONS[moduleName];

      if (violation) {
        foundViolations.push({
          line: lineNum,
          message: `Node.js module "${moduleName}" should not be used`,
          replacement: formatBunMessage(
            violation.catalogId,
            `Node.js module "${moduleName}" should not be used.`
          ),
          severity: violation.severity,
          catalogId: violation.catalogId,
          docs: getRemediationByModule(moduleName)?.docs,
        });
      }
    }

    for (const apiPattern of API_PATTERNS) {
      if (apiPattern.pattern.test(line)) {
        foundViolations.push({
          line: lineNum,
          message: apiPattern.message,
          replacement: formatBunMessage(apiPattern.catalogId, apiPattern.replacement),
          severity: apiPattern.severity,
          catalogId: apiPattern.catalogId,
          docs: apiPattern.docs,
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
  const runtimeGlobal = globalThis as { require?: RuntimeRequire };
  const originalRequire = runtimeGlobal.require;

  if (originalRequire) {
    runtimeGlobal.require = function (moduleSpecifier: string): unknown {
      const violation = MODULE_VIOLATIONS[moduleSpecifier];
      if (violation) {
        const message = `🛡️ BUN-FIRST GUARD: "${moduleSpecifier}" is blocked. ${formatBunMessage(violation.catalogId, violation.replacement)}`;

        if (violation.severity === 'error') {
          throw new Error(message);
        }
        console.warn(`⚠️ ${message}`);
      }
      return originalRequire(moduleSpecifier);
    };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const files = args.filter(arg => !arg.startsWith('--'));

  if (files.length === 0) {
    console.info('🛡️ BUN-FIRST GUARD');
    console.info('Usage: bun run packages/guards/src/bun-first-guard.ts <file1.ts> ...');
    console.info('');
    console.info('Checks TypeScript files for Bun-first compliance violations.');
    console.info('Catalog: bun run bun:remediation');
    process.exit(0);
  }

  let totalViolations = 0;
  let totalErrors = 0;

  for (const file of files) {
    try {
      const handle = Bun.file(file);
      if (!(await handle.exists())) {
        console.error(`\n❌ ${file}`);
        console.error(
          `  🔴 missing STRICT inventory path — remove from STRICT_INVENTORY or restore the file`
        );
        totalViolations++;
        totalErrors++;
        continue;
      }
      const content = await handle.text();
      const result = checkBunFirstCompliance(content, file);

      if (!result.valid) {
        console.info(`\n❌ ${file}`);
        for (const v of result.violations) {
          const icon = v.severity === 'error' ? '🔴' : '🟡';
          console.info(`  ${icon} Line ${v.line}: ${v.message}`);
          console.info(`     💡 ${v.replacement}`);
          if (v.docs) console.info(`     📖 ${v.docs}`);

          totalViolations++;
          if (v.severity === 'error') totalErrors++;
        }
      } else {
        console.info(`✅ ${file} - No violations`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error instanceof Error ? error.message : error);
      totalViolations++;
      totalErrors++;
    }
  }

  console.info('\n' + '='.repeat(60));
  console.info(
    `Total violations: ${totalViolations} (${totalErrors} errors, ${totalViolations - totalErrors} warnings)`
  );

  if (totalErrors > 0) {
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { API_PATTERNS, MODULE_VIOLATIONS as BUN_FIRST_VIOLATIONS_CATALOG };
