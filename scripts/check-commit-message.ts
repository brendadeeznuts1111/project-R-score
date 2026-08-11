#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv

export const CONVENTIONAL_COMMIT_TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
] as const;

const CONVENTIONAL_HEADER = /^([a-z]+)(?:\(([A-Za-z0-9][A-Za-z0-9._/-]*)\))?(!)?: (.+)$/;
const DEFAULT_IGNORES = /^(?:Merge |Revert "|fixup! |squash! |amend! )/;

function firstHeader(message: string): string {
  return (
    message
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line.length > 0 && !line.startsWith('#')) ?? ''
  );
}

/** Repository-compatible subset of @commitlint/config-conventional. */
export function validateCommitMessage(message: string): string[] {
  const header = firstHeader(message);
  if (!header) return ['header must not be empty'];
  if (DEFAULT_IGNORES.test(header)) return [];

  const errors: string[] = [];
  if (header.length > 100)
    errors.push(`header must not exceed 100 characters (found ${header.length})`);

  const match = CONVENTIONAL_HEADER.exec(header);
  if (!match) {
    errors.push('header must match "type(scope)!: subject" or "type!: subject"');
    return errors;
  }

  const type = match[1] ?? '';
  const subject = match[4]?.trim() ?? '';
  if (!(CONVENTIONAL_COMMIT_TYPES as readonly string[]).includes(type)) {
    errors.push(`type must be one of: ${CONVENTIONAL_COMMIT_TYPES.join(', ')}`);
  }
  if (!subject) errors.push('subject must not be empty');
  if (subject.endsWith('.')) errors.push('subject must not end with a period');

  const lines = message.split(/\r?\n/);
  if (lines.length > 1 && lines[1]?.trim()) {
    errors.push('body must begin after a blank line');
  }
  return errors;
}

function messageFileFromArgs(args: string[]): string | null {
  const editIndex = args.indexOf('--edit');
  if (editIndex !== -1) return args[editIndex + 1] ?? null;
  return args.length === 1 && !args[0]?.startsWith('-') ? (args[0] ?? null) : null;
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const filePath = messageFileFromArgs(args);
  if (!filePath) {
    console.error('Usage: bun run commitlint --edit <commit-message-file>');
    process.exit(2);
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    console.error(`commitlint: message file not found: ${filePath}`);
    process.exit(2);
  }
  const errors = validateCommitMessage(await file.text());
  if (errors.length === 0) {
    console.info('✅ commitlint: conventional commit message');
    return;
  }

  console.error('❌ commitlint: invalid commit message');
  for (const error of errors) console.error(`   - ${error}`);
  console.error('   example: feat(factory): add color gradient context');
  process.exit(1);
}

if (import.meta.main) await main();
