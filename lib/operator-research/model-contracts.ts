// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
/**
 * Model intake and feature accountability for operator research.
 *
 * The circuit owner module is the only module allowed to provide weight inputs.
 * Transport, environment, identity, presentation, and synthetic provenance are
 * retained as diagnostics but are never model features.
 */
import { EDGE_TYPES, type EdgeType } from './alert-vocabulary.ts';
import { MODEL_CONTRACT_PACKAGE } from './model-contract-files.ts';

/** @deprecated Compatibility alias: model circuit classification is exactly EdgeType. */
export const MODEL_PATTERN_TYPES = EDGE_TYPES;
/** @deprecated Use EdgeType from alert-vocabulary.ts. */
export type ModelPatternType = EdgeType;

export const MODEL_HARNESS_FLAGS = {
  circuitOnlyWeights: true,
  latencyDiagnosticsOnly: true,
  environmentDiagnosticsOnly: true,
  rejectSyntheticWeightUpdates: true,
  snapshotContracts: true,
} as const;

export type ModelHarnessFlag = keyof typeof MODEL_HARNESS_FLAGS;

export type ModelContractPackage = typeof MODEL_CONTRACT_PACKAGE;

export type ModelOwnerModule =
  | 'operator-research/intake'
  | 'operator-research/circuit'
  | 'operator-research/models'
  | 'operator-research/diagnostics'
  | 'operator-research/controls';

export type ModelAggregate =
  'edge-opportunity' | 'circuit-input' | 'model-output' | 'diagnostics' | 'harness-control';

export type ModelPropertyGroup =
  | 'identity'
  | 'provenance'
  | 'market'
  | 'movement'
  | 'risk'
  | 'prediction'
  | 'transport'
  | 'environment'
  | 'flags';

export type ModelPropertyRole = 'feature' | 'output' | 'diagnostic' | 'control';
export type ModelPropertySource = 'circuit' | 'derived' | 'transport' | 'environment';

export type ModelPropertyContract = {
  package: ModelContractPackage;
  ownerModule: ModelOwnerModule;
  aggregate: ModelAggregate;
  group: ModelPropertyGroup;
  property: string;
  type: string;
  role: ModelPropertyRole;
  source: ModelPropertySource;
  required: boolean;
  affectsWeights: boolean;
};

export const EDGE_OPPORTUNITY_TOP_LEVEL_PROPERTIES = [
  'id',
  'event_id',
  'sport',
  'league',
  'home',
  'away',
  'market',
  'type',
  'edge_percent',
  'expected_value',
  'confidence',
  'kelly_fraction',
  'stake_suggestion',
  'bookmakers',
  'bookmaker_ids',
  'odds',
  'latency_ms',
  'latency_adjusted',
  'liquidity_tiers',
  'timestamp',
  'intake',
  'ml',
] as const;

const property = (
  aggregate: ModelAggregate,
  contract: Omit<ModelPropertyContract, 'package' | 'aggregate' | 'affectsWeights'>
): ModelPropertyContract => ({
  package: MODEL_CONTRACT_PACKAGE,
  aggregate,
  ...contract,
  affectsWeights:
    aggregate === 'circuit-input' && contract.role === 'feature' && contract.source === 'circuit',
});

type PropertyInput = Omit<ModelPropertyContract, 'package' | 'aggregate' | 'affectsWeights'>;
const edgeProperty = (contract: PropertyInput) => property('edge-opportunity', contract);
const circuitProperty = (contract: PropertyInput) => property('circuit-input', contract);
const modelOutputProperty = (contract: PropertyInput) => property('model-output', contract);
const diagnosticProperty = (contract: PropertyInput) => property('diagnostics', contract);
const harnessProperty = (contract: PropertyInput) => property('harness-control', contract);

export const MODEL_PROPERTY_CONTRACTS: readonly ModelPropertyContract[] = [
  edgeProperty({
    ownerModule: 'operator-research/intake',
    group: 'identity',
    property: 'id',
    type: 'EdgeId',
    role: 'diagnostic',
    source: 'derived',
    required: true,
  }),
  edgeProperty({
    ownerModule: 'operator-research/intake',
    group: 'identity',
    property: 'event_id',
    type: 'EventId',
    role: 'diagnostic',
    source: 'derived',
    required: true,
  }),
  edgeProperty({
    ownerModule: 'operator-research/intake',
    group: 'provenance',
    property: 'intake.source',
    type: "'live' | 'fixture' | 'synthetic'",
    role: 'diagnostic',
    source: 'derived',
    required: false,
  }),
  edgeProperty({
    ownerModule: 'operator-research/intake',
    group: 'provenance',
    property: 'intake.circuitVerified',
    type: 'boolean',
    role: 'control',
    source: 'derived',
    required: false,
  }),
  circuitProperty({
    ownerModule: 'operator-research/circuit',
    group: 'market',
    property: 'type',
    type: 'EdgeType',
    role: 'feature',
    source: 'circuit',
    required: true,
  }),
  ...[
    ['sport', 'string'],
    ['league', 'string'],
    ['home', 'string'],
    ['away', 'string'],
    ['market', 'string'],
    ['bookmakers', 'string[]'],
    ['bookmaker_ids', 'SportsbookId[]'],
    ['liquidity_tiers', 'string[]'],
  ].map(([propertyName, type]) =>
    edgeProperty({
      ownerModule: 'operator-research/circuit',
      group: 'market',
      property: propertyName!,
      type: type!,
      role: 'diagnostic',
      source: 'circuit',
      required: true,
    })
  ),
  circuitProperty({
    ownerModule: 'operator-research/circuit',
    group: 'market',
    property: 'odds.book1',
    type: 'decimal-string',
    role: 'feature',
    source: 'circuit',
    required: true,
  }),
  circuitProperty({
    ownerModule: 'operator-research/circuit',
    group: 'market',
    property: 'odds.book2',
    type: 'decimal-string',
    role: 'feature',
    source: 'circuit',
    required: true,
  }),
  circuitProperty({
    ownerModule: 'operator-research/circuit',
    group: 'movement',
    property: 'edge_percent',
    type: 'number',
    role: 'feature',
    source: 'circuit',
    required: true,
  }),
  circuitProperty({
    ownerModule: 'operator-research/circuit',
    group: 'risk',
    property: 'expected_value',
    type: 'number',
    role: 'feature',
    source: 'circuit',
    required: true,
  }),
  circuitProperty({
    ownerModule: 'operator-research/circuit',
    group: 'risk',
    property: 'kelly_fraction',
    type: 'number',
    role: 'feature',
    source: 'circuit',
    required: true,
  }),
  edgeProperty({
    ownerModule: 'operator-research/circuit',
    group: 'risk',
    property: 'stake_suggestion',
    type: 'number',
    role: 'output',
    source: 'derived',
    required: true,
  }),
  modelOutputProperty({
    ownerModule: 'operator-research/models',
    group: 'prediction',
    property: 'ml.predicted_prob',
    type: 'number',
    role: 'output',
    source: 'derived',
    required: false,
  }),
  modelOutputProperty({
    ownerModule: 'operator-research/models',
    group: 'prediction',
    property: 'ml.confidence',
    type: 'number',
    role: 'output',
    source: 'derived',
    required: false,
  }),
  modelOutputProperty({
    ownerModule: 'operator-research/models',
    group: 'prediction',
    property: 'ml.model',
    type: 'MlModelName',
    role: 'output',
    source: 'derived',
    required: false,
  }),
  modelOutputProperty({
    ownerModule: 'operator-research/models',
    group: 'provenance',
    property: 'ml.feature_contract',
    type: "'circuit-v1'",
    role: 'output',
    source: 'derived',
    required: false,
  }),
  modelOutputProperty({
    ownerModule: 'operator-research/models',
    group: 'provenance',
    property: 'ml.weight_eligible',
    type: 'boolean',
    role: 'output',
    source: 'derived',
    required: false,
  }),
  modelOutputProperty({
    ownerModule: 'operator-research/models',
    group: 'provenance',
    property: 'ml.weight_inputs',
    type: 'string[]',
    role: 'output',
    source: 'derived',
    required: false,
  }),
  diagnosticProperty({
    ownerModule: 'operator-research/diagnostics',
    group: 'transport',
    property: 'latency_ms.book1',
    type: 'number',
    role: 'diagnostic',
    source: 'transport',
    required: true,
  }),
  diagnosticProperty({
    ownerModule: 'operator-research/diagnostics',
    group: 'transport',
    property: 'latency_ms.book2',
    type: 'number',
    role: 'diagnostic',
    source: 'transport',
    required: true,
  }),
  diagnosticProperty({
    ownerModule: 'operator-research/diagnostics',
    group: 'transport',
    property: 'latency_adjusted',
    type: 'boolean',
    role: 'diagnostic',
    source: 'transport',
    required: true,
  }),
  diagnosticProperty({
    ownerModule: 'operator-research/diagnostics',
    group: 'transport',
    property: 'confidence',
    type: 'number',
    role: 'diagnostic',
    source: 'transport',
    required: true,
  }),
  diagnosticProperty({
    ownerModule: 'operator-research/diagnostics',
    group: 'environment',
    property: 'timestamp',
    type: 'epoch-ms',
    role: 'diagnostic',
    source: 'environment',
    required: true,
  }),
  ...Object.keys(MODEL_HARNESS_FLAGS).map(flag =>
    harnessProperty({
      ownerModule: 'operator-research/controls',
      group: 'flags',
      property: `flags.${flag}`,
      type: 'true',
      role: 'control',
      source: 'environment',
      required: true,
    })
  ),
] as const;

export const MODEL_WEIGHT_INPUTS = MODEL_PROPERTY_CONTRACTS.filter(p => p.affectsWeights).map(
  p => p.property
);

export type ModelIntakeProvenance = {
  source: 'live' | 'fixture' | 'synthetic';
  circuitVerified: boolean;
};

export type CircuitModelInput = {
  type: EdgeType;
  odds: { book1: number; book2: number };
  edgePercent: number;
  expectedValue: number;
  kellyFraction: number;
};

export type ModelDiagnostics = {
  latencyMs: { book1: number; book2: number };
  latencyAdjusted: boolean;
  operationalConfidence: number;
  timestamp: number;
};

export function isWeightEligible(provenance: ModelIntakeProvenance | undefined): boolean {
  return provenance?.source === 'live' && provenance.circuitVerified === true;
}

export function parseModelHarnessConfig(text: string): typeof MODEL_HARNESS_FLAGS {
  const raw = Bun.TOML.parse(text) as {
    schema_version?: number;
    flags?: Record<string, unknown>;
  };
  if (raw.schema_version !== 1) throw new Error('model harness: schema_version must be 1');
  const expected = Object.keys(MODEL_HARNESS_FLAGS) as ModelHarnessFlag[];
  const actual = Object.keys(raw.flags ?? {}).sort();
  if (!Bun.deepEquals(actual, [...expected].sort())) {
    throw new Error(`model harness: flags must be exactly ${expected.join(', ')}`);
  }
  for (const flag of expected) {
    if (raw.flags?.[flag] !== true) {
      throw new Error(`model harness: ${flag} is locked true`);
    }
  }
  return MODEL_HARNESS_FLAGS;
}

export type GroupedModelProperties = Record<
  ModelContractPackage,
  Partial<
    Record<
      ModelOwnerModule,
      Partial<Record<ModelAggregate, Partial<Record<ModelPropertyGroup, ModelPropertyContract[]>>>>
    >
  >
>;

export function groupModelProperties(): GroupedModelProperties {
  const grouped = {} as GroupedModelProperties;
  for (const item of MODEL_PROPERTY_CONTRACTS) {
    const ownerModules = (grouped[item.package] ??= {});
    const aggregates = (ownerModules[item.ownerModule] ??= {});
    const groups = (aggregates[item.aggregate] ??= {});
    (groups[item.group] ??= []).push(item);
  }
  return grouped;
}

export {
  MODEL_CONTRACT_PACKAGE,
  MODEL_CONTRACT_DISCOVERY_GLOBS,
  MODEL_CONTRACT_FILES,
  MODEL_CONTRACT_FILE_REGISTRY,
  MODEL_CONTRACT_FILES_MARKDOWN_OPTIONS,
  assertModelContractFilesMarkdown,
  inspectModelContractFilesMarkdown,
  renderModelContractFilesMarkdown,
  type ModelContractFile,
  type ModelContractFilePath,
  type ModelContractFilesMarkdownInspection,
} from './model-contract-files.ts';
