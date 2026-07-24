#!/usr/bin/env bun
/**
 * Apply standard partner onboarding package to a tree node.
 *
 * Usage: bun tools/onboard-partner-package.ts <tree-node-id> [--expert-id=...] [--parent-id=...]
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';
import {
  assignOnboardingDefaults,
  onboardPartnerProfile,
} from '../lib/operations/partner-onboarding.ts';
import { enqueuePartnerWelcomeEvent } from '../lib/channels/outbox.ts';

const nodeId = process.argv[2];
if (!nodeId) {
  console.error('Usage: bun tools/onboard-partner-package.ts <tree-node-id>');
  process.exit(1);
}

const expertFlag = process.argv.find(a => a.startsWith('--expert-id='));
const parentFlag = process.argv.find(a => a.startsWith('--parent-id='));

const db = openOperationsDb();
try {
  const tid = asTreeNodeId(nodeId);
  const assigned = assignOnboardingDefaults(db, tid, {
    preferredExpertId: expertFlag?.split('=')[1],
    referralNodeId: parentFlag?.split('=')[1],
    source: 'portal',
  });
  const binding = onboardPartnerProfile(db, tid, { source: 'portal' });

  const node = db
    .query('SELECT name, telegram_id FROM tree_nodes WHERE id = $id')
    .get({ $id: nodeId }) as { name: string; telegram_id: string }; // brand-ok

  enqueuePartnerWelcomeEvent(db, {
    treeNodeId: binding.treeNodeId,
    profileKey: binding.profileKey as string,
    partnerTemplate: binding.templateId,
    lifecycleStatus: binding.lifecycleStatus,
    telegramId:
      node.telegram_id && !node.telegram_id.startsWith('pending-') ? node.telegram_id : undefined,
    nodeName: node.name,
  });

  console.log(JSON.stringify({ assigned, binding: { templateId: binding.templateId } }, null, 2));
} finally {
  db.close();
}
