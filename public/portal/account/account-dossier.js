/**
 * Account dossier join helpers — scope one TreeNodeId + connected partner-tree nodes.
 * Pure functions over baked registries (limit-raises · partners-ops).
 *
 * Deep-link parity with limits board:
 *   query ?account= (form SSOT) · hash #account:{TreeNodeId} (limits pattern)
 */

const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
/** Call-sign only — avoids treating slug ids like LIMIT-DEMO-ATLANTIC as CODE LIMIT. */
const CALL_SIGN_RE = /^([A-Z]{3,6})-\d{3}(?:-SUB\d{2}){0,2}$/;

const accountHashPattern = new URLPattern({ hash: 'account\\::account' });
const sectionHashPattern = new URLPattern({ hash: 'section\\::section' });

/**
 * Resolve account seed from query (?account|partner|node_id) or hash (#account:).
 * Query wins when present so the picker remains SSOT.
 * @param {string} href
 */
export function accountIdFromLocation(href) {
  const absolute = new URL(href, 'https://factory-wager.local').href;
  const url = new URL(absolute);
  const fromQuery =
    url.searchParams.get('account') ||
    url.searchParams.get('partner') ||
    url.searchParams.get('node_id') ||
    '';
  if (fromQuery.trim()) return fromQuery.trim();
  const captured = accountHashPattern.exec(absolute)?.hash?.groups?.account;
  if (!captured) return '';
  try {
    return decodeURIComponent(captured);
  } catch {
    return String(captured);
  }
}

/**
 * @param {string} href
 * @returns {string | null}
 */
export function sectionFromLocation(href) {
  const absolute = new URL(href, 'https://factory-wager.local').href;
  return sectionHashPattern.exec(absolute)?.hash?.groups?.section ?? null;
}

/**
 * Build dossier URL with query SSOT + limits-aligned #account: hash.
 * @param {{ accountId?: string; hours?: number; section?: string | null; base?: string }} opts
 */
export function buildAccountDossierHref({
  accountId = '',
  hours = 168,
  section = null,
  base = '/portal/account/',
} = {}) {
  const url = new URL(base, 'https://factory-wager.local');
  if (accountId) url.searchParams.set('account', accountId);
  else url.searchParams.delete('account');
  url.searchParams.delete('partner');
  url.searchParams.delete('node_id');
  if (hours && Number(hours) !== 168) url.searchParams.set('hours', String(hours));
  else url.searchParams.delete('hours');
  if (accountId && section) {
    url.hash = `account:${encodeURIComponent(accountId)}`;
    // section hash cannot coexist with account hash in one fragment — keep account;
    // section scroll is applied via sync after load when only #section: is used.
  } else if (accountId) {
    url.hash = `account:${encodeURIComponent(accountId)}`;
  } else if (section) {
    url.hash = `section:${encodeURIComponent(section)}`;
  } else {
    url.hash = '';
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** @param {unknown} ref */
export function partnerCodeFromRef(ref) {
  const raw = String(ref || '')
    .trim()
    .toUpperCase();
  if (PARTNER_CODE_RE.test(raw)) return raw;
  const match = raw.match(CALL_SIGN_RE);
  return match?.[1] ?? null;
}

/**
 * @param {string} seed
 * @param {Iterable<string>} candidates
 */
export function resolveAccountId(seed, candidates) {
  const list = [...candidates].filter(Boolean);
  if (!seed) return '';
  if (list.includes(seed)) return seed;
  const upper = String(seed).toUpperCase();
  const exact = list.find(id => String(id).toUpperCase() === upper);
  if (exact) return exact;
  const code = partnerCodeFromRef(seed);
  if (code) {
    const byCode = list.filter(id => partnerCodeFromRef(id) === code);
    if (byCode.length === 1) return byCode[0];
    const preferred = byCode.find(id => String(id).toUpperCase().endsWith('-001'));
    if (preferred) return preferred;
    if (byCode[0]) return byCode[0];
  }
  return seed;
}

/**
 * @param {object} limitRaises
 * @returns {string[]}
 */
export function collectAccountIds(limitRaises) {
  const ids = new Set();
  for (const key of Object.keys(limitRaises?.byNode ?? {})) ids.add(key);
  for (const pattern of limitRaises?.patterns?.nodePatterns ?? []) {
    if (pattern?.node_id) ids.add(String(pattern.node_id));
  }
  for (const profile of limitRaises?.accountProfiles?.profiles ?? []) {
    if (profile?.treeNodeId) ids.add(String(profile.treeNodeId));
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/**
 * Partner CODE from call-sign / UUID profile / pattern name.
 * @param {object | null} profile
 * @param {object | null} pattern
 * @param {string} accountId
 * @param {string} partnerNodeId
 */
function resolvePartnerCode(profile, pattern, accountId, partnerNodeId) {
  return (
    partnerCodeFromRef(profile?.callSign) ||
    partnerCodeFromRef(pattern?.node_name) ||
    partnerCodeFromRef(accountId) ||
    partnerCodeFromRef(partnerNodeId)
  );
}

/**
 * Connected partner-tree rows — pattern bake first, then profile lineage fallback.
 * @param {string} accountId
 * @param {string} partnerNodeId
 * @param {object[]} patterns
 * @param {object[]} profiles
 */
function buildConnectedTree(accountId, partnerNodeId, patterns, profiles) {
  const fromPatterns = patterns.filter(
    row => String(row.partner_node_id) === partnerNodeId || String(row.node_id) === accountId
  );
  if (fromPatterns.length > 0) {
    return fromPatterns.slice().sort((a, b) => {
      const depth = (a.downline_depth ?? 0) - (b.downline_depth ?? 0);
      if (depth !== 0) return depth;
      return String(a.node_id).localeCompare(String(b.node_id));
    });
  }

  const byId = new Map(profiles.map(row => [String(row.treeNodeId), row]));
  if (!byId.has(accountId) && !byId.has(partnerNodeId)) return [];

  /** Walk up to partner root via parentNodeId. */
  let root = partnerNodeId;
  let cursor = byId.get(partnerNodeId) ?? byId.get(accountId) ?? null;
  const seen = new Set();
  while (cursor?.parentNodeId && !seen.has(String(cursor.treeNodeId))) {
    seen.add(String(cursor.treeNodeId));
    const parent = byId.get(String(cursor.parentNodeId));
    if (!parent) break;
    root = String(parent.treeNodeId);
    cursor = parent;
    if (String(parent.accountKind).toLowerCase() === 'partner') break;
  }

  /** True when row is root, the viewed account, or any ancestor chain reaches root. */
  function underPartnerRoot(row) {
    const id = String(row.treeNodeId);
    if (id === root || id === accountId) return true;
    let walk = row;
    const walkSeen = new Set();
    let hops = 0;
    while (walk?.parentNodeId && hops < 16 && !walkSeen.has(String(walk.treeNodeId))) {
      walkSeen.add(String(walk.treeNodeId));
      if (String(walk.parentNodeId) === root) return true;
      walk = byId.get(String(walk.parentNodeId));
      hops += 1;
    }
    return false;
  }

  function depthFromRoot(row) {
    if (String(row.treeNodeId) === root) return 0;
    let depth = 0;
    let walk = row;
    const walkSeen = new Set();
    while (walk?.parentNodeId && depth < 16 && !walkSeen.has(String(walk.treeNodeId))) {
      walkSeen.add(String(walk.treeNodeId));
      depth += 1;
      if (String(walk.parentNodeId) === root) return depth;
      walk = byId.get(String(walk.parentNodeId));
    }
    return depth;
  }

  const underRoot = [...byId.values()].filter(underPartnerRoot);

  return underRoot
    .map(row => {
      return {
        node_id: String(row.treeNodeId),
        partner_node_id: root,
        parent_node_id: row.parentNodeId ? String(row.parentNodeId) : null,
        node_name: row.accountName ?? String(row.treeNodeId),
        node_type: row.accountKind ?? 'account',
        downline_depth: depthFromRoot(row),
        state_code: row.jurisdiction?.stateCode ?? null,
        location: row.jurisdiction?.location ?? null,
        zip_code: row.jurisdiction?.zipCode ?? null,
        zip_prefix: row.jurisdiction?.zipCode
          ? String(row.jurisdiction.zipCode).slice(0, 3)
          : null,
        license_status: row.license?.status ?? null,
        changes: row.observations?.raises ?? 0,
        raises: row.observations?.raises ?? 0,
        call_sign: row.callSign ?? null,
      };
    })
    .sort((a, b) => {
      const depth = (a.downline_depth ?? 0) - (b.downline_depth ?? 0);
      if (depth !== 0) return depth;
      return String(a.node_id).localeCompare(String(b.node_id));
    });
}

/**
 * Build a single-account dossier view-model from baked registries.
 * @param {{
 *   accountId: string;
 *   limitRaises: object;
 *   partnersOps?: object | null;
 *   hours?: number;
 * }} input
 */
export function buildAccountDossier({ accountId, limitRaises, partnersOps = null, hours = 168 }) {
  const id = String(accountId || '').trim();
  const patterns = limitRaises?.patterns?.nodePatterns ?? [];
  const profiles = limitRaises?.accountProfiles?.profiles ?? [];
  const pattern = patterns.find(row => String(row.node_id) === id) ?? null;
  const profile = profiles.find(row => String(row.treeNodeId) === id) ?? null;
  const partnerNodeId = pattern?.partner_node_id
    ? String(pattern.partner_node_id)
    : profile?.parentNodeId
      ? String(profile.parentNodeId)
      : id;
  const connected = buildConnectedTree(id, partnerNodeId, patterns, profiles);

  const bucket = limitRaises?.byNode?.[id] ?? null;
  const raises = Array.isArray(bucket?.raises) ? bucket.raises : [];
  const sinceSec = Math.floor(Date.now() / 1000) - Math.round(Number(hours || 168) * 3600);
  const raisesInWindow = raises.filter(row => {
    const at = Number(row?.increased_at ?? 0);
    return !at || at >= sinceSec;
  });

  const code = resolvePartnerCode(profile, pattern, id, partnerNodeId);

  const partnerRow =
    code && partnersOps?.partners
      ? (partnersOps.partners.find(row => String(row.code).toUpperCase() === code) ?? null)
      : null;

  const statePolicies = (limitRaises?.accountProfiles?.policies ?? []).filter(policy => {
    if (policy?.treeNodeId && String(policy.treeNodeId) === id) return true;
    if (!policy?.stateCode) return false;
    const state = pattern?.state_code ?? profile?.jurisdiction?.stateCode;
    return state != null && String(policy.stateCode) === String(state);
  });

  const betlogBase = `/api/agents/v1/limits/raises?node_id=${encodeURIComponent(id)}&hours=${encodeURIComponent(String(hours || 168))}`;

  return {
    accountId: id,
    found: Boolean(pattern || profile || bucket),
    partnerNodeId,
    partnerCode: code,
    name: pattern?.node_name ?? profile?.accountName ?? id,
    role: pattern?.node_type ?? profile?.accountKind ?? 'node',
    depth: pattern?.downline_depth ?? 0,
    parentNodeId: pattern?.parent_node_id ?? profile?.parentNodeId ?? null,
    callSign: profile?.callSign ?? null,
    location: {
      state: pattern?.state_code ?? profile?.jurisdiction?.stateCode ?? null,
      city: pattern?.location ?? profile?.jurisdiction?.location ?? null,
      zip: pattern?.zip_code ?? profile?.jurisdiction?.zipCode ?? null,
      zipPrefix: pattern?.zip_prefix ?? null,
    },
    licenseStatus: pattern?.license_status ?? profile?.license?.status ?? null,
    monitoringStatus: profile?.monitoringStatus ?? null,
    monitoringTone: profile?.tone ?? null,
    lifecycleStatus: profile?.lifecycleStatus ?? null,
    profileKey: profile?.profileKey ?? null,
    observations: profile?.observations ?? null,
    traces: Array.isArray(profile?.traces) ? profile.traces : [],
    connected,
    raises: raisesInWindow,
    raiseCount: raisesInWindow.length,
    pattern,
    profile,
    policies: statePolicies,
    partner: partnerRow,
    outs: Array.isArray(partnerRow?.outs) ? partnerRow.outs : [],
    links: {
      history: `/portal/partner-history/?account=${encodeURIComponent(id)}`,
      limits: `/portal/limits/#account:${encodeURIComponent(id)}`,
      partners: code ? `/portal/partners/#partner/${encodeURIComponent(code)}` : '/portal/partners/',
      betlogCsv: `${betlogBase}&format=csv`,
      betlogJsonl: `${betlogBase}&format=jsonl`,
      registry: '/registry/limit-raises.json',
    },
    lookbackHours: hours,
    generatedAt: limitRaises?.generatedAt ?? null,
  };
}
