// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { emptyLifecycleStore } from '../lib/portal/concept-lifecycle.ts';
import {
  autoProposeCandidates,
  discoverConceptCandidates,
} from '../scripts/concept-discover.ts';

const dirs: string[] = [];

async function fixtureDir(files: Record<string, string>): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'concept-discover-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    await Bun.write(join(dir, name), content);
  }
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('concept:discover', () => {
  test('finds unknown refs from attrs, hrefs, and quoted ids', async () => {
    const dir = await fixtureDir({
      'board.html':
        '<span data-glossary-concept="ops.metric.brand_new"></span><a href="#glossary:ui.fresh_widget">x</a>',
      'map.js': "const m = { a: 'ops.metric.also_new', known: 'ui.semantic.surface' };",
      'noise.ts': 'const s = "hello world"; const u = "not-a-concept";',
    });
    const candidates = await discoverConceptCandidates([dir], new Set(['ui.semantic.surface']));
    const ids = candidates.map(c => c.id);
    expect(ids).toContain('ops.metric.brand_new');
    expect(ids).toContain('ui.fresh_widget');
    expect(ids).toContain('ops.metric.also_new');
    expect(ids).not.toContain('ui.semantic.surface');
    expect(candidates.find(c => c.id === 'ops.metric.brand_new')?.files[0]).toContain('board.html');
  });

  test('auto-propose queues valid candidates and skips unknown namespaces', () => {
    const store = emptyLifecycleStore();
    const result = autoProposeCandidates(
      [
        { id: 'ops.metric.new_thing', files: ['a.html'], namespace: 'ops' },
        { id: 'tournament.setka_cup_ua_w', files: ['feed.html'], namespace: null },
      ],
      store,
      { now: '2026-08-03T00:00:00.000Z' }
    );
    expect(result.proposed).toEqual(['ops.metric.new_thing']);
    expect(result.skipped).toEqual([
      { id: 'tournament.setka_cup_ua_w', reason: 'unknown namespace (expected api · ops · page · section · ui)' },
    ]);
    const proposal = result.store.proposals[0]!;
    expect(proposal.status).toBe('pending');
    expect(proposal.domain).toBe('ops');
    expect(proposal.correlationId).toBe('concept-discover');
    expect(result.store.history.at(-1)).toMatchObject({ action: 'propose', id: 'ops.metric.new_thing' });
  });

  test('auto-propose skips duplicates already pending in the store', () => {
    const store = emptyLifecycleStore();
    const first = autoProposeCandidates(
      [{ id: 'ops.metric.dup', files: ['a.html'], namespace: 'ops' }],
      store
    );
    const second = autoProposeCandidates(
      [{ id: 'ops.metric.dup', files: ['b.html'], namespace: 'ops' }],
      first.store
    );
    expect(second.proposed).toEqual([]);
    expect(second.skipped[0]?.reason).toContain('pending proposal');
    expect(second.store.proposals).toHaveLength(1);
  });
});
