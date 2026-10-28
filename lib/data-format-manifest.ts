export type ExposureMode = 'off' | 'preview' | 'enabled';
export type FormatOperation = 'parse' | 'parseChunk' | 'stringify';

export type FormatDefinition = {
  id: string;
  label: string;
  api: string;
  minimumBunVersion: string | null;
  requiredOperations: FormatOperation[];
  fixture: string;
  negativeFixture: string;
};

export type DataFormatManifest = {
  $schema: string;
  schemaVersion: 1;
  mode: ExposureMode;
  surface: {
    path: '/portal/labs/data-formats/';
    access: 'cloudflare-access';
    execution: 'build-time-static';
  };
  security: {
    maxFixtureBytes: number;
    maxOutputBytes: number;
    externalEntities: 'forbidden';
    rendering: 'text-only';
  };
  formats: FormatDefinition[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) {
    throw new TypeError(`${label} keys must be exactly: ${expected.join(', ')}`);
  }
}

function parseNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} is required`);
  return value;
}

function parseByteLimit(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 1_048_576) {
    throw new TypeError(`${label} must be an integer from 1 through 1048576`);
  }
  return Number(value);
}

export function parseDataFormatManifest(input: unknown): DataFormatManifest {
  if (!isRecord(input)) throw new TypeError('data-format manifest must be an object');
  exactKeys(
    input,
    ['$schema', 'schemaVersion', 'mode', 'surface', 'security', 'formats'],
    'manifest'
  );
  if (input.$schema !== './schemas/data-format-lab.schema.json' || input.schemaVersion !== 1) {
    throw new TypeError('unsupported data-format manifest schema');
  }
  if (!['off', 'preview', 'enabled'].includes(String(input.mode))) {
    throw new TypeError('mode must be off, preview, or enabled');
  }
  if (!isRecord(input.surface)) throw new TypeError('surface must be an object');
  exactKeys(input.surface, ['path', 'access', 'execution'], 'surface');
  if (
    input.surface.path !== '/portal/labs/data-formats/' ||
    input.surface.access !== 'cloudflare-access' ||
    input.surface.execution !== 'build-time-static'
  ) {
    throw new TypeError('surface must remain static and Cloudflare Access protected');
  }
  if (!isRecord(input.security)) throw new TypeError('security must be an object');
  exactKeys(
    input.security,
    ['maxFixtureBytes', 'maxOutputBytes', 'externalEntities', 'rendering'],
    'security'
  );
  const maxFixtureBytes = parseByteLimit(input.security.maxFixtureBytes, 'maxFixtureBytes');
  parseByteLimit(input.security.maxOutputBytes, 'maxOutputBytes');
  if (input.security.externalEntities !== 'forbidden' || input.security.rendering !== 'text-only') {
    throw new TypeError('external entities must be forbidden and rendering must be text-only');
  }
  if (!Array.isArray(input.formats) || input.formats.length === 0) {
    throw new TypeError('formats must be a non-empty array');
  }

  const ids = new Set<string>();
  for (const [index, raw] of input.formats.entries()) {
    if (!isRecord(raw)) throw new TypeError(`formats[${index}] must be an object`);
    exactKeys(
      raw,
      [
        'id',
        'label',
        'api',
        'minimumBunVersion',
        'requiredOperations',
        'fixture',
        'negativeFixture',
      ],
      `formats[${index}]`
    );
    const id = parseNonEmptyString(raw.id, `formats[${index}].id`);
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id))
      throw new TypeError(`invalid or duplicate format id ${id}`);
    ids.add(id);
    const api = parseNonEmptyString(raw.api, `${id}.api`);
    if (!/^(JSON|Bun\.[A-Za-z0-9]+)$/.test(api)) throw new TypeError(`${id}.api is invalid`);
    const minimum = raw.minimumBunVersion;
    if (minimum !== null && (typeof minimum !== 'string' || !/^\d+\.\d+\.\d+$/.test(minimum))) {
      throw new TypeError(`${id}.minimumBunVersion is invalid`);
    }
    if (!Array.isArray(raw.requiredOperations) || raw.requiredOperations.length === 0) {
      throw new TypeError(`${id}.requiredOperations must be non-empty`);
    }
    const operations = raw.requiredOperations.map(operation => String(operation));
    if (
      operations.some(operation => !['parse', 'parseChunk', 'stringify'].includes(operation)) ||
      new Set(operations).size !== operations.length
    ) {
      throw new TypeError(`${id} operations must be valid and unique`);
    }
    if (operations.includes('stringify') && !operations.includes('parse')) {
      throw new TypeError(`${id} stringify proof requires parse`);
    }
    const fixture = parseNonEmptyString(raw.fixture, `${id}.fixture`);
    const negativeFixture = parseNonEmptyString(raw.negativeFixture, `${id}.negativeFixture`);
    if (
      new TextEncoder().encode(fixture).byteLength > maxFixtureBytes ||
      new TextEncoder().encode(negativeFixture).byteLength > maxFixtureBytes
    ) {
      throw new TypeError(`${id} fixture exceeds maxFixtureBytes`);
    }
    if (id === 'xml' && /<!DOCTYPE|<!ENTITY/i.test(`${fixture}\n${negativeFixture}`)) {
      throw new TypeError('XML fixtures cannot declare a doctype or entity');
    }
    parseNonEmptyString(raw.label, `${id}.label`);
  }
  return input as unknown as DataFormatManifest;
}

export async function loadDataFormatManifest(path: string): Promise<DataFormatManifest> {
  return parseDataFormatManifest(await Bun.file(path).json());
}
