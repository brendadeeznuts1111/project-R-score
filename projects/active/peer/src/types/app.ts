import type { z } from "zod";

import type {
  auditEventSchema,
  auditListResponseSchema,
  authSessionResponseSchema,
  authSigninResponseSchema,
  actionApprovalResponseSchema,
  peerDepositActionResponseSchema,
  peerDepositResponseSchema,
  peerDepositsListResponseSchema,
  complianceResponseSchema,
  complianceDashboardSchema,
  createApprovalResponseSchema,
  createPeerDepositRequestSchema,
  createDepositPreviewResponseSchema,
  createInviteResponseSchema,
  currencyOptionsSchema,
  dashboardResponseSchema,
  depositLifecycleEventSchema,
  executionContextResponseSchema,
  orgSummaryOnlySchema,
  peerDocsSchema,
  peerTeamResponseSchema,
  persistedDepositRecordSchema,
  settingsResponseSchema,
  settingsStateSchema,
  signOutResponseSchema,
} from "./schemas";

export const APP_ROLES = ["Operator", "Admin", "Compliance", "Viewer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const DIVISIONS = [
  "Houston HQ",
  "Downtown",
  "Energy Corridor",
  "The Heights",
  "Remote Ops",
] as const;
export type DivisionName = (typeof DIVISIONS)[number];

export const DEPOSIT_STATUSES = [
  "draft",
  "pending_approval",
  "previewed",
  "prepared",
  "submitted",
  "active",
  "paused",
  "withdrawn",
  "error",
] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const COMPLIANCE_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type ComplianceSeverity = (typeof COMPLIANCE_SEVERITIES)[number];

export const AUDIT_EVENT_TYPES = [
  "auth",
  "deposit",
  "approval",
  "member",
  "compliance",
  "settings",
  "notification",
  "system",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type PeerTeamResponse = z.infer<typeof peerTeamResponseSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type AuthSigninResponse = z.infer<typeof authSigninResponseSchema>;
export type ExecutionContextResponse = z.infer<typeof executionContextResponseSchema>;
export type CurrencyOptionsResponse = z.infer<typeof currencyOptionsSchema>;
export type PeerDocsResponse = z.infer<typeof peerDocsSchema>;
export type CreateDepositPreviewResponse = z.infer<typeof createDepositPreviewResponseSchema>;
export type CreatePeerDepositRequest = z.infer<typeof createPeerDepositRequestSchema>;
export type OrgSummaryOnlyResponse = z.infer<typeof orgSummaryOnlySchema>;
export type SignOutResponse = z.infer<typeof signOutResponseSchema>;
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;
export type CreateApprovalResponse = z.infer<typeof createApprovalResponseSchema>;
export type ActionApprovalResponse = z.infer<typeof actionApprovalResponseSchema>;
export type DepositLifecycleEvent = z.infer<typeof depositLifecycleEventSchema>;
export type PersistedDepositRecord = z.infer<typeof persistedDepositRecordSchema>;
export type PeerDepositsListResponse = z.infer<typeof peerDepositsListResponseSchema>;
export type PeerDepositResponse = z.infer<typeof peerDepositResponseSchema>;
export type PeerDepositActionResponse = z.infer<typeof peerDepositActionResponseSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AuditListResponse = z.infer<typeof auditListResponseSchema>;
export type ComplianceDashboard = z.infer<typeof complianceDashboardSchema>;
export type ComplianceResponse = z.infer<typeof complianceResponseSchema>;
export type SettingsState = z.infer<typeof settingsStateSchema>;
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

export type SummaryItem = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  hint?: string;
};

export type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      recoverable: boolean;
    };
