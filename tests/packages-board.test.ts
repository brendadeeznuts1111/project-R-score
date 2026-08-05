// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, test, expect } from 'bun:test';
import {
  PACKAGES_MAP_SCHEMA,
  PACKAGES_RELATED_REGISTRY,
  actionHint,
  buildDependencyGraphModel,
  edgesForPackage,
  filterPackageRows,
  formatLoadError,
  formatRelativeAge,
  gradeFromScore,
  graphFocusSet,
  isKeyboardActivationKey,
  normalizePackagesMap,
  normalizePublishPlaneRow,
  renderDependencyGraphSvg,
  renderGlanceStrip,
  renderPageRegistrySvg,
  renderPublishPlaneCards,
  renderPublishPlaneTable,
  sortPackageRows,
  summarizePackageRoles,
  applyTableFilters,
  matchCapabilityRows,
} from '../public/portal/packages/packages-board.js';

describe('packages-board failure paths', () => {
  test('pins board schema v13', () => {
    expect(PACKAGES_MAP_SCHEMA).toBe(13);
  });

  test('related registry includes ssot soft-pass + pm-proof', () => {
    expect(PACKAGES_RELATED_REGISTRY).toContain('/registry/ssot-flow-soft.json');
    expect(PACKAGES_RELATED_REGISTRY).toContain('/registry/pm-proof.json');
  });

  test('board HTML hosts publish-plane soft-pass panel', async () => {
    const html = await Bun.file('public/portal/packages/index.html').text();
    expect(html).toContain('id="publish-plane-panel"');
    expect(html).toContain('id="publish-plane-body"');
    expect(html).toContain('id="publish-plane-kpis"');
    expect(html).toContain('id="pkg-search"');
    expect(html).toContain('id="pkg-role-mix"');
    expect(html).toContain('id="pkg-glance"');
    expect(html).toContain('id="board-grade-pill"');
    expect(html).toContain('packages-board.js?v=14');
    expect(html).toContain('artifactName');
    expect(html).toContain('artifactId');
    expect(html).not.toContain('Tennis board');
    const js = await Bun.file('public/portal/packages/packages-board.js').text();
    expect(js).toContain('loadPublishPlaneSoftPass');
    expect(js).toContain('renderPublishPlaneTable');
    expect(js).toContain('renderPublishPlaneCards');
    expect(js).toContain('renderGlanceStrip');
    expect(js).toContain('pending on edge');
    expect(js).toContain('hexByKey');
  });

  test('formatRelativeAge and package filter/sort helpers', () => {
    const now = Date.parse('2026-08-05T12:00:00.000Z');
    expect(formatRelativeAge('2026-08-05T11:30:00.000Z', now)).toBe('30m ago');
    expect(formatRelativeAge('2026-08-05T10:00:00.000Z', now)).toBe('2h ago');
    const pkgs = [
      { name: 'zebra', role: 'dormant', score: 80, bytes: 100 },
      { name: 'alpha', role: 'consumed', score: 100, bytes: 50 },
      { name: 'beta', role: 'consumed', score: 90, bytes: 200 },
    ];
    expect(filterPackageRows(pkgs, 'cons').map(p => p.name)).toEqual(['alpha', 'beta']);
    expect(sortPackageRows(pkgs, 'name').map(p => p.name)).toEqual(['alpha', 'beta', 'zebra']);
    expect(sortPackageRows(pkgs, 'score-desc')[0].name).toBe('alpha');
    expect(sortPackageRows(pkgs, 'size-desc')[0].name).toBe('beta');
  });

  test('normalizePublishPlaneRow keeps name and id distinct', () => {
    const row = normalizePublishPlaneRow(
      {
        artifactId: 'ssot-flow-soft',
        artifactName: 'SSOT soft-pass',
        plane: 'publish',
        purpose: 'audit',
        mode: 'soft',
        cli: 'bun run ssot:flow:soft',
        ok: true,
        summary: { passed: 4, failed: 0, total: 4, status: 'pass' },
        package: { name: '@tennis-hq/ssot', version: '9.9.9' },
        reportPath: '/registry/ssot-flow-soft.json',
      },
      {
        fallbackId: 'ssot-flow-soft',
        fallbackName: 'SSOT soft-pass',
        fallbackCli: 'bun run ssot:flow:soft',
      }
    );
    expect(row.artifactId).toBe('ssot-flow-soft');
    expect(row.artifactName).toBe('SSOT soft-pass');
    expect(row.artifactId).not.toBe(row.artifactName);
    expect(row.status).toBe('pass');
    expect(renderPublishPlaneTable([row])).toContain('artifactName');
    expect(renderPublishPlaneTable([row])).toContain('data-artifact-id="ssot-flow-soft"');
    const cards = renderPublishPlaneCards([row]);
    expect(cards).toContain('publish-kpi-card');
    expect(cards).toContain('data-artifact-id="ssot-flow-soft"');
    expect(cards).toContain('@tennis-hq/ssot');
  });

  test('publish-plane row surfaces color kernel keys', () => {
    const row = normalizePublishPlaneRow(
      {
        artifactId: 'pm-proof',
        artifactName: 'PM publish-plane proof',
        conceptId: 'publish.pm_proof',
        color: {
          conceptId: 'publish.pm_proof',
          colorKey: 'kalshi',
          token: '--partner-ops-kalshi',
          hex: '#58A6FF',
          css: 'oklch(0.7 0.14 250)',
        },
        modeColor: {
          conceptId: 'publish.mode.soft',
          colorKey: 'middleware',
          token: '--partner-ops-middleware',
          hex: '#D29922',
          css: 'oklch(0.7 0.14 90)',
        },
        mode: 'soft',
        summary: { passed: 8, skipped: 5, failed: 0, total: 8, status: 'pass' },
        reportPath: '/registry/pm-proof.json',
      },
      {
        fallbackId: 'pm-proof',
        fallbackName: 'PM publish-plane proof',
        fallbackCli: 'bun run verify:pm:save',
      }
    );
    expect(row.colorKey).toBe('kalshi');
    expect(row.conceptId).toBe('publish.pm_proof');
    expect(row.modeColorKey).toBe('middleware');
    const html = renderPublishPlaneTable([row]);
    expect(html).toContain('data-color-key="kalshi"');
    expect(html).toContain('publish.pm_proof');
    expect(html).toContain('pkg-color-swatch');
  });

  test('gradeFromScore matches monorepo-health bands', () => {
    expect(gradeFromScore(100)).toBe('healthy');
    expect(gradeFromScore(90)).toBe('healthy');
    expect(gradeFromScore(89.9)).toBe('needs-improvement');
    expect(gradeFromScore(59.9)).toBe('critical');
    expect(gradeFromScore(null)).toBe('unknown');
  });

  test('actionHint surfaces operator CLI', () => {
    expect(actionHint('wire-root-dep')).toContain('audit:packages:apply');
    expect(actionHint('migrate-relative-imports')).toContain('@factorywager');
    expect(actionHint('archive-candidate')).toContain('quarantine');
  });

  test('buildDependencyGraphModel lays out packages + external edges', () => {
    const model = buildDependencyGraphModel({
      packages: [
        { name: 'rip', role: 'consumed', score: 100 },
        { name: 'docs-tools', role: 'dormant', score: 85 },
      ],
      archiveProbes: [{ package: 'docs-tools' }],
      map: {
        packageEdges: [],
        externalEdges: [
          { fromPackage: 'docs-tools', targetPrefix: 'lib/docs', plane: 'lib', weight: 11 },
          { fromPackage: 'rip', targetPrefix: 'bare:bun', plane: 'bare', weight: 3 },
        ],
      },
    });
    expect(model.stats.packageNodes).toBe(2);
    expect(model.stats.externalNodes).toBe(2);
    expect(model.stats.edges).toBe(2);
    expect(model.nodes.find(n => n.id === 'docs-tools')?.archive).toBe(true);
    expect(model.nodes.every(n => typeof n.x === 'number' && typeof n.y === 'number')).toBe(true);
    const svg = renderDependencyGraphSvg(model);
    expect(svg).toContain('<svg');
    expect(svg).toContain('docs-tools');
    expect(svg).toContain('edge-ext');
    expect(svg).toContain('role="button"');
    expect(svg).toContain('tabindex="0"');
    expect(svg).toContain('aria-pressed="false"');
    // focus dimming
    const focused = renderDependencyGraphSvg(model, { focusId: 'rip' });
    expect(focused).toContain('focus');
    expect(focused).toContain(' dim');
    const neigh = graphFocusSet(model, 'rip');
    expect(neigh.has('rip')).toBe(true);
    expect(neigh.has('ext:bare:bun')).toBe(true);
    expect(edgesForPackage(model, 'docs-tools')).toHaveLength(1);
  });

  test('SVG preserves opaque scoped and external IDs in escaped attributes', () => {
    const model = buildDependencyGraphModel({
      packages: [{ name: '@factorywager/registry-client', role: 'consumed', score: 100 }],
      archiveProbes: [],
      map: {
        packageEdges: [],
        externalEdges: [
          {
            fromPackage: '@factorywager/registry-client',
            targetPrefix: 'bare:bun',
            plane: 'bare',
            weight: 1,
          },
        ],
      },
    });
    const svg = renderDependencyGraphSvg(model, {
      focusId: '@factorywager/registry-client',
    });
    expect(svg).toContain('data-id="@factorywager/registry-client"');
    expect(svg).toContain('data-id="ext:bare:bun"');
    expect(svg).toContain('data-from="@factorywager/registry-client"');
    expect(svg).toContain('aria-pressed="true"');
  });

  test('keyboard activation recognizes Enter and Space only', () => {
    expect(isKeyboardActivationKey('Enter')).toBe(true);
    expect(isKeyboardActivationKey(' ')).toBe(true);
    expect(isKeyboardActivationKey('Spacebar')).toBe(false);
    expect(isKeyboardActivationKey('Escape')).toBe(false);
  });

  test('table rows expose keyboard and selected-state semantics', async () => {
    const source = await Bun.file('public/portal/packages/packages-board.js').text();
    expect(source).toContain('tr.tabIndex = 0');
    expect(source).toContain("tr.setAttribute('aria-selected', 'false')");
    expect(source).toContain("tr.addEventListener('keydown'");
    expect(source).toContain('isKeyboardActivationKey(event.key)');
  });

  test('normalizePackagesMap accepts bake shape', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 13,
        kind: 'packages-graph-map',
        generatedAt: 't',
        bunVersion: '1.4.0',
        score: 100,
        grade: 'healthy',
        board: '/portal/packages/',
        openActions: [
          {
            package: 'p2p',
            action: 'archive-candidate',
            reason: 'no outside imports',
          },
        ],
        glance: {
          score: 100,
          grade: 'healthy',
          packageCount: 1,
          consumed: 1,
          dormant: 0,
          openActions: 1,
          avgPackageScore: 100,
          orphanCount: 0,
          cycleCount: 0,
          hubCount: 2,
          externalEdges: 3,
          crossPackageEdges: 0,
          topHub: 'lib/docs',
          surfacesPages: 18,
          surfacesRegOrphan: 0,
        },
        totals: {
          orphanCount: 0,
          cycleCount: 0,
          hubCount: 2,
          externalEdges: 3,
          crossPackageEdges: 0,
          openActions: 1,
          avgPackageScore: 100,
        },
        packages: [{ name: 'rip', score: 100, role: 'consumed', orphans: 0, bytes: 1024 }],
        surfaces: {
          summary: {
            workspaceMembers: 8,
            packagesPlane: 6,
            otherWorkspaces: 2,
            portalPages: 18,
            chromeComponents: 11,
            brandAssets: 20,
            registryTopLevelJson: 54,
          },
          planes: [
            {
              id: 'packages-graph',
              label: 'packages/* import graph',
              count: 6,
              note: 'coupling only',
            },
          ],
          workspaces: [
            {
              path: 'packages/rip',
              name: '@factorywager/rip',
              plane: 'packages',
              inPackagesGraph: true,
            },
          ],
          portal: {
            chromeComponents: [{ id: 'topbar', path: '/portal/topbar.js', kind: 'module' }],
          },
          brand: { tenants: ['factory'], assets: [] },
        },
        map: {
          summary: { openActions: 1, avgPackageScore: 100, archivePlaceholders: 0 },
          actions: [
            { package: 'rip', action: 'ok', reason: 'aligned' },
            {
              package: 'p2p',
              action: 'archive-candidate',
              reason: 'no outside imports',
            },
          ],
          archiveProbes: [],
          quarantine: [{ package: 'package', reason: 'placeholder', blockedBy: ['tsconfig.json'] }],
          env: {
            schemaVersion: 3,
            uniqueVars: 1,
            summary: { ownerCount: 1, packageTouchedKeys: 1, multiPlaneKeys: 0 },
            owners: [{ envKey: 'REDIS_URL', count: 2, packages: ['p2p'], planes: ['packages'] }],
            defaultsIssues: { total: 0 },
            runtime: { root: { templateKeysMissing: 0 } },
          },
        },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(true);
    expect(data.schemaStatus).toBe('current');
    expect(data.schemaDegraded).toBe(false);
    expect(data.packages).toHaveLength(1);
    expect(data.summary.openActions).toBe(1);
    expect(data.board).toBe('/portal/packages/');
    expect(data.openActions).toHaveLength(1);
    expect(data.openActions[0].package).toBe('p2p');
    expect(data.glance?.topHub).toBe('lib/docs');
    expect(data.glance?.externalEdges).toBe(3);
    expect(renderGlanceStrip(data.glance)).toContain('pkg-glance-strip');
    expect(renderGlanceStrip(data.glance)).toContain('lib/docs');
    expect(data.quarantine).toHaveLength(1);
    expect(data.env?.owners?.[0]?.envKey).toBe('REDIS_URL');
    expect(data.surfaces?.summary?.registryTopLevelJson).toBe(54);
    expect(data.surfaces?.planes?.[0]?.id).toBe('packages-graph');
  });

  test('normalizePackagesMap accepts legacy schema v12', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 12,
        packages: [{ name: 'rip', score: 100, role: 'consumed', orphans: 0, bytes: 1 }],
        map: { summary: {}, actions: [], archiveProbes: [] },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(true);
    expect(data.schemaStatus).toBe('legacy');
    expect(data.schemaDegraded).toBe(false);
    expect(data.surfaces).toBeNull();
  });

  test('normalizePackagesMap rejects empty payload', () => {
    expect(() => normalizePackagesMap(null as never, 'x')).toThrow(/empty|object/i);
  });

  test('schema mismatch still renders with schemaOk=false', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 9,
        packages: [],
        map: { summary: {}, actions: [], archiveProbes: [] },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(false);
    expect(data.schemaStatus).toBe('unsupported');
    expect(data.schemaDegraded).toBe(true);
    expect(data.schemaVersion).toBe(9);
  });

  test('missing and invalid schema versions are explicitly degraded', () => {
    const missing = normalizePackagesMap(
      {
        packages: [],
        map: { summary: {}, actions: [], archiveProbes: [] },
      },
      '/registry/packages-graph-map.json'
    );
    const invalid = normalizePackagesMap(
      {
        schemaVersion: '13',
        packages: [],
        map: { summary: {}, actions: [], archiveProbes: [] },
      },
      '/registry/packages-graph-map.json'
    );

    expect(missing.schemaVersion).toBeNull();
    expect(missing.schemaStatus).toBe('missing');
    expect(missing.schemaOk).toBe(false);
    expect(missing.schemaDegraded).toBe(true);
    expect(invalid.schemaVersion).toBeNull();
    expect(invalid.schemaStatus).toBe('invalid');
    expect(invalid.schemaOk).toBe(false);
    expect(invalid.schemaDegraded).toBe(true);
  });

  test('formatLoadError stringifies Errors', () => {
    expect(formatLoadError(new Error('HTTP 404'))).toBe('HTTP 404');
    expect(formatLoadError('boom')).toBe('boom');
  });

  test('renderPageRegistrySvg bipartite page→registry', () => {
    const svg = renderPageRegistrySvg([
      {
        page: 'ops',
        registryPath: '/registry/ops-summary.json',
        family: 'ops',
        weight: 3,
      },
      {
        page: 'health',
        registryPath: '/registry/monorepo-health.json',
        family: 'health',
        weight: 2,
      },
    ]);
    expect(svg).toContain('page-reg-svg');
    expect(svg).toContain('ops');
    expect(svg).toContain('ops-summary');
    expect(svg).toContain('edge-page-reg');
  });

  test('summarizePackageRoles counts roles grades and orphans', () => {
    const s = summarizePackageRoles([
      { name: 'a', role: 'consumed', score: 100, orphans: 0 },
      { name: 'b', role: 'dormant', score: 85, orphans: 2 },
      { name: 'c', role: 'root-tooling', score: 50, orphans: 0 },
    ]);
    expect(s.roles.consumed).toBe(1);
    expect(s.roles.dormant).toBe(1);
    expect(s.roles['root-tooling']).toBe(1);
    expect(s.grades.healthy).toBe(1);
    expect(s.grades['needs-improvement']).toBe(1);
    expect(s.grades.critical).toBe(1);
    expect(s.orphanFiles).toBe(2);
    expect(s.count).toBe(3);
  });

  test('matchCapabilityRows finds package mentions', () => {
    const hits = matchCapabilityRows(
      [
        { capability: 'Package graph bake', usedIn: 'portal-cli pm graph', status: 'Implemented' },
        { capability: 'Vault', usedIn: 'secret inject', status: 'Implemented' },
      ],
      'graph'
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.capability).toContain('Package graph');
  });
});
