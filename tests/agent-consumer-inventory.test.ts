import { describe, expect, test } from 'bun:test';

import {
  agentConsumerInventoryIssues,
  calculateAgentConsumerRatchet,
  expectedAgentConsumerRatchet,
  readAgentExecutableEntrypoints,
  summarizeAgentConsumers,
} from '../lib/agents/agent-consumer-inventory.ts';
import { resolvePath } from '../lib/path-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('agent executable consumer inventory', () => {
  test('classifies every discovered executable exactly once in both directions', async () => {
    const rows = await readAgentExecutableEntrypoints(ROOT);
    const ids = rows.map(row => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(rows.every(row => row.owner.length > 0 && row.source.length > 0)).toBeTrue();
    expect(
      rows.every(
        row =>
          row.authority.profile.length > 0 &&
          row.authority.executable.length > 0 &&
          row.authority.args.length > 0 &&
          row.authority.cwd.length > 0 &&
          row.authority.environment.length > 0 &&
          row.authority.stdio.length > 0 &&
          row.authority.network.length > 0 &&
          row.authority.offline.length > 0 &&
          row.authority.flagPassthrough.length > 0
      )
    ).toBeTrue();
    expect(calculateAgentConsumerRatchet(rows)).toEqual(expectedAgentConsumerRatchet());
    expect(await agentConsumerInventoryIssues(ROOT)).toEqual([]);
  });

  test('records the migrated registry smoke as authorized and reports remaining debt', async () => {
    const rows = await readAgentExecutableEntrypoints(ROOT);
    const smoke = rows.find(
      row => row.id === 'agent-tool:scripts/agent-registry-live-smoke.ts'
    );
    expect(smoke).toMatchObject({
      effects: ['network', 'registry'],
      enforcement: 'authorized',
    });
    const summary = summarizeAgentConsumers(rows);
    expect(summary.authorized).toBeGreaterThan(0);
    expect(summary.unowned).toBeGreaterThan(0);
    expect(
      rows.filter(row => row.enforcement === 'authorized').every(row => row.authority.defaultDeny)
    ).toBeTrue();
    expect(
      rows.filter(row => row.enforcement === 'unowned').every(row => !row.authority.defaultDeny)
    ).toBeTrue();
  });
});
