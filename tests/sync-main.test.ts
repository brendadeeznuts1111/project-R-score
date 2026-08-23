import { describe, expect, test } from 'bun:test';
import { SYNC_MAIN_ALLOWED_LONG } from '../lib/docs/ref-id-tool-flags.ts';
import { backupBranchName, parseSyncMainOpts } from '../tools/sync-main.ts';

describe('sync-main parseSyncMainOpts', () => {
  test('parses dry-run / force / yes / help / json', () => {
    const opts = parseSyncMainOpts(['--dry-run', '--force', '--yes', '--help', '--json']);
    expect(opts.dryRun).toBe(true);
    expect(opts.force).toBe(true);
    expect(opts.yes).toBe(true);
    expect(opts.help).toBe(true);
    expect(opts.json).toBe(true);
  });

  test('accepts -y and -h', () => {
    expect(parseSyncMainOpts(['-y', '-h'])).toEqual({
      dryRun: false,
      force: false,
      help: true,
      json: false,
      yes: true,
    });
  });
});

describe('sync-main allowlist', () => {
  test('registry export matches SYNC_MAIN_ALLOWED_LONG', () => {
    expect([...SYNC_MAIN_ALLOWED_LONG].sort()).toEqual(
      ['dry-run', 'force', 'help', 'json', 'yes'].sort()
    );
  });
});

describe('sync-main backupBranchName', () => {
  test('uses UTC stamp prefix', () => {
    const name = backupBranchName(new Date('2026-08-23T23:04:05.000Z'));
    expect(name).toBe('backup/local-main-pre-sync-20260823-230405');
  });
});
