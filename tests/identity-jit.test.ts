/**
 * Identity/auth subsystem — Phase 2b JIT provisioning tests.
 * @see ../lib/identity/jit.ts
 * @see ../lib/accounts/accounts.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountSystem } from '../lib/accounts/accounts.ts';
import { IdentitySystem } from '../lib/identity/identity.ts';
import { jitProvision, type OidcProfile } from '../lib/identity/jit.ts';
import { asTelegramUserId } from '../lib/types/branded.ts';

describe('identity-jit', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let accounts: AccountSystem;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-jit-'));
    dbPath = join(dir, 'jit.db');
    accounts = new AccountSystem(undefined, dbPath);
    identity = new IdentitySystem(undefined, dbPath);
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('first call creates node + alias; returned plaintext password logs in', async () => {
    const profile: OidcProfile = { sub: 'sub-001', email: 'ada@example.com', name: 'Ada Lovelace' };
    const result = await jitProvision(identity, accounts, profile);

    expect(result.created).toBe(true);
    expect(result.alias).toBe('ada');
    expect(result.password).toBeDefined();

    const node = accounts.getById(result.nodeId);
    expect(node).not.toBeNull();
    expect(node!.type).toBe('agent');
    expect(node!.status).toBe('active');
    expect(node!.name).toBe('Ada Lovelace');
    expect(node!.email).toBe('ada@example.com');
    expect(node!.oidcSubject).toBe('sub-001');
    // Placeholder: telegram_id is UNIQUE NOT NULL — see jit.ts header.
    expect(node!.telegramId as string).toBe('oidc:sub-001');

    const login = await identity.login(result.alias!, result.password!);
    expect(identity.resolveSession(login.token)).not.toBeNull();
  });

  test('second call with the same sub returns created:false and the same nodeId', async () => {
    const profile: OidcProfile = { sub: 'sub-002', email: 'grace@example.com' };
    const first = await jitProvision(identity, accounts, profile);
    const second = await jitProvision(identity, accounts, profile);

    expect(second.created).toBe(false);
    expect(second.nodeId).toBe(first.nodeId);
    expect(second.alias).toBe(first.alias);
    // No new credentials minted — nothing to hand over.
    expect(second.password).toBeUndefined();
  });

  test('existing node without alias gets credentials created (created:false)', async () => {
    const node = await accounts.create({
      type: 'agent',
      parentId: null,
      expertId: null,
      name: 'Pre Existing',
      email: 'pre@example.com',
      telegramId: asTelegramUserId('424242'),
      oidcSubject: 'sub-003',
      railPreference: 'paypal',
      cutPercentage: 0,
      status: 'active',
    });

    const result = await jitProvision(identity, accounts, {
      sub: 'sub-003',
      email: 'pre@example.com',
    });

    expect(result.created).toBe(false);
    expect(result.nodeId).toBe(node.id);
    expect(result.alias).toBe('pre');
    expect(result.password).toBeDefined();

    const login = await identity.login(result.alias!, result.password!);
    expect(identity.resolveSession(login.token)).not.toBeNull();
  });

  test('audits jit_provision with sub, email, created', async () => {
    const profile: OidcProfile = { sub: 'sub-004', email: 'hopper@example.com' };
    const result = await jitProvision(identity, accounts, profile);

    const audit = identity.auditFor(result.nodeId, { action: 'jit_provision' });
    expect(audit.length).toBe(1);
    expect(audit[0]!.details).toMatchObject({
      sub: 'sub-004',
      email: 'hopper@example.com',
      created: true,
    });
  });

  test('slug dedup: two profiles sharing an email local-part get distinct aliases', async () => {
    const a = await jitProvision(identity, accounts, { sub: 'sub-005', email: 'sam@a.example.com' });
    const b = await jitProvision(identity, accounts, { sub: 'sub-006', email: 'sam@b.example.com' });

    expect(a.alias).toBe('sam');
    expect(b.alias).toBe('sam-2');
    expect(a.nodeId).not.toBe(b.nodeId);

    // Both passwords actually log in.
    expect(
      identity.resolveSession((await identity.login(a.alias!, a.password!)).token)
    ).not.toBeNull();
    expect(
      identity.resolveSession((await identity.login(b.alias!, b.password!)).token)
    ).not.toBeNull();
  });
});
