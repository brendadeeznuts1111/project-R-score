import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountSystem } from '../lib/accounts/accounts.ts';
import { IdentitySystem } from '../lib/identity/identity.ts';
import { jitProvision } from '../lib/identity/jit.ts';
import { asTelegramUserId } from '../lib/types/branded.ts';

describe('identity-jit', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let accounts: AccountSystem;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'id-jit-'));
    dbPath = join(dir, 'accounts.db');
    identity = new IdentitySystem(undefined, dbPath);
    accounts = new AccountSystem(undefined, dbPath);
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('jitProvision creates agent node, alias, and audits jit_provision', async () => {
    const result = await jitProvision(identity, accounts, {
      sub: 'oidc-sub-001',
      email: 'agent@example.com',
      name: 'Agent One',
    });

    expect(result.created).toBe(true);
    expect(result.alias).toBeDefined();
    expect(result.password?.length).toBeGreaterThanOrEqual(8);

    const node = accounts.getByOidcSubject('oidc-sub-001');
    expect(node?.telegramId).toBe(asTelegramUserId('oidc:oidc-sub-001'));

    const audit = identity.auditFor(result.nodeId, { action: 'jit_provision', limit: 1 });
    expect(audit[0]?.details?.created).toBe(true);
  });

  test('jitProvision on existing subject ensures alias without recreating node', async () => {
    const first = await jitProvision(identity, accounts, {
      sub: 'oidc-sub-dup',
      email: 'dup@example.com',
    });
    const second = await jitProvision(identity, accounts, {
      sub: 'oidc-sub-dup',
      email: 'dup@example.com',
    });

    expect(second.created).toBe(false);
    expect(second.nodeId).toBe(first.nodeId);
    expect(second.password).toBeUndefined();
  });
});
