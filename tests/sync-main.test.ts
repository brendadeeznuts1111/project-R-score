import { describe, expect, test } from 'bun:test';
import {
  backupBranchName,
  guardSyncMainArgv,
  parseSyncMainOpts,
} from '../tools/sync-main.ts';

describe('sync-main parseSyncMainOpts', () => {
  test('parses dry-run / force / yes / help', () => {
    const opts = parseSyncMainOpts(['--dry-run', '--force', '--yes', '--help']);
    expect(opts.dryRun).toBe(true);
    expect(opts.force).toBe(true);
    expect(opts.yes).toBe(true);
    expect(opts.help).toBe(true);
  });

  test('accepts -y and -h', () => {
    expect(parseSyncMainOpts(['-y', '-h'])).toEqual({
      dryRun: false,
      force: false,
      help: true,
      yes: true,
    });
  });
});

describe('sync-main guardSyncMainArgv', () => {
  test('allows known flags', () => {
    expect(guardSyncMainArgv(['--dry-run', '--yes'])).toEqual(['--dry-run', '--yes']);
  });

  test('rejects unknown long options', () => {
    expect(() => guardSyncMainArgv(['--typo'])).toThrow(/Unknown long option/);
  });
});

describe('sync-main backupBranchName', () => {
  test('uses UTC stamp prefix', () => {
    const name = backupBranchName(new Date('2026-08-23T23:04:05.000Z'));
    expect(name).toBe('backup/local-main-pre-sync-20260823-230405');
  });
});
