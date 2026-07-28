/**
 * Live DNS → Access → URL transition rows for CLI / agent tables.
 * Pure helpers over branded surfaces — no I/O.
 *
 * Spec: lib/types/branded/README.md § DNS / Access lineage
 * Planes: lib/http/host-planes.ts
 */
import {
  type AccessDomainId,
  type HostId,
  accessDomainFromHost,
  hostIdFromAccessDomain,
  hostIdFromParts,
  httpsUrlForAccessDomain,
  httpsUrlForHost,
  isPathScopedAccessDomain,
  pathFromAccessDomain,
  splitHostId,
  tryAccessDomainId,
  tryHostId,
  tryHostIdFromUrl,
} from '../types/branded.ts';

export type LineageTransitionRow = {
  step: string;
  from: string;
  op: string;
  to: string;
  note: string;
};

/** Canonical demo host used when none supplied. */
export const LINEAGE_DEMO_HOST = 'score.factory-wager.com';

/**
 * Transition matrix for one HostId — what operators / agents should see at a glance.
 * Access path defaults to `/portal` (path-scoped Access example).
 */
export function dnsAccessLineageRows(host: HostId, accessPath = '/portal'): LineageTransitionRow[] {
  const parts = splitHostId(host);
  const round = hostIdFromParts(parts.apex, parts.subdomain);
  const access = accessDomainFromHost(host, accessPath);
  const wholeAccess = accessDomainFromHost(host);
  const hostUrl = httpsUrlForHost(host);
  const accessUrl = httpsUrlForAccessDomain(access);
  const backHost = hostIdFromAccessDomain(access);
  const path = pathFromAccessDomain(access);

  return [
    {
      step: '1.split',
      from: String(host),
      op: 'splitHostId',
      to: `apex=${parts.apex} · sub=${parts.subdomain}`,
      note: parts.subdomain === '@' ? 'bare apex' : 'left labels + zone',
    },
    {
      step: '2.roundTrip',
      from: `apex+sub`,
      op: 'hostIdFromParts',
      to: String(round),
      note: String(round) === String(host) ? 'ok' : 'FAIL',
    },
    {
      step: '3.https',
      from: String(host),
      op: 'httpsUrlForHost',
      to: hostUrl,
      note: 'scheme outside HostId',
    },
    {
      step: '4.accessPath',
      from: String(host),
      op: `accessDomainFromHost(${accessPath})`,
      to: String(access),
      note: isPathScopedAccessDomain(access) ? `path=${path}` : 'whole-host',
    },
    {
      step: '5.accessUrl',
      from: String(access),
      op: 'httpsUrlForAccessDomain',
      to: accessUrl,
      note: 'no // in path',
    },
    {
      step: '6.accessBack',
      from: String(access),
      op: 'hostIdFromAccessDomain',
      to: String(backHost),
      note: String(backHost) === String(host) ? 'HostId again' : 'mismatch',
    },
    {
      step: '7.accessWhole',
      from: String(host),
      op: 'accessDomainFromHost()',
      to: String(wholeAccess),
      note: isPathScopedAccessDomain(wholeAccess) ? 'path-scoped' : 'whole-host Access',
    },
  ];
}

export type ResolvedLineageInput =
  | { kind: 'host'; host: HostId }
  | { kind: 'access'; access: AccessDomainId; host: HostId }
  | { kind: 'url'; host: HostId; url: string }
  | { kind: 'invalid'; raw: string };

/** Resolve a REPL/wire token into a HostId (or Access-derived host). */
export function resolveLineageInput(raw: string): ResolvedLineageInput {
  const t = raw.trim();
  if (!t) return { kind: 'invalid', raw: t };

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) {
    const host = tryHostIdFromUrl(t);
    if (host) return { kind: 'url', host, url: t };
    return { kind: 'invalid', raw: t };
  }

  const access = tryAccessDomainId(t);
  if (access && String(access).includes('/')) {
    return { kind: 'access', access, host: hostIdFromAccessDomain(access) };
  }

  const host = tryHostId(t);
  if (host) return { kind: 'host', host };

  return { kind: 'invalid', raw: t };
}
