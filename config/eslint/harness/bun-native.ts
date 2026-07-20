/**
 * Bun-native ESLint rules — restricted imports and syntax from DX catalog.
 */
import type { Linter } from 'eslint';
import { HARNESS_IGNORES, HARNESS_PATHS, STRICT_INVENTORY } from './rollout.ts';
import { importPathMessage, lintMessage, syntaxMessage } from './messages.ts';

function importPaths(severity: 'error' | 'warn'): Linter.RuleEntry {
  const paths = [
    { name: 'node:fs', message: importPathMessage('node:fs') },
    { name: 'node:fs/promises', message: lintMessage('file.read', 'Use Bun.file() async APIs.') },
    { name: 'fs', message: importPathMessage('fs') },
    { name: 'node:child_process', message: importPathMessage('node:child_process') },
    { name: 'child_process', message: importPathMessage('child_process') },
    { name: 'node:crypto', message: lintMessage('crypto.hash', 'Avoid node:crypto.') },
    { name: 'crypto', message: lintMessage('crypto.hash', 'Avoid crypto.') },
    { name: 'node:zlib', message: lintMessage('zlib.compress', 'Avoid node:zlib.') },
    { name: 'zlib', message: lintMessage('zlib.compress', 'Avoid zlib.') },
    { name: 'axios', message: lintMessage('http.fetch', 'Avoid axios.') },
    { name: 'node:http', message: lintMessage('http.serve', 'Avoid node:http for servers.') },
    { name: 'node:https', message: lintMessage('http.serve', 'Avoid node:https for servers.') },
    { name: 'http', message: lintMessage('http.serve', 'Avoid http for servers.') },
    { name: 'https', message: lintMessage('http.serve', 'Avoid https for servers.') },
    { name: 'node:test', message: lintMessage('test.bun', 'Avoid node:test.') },
    { name: 'better-sqlite3', message: lintMessage('sqlite.bun', 'Avoid better-sqlite3.') },
  ];

  return [
    severity,
    {
      paths,
      patterns: [
        {
          group: [
            'node:fs',
            'node:fs/promises',
            'fs',
            'node:child_process',
            'child_process',
            'node:crypto',
            'crypto',
            'node:zlib',
            'zlib',
            'axios',
          ],
          message: lintMessage('file.read', 'Prefer Bun-native APIs.'),
        },
      ],
    },
  ];
}

const bunNativeSyntaxSelectors = [
  {
    selector:
      "CallExpression[callee.object.name='fs'][callee.property.name=/^(readFileSync|writeFileSync|existsSync|readdirSync|statSync|mkdirSync|rmSync|copyFileSync)$/]",
    message: syntaxMessage('file.read', 'Use Bun.file(), Bun.Glob, or Bun.write() instead of fs sync methods.'),
  },
  {
    selector: "CallExpression[callee.property.name='execSync']",
    message: syntaxMessage('spawn.sync', 'Use Bun.spawn() or Bun.spawnSync() instead of execSync().'),
  },
  {
    selector: "CallExpression[callee.object.name='cp'][callee.property.name='spawnSync']",
    message: syntaxMessage('spawn.sync', 'Use Bun.spawn() or Bun.spawnSync() instead of child_process.spawnSync().'),
  },
  {
    selector: "ImportDeclaration[source.value=/^(node:)?child_process$/]",
    message: syntaxMessage('spawn.exec', 'Use Bun.spawn() or Bun.spawnSync() instead of child_process.'),
  },
  {
    selector: "CallExpression[callee.object.name='require'][arguments.0.value='child_process']",
    message: syntaxMessage('spawn.exec', 'Use Bun.spawn() instead of require("child_process").'),
  },
  {
    selector: "CallExpression[callee.object.name='require'][arguments.0.value='fs']",
    message: syntaxMessage('file.read', 'Use Bun.file() instead of require("fs").'),
  },
] as const;

function restrictedSyntax(severity: 'error' | 'warn'): Linter.RuleEntry {
  return [severity, ...bunNativeSyntaxSelectors];
}

export const bunNativeRestrictedImports = importPaths('error');
export const bunNativeRestrictedImportsWarn = importPaths('warn');
export const bunNativeRestrictedSyntax = restrictedSyntax('error');
export const bunNativeRestrictedSyntaxWarn = restrictedSyntax('warn');

export function bunNativeStrictConfig(files: readonly string[]): Linter.Config {
  return {
    name: 'factorywager/bun-native-strict',
    files: [...files],
    rules: {
      'no-restricted-imports': bunNativeRestrictedImports,
      'no-restricted-syntax': bunNativeRestrictedSyntax,
    },
  };
}

export function bunNativeRolloutConfig(
  files: readonly string[],
  ignores: readonly string[]
): Linter.Config {
  return {
    name: 'factorywager/bun-native-rollout',
    files: [...files],
    ignores: [...ignores],
    rules: {
      'no-restricted-imports': bunNativeRestrictedImportsWarn,
      'no-restricted-syntax': bunNativeRestrictedSyntaxWarn,
    },
  };
}

export const bunNativeLintStrict = bunNativeStrictConfig(STRICT_INVENTORY);
export const bunNativeLintRollout = bunNativeRolloutConfig(HARNESS_PATHS, HARNESS_IGNORES);
export const bunNativeLintTargets = [...STRICT_INVENTORY];

export { HARNESS_IGNORES, HARNESS_PATHS, STRICT_INVENTORY };
