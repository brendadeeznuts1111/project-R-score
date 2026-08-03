// @see https://bun.com/docs/test — bun:test
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  appendHistory,
  emptyLifecycleStore,
  insertConceptIntoVocabulary,
  insertConceptIntoVocabularySource,
  loadLifecycleStore,
  saveLifecycleStore,
  setConceptLifecycleInVocabulary,
  setConceptLifecycleInVocabularySource,
  validateDeprecation,
  validateProposal,
  vocabularyEntryFromProposal,
  type ConceptLifecycleStore,
  type ConceptProposal,
} from '../lib/portal/concept-lifecycle.ts';
import { PORTAL_SEMANTIC_CONCEPTS, conceptStatusOf } from '../lib/portal/semantic-vocabulary.ts';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fw-concept-lifecycle-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const VOCAB_FIXTURE = `export const CONCEPTS = [
  {
    id: 'ui.semantic.surface',
    namespace: 'ui',
    domain: 'portal',
    label: 'Surface',
    description: 'Named portal surface.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['surface'],
    seeAlso: [],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.metric.raises',
    namespace: 'ops',
    domain: 'operations',
    label: 'Raises',
    description: 'Limit raises.',
    semanticType: 'state',
    uiRole: 'token',
    synonyms: [],
    seeAlso: [],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
] as const satisfies readonly PortalSemanticConceptDef[];
`;

async function writeFixture(name = 'vocab.ts'): Promise<string> {
  const path = join(dir, name);
  await Bun.write(path, VOCAB_FIXTURE);
  return path;
}

function makeProposal(overrides: Partial<ConceptProposal> = {}): ConceptProposal {
  return {
    id: 'ops.metric.example',
    label: 'Example',
    description: 'Example concept.',
    category: 'ops',
    group: 'ops.metric',
    domain: 'ops',
    unit: 'usd',
    color: 'infoBlue',
    semanticType: 'state',
    uiRole: 'token',
    correlationId: 'PR#999',
    status: 'pending',
    proposedBy: 'agent',
    proposedAt: '2026-08-03T00:00:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
    ...overrides,
  };
}

describe('concept-lifecycle · validateProposal', () => {
  test('rejects bad id format', () => {
    const errors = validateProposal(
      { id: 'Ops.Metric.Bad', label: 'x', description: 'y', domain: 'ops' },
      undefined,
      []
    );
    expect(errors.some(e => e.includes('invalid id'))).toBe(true);
  });

  test('rejects id already in the vocabulary', () => {
    const existing = PORTAL_SEMANTIC_CONCEPTS[0]!.id;
    const errors = validateProposal({ id: existing, label: 'x', description: 'y', domain: existing.split('.')[0] });
    expect(errors).toContain(`id "${existing}" already exists in the portal semantic vocabulary`);
  });

  test('rejects domain / id-namespace mismatch', () => {
    const errors = validateProposal(
      { id: 'ops.metric.new_one', label: 'x', description: 'y', domain: 'ui' },
      undefined,
      []
    );
    expect(errors.some(e => e.includes('does not match id namespace'))).toBe(true);
  });

  test('rejects duplicate pending proposal and missing label/description', () => {
    const store = emptyLifecycleStore();
    store.proposals.push(makeProposal());
    const errors = validateProposal(
      { id: 'ops.metric.example', domain: 'ops' },
      store,
      []
    );
    expect(errors.some(e => e.includes('pending proposal'))).toBe(true);
    expect(errors).toContain('missing required --label');
    expect(errors).toContain('missing required --summary/--description');
  });

  test('accepts a valid proposal', () => {
    const errors = validateProposal(
      { id: 'ops.metric.new_one', label: 'New one', description: 'y', domain: 'ops' },
      emptyLifecycleStore(),
      []
    );
    expect(errors).toEqual([]);
  });
});

describe('concept-lifecycle · store', () => {
  test('load returns empty store for a missing file', async () => {
    const store = await loadLifecycleStore(join(dir, 'missing.json'));
    expect(store).toEqual({ version: 1, proposals: [], history: [] });
  });

  test('save/load roundtrip', async () => {
    const path = join(dir, 'store.json');
    let store = emptyLifecycleStore();
    store.proposals.push(makeProposal());
    store = appendHistory(store, {
      at: '2026-08-03T00:00:00.000Z',
      action: 'propose',
      id: 'ops.metric.example',
      actor: 'cli',
      reason: null,
      replaceBy: null,
    });
    await saveLifecycleStore(store, path);
    const loaded = await loadLifecycleStore(path);
    expect(loaded).toEqual(store);
  });

  test('appendHistory is pure (input store untouched)', () => {
    const store = emptyLifecycleStore();
    const next = appendHistory(store, {
      at: '2026-08-03T00:00:00.000Z',
      action: 'approve',
      id: 'ops.metric.example',
      actor: 'cli',
    });
    expect(store.history).toEqual([]);
    expect(next.history).toHaveLength(1);
    expect(next).not.toBe(store);
  });
});

describe('concept-lifecycle · vocabulary source edits', () => {
  test('insertConceptIntoVocabulary inserts before the close marker', async () => {
    const path = await writeFixture();
    const proposal = makeProposal();
    await insertConceptIntoVocabulary(
      vocabularyEntryFromProposal(proposal, { addedAt: '2026-08-03' }),
      path
    );
    const src = await Bun.file(path).text();
    expect(src).toContain("id: 'ops.metric.example',");
    expect(src).toContain("namespace: 'ops',");
    expect(src).toContain("domain: 'operations',");
    expect(src).toContain("correlationId: 'PR#999',");
    expect(src).toContain("addedAt: '2026-08-03',");
    // Inserted before the closing marker, after the last existing entry.
    const insertAt = src.indexOf("id: 'ops.metric.example',");
    const closeAt = src.indexOf('] as const satisfies');
    expect(insertAt).toBeGreaterThan(-1);
    expect(insertAt).toBeLessThan(closeAt);
  });

  test('insertConceptIntoVocabularySource rejects duplicates', () => {
    expect(() =>
      insertConceptIntoVocabularySource(VOCAB_FIXTURE, {
        id: 'ui.semantic.surface',
        label: 'Dup',
        description: 'dup',
        semanticType: 'state',
        uiRole: 'token',
        namespace: 'ui',
      })
    ).toThrow('already present');
  });

  test('vocabularyEntryFromProposal falls back for unknown type/role', () => {
    const entry = vocabularyEntryFromProposal(
      makeProposal({ semanticType: 'bogus', uiRole: 'bogus' })
    );
    expect(entry.semanticType).toBe('state');
    expect(entry.uiRole).toBe('token');
  });

  test('setConceptLifecycleInVocabulary patches the matching block only', async () => {
    const path = await writeFixture();
    await setConceptLifecycleInVocabulary(
      'ops.metric.raises',
      { status: 'deprecated', replacedBy: 'ui.semantic.surface', deprecatedAt: '2026-08-03' },
      path
    );
    const src = await Bun.file(path).text();
    expect(src).toContain("status: 'deprecated',");
    expect(src).toContain("replacedBy: 'ui.semantic.surface',");
    expect(src).toContain("deprecatedAt: '2026-08-03',");
    // Patch landed inside the raises block, not the surface block.
    const raisesAt = src.indexOf("id: 'ops.metric.raises',");
    const statusAt = src.indexOf("status: 'deprecated',");
    const closeAt = src.indexOf('] as const satisfies');
    expect(statusAt).toBeGreaterThan(raisesAt);
    expect(statusAt).toBeLessThan(closeAt);
    expect(src.indexOf("id: 'ui.semantic.surface',")).toBeLessThan(raisesAt);

    // Re-patch updates in place rather than duplicating lines.
    const again = setConceptLifecycleInVocabularySource(src, 'ops.metric.raises', {
      status: 'archived',
      deprecatedAt: '2026-08-04',
    });
    expect(again.match(/status: 'archived',/g)).toHaveLength(1);
    expect(again).not.toContain("status: 'deprecated',");
    expect(again).toContain("deprecatedAt: '2026-08-04',");
  });

  test('setConceptLifecycleInVocabularySource throws for unknown id', () => {
    expect(() =>
      setConceptLifecycleInVocabularySource(VOCAB_FIXTURE, 'ops.metric.nope', { status: 'archived' })
    ).toThrow('not found');
  });
});

describe('concept-lifecycle · validateDeprecation', () => {
  const concepts = [
    { id: 'ops.metric.old', status: 'active' as const },
    { id: 'ops.metric.new', status: 'active' as const },
    { id: 'ops.metric.gone', status: 'deprecated' as const },
  ];

  test('rejects unknown id and unknown replacement', () => {
    expect(validateDeprecation('ops.metric.nope', 'ops.metric.new', concepts)).toContain(
      'unknown concept id "ops.metric.nope"'
    );
    expect(validateDeprecation('ops.metric.old', 'ops.metric.nope', concepts)).toContain(
      'unknown replacement id "ops.metric.nope"'
    );
  });

  test('rejects a deprecated replacement and self-replacement', () => {
    expect(
      validateDeprecation('ops.metric.old', 'ops.metric.gone', concepts).some(e =>
        e.includes('pick an active concept')
      )
    ).toBe(true);
    expect(validateDeprecation('ops.metric.old', 'ops.metric.old', concepts)).toContain(
      'a concept cannot replace itself'
    );
  });

  test('accepts a valid deprecation', () => {
    expect(validateDeprecation('ops.metric.old', 'ops.metric.new', concepts)).toEqual([]);
  });
});

describe('concept-lifecycle · vocabulary helpers', () => {
  test('conceptStatusOf defaults to active', () => {
    expect(conceptStatusOf({})).toBe('active');
    expect(conceptStatusOf({ status: 'deprecated' })).toBe('deprecated');
    expect(conceptStatusOf(PORTAL_SEMANTIC_CONCEPTS[0]!)).toBe('active');
  });
});
