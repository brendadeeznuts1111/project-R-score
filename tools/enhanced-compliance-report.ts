#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Per-state limit details + shadow compliance report (signed table).
 *
 *   # needs mock server (or auto-embeds one when COMPLIANCE_URL unset)
 *   bun run ops:compliance:report
 *   bun --console-depth=6 run tools/enhanced-compliance-report.ts
 *   bun tools/enhanced-compliance-report.ts --html > /tmp/compliance.html
 *   cat tools/enhanced-compliance-report.ts | bun --console-depth=6 run -
 *
 * Env:
 *   COMPLIANCE_URL — base URL (default: embed mock on 127.0.0.1:0)
 *   COMPLIANCE_REPORT_NO_EMBED=1 — require external COMPLIANCE_URL only
 */
import { deepEquals } from '../lib/deep-equals.ts';
import { escapeHtml } from '../lib/escape-html.ts';
import { getConsoleDepth, inspect as inspectDepth } from '../lib/console-depth.ts';
import { startStateComplianceMock } from '../lib/operations/state-compliance-http.ts';
import {
  buildReportProofFromValue,
  formatReportProofLines,
  proofScoreHints,
} from '../lib/security/report-proof.ts';

const TEST_BET = {
  sportId: 'soccer',
  marketId: 'match_winner',
  wagerAmount: 500,
  betType: 'straight',
} as const;

const PARTNERS = [
  { nodeId: 'demo-ma-licensed', expectedLicense: 'active' as const },
  { nodeId: 'demo-nj-licensed', expectedLicense: 'active' as const },
  { nodeId: 'demo-dual-licensed', expectedLicense: 'active' as const },
  { nodeId: 'demo-unlicensed', expectedLicense: null },
] as const;

const STATES = ['MA', 'NJ'] as const;

type CheckDecision = { allowed: boolean; reason?: string; shadow?: boolean };

type LimitRow = {
  sport_id?: string; // brand-ok — regulatory catalog key from status API
  market_id?: string; // brand-ok — regulatory catalog key from status API
  max_wager?: number | null;
};

type StateInfo = {
  state: string;
  partner: string;
  licenseStatus: string | null;
  limits: LimitRow[];
  realCheck: CheckDecision;
  shadowCheck: CheckDecision;
  expectedLicense: string | null;
};

function stringWidth(s: string): number {
  return Bun.stringWidth(s);
}

function pad(s: string, w: number): string {
  const padLen = Math.max(0, w - stringWidth(s));
  return s + ' '.repeat(padLen);
}

class ComplianceReportTable {
  rows: Array<{ cols: string[]; meta: StateInfo }>;
  columns: Array<{ key: string; w: number }>;

  constructor(data: StateInfo[]) {
    this.columns = [
      { key: 'State', w: 0 },
      { key: 'Partner', w: 0 },
      { key: 'License', w: 0 },
      { key: 'Limit Details', w: 0 },
      { key: 'Real Check', w: 0 },
      { key: 'Shadow Check', w: 0 },
      { key: 'Match?', w: 0 },
    ];
    this.rows = data.map(r => {
      const realStr = r.realCheck.allowed
        ? 'ALLOW'
        : `BLOCK (${truncate(r.realCheck.reason ?? 'deny', 40)})`;
      const shadowStr = r.shadowCheck.allowed
        ? 'ALLOW'
        : `BLOCK (${truncate(r.shadowCheck.reason ?? 'deny', 40)})`;
      const match = deepEquals(
        { allowed: r.realCheck.allowed, reason: r.realCheck.reason },
        { allowed: r.shadowCheck.allowed, reason: r.shadowCheck.reason }
      )
        ? '✅'
        : '⚠️ shadow differs';
      const limitStr =
        r.limits.length === 0
          ? 'none'
          : r.limits
              .map(l => `${l.sport_id ?? '?'}/${l.market_id ?? '?'}: $${l.max_wager ?? '—'}`)
              .join(', ');

      return {
        cols: [
          r.state,
          r.partner,
          r.licenseStatus ?? 'unlicensed',
          limitStr,
          realStr,
          shadowStr,
          match,
        ],
        meta: r,
      };
    });
    this.calcWidths();
  }

  calcWidths(): void {
    for (let i = 0; i < this.columns.length; i++) {
      let max = stringWidth(this.columns[i]!.key);
      for (const r of this.rows) {
        max = Math.max(max, stringWidth(r.cols[i]!));
      }
      this.columns[i]!.w = max + 2;
    }
  }

  /** Custom inspect for aligned box table. */
  [Bun.inspect.custom](): string {
    const w = this.columns.map(c => c.w);
    const top = '┌' + w.map(n => '─'.repeat(n)).join('┬') + '┐';
    const mid = '├' + w.map(n => '─'.repeat(n)).join('┼') + '┤';
    const bot = '└' + w.map(n => '─'.repeat(n)).join('┴') + '┘';
    const header = '│' + this.columns.map((c, i) => pad(c.key, w[i]!)).join('│') + '│';
    const lines = [top, header, mid];
    for (const r of this.rows) {
      lines.push('│' + r.cols.map((c, i) => pad(c, w[i]!)).join('│') + '│');
    }
    lines.push(bot);
    return lines.join('\n');
  }

  toString(): string {
    return this[Bun.inspect.custom]();
  }
}

function truncate(s: string, max: number): string {
  if (stringWidth(s) <= max) return s;
  let out = '';
  for (const ch of s) {
    if (stringWidth(out + ch + '…') > max) break;
    out += ch;
  }
  return out + '…';
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Non-JSON from ${url} (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
}

async function fetchStatus(
  base: string,
  partner: string,
  state: string
): Promise<{ licenseStatus: string | null; limits: LimitRow[] }> {
  const url = `${base.replace(/\/$/, '')}/api/compliance/status?nodeId=${encodeURIComponent(partner)}&state=${encodeURIComponent(state)}`;
  const body = (await fetchJson(url)) as {
    ok?: boolean;
    regulatory?: {
      license?: { status?: string } | null;
      limits?: LimitRow[];
    };
  };
  return {
    licenseStatus: body.regulatory?.license?.status ?? null,
    limits: body.regulatory?.limits ?? [],
  };
}

async function checkBet(
  base: string,
  partner: string,
  state: string,
  shadow: boolean
): Promise<CheckDecision> {
  const root = base.replace(/\/$/, '');
  const url = `${root}/api/compliance/check${shadow ? '?shadow=true' : ''}`;
  const body = (await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodeId: partner,
      stateCode: state,
      ...TEST_BET,
      // real path: do not double-spam violation log during report matrix
      logViolation: !shadow && false,
    }),
  })) as {
    allowed?: boolean;
    reason?: string;
    error?: string;
    shadow?: boolean;
  };

  return {
    allowed: body.allowed === true,
    reason: body.reason ?? body.error,
    shadow: body.shadow === true,
  };
}

async function buildRows(base: string): Promise<StateInfo[]> {
  const rows: StateInfo[] = [];
  for (const partner of PARTNERS) {
    for (const state of STATES) {
      const status = await fetchStatus(base, partner.nodeId, state);
      const real = await checkBet(base, partner.nodeId, state, false);
      const shadow = await checkBet(base, partner.nodeId, state, true);
      rows.push({
        state,
        partner: partner.nodeId,
        licenseStatus: status.licenseStatus,
        limits: status.limits,
        realCheck: real,
        shadowCheck: shadow,
        expectedLicense: partner.expectedLicense,
      });
    }
  }
  return rows;
}

function summaryLine(rows: StateInfo[]): string {
  const mismatches = rows.filter(
    r =>
      !deepEquals(
        { allowed: r.realCheck.allowed, reason: r.realCheck.reason },
        { allowed: r.shadowCheck.allowed, reason: r.shadowCheck.reason }
      )
  ).length;
  const allows = rows.filter(r => r.realCheck.allowed).length;
  const blocks = rows.length - allows;
  return `rows=${rows.length} allow=${allows} block=${blocks} shadowMismatches=${mismatches}`;
}

async function resolveBase(): Promise<{ base: string; stop?: () => void }> {
  const envUrl = Bun.env.COMPLIANCE_URL?.trim();
  if (envUrl) return { base: envUrl };

  if (Bun.env.COMPLIANCE_REPORT_NO_EMBED === '1') {
    throw new Error('COMPLIANCE_URL required when COMPLIANCE_REPORT_NO_EMBED=1');
  }

  const { server, url } = startStateComplianceMock({ port: 0, log: false });
  return {
    base: url,
    stop: () => server.stop(true),
  };
}

function reportToHtml(data: StateInfo[], base: string, sig: string): string {
  const body = data
    .map(r => {
      const match = deepEquals(
        { allowed: r.realCheck.allowed, reason: r.realCheck.reason },
        { allowed: r.shadowCheck.allowed, reason: r.shadowCheck.reason }
      );
      const real = r.realCheck.allowed ? 'ALLOW' : `BLOCK (${r.realCheck.reason ?? 'deny'})`;
      const shadow = r.shadowCheck.allowed ? 'ALLOW' : `BLOCK (${r.shadowCheck.reason ?? 'deny'})`;
      const limits =
        r.limits.length === 0
          ? 'none'
          : r.limits
              .map(l => `${l.sport_id ?? '?'}/${l.market_id ?? '?'}: $${l.max_wager ?? '—'}`)
              .join(', ');
      return `<tr class="${match ? 'pass' : 'fail'}">
  <td>${escapeHtml(r.state)}</td>
  <td>${escapeHtml(r.partner)}</td>
  <td>${escapeHtml(r.licenseStatus ?? 'unlicensed')}</td>
  <td>${escapeHtml(limits)}</td>
  <td>${escapeHtml(real)}</td>
  <td>${escapeHtml(shadow)}</td>
  <td>${match ? 'match' : 'shadow differs'}</td>
</tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml('State compliance shadow report')}</title>
  <style>
    body{font:14px/1.4 system-ui,sans-serif;margin:2rem;background:#0b0f14;color:#e6edf3}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #30363d;padding:.4rem .6rem}
    th{background:#161b22;text-align:left}
    tr.pass td:last-child{color:#3fb950}
    tr.fail td:last-child{color:#f85149}
    .meta{color:#8b949e;margin-bottom:1rem}
  </style>
</head>
<body>
  <h1>State-Specific Limits &amp; Shadow Check Report</h1>
  <p class="meta">${escapeHtml(new Date().toISOString())} · base=${escapeHtml(base)} ·
    depth=${escapeHtml(getConsoleDepth())} · sha256=${escapeHtml(sig)}</p>
  <table>
    <thead>
      <tr>
        <th>State</th><th>Partner</th><th>License</th><th>Limits</th>
        <th>Real</th><th>Shadow</th><th>Match</th>
      </tr>
    </thead>
    <tbody>
${body}
    </tbody>
  </table>
</body>
</html>
`;
}

async function main(): Promise<void> {
  if (Bun.argv.includes('--help') || Bun.argv.includes('-h')) {
    console.info(`Usage:
  bun run ops:compliance:report
  bun --console-depth=6 tools/enhanced-compliance-report.ts
  bun tools/enhanced-compliance-report.ts --html > /tmp/compliance.html
`);
    return;
  }

  const { base, stop } = await resolveBase();
  try {
    const data = await buildRows(base);
    const table = new ComplianceReportTable(data);

    const stableBody = {
      kind: 'enhanced-compliance-report',
      testBet: TEST_BET,
      rows: data.map(r => ({
        state: r.state,
        partner: r.partner,
        licenseStatus: r.licenseStatus,
        limits: r.limits.map(l => ({
          sport_id: l.sport_id,
          market_id: l.market_id,
          max_wager: l.max_wager,
        })),
        real: { allowed: r.realCheck.allowed, reason: r.realCheck.reason ?? null },
        shadow: { allowed: r.shadowCheck.allowed, reason: r.shadowCheck.reason ?? null },
      })),
      bunVersion: Bun.version,
    };
    const proof = buildReportProofFromValue(stableBody);
    const hints = proofScoreHints(proof);

    if (Bun.argv.includes('--html')) {
      console.log(reportToHtml(data, base, proof.digest));
      return;
    }

    console.log('State-Specific Limits & Shadow Check Report');
    console.log(`Base: ${base}`);
    console.log(
      `Depth: ${getConsoleDepth()} · score: ${hints.scoreHint} (use bun --console-depth=N for deeper inspect)`
    );
    console.log(inspectDepth(table));
    console.log(summaryLine(data));

    console.log('');
    for (const line of formatReportProofLines(proof)) {
      console.log(line);
    }

    console.log('\nFull detail (expand with --console-depth 6):');
    console.log(inspectDepth(data));

    const mismatches = data.filter(
      r =>
        !deepEquals(
          { allowed: r.realCheck.allowed, reason: r.realCheck.reason },
          { allowed: r.shadowCheck.allowed, reason: r.shadowCheck.reason }
        )
    ).length;
    if (mismatches > 0 && Bun.env.COMPLIANCE_REPORT_STRICT === '1') {
      process.exitCode = 1;
    }
  } finally {
    stop?.();
  }
}

if (import.meta.main) {
  await main();
}
