// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Bun-native ESLint rules — restricted imports and syntax from DX catalog.
 */
import type { Linter } from 'eslint';
import { HARNESS_IGNORES, HARNESS_PATHS, STRICT_INVENTORY } from './rollout.ts';
import { importPathMessage, lintMessage, syntaxMessage } from './messages.ts';

function importPaths(): Linter.RuleEntry {
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
    { name: 'node-fetch', message: lintMessage('http.fetch', 'Avoid node-fetch.') },
    { name: 'node:http', message: lintMessage('http.serve', 'Avoid node:http for servers.') },
    { name: 'node:https', message: lintMessage('http.serve', 'Avoid node:https for servers.') },
    { name: 'http', message: lintMessage('http.serve', 'Avoid http for servers.') },
    { name: 'https', message: lintMessage('http.serve', 'Avoid https for servers.') },
    { name: 'node:test', message: lintMessage('test.bun', 'Avoid node:test.') },
    { name: 'better-sqlite3', message: lintMessage('sqlite.bun', 'Avoid better-sqlite3.') },
    // Tier-A wrappers — catalog ids must resolve via formatBunMessage
    { name: 'wrap-ansi', message: lintMessage('tty.wrapAnsi', 'Avoid wrap-ansi.') },
    { name: 'string-width', message: lintMessage('tty.stringWidth', 'Avoid string-width.') },
    { name: 'strip-ansi', message: lintMessage('tty.stripANSI', 'Avoid strip-ansi.') },
    { name: 'chalk', message: lintMessage('tty.color', 'Avoid chalk.') },
    { name: 'kleur', message: lintMessage('tty.color', 'Avoid kleur.') },
    { name: 'cli-table', message: lintMessage('tty.table', 'Avoid cli-table.') },
    { name: 'cli-table3', message: lintMessage('tty.table', 'Avoid cli-table3.') },
    { name: 'toml', message: lintMessage('data.toml', 'Avoid toml.') },
    { name: '@iarna/toml', message: lintMessage('data.toml', 'Avoid @iarna/toml.') },
    { name: 'escape-html', message: lintMessage('html.escape', 'Avoid escape-html.') },
    { name: 'execa', message: lintMessage('spawn.execa', 'Avoid execa.') },
    { name: 'fs-extra', message: lintMessage('file.fsExtra', 'Avoid fs-extra.') },
  ];

  return ['error', { paths }];
}

/** Call-site bans only — module imports are covered by no-restricted-imports paths. */
const bunNativeSyntaxSelectors = [
  {
    selector:
      "CallExpression[callee.object.name='fs'][callee.property.name=/^(readFileSync|writeFileSync|existsSync|readdirSync|statSync|mkdirSync|rmSync|copyFileSync)$/]",
    message: syntaxMessage(
      'file.read',
      'Use Bun.file(), Bun.Glob, or Bun.write() instead of fs sync methods.'
    ),
  },
  {
    selector: "CallExpression[callee.property.name='execSync']",
    message: syntaxMessage(
      'spawn.sync',
      'Use Bun.spawn() or Bun.spawnSync() instead of execSync().'
    ),
  },
  {
    selector: "CallExpression[callee.object.name='cp'][callee.property.name='spawnSync']",
    message: syntaxMessage(
      'spawn.sync',
      'Use Bun.spawn() or Bun.spawnSync() instead of child_process.spawnSync().'
    ),
  },
  {
    selector: "CallExpression[callee.name='require'][arguments.0.value='child_process']",
    message: syntaxMessage('spawn.exec', 'Use Bun.spawn() instead of require("child_process").'),
  },
  {
    selector: "CallExpression[callee.name='require'][arguments.0.value='fs']",
    message: syntaxMessage('file.read', 'Use Bun.file() instead of require("fs").'),
  },
  {
    selector: "CallExpression[callee.name='btoa']",
    message: syntaxMessage(
      'bytes.base64',
      'Use lib/bytes-base64 (Uint8Array.toBase64) instead of btoa().'
    ),
  },
  {
    selector: "CallExpression[callee.name='atob']",
    message: syntaxMessage(
      'bytes.base64',
      'Use lib/bytes-base64 (Uint8Array.fromBase64) instead of atob().'
    ),
  },
] as const;

function restrictedSyntax(): Linter.RuleEntry {
  return ['error', ...bunNativeSyntaxSelectors];
}

export const bunNativeRestrictedImports = importPaths();
export const bunNativeRestrictedSyntax = restrictedSyntax();

/**
 * Harness path filter (lib/scripts/packages/server/config/tools): Bun-native
 * import/syntax rules at **error**.
 */
export function bunNativeRolloutConfig(
  files: readonly string[],
  ignores: readonly string[]
): Linter.Config {
  return {
    name: 'factorywager/bun-native-rollout',
    files: [...files],
    ignores: [...ignores],
    rules: {
      'no-restricted-imports': bunNativeRestrictedImports,
      'no-restricted-syntax': bunNativeRestrictedSyntax,
    },
  };
}

export const bunNativeLintRollout = bunNativeRolloutConfig(HARNESS_PATHS, HARNESS_IGNORES);

export { HARNESS_IGNORES, HARNESS_PATHS, STRICT_INVENTORY };
