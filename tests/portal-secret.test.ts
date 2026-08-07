// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { describe, expect, test } from 'bun:test';
import {
  envNameFromTitle,
  findItemRefByTitle,
  isReservedEnvKey,
  itemTitlesFromListJson,
  mapWithConcurrency,
  moveArgsFromTarget,
  parseSecretTarget,
  shareItemArgs,
  shareVaultArgs,
  splitVaultTitle,
  summarizeAutofill,
  totpArgsFromTarget,
  trashArgsFromTarget,
  viewArgsFromTarget,
  type AutofillRow,
} from '../tools/portal-secret.ts';

const PORTAL_SECRET_CLI = `${import.meta.dir}/../tools/portal-secret.ts`;

/**
 * Minimal pass-cli shim for integration tests: answers `item list` with a
 * fixed vault and `item view` per title (one good secret, one empty field).
 * Everything else exits 1, like a vault miss.
 */
const PASS_CLI_SHIM = `#!/bin/bash
if [ "$1" = "item" ] && [ "$2" = "list" ]; then
  echo '[{"title":"Good Token","id":"i1","share_id":"s1"},{"title":"Empty Field","id":"i2","share_id":"s1"},{"title":"!!!","id":"i3","share_id":"s1"},{"title":"Path","id":"i4","share_id":"s1"}]'
  exit 0
fi
if [ "$1" = "item" ] && [ "$2" = "view" ]; then
  title=""
  prev=""
  for a in "$@"; do
    if [ "$prev" = "--item-title" ]; then title="$a"; fi
    prev="$a"
  done
  case "$title" in
    "Good Token") echo "s3cret-value-12345" ;;
    "Empty Field") echo "" ;;
    *) exit 1 ;;
  esac
  exit 0
fi
exit 1
`;

describe('portal-secret autofill --json (stubbed pass-cli)', () => {
  test('report is value-free; empty + unsanitizable + reserved land in missing', async () => {
    const shimDir = `${import.meta.dir}/../.tmp/pass-shim-${process.pid}-${Date.now()}`;
    const shimPath = `${shimDir}/pass-cli`;
    try {
      await Bun.write(shimPath, PASS_CLI_SHIM);
      Bun.spawnSync(['chmod', '755', shimPath]);

      const proc = Bun.spawn(
        ['bun', PORTAL_SECRET_CLI, 'autofill', '--vault', 'shimvault', '--json', '--parallel'],
        {
          stdout: 'pipe',
          stderr: 'pipe',
          env: { ...Bun.env, PATH: `${shimDir}:${Bun.env.PATH ?? ''}` },
        }
      );
      const stdout = await Bun.readableStreamToText(proc.stdout);
      const code = await proc.exited;

      expect(code).toBe(0);
      const report = JSON.parse(stdout);
      // Value-free contract: the fetched secret never reaches stdout.
      expect(stdout).not.toContain('s3cret-value-12345');
      expect(report.injected).toEqual(['GOOD_TOKEN']);
      expect(report.missing).toContain('EMPTY_FIELD');
      expect(report.missing).toContain('!!!');
      expect(report.missing).toContain('PATH');
      expect(report.errors.EMPTY_FIELD).toMatch(/empty value/);
      expect(report.errors['!!!']).toMatch(/unsanitizable/);
      expect(report.errors.PATH).toMatch(/reserved env key/);
      expect(report.parallel).toBe(true);
      expect(typeof report.durationMs).toBe('number');
    } finally {
      await Bun.$`rm -rf ${`${import.meta.dir}/../.tmp`}`.quiet();
    }
  });
});

describe('portal-secret helpers', () => {
  test('viewArgsFromTarget parses pass:// URI', () => {
    const args = viewArgsFromTarget('pass://factorywager/Cloudflare API Token/password');
    expect(args[0]).toBe('item');
    expect(args[1]).toBe('view');
    expect(args).toContain('pass://factorywager/Cloudflare API Token/password');
  });

  test('viewArgsFromTarget parses vault/title/field', () => {
    const args = viewArgsFromTarget('factorywager/Cloudflare API Token/password');
    expect(args).toContain('--vault-name');
    expect(args).toContain('factorywager');
    expect(args).toContain('--item-title');
    expect(args).toContain('Cloudflare API Token');
    expect(args).toContain('--field');
    expect(args).toContain('password');
  });

  test('viewArgsFromTarget defaults field to password', () => {
    const args = viewArgsFromTarget('factorywager/My Secret');
    expect(args).toContain('--field');
    expect(args[args.indexOf('--field') + 1]).toBe('password');
  });

  test('viewArgsFromTarget rejects bare name', () => {
    expect(() => viewArgsFromTarget('only-one')).toThrow(/pass:\/\//);
  });

  test('viewArgsFromTarget keeps multi-segment titles', () => {
    const args = viewArgsFromTarget('factorywager/Telegram: factorywager_bot/password');
    expect(args[args.indexOf('--item-title') + 1]).toBe('Telegram: factorywager_bot');
    expect(args[args.indexOf('--field') + 1]).toBe('password');
  });

  test('envNameFromTitle sanitizes', () => {
    expect(envNameFromTitle('Cloudflare API Token')).toBe('CLOUDFLARE_API_TOKEN');
    expect(envNameFromTitle('  db.password ')).toBe('DB_PASSWORD');
  });

  test('itemTitlesFromListJson array shape', () => {
    const titles = itemTitlesFromListJson(
      JSON.stringify([{ title: 'A' }, { title: 'B' }, { name: 'C' }])
    );
    expect(titles).toEqual(['A', 'B', 'C']);
  });

  test('itemTitlesFromListJson nested items + metadata.name', () => {
    const titles = itemTitlesFromListJson(
      JSON.stringify({
        items: [
          { title: 'Login One' },
          { data: { metadata: { name: 'Nested Name' } } },
        ],
      })
    );
    expect(titles).toEqual(['Login One', 'Nested Name']);
  });

  test('itemTitlesFromListJson rejects bad JSON', () => {
    expect(() => itemTitlesFromListJson('not-json{')).toThrow(/parse/);
  });
});

describe('portal-secret move/trash/share helpers', () => {
  test('splitVaultTitle splits first segment only', () => {
    expect(splitVaultTitle('factorywager/Telegram: bot/extra')).toEqual({
      vault: 'factorywager',
      title: 'Telegram: bot/extra',
    });
  });

  test('splitVaultTitle rejects bare name', () => {
    expect(() => splitVaultTitle('one')).toThrow(/vault\/item-title/);
  });

  test('moveArgsFromTarget maps to item move flags', () => {
    const args = moveArgsFromTarget('factorywager/My Item', 'archive');
    expect(args).toEqual([
      'item', 'move',
      '--from-vault-name', 'factorywager',
      '--item-title', 'My Item',
      '--to-vault-name', 'archive',
    ]);
  });

  test('trashArgsFromTarget trash vs untrash', () => {
    expect(trashArgsFromTarget('v/T')[1]).toBe('trash');
    expect(trashArgsFromTarget('v/T', true)[1]).toBe('untrash');
  });

  test('findItemRefByTitle matches exact title in items shape', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'id1', share_id: 'sid1', title: 'Other', state: 'Active' },
        { id: 'id2', share_id: 'sid2', title: 'Telegram: bot', state: 'Trashed' },
      ],
    });
    expect(findItemRefByTitle(raw, 'Telegram: bot')).toEqual({ id: 'id2', shareId: 'sid2', state: 'Trashed' });
    expect(findItemRefByTitle(raw, 'missing')).toBeNull();
  });

  test('findItemRefByTitle supports array shape + metadata.name', () => {
    const raw = JSON.stringify([
      { id: 'i1', share_id: 's1', data: { metadata: { name: 'Nested' } } },
    ]);
    expect(findItemRefByTitle(raw, 'Nested')?.id).toBe('i1');
  });

  test('findItemRefByTitle rejects bad JSON', () => {
    expect(() => findItemRefByTitle('not-json{', 'x')).toThrow(/parse/);
  });

  test('shareItemArgs builds email share with role', () => {
    expect(shareItemArgs('sid', 'iid', 'ops@factory-wager.com', 'editor')).toEqual([
      'item', 'share', '--share-id', 'sid', '--item-id', 'iid', '--role', 'editor', '--', 'ops@factory-wager.com',
    ]);
  });

  test('shareItemArgs validates role and email', () => {
    expect(() => shareItemArgs('s', 'i', 'a@b.c', 'owner')).toThrow(/role/);
    expect(() => shareItemArgs('s', 'i', 'not-an-email', 'viewer')).toThrow(/email/);
  });

  test('shareVaultArgs maps to vault share with email positional', () => {
    expect(shareVaultArgs('portal', 'alice@example.com', 'viewer')).toEqual([
      'vault', 'share', '--vault-name', 'portal', '--role', 'viewer', '--', 'alice@example.com',
    ]);
  });

  test('shareVaultArgs validates vault, role, and email', () => {
    expect(() => shareVaultArgs('  ', 'a@b.c', 'viewer')).toThrow(/vault/);
    expect(() => shareVaultArgs('portal', 'a@b.c', 'owner')).toThrow(/role/);
    expect(() => shareVaultArgs('portal', 'not-an-email', 'editor')).toThrow(/email/);
  });
});

describe('portal-secret autofill report', () => {
  const row = (over: Partial<AutofillRow>): AutofillRow => ({
    title: 'T',
    envKey: 'KEY',
    label: null,
    color: null,
    glyph: null,
    ok: true,
    ...over,
  });

  test('summarizeAutofill splits injected vs missing with errors', () => {
    const summary = summarizeAutofill([
      row({ envKey: 'A', secret: 's3cret' }),
      row({ envKey: 'B', ok: false, error: 'exit 1' }),
      row({ envKey: 'C', ok: false }),
    ]);
    expect(summary.injected).toEqual(['A']);
    expect(summary.missing).toEqual(['B', 'C']);
    expect(summary.errors).toEqual({ B: 'exit 1' });
  });

  test('summarizeAutofill never surfaces secret values', () => {
    const summary = summarizeAutofill([row({ envKey: 'A', secret: 's3cret' })]);
    expect(JSON.stringify(summary)).not.toContain('s3cret');
  });
});

describe('portal-secret totp args', () => {
  test('totpArgsFromTarget passes pass:// URI through', () => {
    expect(totpArgsFromTarget('pass://sid/iid/otp')).toEqual(['item', 'totp', 'pass://sid/iid/otp']);
  });

  test('totpArgsFromTarget omits --field for vault/title', () => {
    expect(totpArgsFromTarget('factorywager/My Login')).toEqual([
      'item', 'totp', '--vault-name', 'factorywager', '--item-title', 'My Login',
    ]);
  });

  test('totpArgsFromTarget passes explicit field', () => {
    const args = totpArgsFromTarget('factorywager/My Login/otp');
    expect(args).toContain('--field');
    expect(args[args.indexOf('--field') + 1]).toBe('otp');
  });

  test('totpArgsFromTarget rejects bare name', () => {
    expect(() => totpArgsFromTarget('only-one')).toThrow(/pass:\/\/|vault\/item/);
  });
});

describe('portal-secret parseSecretTarget', () => {
  test('pass:// URI short-circuits all modes', () => {
    for (const mode of ['default', 'explicit', 'never'] as const) {
      const t = parseSecretTarget('pass://sid/iid/field', mode);
      expect(t.uri).toBe('pass://sid/iid/field');
      expect(t.vault).toBeNull();
    }
  });

  test('field modes diverge only on 3+ segments', () => {
    expect(parseSecretTarget('v/Totp Item/otp', 'explicit').field).toBe('otp');
    expect(parseSecretTarget('v/Totp Item/otp', 'explicit').title).toBe('Totp Item');
    expect(parseSecretTarget('v/Totp Item/otp', 'never').field).toBeNull();
    expect(parseSecretTarget('v/Totp Item/otp', 'never').title).toBe('Totp Item/otp');
    expect(parseSecretTarget('v/T', 'default').field).toBe('password');
    expect(parseSecretTarget('v/T', 'explicit').field).toBeNull();
  });

  test('rejects empty and bare targets', () => {
    expect(() => parseSecretTarget('  ', 'default')).toThrow(/empty/);
    expect(() => parseSecretTarget('one', 'never')).toThrow(/pass:\/\/|vault\/item/);
  });
});

describe('portal-secret mapWithConcurrency', () => {
  test('preserves order across all items', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const out = await mapWithConcurrency(items, 4, async n => n * 2);
    expect(out).toEqual(items.map(n => n * 2));
  });

  test('never exceeds the concurrency cap', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(items, 3, async () => {
      active++;
      peak = Math.max(peak, active);
      await Bun.sleep(5);
      active--;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('portal-secret env-key guards', () => {
  test('isReservedEnvKey blocks hijack primitives', () => {
    expect(isReservedEnvKey('PATH')).toBe(true);
    expect(isReservedEnvKey('HOME')).toBe(true);
    expect(isReservedEnvKey('DYLD_INSERT_LIBRARIES')).toBe(true);
    expect(isReservedEnvKey('NODE_OPTIONS')).toBe(true);
    expect(isReservedEnvKey('BUN_CONFIG_VERBOSE_FETCH')).toBe(true);
    expect(isReservedEnvKey('CLOUDFLARE_API_TOKEN')).toBe(false);
    expect(isReservedEnvKey('PATHWAY')).toBe(false);
  });

  test('summarizeAutofill falls back to title for unsanitizable rows', () => {
    const summary = summarizeAutofill([
      { title: '!!!', envKey: '', label: null, color: null, glyph: null, ok: false, error: 'unsanitizable title (no env key)' },
    ]);
    expect(summary.missing).toEqual(['!!!']);
    expect(summary.errors['!!!']).toMatch(/unsanitizable/);
  });

  test('findItemRefByTitle matches name-only rows (autofill/share seam)', () => {
    const raw = JSON.stringify([{ id: 'i9', share_id: 's9', name: 'Name Only' }]);
    expect(findItemRefByTitle(raw, 'Name Only')?.id).toBe('i9');
  });
});
