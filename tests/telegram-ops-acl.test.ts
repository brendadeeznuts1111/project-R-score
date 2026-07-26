import { describe, expect, test } from 'bun:test';
import {
  gateFactoryCommand,
  requireOpsAdmin,
  requirePrivateChat,
} from '../lib/telegram/ops-acl.ts';

describe('telegram ops ACL', () => {
  test('/register is DM-only', () => {
    expect(requirePrivateChat('/register', 'private').ok).toBe(true);
    expect(requirePrivateChat('/register', 'supergroup').ok).toBe(false);
    expect(requirePrivateChat('/status', 'supergroup').ok).toBe(true);
  });

  test('/deploy requires portal admin or OPS_ADMIN_USER_IDS', () => {
    expect(
      requireOpsAdmin({
        command: '/deploy',
        telegramUserId: 1,
        portalRole: 'admin',
        adminUserIds: [],
      }).ok
    ).toBe(true);

    expect(
      requireOpsAdmin({
        command: '/deploy',
        telegramUserId: 8013171035,
        portalRole: 'viewer',
        adminUserIds: [8013171035],
      }).ok
    ).toBe(true);

    expect(
      requireOpsAdmin({
        command: '/deploy',
        telegramUserId: 99,
        portalRole: 'viewer',
        adminUserIds: [8013171035],
      }).ok
    ).toBe(false);

    expect(
      requireOpsAdmin({
        command: '/deploy',
        telegramUserId: 99,
        adminUserIds: [],
      }).ok
    ).toBe(false);
  });

  test('gateFactoryCommand combines private + admin', () => {
    const denied = gateFactoryCommand({
      command: '/register',
      chatType: 'group',
      telegramUserId: 1,
    });
    expect(denied.ok).toBe(false);

    const deployOk = gateFactoryCommand({
      command: '/deploy',
      chatType: 'private',
      telegramUserId: 7,
      portalRole: 'admin',
    });
    expect(deployOk.ok).toBe(true);
  });
});
