/**
 * Limit-raises monitoring/health UI surfaces (payload.limitRaises / artifacts.limitRaises).
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderMonitoringDashboard } from '../public/monitoring/monitoring-dashboard.js';

const ROOT = join(import.meta.dir, '..');

function baseMon(overrides: Record<string, unknown> = {}) {
  return {
    source: 'snapshot',
    packageCount: 1,
    versionCount: 1,
    lastIntegrity: { status: 'ok', failures: 0 },
    platformSummary: {},
    platformApiAvailable: { yes: 0, no: 0 },
    dodQueue: 0,
    dodByStatus: {},
    experimentsActive: 0,
    predictionN: 0,
    timestamp: '2026-07-28T12:00:00.000Z',
    env: { summary: { ok: 1, total: 1, requiredMissing: 0 } },
    routeStats: {
      routing: { passed: 1, total: 1, criticalFailed: 0, routes: [] },
    },
    ...overrides,
  };
}

describe('monitoring limitRaises tile', () => {
  test('renders partners / raises / lookback when payload.limitRaises present', () => {
    const view = renderMonitoringDashboard({
      mon: baseMon({
        limitRaises: {
          available: true,
          ok: true,
          partners: 9,
          raises: 11,
          lookbackHours: 48,
          generatedAt: '2026-07-28T14:16:36.111Z',
          path: '/registry/limit-raises.json',
          portal: '/portal/limits/',
        },
      }),
      monSource: '/registry/monitoring.json',
      ops: null,
    });
    expect(view.cardsHtml).toContain('Limit raises');
    expect(view.cardsHtml).toContain('11');
    expect(view.cardsHtml).toContain('9 partners');
    expect(view.cardsHtml).toContain('48h lookback');
    expect(view.cardsHtml).toContain('href="/portal/limits/"');
    expect(view.sectionsHtml).toContain('href="/portal/limits/"');
    expect(view.sectionsHtml).toContain('href="/registry/limit-raises.json"');
  });

  test('missing bake shows ops:snapshot hint (not degraded copy)', () => {
    const view = renderMonitoringDashboard({
      mon: baseMon(),
      monSource: '/api/monitoring',
      ops: null,
    });
    expect(view.cardsHtml).toContain('Limit raises');
    expect(view.cardsHtml).toContain('run ops:snapshot');
    expect(view.cardsHtml).not.toContain('degraded');
  });
});

describe('health-page limitRaises surface', () => {
  test('source wires artifacts.limitRaises like complianceBoard', () => {
    const src = readFileSync(join(ROOT, 'public/portal/health-page.js'), 'utf8');
    expect(src).toContain('artifacts?.limitRaises');
    expect(src).toContain("id: 'limit-raises'");
    expect(src).toContain("'limit-raises': {");
    expect(src).toContain('/portal/limits/');
    expect(src).toContain('/registry/limit-raises.json');
    expect(src).toContain('optional bake');
    expect(src).toContain('bun run ops:snapshot');
    // Missing bake must not use degraded wording
    const lrBlock = src.slice(src.indexOf('artifacts?.limitRaises'));
    expect(lrBlock).not.toMatch(/degraded/i);
  });
});

describe('account limit control surface', () => {
  test('committed artifact carries account profiles and jurisdiction policies', async () => {
    const artifact = await Bun.file(join(ROOT, 'public/registry/limit-raises.json')).json();
    expect(artifact.schemaVersion).toBe(3);
    expect(artifact.accountProfiles).toMatchObject({
      schemaVersion: 2,
      kind: 'account-limit-profiles',
      summary: {
        accounts: expect.any(Number),
        jurisdictions: 2,
        policies: 4,
      },
      sources: expect.arrayContaining([
        'partner_profile_bindings',
        'partner_account_limits',
        'regulatory_limits',
        'regulatory_violations',
      ]),
    });
    expect(artifact.accountProfiles.profiles.length).toBeGreaterThan(0);
    expect(artifact.accountProfiles.policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stateCode: 'MA',
          source: 'regulation-policy-catalog',
          policyKey: expect.stringMatching(/^policy\.MA\./),
        }),
        expect.objectContaining({
          stateCode: 'NJ',
          source: 'regulation-policy-catalog',
          policyKey: expect.stringMatching(/^policy\.NJ\./),
        }),
      ])
    );
    expect(artifact.accountProfiles.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'kpi.compliance.active_policies' }),
      ])
    );
  });

  test('board exposes profile, policy, trace, glossary, and URL fragment state', async () => {
    const [html, script] = await Promise.all([
      Bun.file(join(ROOT, 'public/portal/limits/index.html')).text(),
      Bun.file(join(ROOT, 'public/portal/limits/limit-profiles.js')).text(),
    ]);
    expect(html).toContain('id="account-control"');
    expect(html).toContain('id="jurisdiction-policy-body"');
    expect(html).toContain('id="compliance-policy-kpis"');
    expect(html).toContain('Policy artifact');
    expect(html).toContain('Account limits and policy controls');
    expect(html).toContain('href="#section:account-control"');
    expect(html).toContain('id="profile-filter-reset"');
    expect(html).toMatch(/#profile-jurisdiction\s*\{[^}]*font-weight:\s*700/s);
    expect(html).toContain('@media (max-width: 880px)');
    expect(html).toContain('/portal/glossary/#glossary:ops.limits.profile');
    expect(html).toContain('/portal/limits/limit-profiles.js');
    expect(script).toContain("new URLPattern({ hash: 'account\\\\::account' })");
    expect(script).toContain("new URLPattern({ hash: 'section\\\\::section' })");
    expect(script).toContain('hash.groups.account');
    expect(script).toContain('hash.groups.section');
    expect(script).toContain('url.searchParams.set(parameter, value)');
    expect(script).toContain('snapshot.accountProfiles');
    expect(script).toContain('policy.policyKey');
    expect(script).toContain('class="account-profile__metrics"');
    expect(script).toContain('aria-label="Evidence timeline"');
    expect(script).toContain("navigator.clipboard.writeText(url.href)");
    expect(script).toContain("history.pushState({ account: treeNodeId }, '', url)");
    expect(script).not.toContain('location.hash.slice');
  });
});
