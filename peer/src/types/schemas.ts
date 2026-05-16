import { z } from "zod";

import {
  APP_ROLES,
  AUDIT_EVENT_TYPES,
  COMPLIANCE_SEVERITIES,
  DEPOSIT_STATUSES,
  DIVISIONS,
} from "./app";

const nullableString = z.string().nullable().optional();
const isoDateString = z.string().min(1);

export const publicMemberSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  state: z.string(),
  region: z.string(),
  role: z.string(),
  leaderForRegion: z.boolean(),
  canExecutePeerTransactions: z.boolean(),
  venmo: nullableString,
  cashapp: nullableString,
  paypal: nullableString,
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const teamMethodSchema = z.object({
  platform: z.string(),
  processorName: z.string(),
  depositData: z.record(z.string(), z.string()),
  redactedValue: z.string(),
});

export const teamMemberSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  methods: z.array(teamMethodSchema),
});

export const peerTeamResponseSchema = z.object({
  updatedAt: isoDateString,
  team: z.array(teamMemberSchema),
  model: z
    .object({
      description: z.string(),
      ownership: z.string(),
    })
    .optional(),
});

export const fundsEntrySchema = z.object({
  entryId: z.string(),
  memberId: z.string(),
  amountUsdCents: z.number(),
  type: z.enum(["credit", "debit"]),
  note: z.string(),
  createdAt: isoDateString,
  createdBy: z.string(),
});

export const orgSummaryMemberSchema = publicMemberSchema.extend({
  permissions: z.array(z.string()),
  balanceUsdCents: z.number(),
});

export const inviteSchema = z.object({
  inviteId: z.string(),
  email: z.string().email(),
  memberId: z.string(),
  role: z.string(),
  state: z.string(),
  region: z.string(),
  leaderForRegion: z.boolean(),
  canExecutePeerTransactions: z.boolean(),
  invitedBy: z.string(),
  inviteToken: z.string(),
  status: z.string(),
  createdAt: isoDateString,
  tokenExpiresAt: isoDateString.optional(),
  acceptedAt: isoDateString.optional(),
});

export const approvalSchema = z.object({
  approvalId: z.string(),
  type: z.enum(["funds_entry", "peer_access"]),
  memberId: z.string(),
  region: z.string(),
  requestedBy: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: isoDateString,
  actedAt: isoDateString.optional(),
  actedBy: z.string().optional(),
  note: z.string(),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const dashboardResponseSchema = z.object({
  updatedAt: isoDateString.optional(),
  summary: z.object({
    members: z.array(orgSummaryMemberSchema),
    leadersByRegion: z.record(z.string(), z.string()),
    funds: z.object({
      byMember: z.record(z.string(), z.number()),
      byRegion: z.record(z.string(), z.number()),
      totalUsdCents: z.number(),
      entries: z.array(fundsEntrySchema),
    }),
  }),
  invites: z.array(inviteSchema),
  approvals: z.array(approvalSchema),
  peerModel: z.record(z.string(), z.string()).optional(),
});

export const orgSummaryOnlySchema = z.object({
  summary: dashboardResponseSchema.shape.summary,
});

export const authSessionResponseSchema = z.object({
  member: publicMemberSchema.nullable(),
  permissions: z.array(z.string()),
  appRole: z.enum(APP_ROLES),
  expiresAt: isoDateString.nullable().optional(),
});

export const authSigninResponseSchema = z.object({
  session: z.object({
    memberId: z.string(),
    expiresAt: isoDateString.optional(),
    member: publicMemberSchema.optional(),
    permissions: z.array(z.string()),
    appRole: z.enum(APP_ROLES),
  }),
});

export const executionContextResponseSchema = z.object({
  context: z.object({
    signedInMember: z.object({
      memberId: z.string(),
      displayName: z.string(),
      role: z.string(),
      region: z.string(),
      canExecutePeerTransactions: z.boolean(),
      permissions: z.array(z.string()),
    }),
    payoutOwner: z.object({
      memberId: z.string(),
      displayName: z.string(),
      methods: z.array(teamMethodSchema),
      processorNames: z.array(z.string()),
    }),
    connectedWalletAddress: z.string().nullable(),
    rules: z.object({
      appAuth: z.string(),
      depositOwnership: z.string(),
      payoutOwnership: z.string(),
      onramp: z.string(),
    }),
  }),
});

export const currencyOptionsSchema = z.object({
  options: z.array(z.string()),
});

export const peerDocsSchema = z.object({
  sources: z.array(z.string().url()),
});

export const createDepositPreviewResponseSchema = z.object({
  payload: z.object({
    token: z.string(),
    amount: z.string(),
    intentAmountRange: z.object({
      min: z.string(),
      max: z.string(),
    }),
    processorNames: z.array(z.string()),
    depositData: z.array(z.record(z.string(), z.string())),
    payeeData: z.array(z.record(z.string(), z.string())),
    conversionRates: z.array(
      z.array(
        z.object({
          currency: z.string(),
          conversionRate: z.string(),
        }),
      ),
    ),
  }),
});

export const depositRecordSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  memberName: z.string(),
  division: z.enum(DIVISIONS),
  paymentMethod: z.string(),
  amountBaseUnits: z.string(),
  fiatCurrency: z.string(),
  status: z.enum(DEPOSIT_STATUSES),
  riskLevel: z.enum(COMPLIANCE_SEVERITIES),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  createdBy: z.string(),
  walletAddress: z.string().nullable(),
  tokenAddress: z.string(),
  minIntentAmount: z.string(),
  maxIntentAmount: z.string(),
  tags: z.array(z.string()),
  live: z.boolean(),
  transactionHash: z.string().nullable(),
});

export const depositLifecycleEventSchema = z.object({
  eventId: z.string(),
  depositRecordId: z.string(),
  eventType: z.enum([
    "previewed",
    "payee_registered",
    "created",
    "funded",
    "accepting_updated",
    "withdrawn",
    "reconciled",
    "error",
  ]),
  actorMemberId: z.string(),
  status: z.enum(DEPOSIT_STATUSES),
  timestamp: isoDateString,
  transactionHash: z.string().nullable(),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]),
  ),
});

export const persistedDepositRecordSchema = z.object({
  recordId: z.string(),
  memberId: z.string(),
  memberName: z.string(),
  division: z.enum(DIVISIONS),
  preferredMethod: z.string(),
  processorNames: z.array(z.string()),
  fiatCurrency: z.string(),
  walletAddress: z.string().nullable(),
  tokenAddress: z.string(),
  amountBaseUnits: z.string(),
  minIntentAmount: z.string(),
  maxIntentAmount: z.string(),
  live: z.boolean(),
  riskLevel: z.enum(COMPLIANCE_SEVERITIES),
  status: z.enum(DEPOSIT_STATUSES),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  createdBy: z.string(),
  updatedBy: z.string(),
  transactionHash: z.string().nullable(),
  onchainDepositId: z.string().nullable(),
  compositeDepositId: z.string().nullable(),
  escrowAddress: z.string().nullable(),
  payeeDetailsHashes: z.array(z.string()),
  payload: createDepositPreviewResponseSchema.shape.payload,
  lastError: z.string().nullable(),
  events: z.array(depositLifecycleEventSchema),
});

export const auditEventSchema = z.object({
  id: z.string(),
  type: z.enum(AUDIT_EVENT_TYPES),
  actor: z.string(),
  role: z.enum(APP_ROLES),
  division: z.enum(DIVISIONS),
  timestamp: isoDateString,
  title: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.string()),
  exportable: z.boolean(),
});

export const complianceCaseSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  division: z.enum(DIVISIONS),
  severity: z.enum(COMPLIANCE_SEVERITIES),
  category: z.enum(["KYC", "AML", "Sanctions", "Proof", "Operational"]),
  status: z.enum(["open", "reviewing", "resolved"]),
  owner: z.string(),
  summary: z.string(),
  lastUpdatedAt: isoDateString,
});

export const complianceDashboardSchema = z.object({
  kycReadyCount: z.number(),
  amlReviewCount: z.number(),
  openAlerts: z.number(),
  proofBacklog: z.number(),
  reports: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["ready", "queued", "failed"]),
      generatedAt: isoDateString,
    }),
  ),
  cases: z.array(complianceCaseSchema),
});

export const notificationPreferencesSchema = z.object({
  telegramEnabled: z.boolean(),
  telegramChannel: z.string(),
  approvals: z.boolean(),
  depositStatus: z.boolean(),
  complianceAlerts: z.boolean(),
});

export const apiKeyRecordSchema = z.object({
  id: z.string(),
  label: z.string(),
  maskedValue: z.string(),
  lastRotatedAt: isoDateString,
});

export const featureFlagsSchema = z.object({
  liveQuotes: z.boolean(),
  complianceExports: z.boolean(),
  realtimePolling: z.boolean(),
  peerExtensionOnramp: z.boolean(),
});

export const settingsStateSchema = z.object({
  uiRole: z.enum(APP_ROLES),
  divisions: z.array(
    z.object({
      id: z.string(),
      name: z.enum(DIVISIONS),
      lead: z.string(),
      memberCount: z.number(),
    }),
  ),
  notifications: notificationPreferencesSchema,
  apiKeys: z.array(apiKeyRecordSchema),
  featureFlags: featureFlagsSchema,
});

export const depositListResponseSchema = z.object({
  items: z.array(depositRecordSchema),
  updatedAt: isoDateString,
});

export const depositResponseSchema = z.object({
  deposit: depositRecordSchema,
  updatedAt: isoDateString,
});

export const peerDepositsListResponseSchema = z.object({
  deposits: z.array(persistedDepositRecordSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(1),
  }),
});

export const peerDepositResponseSchema = z.object({
  deposit: persistedDepositRecordSchema,
});

export const peerDepositActionResponseSchema = z.object({
  deposit: persistedDepositRecordSchema,
  action: z.object({
    type: z.enum(["create", "add_funds", "set_accepting", "withdraw"]),
    accepted: z.literal(true),
  }),
});

export const auditListResponseSchema = z.object({
  items: z.array(auditEventSchema),
  updatedAt: isoDateString,
});

export const complianceResponseSchema = z.object({
  dashboard: complianceDashboardSchema,
  updatedAt: isoDateString,
});

export const settingsResponseSchema = z.object({
  settings: settingsStateSchema,
  updatedAt: isoDateString,
});

export const signOutResponseSchema = z.object({
  ok: z.literal(true),
});

export const createInviteResponseSchema = z.object({
  invite: inviteSchema,
  dashboard: dashboardResponseSchema,
});

export const createApprovalResponseSchema = z.object({
  approval: approvalSchema,
  dashboard: dashboardResponseSchema,
});

export const actionApprovalResponseSchema = z.object({
  dashboard: dashboardResponseSchema,
});

export const signInRequestSchema = z.object({
  memberId: z.string().min(1),
  password: z.string().min(1),
});

export const teamPayoutRequestSchema = z.object({
  memberId: z.string().min(1),
  displayName: z.string().min(1),
  venmo: nullableString,
  cashapp: nullableString,
  paypal: nullableString,
});

export const orgMemberRequestSchema = z.object({
  memberId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  state: z.string().min(2).max(2),
  role: z.enum(["admin", "regional_lead", "finance", "member"]),
  leaderForRegion: z.boolean().optional(),
  canExecutePeerTransactions: z.boolean().optional(),
  password: z.string().min(8).optional(),
  venmo: nullableString,
  cashapp: nullableString,
  paypal: nullableString,
});

export const inviteCreateRequestSchema = z.object({
  email: z.string().email(),
  memberId: z.string().min(1),
  role: z.enum(["admin", "regional_lead", "finance", "member"]),
  state: z.string().min(2).max(2),
  leaderForRegion: z.boolean().optional(),
  canExecutePeerTransactions: z.boolean().optional(),
});

export const inviteAcceptRequestSchema = z.object({
  inviteToken: z.string().min(1),
  displayName: z.string().min(1),
  password: z.string().min(8),
  venmo: nullableString,
  cashapp: nullableString,
  paypal: nullableString,
});

export const fundsEntryRequestSchema = z.object({
  memberId: z.string().min(1),
  amountUsdCents: z.number().int().positive(),
  type: z.enum(["credit", "debit"]),
  note: z.string().min(1),
});

export const approvalCreateRequestSchema = z.object({
  type: z.enum(["funds_entry", "peer_access"]),
  memberId: z.string().min(1),
  note: z.string().min(1),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const approvalActionRequestSchema = z.object({
  action: z.enum(["approved", "rejected"]),
});

export const executionContextRequestSchema = z.object({
  memberId: z.string().min(1),
  connectedWalletAddress: z.string().nullable().optional(),
});

export const depositPreviewRequestSchema = z.object({
  memberId: z.string().min(1),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().regex(/^\d+$/),
  minIntentAmount: z.string().regex(/^\d+$/),
  maxIntentAmount: z.string().regex(/^\d+$/),
  currency: z.string().min(1),
  conversionRate: z.string().regex(/^\d+$/),
});

export const createPeerDepositRequestSchema = z.object({
  memberId: z.string().min(1),
  division: z.enum(DIVISIONS),
  preferredMethod: z.string().min(1),
  fiatCurrency: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
  live: z.boolean().default(true),
  riskLevel: z.enum(COMPLIANCE_SEVERITIES).default("medium"),
  payload: createDepositPreviewResponseSchema.shape.payload,
  protocol: z.object({
    transactionHash: z.string().nullable().optional(),
    onchainDepositId: z.string().nullable().optional(),
    compositeDepositId: z.string().nullable().optional(),
    escrowAddress: z.string().nullable().optional(),
    payeeDetailsHashes: z.array(z.string()).default([]),
  }),
});

export const listPeerDepositsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(DEPOSIT_STATUSES).optional(),
  division: z.enum(DIVISIONS).optional(),
  paymentMethod: z.string().optional(),
  memberId: z.string().optional(),
});

export const addFundsRequestSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  transactionHash: z.string().nullable().optional(),
});

export const setAcceptingRequestSchema = z.object({
  accepting: z.boolean(),
  transactionHash: z.string().nullable().optional(),
});

export const withdrawDepositRequestSchema = z.object({
  transactionHash: z.string().nullable().optional(),
});

export const complianceCaseCreateRequestSchema = z.object({
  memberId: z.string().min(1),
  division: z.enum(DIVISIONS),
  severity: z.enum(COMPLIANCE_SEVERITIES),
  category: z.enum(["KYC", "AML", "Sanctions", "Proof", "Operational"]),
  summary: z.string().min(1),
});

export const settingsUpdateRequestSchema = settingsStateSchema;
