import { beforeAll, describe, expect, it } from 'bun:test';
import {
  listUnregisteredPartnerConcepts,
  loadPartnerDashboardPlan,
  validatePartnerDashboardPlan,
} from '../scripts/validate-partner-dashboard-plan.ts';
import { PARTNER_DASHBOARD_SEMANTIC_GAPS } from '../packages/partners/src/index.ts';

let baseline: Record<string, any>;

beforeAll(async () => {
  baseline = await loadPartnerDashboardPlan();
});

function copyPlan(): Record<string, any> {
  return structuredClone(baseline);
}

describe('partner dashboard semantic plan', () => {
  it('validates the checked-in nomenclature, concept, connector, surface, route, and theme map', async () => {
    const result = await validatePartnerDashboardPlan(copyPlan());
    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual({
      bindings: 33,
      gaps: 15,
      connectors: 8,
      regions: 8,
      sectionMounts: 9,
      hashRoutes: 6,
      portalInputs: 8,
      portalRequiredInputs: 7,
      portalOptionalInputs: 1,
      presentationStates: 31,
      profileCoverageEntries: 0,
      missingProfileCoverage: 4,
    });
  });

  it('reports the exact package-owned unregistered concept map', () => {
    expect(listUnregisteredPartnerConcepts(copyPlan())).toEqual(
      [...PARTNER_DASHBOARD_SEMANTIC_GAPS]
        .map(gap => ({ ...gap, blocking: false }))
        .sort((left, right) =>
          left.candidate_concept_id.localeCompare(right.candidate_concept_id)
        )
    );
  });

  it('rejects documentation REF:ID, domain, and portal mapping drift', async () => {
    const plan = copyPlan();
    plan.documentation.ref_id = '0.1.wrong-partner-doc';
    plan.documentation.concept_domains = ['partners'];
    plan.documentation.chrome_domains = ['knowledge'];
    plan.documentation.primary_portal_href = '/portal/wrong/';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'documentation.ref_id must be 0.1.partner-dashboard-mvp'
    );
    expect(result.errors).toContain(
      'documentation.concept_domains must match the partner documentation SSOT'
    );
    expect(result.errors).toContain(
      'documentation.chrome_domains must match the partner documentation SSOT'
    );
    expect(result.errors).toContain(
      'documentation.primary_portal_href must be /portal/partners/'
    );
  });

  it('checks state axes against independent runtime constants', async () => {
    const plan = copyPlan();
    plan.lifecycle.states[0] = 'invented';
    plan.presentation.state.find(
      (state: Record<string, unknown>) =>
        state.axis === 'partnerLifecycleState' && state.value === 'signup'
    ).value = 'invented';
    plan.presentation.state.push({
      axis: 'rogueAxis',
      value: 'ok',
      theme_role: 'status_ok',
      label_required: true,
    });

    const result = await validatePartnerDashboardPlan(plan);
    expect(
      result.errors.some(error =>
        error.includes('presentation axis partnerLifecycleState mismatch')
      )
    ).toBe(true);
    expect(result.errors).toContain('presentation references unknown axis rogueAxis');
  });

  it('rejects wrong-kind, raw, and unresolvable theme values', async () => {
    const plan = copyPlan();
    plan.theme.roles.panel_default = 'layout.spacing.4';
    plan.theme.roles.status_ok = 'semantic.status.doesNotExist';
    plan.theme.components.panel.radius = 'layout.radii.doesNotExist';
    plan.theme.fallback = '#ffffff';

    const result = await validatePartnerDashboardPlan(plan);
    expect(
      result.errors.some(error => error.includes('theme role panel_default must resolve through layers.'))
    ).toBe(true);
    expect(result.errors.some(error => error.includes('theme role status_ok does not resolve'))).toBe(
      true
    );
    expect(
      result.errors.some(error => error.includes('theme.components.panel.radius does not resolve'))
    ).toBe(true);
    expect(result.errors.some(error => error.includes('theme.fallback contains a raw color'))).toBe(
      true
    );
  });

  it('rejects nomenclature, concept, and business-domain drift', async () => {
    const plan = copyPlan();
    plan.package.implementation_status = 'planned';
    plan.nomenclature.term[0].wire_path = 'partners[].wrong';
    plan.nomenclature.term[1].owner_domain = 'source-adapter';
    plan.concepts.binding[0].concept_id = 'page.doesNotExist';
    plan.concepts.gap[0].candidate_concept_id = 'page.partners';
    plan.surfaces.portal.regions[0].business_domains.push('not-a-domain');

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'package.implementation_status must be artifact-core-implemented'
    );
    expect(result.errors.some(error => error.includes('PartnerCode wire_path must be'))).toBe(true);
    expect(result.errors.some(error => error.includes('invalid owner_domain source-adapter'))).toBe(
      true
    );
    expect(result.errors.some(error => error.includes('unknown concept page.doesNotExist'))).toBe(
      true
    );
    expect(result.errors.some(error => error.includes('page.partners already exists'))).toBe(true);
    expect(result.errors).toContain('region has invalid business domain not-a-domain');
  });

  it('rejects profile coverage boundary drift into lifecycle or private facts', async () => {
    const plan = copyPlan();
    plan.shapes.profile_coverage_artifact.lifecycle_authority = true;
    plan.shapes.profile_coverage_artifact.public_fact_paths.push('telegram.chatId');
    plan.reconciliation.profile_precedence = ['legacy-ops-registry'];
    plan.reconciliation.profile_coverage = 'four-current-codes-or-explicit-migration-reason';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'profile coverage artifact must remain redacted identity evidence only'
    );
    expect(result.errors).toContain(
      'reconciliation must separate canonical profile authority from coverage readiness'
    );
  });

  it('rejects identifier and ingress translation drift from package parsers', async () => {
    const plan = copyPlan();
    plan.package.components.reconciliation = 'implemented';
    plan.shapes.dashboard_artifact.active_out_identity_field = 'hiddenCountOnly';
    plan.identity.partner_code.pattern = '^wrong$';
    plan.identity.out_id.implementation_status = 'planned';
    plan.ingress.stage = 'inside-core';
    plan.ingress.http.route_status = 'implemented';
    plan.ingress.mappings.legacy_seat_out_token.from_pattern = '^unsafe$';
    plan.ingress.mappings.legacy_seat_out_token.warning_emission_owner = 'translator';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'package component statuses must distinguish implemented artifact core from planned adapters'
    );
    expect(result.errors).toContain(
      'dashboard artifact must expose active OutIds and scalar-only conflict evidence'
    );
    expect(result.errors).toContain(
      'identity.partner_code must match the package-owned PartnerCode parser'
    );
    expect(result.errors).toContain(
      'identity.out_id must match the implemented canonical OutId parser'
    );
    expect(result.errors).toContain(
      'ingress must declare the implemented pre-core rejecting translator'
    );
    expect(result.errors).toContain(
      'ingress HTTP status must not claim an unwired canonical API contract'
    );
    expect(result.errors).toContain(
      'legacy seat OutId mapping must match the package ingress translator'
    );
  });

  it('rejects out capability and execution-constraint axis drift', async () => {
    const plan = copyPlan();
    plan.package.components.out_capability_contract = 'planned';
    plan.package.components.bookmaker_account_resolver = 'planned';
    plan.package.components.tennis_capacity_adapter = 'planned';
    plan.shapes.out_capability_snapshot.schema = 'factorywager.partner-out-capability.v2';
    plan.adapters.bookmaker_account_resolver.unknown_host_policy = 'guess-parent-domain';
    plan.adapters.bookmakers_catalog.ops_only_field_policy = 'allow';
    plan.adapters.tennis_capacity.execution_evidence_policy = 'offline-is-good-enough';
    plan.out_capabilities.bet_structures = ['straight', 'parlay'];
    plan.out_capabilities.limit_kinds = ['max_stake'];
    plan.out_capabilities.promotions_gate_execution = true;
    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain('package component statuses must distinguish implemented artifact core from planned adapters');
    expect(result.errors).toContain('out capability snapshot must match the implemented private preflight contract');
    expect(result.errors).toContain('bookmaker account resolver must remain fail-closed and separate from registry I/O');
    expect(result.errors).toContain('bookmaker catalog adapter must preserve public identity and redaction policy');
    expect(result.errors).toContain('integration observation adapters must preserve source authority and redaction');
    expect(result.errors).toContain('out_capabilities must match the package-owned execution constraint axes');
  });

  it('rejects connector identity, requiredness, and reciprocal-region drift', async () => {
    const plan = copyPlan();
    plan.connectors[0].snapshot_key = 'profiles-v2';
    plan.connectors[0].required = false;
    plan.connectors[0].region_ids.push('unknown-region');
    plan.surfaces.portal.regions[0].connectors.push('unknown-connector');
    plan.surfaces.portal.regions[1].connectors = plan.surfaces.portal.regions[1].connectors.filter(
      (connectorKey: string) => connectorKey !== 'canonical-profile-config'
    );
    const legacyConnector = plan.connectors.find(
      (connector: Record<string, unknown>) => connector.id === 'legacy-ops-registry'
    );
    if (!legacyConnector) throw new Error('legacy connector fixture missing');
    legacyConnector.target_adapter_implementation_status = 'planned';
    const sportsConnector = plan.connectors.find(
      (connector: Record<string, unknown>) => connector.id === 'sports-terminal'
    );
    if (!sportsConnector) throw new Error('sports connector fixture missing');
    sportsConnector.blocking_reason = 'input undecided';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors.some(error => error.includes('snapshot_key must be profiles'))).toBe(true);
    expect(result.errors.some(error => error.includes('required must be true'))).toBe(true);
    expect(result.errors.some(error => error.includes('unknown region unknown-region'))).toBe(true);
    expect(result.errors.some(error => error.includes('unknown connector unknown-connector'))).toBe(
      true
    );
    expect(result.errors.some(error => error.includes('are not reciprocal'))).toBe(true);
    expect(result.errors).toContain(
      'connector legacy-ops-registry target compatibility adapter must be implemented'
    );
    expect(result.errors).toContain(
      'sports-terminal blocking reason must name every unresolved boundary'
    );
  });

  it('keeps profile coverage separate from the planned canonical profile connector', async () => {
    const plan = copyPlan();
    const connector = plan.connectors.find(
      (candidate: Record<string, unknown>) => candidate.id === 'canonical-profile-config'
    );
    if (!connector) throw new Error('canonical profile connector fixture missing');
    connector.adapter_id = 'profile-artifact';
    connector.target_adapter_export = './adapters/profile-coverage';
    connector.provides = ['identity-coverage'];
    connector.authoritative_fact_paths = ['evidenceByPartnerCode.*'];

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'canonical-profile-config must remain the planned profile authority'
    );
    expect(
      result.errors.some(error =>
        error.includes(
          'canonical-profile-config authoritative_fact_paths must match the implemented v1 artifact contract'
        )
      )
    ).toBe(true);
  });

  it('pins connector authority to fields accepted by the implemented v1 artifact', async () => {
    const plan = copyPlan();
    const profile = plan.connectors.find(
      (candidate: Record<string, unknown>) => candidate.id === 'canonical-profile-config'
    );
    const accounting = plan.connectors.find(
      (candidate: Record<string, unknown>) => candidate.id === 'accounting-ledger'
    );
    if (!profile || !accounting) throw new Error('connector fixtures missing');
    profile.authoritative_fact_paths.push('partners[].policy');
    accounting.authoritative_fact_paths = ['partners[].accounting.fundingPositions'];

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'connector canonical-profile-config authoritative_fact_paths must match the implemented v1 artifact contract'
    );
    expect(result.errors).toContain(
      'connector accounting-ledger authoritative_fact_paths must match the implemented v1 artifact contract'
    );
  });

  it('rejects precedence that promotes a compatibility observation into canonical truth', async () => {
    const plan = copyPlan();
    plan.reconciliation.capacity_precedence.push('legacy-ops-registry');
    plan.reconciliation.finance_precedence = ['legacy-ops-registry', 'accounting-ledger'];

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'reconciliation capacity_precedence must match executable connector authority in order'
    );
    expect(result.errors).toContain(
      'reconciliation finance_precedence must match executable connector authority in order'
    );
  });

  it('separately rejects section-mount and partner-hash-route drift', async () => {
    const plan = copyPlan();
    plan.surfaces.portal.section_mount_compatibility.pop();
    plan.surfaces.portal.section_mount_compatibility.push(
      structuredClone(plan.surfaces.portal.section_mount_compatibility[0])
    );
    plan.surfaces.portal.partner_hash_route_compatibility[0].pattern = 'wrong/:route';
    plan.surfaces.portal.partner_hash_route_compatibility[1].anchor_kind = 'static';
    plan.surfaces.portal.regions.find(
      (region: Record<string, unknown>) => region.region_id === 'accounting'
    ).route_dom_id = 'wrong-dom-id';

    const result = await validatePartnerDashboardPlan(plan);
    expect(
      result.errors.some(error => error.includes('missing section mount compatibility mapping'))
    ).toBe(true);
    expect(
      result.errors.some(error => error.includes('partner hash route compatibility mapping'))
    ).toBe(true);
    expect(
      result.errors.some(error => error.includes('static partner hash route anchor does not exist'))
    ).toBe(true);
    expect(result.errors).toContain('section mount compatibility anchors must be unique');
    expect(
      result.errors.some(error => error.includes('registered region accounting must map'))
    ).toBe(true);
  });

  it('keeps the current HTML registry inputs explicit until the one-artifact cutover', async () => {
    const plan = copyPlan();
    plan.surfaces.portal.consumer_contract.required_input_refs.pop();
    plan.surfaces.portal.consumer_contract.target_shape_ref = 'shapes.wrong';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors.some(error => error.includes('portal registry input map'))).toBe(true);
    expect(result.errors).toContain(
      'portal current input refs must match the package consumer contract'
    );
    expect(result.errors).toContain('portal consumer target_shape_ref must be shapes.dashboard_artifact');
  });

  it('requires optional current HTML inputs to degrade explicitly', async () => {
    const html = await Bun.file('public/portal/partners/index.html').text();
    const result = await validatePartnerDashboardPlan(copyPlan(), {
      boardHtml: html.replace(".catch(() => null)", ''),
    });

    expect(result.errors.some(error => error.includes('portal registry input map'))).toBe(true);
  });

  it('pins the current portal to the shared structured JSON fetch transport', async () => {
    const plan = copyPlan();
    plan.surfaces.portal.consumer_contract.current_fetch_transport.export_name = 'fetchJson';
    const html = await Bun.file('public/portal/partners/index.html').text();
    const result = await validatePartnerDashboardPlan(plan, {
      boardHtml: html.replace(
        "import { fetchJsonResult } from '/portal/fetch-json.js'",
        "import { fetchJson } from '/portal/fetch-json.js'"
      ),
    });

    expect(result.errors).toContain(
      'current-compatibility portal must use the shared structured JSON fetch transport'
    );
  });

  it('rejects ambiguous target naming and premature canonical-consumer claims', async () => {
    const plan = copyPlan();
    plan.surfaces.portal.consumer = 'PartnerDashboardArtifact';
    plan.surfaces.portal.target_consumer = 'WrongArtifact';
    plan.surfaces.portal.consumer_contract.implementation_status = 'implemented';
    plan.surfaces.portal.consumer_contract.active_input_mode = 'canonical-single-artifact';
    plan.surfaces.portal.consumer_contract.automatic_legacy_fallback = true;

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'surfaces.portal.target_consumer must match the dashboard artifact type'
    );
    expect(result.errors).toContain('surfaces.portal.consumer is ambiguous; use target_consumer');
    expect(result.errors).toContain(
      'implemented portal consumer must load only the canonical dashboard artifact'
    );
    expect(result.errors).toContain(
      'implemented portal consumer must retire transition policy and remove legacy comparison'
    );
  });

  it('rejects drift across every planned transition and legacy-comparison field', async () => {
    const mutations: Array<[string, (plan: ReturnType<typeof copyPlan>) => void]> = [
      ['dashboard artifact path must match the package portal contract', plan => {
        plan.shapes.dashboard_artifact.path = '/registry/wrong.json';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.transition_implementation_status = 'implemented';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.transition_input_mode = 'automatic-fallback';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.canonical_input_ref = '/registry/wrong.json';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.canonical_failure_policy = 'fallback';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.automatic_legacy_fallback = true;
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.implementation_status =
          'implemented';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.activation = 'hash';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.search_param = 'mode';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.search_value = 'true';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.load_order = 'before-canonical';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.result_role = 'fallback';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.failure_policy = 'fail-primary';
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.required_input_refs.pop();
      }],
      ['portal transition contract', plan => {
        plan.surfaces.portal.consumer_contract.legacy_comparison.optional_input_refs.push(
          '/not-registry/value.txt'
        );
      }],
    ];

    for (const [expectedError, mutate] of mutations) {
      const plan = copyPlan();
      mutate(plan);
      const result = await validatePartnerDashboardPlan(plan);
      expect(result.errors.some(error => error.includes(expectedError))).toBe(true);
    }

    const activeTransition = copyPlan();
    activeTransition.surfaces.portal.consumer_contract.implementation_status = 'transition';
    const activeResult = await validatePartnerDashboardPlan(activeTransition);
    expect(activeResult.errors).toContain('portal consumer contract has invalid implementation_status');
  });

  it('stops comparing the live legacy HTML after the canonical consumer is implemented', async () => {
    const plan = copyPlan();
    plan.surfaces.portal.consumer_contract.implementation_status = 'implemented';
    plan.surfaces.portal.consumer_contract.active_input_mode = 'canonical-single-artifact';
    plan.surfaces.portal.consumer_contract.required_input_refs = [
      '/registry/partners-dashboard.json',
    ];
    plan.surfaces.portal.consumer_contract.optional_input_refs = [];
    plan.surfaces.portal.consumer_contract.transition_implementation_status = 'retired';
    delete plan.surfaces.portal.consumer_contract.legacy_comparison;

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).not.toContain(
      'portal current input refs must match the package consumer contract'
    );
    expect(result.errors.some(error => error.includes('portal registry input map'))).toBe(false);
    expect(result.errors).toContain(
      'implemented portal consumer requires the canonical dashboard artifact to exist'
    );
    expect(result.summary).toMatchObject({
      portalInputs: 1,
      portalRequiredInputs: 1,
      portalOptionalInputs: 0,
    });
  });

  it('turns the active legacy-ops cutoff into a hard removal gate', async () => {
    const result = await validatePartnerDashboardPlan(copyPlan(), {
      now: new Date('2026-11-03T00:00:00Z'),
    });
    expect(
      result.errors.some(error =>
        error.includes('legacy-ops cutoff 2026-11-03 has passed')
      )
    ).toBe(true);
  });

  it('rejects retired status while legacy connector and v1 schema remain', async () => {
    const plan = copyPlan();
    plan.deprecation_calendar.legacy_ops.status = 'retired';

    const result = await validatePartnerDashboardPlan(plan, {
      now: new Date('2026-11-04T00:00:00Z'),
    });
    expect(result.errors.some(error => error.includes('schema must be factorywager.partners-dashboard.v2'))).toBe(true);
    expect(result.errors).toContain('retired legacy-ops contract must not retain the connector');
  });

  it('accepts the complete retired-state removal shape', async () => {
    const plan = copyPlan();
    plan.deprecation_calendar.legacy_ops.status = 'retired';
    plan.shapes.dashboard_artifact.schema = 'factorywager.partners-dashboard.v2';
    plan.connectors = plan.connectors.filter(
      (connector: Record<string, unknown>) => connector.id !== 'legacy-ops-registry'
    );
    for (const region of plan.surfaces.portal.regions) {
      region.connectors = region.connectors.filter(
        (connectorKey: string) => connectorKey !== 'legacy-ops-registry'
      );
    }
    plan.reconciliation.capacity_precedence = plan.reconciliation.capacity_precedence.filter(
      (connectorKey: string) => connectorKey !== 'legacy-ops-registry'
    );
    delete plan.theme.roles.group_other;

    const result = await validatePartnerDashboardPlan(plan, {
      now: new Date('2026-11-04T00:00:00Z'),
    });
    expect(result.errors).toEqual([]);
  });

  it('does not allow a proposal with gaps and planned connectors to claim implementation-ready', async () => {
    const plan = copyPlan();
    plan.plan.status = 'implementation-ready';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'implementation-ready plans cannot contain unresolved concept gaps'
    );
    expect(result.errors).toContain(
      'implementation-ready plans require every connector to be implemented'
    );
    expect(result.errors).toContain(
      'implementation-ready plans require complete partner profile coverage; missing ASH, BIL, NOV, SPEN'
    );
  });

  it('rejects private fields at the public profile coverage boundary', async () => {
    const result = await validatePartnerDashboardPlan(copyPlan(), {
      partnerProfileCoverage: {
        schema: 'factorywager.partner-profile-coverage.v1',
        generatedAt: '2026-08-05T12:00:00.000Z',
        evidenceByPartnerCode: {
          ASH: {
            callSign: 'ASH-001',
            profileDocumentVersion: '1.0.0',
            lifecycle: 'active',
          },
        },
      },
      requiredPartnerCodes: ['ASH'],
    });

    expect(
      result.errors.some(error => error.includes('partner profile coverage artifact is invalid'))
    ).toBe(true);
  });

  it('recognizes complete redacted profile coverage for readiness accounting', async () => {
    const plan = copyPlan();
    plan.plan.status = 'implementation-ready';
    const result = await validatePartnerDashboardPlan(plan, {
      partnerProfileCoverage: {
        schema: 'factorywager.partner-profile-coverage.v1',
        generatedAt: '2026-08-05T12:00:00.000Z',
        evidenceByPartnerCode: {
          ASH: {
            callSign: 'ASH-001',
            profileDocumentVersion: '1.0.0',
          },
        },
      },
      requiredPartnerCodes: ['ASH'],
    });

    expect(result.summary).toMatchObject({
      profileCoverageEntries: 1,
      missingProfileCoverage: 0,
    });
    expect(
      result.errors.some(error => error.includes('require complete partner profile coverage'))
    ).toBe(false);
  });
});
