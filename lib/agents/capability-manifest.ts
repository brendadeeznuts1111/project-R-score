import { parseContentRef, type ContentRef } from '../content-store/content-contract.ts';
import {
  CONTROL_POLICY,
  evaluateControlPolicy,
  type ControlCommand,
  type ControlGrant,
  type ControlId,
  type ControlProfile,
  type EvaluateControlPolicyInput,
} from '../security/control-policy.ts';
import {
  parseChannelAliasId,
  parseIdentityId,
  parseResourceId,
  type ChannelAliasId,
  type IdentityId,
  type ResourceId,
} from '../types/branded.ts';
import type { RegistryOperation } from '../../packages/registry-client/src/index.ts';

export const AGENT_CAPABILITY_MANIFEST_VERSION = 1 as const;
export type AgentCapabilityKind = 'agent' | 'tool' | 'mcp-server' | 'skill';
export type RegistryCapabilityPlane = RegistryOperation;

export interface RegistryCapability {
  readonly plane: RegistryCapabilityPlane;
  readonly origin: string;
}

export interface ExperimentalControlApproval {
  readonly controls: readonly ControlId[];
  readonly expiresAt: string;
  readonly reason: string;
}

export interface AgentCapabilityManifest {
  readonly version: typeof AGENT_CAPABILITY_MANIFEST_VERSION;
  readonly identityId: IdentityId;
  readonly kind: AgentCapabilityKind;
  readonly profile: ControlProfile;
  readonly expiresAt: string;
  readonly controls: readonly ControlGrant[];
  readonly networkRouteIds: readonly ResourceId[];
  readonly registries: readonly RegistryCapability[];
  readonly channelAliases: readonly ChannelAliasId[];
  readonly contentRefs: readonly ContentRef[];
  readonly experimentalApproval?: ExperimentalControlApproval;
}

export interface AgentInvocation {
  readonly identityId: IdentityId;
  readonly profile: ControlProfile;
  readonly command: ControlCommand;
  readonly argv: readonly string[];
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly bunfig: Readonly<Record<string, unknown>>;
  readonly request: Readonly<Record<string, unknown>>;
  readonly networkRouteIds: readonly ResourceId[];
  readonly registries: readonly RegistryCapability[];
  readonly channelAliases: readonly ChannelAliasId[];
  readonly contentRefs: readonly ContentRef[];
}

export interface AgentAuthorization {
  readonly ok: boolean;
  readonly rejected: readonly string[];
  readonly controls: ReturnType<typeof evaluateControlPolicy>;
}

const CONTROL_IDS = new Set<ControlId>(CONTROL_POLICY.map(spec => spec.id));
const PROFILES = new Set<ControlProfile>([
  'development',
  'test',
  'ci',
  'canary',
  'production',
  'offline',
  'release',
]);
const COMMANDS = new Set<ControlCommand>(['runtime', 'install', 'info', 'publish']);
const KINDS = new Set<AgentCapabilityKind>(['agent', 'tool', 'mcp-server', 'skill']);
const REGISTRY_PLANES = new Set<RegistryCapabilityPlane>([
  'metadata-read',
  'artifact-read',
  'publish',
  'mirror-write',
]);
const CANONICAL_NAME_RE = /^[a-z0-9][a-z0-9._:/-]*$/;

function fail(field: string, detail: string): never {
  throw new TypeError(`Invalid agent capability ${field}: ${detail}`);
}

function parseRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(field, 'expected object');
  }
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value)
    .filter(key => !allowedSet.has(key))
    .sort()[0];
  if (unexpected) fail(field, `unexpected key ${unexpected}`);
}

function parseArray(value: unknown, field: string, max = 256): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(field, `expected array of at most ${max}`);
  return value;
}

function parseCanonicalString(value: unknown, field: string, max = 512): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > max ||
    value.trim() !== value ||
    value.includes('\0')
  ) {
    return fail(field, 'expected canonical nonblank string');
  }
  return value;
}

function parseCanonicalName(value: unknown, field: string): string {
  const parsed = parseCanonicalString(value, field, 160);
  if (!CANONICAL_NAME_RE.test(parsed)) fail(field, 'expected lowercase canonical name');
  return parsed;
}

function parseTimestamp(value: unknown, field: string): string {
  const parsed = parseCanonicalString(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(parsed)) {
    fail(field, 'expected UTC ISO-8601 timestamp');
  }
  if (!Number.isFinite(Date.parse(parsed))) fail(field, 'invalid timestamp');
  return parsed;
}

function unique<T>(values: readonly T[], field: string, key: (value: T) => string): readonly T[] {
  const seen = new Set<string>();
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) fail(field, `duplicate ${itemKey}`);
    seen.add(itemKey);
  }
  return values;
}

function parseControlId(value: unknown, field: string): ControlId {
  const parsed = parseCanonicalName(value, field) as ControlId;
  if (!CONTROL_IDS.has(parsed)) fail(field, `unknown control ${parsed}`);
  return parsed;
}

function parseControlGrant(value: unknown, field: string): ControlGrant {
  const item = parseRecord(value, field);
  onlyKeys(item, ['control', 'values', 'reason'], field);
  return {
    control: parseControlId(item.control, `${field}.control`),
    values: unique(
      parseArray(item.values, `${field}.values`, 64).map((entry, index) =>
        parseCanonicalString(entry, `${field}.values[${index}]`, 2_048)
      ),
      `${field}.values`,
      String
    ),
    reason: parseCanonicalString(item.reason, `${field}.reason`, 1_024),
  };
}

function parseCanonicalOrigin(value: unknown, field: string): string {
  const raw = parseCanonicalString(value, field, 2_048);
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return fail(field, 'expected credential-free HTTP(S) origin');
    }
    if (raw !== parsed.origin) fail(field, `expected exact origin ${parsed.origin}`);
    return parsed.origin;
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith('Invalid agent capability'))
      throw error;
    return fail(field, 'expected URL origin');
  }
}

function parseRegistry(value: unknown, field: string): RegistryCapability {
  const item = parseRecord(value, field);
  onlyKeys(item, ['plane', 'origin'], field);
  const plane = parseCanonicalName(item.plane, `${field}.plane`) as RegistryCapabilityPlane;
  if (!REGISTRY_PLANES.has(plane)) fail(`${field}.plane`, `unknown plane ${plane}`);
  return { plane, origin: parseCanonicalOrigin(item.origin, `${field}.origin`) };
}

function parseExperimentalApproval(value: unknown, field: string): ExperimentalControlApproval {
  const item = parseRecord(value, field);
  onlyKeys(item, ['controls', 'expiresAt', 'reason'], field);
  const controls = unique(
    parseArray(item.controls, `${field}.controls`, CONTROL_POLICY.length).map((entry, index) =>
      parseControlId(entry, `${field}.controls[${index}]`)
    ),
    `${field}.controls`,
    String
  );
  for (const control of controls) {
    if (CONTROL_POLICY.find(spec => spec.id === control)?.stability !== 'experimental') {
      fail(`${field}.controls`, `${control} is not experimental`);
    }
  }
  return {
    controls,
    expiresAt: parseTimestamp(item.expiresAt, `${field}.expiresAt`),
    reason: parseCanonicalString(item.reason, `${field}.reason`, 1_024),
  };
}

function parseResourceIds(value: unknown, field: string): readonly ResourceId[] {
  return unique(
    parseArray(value, field).map((entry, index) => {
      const raw = parseCanonicalName(entry, `${field}[${index}]`);
      return parseResourceId(raw);
    }),
    field,
    String
  );
}

function parseAliases(value: unknown, field: string): readonly ChannelAliasId[] {
  return unique(
    parseArray(value, field).map((entry, index) =>
      parseChannelAliasId(parseCanonicalName(entry, `${field}[${index}]`))
    ),
    field,
    String
  );
}

function contentAuthorizationKey(item: ContentRef): string {
  return JSON.stringify(item);
}

function unauthorizedContentDigests(
  requested: readonly ContentRef[],
  allowed: readonly ContentRef[]
): readonly string[] {
  const authorized = new Set(allowed.map(contentAuthorizationKey));
  return requested
    .filter(item => !authorized.has(contentAuthorizationKey(item)))
    .map(item => String(item.digest));
}

function parseContentRefs(value: unknown, field: string): readonly ContentRef[] {
  return unique(
    parseArray(value, field, 1_024).map((entry, index) => {
      try {
        return parseContentRef(entry);
      } catch (error) {
        return fail(
          `${field}[${index}]`,
          error instanceof Error ? error.message : 'invalid ContentRef'
        );
      }
    }),
    field,
    contentAuthorizationKey
  );
}

/** Strict wire parser. Unknown keys and case/alias variants are denied. */
export function parseAgentCapabilityManifestWire(value: unknown): AgentCapabilityManifest {
  const item = parseRecord(value, 'manifest');
  onlyKeys(
    item,
    [
      'version',
      'identityId',
      'kind',
      'profile',
      'expiresAt',
      'controls',
      'networkRouteIds',
      'registries',
      'channelAliases',
      'contentRefs',
      'experimentalApproval',
    ],
    'manifest'
  );
  if (item.version !== AGENT_CAPABILITY_MANIFEST_VERSION) fail('manifest.version', 'expected 1');
  const identityId = parseIdentityId(parseCanonicalName(item.identityId, 'manifest.identityId'));
  const kind = parseCanonicalName(item.kind, 'manifest.kind') as AgentCapabilityKind;
  if (!KINDS.has(kind)) fail('manifest.kind', `unknown kind ${kind}`);
  const profile = parseCanonicalName(item.profile, 'manifest.profile') as ControlProfile;
  if (!PROFILES.has(profile)) fail('manifest.profile', `unknown profile ${profile}`);
  const controls = unique(
    parseArray(item.controls, 'manifest.controls', CONTROL_POLICY.length).map((entry, index) =>
      parseControlGrant(entry, `manifest.controls[${index}]`)
    ),
    'manifest.controls',
    grant => grant.control
  );
  const experimentalApproval =
    item.experimentalApproval === undefined
      ? undefined
      : parseExperimentalApproval(item.experimentalApproval, 'manifest.experimentalApproval');
  const declaredExperimental = controls
    .map(control => control.control)
    .filter(
      control => CONTROL_POLICY.find(spec => spec.id === control)?.stability === 'experimental'
    );
  for (const control of declaredExperimental) {
    if (!experimentalApproval?.controls.includes(control)) {
      fail('manifest.experimentalApproval', `missing exact approval for ${control}`);
    }
  }
  return {
    version: AGENT_CAPABILITY_MANIFEST_VERSION,
    identityId,
    kind,
    profile,
    expiresAt: parseTimestamp(item.expiresAt, 'manifest.expiresAt'),
    controls,
    networkRouteIds: parseResourceIds(item.networkRouteIds, 'manifest.networkRouteIds'),
    registries: unique(
      parseArray(item.registries, 'manifest.registries').map((entry, index) =>
        parseRegistry(entry, `manifest.registries[${index}]`)
      ),
      'manifest.registries',
      entry => `${entry.plane}|${entry.origin}`
    ),
    channelAliases: parseAliases(item.channelAliases, 'manifest.channelAliases'),
    contentRefs: parseContentRefs(item.contentRefs, 'manifest.contentRefs'),
    ...(experimentalApproval ? { experimentalApproval } : {}),
  };
}

function parseStringRecord(
  value: unknown,
  field: string
): Readonly<Record<string, string | undefined>> {
  const item = parseRecord(value, field);
  const parsed: Record<string, string> = {};
  for (const [key, entry] of Object.entries(item)) {
    parseCanonicalString(key, `${field}.key`, 160);
    parsed[key] = parseCanonicalString(entry, `${field}.${key}`, 8_192);
  }
  return parsed;
}

/** Parse an invocation once before the trusted authorization interior. */
export function parseAgentInvocationWire(value: unknown): AgentInvocation {
  const item = parseRecord(value, 'invocation');
  onlyKeys(
    item,
    [
      'identityId',
      'profile',
      'command',
      'argv',
      'environment',
      'bunfig',
      'request',
      'networkRouteIds',
      'registries',
      'channelAliases',
      'contentRefs',
    ],
    'invocation'
  );
  const profile = parseCanonicalName(item.profile, 'invocation.profile') as ControlProfile;
  if (!PROFILES.has(profile)) fail('invocation.profile', `unknown profile ${profile}`);
  const command = parseCanonicalName(item.command, 'invocation.command') as ControlCommand;
  if (!COMMANDS.has(command)) fail('invocation.command', `unknown command ${command}`);
  return {
    identityId: parseIdentityId(parseCanonicalName(item.identityId, 'invocation.identityId')),
    profile,
    command,
    argv: parseArray(item.argv, 'invocation.argv', 512).map((entry, index) =>
      parseCanonicalString(entry, `invocation.argv[${index}]`, 8_192)
    ),
    environment: parseStringRecord(item.environment, 'invocation.environment'),
    bunfig: parseRecord(item.bunfig, 'invocation.bunfig'),
    request: parseRecord(item.request, 'invocation.request'),
    networkRouteIds: parseResourceIds(item.networkRouteIds, 'invocation.networkRouteIds'),
    registries: unique(
      parseArray(item.registries, 'invocation.registries').map((entry, index) =>
        parseRegistry(entry, `invocation.registries[${index}]`)
      ),
      'invocation.registries',
      entry => `${entry.plane}|${entry.origin}`
    ),
    channelAliases: parseAliases(item.channelAliases, 'invocation.channelAliases'),
    contentRefs: parseContentRefs(item.contentRefs, 'invocation.contentRefs'),
  };
}

function includesAll<T>(
  requested: readonly T[],
  allowed: readonly T[],
  key: (value: T) => string
): string[] {
  const authorized = new Set(allowed.map(key));
  return requested.map(key).filter(value => !authorized.has(value));
}

/** Authorize exact declared capabilities and delegate all flag semantics to the control kernel. */
export function authorizeAgentInvocation(
  manifest: AgentCapabilityManifest,
  invocation: AgentInvocation,
  now = new Date()
): AgentAuthorization {
  const rejected: string[] = [];
  if (manifest.identityId !== invocation.identityId) rejected.push('identity-denied');
  if (manifest.profile !== invocation.profile) rejected.push('profile-denied');
  if (Date.parse(manifest.expiresAt) <= now.getTime()) rejected.push('manifest-expired');
  if (
    manifest.experimentalApproval &&
    Date.parse(manifest.experimentalApproval.expiresAt) <= now.getTime()
  ) {
    rejected.push('experimental-approval-expired');
  }

  const controlInput: EvaluateControlPolicyInput = {
    profile: invocation.profile,
    command: invocation.command,
    argv: invocation.argv,
    environment: invocation.environment,
    bunfig: invocation.bunfig,
    request: invocation.request,
    grants: manifest.controls,
  };
  const controls = evaluateControlPolicy(controlInput);
  if (!controls.ok)
    rejected.push(...controls.rejected.map(item => `control:${item.code}:${item.spelling}`));
  rejected.push(
    ...includesAll(invocation.networkRouteIds, manifest.networkRouteIds, String).map(
      value => `network-route-denied:${value}`
    ),
    ...includesAll(
      invocation.registries,
      manifest.registries,
      item => `${item.plane}|${item.origin}`
    ).map(value => `registry-denied:${value}`),
    ...includesAll(invocation.channelAliases, manifest.channelAliases, String).map(
      value => `channel-denied:${value}`
    ),
    ...unauthorizedContentDigests(invocation.contentRefs, manifest.contentRefs).map(
      value => `content-denied:${value}`
    )
  );
  return { ok: rejected.length === 0, rejected, controls };
}
