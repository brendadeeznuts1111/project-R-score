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

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'profile coverage artifact must remain redacted identity evidence only'
    );
  });

  it('rejects identifier and ingress translation drift from package parsers', async () => {
    const plan = copyPlan();
    plan.package.components.reconciliation = 'implemented';
    plan.shapes.dashboard_artifact.active_out_identity_field = 'hiddenCountOnly';
    plan.identity.partner_code.pattern = '^wrong$';
    plan.identity.out_id.implementation_status = 'planned';
    plan.ingress.stage = 'inside-core';
    plan.ingress.mappings.legacy_seat_out_token.from_pattern = '^unsafe$';

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
      'legacy seat OutId mapping must match the package ingress translator'
    );
  });

  it('rejects connector identity, requiredness, and reciprocal-region drift', async () => {
    const plan = copyPlan();
    plan.connectors[0].snapshot_key = 'profiles-v2';
    plan.connectors[0].required = false;
    plan.connectors[0].region_ids.push('unknown-region');
    plan.surfaces.portal.regions[0].connectors.push('unknown-connector');
    plan.surfaces.portal.regions[1].connectors = plan.surfaces.portal.regions[1].connectors.filter(
      (connectorKey: string) => connectorKey !== 'profile-coverage-registry'
    );
    const legacyConnector = plan.connectors.find(
      (connector: Record<string, unknown>) => connector.id === 'legacy-ops-registry'
    );
    if (!legacyConnector) throw new Error('legacy connector fixture missing');
    legacyConnector.target_adapter_implementation_status = 'planned';

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
  });

  it('pins the profile connector to redacted coverage evidence', async () => {
    const plan = copyPlan();
    const connector = plan.connectors.find(
      (candidate: Record<string, unknown>) =>
        candidate.id === 'profile-coverage-registry'
    );
    if (!connector) throw new Error('profile coverage connector fixture missing');
    connector.adapter_id = 'profile-artifact';
    connector.target_adapter_export = './adapters/profile';
    connector.provides = ['identity', 'lifecycle'];
    connector.authoritative_fact_paths = ['partners[].lifecycle'];

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'profile-coverage-registry connector must expose only implemented identity coverage'
    );
    expect(
      result.errors.some(error =>
        error.includes('profile-coverage-registry has invalid authoritative fact path')
      )
    ).toBe(true);
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
