// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Publish-plane soft-pass ↔ portal-weave parity.
 * Used by weave verify and packages board consumers.
 *
 * @see lib/http/portal-weave.ts
 * @see lib/verification/publish-plane-color.ts
 */
import {
  PUBLISH_PM_PROOF_CONCEPT_ID,
  PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID,
  publishPlaneColorForConcept,
  type PublishPlaneColorBlock,
} from './publish-plane-color.ts';

export const PUBLISH_PLANE_BOARD = '/portal/packages/' as const;
export const PUBLISH_PLANE_WEAVE_PATH = '/registry/portal-weave.json' as const;
export const PUBLISH_PLANE_SSOT_HREF = '/registry/ssot-flow-soft.json' as const;
export const PUBLISH_PLANE_PM_HREF = '/registry/pm-proof.json' as const;

export type PublishPlaneWeaveArtifact = {
  artifactId: string; // brand-ok — weave/registry artifact slug
  artifactName: string;
  conceptId: string; // brand-ok — partner-ops color concept key
  colorKey: string;
  /** Partner-ops hex (board swatches / kernel wire). */
  hex: string;
  token: string;
  href: string;
  cli: string;
  purpose: string;
};

export type PublishPlaneWeaveBlock = {
  board: typeof PUBLISH_PLANE_BOARD;
  colorKernel: 'partner-ops';
  artifacts: PublishPlaneWeaveArtifact[];
  scripts: string[];
  related: {
    ssotFlowSoft: typeof PUBLISH_PLANE_SSOT_HREF;
    pmProof: typeof PUBLISH_PLANE_PM_HREF;
  };
};

export type PublishPlaneProofSlice = {
  artifactId?: string; // brand-ok — weave/registry artifact slug
  artifactName?: string;
  conceptId?: string; // brand-ok — partner-ops color concept key
  color?: { colorKey?: string; hex?: string; token?: string };
  links?: { weave?: string; board?: string; json?: string };
  reportPath?: string;
};

export type PublishPlaneParityIssue = {
  artifactId: string; // brand-ok — weave/registry artifact slug or publishPlane
  field: string;
  expected: string;
  actual: string;
};

function colorWireForArtifact(
  artifactId: string, // brand-ok — weave/registry artifact slug
  conceptId: string, // brand-ok — partner-ops color concept key
  colorKey: string
): PublishPlaneColorBlock | null {
  if (artifactId === 'ssot-flow-soft' || conceptId === PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID) {
    return publishPlaneColorForConcept(PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID);
  }
  if (artifactId === 'pm-proof' || conceptId === PUBLISH_PM_PROOF_CONCEPT_ID) {
    return publishPlaneColorForConcept(PUBLISH_PM_PROOF_CONCEPT_ID);
  }
  if (colorKey === 'tennis') return publishPlaneColorForConcept(PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID);
  if (colorKey === 'kalshi') return publishPlaneColorForConcept(PUBLISH_PM_PROOF_CONCEPT_ID);
  return null;
}

/** Build the weave `publishPlane` block from artifact/script rows. */
export function buildPublishPlaneWeaveBlock(input: {
  artifacts: Array<{
    artifactId?: string; // brand-ok — weave/registry artifact slug
    artifactName?: string;
    label?: string;
    conceptId?: string; // brand-ok — partner-ops color concept key
    colorKey?: string;
    hex?: string;
    token?: string;
    href?: string;
    cli?: string;
    purpose?: string;
  }>;
  scripts: Array<{ id?: string; cmd?: string }>; // brand-ok — weave script slug
}): PublishPlaneWeaveBlock {
  const wanted = new Set(['ssot-flow-soft', 'pm-proof']);
  const artifacts: PublishPlaneWeaveArtifact[] = input.artifacts
    .filter(a => a.artifactId && wanted.has(a.artifactId))
    .map(a => {
      const conceptId = String(a.conceptId || '');
      const colorKey = String(a.colorKey || '');
      const wire = colorWireForArtifact(String(a.artifactId), conceptId, colorKey);
      return {
        artifactId: String(a.artifactId),
        artifactName: String(a.artifactName || a.label || a.artifactId),
        conceptId: conceptId || wire?.conceptId || '',
        colorKey: colorKey || wire?.colorKey || '',
        hex: String(a.hex || wire?.hex || ''),
        token: String(a.token || wire?.token || ''),
        href: String(a.href || ''),
        cli: String(a.cli || ''),
        purpose: String(a.purpose || 'ui'),
      };
    });

  const scriptIds = new Set(['ssot-flow-soft', 'verify-pm-save', 'verify-weave']);
  const scripts = input.scripts
    .filter(s => s.id && scriptIds.has(s.id) && s.cmd)
    .map(s => String(s.cmd));

  return {
    board: PUBLISH_PLANE_BOARD,
    colorKernel: 'partner-ops',
    artifacts,
    scripts,
    related: {
      ssotFlowSoft: PUBLISH_PLANE_SSOT_HREF,
      pmProof: PUBLISH_PLANE_PM_HREF,
    },
  };
}

/** True when edge weave has not shipped `publishPlane` yet (rollout soft-skip). */
export function isPublishPlaneRolloutPending(
  block: PublishPlaneWeaveBlock | null | undefined
): boolean {
  return block == null;
}

/** Compare weave publishPlane rows to live soft-pass proofs. */
export function collectPublishPlaneParityIssues(
  block: PublishPlaneWeaveBlock | null | undefined,
  proofs: {
    ssot: PublishPlaneProofSlice | null;
    pm: PublishPlaneProofSlice | null;
  }
): PublishPlaneParityIssue[] {
  const issues: PublishPlaneParityIssue[] = [];
  if (!block) {
    issues.push({
      artifactId: 'publishPlane',
      field: 'block',
      expected: 'present',
      actual: 'missing',
    });
    return issues;
  }

  if (block.board !== PUBLISH_PLANE_BOARD) {
    issues.push({
      artifactId: 'publishPlane',
      field: 'board',
      expected: PUBLISH_PLANE_BOARD,
      actual: String(block.board || ''),
    });
  }
  if (block.colorKernel !== 'partner-ops') {
    issues.push({
      artifactId: 'publishPlane',
      field: 'colorKernel',
      expected: 'partner-ops',
      actual: String(block.colorKernel || ''),
    });
  }
  if (block.related?.ssotFlowSoft !== PUBLISH_PLANE_SSOT_HREF) {
    issues.push({
      artifactId: 'publishPlane',
      field: 'related.ssotFlowSoft',
      expected: PUBLISH_PLANE_SSOT_HREF,
      actual: String(block.related?.ssotFlowSoft || ''),
    });
  }
  if (block.related?.pmProof !== PUBLISH_PLANE_PM_HREF) {
    issues.push({
      artifactId: 'publishPlane',
      field: 'related.pmProof',
      expected: PUBLISH_PLANE_PM_HREF,
      actual: String(block.related?.pmProof || ''),
    });
  }
  for (const needle of ['ssot:flow:soft', 'verify:pm:save', 'verify:weave']) {
    if (!block.scripts.some(s => s.includes(needle))) {
      issues.push({
        artifactId: 'publishPlane',
        field: 'scripts',
        expected: needle,
        actual: 'missing',
      });
    }
  }

  const byId = new Map(block.artifacts.map(a => [a.artifactId, a]));
  const expectRow = (
    artifactId: string, // brand-ok — weave/registry artifact slug
    proof: PublishPlaneProofSlice | null,
    conceptId: string, // brand-ok — partner-ops color concept key
    colorKey: string
  ) => {
    const row = byId.get(artifactId);
    const wire = publishPlaneColorForConcept(
      conceptId === PUBLISH_PM_PROOF_CONCEPT_ID
        ? PUBLISH_PM_PROOF_CONCEPT_ID
        : PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID
    );
    if (!row) {
      issues.push({
        artifactId,
        field: 'weave.artifact',
        expected: 'present',
        actual: 'missing',
      });
      return;
    }
    if (row.conceptId !== conceptId) {
      issues.push({
        artifactId,
        field: 'conceptId',
        expected: conceptId,
        actual: row.conceptId || '',
      });
    }
    if (row.colorKey !== colorKey) {
      issues.push({
        artifactId,
        field: 'colorKey',
        expected: colorKey,
        actual: row.colorKey || '',
      });
    }
    if (row.hex && row.hex.toLowerCase() !== wire.hex.toLowerCase()) {
      issues.push({
        artifactId,
        field: 'hex',
        expected: wire.hex,
        actual: row.hex,
      });
    }
    if (!proof) {
      issues.push({
        artifactId,
        field: 'proof',
        expected: 'present',
        actual: 'missing',
      });
      return;
    }
    if (proof.artifactId !== artifactId) {
      issues.push({
        artifactId,
        field: 'proof.artifactId',
        expected: artifactId,
        actual: String(proof.artifactId || ''),
      });
    }
    if (proof.conceptId !== conceptId) {
      issues.push({
        artifactId,
        field: 'proof.conceptId',
        expected: conceptId,
        actual: String(proof.conceptId || ''),
      });
    }
    if (proof.color?.colorKey !== colorKey) {
      issues.push({
        artifactId,
        field: 'proof.color.colorKey',
        expected: colorKey,
        actual: String(proof.color?.colorKey || ''),
      });
    }
    if (proof.links?.weave !== PUBLISH_PLANE_WEAVE_PATH) {
      issues.push({
        artifactId,
        field: 'proof.links.weave',
        expected: PUBLISH_PLANE_WEAVE_PATH,
        actual: String(proof.links?.weave || ''),
      });
    }
    if (proof.links?.board !== PUBLISH_PLANE_BOARD) {
      issues.push({
        artifactId,
        field: 'proof.links.board',
        expected: PUBLISH_PLANE_BOARD,
        actual: String(proof.links?.board || ''),
      });
    }
  };

  expectRow('ssot-flow-soft', proofs.ssot, PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID, 'tennis');
  expectRow('pm-proof', proofs.pm, PUBLISH_PM_PROOF_CONCEPT_ID, 'kalshi');

  if (block.artifacts.length !== 2) {
    issues.push({
      artifactId: 'publishPlane',
      field: 'artifacts.length',
      expected: '2',
      actual: String(block.artifacts.length),
    });
  }

  return issues;
}

export function formatPublishPlaneParityDetail(issues: PublishPlaneParityIssue[]): string {
  if (issues.length === 0) {
    return 'publishPlane · 2 artifacts · conceptId/colorKey/links parity ok';
  }
  return issues
    .slice(0, 6)
    .map(i => `${i.artifactId}.${i.field}: ${i.expected}≠${i.actual}`)
    .join(' · ');
}

export function formatPublishPlaneRolloutSkip(): string {
  return 'publishPlane pending on edge (soft) — deploy portal-weave + soft-pass proofs';
}
