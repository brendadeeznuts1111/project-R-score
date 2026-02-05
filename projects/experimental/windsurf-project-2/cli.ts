#!/usr/bin/env bun

import { TomlSecretsEditor } from './services/toml-editor';
import { TomlOptimizer } from './optimizers/toml-optimizer';
import { PTYTomlEditor } from './services/pty-editor';
import { TomlAuditLogger } from './integrations/audit-logger';
import { PolicyGenerator } from './policy-generator';
import { validateSecretSyntax } from './validators/secrets-syntax';

declare const Bun: {
  file(path: string): { text(): Promise<string>; write(content: string): Promise<void> };
  argv: string[];
  glob(pattern: string): Promise<string[]>;
};

declare const process: {
  exit(code: number): void;
  stderr: { write(msg: string): void };
};

interface CLIOptions {
  command: string;
  files: string[];
  set?: string[];
  validate?: boolean;
  output?: string;
  stripComments?: boolean;
  sortKeys?: boolean;
  minify?: boolean;
  failOnDangerous?: boolean;
  reportFormat?: 'json' | 'text';
  strict?: boolean;
  merge?: boolean;
  dryRun?: boolean;
  sourceDir?: string;
}

export async function main(args: string[]): Promise<void> {
  const options = parseArgs(args);

  switch (options.command) {
    case 'edit':
      await cmdEdit(options);
      break;
    case 'optimize':
      await cmdOptimize(options);
      break;
    case 'audit':
      await cmdAudit(options);
      break;
    case 'interactive':
      await cmdInteractive(options);
      break;
    case 'diff':
      await cmdDiff(options);
      break;
    case 'restore':
      await cmdRestore(options);
      break;
    case 'gen-policy':
      await cmdGenPolicy(options);
      break;
    default:
      printHelp();
  }
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    command: args[0] || 'help',
    files: [],
    set: []
  };

  let i = 1;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--set':
          options.set?.push(args[++i]);
          break;
        case '--validate':
          options.validate = true;
          break;
        case '--output':
          options.output = args[++i];
          break;
        case '--strip-comments':
          options.stripComments = true;
          break;
        case '--sort-keys':
          options.sortKeys = true;
          break;
        case '--minify':
          options.minify = true;
          break;
        case '--fail-on-dangerous':
          options.failOnDangerous = true;
          break;
        case '--report-format':
          options.reportFormat = args[++i] as 'json' | 'text';
          break;
      }
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }

    i++;
  }

  return options;
}

async function cmdEdit(options: CLIOptions): Promise<void> {
  const [file] = options.files;
  if (!file) {
    console.error('Error: Missing file argument');
    process.exit(1);
  }

  const editor = new TomlSecretsEditor(file);
  const mutations: Record<string, any> = {};

  for (const set of options.set || []) {
    const [key, value] = set.split('=');
    mutations[key] = value;
  }

  const result = await editor.edit(file, mutations);

  if (options.validate) {
    const validation = validateSecretSyntax(JSON.stringify(mutations));
    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      process.exit(1);
    }
  }

  console.log(`Edited: ${file}`);
  console.log(`Secrets: ${result.secretsCount}`);
  console.log(`Security Score: ${result.securityScore}`);
}

async function cmdOptimize(options: CLIOptions): Promise<void> {
  const [file] = options.files;
  if (!file) {
    console.error('Error: Missing file argument');
    process.exit(1);
  }

  const content = await Bun.file(file).text();
  const optimizer = new TomlOptimizer();

  const result = await optimizer.optimize(content, {
    skip: [
      !options.stripComments ? 'stripComments' : null,
      !options.sortKeys ? 'sortKeys' : null,
      !options.minify ? 'minify' : null
    ].filter(Boolean) as string[]
  });

  const output = options.output || file;
  await Bun.file(output).write(result.optimized);

  console.log(`Optimized: ${file} -> ${output}`);
  console.log(`Size reduction: ${result.sizeReduction} bytes`);
  console.log(`Compression ratio: ${(result.compressionRatio * 100).toFixed(1)}%`);
}

async function cmdAudit(options: CLIOptions): Promise<void> {
  const logger = new TomlAuditLogger();
  const results: AuditResult[] = [];

  for (const pattern of options.files) {
    const files = await glob(pattern);

    for (const file of files) {
      const content = await Bun.file(file).text();
      const parsed = parseToml(content);
      const audit = await auditFile(file, parsed, options);

      results.push(audit);

      if (options.failOnDangerous && audit.dangerousCount > 0) {
        console.error(`FAILED: ${file} has ${audit.dangerousCount} dangerous patterns`);
        process.exit(1);
      }
    }
  }

  if (options.reportFormat === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      printAuditSummary(result);
    }
  }
}

async function cmdInteractive(options: CLIOptions): Promise<void> {
  const [file] = options.files;
  if (!file) {
    console.error('Error: Missing file argument');
    process.exit(1);
  }

  const pty = new PTYTomlEditor(file);
  await pty.startInteractiveSession();
}

async function cmdDiff(options: CLIOptions): Promise<void> {
  const [file1, file2] = options.files;
  if (!file1 || !file2) {
    console.error('Error: Missing two files for diff');
    process.exit(1);
  }

  const content1 = await Bun.file(file1).text();
  const content2 = await Bun.file(file2).text();

  const diff = computeDiff(content1, content2);
  console.log(JSON.stringify(diff, null, 2));
}

async function cmdRestore(options: CLIOptions): Promise<void> {
  const [source] = options.files;
  if (!source) {
    console.error('Error: Missing source path');
    process.exit(1);
  }

  console.log(`Restoring: ${source}`);
  console.log('Note: Implement decompression from S3 or local archive');
}

async function cmdGenPolicy(options: CLIOptions): Promise<void> {
  const sourceDir = options.sourceDir || '.';
  const outputPath = options.output || '.observatory-policy.toml';

  console.log(`\x1b[1;36mGenerating security policy from ${sourceDir}...\x1b[0m`);

  const generator = new PolicyGenerator(sourceDir);

  const policy = await generator.generate({
    sourcePatterns: options.files.length > 0 ? options.files : undefined,
    strictMode: options.strict,
    dryRun: options.dryRun
  });

  if (options.dryRun) {
    const toml = await generator.generateTOML(policy);
    console.log('\x1b[33m=== DRY RUN - Policy would be: ===\x1b[0m');
    console.log(toml);
    return;
  }

  await generator.savePolicy(policy, outputPath);

  console.log(`\x1b[32m✓ Policy generated: ${outputPath}\x1b[0m`);
  console.log(`  Patterns found: ${policy.metadata.patterns_found}`);
  console.log(`  Secrets classified: ${policy.metadata.secrets_classified}`);
  console.log(`  URL patterns extracted: ${policy.metadata.url_patterns_extracted}`);
  console.log(`  Allowed prefixes: ${policy.secrets.allowed_prefixes.join(', ')}`);
  console.log(`  Blocked substrings: ${policy.secrets.blocked_substrings.join(', ')}`);

  if (options.merge) {
    const diff = await generator.diffWithExisting(policy, outputPath);
    console.log('\x1b[33m=== Diff with existing policy ===\x1b[0m');
    console.log(`  Added sections: ${diff.added.join(', ') || 'none'}`);
    console.log(`  Removed sections: ${diff.removed.join(', ') || 'none'}`);
    console.log(`  Modified sections: ${diff.modified.join(', ') || 'none'}`);
    console.log(`  Changes: ${diff.diff}`);
  }

  console.log('\n\x1b[90mRun `toml-guard audit` to validate the generated policy.\x1b[0m');
}

function printHelp(): void {
  console.log(`
TOML Guard - Secure TOML Editor

Usage: toml-guard <command> [options] [files...]

Commands:
  edit <file>        Edit TOML file with security validation
  optimize <file>   Optimize and minify TOML
  audit <pattern>   Security audit of TOML files
  interactive <file> Interactive PTY editor
  diff <file1> <file2>  Diff two TOML versions
  restore <path>    Restore from backup
  gen-policy        Generate policy from codebase findings

Options:
  --set <key=value>     Set configuration value
  --validate           Validate before saving
  --output <path>      Output file path
  --strip-comments     Strip comments during optimization
  --sort-keys          Sort keys alphabetically
  --minify             Minify output
  --fail-on-dangerous  Exit with error on dangerous patterns
  --report-format <fmt> Output format (json|text)
  --strict             Strict mode (fail on more patterns)
  --merge              Diff with existing policy
  --dry-run            Preview policy without saving
  --source-dir <dir>   Source directory to scan

Examples:
  toml-guard edit config/secrets.toml --set "api.url=https://api.example.com"
  toml-guard audit config/*.toml --fail-on-dangerous
  toml-guard optimize config/app.toml --minify --output config/app.min.toml
  toml-guard gen-policy --output .observatory-policy.toml --strict
  toml-guard gen-policy --dry-run --source-dir ./src
`);
}

function printAuditSummary(result: AuditResult): void {
  console.log(`\n${result.file}:`);
  console.log(`  Secrets: ${result.secretsCount}`);
  console.log(`  Dangerous: ${result.dangerousCount}`);
  console.log(`  Score: ${result.securityScore}/100`);

  if (result.issues.length > 0) {
    console.log('  Issues:');
    for (const issue of result.issues) {
      console.log(`    - ${issue}`);
    }
  }
}

async function glob(pattern: string): Promise<string[]> {
  const result = await Bun.glob(pattern);
  return Array.from(result);
}

export { glob };

async function auditFile(
  file: string,
  parsed: Record<string, any>,
  options: CLIOptions
): Promise<AuditResult> {
  const secrets = extractSecrets(parsed);
  const dangerous = secrets.filter(s => s.isDangerous);

  return {
    file,
    secretsCount: secrets.length,
    dangerousCount: dangerous.length,
    securityScore: calculateSecurityScore(secrets),
    issues: dangerous.map(d => `Dangerous secret: ${d.name}`),
    timestamp: Date.now()
  };
}

function extractSecrets(parsed: Record<string, any>): Array<{ name: string; isDangerous: boolean }> {
  const secrets: Array<{ name: string; isDangerous: boolean }> = [];

  const traverse = (obj: any, path: string[] = []) => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];

      if (typeof value === 'object' && value !== null) {
        traverse(value, currentPath);
      } else if (key.toUpperCase().includes('SECRET') || key.toUpperCase().includes('PASSWORD')) {
        secrets.push({
          name: currentPath.join('.'),
          isDangerous: /PASSWORD|TOKEN|KEY|SECRET/i.test(key)
        });
      }
    }
  };

  traverse(parsed);
  return secrets;
}

function calculateSecurityScore(secrets: Array<{ isDangerous: boolean }>): number {
  let score = 100;
  for (const s of secrets) {
    if (s.isDangerous) score -= 20;
  }
  return Math.max(0, score);
}

function computeDiff(content1: string, content2: string): DiffResult {
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');

  const added = lines2.filter(l => !lines1.includes(l));
  const removed = lines1.filter(l => !lines2.includes(l));

  return {
    added: added.length,
    removed: removed.length,
    changes: added.length + removed.length
  };
}

interface AuditResult {
  file: string;
  secretsCount: number;
  dangerousCount: number;
  securityScore: number;
  issues: string[];
  timestamp: number;
}

interface DiffResult {
  added: number;
  removed: number;
  changes: number;
}

function parseToml(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = content.split('\n');
  let currentSection: Record<string, any> = result;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const sectionName = trimmed.slice(1, -1);
      currentSection = result;
      const parts = sectionName.split('.');
      for (const part of parts) {
        if (!currentSection[part]) {
          currentSection[part] = {};
        }
        currentSection = currentSection[part];
      }
    } else {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        currentSection[key] = parseValue(value);
      }
    }
  }

  return result;
}

function parseValue(value: string): any {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(s => s.trim());
  }
  const num = Number(value);
  if (!isNaN(num)) return num;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

main(Bun.argv.slice(2)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
