import {
  parseAdapterId,
  parseCanonicalOutIdentity,
  parseCurrencyCode,
  parsePartnerCode,
  parseSourceSystemId,
  parseSportsbookId,
} from '../core/identifiers.ts';
import {
  BET_STRUCTURES,
  CAPABILITY_SUPPORT_VALUES,
  CREDENTIAL_READINESS_VALUES,
  EXECUTION_AUTHORIZATION_STATUSES,
  EXECUTION_CRITICAL_LIMIT_KINDS,
  MARKET_PHASES,
  OFFER_CATALOG_STATUSES,
  OUT_LIMIT_KINDS,
  OUT_LIMIT_STATUSES,
  PARTNER_OUT_CAPABILITY_SCHEMA_V1,
  PROMOTION_CATALOG_STATUSES,
  SPORTSBOOK_RESOLUTION_METHODS,
  type ObservedValue,
  type PartnerOutCapabilitySnapshot,
  type WagerScope,
} from '../core/out-capabilities.ts';
import {
  PROVENANCE_CONFIDENCE_VALUES,
  PROVENANCE_MAPPING_METHODS,
  PROVIDER_CONNECTION_STATUSES,
  type FactProvenance,
  type MoneyAmount,
} from '../core/types.ts';

type Row = Record<string, unknown>;
function row(value: unknown, path: string): Row {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new TypeError(`${path} must be an object`);
  return value as Row;
}
function keys(value: Row, allowed: readonly string[], path: string): void {
  const set = new Set(allowed);
  const extra = Object.keys(value).filter(key => !set.has(key));
  if (extra.length)
    throw new TypeError(`${path} contains unexpected field(s): ${extra.sort().join(', ')}`);
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.length)
    throw new TypeError(`${path} must be a non-empty string`);
  return value;
}
function oneOf<const V extends readonly string[]>(
  value: unknown,
  values: V,
  path: string
): V[number] {
  if (typeof value !== 'string' || !values.includes(value))
    throw new TypeError(`${path} must be one of ${values.join('|')}`);
  return value;
}
function timestamp(value: unknown, path: string): string {
  const result = text(value, path);
  if (!Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result)
    throw new TypeError(`${path} must be a canonical UTC ISO timestamp`);
  return result;
}
function textList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  const result = value.map((item, index) => text(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) throw new TypeError(`${path} contains duplicates`);
  return result;
}
function enumList<const V extends readonly string[]>(
  value: unknown,
  values: V,
  path: string
): V[number][] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  const result = value.map((item, index) => oneOf(item, values, `${path}[${index}]`));
  if (new Set(result).size !== result.length) throw new TypeError(`${path} contains duplicates`);
  return result;
}
function money(value: unknown, path: string): MoneyAmount {
  const item = row(value, path);
  keys(item, ['currency', 'minorUnits'], path);
  if (!Number.isSafeInteger(item.minorUnits) || Number(item.minorUnits) < 0)
    throw new TypeError(`${path}.minorUnits must be a non-negative safe integer`);
  return { currency: parseCurrencyCode(item.currency), minorUnits: Number(item.minorUnits) };
}
function proof(value: unknown, path: string): FactProvenance {
  const item = row(value, path);
  keys(
    item,
    [
      'sourceSystemId',
      'sourceRecordRef',
      'adapterId',
      'adapterVersion',
      'observedAt',
      'originalValue',
      'mappingMethod',
      'confidence',
    ],
    path
  );
  const sourceRecordRef =
    item.sourceRecordRef === undefined
      ? undefined
      : text(item.sourceRecordRef, `${path}.sourceRecordRef`);
  return {
    sourceSystemId: parseSourceSystemId(item.sourceSystemId),
    ...(sourceRecordRef ? { sourceRecordRef } : {}),
    adapterId: parseAdapterId(item.adapterId),
    adapterVersion: text(item.adapterVersion, `${path}.adapterVersion`),
    observedAt: timestamp(item.observedAt, `${path}.observedAt`),
    originalValue: text(item.originalValue, `${path}.originalValue`),
    mappingMethod: oneOf(item.mappingMethod, PROVENANCE_MAPPING_METHODS, `${path}.mappingMethod`),
    confidence: oneOf(item.confidence, PROVENANCE_CONFIDENCE_VALUES, `${path}.confidence`),
  };
}
function observed<const V extends readonly string[]>(
  value: unknown,
  values: V,
  path: string
): ObservedValue<V[number]> {
  const item = row(value, path);
  keys(item, ['value', 'provenance'], path);
  return {
    value: oneOf(item.value, values, `${path}.value`),
    provenance: proof(item.provenance, `${path}.provenance`),
  };
}
function url(value: unknown, path: string): { value: string; host: string } {
  let parsed: URL;
  try {
    parsed = new URL(text(value, path));
  } catch {
    throw new TypeError(`${path} must be an absolute URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new TypeError(`${path} protocol must be https or http`);
  if (parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new TypeError(`${path} must not contain credentials, query parameters, or fragments`);
  return { value: parsed.toString(), host: parsed.hostname.toLowerCase() };
}
function wagerScope(value: unknown, path: string): WagerScope {
  const item = row(value, path);
  keys(item, ['sport', 'market', 'structure', 'phase'], path);
  return {
    ...(item.sport === undefined ? {} : { sport: text(item.sport, `${path}.sport`) }),
    ...(item.market === undefined ? {} : { market: text(item.market, `${path}.market`) }),
    ...(item.structure === undefined
      ? {}
      : { structure: oneOf(item.structure, BET_STRUCTURES, `${path}.structure`) }),
    ...(item.phase === undefined
      ? {}
      : { phase: oneOf(item.phase, MARKET_PHASES, `${path}.phase`) }),
  };
}
function scopeKey(scope: WagerScope): string {
  return [scope.sport ?? '*', scope.market ?? '*', scope.structure ?? '*', scope.phase ?? '*'].join(
    '|'
  );
}

export function parsePartnerOutCapabilitySnapshot(value: unknown): PartnerOutCapabilitySnapshot {
  const root = row(value, 'capability');
  keys(
    root,
    [
      'schema',
      'partnerCode',
      'outId',
      'observedAt',
      'sportsbook',
      'access',
      'betStructures',
      'wagerOfferCatalog',
      'promotionOfferCatalog',
      'limits',
    ],
    'capability'
  );
  if (root.schema !== PARTNER_OUT_CAPABILITY_SCHEMA_V1)
    throw new TypeError(`capability.schema must be ${PARTNER_OUT_CAPABILITY_SCHEMA_V1}`);
  const partnerCode = parsePartnerCode(root.partnerCode);
  const out = parseCanonicalOutIdentity(root.outId);
  if (out.partnerCode !== partnerCode)
    throw new TypeError('capability.outId must belong to capability.partnerCode');
  const book = row(root.sportsbook, 'capability.sportsbook');
  keys(
    book,
    ['sportsbookId', 'accountEntrypointUrl', 'host', 'skinLabel', 'brandGroup', 'resolutionMethod'],
    'capability.sportsbook'
  );
  const entrypoint = url(book.accountEntrypointUrl, 'capability.sportsbook.accountEntrypointUrl');
  const host = text(book.host, 'capability.sportsbook.host').toLowerCase();
  if (host !== entrypoint.host)
    throw new TypeError('capability.sportsbook.host must match accountEntrypointUrl hostname');
  const access = row(root.access, 'capability.access');
  keys(access, ['credentials', 'authorization', 'providerConnection'], 'capability.access');

  if (!Array.isArray(root.betStructures))
    throw new TypeError('capability.betStructures must be an array');
  const betStructures = root.betStructures.map((raw, index) => {
    const path = `capability.betStructures[${index}]`;
    const item = row(raw, path);
    keys(item, ['structure', 'support', 'provenance'], path);
    return {
      structure: oneOf(item.structure, BET_STRUCTURES, `${path}.structure`),
      support: oneOf(item.support, CAPABILITY_SUPPORT_VALUES, `${path}.support`),
      provenance: proof(item.provenance, `${path}.provenance`),
    };
  });
  const structures = betStructures.map(item => item.structure);
  if (
    structures.length !== BET_STRUCTURES.length ||
    new Set(structures).size !== BET_STRUCTURES.length ||
    !BET_STRUCTURES.every(item => structures.includes(item))
  )
    throw new TypeError(
      'capability.betStructures must contain each canonical structure exactly once'
    );

  const wagerOffers = row(root.wagerOfferCatalog, 'capability.wagerOfferCatalog');
  keys(
    wagerOffers,
    ['status', 'sports', 'markets', 'phases', 'provenance'],
    'capability.wagerOfferCatalog'
  );
  const wagerStatus = oneOf(
    wagerOffers.status,
    OFFER_CATALOG_STATUSES,
    'capability.wagerOfferCatalog.status'
  );
  const sports = textList(wagerOffers.sports, 'capability.wagerOfferCatalog.sports');
  const markets = textList(wagerOffers.markets, 'capability.wagerOfferCatalog.markets');
  const phases = enumList(wagerOffers.phases, MARKET_PHASES, 'capability.wagerOfferCatalog.phases');
  if (wagerStatus === 'unavailable' && (sports.length || markets.length || phases.length))
    throw new TypeError('unavailable wagerOfferCatalog must not contain inferred offers');
  const promotions = row(root.promotionOfferCatalog, 'capability.promotionOfferCatalog');
  keys(promotions, ['status', 'offerRefs', 'provenance'], 'capability.promotionOfferCatalog');
  const promotionStatus = oneOf(
    promotions.status,
    PROMOTION_CATALOG_STATUSES,
    'capability.promotionOfferCatalog.status'
  );
  const offerRefs = textList(promotions.offerRefs, 'capability.promotionOfferCatalog.offerRefs');
  if (promotionStatus === 'available' && !offerRefs.length)
    throw new TypeError('available promotionOfferCatalog requires at least one offerRef');
  if (promotionStatus === 'none' && offerRefs.length)
    throw new TypeError('promotionOfferCatalog status none must not contain offerRefs');

  if (!Array.isArray(root.limits)) throw new TypeError('capability.limits must be an array');
  const limits = root.limits.map((raw, index) => {
    const path = `capability.limits[${index}]`;
    const item = row(raw, path);
    keys(item, ['kind', 'status', 'amount', 'scope', 'provenance'], path);
    const kind = oneOf(item.kind, OUT_LIMIT_KINDS, `${path}.kind`);
    const status = oneOf(item.status, OUT_LIMIT_STATUSES, `${path}.status`);
    const amount = item.amount === undefined ? undefined : money(item.amount, `${path}.amount`);
    if ((status === 'known') !== (amount !== undefined))
      throw new TypeError(`${path}.amount is required only when status is known`);
    return {
      kind,
      status,
      ...(amount ? { amount } : {}),
      scope: wagerScope(item.scope, `${path}.scope`),
      provenance: proof(item.provenance, `${path}.provenance`),
    };
  });
  const limitKeys = limits.map(item => `${item.kind}|${scopeKey(item.scope)}`);
  if (new Set(limitKeys).size !== limitKeys.length)
    throw new TypeError('capability.limits contains duplicate kind/scope facts');
  for (const kind of EXECUTION_CRITICAL_LIMIT_KINDS)
    if (!limits.some(item => item.kind === kind && scopeKey(item.scope) === '*|*|*|*'))
      throw new TypeError(`capability.limits requires an explicit global ${kind} fact`);
  const skinLabel =
    book.skinLabel === undefined
      ? undefined
      : text(book.skinLabel, 'capability.sportsbook.skinLabel');
  const brandGroup =
    book.brandGroup === undefined
      ? undefined
      : text(book.brandGroup, 'capability.sportsbook.brandGroup');
  const result: PartnerOutCapabilitySnapshot = {
    schema: PARTNER_OUT_CAPABILITY_SCHEMA_V1,
    partnerCode,
    outId: out.outId,
    observedAt: timestamp(root.observedAt, 'capability.observedAt'),
    sportsbook: {
      sportsbookId: parseSportsbookId(book.sportsbookId),
      accountEntrypointUrl: entrypoint.value,
      host,
      ...(skinLabel ? { skinLabel } : {}),
      ...(brandGroup ? { brandGroup } : {}),
      resolutionMethod: oneOf(
        book.resolutionMethod,
        SPORTSBOOK_RESOLUTION_METHODS,
        'capability.sportsbook.resolutionMethod'
      ),
    },
    access: {
      credentials: observed(
        access.credentials,
        CREDENTIAL_READINESS_VALUES,
        'capability.access.credentials'
      ),
      authorization: observed(
        access.authorization,
        EXECUTION_AUTHORIZATION_STATUSES,
        'capability.access.authorization'
      ),
      providerConnection: observed(
        access.providerConnection,
        PROVIDER_CONNECTION_STATUSES,
        'capability.access.providerConnection'
      ),
    },
    betStructures,
    wagerOfferCatalog: {
      status: wagerStatus,
      sports,
      markets,
      phases,
      provenance: proof(wagerOffers.provenance, 'capability.wagerOfferCatalog.provenance'),
    },
    promotionOfferCatalog: {
      status: promotionStatus,
      offerRefs,
      provenance: proof(promotions.provenance, 'capability.promotionOfferCatalog.provenance'),
    },
    limits,
  };
  const factProvenance = [
    result.access.credentials.provenance,
    result.access.authorization.provenance,
    result.access.providerConnection.provenance,
    ...result.betStructures.map(item => item.provenance),
    result.wagerOfferCatalog.provenance,
    result.promotionOfferCatalog.provenance,
    ...result.limits.map(item => item.provenance),
  ];
  const snapshotObservedAtMs = Date.parse(result.observedAt);
  if (factProvenance.some(item => Date.parse(item.observedAt) > snapshotObservedAtMs)) {
    throw new TypeError('capability fact provenance must not be observed after the snapshot');
  }
  return result;
}
