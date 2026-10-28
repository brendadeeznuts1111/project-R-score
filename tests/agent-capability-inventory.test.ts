import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';

import {
  PRELOAD_CONCEPTS,
  RUNTIME_PRELOAD_DECLARATIONS,
  agentInventoryIssues,
  calculateAgentInventoryRatchets,
  expectedAgentInventoryRatchets,
  readAgentEntrypointInventory,
} from '../lib/agents/agent-inventory.ts';

const ROOT = resolve(import.meta.dir, '..');

describe('agent and preload inventory ratchet', () => {
  test('keeps all four preload meanings separate and promotes no runtime module', () => {
    expect(PRELOAD_CONCEPTS.map(item => item.id)).toEqual([
      'test-runner-preload',
      'runtime-module-preload',
      'fetch-preconnect',
      'browser-resource-preload',
    ]);
    expect(RUNTIME_PRELOAD_DECLARATIONS).toEqual([]);
  });

  test('ratchets MCP, skill, agent/tool, and browser entrypoints deterministically', async () => {
    const inventory = await readAgentEntrypointInventory(ROOT);
    expect(inventory.mcpServers).toContain('bun-docs');
    expect(inventory.skills).toContain('project-r-agent-team');
    expect(inventory.agentAndMcpTools).toContain('tools/operator-agent.ts');
    expect(calculateAgentInventoryRatchets(inventory)).toEqual(expectedAgentInventoryRatchets());
    expect(await agentInventoryIssues(ROOT)).toEqual([]);
  });
});
