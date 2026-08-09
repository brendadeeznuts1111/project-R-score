// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';

const repositoryRoot = new URL('../', import.meta.url);

async function readJson(path: string): Promise<Record<string, unknown>> {
  return Bun.file(new URL(path, repositoryRoot)).json() as Promise<Record<string, unknown>>;
}

async function readText(path: string): Promise<string> {
  return Bun.file(new URL(path, repositoryRoot)).text();
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('expected record');
  }
  return value as Record<string, unknown>;
}

function rows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) throw new TypeError('expected row array');
  return value.map(record);
}

describe('partner dashboard proposal artifact', () => {
  test('derives its readiness counts and connector inventory from the TOML SSOT', async () => {
    const plan = record(
      Bun.TOML.parse(await readText('docs/design/partner-dashboard-mvp.toml'))
    );
    const proposal = await readJson(
      'docs/artifacts/partner-consolidation-status/artifact.json'
    );
    const coverage = await readJson('public/registry/partner-profile-coverage.json');
    const legacyOps = await readJson('public/registry/partners-ops.json');

    const packagePlan = record(plan.package);
    const components = record(packagePlan.components);
    const connectors = rows(plan.connectors);
    const concepts = record(plan.concepts);
    const snapshot = record(proposal.snapshot);
    const datasets = record(snapshot.datasets);
    const overview = rows(datasets.mvp_overview)[0]!;
    const connectorInventory = rows(datasets.connector_inventory);
    const evidence = record(coverage.evidenceByPartnerCode);
    const visiblePartners = rows(legacyOps.partners);

    expect(overview.implementedComponents).toBe(
      Object.values(components).filter(status => status === 'implemented').length
    );
    expect(overview.totalComponents).toBe(Object.keys(components).length);
    expect(overview.connectors).toBe(connectors.length);
    expect(overview.blockedConnectors).toBe(
      connectors.filter(connector => connector.implementation_status === 'blocked').length
    );
    expect(overview.semanticGaps).toBe(rows(concepts.gap).length);
    expect(overview.canonicalProfiles).toBe(Object.keys(evidence).length);
    expect(overview.profileTarget).toBe(visiblePartners.length);

    expect(
      connectorInventory.map(connector => ({
        connector: connector.connector,
        owner: connector.owner,
        port: connector.port,
        required: connector.required,
        status: connector.status,
      }))
    ).toEqual(
      connectors.map(connector => ({
        connector: connector.id,
        owner: connector.source_owner_domain,
        port: connector.port,
        required: connector.required ? 'yes' : 'no',
        status: connector.implementation_status,
      }))
    );
  });

  test('Sports Terminal integration-health is implemented; unsafe partnerRoutes stay unmounted', async () => {
    const [
      proposal,
      partnerRoutes,
      healthRoutes,
      apiRouter,
      serverEntry,
      app,
      partnersPage,
      auditSql,
      adapter,
      fixture,
    ] = await Promise.all([
      readJson('docs/artifacts/partner-consolidation-status/artifact.json'),
      readText('projects/active/sports-terminal-os/src/api/partner-routes.ts'),
      readText(
        'projects/active/sports-terminal-os/src/api/partner-integration-health-routes.ts'
      ),
      readText('projects/active/sports-terminal-os/src/api/router.ts'),
      readText('projects/active/sports-terminal-os/src/index.ts'),
      readText('projects/active/sports-terminal-os/src/frontend/App.tsx'),
      readText('projects/active/sports-terminal-os/src/frontend/pages/PartnersPage.tsx'),
      readText(
        'docs/artifacts/partner-consolidation-status/sql/sports-terminal-boundary.sql'
      ),
      readText('packages/partners/src/adapters/sports-terminal.ts'),
      readJson('public/registry/sports-terminal/partner-integration-health.json'),
    ]);

    // Full list/detail mutation surface remains a reference-only / unsafe boundary.
    expect(partnerRoutes).toContain('export function partnerRoutes(req: Request)');
    expect(partnerRoutes).toContain('url.pathname === "/api/partners"');
    // Unsafe list/detail module must stay unimported; only integration-health is mounted.
    expect(apiRouter).not.toContain('from "./partner-routes"');
    expect(apiRouter).not.toContain("from './partner-routes'");
    expect(serverEntry).not.toContain('partner-routes');
    expect(serverEntry).not.toContain('partnerRoutes');

    expect(app).toContain('<Route path="/partners" element={<PartnersPage />} />');
    expect(partnersPage).toContain('fetch(`${API_BASE}/partners?${params}`)');
    expect(partnersPage).toContain('fetch(`${API_BASE}/partners/${partnerId}/deposit`');

    // Dashboard-safe IntegrationHealthReadPort is mounted with auth required.
    expect(healthRoutes).toContain('handlePartnerIntegrationHealth');
    expect(healthRoutes).toContain('integer-minor-units-only');
    expect(healthRoutes).toContain('externalPartnerId');
    expect(apiRouter).toContain('handlePartnerIntegrationHealth');
    expect(apiRouter).toContain('partner-integration-health-routes');
    expect(apiRouter).toMatch(/integration-health/);
    expect(apiRouter).toContain('auth: "required"');
    expect(apiRouter).toContain('zone: "partners"');
    expect(adapter).toContain('parseSportsTerminalIntegrationHealth');
    expect(fixture).toMatchObject({
      schema: 'factorywager.sports-terminal-integration-health.v1',
      moneyPolicy: 'integer-minor-units-only',
    });

    const snapshot = record(proposal.snapshot);
    const datasets = record(snapshot.datasets);
    const sportsConnector = rows(datasets.connector_inventory).find(
      connector => connector.connector === 'sports-terminal'
    );
    expect(sportsConnector).toMatchObject({
      status: 'implemented',
      nextAction: 'integration-health',
    });
    expect(auditSql.match(/UNION ALL SELECT/g)).toHaveLength(4);
    expect(auditSql).toContain("'unsafe-input',");
    expect(auditSql).toContain("'implemented'");
    expect(auditSql).toContain('integration-health');
  });

});
