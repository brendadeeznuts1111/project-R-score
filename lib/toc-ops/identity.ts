/**
 * TOC ↔ FactoryWager ops identity bridge types.
 * Partner codes (ASH) and call signs (ASH-001) join to tree_nodes / rails / sb_accounts.
 *
 * @see lib/operations/toc-identity-bridge.ts
 */

import type { PartnerLifecycleStatus } from '../partner-profile/schema.ts';

export type TocIdentityPlane = 'demo-readonly' | 'linked';

export type TocRailBinding = {
  tocRailId: string; // brand-ok — fixture rail id
  opsRailId: string | null; // brand-ok — rails.id
  railType: string;
  confirmed: boolean;
  identifier: string | null;
};

export type TocAccountBinding = {
  callSign: string; // brand-ok
  treeNodeId: string | null; // brand-ok — agent/partner node
  sbAccountId: string | null; // brand-ok
  opsRailId: string | null; // brand-ok
  book: string | null;
  balance: number | null;
};

export type TocPartnerBinding = {
  partnerCode: string; // brand-ok
  treeNodeId: string | null; // brand-ok
  opsName: string | null;
  lifecycleStatus: PartnerLifecycleStatus | null;
  profileKey: string | null;
  linked: boolean;
  rails: TocRailBinding[];
  accounts: TocAccountBinding[];
};

export type TocIdentityBridge = {
  plane: TocIdentityPlane;
  /** True when at least one partner has a tree_node_id */
  linked: boolean;
  linkedPartners: number;
  linkedAccounts: number;
  linkedRails: number;
  generatedAt: string;
  warning: string;
  partners: TocPartnerBinding[];
};
