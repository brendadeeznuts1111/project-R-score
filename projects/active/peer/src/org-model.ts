export type MemberOwnedPeerPayouts = {
  venmo?: string | null;
  cashapp?: string | null;
  paypal?: string | null;
};

export type UsRegion = "west" | "midwest" | "south" | "northeast";
export type OrgRole = "admin" | "regional_lead" | "finance" | "member";
export type Permission =
  | "team:read"
  | "team:write"
  | "team:delete"
  | "funds:read"
  | "funds:write"
  | "auth:manage"
  | "peer:execute"
  | "approvals:manage"
  | "invites:manage";

export type OrgMemberInput = MemberOwnedPeerPayouts & {
  memberId: string;
  displayName: string;
  email: string;
  state: string;
  role: OrgRole;
  leaderForRegion?: boolean | null;
  canExecutePeerTransactions?: boolean | null;
  password?: string | null;
};

export type OrgMemberRecord = MemberOwnedPeerPayouts & {
  memberId: string;
  displayName: string;
  email: string;
  state: string;
  region: UsRegion;
  role: OrgRole;
  leaderForRegion: boolean;
  canExecutePeerTransactions: boolean;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type FundsEntryType = "credit" | "debit";

export type FundsLedgerEntry = {
  entryId: string;
  memberId: string;
  amountUsdCents: number;
  type: FundsEntryType;
  note: string;
  createdAt: string;
  createdBy: string;
};

export type OrgSummary = {
  members: Array<Omit<OrgMemberRecord, "passwordHash"> & { permissions: Permission[]; balanceUsdCents: number }>;
  leadersByRegion: Partial<Record<UsRegion, string>>;
  funds: {
    byMember: Record<string, number>;
    byRegion: Record<UsRegion, number>;
    totalUsdCents: number;
    entries: FundsLedgerEntry[];
  };
};

export type InviteRecord = {
  inviteId: string;
  email: string;
  memberId: string;
  role: OrgRole;
  state: string;
  region: UsRegion;
  leaderForRegion: boolean;
  canExecutePeerTransactions: boolean;
  invitedBy: string;
  inviteToken: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  tokenExpiresAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
};

export type ApprovalRequest = {
  approvalId: string;
  type: "funds_entry" | "peer_access";
  memberId: string;
  region: UsRegion;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  actedAt?: string;
  actedBy?: string;
  note: string;
  payload: Record<string, string | number | boolean | null>;
};

const REGION_STATES: Record<UsRegion, string[]> = {
  west: [
    "AK","AZ","CA","CO","HI","ID","MT","NV","NM","OR","UT","WA","WY",
  ],
  midwest: [
    "IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI",
  ],
  south: [
    "AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV",
  ],
  northeast: [
    "CT","MA","ME","NH","NJ","NY","PA","RI","VT",
  ],
};

const PERMISSIONS_BY_ROLE: Record<OrgRole, Permission[]> = {
  admin: ["team:read", "team:write", "team:delete", "funds:read", "funds:write", "auth:manage", "peer:execute", "approvals:manage", "invites:manage"],
  regional_lead: ["team:read", "team:write", "funds:read", "peer:execute"],
  finance: ["team:read", "funds:read", "funds:write", "approvals:manage"],
  member: ["team:read"],
};

function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} cannot be empty.`);
  }

  return trimmed;
}

function normalizeState(state: string): string {
  const normalized = requireNonEmpty(state, "state").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error("state must be a 2-letter U.S. state code.");
  }

  return normalized;
}

export function getRegionFromState(state: string): UsRegion {
  const normalized = normalizeState(state);
  for (const [region, states] of Object.entries(REGION_STATES) as Array<[UsRegion, string[]]>) {
    if (states.includes(normalized)) {
      return region;
    }
  }

  throw new Error(`Unsupported U.S. state code "${normalized}".`);
}

export function getPermissionsForRole(role: OrgRole, canExecutePeerTransactions = false): Permission[] {
  const base = new Set<Permission>(PERMISSIONS_BY_ROLE[role]);
  if (canExecutePeerTransactions) {
    base.add("peer:execute");
  }

  return [...base];
}

export function hasPermission(member: Pick<OrgMemberRecord, "role" | "canExecutePeerTransactions" | "region" | "memberId">, permission: Permission, targetRegion?: UsRegion): boolean {
  const permissions = getPermissionsForRole(member.role, member.canExecutePeerTransactions);
  if (!permissions.includes(permission)) {
    return false;
  }

  if (member.role === "regional_lead" && targetRegion && member.region !== targetRegion) {
    return false;
  }

  return true;
}

export async function buildOrgMemberRecord(input: OrgMemberInput, existingHash?: string): Promise<OrgMemberRecord> {
  const now = new Date().toISOString();
  const passwordHash = input.password
    ? await Bun.password.hash(input.password)
    : existingHash;

  return {
    memberId: requireNonEmpty(input.memberId, "memberId"),
    displayName: requireNonEmpty(input.displayName, "displayName"),
    email: requireNonEmpty(input.email, "email").toLowerCase(),
    state: normalizeState(input.state),
    region: getRegionFromState(input.state),
    role: input.role,
    leaderForRegion: Boolean(input.leaderForRegion || input.role === "regional_lead"),
    canExecutePeerTransactions: Boolean(
      input.canExecutePeerTransactions || input.role === "admin" || input.role === "regional_lead",
    ),
    passwordHash,
    venmo: input.venmo ?? null,
    cashapp: input.cashapp ?? null,
    paypal: input.paypal ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateOrgMembers(members: OrgMemberRecord[]): void {
  const seenIds = new Set<string>();
  const leaders = new Map<UsRegion, string>();

  for (const member of members) {
    if (seenIds.has(member.memberId)) {
      throw new Error(`Duplicate memberId "${member.memberId}" is not allowed.`);
    }
    seenIds.add(member.memberId);

    if (member.leaderForRegion) {
      if (leaders.has(member.region)) {
        throw new Error(`Region "${member.region}" already has a leader.`);
      }
      leaders.set(member.region, member.memberId);
    }
  }
}

export function summarizeOrg(members: OrgMemberRecord[], entries: FundsLedgerEntry[]): OrgSummary {
  validateOrgMembers(members);

  const byMember: Record<string, number> = {};
  const byRegion: Record<UsRegion, number> = {
    west: 0,
    midwest: 0,
    south: 0,
    northeast: 0,
  };
  const leadersByRegion: Partial<Record<UsRegion, string>> = {};

  for (const member of members) {
    byMember[member.memberId] = 0;
    if (member.leaderForRegion) {
      leadersByRegion[member.region] = member.memberId;
    }
  }

  for (const entry of entries) {
    const signedAmount = entry.type === "credit" ? entry.amountUsdCents : -entry.amountUsdCents;
    byMember[entry.memberId] = (byMember[entry.memberId] ?? 0) + signedAmount;
    const member = members.find((item) => item.memberId === entry.memberId);
    if (member) {
      byRegion[member.region] += signedAmount;
    }
  }

  return {
    members: members.map((member) => ({
      memberId: member.memberId,
      displayName: member.displayName,
      email: member.email,
      state: member.state,
      region: member.region,
      role: member.role,
      leaderForRegion: member.leaderForRegion,
      canExecutePeerTransactions: member.canExecutePeerTransactions,
      venmo: member.venmo,
      cashapp: member.cashapp,
      paypal: member.paypal,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      permissions: getPermissionsForRole(member.role, member.canExecutePeerTransactions),
      balanceUsdCents: byMember[member.memberId] ?? 0,
    })),
    leadersByRegion,
    funds: {
      byMember,
      byRegion,
      totalUsdCents: Object.values(byMember).reduce((sum, value) => sum + value, 0),
      entries,
    },
  };
}
