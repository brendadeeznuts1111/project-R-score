// @see https://bun.com/docs/runtime/file-io — Bun.file
// packages/guards/src/bun-first-guard.ts — Runtime guard enforcing Bun-native API usage

import {
  formatBunMessage,
  getCatalogByModule,
  getGuardApiPatterns,
  getGuardModuleViolations,
  type BunDxSeverity,
} from '../../../config/bun-dx-catalog.ts';

export type GuardViolation = {
  line: number;
  message: string;
  replacement: string;
  severity: BunDxSeverity;
  docs?: string;
  catalogId?: string;
};

const MODULE_VIOLATIONS = getGuardModuleViolations();
const API_PATTERNS = getGuardApiPatterns();

/** @deprecated Use catalog-driven MODULE_VIOLATIONS */
export const BUN_FIRST_VIOLATIONS: Record<
  string,
  { replacement: string; severity: BunDxSeverity }
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
          docs: getCatalogByModule(moduleName)?.docs,
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
  const originalRequire = (globalThis as { require?: NodeRequire }).require;

  if (originalRequire) {
    const guardedRequire = Object.assign(
      function (id: string) {
        // brand-ok — CommonJS module specifier, not a FactoryWager domain identity
        const violation = MODULE_VIOLATIONS[id];
        if (violation) {
          const message = `🛡️ BUN-FIRST GUARD: "${id}" is blocked. ${formatBunMessage(violation.catalogId, violation.replacement)}`;

          if (violation.severity === 'error') {
            throw new Error(message);
          }
          console.warn(`⚠️ ${message}`);
        }
        return originalRequire(id);
      },
      {
        cache: originalRequire.cache,
        extensions: originalRequire.extensions,
        main: originalRequire.main,
        resolve: originalRequire.resolve,
      }
    );
    (globalThis as { require: NodeRequire }).require = guardedRequire;
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
    console.info('Catalog: bun run dx:catalog');
    process.exit(0);
  }

  let totalViolations = 0;
  let totalErrors = 0;

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
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
      console.error(`❌ Error reading ${file}:`, error);
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
