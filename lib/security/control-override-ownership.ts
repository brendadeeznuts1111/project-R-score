// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
import manifest from '../../config/control-override-ownership.json' with { type: 'json' };
import schema from '../../config/control-override-ownership.schema.json' with { type: 'json' };
import { resolvePath } from '../path-bun.ts';
import {
  REGISTRY_PUBLISH_SOURCE_PRECEDENCE,
  REGISTRY_READ_SOURCE_PRECEDENCE,
} from '../registry/command-policy.ts';
import {
  CONTROL_POLICY,
  CONTROL_SOURCE_PRECEDENCE,
  RESERVED_UNOWNED_BUN_CONTROLS,
} from './control-policy.ts';

export const CONTROL_OVERRIDE_OWNERSHIP_MANIFEST = manifest;

export interface ControlOverrideOwnershipIssue {
  readonly code:
    | 'schema-contract'
    | 'source-precedence'
    | 'registry-precedence'
    | 'duplicate-control'
    | 'control-drift'
    | 'alias-drift'
    | 'default-not-deny'
    | 'reserved-drift'
    | 'composite-denial-drift'
    | 'duplicate-application-mode'
    | 'missing-owner';
  readonly detail: string;
}

function aliasKey(alias: {
  readonly source: string;
  readonly spelling?: string;
  readonly name?: string;
  readonly commands?: readonly string[];
}): string {
  return `${alias.source}:${alias.spelling ?? alias.name ?? ''}:${(alias.commands ?? []).join(',')}`;
}

function symmetricDifference(left: ReadonlySet<string>, right: ReadonlySet<string>): string[] {
  return [
    ...[...left].filter(value => !right.has(value)).map(value => `manifest-only:${value}`),
    ...[...right].filter(value => !left.has(value)).map(value => `policy-only:${value}`),
  ].sort();
}

/**
 * Verify that the reviewed ownership ledger and executable control kernel are
 * bidirectionally complete. The ledger cannot silently bless a new alias, and
 * the kernel cannot acquire an unreviewed authority-bearing spelling.
 */
export async function controlOverrideOwnershipIssues(): Promise<
  readonly ControlOverrideOwnershipIssue[]
> {
  const issues: ControlOverrideOwnershipIssue[] = [];

  if (
    schema.$schema !== 'https://json-schema.org/draft/2020-12/schema' ||
    schema.properties.schemaVersion.const !== manifest.schemaVersion ||
    manifest.schemaVersion !== 1 ||
    manifest.defaultDecision !== 'deny'
  ) {
    issues.push({ code: 'schema-contract', detail: 'schema/version/default decision mismatch' });
  }

  if (JSON.stringify(manifest.sourcePrecedence) !== JSON.stringify(CONTROL_SOURCE_PRECEDENCE)) {
    issues.push({
      code: 'source-precedence',
      detail: `${manifest.sourcePrecedence.join(' < ')} != ${CONTROL_SOURCE_PRECEDENCE.join(' < ')}`,
    });
  }
  if (
    JSON.stringify(manifest.registryPrecedence.readInstall) !==
      JSON.stringify(REGISTRY_READ_SOURCE_PRECEDENCE) ||
    JSON.stringify(manifest.registryPrecedence.publish) !==
      JSON.stringify(REGISTRY_PUBLISH_SOURCE_PRECEDENCE)
  ) {
    issues.push({
      code: 'registry-precedence',
      detail: 'reviewed registry precedence differs from the executable resolver',
    });
  }

  const manifestControlIds = new Set<string>();
  for (const control of manifest.controls) {
    if (manifestControlIds.has(control.controlId)) {
      issues.push({ code: 'duplicate-control', detail: control.controlId });
    }
    manifestControlIds.add(control.controlId);
    if (control.defaultDecision !== 'deny') {
      issues.push({ code: 'default-not-deny', detail: control.controlId });
    }
  }
  const policyControlIds = new Set(CONTROL_POLICY.map(control => control.id));
  for (const detail of symmetricDifference(manifestControlIds, policyControlIds)) {
    issues.push({ code: 'control-drift', detail });
  }

  const manifestAliases = new Set(
    manifest.controls.flatMap(control =>
      control.aliases.map(alias =>
        aliasKey({ ...alias, commands: 'commands' in alias ? alias.commands : [] })
      )
    )
  );
  const policyAliases = new Set(
    CONTROL_POLICY.flatMap(control =>
      control.aliases.map(alias =>
        aliasKey({ source: alias.source, name: alias.name, commands: alias.commands })
      )
    )
  );
  for (const detail of symmetricDifference(manifestAliases, policyAliases)) {
    issues.push({ code: 'alias-drift', detail });
  }

  const reserved = manifest.reservedAuthoritySpellings.map(item => item.spelling);
  if (JSON.stringify(reserved) !== JSON.stringify(RESERVED_UNOWNED_BUN_CONTROLS)) {
    issues.push({
      code: 'reserved-drift',
      detail: `${reserved.join(',')} != ${RESERVED_UNOWNED_BUN_CONTROLS.join(',')}`,
    });
  }
  for (const item of manifest.reservedAuthoritySpellings) {
    if (item.defaultDecision !== 'deny') {
      issues.push({ code: 'default-not-deny', detail: item.spelling });
    }
  }

  if (
    manifest.compositeDenials.length !== 1 ||
    manifest.compositeDenials[0]?.spelling !== 'BUN_OPTIONS' ||
    manifest.compositeDenials[0]?.defaultDecision !== 'deny'
  ) {
    issues.push({ code: 'composite-denial-drift', detail: 'BUN_OPTIONS must be the exact denial' });
  }

  const applicationKeys = new Set<string>();
  for (const mode of manifest.applicationModes) {
    if (applicationKeys.has(mode.key)) {
      issues.push({ code: 'duplicate-application-mode', detail: mode.key });
    }
    applicationKeys.add(mode.key);
  }

  const owners = new Set([
    manifest.policyOwner,
    ...manifest.controls.map(control => control.owner),
    ...manifest.compositeDenials.map(control => control.owner),
    ...manifest.reservedAuthoritySpellings.map(control => control.owner),
    ...manifest.applicationModes.map(control => control.owner),
  ]);
  for (const owner of owners) {
    if (!(await Bun.file(resolvePath(import.meta.dir, '../..', owner)).exists())) {
      issues.push({ code: 'missing-owner', detail: owner });
    }
  }

  return issues;
}
