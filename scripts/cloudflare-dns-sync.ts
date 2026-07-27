#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * cloudflare-dns-sync — idempotent DNS-as-code for factory-wager.com email records.
 *
 * Usage:
 *   bun scripts/cloudflare-dns-sync.ts            # dry-run (default): print diff only
 *   bun scripts/cloudflare-dns-sync.ts --apply    # apply deltas via Cloudflare API
 *   bash scripts/cloudflare-dns-sync.sh --apply   # same, via bash wrapper
 *
 * Auth: CLOUDFLARE_DNS_API_TOKEN (env, or ~/.reasonix/.env as fallback).
 *   Required token scope: Zone.DNS:Read for dry-run, Zone.DNS:Edit for --apply,
 *   scoped to the factory-wager.com zone. Mint in the Cloudflare dashboard, store
 *   in Proton vault item `Cloudflare API Token (DNS)`, then
 *   `bun run proton:inject:factorywager:reasonix`.
 *
 * Secrets: the token is never printed. DKIM CNAME targets are per-domain values
 * from the Proton dashboard (Domain names → factory-wager.com → DKIM) and are
 * read from PROTON_DKIM_TARGET_1/2/3 env vars — never hardcode them here.
 *
 * Env overrides: CF_ZONE_ID, CF_API_BASE.
 */

const ZONE_ID = Bun.env.CF_ZONE_ID ?? 'a3b7ba4bb62cb1b177b04b8675250674'; // factory-wager.com
const API_BASE = Bun.env.CF_API_BASE ?? 'https://api.cloudflare.com/client/v4';
const APPLY = Bun.argv.includes('--apply');

interface DesiredRecord {
  type: 'MX' | 'TXT' | 'CNAME';
  name: string;
  content: string;
  priority?: number;
  proxied?: boolean;
}

interface LiveRecord {
  id: string; // brand-ok — opaque Cloudflare API record primary key (wire DTO)
  type: string;
  name: string;
  content: string;
  priority?: number;
  proxied: boolean;
}

function desiredRecords(): { records: DesiredRecord[]; warnings: string[] } {
  const warnings: string[] = [];
  const records: DesiredRecord[] = [
    { type: 'MX', name: 'factory-wager.com', content: 'mail.protonmail.ch', priority: 10 },
    { type: 'MX', name: 'factory-wager.com', content: 'mailsec.protonmail.ch', priority: 20 },
    {
      type: 'TXT',
      name: 'factory-wager.com',
      content: 'protonmail-verification=96c089f0b6b18c1c28ff042ec54b48c7d6fe4daf',
    },
    {
      type: 'TXT',
      name: 'factory-wager.com',
      content: 'v=spf1 include:_spf.protonmail.ch ~all',
    },
    {
      type: 'TXT',
      name: '_dmarc.factory-wager.com',
      content:
        'v=DMARC1; p=quarantine; rua=mailto:admin@factory-wager.com; ruf=mailto:admin@factory-wager.com; fo=1',
    },
  ];

  const dkimNames = [
    'protonmail._domainkey.factory-wager.com',
    'protonmail2._domainkey.factory-wager.com',
    'protonmail3._domainkey.factory-wager.com',
  ];
  dkimNames.forEach((name, i) => {
    const target = Bun.env[`PROTON_DKIM_TARGET_${i + 1}`];
    if (!target) {
      warnings.push(
        `PROTON_DKIM_TARGET_${i + 1} unset — skipping ${name} (get value from Proton dashboard → Domain names → DKIM)`
      );
      return;
    }
    records.push({ type: 'CNAME', name, content: target, proxied: false });
  });

  return { records, warnings };
}

async function resolveToken(): Promise<string> {
  if (Bun.env.CLOUDFLARE_DNS_API_TOKEN) return Bun.env.CLOUDFLARE_DNS_API_TOKEN;
  const envFile = Bun.file(`${Bun.env.HOME}/.reasonix/.env`);
  if (await envFile.exists()) {
    for (const line of (await envFile.text()).split('\n')) {
      const m = line.match(/^CLOUDFLARE_DNS_API_TOKEN=(.*)$/);
      if (m) return m[1]!.trim().replace(/^["']|["']$/g, '');
    }
  }
  console.error(
    'ERROR: CLOUDFLARE_DNS_API_TOKEN not found in env or ~/.reasonix/.env — run `bun run proton:inject:factorywager:reasonix`'
  );
  process.exit(1);
}

async function cfApi(
  token: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; result?: unknown; errors: unknown[] }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res
    .json()
    .catch(() => ({ success: false, errors: [{ message: 'non-JSON response' }] }))) as {
    success: boolean;
    result?: unknown;
    errors?: unknown[];
  };
  return {
    ok: res.ok && json.success,
    status: res.status,
    result: json.result,
    errors: json.errors ?? [],
  };
}

async function main(): Promise<void> {
  const token = await resolveToken();
  const { records: desired, warnings } = desiredRecords();
  for (const w of warnings) console.warn(`WARN: ${w}`);

  const list = await cfApi(token, 'GET', `/zones/${ZONE_ID}/dns_records?per_page=100`);
  if (!list.ok) {
    console.error(
      `ERROR: list dns_records failed HTTP ${list.status}: ${JSON.stringify(list.errors)}`
    );
    if (list.status === 403) console.error('Token lacks Zone.DNS:Read for this zone.');
    process.exit(1);
  }
  const live = list.result as LiveRecord[];

  type Op =
    | { action: 'create'; desired: DesiredRecord }
    | { action: 'update'; desired: DesiredRecord; live: LiveRecord };
  const ops: Op[] = [];

  for (const d of desired) {
    const exact = live.find(
      r =>
        r.type === d.type &&
        r.name === d.name &&
        r.content === d.content &&
        (d.type !== 'MX' || r.priority === d.priority) &&
        (d.type !== 'CNAME' || r.proxied === (d.proxied ?? false))
    );
    if (exact) continue;
    if (d.type === 'CNAME') {
      // One CNAME per name: safe to update in place when the target/proxy flag drifts.
      const sameName = live.find(r => r.type === d.type && r.name === d.name);
      if (sameName) {
        ops.push({ action: 'update', desired: d, live: sameName });
        continue;
      }
    }
    if (d.type === 'MX') {
      // Same host, wrong priority: update in place; otherwise create.
      const sameContent = live.find(
        r => r.type === 'MX' && r.name === d.name && r.content === d.content
      );
      if (sameContent) {
        ops.push({ action: 'update', desired: d, live: sameContent });
        continue;
      }
    }
    // TXT is create-only: multiple TXT records can share a name (SPF + verification),
    // so a content mismatch never means "update the other record".
    ops.push({ action: 'create', desired: d });
  }

  if (ops.length === 0) {
    console.log('IN SYNC: all desired records match live zone state.');
    return;
  }

  console.log(`${APPLY ? 'APPLYING' : 'DRY-RUN (pass --apply to mutate)'}: ${ops.length} delta(s)`);
  for (const op of ops) {
    const d = op.desired;
    const extra =
      d.type === 'MX'
        ? ` priority=${d.priority}`
        : d.type === 'CNAME'
          ? ` proxied=${d.proxied ?? false}`
          : '';
    console.log(`  ${op.action.toUpperCase()} ${d.type} ${d.name} -> ${d.content}${extra}`);
  }
  if (!APPLY) return;

  let failed = 0;
  for (const op of ops) {
    const d = op.desired;
    const payload: Record<string, unknown> = { type: d.type, name: d.name, content: d.content };
    if (d.type === 'MX') payload.priority = d.priority;
    if (d.type === 'CNAME') payload.proxied = d.proxied ?? false;
    const res =
      op.action === 'create'
        ? await cfApi(token, 'POST', `/zones/${ZONE_ID}/dns_records`, payload)
        : await cfApi(token, 'PUT', `/zones/${ZONE_ID}/dns_records/${op.live.id}`, payload);
    if (!res.ok) {
      failed++;
      console.error(
        `ERROR: ${op.action} ${d.type} ${d.name} failed HTTP ${res.status}: ${JSON.stringify(res.errors)}`
      );
      if (res.status === 403)
        console.error('Token lacks Zone.DNS:Edit — see docs/harness/tenants/proton-integration.md');
    }
  }
  if (failed > 0) process.exit(1);
  console.log('APPLIED: all deltas succeeded.');
}

if (import.meta.main) {
  await main();
}
