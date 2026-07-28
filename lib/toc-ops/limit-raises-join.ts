/**
 * Pure join: ops-summary.limitChanges.node_id ↔ TOC partnerCode / callSign / identity treeNodeId.
 *
 * Sportsbook raise rows live on the partner-limits plane (SQLite + /portal/limits/).
 * TOC LIMIT tasks / fixture limitHistory are a separate desk signal — never dual-write.
 *
 * Join is **exact** (case-insensitive trim). Ambiguous node_ids (match >1 partner)
 * stay aggregate-only so the board never invents a wrong partner badge.
 *
 * @see docs/harness/tenants/toc-ops.md
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/operations/ops-summary.ts — limitChanges 48h window
 */

/** Wire row from ops-summary.limitChanges (subset used for join). */
export type LimitChangeJoinRow = {
  /** Tree node slug or UUID as stored on partner_account_limits.node_id */
  node_id: string; // brand-ok — TreeNodeId wire
  /** When present, only direction !== 'down' counts as a raise */
  direction?: 'up' | 'down' | string;
};

/** Keys a TOC partner (and optional identity bridge) exposes for exact join. */
export type TocPartnerJoinKeys = {
  partnerCode: string; // brand-ok — TOC partner code
  callSigns?: readonly string[]; // brand-ok — account call signs
  /** Identity bridge tree_node ids (partner + accounts), when known */
  treeNodeIds?: readonly string[]; // brand-ok — TreeNodeId wire
};

export type LimitRaisesJoinResult = {
  /** Rows with direction !== 'down' (or missing direction) */
  totalRaises: number;
  /** All limitChanges rows considered */
  totalChanges: number;
  /** Unambiguous raise counts keyed by partnerCode (only partners with ≥1) */
  byPartnerCode: Record<string, number>;
  /** Unambiguous raise counts keyed by callSign (only when node_id matched that sign) */
  byCallSign: Record<string, number>;
  /** node_ids that matched more than one partner — not assigned per-partner */
  ambiguousNodeIds: string[];
  /** Raise node_ids that matched zero partners */
  unmatchedNodeIds: string[];
  /** True when at least one partner has an unambiguous raise count */
  hasPerPartner: boolean;
};

function norm(raw: string): string {
  return raw.trim().toLowerCase();
}

function isRaise(direction: LimitChangeJoinRow['direction']): boolean {
  return direction !== 'down';
}

/**
 * Build join keys from TOC partners + optional identity bridge (fixture `identity`).
 */
export function partnerJoinKeysFromToc(
  partners: readonly {
    partnerCode: string;
    accounts?: readonly { callSign: string }[];
  }[],
  identity?: {
    partners?: readonly {
      partnerCode: string;
      treeNodeId?: string | null; // brand-ok — TreeNodeId wire from TOC identity
      accounts?: readonly {
        callSign: string;
        treeNodeId?: string | null; // brand-ok — TreeNodeId wire from TOC identity
      }[];
    }[];
  } | null
): TocPartnerJoinKeys[] {
  const idByCode = new Map((identity?.partners ?? []).map(p => [norm(p.partnerCode), p] as const));

  return partners.map(p => {
    const code = p.partnerCode;
    const callSigns = (p.accounts ?? []).map(a => a.callSign).filter(Boolean);
    const id = idByCode.get(norm(code));
    const treeNodeIds: string[] = [];
    if (id?.treeNodeId) treeNodeIds.push(id.treeNodeId);
    for (const a of id?.accounts ?? []) {
      if (a.treeNodeId) treeNodeIds.push(a.treeNodeId);
    }
    // Also accept call signs listed only on identity when fixture accounts lag
    for (const a of id?.accounts ?? []) {
      if (a.callSign && !callSigns.includes(a.callSign)) callSigns.push(a.callSign);
    }
    return {
      partnerCode: code,
      callSigns,
      treeNodeIds: treeNodeIds.length ? treeNodeIds : undefined,
    };
  });
}

/**
 * Exact-key map: normalized join key → partnerCode (collision → ambiguous sentinel).
 */
function buildKeyIndex(partners: readonly TocPartnerJoinKeys[]): {
  keyToPartner: Map<string, string | null>;
  callSignToPartner: Map<string, string>;
} {
  const keyToPartner = new Map<string, string | null>();
  const callSignToPartner = new Map<string, string>();

  const claim = (keyRaw: string, partnerCode: string) => {
    const key = norm(keyRaw);
    if (!key) return;
    const existing = keyToPartner.get(key);
    if (existing === undefined) {
      keyToPartner.set(key, partnerCode);
    } else if (existing !== null && existing !== partnerCode) {
      keyToPartner.set(key, null); // ambiguous across partners
    }
  };

  for (const p of partners) {
    claim(p.partnerCode, p.partnerCode);
    for (const cs of p.callSigns ?? []) {
      claim(cs, p.partnerCode);
      const n = norm(cs);
      if (n) callSignToPartner.set(n, p.partnerCode);
    }
    for (const nid of p.treeNodeIds ?? []) {
      claim(nid, p.partnerCode);
    }
  }

  return { keyToPartner, callSignToPartner };
}

/**
 * Join limitChanges rows to TOC partners when node_id equals a known key.
 *
 * Reliable keys (any one is enough):
 * - partnerCode (e.g. ASH, partner-42 when that is the TOC code)
 * - callSign (e.g. ASH-001)
 * - identity treeNodeId (UUID or slug bound on the bridge)
 *
 * If a node_id matches keys belonging to two different partners, it is **not**
 * attributed — only the aggregate total remains trustworthy.
 */
export function joinLimitChangesToPartners(
  changes: readonly LimitChangeJoinRow[],
  partners: readonly TocPartnerJoinKeys[]
): LimitRaisesJoinResult {
  const { keyToPartner, callSignToPartner } = buildKeyIndex(partners);
  const byPartnerCode: Record<string, number> = {};
  const byCallSign: Record<string, number> = {};
  const ambiguousNodeIds: string[] = [];
  const unmatchedNodeIds: string[] = [];
  const seenAmbiguous = new Set<string>();
  const seenUnmatched = new Set<string>();

  let totalRaises = 0;
  const totalChanges = changes.length;

  for (const row of changes) {
    const nodeId = typeof row.node_id === 'string' ? row.node_id : '';
    const key = norm(nodeId);
    const raise = isRaise(row.direction);
    if (raise) totalRaises += 1;
    if (!key || !raise) continue;

    const owner = keyToPartner.get(key);
    if (owner === undefined) {
      if (!seenUnmatched.has(key)) {
        seenUnmatched.add(key);
        unmatchedNodeIds.push(nodeId);
      }
      continue;
    }
    if (owner === null) {
      if (!seenAmbiguous.has(key)) {
        seenAmbiguous.add(key);
        ambiguousNodeIds.push(nodeId);
      }
      continue;
    }

    byPartnerCode[owner] = (byPartnerCode[owner] ?? 0) + 1;

    // Account-level badge only when the node_id itself is that callSign
    if (callSignToPartner.has(key)) {
      // Recover original-ish callSign label from partners for display key
      for (const p of partners) {
        if (p.partnerCode !== owner) continue;
        for (const cs of p.callSigns ?? []) {
          if (norm(cs) === key) {
            byCallSign[cs] = (byCallSign[cs] ?? 0) + 1;
          }
        }
      }
    }
  }

  return {
    totalRaises,
    totalChanges,
    byPartnerCode,
    byCallSign,
    ambiguousNodeIds,
    unmatchedNodeIds,
    hasPerPartner: Object.keys(byPartnerCode).length > 0,
  };
}

/** Count of raises for one partnerCode, or 0 when missing / ambiguous. */
export function raiseCountForPartner(join: LimitRaisesJoinResult, partnerCode: string): number {
  return join.byPartnerCode[partnerCode] ?? 0;
}

/** Count of raises for one callSign when node_id matched that sign exactly. */
export function raiseCountForCallSign(join: LimitRaisesJoinResult, callSign: string): number {
  return join.byCallSign[callSign] ?? 0;
}
