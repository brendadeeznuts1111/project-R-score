import { describe, expect, test } from 'bun:test';
import type { KnownChatRow } from '../lib/telegram/known-chats.ts';
import {
  buildSurfaceGraph,
  formatSurfaceGraphAscii,
  formatSurfaceGraphMermaid,
  suggestTelegramSurfacesMap,
} from '../lib/telegram/surface-graph.ts';
import type { PackageGroupRegistryRow } from '../lib/telegram/package-group-registry.ts';

function chat(partial: Partial<KnownChatRow> & { chatId: string }): KnownChatRow { // brand-ok — test fixture wire id
  return {
    chatType: 'supergroup',
    title: null,
    username: null,
    firstName: null,
    lastName: null,
    isForum: true,
    botStatus: 'administrator',
    memberCount: 2,
    surfaceSlug: null,
    source: 'manual',
    tenantSlug: 'factory',
    firstSeenAt: '2026-07-26T00:00:00.000Z',
    lastSeenAt: '2026-07-26T00:00:00.000Z',
    active: true,
    ...partial,
  };
}

describe('surface graph', () => {
  const known: KnownChatRow[] = [
    chat({
      chatId: '-1003937534779',
      title: 'TOC Ops · ASH · staging',
      surfaceSlug: 'ash-staging',
    }),
    chat({
      chatId: '-1004400413853',
      title: 'TOC Ops · sandbox',
      surfaceSlug: 'sandbox',
    }),
    chat({
      chatId: '8013171035',
      chatType: 'private',
      username: 'billabongwanger',
      firstName: 'Ash',
      isForum: false,
      surfaceSlug: null,
    }),
  ];

  test('suggests TELEGRAM_SURFACES from known surface_slug', () => {
    expect(
      suggestTelegramSurfacesMap({
        knownChats: known,
        env: {},
      })
    ).toEqual({
      'ash-staging': '-1003937534779',
      sandbox: '-1004400413853',
    });
  });

  test('merges package_group_registry into suggested surfaces', () => {
    const packageGroups: PackageGroupRegistryRow[] = [
      {
        partnerCode: 'BIL',
        chatId: '-1004396694559',
        inviteLink: null,
        title: 'TOC Ops · BIL · Billy Ops',
        requestedBy: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        linkedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const suggested = suggestTelegramSurfacesMap({
      knownChats: known,
      env: {},
      packageGroups,
    });
    expect(suggested['pkg-bil']).toBe('-1004396694559');
    expect(suggested['ash-staging']).toBe('-1003937534779');
  });

  test('buildSurfaceGraph marks live + missing HQ', () => {
    const model = buildSurfaceGraph({
      knownChats: known,
      env: { TELEGRAM_OPS_CHAT_ID: '-1003937534779' },
    });
    expect(model.bindings.find(b => b.slug === 'ash-staging')?.status).toBe('live');
    expect(model.bindings.find(b => b.slug === 'sandbox')?.status).toBe('live');
    expect(model.bindings.find(b => b.slug === 'hq')?.status).toBe('missing');
    expect(model.bindings.find(b => b.slug === 'ash-staging')?.isOpsHub).toBe(true);
    expect(model.privateChats).toHaveLength(1);
    expect(model.suggestedSurfacesJson).toContain('ash-staging');
    expect(model.gaps.some(g => g.includes('hq unbound'))).toBe(true);
  });

  test('mermaid + ascii mention surfaces and routes', () => {
    const model = buildSurfaceGraph({
      knownChats: known,
      env: { TELEGRAM_OPS_CHAT_ID: '-1003937534779' },
    });
    const m = formatSurfaceGraphMermaid(model);
    expect(m).toContain('flowchart TB');
    expect(m).toContain('ash-staging');
    expect(m).toContain('plays');
    const ascii = formatSurfaceGraphAscii(model).join('\n');
    expect(ascii).toContain('OPS_HUB');
    expect(ascii).toContain('TELEGRAM_SURFACES=');
  });
});
