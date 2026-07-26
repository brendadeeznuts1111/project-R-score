#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Apply standard partner onboarding package to a tree node / call-sign.
 *
 * Usage:
 *   bun tools/onboard-partner-package.ts ASH-001
 *   bun tools/onboard-partner-package.ts ASH-001 --dry-run
 *   bun tools/onboard-partner-package.ts ASH-001 --create-package-group
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  applyPartnerOnboardPackage,
  buildOnboardChecklist,
  emitPackageGroupCreateRequest,
  formatOnboardPlanLines,
  formatOnboardStatusLine,
  planPartnerOnboardPackage,
  resolveOnboardTreeNodeId,
} from '../lib/operations/partner-onboard-package.ts';

const ref = process.argv[2];
if (!ref || ref.startsWith('--')) {
  console.error(
    'Usage: bun tools/onboard-partner-package.ts <call-sign|tree-node-id> [--dry-run] [--force] [--create-package-group] [--expert-id=…] [--parent-id=…]'
  );
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const createPackageGroup = process.argv.includes('--create-package-group');
const expertFlag = process.argv.find(a => a.startsWith('--expert-id='));
const parentFlag = process.argv.find(a => a.startsWith('--parent-id='));

const db = openOperationsDb();
try {
  const treeNodeId = resolveOnboardTreeNodeId(db, ref);
  const opts = {
    source: 'portal' as const,
    dryRun,
    force,
    preferredExpertId: expertFlag?.split('=')[1],
    referralNodeId: parentFlag?.split('=')[1],
  };

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
