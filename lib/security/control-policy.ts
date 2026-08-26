// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @updated --env-file · changed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @verified --env-file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// @updated --fetch-preconnect · changed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated --fetch-preconnect · fixed v1.1.23 · 2024-08-14 · https://bun.com/blog/bun-v1.1.23
// @verified --fetch-preconnect · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup
/**
 * Factory control-policy kernel.
 *
 * This policy composes with, but does not replace, the per-tool long-option
 * allowlists in `lib/docs/ref-id-tool-flags.ts`. Those allowlists govern
 * Factory application arguments. This module governs authority-bearing Bun
 * launch, configuration, environment, and request controls.
 */

export const CONTROL_PROFILES = [
  'development',
  'test',
  'ci',
  'canary',
  'production',
  'offline',
  'release',
] as const;

export type ControlProfile = (typeof CONTROL_PROFILES)[number];
export type ControlDecision = 'allow' | 'deny';
export type ControlSource = 'bunfig' | 'environment' | 'bun-options' | 'cli' | 'request';
export type ControlCommand = 'runtime' | 'install' | 'info' | 'publish';
export type ControlStability = 'stable' | 'experimental';
export type ControlForwarding = 'never' | 'sanitized';
export type ControlRedaction = 'none' | 'credentials' | 'value';

export const CONTROL_SOURCE_PRECEDENCE = [
  'bunfig',
  'environment',
  'bun-options',
  'cli',
  'request',
] as const satisfies readonly ControlSource[];

export type ControlId =
  | 'registry'
  | 'fetch-preconnect'
  | 'preload'
  | 'experimental-http2-fetch'
  | 'experimental-http3-fetch'
  | 'config'
  | 'env-file'
  | 'cwd'
  | 'request-proxy'
  | 'request-unix'
  | 'request-tls'
  | 'request-protocol';

export type ControlEffect =
  | 'registry-origin'
  | 'network-preconnect'
  | 'module-preload'
  | 'runtime-fetch-protocol'
  | 'configuration-source'
  | 'environment-source'
  | 'working-directory'
  | 'proxy-route'
  | 'unix-socket-route'
  | 'tls-policy'
  | 'request-fetch-protocol';

type ProfileDecisions = Readonly<Record<ControlProfile, ControlDecision>>;

interface ControlAlias {
  readonly source: ControlSource;
  /** Exact, case-sensitive spelling without CLI `=value`. */
  readonly name: string;
  readonly commands?: readonly ControlCommand[];
}

type ControlValue =
  | { readonly kind: 'boolean' }
  | { readonly kind: 'string' | 'path' | 'url' | 'object' }
  | { readonly kind: 'enum'; readonly values: readonly string[] };

export interface ControlSpec {
  readonly id: ControlId;
  readonly owner: 'bun-runtime' | 'bun-package-manager' | 'factory-transport';
  readonly effect: ControlEffect;
  readonly stability: ControlStability;
  readonly aliases: readonly ControlAlias[];
  readonly value: ControlValue;
  readonly repeatable: boolean;
  readonly profiles: ProfileDecisions;
  /** Optional value-level restriction after the profile decision. */
  readonly allowedValuesByProfile?: Partial<Readonly<Record<ControlProfile, readonly string[]>>>;
  readonly forwarding: ControlForwarding;
  readonly redaction: ControlRedaction;
  /** Profiles cap eligibility; this separately governs value capabilities. */
  readonly grantMode: 'none' | 'exact-origin' | 'exact-value' | 'never';
}

function decisions(allowed: readonly ControlProfile[]): ProfileDecisions {
  const allowedSet = new Set<ControlProfile>(allowed);
  return Object.fromEntries(
    CONTROL_PROFILES.map(profile => [profile, allowedSet.has(profile) ? 'allow' : 'deny'])
  ) as Record<ControlProfile, ControlDecision>;
}

const ONLINE_NON_RELEASE = ['development', 'test', 'ci', 'canary', 'production'] as const;
const CONTROLLED_BUILD = ['development', 'test', 'ci', 'canary', 'release'] as const;

/** Machine-readable source of truth for the first guarded control surface. */
export const CONTROL_POLICY: readonly ControlSpec[] = [
  {
    id: 'registry',
    owner: 'bun-package-manager',
    effect: 'registry-origin',
    stability: 'stable',
    aliases: [
      { source: 'cli', name: '--registry', commands: ['install', 'info', 'publish'] },
      { source: 'environment', name: 'BUN_CONFIG_REGISTRY' },
      { source: 'bunfig', name: 'install.registry' },
    ],
    value: { kind: 'url' },
    repeatable: false,
    profiles: decisions(CONTROLLED_BUILD),
    forwarding: 'never',
    redaction: 'credentials',
    grantMode: 'exact-origin',
  },
  {
    id: 'fetch-preconnect',
    owner: 'bun-runtime',
    effect: 'network-preconnect',
    stability: 'stable',
    aliases: [{ source: 'cli', name: '--fetch-preconnect', commands: ['runtime'] }],
    value: { kind: 'url' },
    repeatable: true,
    profiles: decisions(ONLINE_NON_RELEASE),
    forwarding: 'never',
    redaction: 'credentials',
    grantMode: 'exact-origin',
  },
  {
    id: 'preload',
    owner: 'bun-runtime',
    effect: 'module-preload',
    stability: 'stable',
    aliases: [
      { source: 'cli', name: '-r', commands: ['runtime'] },
      { source: 'cli', name: '--preload', commands: ['runtime'] },
      { source: 'cli', name: '--require', commands: ['runtime'] },
      { source: 'cli', name: '--import', commands: ['runtime'] },
      { source: 'bunfig', name: 'preload' },
    ],
    value: { kind: 'path' },
    repeatable: true,
    profiles: decisions(['development', 'test', 'ci', 'canary']),
    forwarding: 'never',
    redaction: 'none',
    grantMode: 'exact-value',
  },
  {
    id: 'experimental-http2-fetch',
    owner: 'bun-runtime',
    effect: 'runtime-fetch-protocol',
    stability: 'experimental',
    aliases: [
      { source: 'cli', name: '--experimental-http2-fetch', commands: ['runtime'] },
      { source: 'environment', name: 'BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT' },
    ],
    value: { kind: 'boolean' },
    repeatable: false,
    profiles: decisions(['development', 'test', 'ci', 'canary']),
    forwarding: 'never',
    redaction: 'none',
    grantMode: 'exact-value',
  },
  {
    id: 'experimental-http3-fetch',
    owner: 'bun-runtime',
    effect: 'runtime-fetch-protocol',
    stability: 'experimental',
    aliases: [
      { source: 'cli', name: '--experimental-http3-fetch', commands: ['runtime'] },
      { source: 'environment', name: 'BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT' },
    ],
    value: { kind: 'boolean' },
    repeatable: false,
    profiles: decisions(['canary']),
    forwarding: 'never',
    redaction: 'none',
    grantMode: 'exact-value',
  },
  {
    id: 'config',
    owner: 'bun-runtime',
    effect: 'configuration-source',
    stability: 'stable',
    aliases: [
      {
        source: 'cli',
        name: '--config',
        commands: ['runtime', 'install', 'info', 'publish'],
      },
      { source: 'cli', name: '-c', commands: ['runtime', 'install', 'info', 'publish'] },
    ],
    value: { kind: 'path' },
    repeatable: false,
    profiles: decisions(CONTROLLED_BUILD),
    forwarding: 'never',
    redaction: 'none',
    grantMode: 'exact-value',
  },
  {
    id: 'env-file',
    owner: 'bun-runtime',
    effect: 'environment-source',
    stability: 'stable',
    aliases: [{ source: 'cli', name: '--env-file', commands: ['runtime'] }],
    value: { kind: 'path' },
    repeatable: true,
    profiles: decisions(['development', 'test', 'ci', 'canary']),
    forwarding: 'never',
    redaction: 'value',
    grantMode: 'exact-value',
  },
  {
    id: 'cwd',
    owner: 'bun-runtime',
    effect: 'working-directory',
    stability: 'stable',
    aliases: [
      {
        source: 'cli',
        name: '--cwd',
        commands: ['runtime', 'install', 'info', 'publish'],
      },
    ],
    value: { kind: 'path' },
    repeatable: false,
    profiles: decisions(CONTROLLED_BUILD),
    forwarding: 'never',
    redaction: 'none',
    grantMode: 'exact-value',
  },
  {
    id: 'request-proxy',
    owner: 'factory-transport',
    effect: 'proxy-route',
    stability: 'stable',
    aliases: [{ source: 'request', name: 'proxy' }],
    value: { kind: 'url' },
    repeatable: false,
    profiles: decisions(ONLINE_NON_RELEASE),
    forwarding: 'sanitized',
    redaction: 'credentials',
    grantMode: 'exact-origin',
  },
  {
    id: 'request-unix',
    owner: 'factory-transport',
    effect: 'unix-socket-route',
    stability: 'stable',
    aliases: [{ source: 'request', name: 'unix' }],
    value: { kind: 'path' },
    repeatable: false,
    profiles: decisions(['development', 'test']),
    forwarding: 'sanitized',
    redaction: 'none',
    grantMode: 'exact-value',
  },
  {
    id: 'request-tls',
    owner: 'factory-transport',
    effect: 'tls-policy',
    stability: 'stable',
    aliases: [{ source: 'request', name: 'tls' }],
    value: { kind: 'object' },
    repeatable: false,
    profiles: decisions(ONLINE_NON_RELEASE),
    forwarding: 'never',
    redaction: 'value',
    grantMode: 'never',
  },
  {
    id: 'request-protocol',
    owner: 'factory-transport',
    effect: 'request-fetch-protocol',
    stability: 'experimental',
    aliases: [{ source: 'request', name: 'protocol' }],
    value: { kind: 'enum', values: ['http1.1', 'http2', 'http3', 'h1', 'h2', 'h3'] },
    repeatable: false,
    profiles: decisions(ONLINE_NON_RELEASE),
    allowedValuesByProfile: {
      development: ['h1', 'h2'],
      test: ['h1', 'h2'],
      ci: ['h1', 'h2'],
      canary: ['h1', 'h2', 'h3'],
      production: ['h1', 'h2'],
    },
    forwarding: 'sanitized',
    redaction: 'none',
    grantMode: 'exact-value',
  },
] as const;

export interface ControlOverride {
  readonly control: ControlId;
  readonly decision: ControlDecision;
  readonly reason: string;
}

/** Exact capability supplied by a manifest/policy owner, never by raw argv. */
export interface ControlGrant {
  readonly control: ControlId;
  /** Origins for `exact-origin`; canonical values/paths for `exact-value`. */
  readonly values: readonly string[];
  readonly reason: string;
}

interface RawOccurrence {
  readonly control: ControlId;
  readonly source: ControlSource;
  readonly spelling: string;
  readonly value: WireControlValue;
  readonly order: number;
}

export interface EffectiveControl {
  readonly control: ControlId;
  readonly source: ControlSource;
  readonly spelling: string;
  readonly value: ParsedControlValue;
  readonly redactedValue: ParsedControlValue;
  readonly effect: ControlEffect;
  readonly stability: ControlStability;
  readonly forwarding: ControlForwarding;
}

export type ControlRejectionCode =
  | 'unknown-control'
  | 'wrong-command'
  | 'missing-value'
  | 'unexpected-value'
  | 'invalid-value'
  | 'profile-denied'
  | 'value-denied'
  | 'missing-grant'
  | 'baseline-denied'
  | 'composite-source-denied'
  | 'security-denial-non-overridable';

export interface ControlRejection {
  readonly code: ControlRejectionCode;
  readonly spelling: string;
  readonly control?: ControlId;
  readonly source: ControlSource;
  readonly redactedValue?: ParsedControlValue;
  readonly message: string;
}

export interface ControlEvaluation {
  readonly ok: boolean;
  readonly effective: readonly EffectiveControl[];
  readonly rejected: readonly ControlRejection[];
  readonly shadowed: readonly EffectiveControl[];
  /** Entrypoint/application arguments, including everything after `--`. */
  readonly applicationArgv: readonly string[];
}

export interface EvaluateControlPolicyInput {
  readonly profile: ControlProfile;
  readonly command: ControlCommand;
  /** Bun arguments after the command name, before a Factory CLI parses its own argv. */
  readonly argv?: readonly string[];
  readonly environment?: Readonly<Record<string, string | undefined>>;
  /** Flattened policy-owned bunfig keys, not an entire bunfig document. */
  readonly bunfig?: Readonly<Record<string, unknown>>;
  /** Bun fetch routing overrides, not an entire RequestInit. */
  readonly request?: Readonly<Record<string, unknown>>;
  readonly overrides?: readonly ControlOverride[];
  readonly grants?: readonly ControlGrant[];
}

function aliasesFor(
  source: ControlSource
): Map<string, { spec: ControlSpec; alias: ControlAlias }> {
  const aliases = new Map<string, { spec: ControlSpec; alias: ControlAlias }>();
  for (const spec of CONTROL_POLICY) {
    for (const alias of spec.aliases) {
      if (alias.source === source) aliases.set(alias.name, { spec, alias });
    }
  }
  return aliases;
}

const CLI_ALIASES = aliasesFor('cli');
const ENV_ALIASES = aliasesFor('environment');
const BUNFIG_ALIASES = aliasesFor('bunfig');
const REQUEST_ALIASES = aliasesFor('request');

/**
 * Exact spellings observed in older CLI inventories but not owned by Bun 1.4.
 * They are denial sentinels, not aliases: a future Bun help addition must be
 * classified before any guarded child can forward it.
 */
export const RESERVED_UNOWNED_BUN_CONTROLS = ['--connect', '-O', '-R'] as const;

/**
 * Select only authority-bearing controls from an already exact-bound child
 * argv. Ordinary command flags remain protected by the caller's complete argv
 * authority while this subset is evaluated by the shared control kernel.
 */
export function bunAuthorityControlArgv(
  argv: readonly string[],
  command: ControlCommand
): readonly string[] {
  const input = command === 'runtime' ? argv : argv.slice(1);
  const selected: string[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const token = input[index] ?? '';
    if (token === '--') break;
    if (!token.startsWith('-') || token === '-') {
      if (command === 'runtime') break;
      continue;
    }
    const equalsIndex = token.indexOf('=');
    const spelling = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    const matched = CLI_ALIASES.get(spelling);
    if (!matched) {
      if (
        command === 'runtime' ||
        RESERVED_UNOWNED_BUN_CONTROLS.includes(spelling as '--connect' | '-O' | '-R')
      ) {
        selected.push(token);
      }
      continue;
    }
    selected.push(token);
    if (equalsIndex === -1 && matched.spec.value.kind !== 'boolean') {
      const value = input[index + 1];
      if (value !== undefined && !value.startsWith('-')) {
        selected.push(value);
        index += 1;
      }
    }
  }
  return selected;
}

type WireControlValue = string | boolean | object;
type ParsedControlValue = string | boolean | object;

function rejection(
  code: ControlRejectionCode,
  source: ControlSource,
  spelling: string,
  message: string,
  spec?: ControlSpec,
  value?: WireControlValue
): ControlRejection {
  return {
    code,
    source,
    spelling,
    ...(spec ? { control: spec.id } : {}),
    ...(value === undefined || !spec ? {} : { redactedValue: redact(value, spec.redaction) }),
    message,
  };
}

function parseCli(
  argv: readonly string[],
  command: ControlCommand
): { occurrences: RawOccurrence[]; rejected: ControlRejection[]; applicationArgv: string[] } {
  const occurrences: RawOccurrence[] = [];
  const rejected: ControlRejection[] = [];
  const applicationArgv: string[] = [];
  let applicationBoundary = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? '';
    if (applicationBoundary) {
      applicationArgv.push(token);
      continue;
    }
    if (token === '--') {
      applicationBoundary = true;
      applicationArgv.push(token);
      continue;
    }
    if (!token.startsWith('-') || token === '-') {
      applicationArgv.push(token);
      // A runtime entrypoint owns every following token. Package-manager
      // commands continue parsing options around positional package names.
      applicationBoundary = command === 'runtime';
      continue;
    }

    const equalsIndex = token.indexOf('=');
    const spelling = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);
    const matched = CLI_ALIASES.get(spelling);
    if (!matched) {
      rejected.push(
        rejection(
          'unknown-control',
          'cli',
          spelling,
          `Unknown case-sensitive Bun control ${spelling}`
        )
      );
      continue;
    }
    const { spec, alias } = matched;
    if (!alias.commands?.includes(command)) {
      rejected.push(
        rejection(
          'wrong-command',
          'cli',
          spelling,
          `${spelling} is not owned by the ${command} command`,
          spec,
          inlineValue
        )
      );
      continue;
    }

    if (spec.value.kind === 'boolean') {
      if (inlineValue !== undefined) {
        rejected.push(
          rejection(
            'unexpected-value',
            'cli',
            spelling,
            `${spelling} is a presence-only boolean control`,
            spec,
            inlineValue
          )
        );
        continue;
      }
      occurrences.push({ control: spec.id, source: 'cli', spelling, value: true, order: index });
      continue;
    }

    let rawValue = inlineValue;
    if (rawValue === undefined) {
      const candidate = argv[index + 1];
      // Authority-bearing options never consume another option-looking token
      // as a path/URL. This keeps a missing value from hiding the next control.
      rawValue = candidate?.startsWith('-') ? undefined : candidate;
      if (rawValue !== undefined) index += 1;
    }
    if (rawValue === undefined || rawValue.length === 0) {
      rejected.push(
        rejection('missing-value', 'cli', spelling, `${spelling} requires a value`, spec)
      );
      continue;
    }
    occurrences.push({ control: spec.id, source: 'cli', spelling, value: rawValue, order: index });
  }

  return { occurrences, rejected, applicationArgv };
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return undefined;
}

function parseControlValue(
  spec: ControlSpec,
  value: WireControlValue
): ParsedControlValue | undefined {
  switch (spec.value.kind) {
    case 'boolean':
      return parseBoolean(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
    case 'string':
    case 'path':
      return typeof value === 'string' && value.length > 0 ? value : undefined;
    case 'url': {
      if (typeof value !== 'string' || value.length === 0) return undefined;
      try {
        const parsed = new URL(value);
        if (parsed.username || parsed.password) return undefined;
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : undefined;
      } catch {
        return undefined;
      }
    }
    case 'enum':
      if (typeof value !== 'string' || !spec.value.values.includes(value)) return undefined;
      if (spec.id !== 'request-protocol') return value;
      return (
        {
          'http1.1': 'h1',
          http2: 'h2',
          http3: 'h3',
          h1: 'h1',
          h2: 'h2',
          h3: 'h3',
        } as const
      )[value as 'http1.1' | 'http2' | 'http3' | 'h1' | 'h2' | 'h3'];
  }
}

function parseNamedSource(
  source: 'bunfig' | 'request',
  values: Readonly<Record<string, unknown>> | undefined,
  aliases: Map<string, { spec: ControlSpec; alias: ControlAlias }>
): { occurrences: RawOccurrence[]; rejected: ControlRejection[] } {
  const occurrences: RawOccurrence[] = [];
  const rejected: ControlRejection[] = [];
  for (const [order, [spelling, value]] of Object.entries(values ?? {}).entries()) {
    const matched = aliases.get(spelling);
    if (!matched) {
      rejected.push(
        rejection(
          'unknown-control',
          source,
          spelling,
          `Unknown case-sensitive ${source} control ${spelling}`
        )
      );
      continue;
    }
    if (
      typeof value !== 'string' &&
      typeof value !== 'boolean' &&
      (typeof value !== 'object' || value === null)
    ) {
      rejected.push(
        rejection(
          'invalid-value',
          source,
          spelling,
          `${spelling} has an invalid ${matched.spec.value.kind} value`,
          matched.spec
        )
      );
      continue;
    }
    occurrences.push({ control: matched.spec.id, source, spelling, value, order });
  }
  return { occurrences, rejected };
}

function parseEnvironment(
  environment: Readonly<Record<string, string | undefined>> | undefined
): RawOccurrence[] {
  const occurrences: RawOccurrence[] = [];
  let order = 0;
  for (const [spelling, { spec }] of ENV_ALIASES) {
    const value = environment?.[spelling];
    if (value !== undefined) {
      occurrences.push({ control: spec.id, source: 'environment', spelling, value, order });
      order += 1;
    }
  }
  return occurrences;
}

function redact(value: WireControlValue, policy: ControlRedaction): ParsedControlValue {
  if (policy === 'none') return value;
  if (policy === 'value') return '<redacted>';
  if (typeof value !== 'string') return '<redacted>';
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      parsed.username = '<redacted>';
      parsed.password = '<redacted>';
    }
    return parsed.toString();
  } catch {
    return '<redacted>';
  }
}

function toEffective(
  occurrence: RawOccurrence,
  spec: ControlSpec,
  value: ParsedControlValue
): EffectiveControl {
  return {
    control: spec.id,
    source: occurrence.source,
    spelling: occurrence.spelling,
    value,
    redactedValue: redact(value, spec.redaction),
    effect: spec.effect,
    stability: spec.stability,
    forwarding: spec.forwarding,
  };
}

function sourceRank(source: ControlSource): number {
  return CONTROL_SOURCE_PRECEDENCE.indexOf(source);
}

function grantMatches(
  spec: ControlSpec,
  value: ParsedControlValue,
  grants: readonly ControlGrant[]
): boolean {
  if (spec.grantMode === 'none') return true;
  if (spec.grantMode === 'never') return false;
  const declared = grants.filter(grant => grant.control === spec.id).flatMap(grant => grant.values);
  if (typeof value === 'boolean') return value && declared.includes('enabled');
  if (typeof value !== 'string') return false;
  if (spec.grantMode === 'exact-value') return declared.includes(value);
  try {
    const requested = new URL(value);
    if (requested.username || requested.password) return false;
    return declared.some(candidate => {
      try {
        const granted = new URL(candidate);
        return !granted.username && !granted.password && granted.origin === requested.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Purely evaluate all declared controls. It does not read process state, exit,
 * mutate argv, connect to the network, or forward a denied value.
 */
export function evaluateControlPolicy(input: EvaluateControlPolicyInput): ControlEvaluation {
  const cli = parseCli(input.argv ?? [], input.command);
  const bunfig = parseNamedSource('bunfig', input.bunfig, BUNFIG_ALIASES);
  const request = parseNamedSource('request', input.request, REQUEST_ALIASES);
  const occurrences = [
    ...bunfig.occurrences,
    ...parseEnvironment(input.environment),
    ...cli.occurrences,
    ...request.occurrences,
  ];
  const rejected: ControlRejection[] = [...cli.rejected, ...bunfig.rejected, ...request.rejected];
  if (input.environment?.BUN_OPTIONS?.trim()) {
    rejected.push(
      rejection(
        'composite-source-denied',
        'bun-options',
        'BUN_OPTIONS',
        'Nonempty BUN_OPTIONS is denied; use declared controls and capabilities instead'
      )
    );
  }
  const effective: EffectiveControl[] = [];
  const shadowed: EffectiveControl[] = [];
  const overrides = new Map(input.overrides?.map(item => [item.control, item] as const) ?? []);

  for (const spec of CONTROL_POLICY) {
    const candidates = occurrences.filter(item => item.control === spec.id);
    if (candidates.length === 0) continue;
    const highestRank = Math.max(...candidates.map(item => sourceRank(item.source)));
    const selected = candidates.filter(item => sourceRank(item.source) === highestRank);
    const superseded = candidates.filter(item => sourceRank(item.source) !== highestRank);

    for (const occurrence of superseded) {
      const value = parseControlValue(spec, occurrence.value);
      if (value !== undefined) shadowed.push(toEffective(occurrence, spec, value));
    }

    const normalized: Array<{ occurrence: RawOccurrence; value: ParsedControlValue }> = [];
    for (const occurrence of selected) {
      const value = parseControlValue(spec, occurrence.value);
      if (value === undefined) {
        rejected.push(
          rejection(
            'invalid-value',
            occurrence.source,
            occurrence.spelling,
            `${occurrence.spelling} has an invalid ${spec.value.kind} value`,
            spec,
            occurrence.value
          )
        );
      } else {
        normalized.push({ occurrence, value });
      }
    }
    // `0`/`false` is an explicit disable, not an attempted security grant.
    const inactive =
      spec.value.kind === 'boolean' ? normalized.filter(item => item.value === false) : [];
    const activated = normalized.filter(item => !inactive.includes(item));
    for (const item of inactive) effective.push(toEffective(item.occurrence, spec, item.value));

    const baseDecision = spec.profiles[input.profile];
    const override = overrides.get(spec.id);
    let decision = baseDecision;
    if (override?.decision === 'deny') decision = 'deny';
    if (override?.decision === 'allow' && baseDecision === 'deny') {
      for (const { occurrence } of activated) {
        rejected.push(
          rejection(
            'security-denial-non-overridable',
            occurrence.source,
            occurrence.spelling,
            `${spec.id} is profile-denied in ${input.profile}; an override cannot grant it`,
            spec,
            occurrence.value
          )
        );
      }
      continue;
    }
    if (decision === 'deny') {
      for (const { occurrence } of activated) {
        rejected.push(
          rejection(
            'profile-denied',
            occurrence.source,
            occurrence.spelling,
            `${spec.id} is denied in the ${input.profile} profile`,
            spec,
            occurrence.value
          )
        );
      }
      continue;
    }

    const retained = spec.repeatable ? activated : activated.slice(-1);
    for (const item of activated.slice(0, spec.repeatable ? 0 : -1)) {
      shadowed.push(toEffective(item.occurrence, spec, item.value));
    }
    for (const { occurrence, value } of retained) {
      const allowedValues = spec.allowedValuesByProfile?.[input.profile];
      if (allowedValues && !allowedValues.includes(String(value))) {
        rejected.push(
          rejection(
            'value-denied',
            occurrence.source,
            occurrence.spelling,
            `${String(value)} is denied for ${spec.id} in ${input.profile}`,
            spec,
            value
          )
        );
        continue;
      }
      if (spec.grantMode === 'never') {
        rejected.push(
          rejection(
            'baseline-denied',
            occurrence.source,
            occurrence.spelling,
            `${spec.id} is denied by a non-grantable security baseline`,
            spec,
            value
          )
        );
        continue;
      }
      if (!grantMatches(spec, value, input.grants ?? [])) {
        rejected.push(
          rejection(
            'missing-grant',
            occurrence.source,
            occurrence.spelling,
            `${spec.id} has no matching ${spec.grantMode} capability`,
            spec,
            value
          )
        );
        continue;
      }
      effective.push(toEffective(occurrence, spec, value));
    }
  }

  return {
    ok: rejected.length === 0,
    effective,
    rejected,
    shadowed,
    applicationArgv: cli.applicationArgv,
  };
}

export interface ControlPolicySchemaIssue {
  readonly code: 'duplicate-id' | 'duplicate-alias' | 'missing-command' | 'invalid-enum';
  readonly detail: string;
}

/** Executable schema/config consistency gate. */
export function controlPolicySchemaIssues(): readonly ControlPolicySchemaIssue[] {
  const issues: ControlPolicySchemaIssue[] = [];
  const ids = new Set<ControlId>();
  const aliases = new Set<string>();
  for (const spec of CONTROL_POLICY) {
    if (ids.has(spec.id)) issues.push({ code: 'duplicate-id', detail: spec.id });
    ids.add(spec.id);
    if (spec.value.kind === 'enum' && spec.value.values.length === 0) {
      issues.push({ code: 'invalid-enum', detail: spec.id });
    }
    for (const alias of spec.aliases) {
      const key = `${alias.source}:${alias.name}`;
      if (aliases.has(key)) issues.push({ code: 'duplicate-alias', detail: key });
      aliases.add(key);
      if (alias.source === 'cli' && (!alias.commands || alias.commands.length === 0)) {
        issues.push({ code: 'missing-command', detail: key });
      }
    }
  }
  return issues;
}

const PINNED_BUN_HELP_ROWS = [
  '-r, --preload=<val>',
  '--require=<val>',
  '--import=<val>',
  '--fetch-preconnect=<val>',
  '--experimental-http2-fetch',
  '--experimental-http3-fetch',
  '--env-file=<val>',
  '--cwd=<val>',
  '-c, --config=<val>',
] as const;

const PINNED_BUN_INSTALL_HELP_ROWS = [
  '--registry=<val>',
  '--cwd=<val>',
  '-c, --config=<val>',
] as const;

/** Initial reverse inventory gate for the pinned Bun launch surface. */
export function bunHelpControlDrift(
  runtimeHelpText: string,
  installHelpText: string
): readonly string[] {
  const missing = [
    ...PINNED_BUN_HELP_ROWS.filter(row => !runtimeHelpText.includes(row)).map(
      row => `runtime:${row}`
    ),
    ...PINNED_BUN_INSTALL_HELP_ROWS.filter(row => !installHelpText.includes(row)).map(
      row => `install:${row}`
    ),
  ];
  // These short/legacy spellings have no owner in Bun 1.4. If a later runtime
  // advertises one, the control policy must classify it before wrappers accept it.
  const unowned = RESERVED_UNOWNED_BUN_CONTROLS.flatMap(flag => {
    const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const advertised = new RegExp(`^\\s*${escaped}(?:[=,\\s]|$)`, 'm');
    return [
      ...(advertised.test(runtimeHelpText) ? [`runtime-unowned:${flag}`] : []),
      ...(advertised.test(installHelpText) ? [`install-unowned:${flag}`] : []),
    ];
  });
  return [...missing, ...unowned];
}
