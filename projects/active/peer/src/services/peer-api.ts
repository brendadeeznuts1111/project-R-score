import { runtimeConfig } from "../config";
import type {
  ActionApprovalResponse,
  AuditListResponse,
  AuthSessionResponse,
  AuthSigninResponse,
  ComplianceResponse,
  CreatePeerDepositRequest,
  CreateApprovalResponse,
  CreateDepositPreviewResponse,
  CreateInviteResponse,
  CurrencyOptionsResponse,
  DashboardResponse,
  ExecutionContextResponse,
  OrgSummaryOnlyResponse,
  PeerDepositActionResponse,
  PeerDepositResponse,
  PeerDepositsListResponse,
  PeerDocsResponse,
  PeerTeamResponse,
  SettingsResponse,
  SignOutResponse,
} from "../types/app";
import {
  actionApprovalResponseSchema,
  auditListResponseSchema,
  authSessionResponseSchema,
  authSigninResponseSchema,
  complianceResponseSchema,
  createApprovalResponseSchema,
  createPeerDepositRequestSchema,
  createDepositPreviewResponseSchema,
  createInviteResponseSchema,
  currencyOptionsSchema,
  dashboardResponseSchema,
  executionContextResponseSchema,
  orgSummaryOnlySchema,
  peerDepositActionResponseSchema,
  peerDepositResponseSchema,
  peerDepositsListResponseSchema,
  peerDocsSchema,
  peerTeamResponseSchema,
  settingsResponseSchema,
  signOutResponseSchema,
} from "../types/schemas";

import { fetchJson } from "./http";

function withBase(url: string): string {
  return `${runtimeConfig.apiBaseUrl}${url}`;
}

export class PeerApiService {
  async getTeam(headers?: HeadersInit): Promise<PeerTeamResponse> {
    return peerTeamResponseSchema.parse(await fetchJson(withBase("/api/team"), { headers, retries: 1 }));
  }

  async getDashboard(headers?: HeadersInit): Promise<DashboardResponse> {
    return dashboardResponseSchema.parse(await fetchJson(withBase("/api/org/dashboard"), { headers, retries: 1 }));
  }

  async getAuditEvents(
    query: Partial<Record<"type" | "division" | "actor" | "dateFrom", string>>,
    headers?: HeadersInit,
  ): Promise<AuditListResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (!value) continue;
      params.set(key, value);
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return auditListResponseSchema.parse(
      await fetchJson(withBase(`/api/audit/events${suffix}`), {
        headers,
        retries: 1,
      }),
    );
  }

  async getCompliance(headers?: HeadersInit): Promise<ComplianceResponse> {
    return complianceResponseSchema.parse(
      await fetchJson(withBase("/api/compliance"), {
        headers,
        retries: 1,
      }),
    );
  }

  async updateCompliance(payload: ComplianceResponse["dashboard"], headers?: HeadersInit): Promise<ComplianceResponse> {
    return complianceResponseSchema.parse(
      await fetchJson(withBase("/api/compliance"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async createComplianceCase(
    payload: {
      memberId: string;
      division: string;
      severity: "low" | "medium" | "high" | "critical";
      category: "KYC" | "AML" | "Sanctions" | "Proof" | "Operational";
      summary: string;
    },
    headers?: HeadersInit,
  ): Promise<ComplianceResponse> {
    return complianceResponseSchema.parse(
      await fetchJson(withBase("/api/compliance/cases"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async getSettings(headers?: HeadersInit): Promise<SettingsResponse> {
    return settingsResponseSchema.parse(
      await fetchJson(withBase("/api/settings"), {
        headers,
        retries: 1,
      }),
    );
  }

  async updateSettings(payload: SettingsResponse["settings"], headers?: HeadersInit): Promise<SettingsResponse> {
    return settingsResponseSchema.parse(
      await fetchJson(withBase("/api/settings"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async getSession(headers?: HeadersInit): Promise<AuthSessionResponse> {
    return authSessionResponseSchema.parse(await fetchJson(withBase("/api/auth/session"), { headers, retries: 1 }));
  }

  async signIn(memberId: string, password: string): Promise<AuthSigninResponse> {
    return authSigninResponseSchema.parse(
      await fetchJson(withBase("/api/auth/signin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, password }),
      }),
    );
  }

  async signOut(headers?: HeadersInit): Promise<SignOutResponse> {
    return signOutResponseSchema.parse(await fetchJson(withBase("/api/auth/signout"), {
      method: "POST",
      headers,
    }));
  }

  async getExecutionContext(
    params: { memberId: string; connectedWalletAddress?: string | null },
    headers?: HeadersInit,
  ): Promise<ExecutionContextResponse> {
    return executionContextResponseSchema.parse(
      await fetchJson(withBase("/api/peer/execution-context"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(params),
      }),
    );
  }

  async getCurrencies(): Promise<CurrencyOptionsResponse> {
    return currencyOptionsSchema.parse(await fetchJson(withBase("/api/peer/currencies")));
  }

  async getDocs(): Promise<PeerDocsResponse> {
    return peerDocsSchema.parse(await fetchJson(withBase("/api/peer/docs")));
  }

  async createDepositPreview(
    payload: Record<string, unknown>,
    headers?: HeadersInit,
  ): Promise<CreateDepositPreviewResponse> {
    return createDepositPreviewResponseSchema.parse(
      await fetchJson(withBase("/api/peer/deposits/preview"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async createPeerDeposit(
    payload: CreatePeerDepositRequest,
    headers?: HeadersInit,
  ): Promise<PeerDepositActionResponse> {
    return peerDepositActionResponseSchema.parse(
      await fetchJson(withBase("/api/peer/deposits"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(createPeerDepositRequestSchema.parse(payload)),
      }),
    );
  }

  async listPeerDeposits(
    query: Partial<Record<"page" | "pageSize" | "search" | "status" | "division" | "paymentMethod" | "memberId", string | number>>,
    headers?: HeadersInit,
  ): Promise<PeerDepositsListResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      params.set(key, String(value));
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return peerDepositsListResponseSchema.parse(
      await fetchJson(withBase(`/api/peer/deposits${suffix}`), {
        headers,
        retries: 1,
      }),
    );
  }

  async getPeerDeposit(recordId: string, headers?: HeadersInit): Promise<PeerDepositResponse> {
    return peerDepositResponseSchema.parse(
      await fetchJson(withBase(`/api/peer/deposits/${encodeURIComponent(recordId)}`), {
        headers,
        retries: 1,
      }),
    );
  }

  async addFundsToPeerDeposit(
    recordId: string,
    payload: { amount: string; transactionHash?: string | null },
    headers?: HeadersInit,
  ): Promise<PeerDepositActionResponse> {
    return peerDepositActionResponseSchema.parse(
      await fetchJson(withBase(`/api/peer/deposits/${encodeURIComponent(recordId)}/add-funds`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async setPeerDepositAccepting(
    recordId: string,
    payload: { accepting: boolean; transactionHash?: string | null },
    headers?: HeadersInit,
  ): Promise<PeerDepositActionResponse> {
    return peerDepositActionResponseSchema.parse(
      await fetchJson(withBase(`/api/peer/deposits/${encodeURIComponent(recordId)}/set-accepting`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async withdrawPeerDeposit(
    recordId: string,
    payload: { transactionHash?: string | null } = {},
    headers?: HeadersInit,
  ): Promise<PeerDepositActionResponse> {
    return peerDepositActionResponseSchema.parse(
      await fetchJson(withBase(`/api/peer/deposits/${encodeURIComponent(recordId)}/withdraw`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async saveTeamMember(payload: Record<string, unknown>, headers?: HeadersInit): Promise<PeerTeamResponse> {
    return peerTeamResponseSchema.parse(
      await fetchJson(withBase("/api/team"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
      }),
    );
  }

  async deleteTeamMember(memberId: string, headers?: HeadersInit): Promise<PeerTeamResponse> {
    return peerTeamResponseSchema.parse(
      await fetchJson(withBase(`/api/team/${encodeURIComponent(memberId)}`), {
        method: "DELETE",
        headers,
      }),
    );
  }

  async saveOrgMember(payload: Record<string, unknown>, headers?: HeadersInit): Promise<OrgSummaryOnlyResponse> {
    return orgSummaryOnlySchema.parse(await fetchJson(withBase("/api/org/members"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify(payload),
    }));
  }

  async createFundsEntry(payload: Record<string, unknown>, headers?: HeadersInit): Promise<OrgSummaryOnlyResponse> {
    return orgSummaryOnlySchema.parse(await fetchJson(withBase("/api/funds/entries"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify(payload),
    }));
  }

  async createInvite(payload: Record<string, unknown>, headers?: HeadersInit): Promise<CreateInviteResponse> {
    return createInviteResponseSchema.parse(await fetchJson(withBase("/api/invites"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify(payload),
    }));
  }

  async acceptInvite(payload: Record<string, unknown>): Promise<ActionApprovalResponse> {
    return actionApprovalResponseSchema.parse(await fetchJson(withBase("/api/invites/accept"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }));
  }

  async createApproval(payload: Record<string, unknown>, headers?: HeadersInit): Promise<CreateApprovalResponse> {
    return createApprovalResponseSchema.parse(await fetchJson(withBase("/api/approvals"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify(payload),
    }));
  }

  async actionApproval(approvalId: string, action: "approved" | "rejected", headers?: HeadersInit): Promise<ActionApprovalResponse> {
    return actionApprovalResponseSchema.parse(await fetchJson(withBase(`/api/approvals/${encodeURIComponent(approvalId)}/action`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify({ action }),
    }));
  }
}

export const peerApi = new PeerApiService();
