/**
 * Read-only comparison of scoped Access apps to the live Access application list.
 *
 * `scoped: true` means unlisted live apps are ignored. A missing scoped app, or a
 * difference in name, domain, or session duration, is drift. This module does not
 * call Cloudflare and does not change policy.
 */
import type { ScopedAccessApp } from './cloudflare-access-policy.ts';

export type AccessDriftField = 'name' | 'domain' | 'session-duration' | 'presence';

export type AccessDrift = {
  field: AccessDriftField;
  domain: string;
  policy: string;
  live: string;
};

export type AccessDriftReport = {
  ok: boolean;
  scopedCount: number;
  drifts: AccessDrift[];
};

type LiveAccessApp = {
  name: string;
  domain: string;
  sessionDuration: string;
};

function pushBucket(map: Map<string, LiveAccessApp[]>, key: string, app: LiveAccessApp): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(app);
  else map.set(key, [app]);
}

export function diffScopedAccessApps(
  policyApps: readonly ScopedAccessApp[],
  liveApps: readonly LiveAccessApp[]
): AccessDriftReport {
  const drifts: AccessDrift[] = [];
  const byDomain = new Map<string, LiveAccessApp[]>();
  const byName = new Map<string, LiveAccessApp[]>();

  for (const app of liveApps) {
    const live = {
      name: app.name.trim(),
      domain: app.domain.trim(),
      sessionDuration: app.sessionDuration.trim(),
    };
    pushBucket(byDomain, live.domain, live);
    pushBucket(byName, live.name, live);
  }

  for (const policy of policyApps) {
    const domainMatches = byDomain.get(policy.domain) ?? [];
    if (domainMatches.length > 1) {
      drifts.push({
        field: 'presence',
        domain: policy.domain,
        policy: policy.name,
        live: `${domainMatches.length} apps share this domain`,
      });
      continue;
    }

    const named = byName.get(policy.name) ?? [];
    const live = domainMatches[0] ?? (named.length === 1 ? named[0] : undefined);
    if (!live) {
      drifts.push({
        field: 'presence',
        domain: policy.domain,
        policy: policy.name,
        live: 'absent',
      });
      continue;
    }

    if (live.domain !== policy.domain) {
      drifts.push({
        field: 'domain',
        domain: policy.domain,
        policy: policy.domain,
        live: live.domain,
      });
    }
    if (live.name !== policy.name) {
      drifts.push({
        field: 'name',
        domain: policy.domain,
        policy: policy.name,
        live: live.name,
      });
    }
    if (live.sessionDuration !== policy.sessionDuration) {
      drifts.push({
        field: 'session-duration',
        domain: policy.domain,
        policy: policy.sessionDuration,
        live: live.sessionDuration,
      });
    }
  }

  return { ok: drifts.length === 0, scopedCount: policyApps.length, drifts };
}
