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
      canonicalProfiles: 0,
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
      (connectorKey: string) => connectorKey !== 'profiles-registry'
    );

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors.some(error => error.includes('snapshot_key must be profiles'))).toBe(true);
    expect(result.errors.some(error => error.includes('required must be true'))).toBe(true);
    expect(result.errors.some(error => error.includes('unknown region unknown-region'))).toBe(true);
    expect(result.errors.some(error => error.includes('unknown connector unknown-connector'))).toBe(
      true
    );
    expect(result.errors.some(error => error.includes('are not reciprocal'))).toBe(true);
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
    expect(result.errors).toContain('portal consumer target_shape_ref must be shapes.dashboard_artifact');
  });

  it('requires optional current HTML inputs to degrade explicitly', async () => {
    const html = await Bun.file('public/portal/partners/index.html').text();
    const result = await validatePartnerDashboardPlan(copyPlan(), {
      boardHtml: html.replace(".catch(() => null)", ''),
    });

    expect(result.errors.some(error => error.includes('portal registry input map'))).toBe(true);
  });

  it('rejects ambiguous target naming and premature canonical-consumer claims', async () => {
    const plan = copyPlan();
    plan.surfaces.portal.consumer = 'PartnerDashboardArtifact';
    plan.surfaces.portal.target_consumer = 'WrongArtifact';
    plan.surfaces.portal.consumer_contract.implementation_status = 'implemented';
    plan.surfaces.portal.consumer_contract.active_input_mode = 'canonical-single-artifact';

    const result = await validatePartnerDashboardPlan(plan);
    expect(result.errors).toContain(
      'surfaces.portal.target_consumer must match the dashboard artifact type'
    );
    expect(result.errors).toContain('surfaces.portal.consumer is ambiguous; use target_consumer');
    expect(result.errors).toContain(
      'implemented portal consumer must load only the canonical dashboard artifact'
    );
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
      'implementation-ready plans require at least one canonical partner profile'
    );
  });

  it('rejects inconsistent canonical profile artifact counts', async () => {
    const result = await validatePartnerDashboardPlan(copyPlan(), {
      partnerProfiles: {
        schemaVersion: 1,
        profiles: { ASH: { identity: { code: 'ASH' } } },
        summary: { count: 0 },
      },
    });

    expect(result.errors).toContain('partner profile artifact summary.count must match profiles');
    expect(
      result.errors.some(error => error.includes('canonical partner profile ASH is invalid'))
    ).toBe(true);
  });

  it('recognizes a schema-valid canonical profile for readiness accounting', async () => {
    const plan = copyPlan();
    plan.plan.status = 'implementation-ready';
    const result = await validatePartnerDashboardPlan(plan, {
      partnerProfiles: {
        schemaVersion: 1,
        profiles: {
          ASH: {
            meta: {
              templateId: 'partner-active',
              name: 'ASH partner',
              version: '1.0.0',
              source: 'promoted',
            },
            identity: { code: 'ASH', callSign: 'ASH-001', status: 'onboarded' },
            lifecycle: { status: 'active', phase: 'incomplete' },
          },
        },
        summary: { count: 1 },
      },
    });

    expect(result.summary.canonicalProfiles).toBe(1);
    expect(result.errors).not.toContain(
      'implementation-ready plans require at least one canonical partner profile'
    );
  });
});
