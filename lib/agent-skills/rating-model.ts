import type {
  DynamicEvidenceModel,
  DynamicProof,
  EvidenceAttribution,
  EvidenceDimension,
} from './rating-types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string): void {
  const actual = Object.keys(value).sort().join('\0');
  const expected = [...keys].sort().join('\0');
  if (actual !== expected) throw new TypeError(`${label} keys do not match its contract`);
}

function parseFiniteNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be from ${minimum} through ${maximum}`);
  }
  return value;
}

function parseAttribution(value: unknown, active: Set<string>, label: string): EvidenceAttribution {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  if (value.kind === 'portfolio' || value.kind === 'active-skills') {
    exactKeys(value, ['kind'], label);
    return { kind: value.kind };
  }
  if (value.kind !== 'skills') throw new TypeError(`${label}.kind is invalid`);
  exactKeys(value, ['kind', 'names'], label);
  if (!Array.isArray(value.names) || value.names.length === 0) {
    throw new TypeError(`${label}.names must be non-empty`);
  }
  const names = value.names.map(name => String(name));
  if (new Set(names).size !== names.length) throw new TypeError(`${label}.names must be unique`);
  for (const name of names) {
    if (!active.has(name)) throw new TypeError(`${label} references inactive skill ${name}`);
  }
  return { kind: 'skills', names };
}

export function parseDynamicEvidenceModel(
  raw: unknown,
  activeNames: string[]
): DynamicEvidenceModel {
  if (!isRecord(raw)) throw new TypeError('dynamic evidence config must be an object');
  exactKeys(
    raw,
    [
      '$schema',
      'schemaVersion',
      'model',
      'minimumOverallScore',
      'weights',
      'prior',
      'confidenceScale',
      'proofs',
    ],
    'dynamic evidence config'
  );
  if (
    raw.$schema !== './schemas/skill-rating-evidence.schema.json' ||
    raw.schemaVersion !== 1 ||
    raw.model !== 'finite-evidence-v2'
  ) {
    throw new TypeError('unsupported dynamic evidence model');
  }
  if (!isRecord(raw.weights)) throw new TypeError('weights must be an object');
  exactKeys(raw.weights, ['compliance', 'structure', 'evidence'], 'weights');
  const weights = {
    compliance: parseFiniteNumber(raw.weights.compliance, 'weights.compliance', 0, 1),
    structure: parseFiniteNumber(raw.weights.structure, 'weights.structure', 0, 1),
    evidence: parseFiniteNumber(raw.weights.evidence, 'weights.evidence', 0, 1),
  };
  if (Math.abs(weights.compliance + weights.structure + weights.evidence - 1) > 1e-9) {
    throw new TypeError('dynamic evidence weights must sum to 1');
  }
  if (!isRecord(raw.prior)) throw new TypeError('prior must be an object');
  exactKeys(raw.prior, ['alpha', 'beta'], 'prior');
  const prior = {
    alpha: parseFiniteNumber(raw.prior.alpha, 'prior.alpha', Number.MIN_VALUE, 1_000),
    beta: parseFiniteNumber(raw.prior.beta, 'prior.beta', Number.MIN_VALUE, 1_000),
  };
  if (!Array.isArray(raw.proofs) || raw.proofs.length === 0) {
    throw new TypeError('proofs must be non-empty');
  }
  const active = new Set(activeNames);
  const proofs = raw.proofs.map((entry, index): DynamicProof => {
    const label = `proofs[${index}]`;
    if (!isRecord(entry)) throw new TypeError(`${label} must be an object`);
    exactKeys(entry, ['id', 'dimension', 'attribution', 'command', 'timeoutMs'], label);
    if (typeof entry.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(entry.id)) {
      throw new TypeError(`${label}.id must be lowercase kebab-case`);
    }
    if (!['model', 'structure', 'runtime', 'contract'].includes(String(entry.dimension))) {
      throw new TypeError(`${label}.dimension is invalid`);
    }
    const attribution = parseAttribution(entry.attribution, active, `${label}.attribution`);
    if (entry.dimension === 'model' && attribution.kind !== 'portfolio') {
      throw new TypeError('model proof must remain portfolio-attributed');
    }
    if (entry.dimension === 'structure' && attribution.kind !== 'active-skills') {
      throw new TypeError('structure proof must remain active-skill-attributed');
    }
    if (
      (entry.dimension === 'runtime' || entry.dimension === 'contract') &&
      attribution.kind !== 'skills'
    ) {
      throw new TypeError('runtime and contract proof require explicit skill attribution');
    }
    if (
      !Array.isArray(entry.command) ||
      entry.command.length === 0 ||
      entry.command.some(part => typeof part !== 'string' || part.length === 0)
    ) {
      throw new TypeError(`${label}.command must be non-empty strings`);
    }
    return {
      id: entry.id,
      dimension: entry.dimension as EvidenceDimension,
      attribution,
      command: [...entry.command] as string[],
      timeoutMs: parseFiniteNumber(entry.timeoutMs, `${label}.timeoutMs`, 1, 600_000),
    };
  });
  if (new Set(proofs.map(proof => proof.id)).size !== proofs.length) {
    throw new TypeError('proof ids must be unique');
  }
  return {
    schemaVersion: 1,
    model: 'finite-evidence-v2',
    minimumOverallScore: parseFiniteNumber(raw.minimumOverallScore, 'minimumOverallScore', 0, 100),
    weights,
    prior,
    confidenceScale: parseFiniteNumber(
      raw.confidenceScale,
      'confidenceScale',
      Number.MIN_VALUE,
      1_000
    ),
    proofs,
  };
}
