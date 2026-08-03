#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Apply standard partner onboarding package to a tree node / call-sign.
 *
 * Usage:
 *   bun tools/onboard-partner-package.ts ASH-001
 *   bun tools/onboard-partner-package.ts ASH-001 --dry-run
 *   bun tools/onboard-partner-package.ts ASH-001 --create-package-group
 *   bun tools/onboard-partner-package.ts ASH-001 --state=NJ --age=28 --location=Newark --zip=07102
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import { parseComplianceOnboardFields } from '../lib/operations/partner-compliance-onboard.ts';
import {
  applyPartnerOnboardPackage,
  buildOnboardChecklist,
  emitPackageGroupCreateRequest,
  ensureOnboardTreeNode,
  formatOnboardPlanLines,
  formatOnboardStatusLine,
  planPartnerOnboardPackage,
  resolveOnboardTreeNodeId,
} from '../lib/operations/partner-onboard-package.ts';

function flag(name: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const ref = process.argv[2];
if (!ref || ref.startsWith('--')) {
  console.error(
    [
      'Usage: bun tools/onboard-partner-package.ts <call-sign|tree-node-id>',
      '  [--dry-run] [--force] [--create-package-group]',
      '  [--create-tree-node]  # insert the tree_node (id node-<code>) when missing',
      '  [--name=…]            # node name used with --create-tree-node (default: CODE)',
      '  [--expert-id=…] [--parent-id=…]',
      '  [--state=MA|NJ] [--age=N] [--location=City] [--zip=#####] [--license=…]',
      '  [--identity-verified]  # force identity_verified=true',
    ].join('\n')
  );
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const createPackageGroup = process.argv.includes('--create-package-group');
const identityVerified = process.argv.includes('--identity-verified');
const createTreeNode = process.argv.includes('--create-tree-node');

const compliance = parseComplianceOnboardFields({
  state: flag('state'),
  age: flag('age'),
  location: flag('location'),
  zip: flag('zip'),
  licenseNumber: flag('license'),
  identityVerified: identityVerified ? true : undefined,
});

const db = openOperationsDb();
try {
  let treeNodeId: ReturnType<typeof resolveOnboardTreeNodeId>;
  try {
    treeNodeId = resolveOnboardTreeNodeId(db, ref);
  } catch (err) {
    if (!createTreeNode) throw err;
    if (dryRun) {
      console.log(`⏭️  [dry-run] would create tree node for ${ref} (rerun without --dry-run)`);
      process.exit(0);
    }
    treeNodeId = ensureOnboardTreeNode(db, ref, { name: flag('name') });
    console.log(`🌳 created tree node ${treeNodeId} for ${ref}`);
  }
  const opts = {
    source: 'portal' as const,
    dryRun,
    force,
    preferredExpertId: flag('expert-id'),
    referralNodeId: flag('parent-id'),
    compliance,
  };

  if (compliance) {
    console.log(
      `compliance: state=${compliance.stateCode} age=${compliance.age ?? '—'} loc=${compliance.location ?? '—'} zip=${compliance.zipCode ?? '—'}`
    );
  }

  const plan = planPartnerOnboardPackage(db, treeNodeId, opts);
  for (const line of formatOnboardPlanLines(plan)) console.log(line);

  const result = applyPartnerOnboardPackage(db, plan, opts);
  console.log(formatOnboardStatusLine(result));

  const { lines } = buildOnboardChecklist(db, treeNodeId);
  for (const line of lines) console.log(line);

  if (createPackageGroup) {
    const emitted = await emitPackageGroupCreateRequest(db, treeNodeId, { dryRun });
    console.log('');
    console.log(`artifact: ${JSON.stringify(emitted.artifact)}`);
    if (emitted.jsonlPath) console.log(`pending: ${emitted.jsonlPath}`);
    for (const line of emitted.recipe) console.log(line);
  }
} finally {
  db.close();
}
