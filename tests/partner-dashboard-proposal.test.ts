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

  test('keeps Sports Terminal blocked on exact API and HTML evidence', async () => {
    const [
      proposal,
      partnerRoutes,
      apiRouter,
      serverEntry,
      app,
      partnersPage,
      auditSql,
    ] = await Promise.all([
        readJson('docs/artifacts/partner-consolidation-status/artifact.json'),
        readText('projects/active/sports-terminal-os/src/api/partner-routes.ts'),
        readText('projects/active/sports-terminal-os/src/api/router.ts'),
        readText('projects/active/sports-terminal-os/src/index.ts'),
        readText('projects/active/sports-terminal-os/src/frontend/App.tsx'),
        readText('projects/active/sports-terminal-os/src/frontend/pages/PartnersPage.tsx'),
        readText(
          'docs/artifacts/partner-consolidation-status/sql/sports-terminal-boundary.sql'
        ),
      ]);

    expect(partnerRoutes).toContain('export function partnerRoutes(req: Request)');
    expect(partnerRoutes).toContain('url.pathname === "/api/partners"');
    expect(partnerRoutes).toContain('/api/partners/:id/sources/health');
    expect(apiRouter).not.toContain('partnerRoutes');
    expect(serverEntry).not.toContain('partnerRoutes');
    expect(app).toContain('<Route path="/partners" element={<PartnersPage />} />');
    expect(partnersPage).toContain('fetch(`${API_BASE}/partners?${params}`)');
    expect(partnersPage).toContain('fetch(`${API_BASE}/partners/${partnerId}/deposit`');

    const snapshot = record(proposal.snapshot);
    const datasets = record(snapshot.datasets);
    const sportsConnector = rows(datasets.connector_inventory).find(
      connector => connector.connector === 'sports-terminal'
    );
    expect(sportsConnector).toMatchObject({
      status: 'blocked',
      nextAction:
        'one exact parsed input, explicit external-ID resolution, authenticated route integration, and integer-minor-unit money wire are required',
    });
    expect(auditSql.match(/UNION ALL SELECT/g)).toHaveLength(3);
    expect(auditSql).toContain("'unsafe-input',");
    expect(auditSql).toContain("'candidate'");
  });
});
