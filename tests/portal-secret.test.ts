// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  envNameFromTitle,
  findItemRefByTitle,
  itemTitlesFromListJson,
  moveArgsFromTarget,
  shareItemArgs,
  splitVaultTitle,
  trashArgsFromTarget,
  viewArgsFromTarget,
} from '../tools/portal-secret.ts';

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
      'item', 'share', '--share-id', 'sid', '--item-id', 'iid', '--role', 'editor', 'ops@factory-wager.com',
    ]);
  });

  test('shareItemArgs validates role and email', () => {
    expect(() => shareItemArgs('s', 'i', 'a@b.c', 'owner')).toThrow(/role/);
    expect(() => shareItemArgs('s', 'i', 'not-an-email', 'viewer')).toThrow(/email/);
  });
});
