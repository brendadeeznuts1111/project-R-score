import { chmod, mkdir } from "node:fs/promises";

import { Database } from "bun:sqlite";

import { serverConfig } from "./server-config";
import type {
  AuditEvent,
  ComplianceDashboard,
  PersistedDepositRecord,
  SettingsState,
} from "./types/app";
import type { TeamPayoutInput } from "./peer-team-payouts";
import type {
  ApprovalRequest,
  FundsLedgerEntry,
  InviteRecord,
  OrgMemberRecord,
} from "./org-model";

export type AuthSession = {
  token: string;
  memberId: string;
  createdAt: string;
  expiresAt: string;
};

export type StoredOrgData = {
  members: OrgMemberRecord[];
  fundsEntries: FundsLedgerEntry[];
  invites: InviteRecord[];
  approvals: ApprovalRequest[];
  sessions: AuthSession[];
  updatedAt: string;
};

export type AuthFailureRecord = {
  memberId: string;
  attempts: number;
  lastAttemptAt: string;
  lockedUntil: string | null;
};

const DEFAULT_DATA: StoredOrgData = {
  members: [],
  fundsEntries: [],
  invites: [],
  approvals: [],
  sessions: [],
  updatedAt: new Date(0).toISOString(),
};

const DEFAULT_SETTINGS: SettingsState = {
  uiRole: "Admin",
  divisions: [
    { id: "houston-hq", name: "Houston HQ", lead: "admin-central", memberCount: 0 },
    { id: "downtown", name: "Downtown", lead: "west-lead", memberCount: 0 },
    { id: "energy-corridor", name: "Energy Corridor", lead: "ops-energy", memberCount: 0 },
    { id: "heights", name: "The Heights", lead: "ops-heights", memberCount: 0 },
    { id: "remote-ops", name: "Remote Ops", lead: "remote-ops", memberCount: 0 },
  ],
  notifications: {
    telegramEnabled: true,
    telegramChannel: "@peer_ops_alerts",
    approvals: true,
    depositStatus: true,
    complianceAlerts: true,
  },
  apiKeys: [
    {
      id: "curator-api",
      label: "Curator API",
      maskedValue: "cur_live_****9f2c",
      lastRotatedAt: "2026-03-18T12:00:00.000Z",
    },
  ],
  featureFlags: {
    liveQuotes: true,
    complianceExports: true,
    realtimePolling: true,
    peerExtensionOnramp: true,
  },
};

const DEFAULT_COMPLIANCE: ComplianceDashboard = {
  kycReadyCount: 12,
  amlReviewCount: 2,
  openAlerts: 3,
  proofBacklog: 4,
  reports: [
    { id: "report-1", name: "Daily compliance digest", status: "ready", generatedAt: "2026-04-24T12:00:00.000Z" },
    { id: "report-2", name: "Weekly AML review", status: "queued", generatedAt: "2026-04-24T16:00:00.000Z" },
  ],
  cases: [
    {
      id: "case-1",
      memberId: "west-lead",
      division: "Houston HQ",
      severity: "medium",
      category: "AML",
      status: "reviewing",
      owner: "compliance-queue",
      summary: "Velocity spike on newly activated payout route.",
      lastUpdatedAt: "2026-04-24T15:00:00.000Z",
    },
    {
      id: "case-2",
      memberId: "new-member-01",
      division: "Remote Ops",
      severity: "high",
      category: "Proof",
      status: "open",
      owner: "proof-desk",
      summary: "Pending zkTLS proof verification for latest payout verification batch.",
      lastUpdatedAt: "2026-04-24T13:30:00.000Z",
    },
  ],
};

let dbInstance: Database | null = null;
type SqlBinding = string | number | bigint | Uint8Array | null;

function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonValue<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

function intToBool(value: number | bigint | null | undefined): boolean {
  return Number(value ?? 0) === 1;
}

function rowsToUpdatedAt(rows: Array<{ updatedAt?: string; createdAt?: string; timestamp?: string; expiresAt?: string }>): string {
  const values = rows
    .flatMap((row) => [row.updatedAt, row.createdAt, row.timestamp, row.expiresAt])
    .filter((value): value is string => typeof value === "string");
  return values.length > 0 ? values.sort().at(-1)! : new Date(0).toISOString();
}

async function ensureDataDir(): Promise<void> {
  await mkdir(serverConfig.dataDir, { recursive: true });
  try {
    await chmod(serverConfig.dataDir, 0o700);
  } catch {
    // Ignore host filesystem permission limitations.
  }
}

function migrateLegacy(parsed: unknown): StoredOrgData {
  if (!parsed || typeof parsed !== "object") {
    return DEFAULT_DATA;
  }

  const candidate = parsed as Partial<StoredOrgData> & { team?: TeamPayoutInput[] };
  if (Array.isArray(candidate.members)) {
    return {
      members: candidate.members,
      fundsEntries: Array.isArray(candidate.fundsEntries) ? candidate.fundsEntries : [],
      invites: Array.isArray(candidate.invites) ? candidate.invites : [],
      approvals: Array.isArray(candidate.approvals) ? candidate.approvals : [],
      sessions: Array.isArray(candidate.sessions) ? candidate.sessions : [],
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : DEFAULT_DATA.updatedAt,
    };
  }

  if (Array.isArray(candidate.team)) {
    const migratedMembers = candidate.team.map((member) => ({
      memberId: member.memberId,
      displayName: member.displayName,
      email: `${member.memberId}@local.peer.demo`,
      state: "TX",
      region: "south" as const,
      role: "member" as const,
      leaderForRegion: false,
      canExecutePeerTransactions: false,
      venmo: member.venmo ?? null,
      cashapp: member.cashapp ?? null,
      paypal: member.paypal ?? null,
      createdAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : nowIso(),
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : nowIso(),
    }));

    return {
      members: migratedMembers,
      fundsEntries: [],
      invites: [],
      approvals: [],
      sessions: [],
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : DEFAULT_DATA.updatedAt,
    };
  }

  return DEFAULT_DATA;
}

async function readLegacyDataFile(): Promise<StoredOrgData> {
  const file = Bun.file(serverConfig.legacyDataFile);
  if (!(await file.exists())) {
    return DEFAULT_DATA;
  }
  return migrateLegacy(await file.json());
}

function getDb(): Database {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new Database(serverConfig.databasePath, { create: true });
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS members (
      memberId TEXT PRIMARY KEY,
      displayName TEXT NOT NULL,
      email TEXT NOT NULL,
      state TEXT NOT NULL,
      region TEXT NOT NULL,
      role TEXT NOT NULL,
      leaderForRegion INTEGER NOT NULL,
      canExecutePeerTransactions INTEGER NOT NULL,
      passwordHash TEXT,
      venmo TEXT,
      cashapp TEXT,
      paypal TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS funds_entries (
      entryId TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      amountUsdCents INTEGER NOT NULL,
      type TEXT NOT NULL,
      note TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      createdBy TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      inviteId TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      memberId TEXT NOT NULL,
      role TEXT NOT NULL,
      state TEXT NOT NULL,
      region TEXT NOT NULL,
      leaderForRegion INTEGER NOT NULL,
      canExecutePeerTransactions INTEGER NOT NULL,
      invitedBy TEXT NOT NULL,
      inviteToken TEXT NOT NULL,
      tokenExpiresAt TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      acceptedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS approvals (
      approvalId TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      memberId TEXT NOT NULL,
      region TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      actedAt TEXT,
      actedBy TEXT,
      note TEXT NOT NULL,
      payloadJson TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_failures (
      memberId TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL,
      lastAttemptAt TEXT NOT NULL,
      lockedUntil TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      division TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      metadataJson TEXT NOT NULL,
      exportable INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deposits (
      recordId TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      memberName TEXT NOT NULL,
      division TEXT NOT NULL,
      preferredMethod TEXT NOT NULL,
      processorNamesJson TEXT NOT NULL,
      fiatCurrency TEXT NOT NULL,
      walletAddress TEXT,
      tokenAddress TEXT NOT NULL,
      amountBaseUnits TEXT NOT NULL,
      minIntentAmount TEXT NOT NULL,
      maxIntentAmount TEXT NOT NULL,
      live INTEGER NOT NULL,
      riskLevel TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      transactionHash TEXT,
      onchainDepositId TEXT,
      compositeDepositId TEXT,
      escrowAddress TEXT,
      payeeDetailsHashesJson TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      eventsJson TEXT NOT NULL,
      lastError TEXT
    );

    CREATE TABLE IF NOT EXISTS settings_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payloadJson TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compliance_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payloadJson TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  return dbInstance;
}

function selectMembers(): OrgMemberRecord[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM members ORDER BY createdAt ASC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    memberId: String(row.memberId),
    displayName: String(row.displayName),
    email: String(row.email),
    state: String(row.state),
    region: String(row.region) as OrgMemberRecord["region"],
    role: String(row.role) as OrgMemberRecord["role"],
    leaderForRegion: intToBool(row.leaderForRegion as number),
    canExecutePeerTransactions: intToBool(row.canExecutePeerTransactions as number),
    passwordHash: typeof row.passwordHash === "string" ? row.passwordHash : undefined,
    venmo: (row.venmo as string | null) ?? null,
    cashapp: (row.cashapp as string | null) ?? null,
    paypal: (row.paypal as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }));
}

function selectFundsEntries(): FundsLedgerEntry[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM funds_entries ORDER BY createdAt DESC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    entryId: String(row.entryId),
    memberId: String(row.memberId),
    amountUsdCents: Number(row.amountUsdCents),
    type: String(row.type) as FundsLedgerEntry["type"],
    note: String(row.note),
    createdAt: String(row.createdAt),
    createdBy: String(row.createdBy),
  }));
}

function selectInvites(): InviteRecord[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM invites ORDER BY createdAt DESC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    inviteId: String(row.inviteId),
    email: String(row.email),
    memberId: String(row.memberId),
    role: String(row.role) as InviteRecord["role"],
    state: String(row.state),
    region: String(row.region) as InviteRecord["region"],
    leaderForRegion: intToBool(row.leaderForRegion as number),
    canExecutePeerTransactions: intToBool(row.canExecutePeerTransactions as number),
    invitedBy: String(row.invitedBy),
    inviteToken: String(row.inviteToken),
    tokenExpiresAt: typeof row.tokenExpiresAt === "string" ? row.tokenExpiresAt : undefined,
    status: String(row.status) as InviteRecord["status"],
    createdAt: String(row.createdAt),
    acceptedAt: typeof row.acceptedAt === "string" ? row.acceptedAt : undefined,
  }));
}

function selectApprovals(): ApprovalRequest[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM approvals ORDER BY createdAt DESC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    approvalId: String(row.approvalId),
    type: String(row.type) as ApprovalRequest["type"],
    memberId: String(row.memberId),
    region: String(row.region) as ApprovalRequest["region"],
    requestedBy: String(row.requestedBy),
    status: String(row.status) as ApprovalRequest["status"],
    createdAt: String(row.createdAt),
    actedAt: typeof row.actedAt === "string" ? row.actedAt : undefined,
    actedBy: typeof row.actedBy === "string" ? row.actedBy : undefined,
    note: String(row.note),
    payload: parseJsonValue(row.payloadJson as string, {}),
  }));
}

function selectSessions(): AuthSession[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM sessions ORDER BY createdAt DESC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    token: String(row.token),
    memberId: String(row.memberId),
    createdAt: String(row.createdAt),
    expiresAt: String(row.expiresAt),
  }));
}

function insertStoredOrgData(data: StoredOrgData): void {
  const db = getDb();
  const tx = db.transaction((input: StoredOrgData) => {
    db.exec(`
      DELETE FROM members;
      DELETE FROM funds_entries;
      DELETE FROM invites;
      DELETE FROM approvals;
      DELETE FROM sessions;
    `);

    const insertMember = db.query(`
      INSERT INTO members (
        memberId, displayName, email, state, region, role,
        leaderForRegion, canExecutePeerTransactions, passwordHash,
        venmo, cashapp, paypal, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const member of input.members) {
      insertMember.run(
        member.memberId,
        member.displayName,
        member.email,
        member.state,
        member.region,
        member.role,
        boolToInt(member.leaderForRegion),
        boolToInt(member.canExecutePeerTransactions),
        member.passwordHash ?? null,
        member.venmo ?? null,
        member.cashapp ?? null,
        member.paypal ?? null,
        member.createdAt,
        member.updatedAt,
      );
    }

    const insertFundsEntry = db.query(`
      INSERT INTO funds_entries (
        entryId, memberId, amountUsdCents, type, note, createdAt, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const entry of input.fundsEntries) {
      insertFundsEntry.run(
        entry.entryId,
        entry.memberId,
        entry.amountUsdCents,
        entry.type,
        entry.note,
        entry.createdAt,
        entry.createdBy,
      );
    }

    const insertInvite = db.query(`
      INSERT INTO invites (
        inviteId, email, memberId, role, state, region, leaderForRegion,
        canExecutePeerTransactions, invitedBy, inviteToken, tokenExpiresAt,
        status, createdAt, acceptedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const invite of input.invites) {
      insertInvite.run(
        invite.inviteId,
        invite.email,
        invite.memberId,
        invite.role,
        invite.state,
        invite.region,
        boolToInt(invite.leaderForRegion),
        boolToInt(invite.canExecutePeerTransactions),
        invite.invitedBy,
        invite.inviteToken,
        invite.tokenExpiresAt ?? null,
        invite.status,
        invite.createdAt,
        invite.acceptedAt ?? null,
      );
    }

    const insertApproval = db.query(`
      INSERT INTO approvals (
        approvalId, type, memberId, region, requestedBy, status,
        createdAt, actedAt, actedBy, note, payloadJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const approval of input.approvals) {
      insertApproval.run(
        approval.approvalId,
        approval.type,
        approval.memberId,
        approval.region,
        approval.requestedBy,
        approval.status,
        approval.createdAt,
        approval.actedAt ?? null,
        approval.actedBy ?? null,
        approval.note,
        JSON.stringify(approval.payload),
      );
    }

    const insertSession = db.query(`
      INSERT INTO sessions (token, memberId, createdAt, expiresAt)
      VALUES (?, ?, ?, ?)
    `);
    for (const session of input.sessions) {
      insertSession.run(session.token, session.memberId, session.createdAt, session.expiresAt);
    }
  });

  tx(data);
}

async function initializeStore(): Promise<void> {
  await ensureDataDir();
  const db = getDb();
  const memberCount = Number((db.query("SELECT COUNT(*) as count FROM members").get() as { count: number }).count);
  if (memberCount === 0) {
    const legacy = await readLegacyDataFile();
    insertStoredOrgData(legacy);
  }

  const settingsRow = db.query("SELECT COUNT(*) as count FROM settings_state").get() as { count: number };
  if (Number(settingsRow.count) === 0) {
    db.query("INSERT INTO settings_state (id, payloadJson, updatedAt) VALUES (1, ?, ?)").run(
      JSON.stringify(DEFAULT_SETTINGS),
      nowIso(),
    );
  }

  const complianceRow = db.query("SELECT COUNT(*) as count FROM compliance_state").get() as { count: number };
  if (Number(complianceRow.count) === 0) {
    db.query("INSERT INTO compliance_state (id, payloadJson, updatedAt) VALUES (1, ?, ?)").run(
      JSON.stringify(DEFAULT_COMPLIANCE),
      nowIso(),
    );
  }

  try {
    await chmod(serverConfig.databasePath, 0o600);
  } catch {
    // Ignore when not supported by the host filesystem.
  }
}

export async function readStoredOrgData(): Promise<StoredOrgData> {
  await initializeStore();
  const members = selectMembers();
  const fundsEntries = selectFundsEntries();
  const invites = selectInvites();
  const approvals = selectApprovals();
  const sessions = selectSessions();
  return {
    members,
    fundsEntries,
    invites,
    approvals,
    sessions,
    updatedAt: rowsToUpdatedAt([...members, ...fundsEntries, ...invites, ...approvals, ...sessions]),
  };
}

export async function writeStoredOrgData(data: StoredOrgData): Promise<StoredOrgData> {
  await initializeStore();
  insertStoredOrgData({
    ...data,
    updatedAt: nowIso(),
  });
  return readStoredOrgData();
}

export async function mutateStoredOrgData(
  mutator: (current: StoredOrgData) => StoredOrgData,
): Promise<StoredOrgData> {
  await initializeStore();
  const db = getDb();
  const tx = db.transaction((applyMutation: typeof mutator) => {
    const current: StoredOrgData = {
      members: selectMembers(),
      fundsEntries: selectFundsEntries(),
      invites: selectInvites(),
      approvals: selectApprovals(),
      sessions: selectSessions(),
      updatedAt: nowIso(),
    };
    const next = applyMutation(current);
    insertStoredOrgData({
      ...next,
      updatedAt: nowIso(),
    });
    return {
      members: selectMembers(),
      fundsEntries: selectFundsEntries(),
      invites: selectInvites(),
      approvals: selectApprovals(),
      sessions: selectSessions(),
      updatedAt: rowsToUpdatedAt([
        ...selectMembers(),
        ...selectFundsEntries(),
        ...selectInvites(),
        ...selectApprovals(),
        ...selectSessions(),
      ]),
    } satisfies StoredOrgData;
  });

  return tx(mutator);
}

export async function findSessionByToken(token: string): Promise<AuthSession | null> {
  await initializeStore();
  const row = getDb().query("SELECT * FROM sessions WHERE token = ?").get(token) as Record<string, unknown> | null;
  if (!row) {
    return null;
  }

  const session: AuthSession = {
    token: String(row.token),
    memberId: String(row.memberId),
    createdAt: String(row.createdAt),
    expiresAt: String(row.expiresAt),
  };

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    getDb().query("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return session;
}

export async function purgeExpiredSessions(): Promise<StoredOrgData> {
  await initializeStore();
  const db = getDb();
  db.query("DELETE FROM sessions WHERE expiresAt <= ?").run(nowIso());
  return readStoredOrgData();
}

export async function upsertSession(session: AuthSession): Promise<AuthSession> {
  await initializeStore();
  getDb().query(`
    INSERT INTO sessions (token, memberId, createdAt, expiresAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET
      memberId = excluded.memberId,
      createdAt = excluded.createdAt,
      expiresAt = excluded.expiresAt
  `).run(session.token, session.memberId, session.createdAt, session.expiresAt);
  return session;
}

export async function deleteSession(token: string | null | undefined): Promise<void> {
  if (!token) {
    return;
  }
  await initializeStore();
  getDb().query("DELETE FROM sessions WHERE token = ?").run(token);
}

export async function readAuthFailure(memberId: string): Promise<AuthFailureRecord | null> {
  await initializeStore();
  const db = getDb();
  const row = db.query("SELECT * FROM auth_failures WHERE memberId = ?").get(memberId) as Record<string, unknown> | null;
  if (!row) {
    return null;
  }
  return {
    memberId: String(row.memberId),
    attempts: Number(row.attempts),
    lastAttemptAt: String(row.lastAttemptAt),
    lockedUntil: typeof row.lockedUntil === "string" ? row.lockedUntil : null,
  };
}

export async function writeAuthFailure(record: AuthFailureRecord): Promise<void> {
  await initializeStore();
  const db = getDb();
  db.query(`
    INSERT INTO auth_failures (memberId, attempts, lastAttemptAt, lockedUntil)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(memberId) DO UPDATE SET
      attempts = excluded.attempts,
      lastAttemptAt = excluded.lastAttemptAt,
      lockedUntil = excluded.lockedUntil
  `).run(record.memberId, record.attempts, record.lastAttemptAt, record.lockedUntil);
}

export async function clearAuthFailure(memberId: string): Promise<void> {
  await initializeStore();
  getDb().query("DELETE FROM auth_failures WHERE memberId = ?").run(memberId);
}

export async function readSettingsState(): Promise<{ settings: SettingsState; updatedAt: string }> {
  await initializeStore();
  const row = getDb().query("SELECT payloadJson, updatedAt FROM settings_state WHERE id = 1").get() as {
    payloadJson: string;
    updatedAt: string;
  };
  return {
    settings: parseJsonValue(row.payloadJson, DEFAULT_SETTINGS),
    updatedAt: row.updatedAt,
  };
}

export async function writeSettingsState(settings: SettingsState): Promise<{ settings: SettingsState; updatedAt: string }> {
  await initializeStore();
  const updatedAt = nowIso();
  getDb().query("UPDATE settings_state SET payloadJson = ?, updatedAt = ? WHERE id = 1").run(
    JSON.stringify(settings),
    updatedAt,
  );
  return { settings, updatedAt };
}

export async function readComplianceDashboard(): Promise<{ dashboard: ComplianceDashboard; updatedAt: string }> {
  await initializeStore();
  const row = getDb().query("SELECT payloadJson, updatedAt FROM compliance_state WHERE id = 1").get() as {
    payloadJson: string;
    updatedAt: string;
  };
  return {
    dashboard: parseJsonValue(row.payloadJson, DEFAULT_COMPLIANCE),
    updatedAt: row.updatedAt,
  };
}

export async function writeComplianceDashboard(
  dashboard: ComplianceDashboard,
): Promise<{ dashboard: ComplianceDashboard; updatedAt: string }> {
  await initializeStore();
  const updatedAt = nowIso();
  getDb().query("UPDATE compliance_state SET payloadJson = ?, updatedAt = ? WHERE id = 1").run(
    JSON.stringify(dashboard),
    updatedAt,
  );
  return { dashboard, updatedAt };
}

export async function readAuditEvents(filters?: {
  type?: string;
  division?: string;
  actor?: string;
  dateFrom?: string;
}): Promise<{ items: AuditEvent[]; updatedAt: string }> {
  await initializeStore();
  const clauses: string[] = [];
  const params: SqlBinding[] = [];
  if (filters?.type) {
    clauses.push("type = ?");
    params.push(filters.type);
  }
  if (filters?.division) {
    clauses.push("division = ?");
    params.push(filters.division);
  }
  if (filters?.actor) {
    clauses.push("LOWER(actor) LIKE ?");
    params.push(`%${filters.actor.toLowerCase()}%`);
  }
  if (filters?.dateFrom) {
    clauses.push("timestamp >= ?");
    params.push(filters.dateFrom);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().query(`SELECT * FROM audit_events ${where} ORDER BY timestamp DESC`).all(...params) as Array<Record<string, unknown>>;
  const items: AuditEvent[] = rows.map((row) => ({
    id: String(row.id),
    type: String(row.type) as AuditEvent["type"],
    actor: String(row.actor),
    role: String(row.role) as AuditEvent["role"],
    division: String(row.division) as AuditEvent["division"],
    timestamp: String(row.timestamp),
    title: String(row.title),
    description: String(row.description),
    metadata: parseJsonValue(row.metadataJson as string, {}),
    exportable: intToBool(row.exportable as number),
  }));
  return {
    items,
    updatedAt: rowsToUpdatedAt(items),
  };
}

export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  await initializeStore();
  getDb().query(`
    INSERT INTO audit_events (
      id, type, actor, role, division, timestamp, title, description, metadataJson, exportable
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.type,
    event.actor,
    event.role,
    event.division,
    event.timestamp,
    event.title,
    event.description,
    JSON.stringify(event.metadata),
    boolToInt(event.exportable),
  );
}

function mapDepositRow(row: Record<string, unknown>): PersistedDepositRecord {
  return {
    recordId: String(row.recordId),
    memberId: String(row.memberId),
    memberName: String(row.memberName),
    division: String(row.division) as PersistedDepositRecord["division"],
    preferredMethod: String(row.preferredMethod),
    processorNames: parseJsonValue(row.processorNamesJson as string, []),
    fiatCurrency: String(row.fiatCurrency),
    walletAddress: typeof row.walletAddress === "string" ? row.walletAddress : null,
    tokenAddress: String(row.tokenAddress),
    amountBaseUnits: String(row.amountBaseUnits),
    minIntentAmount: String(row.minIntentAmount),
    maxIntentAmount: String(row.maxIntentAmount),
    live: intToBool(row.live as number),
    riskLevel: String(row.riskLevel) as PersistedDepositRecord["riskLevel"],
    status: String(row.status) as PersistedDepositRecord["status"],
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    createdBy: String(row.createdBy),
    updatedBy: String(row.updatedBy),
    transactionHash: typeof row.transactionHash === "string" ? row.transactionHash : null,
    onchainDepositId: typeof row.onchainDepositId === "string" ? row.onchainDepositId : null,
    compositeDepositId: typeof row.compositeDepositId === "string" ? row.compositeDepositId : null,
    escrowAddress: typeof row.escrowAddress === "string" ? row.escrowAddress : null,
    payeeDetailsHashes: parseJsonValue(row.payeeDetailsHashesJson as string, []),
    payload: parseJsonValue<PersistedDepositRecord["payload"]>(row.payloadJson as string, {
      token: String(row.tokenAddress),
      amount: String(row.amountBaseUnits),
      intentAmountRange: {
        min: String(row.minIntentAmount),
        max: String(row.maxIntentAmount),
      },
      processorNames: parseJsonValue(row.processorNamesJson as string, []),
      depositData: [],
      payeeData: [],
      conversionRates: [],
    }),
    lastError: typeof row.lastError === "string" ? row.lastError : null,
    events: parseJsonValue(row.eventsJson as string, []),
  };
}

export async function listDeposits(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  division?: string;
  paymentMethod?: string;
  memberId?: string;
}): Promise<{
  deposits: PersistedDepositRecord[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}> {
  await initializeStore();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.max(1, filters?.pageSize ?? 20);
  const clauses: string[] = [];
  const params: SqlBinding[] = [];
  if (filters?.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.division) {
    clauses.push("division = ?");
    params.push(filters.division);
  }
  if (filters?.paymentMethod) {
    clauses.push("LOWER(preferredMethod) LIKE ?");
    params.push(`%${filters.paymentMethod.toLowerCase()}%`);
  }
  if (filters?.memberId) {
    clauses.push("memberId = ?");
    params.push(filters.memberId);
  }
  if (filters?.search) {
    clauses.push("(LOWER(recordId) LIKE ? OR LOWER(memberId) LIKE ? OR LOWER(memberName) LIKE ? OR LOWER(COALESCE(walletAddress, '')) LIKE ?)");
    const query = `%${filters.search.toLowerCase()}%`;
    params.push(query, query, query, query);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const totalItems = Number((getDb().query(`SELECT COUNT(*) as count FROM deposits ${where}`).get(...params) as { count: number }).count);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const offset = (Math.min(page, totalPages) - 1) * pageSize;
  const rows = getDb().query(`SELECT * FROM deposits ${where} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Array<Record<string, unknown>>;
  return {
    deposits: rows.map(mapDepositRow),
    pagination: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

export async function readDeposit(recordId: string): Promise<PersistedDepositRecord | null> {
  await initializeStore();
  const row = getDb().query("SELECT * FROM deposits WHERE recordId = ?").get(recordId) as Record<string, unknown> | null;
  return row ? mapDepositRow(row) : null;
}

export async function upsertDeposit(record: PersistedDepositRecord): Promise<PersistedDepositRecord> {
  await initializeStore();
  getDb().query(`
    INSERT INTO deposits (
      recordId, memberId, memberName, division, preferredMethod, processorNamesJson, fiatCurrency,
      walletAddress, tokenAddress, amountBaseUnits, minIntentAmount, maxIntentAmount, live, riskLevel,
      status, createdAt, updatedAt, createdBy, updatedBy, transactionHash, onchainDepositId,
      compositeDepositId, escrowAddress, payeeDetailsHashesJson, payloadJson, eventsJson, lastError
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(recordId) DO UPDATE SET
      memberId = excluded.memberId,
      memberName = excluded.memberName,
      division = excluded.division,
      preferredMethod = excluded.preferredMethod,
      processorNamesJson = excluded.processorNamesJson,
      fiatCurrency = excluded.fiatCurrency,
      walletAddress = excluded.walletAddress,
      tokenAddress = excluded.tokenAddress,
      amountBaseUnits = excluded.amountBaseUnits,
      minIntentAmount = excluded.minIntentAmount,
      maxIntentAmount = excluded.maxIntentAmount,
      live = excluded.live,
      riskLevel = excluded.riskLevel,
      status = excluded.status,
      updatedAt = excluded.updatedAt,
      updatedBy = excluded.updatedBy,
      transactionHash = excluded.transactionHash,
      onchainDepositId = excluded.onchainDepositId,
      compositeDepositId = excluded.compositeDepositId,
      escrowAddress = excluded.escrowAddress,
      payeeDetailsHashesJson = excluded.payeeDetailsHashesJson,
      payloadJson = excluded.payloadJson,
      eventsJson = excluded.eventsJson,
      lastError = excluded.lastError
  `).run(
    record.recordId,
    record.memberId,
    record.memberName,
    record.division,
    record.preferredMethod,
    JSON.stringify(record.processorNames),
    record.fiatCurrency,
    record.walletAddress,
    record.tokenAddress,
    record.amountBaseUnits,
    record.minIntentAmount,
    record.maxIntentAmount,
    boolToInt(record.live),
    record.riskLevel,
    record.status,
    record.createdAt,
    record.updatedAt,
    record.createdBy,
    record.updatedBy,
    record.transactionHash,
    record.onchainDepositId,
    record.compositeDepositId,
    record.escrowAddress,
    JSON.stringify(record.payeeDetailsHashes),
    JSON.stringify(record.payload),
    JSON.stringify(record.events),
    record.lastError,
  );
  return (await readDeposit(record.recordId))!;
}

export async function isStoreReady(): Promise<boolean> {
  await initializeStore();
  const row = getDb().query("SELECT 1 as ready").get() as { ready?: number } | null;
  return Number(row?.ready ?? 0) === 1;
}
