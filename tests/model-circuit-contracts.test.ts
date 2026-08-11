// @see https://bun.com/docs/test/snapshots — reviewed contract snapshots
import { describe, expect, test } from 'bun:test';
import {
  attachMlPredictions,
  buildCircuitModelInput,
  buildModelDiagnostics,
  type EdgeOpportunity,
} from '../lib/operator-research/edge-engine.ts';
import {
  EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES,
  MODEL_CONTRACT_FILES,
  MODEL_HARNESS_FLAGS,
  MODEL_PATTERN_TYPES,
  MODEL_PROPERTY_CONTRACTS,
  MODEL_WEIGHT_INPUTS,
  groupModelProperties,
  parseModelHarnessConfig,
  renderModelContractFilesMarkdown,
  type ModelPatternType,
} from '../lib/operator-research/model-contracts.ts';
import { asEdgeId, asEventId, asSportsbookId } from '../lib/types/branded.ts';

function edge(overrides: Partial<EdgeOpportunity> = {}): EdgeOpportunity {
  return {
    id: asEdgeId('contract-edge'),
    event_id: asEventId('contract-event'),
    sport: 'basketball',
    league: 'NBA',
    home: 'A',
    away: 'B',
    market: 'moneyline_home',
    type: 'value',
    edge_percent: 8,
    expected_value: 8,
    confidence: 0.74,
    kelly_fraction: 0.04,
    stake_suggestion: 20,
    bookmakers: ['soft', 'sharp'],
    bookmaker_ids: [asSportsbookId('soft'), asSportsbookId('sharp')],
    odds: { book1: '2.20', book2: '1.90' },
    latency_ms: { book1: 80, book2: 60 },
    latency_adjusted: false,
    liquidity_tiers: ['medium', 'high'],
    timestamp: 1_700_000_000_000,
    intake: { source: 'live', circuitVerified: true },
    ...overrides,
  };
}

describe('model circuit contracts', () => {
  test('pattern type is a closed runtime and compile-time contract', () => {
    const patterns = [...MODEL_PATTERN_TYPES] satisfies ModelPatternType[];
    expect(patterns).toEqual(['arbitrage', 'value', 'steam', 'spike', 'drift', 'reversal']);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  test('properties are unique, package/group owned, and only circuit features affect weights', () => {
    type MissingEdgeProperty = Exclude<
      keyof EdgeOpportunity,
      (typeof EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES)[number]
    >;
    type UnknownEdgeProperty = Exclude<
      (typeof EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES)[number],
      keyof EdgeOpportunity
    >;
    const allEdgePropertiesCovered: MissingEdgeProperty extends never ? true : false = true;
    const noUnknownEdgeProperties: UnknownEdgeProperty extends never ? true : false = true;
    const keys = MODEL_PROPERTY_CONTRACTS.map(p => `${p.package}:${p.group}:${p.property}`);
    expect(allEdgePropertiesCovered).toBe(true);
    expect(noUnknownEdgeProperties).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    const catalogRoots = [
      ...new Set(MODEL_PROPERTY_CONTRACTS.map(p => p.property.split('.')[0])),
    ];
    expect(catalogRoots).toEqual(expect.arrayContaining(EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES));
    const edgeRoots = new Set<string>(EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES);
    expect(catalogRoots.filter(root => !edgeRoots.has(root)).sort()).toEqual(['flags', 'pattern']);
    expect(MODEL_PROPERTY_CONTRACTS.every(p => p.package && p.group && p.type)).toBe(true);
    expect(MODEL_PROPERTY_CONTRACTS.filter(p => p.affectsWeights)).toEqual(
      MODEL_PROPERTY_CONTRACTS.filter(p => p.role === 'feature' && p.source === 'circuit')
    );
    expect(MODEL_WEIGHT_INPUTS.some(input => /latency|timestamp|environment/i.test(input))).toBe(
      false
    );
  });

  test('locked flags reject omissions, unknowns, and noise authorization', async () => {
    const config = await Bun.file('config/operator-research/model-harness.toml').text();
    expect(parseModelHarnessConfig(config)).toEqual(MODEL_HARNESS_FLAGS);
    expect(() => parseModelHarnessConfig(config.replace('circuitOnlyWeights = true', ''))).toThrow();
    expect(() =>
      parseModelHarnessConfig(config.replace('latencyDiagnosticsOnly = true', 'latencyDiagnosticsOnly = false'))
    ).toThrow('latencyDiagnosticsOnly is locked true');
    expect(() => parseModelHarnessConfig(`${config}\nallowNoise = true\n`)).toThrow();
  });

  test('transport and environment noise cannot change model output', () => {
    const fast = edge();
    const noisy = edge({
      sport: 'noise-sport',
      league: 'noise-league',
      home: 'noise-home',
      away: 'noise-away',
      confidence: 0.12,
      bookmakers: ['noise-a', 'noise-b'],
      bookmaker_ids: [asSportsbookId('noise-a'), asSportsbookId('noise-b')],
      latency_ms: { book1: 9_999, book2: 8_888 },
      latency_adjusted: true,
      liquidity_tiers: ['unknown', 'unknown'],
      timestamp: 1_900_000_000_000,
    });
    expect(buildCircuitModelInput(noisy)).toEqual(buildCircuitModelInput(fast));
    expect(buildModelDiagnostics(noisy)).not.toEqual(buildModelDiagnostics(fast));
    expect(attachMlPredictions([noisy])[0]!.ml).toEqual(attachMlPredictions([fast])[0]!.ml);
  });

  test('malformed circuit numbers fail closed and supplied annotations are recomputed', () => {
    expect(() => buildCircuitModelInput(edge({ odds: { book1: 'NaN', book2: '1.90' } }))).toThrow(
      'book1 must be finite'
    );
    const supplied = edge({
      ml: {
        predicted_prob: 0.9999,
        confidence: 0.999,
        model: 'XGBoost',
        feature_contract: 'circuit-v1',
        weight_eligible: true,
        weight_inputs: ['latency_ms'],
      },
    });
    const recomputed = attachMlPredictions([supplied])[0]!.ml!;
    expect(recomputed.predicted_prob).not.toBe(0.9999);
    expect(recomputed.weight_inputs).toEqual(MODEL_WEIGHT_INPUTS);
    expect(recomputed.weight_inputs).not.toContain('latency_ms');
  });

  test('only verified live circuit intake is weight eligible', () => {
    const live = attachMlPredictions([edge()])[0]!.ml!;
    const fixture = attachMlPredictions([
      edge({ intake: { source: 'fixture', circuitVerified: true } }),
    ])[0]!.ml!;
    const synthetic = attachMlPredictions([
      edge({ intake: { source: 'synthetic', circuitVerified: false } }),
    ])[0]!.ml!;
    expect(live.weight_eligible).toBe(true);
    expect(fixture.weight_eligible).toBe(false);
    expect(synthetic.weight_eligible).toBe(false);
  });

  test('files.md exactly matches the tracked accountability boundary', async () => {
    for (const file of MODEL_CONTRACT_FILES) expect(await Bun.file(file).exists()).toBe(true);
    expect(await Bun.file('lib/operator-research/files.md').text()).toBe(
      renderModelContractFilesMarkdown()
    );
  });

  test('package, group, property, pattern, flag, and file contracts match snapshot', () => {
    expect({
      schemaVersion: 1,
      edgeOpportunityProperties: EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES,
      patterns: MODEL_PATTERN_TYPES,
      flags: MODEL_HARNESS_FLAGS,
      weightInputs: MODEL_WEIGHT_INPUTS,
      packages: groupModelProperties(),
      files: MODEL_CONTRACT_FILES,
    }).toMatchSnapshot();
  });
});
