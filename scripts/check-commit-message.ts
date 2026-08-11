#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
import { jsonOut } from '../lib/console/json.ts';

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
const DEFAULT_IGNORES = /^(?:Merge |Automatic merge |Revert |revert |fixup! |squash! |amend! )/;

export interface CommitMessageReport {
  valid: boolean;
  ignored: boolean;
  header: string;
  type: string | null;
  scope: string | null;
  breaking: boolean;
  subject: string | null;
  errors: string[];
}

function firstHeader(message: string): string {
  return (
    message
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line.length > 0 && !line.startsWith('#')) ?? ''
  );
}

/** Repository-compatible subset of @commitlint/config-conventional. */
export function analyzeCommitMessage(message: string): CommitMessageReport {
  const header = firstHeader(message);
  if (!header) {
    return {
      valid: false,
      ignored: false,
      header,
      type: null,
      scope: null,
      breaking: false,
      subject: null,
      errors: ['header must not be empty'],
    };
  }
  if (DEFAULT_IGNORES.test(header)) {
    return {
      valid: true,
      ignored: true,
      header,
      type: null,
      scope: null,
      breaking: false,
      subject: null,
      errors: [],
    };
  }

  const errors: string[] = [];
  if (header.length > 100)
    errors.push(`header must not exceed 100 characters (found ${header.length})`);

  const match = CONVENTIONAL_HEADER.exec(header);
  if (!match) {
    errors.push('header must match "type(scope)!: subject" or "type!: subject"');
    return {
      valid: false,
      ignored: false,
      header,
      type: null,
      scope: null,
      breaking: false,
      subject: null,
      errors,
    };
  }

  const type = match[1] ?? '';
  const scope = match[2] ?? null;
  const breaking = match[3] === '!' || /^BREAKING[ -]CHANGE:/m.test(message);
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
  return {
    valid: errors.length === 0,
    ignored: false,
    header,
    type,
    scope,
    breaking,
    subject,
    errors,
  };
}

export function validateCommitMessage(message: string): string[] {
  return analyzeCommitMessage(message).errors;
}

function messageFileFromArgs(args: string[]): string | null {
  const editIndex = args.indexOf('--edit');
  if (editIndex !== -1) return args[editIndex + 1] ?? null;
  const inlineEdit = args.find(arg => arg.startsWith('--edit='));
  if (inlineEdit) return inlineEdit.slice('--edit='.length) || null;
  return args.length === 1 && !args[0]?.startsWith('-') ? (args[0] ?? null) : null;
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.info(`Usage: bun run commitlint --edit <commit-message-file> [--json]

Checks Project R's repository-compatible Conventional Commits contract.
Git-generated merge/revert and autosquash messages are ignored.`);
    return;
  }
  if (args.includes('--print-config')) {
    jsonOut({
      types: CONVENTIONAL_COMMIT_TYPES,
      headerMaxLength: 100,
      headerPattern: 'type(scope)!: subject',
      scopeCase: 'repository-compatible',
      subjectFullStop: false,
      hookManager: 'husky',
    });
    return;
  }
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
  const report = analyzeCommitMessage(await file.text());
  if (args.includes('--json')) {
    jsonOut({ file: filePath, ...report });
  }
  if (report.valid) {
    if (args.includes('--json')) return;
    if (report.ignored) {
      console.info('✅ commitlint: ignored Git-generated commit message');
      return;
    }
    console.info('✅ commitlint: conventional commit message');
    return;
  }

  if (args.includes('--json')) process.exit(1);
  console.error('❌ commitlint: invalid commit message');
  for (const error of report.errors) console.error(`   - ${error}`);
  console.error('   example: feat(factory): add color gradient context');
  process.exit(1);
}

if (import.meta.main) await main();
