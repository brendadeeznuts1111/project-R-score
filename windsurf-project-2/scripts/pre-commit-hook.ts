#!/usr/bin/env bun
/**
 * TOML Guard Pre-commit Hook
 * Run automatically before commits to validate and optimize TOML files
 */

import { glob } from '../cli';
import { TomlOptimizer, parseToml } from '../optimizers/toml-optimizer';
import { validateSecretSyntax } from '../validators/secrets-syntax';

declare const Bun: {
  file(path: string): { text(): Promise<string>; write(content: string): Promise<void> };
  glob(pattern: string): Promise<string[]>;
  argv: string[];
};

declare const process: {
  exit(code: number): void;
  argv: string[];
  env: Record<string, string | undefined>;
};

interface HookOptions {
  optimize?: boolean;
  validate?: boolean;
  failOnDangerous?: boolean;
  autoFix?: boolean;
  stagedFiles?: string[];
}

export async function runPreCommit(options: HookOptions = {}): Promise<HookResult> {
  const result: HookResult = {
    passed: true,
    filesChecked: 0,
    filesModified: 0,
    errors: [],
    warnings: []
  };

  const patterns = options.stagedFiles && options.stagedFiles.length > 0
    ? options.stagedFiles
    : await glob('**/*.toml');

  const tomlFiles = patterns.filter((f: string) => f.endsWith('.toml'));

  console.log('\x1b[1;36m🔍 TOML Guard Pre-commit Hook\x1b[0m');
  console.log(`\x1b[90mChecking ${tomlFiles.length} TOML files...\x1b[0m\n`);

  for (const file of tomlFiles) {
    try {
      const content = await Bun.file(file).text();
      result.filesChecked++;

      // Validate syntax
      const parsed = parseToml(content);
      if (!parsed) {
        result.errors.push({ file, message: 'Invalid TOML syntax' });
        result.passed = false;
        continue;
      }

      // Check for dangerous patterns
      const secrets = extractSecretsFromContent(content);
      const dangerous = secrets.filter((s: string) => isDangerousPattern(s));

      if (dangerous.length > 0) {
        result.errors.push({
          file,
          message: `Dangerous patterns found: ${dangerous.join(', ')}`
        });
        if (options.failOnDangerous) {
          result.passed = false;
        }
      }

      // Validate secrets syntax
      for (const secret of secrets) {
        const validation = validateSecretSyntax(secret);
        if (!validation.valid && validation.errors.length > 0) {
          result.warnings.push({
            file,
            message: `Secret validation issues in ${secret}: ${validation.errors.map((e: any) => e.message).join('; ')}`
          });
        }
      }

      // Auto-fix and optimize if requested
      if (options.autoFix || options.optimize) {
        const optimized = await optimizeFile(file, content);
        if (optimized !== content) {
          await Bun.file(file).write(optimized);
          result.filesModified++;
          console.log(`\x1b[32m✓ Optimized: ${file}\x1b[0m`);
        }
      }

    } catch (err) {
      result.errors.push({
        file,
        message: `Error processing file: ${String(err)}`
      });
      result.passed = false;
    }
  }

  // Print summary
  console.log('\n\x1b[90m' + '─'.repeat(50) + '\x1b[0m');

  if (result.passed) {
    console.log('\x1b[32m✓ Pre-commit check passed\x1b[0m');
  } else {
    console.log('\x1b[31m✗ Pre-commit check failed\x1b[0m');
  }

  console.log(`  Files checked: ${result.filesChecked}`);
  console.log(`  Files modified: ${result.filesModified}`);

  if (result.errors.length > 0) {
    console.log('\x1b[31mErrors:\x1b[0m');
    for (const err of result.errors) {
      console.log(`  - ${err.file}: ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\x1b[33mWarnings:\x1b[0m');
    for (const warn of result.warnings) {
      console.log(`  - ${warn.file}: ${warn.message}`);
    }
  }

  return result;
}

async function optimizeFile(file: string, content: string): Promise<string> {
  const optimizer = new TomlOptimizer();
  const result = await optimizer.optimize(content, {
    skip: ['minify']
  });
  return result.optimized;
}

function extractSecretsFromContent(content: string): string[] {
  const secrets: string[] = [];
  const matches = content.matchAll(/\$\{([A-Z_][A-Z0-9_]*)/g);

  for (const match of matches) {
    secrets.push(match[1]);
  }

  return [...new Set(secrets)];
}

function isDangerousPattern(secret: string): boolean {
  const dangerous = /PASSWORD|TOKEN|KEY|SECRET_KEY|PRIVATE_KEY|CREDENTIAL/i;
  return dangerous.test(secret);
}

interface HookResult {
  passed: boolean;
  filesChecked: number;
  filesModified: number;
  errors: Array<{ file: string; message: string }>;
  warnings: Array<{ file: string; message: string }>;
}

export function installHook(): void {
  const hookContent = `#!/bin/bash
# TOML Guard Pre-commit Hook
# Installed by toml-guard install-hook

exec bun run ./scripts/pre-commit-hook.ts --fail-on-dangerous --auto-fix
`;

  Bun.file('.git/hooks/pre-commit').write(hookContent);
  console.log('\x1b[32m✓ Pre-commit hook installed at .git/hooks/pre-commit\x1b[0m');
  console.log('\x1b[90mMake sure to run: chmod +x .git/hooks/pre-commit\x1b[0m');
}

export function installHusky(): void {
  const huskyDir = '.husky';
  const hookPath = `${huskyDir}/pre-commit`;

  Bun.file(huskyDir).write('');
  Bun.file(hookPath).write(`#!/bin/bash
# TOML Guard Pre-commit Hook

exec bun run ./scripts/pre-commit-hook.ts --fail-on-dangerous --auto-fix
`);

  console.log('\x1b[32m✓ Husky pre-commit hook installed\x1b[0m');
  console.log('\x1b[90mRun: chmod +x .husky/pre-commit\x1b[0m');
}

// CLI entry point
const args = process.argv.slice(2);
const options: HookOptions = {
  optimize: args.includes('--optimize'),
  validate: args.includes('--validate'),
  failOnDangerous: args.includes('--fail-on-dangerous'),
  autoFix: args.includes('--auto-fix'),
  stagedFiles: args.filter((a: string) => !a.startsWith('--'))
};

if (args.includes('--install')) {
  installHook();
} else if (args.includes('--install-husky')) {
  installHusky();
} else {
  runPreCommit(options).then(result => {
    process.exit(result.passed ? 0 : 1);
  }).catch(err => {
    console.error('\x1b[31mHook error:', err, '\x1b[0m');
    process.exit(1);
  });
}
