import { runtimeConfig } from "../config";
import type {
  AppRole,
  AuditEvent,
  ComplianceDashboard,
  DashboardResponse,
  DepositStatus,
  SettingsState,
} from "../types/app";
import {
  auditEventSchema,
  complianceDashboardSchema,
  depositRecordSchema,
  settingsStateSchema,
} from "../types/schemas";

import { formatTimestamp } from "../utils/formatters";

export type DepositRecord = typeof depositRecordSchema._output;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultSettingsState(): SettingsState {
  return {
    uiRole: runtimeConfig.defaultRole,
    divisions: [
      { id: "houston-hq", name: "Houston HQ", lead: "admin-central", memberCount: 6 },
      { id: "downtown", name: "Downtown", lead: "west-lead", memberCount: 4 },
      { id: "energy-corridor", name: "Energy Corridor", lead: "ops-energy", memberCount: 3 },
      { id: "heights", name: "The Heights", lead: "ops-heights", memberCount: 2 },
      { id: "remote-ops", name: "Remote Ops", lead: "remote-ops", memberCount: 5 },
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
}

function defaultComplianceDashboard(): ComplianceDashboard {
  return {
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
}

let uiRoleMemory: AppRole = runtimeConfig.defaultRole;
let settingsMemory: SettingsState = defaultSettingsState();
let depositMemory: DepositRecord[] = [];
let auditMemory: AuditEvent[] = [];
let complianceMemory: ComplianceDashboard = defaultComplianceDashboard();

export function getUiRole(): AppRole {
  return uiRoleMemory;
}

export function setUiRole(role: AppRole): void {
  uiRoleMemory = role;
}

export function getSettingsState(): SettingsState {
  return settingsStateSchema.parse(settingsMemory);
}

export function saveSettingsState(settings: SettingsState): void {
  settingsMemory = settingsStateSchema.parse(settings);
}

export function getDepositRecords(): DepositRecord[] {
  return depositRecordSchema.array().parse(depositMemory);
}

export function saveDepositRecords(records: DepositRecord[]): void {
  depositMemory = depositRecordSchema.array().parse(records);
}

export function upsertDepositRecord(record: DepositRecord): DepositRecord[] {
  const next = [
    record,
    ...getDepositRecords().filter((item) => item.id !== record.id),
  ];
  saveDepositRecords(next);
  return next;
}

export function updateDepositStatus(ids: string[], status: DepositStatus): DepositRecord[] {
  const next = getDepositRecords().map((record) =>
    ids.includes(record.id)
      ? { ...record, status, updatedAt: nowIso() }
      : record,
  );
  saveDepositRecords(next);
  return next;
}

export function getAuditEvents(): AuditEvent[] {
  return auditEventSchema.array().parse(auditMemory);
}

export function saveAuditEvents(events: AuditEvent[]): void {
  auditMemory = auditEventSchema.array().parse(events);
}

export function appendAuditEvent(event: AuditEvent): AuditEvent[] {
  const next = [event, ...getAuditEvents()].slice(0, 250);
  saveAuditEvents(next);
  return next;
}

export function getComplianceDashboard(): ComplianceDashboard {
  return complianceDashboardSchema.parse(complianceMemory);
}

export function saveComplianceDashboard(dashboard: ComplianceDashboard): void {
  complianceMemory = complianceDashboardSchema.parse(dashboard);
}

export function seedAuditFromDashboard(
  dashboard: DashboardResponse,
  actorRole: AppRole,
): AuditEvent[] {
  const seeded: AuditEvent[] = [
    ...dashboard.approvals.map((approval) => ({
      id: approval.approvalId,
      type: "approval" as const,
      actor: approval.requestedBy,
      role: actorRole,
      division: "Houston HQ" as const,
      timestamp: approval.createdAt,
      title: `Approval ${approval.status}`,
      description: `${approval.type} request for ${approval.memberId}`,
      metadata: {
        region: approval.region,
        note: approval.note,
      },
      exportable: true,
    })),
    ...dashboard.summary.funds.entries.map((entry) => ({
      id: entry.entryId,
      type: "system" as const,
      actor: entry.createdBy,
      role: actorRole,
      division: "Houston HQ" as const,
      timestamp: entry.createdAt,
      title: "Funds movement recorded",
      description: `${entry.memberId} ${entry.type} ${entry.amountUsdCents / 100}`,
      metadata: {
        note: entry.note,
        createdAt: formatTimestamp(entry.createdAt),
      },
      exportable: true,
    })),
  ];

  const dashboardIds = new Set(seeded.map((event) => event.id));
  const localOnlyEvents = getAuditEvents().filter((event) => !dashboardIds.has(event.id));
  const next = [...localOnlyEvents, ...seeded]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 250);

  saveAuditEvents(next);
  return next;
}
