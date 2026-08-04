import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  conceptsStateMatches,
  persistConceptsState,
  type ConceptsState,
} from '../scripts/bake-concepts.ts';

const ROOT = `${import.meta.dir}/..`;

describe('domain → concept → shape → surface authority', () => {
  test('agent and lifecycle entrypoints link the canonical model', async () => {
    const references = await Promise.all(
      [
        'AGENTS.md',
        'docs/AGENTS.md',
        'docs/CONCEPT_LIFECYCLE.md',
        '.agents/skills/references/agent-tooling.md',
      ].map(path => Bun.file(`${ROOT}/${path}`).text())
    );

    for (const reference of references) {
      expect(reference).toContain('DOMAIN_CONCEPT_SHAPE.md');
    }
  });

  test('canonical model names every layer and its source authority', async () => {
    const model = await Bun.file(`${ROOT}/docs/DOMAIN_CONCEPT_SHAPE.md`).text();
    for (const layer of ['Domain', 'Concept', 'Shape', 'Surface']) {
      expect(model).toContain(`**${layer}**`);
    }
    expect(model).toContain('lib/portal/concept-domains.ts');
    expect(model).toContain('lib/portal/semantic-vocabulary.ts');
    expect(model).toContain('docs/WIRE_BOUNDARY.md');
    expect(model).toContain('validate:surface-coverage');
  });

  test('live concepts board exposes the same ordered operator model', async () => {
    const board = await Bun.file(`${ROOT}/public/portal/concepts/index.html`).text();
    const steps = ['domain', 'concept', 'shape', 'surface'].map(step =>
      board.indexOf(`data-model-step="${step}"`)
    );
    expect(steps.every(index => index >= 0)).toBe(true);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(board).toContain(
      'github.com/brendadeeznuts1111/project-R-score/blob/main/docs/DOMAIN_CONCEPT_SHAPE.md'
    );
  });

  test('concept bake check is timestamp-insensitive and non-mutating', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'concept-state-check-'));
    const outPath = join(directory, 'concepts-state.json');
    const current = (await Bun.file(`${ROOT}/public/registry/concepts-state.json`).json()) as ConceptsState;
    const candidate = structuredClone(current);
    candidate.bakedAt = '2099-01-01T00:00:00.000Z';

    try {
      const original = `${JSON.stringify(current, null, 2)}\n`;
      await Bun.write(outPath, original);
      expect(conceptsStateMatches(current, candidate)).toBe(true);
      expect(await persistConceptsState(candidate, { check: true, outPath })).toBe('current');
      expect(await Bun.file(outPath).text()).toBe(original);

      candidate.summary.totalPortal += 1;
      expect(conceptsStateMatches(current, candidate)).toBe(false);
      await expect(persistConceptsState(candidate, { check: true, outPath })).rejects.toThrow(
        'concepts-state.json is stale'
      );
      expect(await Bun.file(outPath).text()).toBe(original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
