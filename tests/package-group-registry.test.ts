import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  getPackageGroupRegistry,
  parsePartnerCode,
  parseTelegramChatIdWire,
  resolvePartnerDmTelegramId,
  upsertPackageGroupRegistry,
  suggestPackageGroupSurfacesMap,
} from '../lib/telegram/package-group-registry.ts';

describe('package_group_registry', () => {
  test('parsePartnerCode and chat_id wire', () => {
    expect(parsePartnerCode('ash')).toBe('ASH');
    expect(parsePartnerCode('ASH')).toBe('ASH');
    expect(parsePartnerCode('ASH-001')).toBeNull();
    expect(parseTelegramChatIdWire('-1003937534779')).toBe('-1003937534779');
    expect(parseTelegramChatIdWire('abc')).toBeNull();
  });

  test('upsert and get round-trip', () => {
    const db = new Database(':memory:');
    const row = upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      displayName: 'Ash Ops',
      inviteLink: 'https://t.me/+test',
      requestedBy: 'ASH-001',
    });
    expect(row.partnerCode).toBe('ASH');
    expect(row.title).toBe('TOC Ops · ASH · Ash Ops');
    expect(row.chatId).toBe('-1003937534779');
    expect(row.inviteLink).toBe('https://t.me/+test');

    const again = upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1004400413853',
      displayName: 'Ash Ops',
    });
    expect(again.chatId).toBe('-1004400413853');
    expect(getPackageGroupRegistry(db, 'ASH')?.chatId).toBe('-1004400413853');
  });

  test('resolvePartnerDmTelegramId prefers requested call-sign', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, created_at)
       VALUES ('a1', 'agent', NULL, NULL, 'Seat A', 'ASH-001', '111', 1, $n),
              ('a2', 'agent', NULL, NULL, 'Seat B', 'ASH-002', '222', 1, $n)`,
      { $n: now }
    );
    expect(resolvePartnerDmTelegramId(db, 'ASH', 'ASH-002')).toBe('222');
    expect(resolvePartnerDmTelegramId(db, 'ASH')).toBe('111');
    db.close();
  });

  test('suggestPackageGroupSurfacesMap wires pkg slug + partner desk', () => {
    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      displayName: 'Ash Ops',
    });
    upsertPackageGroupRegistry(db, {
      partnerCode: 'BIL',
      chatId: '-1004396694559',
      displayName: 'Billy Ops',
    });
    const map = suggestPackageGroupSurfacesMap([
      getPackageGroupRegistry(db, 'ASH')!,
      getPackageGroupRegistry(db, 'BIL')!,
    ]);
    expect(map['pkg-ash']).toBe('-1003937534779');
    expect(map['ash-staging']).toBe('-1003937534779');
    expect(map['pkg-bil']).toBe('-1004396694559');
    expect(map['ash-staging']).toBe('-1003937534779');
  });
});
