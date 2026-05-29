import type { Address } from "viem";

import { renderBadge, renderMaskedSecret } from "./components/cards";
import { renderSkeleton, renderSummaryItems, renderTextSummary } from "./components/summary";
import { runtimeConfig } from "./config";
import {
  appendAuditEvent,
  getComplianceDashboard,
  getSettingsState,
  type DepositRecord,
} from "./services/local-store";
import { peerApi } from "./services/peer-api";
import { peerSdk, type WalletConnection } from "./services/peer-sdk";
import { createPoller } from "./services/realtime";
import type {
  AppRole,
  AuditEvent,
  ComplianceDashboard,
  CreateDepositPreviewResponse,
  DashboardResponse,
  ExecutionContextResponse,
  PersistedDepositRecord,
  PeerTeamResponse,
  SettingsState,
  SummaryItem,
} from "./types/app";
import { APP_ROLES, DEPOSIT_STATUSES, DIVISIONS } from "./types/app";
import { escapeHtml, formValue, mustElement } from "./utils/dom";
import { filterDeposits, paginate, sortDeposits, type DepositFilters } from "./utils/deposits";
import {
  formatMoneyFromCents,
  formatTimestamp,
  truncateMiddle,
} from "./utils/formatters";
import { canAccessWithSession, deriveAppRoleFromSession } from "./utils/rbac";
import { isHexAddress, isWholeNumber } from "./utils/validators";

type StatusTone = "neutral" | "success" | "error";

type PeerExtensionStateView = {
  installed: boolean;
  connected: boolean;
  version: string;
};

type OpsState = {
  uiRole: AppRole;
  sessionMember: DashboardResponse["summary"]["members"][number] | null;
  sessionPermissions: string[];
  team: PeerTeamResponse | null;
  dashboard: DashboardResponse | null;
  settings: SettingsState;
  compliance: ComplianceDashboard;
  audit: AuditEvent[];
  deposits: PersistedDepositRecord[];
  wallet: WalletConnection | null;
  extension: PeerExtensionStateView;
  executionContext: ExecutionContextResponse["context"] | null;
  depositPreview: CreateDepositPreviewResponse["payload"] | null;
  paymentCatalog: string[];
  selectedDepositIds: Set<string>;
  depositPage: number;
  liveUpdatedAt: string | null;
  pollerStop: (() => void) | null;
  extensionUnsubscribe: (() => void) | null;
};

type ExtensionRuntime = {
  getState?: () => Promise<unknown>;
  requestConnection?: () => Promise<unknown>;
  onramp?: (params?: unknown) => void;
  onIntentFulfilled?: (callback: (result: unknown) => void) => () => void;
};

type OfframpRuntime = {
  registerPayeeDetails?: (params: { payeeData: Record<string, string>[] }) => Promise<unknown>;
  createDeposit?: (params: CreateDepositPreviewResponse["payload"]) => Promise<unknown>;
  getOwnerDeposits?: () => Promise<unknown>;
  addFunds?: (params: { depositId: string; amount: bigint }) => Promise<unknown>;
  setAcceptingIntents?: (params: { depositId: string; accepting: boolean }) => Promise<unknown>;
  withdrawDeposit?: (params: { depositId: string }) => Promise<unknown>;
};

const state: OpsState = {
  uiRole: "Viewer",
  sessionMember: null,
  sessionPermissions: [],
  team: null,
  dashboard: null,
  settings: getSettingsState(),
  compliance: getComplianceDashboard(),
  audit: [],
  deposits: [],
  wallet: null,
  extension: {
    installed: false,
    connected: false,
    version: "Unknown",
  },
  executionContext: null,
  depositPreview: null,
  paymentCatalog: [],
  selectedDepositIds: new Set<string>(),
  depositPage: 1,
  liveUpdatedAt: null,
  pollerStop: null,
  extensionUnsubscribe: null,
};

const signinForm = mustElement<HTMLFormElement>("#signinForm");
const depositForm = mustElement<HTMLFormElement>("#depositForm");
const settingsForm = mustElement<HTMLFormElement>("#settingsForm");
const onrampForm = mustElement<HTMLFormElement>("#onrampForm");
const commandDialog = mustElement<HTMLDialogElement>("#commandPalette");

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  return extra;
}

function hasAccess(capability: Parameters<typeof canAccessWithSession>[1]): boolean {
  return canAccessWithSession(state.sessionPermissions, capability);
}

function setStatus(message: string, tone: StatusTone = "neutral"): void {
  const banner = mustElement<HTMLDivElement>("#statusBanner");
  banner.textContent = message;
  banner.className = `status-banner ${tone}`;
}

function pushToast(message: string, tone: StatusTone = "neutral"): void {
  const region = mustElement<HTMLDivElement>("#toastRegion");
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 3800);
}

function setPanelLoading(selector: string, lines = 3): void {
  mustElement(selector).innerHTML = renderSkeleton(lines);
}

function setMarkup(selector: string, html: string): void {
  mustElement(selector).innerHTML = html;
}

function setText(selector: string, value: string): void {
  mustElement(selector).textContent = value;
}

function getOfframpRuntime(): OfframpRuntime | null {
  return state.wallet?.offrampClient as unknown as OfframpRuntime | null;
}

function getExtensionRuntime(): ExtensionRuntime {
  return peerSdk.extension as unknown as ExtensionRuntime;
}

function capabilitySummary(enabled: boolean, text: string): string {
  return enabled ? text : `${text} Hidden or disabled until the signed-in session grants that permission.`;
}

function recordAuditEvent(partial: Omit<AuditEvent, "id" | "timestamp" | "role"> & { timestamp?: string }): void {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    timestamp: partial.timestamp ?? new Date().toISOString(),
    role: state.uiRole,
    ...partial,
  };
  state.audit = appendAuditEvent(event);
}

function getTeamMember(memberId: string): PeerTeamResponse["team"][number] | null {
  return state.team?.team.find((entry) => entry.memberId === memberId) ?? null;
}

function getDashboardMember(memberId: string): DashboardResponse["summary"]["members"][number] | null {
  return state.dashboard?.summary.members.find((entry) => entry.memberId === memberId) ?? null;
}

function toTableDepositRecord(record: PersistedDepositRecord): DepositRecord {
  return {
    id: record.recordId,
    memberId: record.memberId,
    memberName: record.memberName,
    division: record.division,
    paymentMethod: record.preferredMethod,
    amountBaseUnits: record.amountBaseUnits,
    fiatCurrency: record.fiatCurrency,
    status: record.status,
    riskLevel: record.riskLevel,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    walletAddress: record.walletAddress,
    tokenAddress: record.tokenAddress,
    minIntentAmount: record.minIntentAmount,
    maxIntentAmount: record.maxIntentAmount,
    tags: [record.division, record.preferredMethod],
    live: record.live,
    transactionHash: record.transactionHash,
  };
}

function currentDepositRecords(): DepositRecord[] {
  return sortDeposits(state.deposits.map(toTableDepositRecord));
}

function renderHeroStats(): void {
  const records = currentDepositRecords();
  const activeDeposits = records.filter((record) => record.status === "active").length;
  const pendingApprovals =
    state.dashboard?.approvals.filter((approval) => approval.status === "pending").length ?? 0;
  const html = [
    `<div class="stat-card"><span class="metric-label">Access profile</span><strong>${escapeHtml(state.uiRole)}</strong></div>`,
    `<div class="stat-card"><span class="metric-label">Tracked deposits</span><strong>${records.length}</strong></div>`,
    `<div class="stat-card"><span class="metric-label">Active deposits</span><strong>${activeDeposits}</strong></div>`,
    `<div class="stat-card"><span class="metric-label">Pending approvals</span><strong>${pendingApprovals}</strong></div>`,
  ].join("");
  setMarkup("#heroStats", html);
}

function renderSession(): void {
  if (!state.sessionMember) {
    setMarkup(
      "#sessionSummary",
      renderTextSummary(["No active operator session. Sign in with an individual team account."]),
    );
    setText("#sessionRaw", "No active session.");
    return;
  }

  const items: SummaryItem[] = [
    { label: "Operator", value: state.sessionMember.displayName },
    { label: "Member ID", value: state.sessionMember.memberId },
    { label: "Server role", value: state.sessionMember.role },
    { label: "Access profile", value: state.uiRole },
    { label: "Region", value: state.sessionMember.region },
    { label: "Permissions", value: String(state.sessionPermissions.length) },
  ];
  setMarkup("#sessionSummary", renderSummaryItems(items));
  setText(
    "#sessionRaw",
    JSON.stringify(
      {
        member: state.sessionMember,
        permissions: state.sessionPermissions,
        uiRole: state.uiRole,
      },
      null,
      2,
    ),
  );
}

function renderWalletSummary(): void {
  const catalogCount = state.paymentCatalog.length;
  const items: SummaryItem[] = [
    {
      label: "Wallet",
      value: state.wallet?.address ? truncateMiddle(state.wallet.address, 8, 6) : "Not connected",
      tone: state.wallet ? "success" : "warning",
    },
    {
      label: "Chain",
      value: state.wallet ? String(state.wallet.chainId) : `Expected ${runtimeConfig.chainId}`,
    },
    {
      label: "Extension",
      value: state.extension.connected ? "Connected" : state.extension.installed ? "Installed" : "Unavailable",
      tone: state.extension.connected ? "success" : state.extension.installed ? "accent" : "warning",
    },
    {
      label: "Version",
      value: state.extension.version,
    },
    {
      label: "Catalog coverage",
      value: `${catalogCount} methods`,
      hint: "Loaded from getPaymentMethodsCatalog().",
    },
  ];
  setMarkup("#walletSummary", renderSummaryItems(items));
}

function renderLiveOpsSummary(): void {
  const records = currentDepositRecords();
  const items: SummaryItem[] = [
    {
      label: "Polling",
      value: state.settings.featureFlags.realtimePolling ? "Enabled" : "Disabled",
      tone: state.settings.featureFlags.realtimePolling ? "success" : "warning",
      hint: "Replace the poller with a websocket subscription for production.",
    },
    {
      label: "Last refresh",
      value: state.liveUpdatedAt ? formatTimestamp(state.liveUpdatedAt) : "Not refreshed yet",
    },
    {
      label: "Pending review",
      value: String(state.compliance.openAlerts),
    },
    {
      label: "Tracked deposits",
      value: String(records.length),
    },
  ];
  setMarkup("#liveOpsSummary", renderSummaryItems(items));
}

function renderExecutionSummary(): void {
  if (!state.executionContext) {
    setMarkup(
      "#executionSummary",
      renderTextSummary(["Choose a payout owner to load the current execution context."]),
    );
    setText("#executionRaw", "No execution context loaded.");
    return;
  }

  const context = state.executionContext;
  const items: SummaryItem[] = [
    { label: "Signed-in member", value: context.signedInMember.displayName },
    { label: "Payout owner", value: context.payoutOwner.displayName },
    { label: "Processor names", value: context.payoutOwner.processorNames.join(", ") || "None" },
    {
      label: "Connected wallet",
      value: context.connectedWalletAddress ? truncateMiddle(context.connectedWalletAddress, 8, 6) : "Required before execution",
      tone: context.connectedWalletAddress ? "success" : "warning",
    },
  ];
  setMarkup("#executionSummary", renderSummaryItems(items));
  setText("#executionRaw", JSON.stringify(context, null, 2));
}

function renderPeerModel(): void {
  const peerModel = state.dashboard?.peerModel;
  const items: SummaryItem[] = peerModel
    ? Object.entries(peerModel).map(([key, value]) => ({
        label: key,
        value,
      }))
    : [
        { label: "App auth", value: "Each teammate signs in individually." },
        { label: "Deposit ownership", value: "The connected wallet owns the deposit." },
      ];
  setMarkup("#peerModelSummary", renderSummaryItems(items));
}

function renderTeamList(): void {
  const team = state.team?.team ?? [];
  if (team.length === 0) {
    setMarkup(
      "#teamList",
      `<div class="empty-state">No payout-ready members yet. Add at least one validated payout identity.</div>`,
    );
    return;
  }

  const html = team
    .map((member) => {
      const methods = member.methods
        .map((method) => renderBadge(`${method.processorName}: ${method.redactedValue}`, "accent"))
        .join("");
      return `
        <article class="entity-card">
          <div class="entity-topline">
            <div>
              <h3>${escapeHtml(member.displayName)}</h3>
              <div class="member-id">${escapeHtml(member.memberId)}</div>
            </div>
            ${renderBadge(`${member.methods.length} route${member.methods.length === 1 ? "" : "s"}`)}
          </div>
          <div class="chip-row">${methods}</div>
        </article>
      `;
    })
    .join("");
  setMarkup("#teamList", html);
}

function renderDepositPreview(): void {
  if (!state.depositPreview) {
    setMarkup(
      "#depositPreviewSummary",
      renderTextSummary(["No deposit preview generated yet. Run preview after choosing the payout owner and division."]),
    );
    setText("#depositPreviewRaw", "No deposit preview generated yet.");
    return;
  }

  const preferredMethod = formValue(depositForm, "preferredMethod");
  const items: SummaryItem[] = [
    { label: "Token", value: truncateMiddle(state.depositPreview.token, 8, 6) },
    { label: "Deposit amount", value: state.depositPreview.amount },
    { label: "Intent range", value: `${state.depositPreview.intentAmountRange.min} - ${state.depositPreview.intentAmountRange.max}` },
    { label: "Processor coverage", value: state.depositPreview.processorNames.join(", ") },
    {
      label: "Preferred method",
      value: preferredMethod || state.depositPreview.processorNames[0] || "None",
      hint: "Deposit uses all supported processor names for the selected payout owner.",
    },
  ];
  setMarkup("#depositPreviewSummary", renderSummaryItems(items));
  setText("#depositPreviewRaw", JSON.stringify(state.depositPreview, null, 2));
}

function renderCompliance(): void {
  const dashboard = state.compliance;
  const metrics = [
    ["KYC ready", String(dashboard.kycReadyCount)],
    ["AML review", String(dashboard.amlReviewCount)],
    ["Open alerts", String(dashboard.openAlerts)],
    ["Proof backlog", String(dashboard.proofBacklog)],
  ]
    .map(
      ([label, value]) => `
        <article class="metric-card">
          <span class="metric-label">${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `,
    )
    .join("");
  setMarkup("#complianceSummary", metrics);

  if (dashboard.cases.length === 0) {
    setMarkup("#complianceCases", `<div class="empty-state">No active compliance cases.</div>`);
    return;
  }

  const cases = dashboard.cases
    .map(
      (item) => `
        <article class="entity-card">
          <div class="entity-topline">
            <div>
              <h3>${escapeHtml(item.category)} review</h3>
              <div class="member-id">${escapeHtml(item.memberId)} • ${escapeHtml(item.division)}</div>
            </div>
            ${renderBadge(item.severity, item.severity === "critical" || item.severity === "high" ? "danger" : "warning")}
          </div>
          <p class="body-copy">${escapeHtml(item.summary)}</p>
          <div class="portal-meta-list">
            <div>Owner: ${escapeHtml(item.owner)}</div>
            <div>Status: ${escapeHtml(item.status)}</div>
            <div>Updated: ${escapeHtml(formatTimestamp(item.lastUpdatedAt))}</div>
          </div>
        </article>
      `,
    )
    .join("");
  setMarkup("#complianceCases", cases);
}

function renderSettings(): void {
  const settings = state.settings;
  const summary: SummaryItem[] = [
    {
      label: "Telegram",
      value: settings.notifications.telegramEnabled ? settings.notifications.telegramChannel : "Disabled",
      tone: settings.notifications.telegramEnabled ? "success" : "warning",
    },
    {
      label: "API keys",
      value: `${settings.apiKeys.length} configured`,
      hint: settings.apiKeys.map((record) => `${record.label}: ${record.maskedValue}`).join(" • "),
    },
    {
      label: "Flags",
      value: Object.entries(settings.featureFlags)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(", ") || "No optional flags enabled",
    },
  ];
  setMarkup("#settingsSummary", renderSummaryItems(summary));
}

function renderWorkflowBadges(): void {
  const badges = [
    renderBadge(state.sessionMember ? "Signed in" : "No session", state.sessionMember ? "success" : "warning"),
    renderBadge(state.wallet ? "Wallet connected" : "Wallet required", state.wallet ? "success" : "warning"),
    renderBadge(state.depositPreview ? "Preview ready" : "Preview pending", state.depositPreview ? "accent" : "default"),
    renderBadge(
      state.executionContext?.payoutOwner.processorNames.length ? "Processor coverage loaded" : "Awaiting payout owner",
      state.executionContext ? "success" : "warning",
    ),
  ].join("");
  setMarkup("#workflowBadges", badges);
}

function currentDepositFilters(): DepositFilters {
  const status = mustElement<HTMLSelectElement>("#depositStatusFilter").value;
  const division = mustElement<HTMLSelectElement>("#depositDivisionFilter").value;
  const amountMinValue = mustElement<HTMLInputElement>("#depositAmountMin").value.trim();
  const amountMaxValue = mustElement<HTMLInputElement>("#depositAmountMax").value.trim();
  return {
    search: mustElement<HTMLInputElement>("#depositSearch").value,
    status: status === "all" ? "all" : (status as DepositFilters["status"]),
    division: division === "all" ? "all" : (division as DepositFilters["division"]),
    paymentMethod: mustElement<HTMLInputElement>("#depositMethodFilter").value,
    amountMin: amountMinValue ? Number(amountMinValue) : undefined,
    amountMax: amountMaxValue ? Number(amountMaxValue) : undefined,
    dateFrom: mustElement<HTMLInputElement>("#depositDateFrom").value || undefined,
    dateTo: mustElement<HTMLInputElement>("#depositDateTo").value || undefined,
  };
}

function depositActionButtons(record: DepositRecord): string {
  const canManageDeposits = hasAccess("deposit:manage");
  const activateDisabled = canManageDeposits ? "" : " disabled";
  const withdrawDisabled = canManageDeposits ? "" : " disabled";
  return `
    <div class="table-actions">
      <button type="button" class="mini-button" data-action="activate" data-id="${escapeHtml(record.id)}"${activateDisabled}>Activate</button>
      <button type="button" class="mini-button secondary" data-action="pause" data-id="${escapeHtml(record.id)}"${activateDisabled}>Pause</button>
      <button type="button" class="mini-button danger" data-action="withdraw" data-id="${escapeHtml(record.id)}"${withdrawDisabled}>Withdraw</button>
    </div>
  `;
}

function renderDepositTable(): void {
  const pageSize = Math.min(
    50,
    Math.max(5, Number(mustElement<HTMLSelectElement>("#depositPageSize").value) || 10),
  );
  const filtered = filterDeposits(currentDepositRecords(), currentDepositFilters());
  const paged = paginate(filtered, state.depositPage, pageSize);
  state.depositPage = paged.page;

  const metaItems: SummaryItem[] = [
    { label: "Visible", value: String(paged.items.length) },
    { label: "Total filtered", value: String(paged.totalItems) },
    {
      label: "Bulk actions",
      value: capabilitySummary(hasAccess("deposit:manage"), "Available for selected deposits."),
    },
  ];
  setMarkup("#depositTableMeta", renderSummaryItems(metaItems));
  setText("#depositPageSummary", `Page ${paged.page} of ${paged.totalPages}`);
  mustElement<HTMLInputElement>("#selectAllDeposits").checked =
    paged.items.length > 0 && paged.items.every((record) => state.selectedDepositIds.has(record.id));

  if (paged.items.length === 0) {
    setMarkup(
      "#depositTable",
      `<tr><td colspan="9"><div class="empty-state">No deposits match the current filters.</div></td></tr>`,
    );
    setMarkup("#depositCards", `<div class="empty-state">No deposits match the current filters.</div>`);
    return;
  }

  const rows = paged.items
    .map((record) => {
      const selected = state.selectedDepositIds.has(record.id);
      return `
        <tr>
          <td><input type="checkbox" data-deposit-select="${escapeHtml(record.id)}"${selected ? " checked" : ""} /></td>
          <td>
            <div class="table-title">${escapeHtml(record.id)}</div>
            <div class="table-subtitle mono">${escapeHtml(truncateMiddle(record.tokenAddress, 8, 6))}</div>
          </td>
          <td>
            <div class="table-title">${escapeHtml(record.memberName)}</div>
            <div class="table-subtitle">${escapeHtml(record.memberId)}</div>
          </td>
          <td>${escapeHtml(record.division)}</td>
          <td>${escapeHtml(record.paymentMethod)}</td>
          <td>${renderBadge(record.status, record.status === "active" ? "success" : record.status === "error" ? "danger" : "accent")}</td>
          <td>${renderBadge(record.riskLevel, record.riskLevel === "high" || record.riskLevel === "critical" ? "danger" : "warning")}</td>
          <td>${escapeHtml(formatTimestamp(record.updatedAt))}</td>
          <td>${depositActionButtons(record)}</td>
        </tr>
      `;
    })
    .join("");
  setMarkup("#depositTable", rows);
  setMarkup(
    "#depositCards",
    paged.items
      .map((record) => {
        const selected = state.selectedDepositIds.has(record.id);
        return `
          <article class="entity-card deposit-mobile-card">
            <div class="entity-topline">
              <div>
                <h3>${escapeHtml(record.memberName)}</h3>
                <div class="member-id">${escapeHtml(record.id)}</div>
              </div>
              ${renderBadge(record.status, record.status === "active" ? "success" : record.status === "error" ? "danger" : "accent")}
            </div>
            <div class="summary-list compact-summary">
              ${renderSummaryItems([
                { label: "Division", value: record.division },
                { label: "Method", value: record.paymentMethod },
                { label: "Risk", value: record.riskLevel },
                { label: "Updated", value: formatTimestamp(record.updatedAt) },
              ])}
            </div>
            <label class="checkbox compact-checkbox">
              <input type="checkbox" data-deposit-select="${escapeHtml(record.id)}"${selected ? " checked" : ""} />
              <span>Select deposit</span>
            </label>
            ${depositActionButtons(record)}
          </article>
        `;
      })
      .join(""),
  );
}

function renderDocs(): void {
  const sources = state.dashboard?.peerModel
    ? null
    : null;
  void sources;
}

function renderCommandResults(query = ""): void {
  const commands = [
    { label: "Refresh live data", action: () => void refreshAll(), keywords: "refresh live data queue deposits" },
    { label: "Connect wallet", action: () => void connectWallet(), keywords: "wallet connect" },
    { label: "Open deposits section", action: () => scrollToSection("deposits-section"), keywords: "deposits table manage" },
    { label: "Open compliance section", action: () => scrollToSection("compliance-section"), keywords: "compliance alerts cases" },
    { label: "Preview deposit", action: () => void previewDeposit(), keywords: "preview create deposit" },
  ];

  const filtered = commands.filter((command) =>
    `${command.label} ${command.keywords}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (filtered.length === 0) {
    setMarkup("#commandResults", `<div class="empty-state">No commands match that query.</div>`);
    return;
  }

  setMarkup(
    "#commandResults",
    filtered
      .map(
        (command, index) => `
          <button type="button" class="command-item" data-command-index="${index}">
            <strong>${escapeHtml(command.label)}</strong>
            <span>${escapeHtml(command.keywords)}</span>
          </button>
        `,
      )
      .join(""),
  );

  mustElement<HTMLDivElement>("#commandResults").onclick = (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-command-index]");
    if (!target) {
      return;
    }
    const index = Number(target.dataset.commandIndex);
    filtered[index]?.action();
    commandDialog.close();
  };
}

function renderDocsList(sources: string[]): void {
  const html = sources
    .map((source) => `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a>`)
    .join("");
  setMarkup("#docsList", html);
}

function populateStaticOptions(): void {
  const roleOptions = APP_ROLES.map((role) => `<option value="${role}">${role}</option>`).join("");
  mustElement<HTMLSelectElement>("#roleSwitcher").innerHTML = roleOptions;
  mustElement<HTMLSelectElement>("#roleSwitcher").value = state.uiRole;
  mustElement<HTMLSelectElement>("#roleSwitcher").disabled = true;

  mustElement<HTMLSelectElement>("#divisionSelect").innerHTML = DIVISIONS.map(
    (division) => `<option value="${division}">${division}</option>`,
  ).join("");
  mustElement<HTMLSelectElement>("#depositDivisionFilter").innerHTML = [
    `<option value="all">all divisions</option>`,
    ...DIVISIONS.map((division) => `<option value="${division}">${division}</option>`),
  ].join("");
  mustElement<HTMLSelectElement>("#depositStatusFilter").innerHTML = [
    `<option value="all">all statuses</option>`,
    ...DEPOSIT_STATUSES.map((status) => `<option value="${status}">${status}</option>`),
  ].join("");
}

function populateDynamicOptions(): void {
  const teamOptions = (state.team?.team ?? [])
    .map((member) => `<option value="${member.memberId}">${member.displayName} (${member.memberId})</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#memberSelect").innerHTML =
    teamOptions || `<option value="">No payout-ready members</option>`;

  const methodOptions = state.paymentCatalog.map((method) => `<option value="${method}">${method}</option>`).join("");
  mustElement<HTMLSelectElement>("#preferredMethodSelect").innerHTML =
    methodOptions || `<option value="">No methods</option>`;

  const currencyOptions = (state.dashboard ? [] : []).join("");
  void currencyOptions;
}

function populateCurrencies(currencies: string[]): void {
  mustElement<HTMLSelectElement>("#currencySelect").innerHTML = currencies
    .map((currency) => `<option value="${currency}">${currency}</option>`)
    .join("");
}

function populateSettingsForm(): void {
  const settings = state.settings;
  const leadSelect = mustElement<HTMLSelectElement>("#settingsDivisionLead");
  leadSelect.innerHTML = settings.divisions
    .map((division) => `<option value="${division.lead}">${division.name} • ${division.lead}</option>`)
    .join("");
  if (settings.divisions[0]) {
    leadSelect.value = settings.divisions[0].lead;
  }
  leadSelect.disabled = !hasAccess("settings:write");
  mustElement<HTMLInputElement>("#telegramChannel").value = settings.notifications.telegramChannel;
  mustElement<HTMLInputElement>("#telegramEnabled").checked = settings.notifications.telegramEnabled;
  mustElement<HTMLInputElement>("#notifyApprovals").checked = settings.notifications.approvals;
  mustElement<HTMLInputElement>("#notifyDeposits").checked = settings.notifications.depositStatus;
  mustElement<HTMLInputElement>("#notifyCompliance").checked = settings.notifications.complianceAlerts;
  mustElement<HTMLInputElement>("#flagRealtimePolling").checked = settings.featureFlags.realtimePolling;
  mustElement<HTMLInputElement>("#flagLiveQuotes").checked = settings.featureFlags.liveQuotes;
  mustElement<HTMLInputElement>("#flagOnramp").checked = settings.featureFlags.peerExtensionOnramp;
  mustElement<HTMLInputElement>("#flagComplianceExports").checked = settings.featureFlags.complianceExports;
}

function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyRoleState(): void {
  const depositDisabled = !hasAccess("deposit:create");
  const manageDisabled = !hasAccess("deposit:manage");
  const settingsDisabled = !hasAccess("settings:write");
  const advancedHidden = !hasAccess("advanced:write");

  const depositButtons = depositForm.querySelectorAll<HTMLButtonElement>("button");
  depositButtons.forEach((button) => {
    button.disabled = depositDisabled;
  });
  mustElement<HTMLElement>("#deposits-section").classList.toggle("section-disabled", manageDisabled);
  mustElement<HTMLElement>("#compliance-section").classList.toggle(
    "section-disabled",
    !hasAccess("compliance:view"),
  );
  settingsForm
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")
    .forEach((field) => {
      field.disabled = settingsDisabled;
    });
  mustElement<HTMLElement>(".advanced-block").toggleAttribute("hidden", advancedHidden);
}

async function refreshSession(): Promise<void> {
  const session = await peerApi.getSession(authHeaders());
  state.sessionPermissions = session.permissions;
  if (!session.member) {
    state.sessionMember = null;
    state.uiRole = "Viewer";
    mustElement<HTMLSelectElement>("#roleSwitcher").value = state.uiRole;
    renderSession();
    return;
  }

  const detailedMember =
    state.dashboard?.summary.members.find((member) => member.memberId === session.member?.memberId) ?? null;
  state.sessionMember = detailedMember;
  state.uiRole = session.appRole ?? deriveAppRoleFromSession(session.permissions, session.member.role);
  mustElement<HTMLSelectElement>("#roleSwitcher").value = state.uiRole;
  renderSession();
}

async function refreshTeam(): Promise<void> {
  state.team = await peerApi.getTeam(authHeaders());
  renderTeamList();
  populateDynamicOptions();
}

async function refreshDashboard(): Promise<void> {
  state.dashboard = await peerApi.getDashboard(authHeaders());
  renderPeerModel();
  renderHeroStats();
  renderLiveOpsSummary();
}

async function refreshProtectedOpsData(): Promise<void> {
  if (!state.sessionMember) {
    state.audit = [];
    state.deposits = [];
    renderCompliance();
    renderSettings();
    renderDepositTable();
    return;
  }

  const [settingsResponse, complianceResponse, auditResponse, depositsResponse] = await Promise.all([
    peerApi.getSettings(authHeaders()),
    peerApi.getCompliance(authHeaders()),
    peerApi.getAuditEvents({}, authHeaders()),
    peerApi.listPeerDeposits({ page: 1, pageSize: 100 }, authHeaders()),
  ]);

  state.settings = settingsResponse.settings;
  state.compliance = complianceResponse.dashboard;
  state.audit = auditResponse.items;
  state.deposits = depositsResponse.deposits;
  state.selectedDepositIds = new Set(
    [...state.selectedDepositIds].filter((recordId) =>
      state.deposits.some((deposit) => deposit.recordId === recordId),
    ),
  );
}

async function refreshExecutionContext(): Promise<void> {
  const memberId = mustElement<HTMLSelectElement>("#memberSelect").value;
  if (!memberId || !state.sessionMember) {
    state.executionContext = null;
    renderExecutionSummary();
    renderWorkflowBadges();
    return;
  }

  const response = await peerApi.getExecutionContext(
    {
      memberId,
      connectedWalletAddress: state.wallet?.address ?? null,
    },
    authHeaders(),
  );
  state.executionContext = response.context;
  renderExecutionSummary();
  renderWorkflowBadges();
}

async function refreshDocs(): Promise<void> {
  const docs = await peerApi.getDocs();
  renderDocsList(docs.sources);
}

async function refreshCatalog(): Promise<void> {
  const catalog = peerSdk.getPaymentCatalog();
  state.paymentCatalog = Object.keys(catalog);
  populateDynamicOptions();
}

async function refreshCurrencies(): Promise<void> {
  const currencies = await peerApi.getCurrencies();
  populateCurrencies(currencies.options);
}

async function refreshExtensionState(): Promise<void> {
  const extension = getExtensionRuntime();
  if (!extension.getState) {
    state.extension = { installed: false, connected: false, version: "Unavailable" };
    renderWalletSummary();
    return;
  }

  const rawState = await extension.getState();
  const normalized = rawState as Record<string, unknown>;
  state.extension = {
    installed: Boolean(normalized.installed ?? normalized.available ?? true),
    connected: Boolean(normalized.connected ?? normalized.isConnected),
    version: typeof normalized.version === "string" ? normalized.version : "Unknown",
  };
  renderWalletSummary();
}

async function connectWallet(): Promise<void> {
  try {
    state.wallet = await peerSdk.connectWallet();
    renderWalletSummary();
    await refreshExecutionContext();
    setStatus("Wallet connected. Deposits created from this app will be owned by the connected wallet.", "success");
    pushToast("Wallet connected.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet connection failed.";
    setStatus(message, "error");
    pushToast(message, "error");
  }
}

function selectedPayoutOwner(): PeerTeamResponse["team"][number] {
  const memberId = formValue(depositForm, "memberId");
  const member = getTeamMember(memberId);
  if (!member) {
    throw new Error("Choose a payout owner before continuing.");
  }
  return member;
}

function validateDepositForm(): void {
  const token = formValue(depositForm, "token");
  if (!isHexAddress(token)) {
    throw new Error("Token address must be a valid 0x-prefixed address.");
  }
  ["amount", "minIntentAmount", "maxIntentAmount", "conversionRate"].forEach((field) => {
    const value = formValue(depositForm, field);
    if (!isWholeNumber(value)) {
      throw new Error(`${field} must be a whole-number string.`);
    }
  });
}

function previewDivision(): string {
  return formValue(depositForm, "division");
}

function buildDepositRecord(
  payload: CreateDepositPreviewResponse["payload"],
  status: DepositRecord["status"],
  txHash: string | null = null,
): DepositRecord {
  const member = selectedPayoutOwner();
  const now = new Date().toISOString();
  const preferredMethod = formValue(depositForm, "preferredMethod") || payload.processorNames[0] || "unknown";
  const existingId = state.depositPreview ? null : null;
  void existingId;
  return {
    id: `dep_${crypto.randomUUID().slice(0, 8)}`,
    memberId: member.memberId,
    memberName: member.displayName,
    division: previewDivision() as DepositRecord["division"],
    paymentMethod: preferredMethod,
    amountBaseUnits: payload.amount,
    fiatCurrency: formValue(depositForm, "currency"),
    status,
    riskLevel: status === "error" ? "high" : preferredMethod === "paypal" ? "medium" : "low",
    createdAt: now,
    updatedAt: now,
    createdBy: state.sessionMember?.memberId ?? "unknown",
    walletAddress: state.wallet?.address ?? null,
    tokenAddress: payload.token,
    minIntentAmount: payload.intentAmountRange.min,
    maxIntentAmount: payload.intentAmountRange.max,
    tags: [previewDivision(), preferredMethod],
    live: mustElement<HTMLInputElement>('[name="live"]', depositForm).checked,
    transactionHash: txHash,
  };
}

async function previewDeposit(): Promise<void> {
  validateDepositForm();
  if (!state.sessionMember) {
    throw new Error("Sign in before previewing a deposit.");
  }

  const member = selectedPayoutOwner();
  const response = await peerApi.createDepositPreview(
    {
      memberId: member.memberId,
      token: formValue(depositForm, "token"),
      amount: formValue(depositForm, "amount"),
      minIntentAmount: formValue(depositForm, "minIntentAmount"),
      maxIntentAmount: formValue(depositForm, "maxIntentAmount"),
      currency: formValue(depositForm, "currency"),
      conversionRate: formValue(depositForm, "conversionRate"),
    },
    authHeaders(),
  );
  state.depositPreview = response.payload;
  renderDepositPreview();
  renderWorkflowBadges();
  recordAuditEvent({
    type: "deposit",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: previewDivision() as AuditEvent["division"],
    title: "Deposit preview generated",
    description: `Preview generated for ${member.memberId} using ${response.payload.processorNames.join(", ")}`,
    metadata: {
      memberId: member.memberId,
      division: previewDivision(),
      amount: response.payload.amount,
    },
    exportable: true,
  });
  setStatus("Deposit preview generated for the selected payout owner.", "success");
}

function extractTransactionHash(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null;
  }
  const record = result as Record<string, unknown>;
  if (typeof record.hash === "string") {
    return record.hash;
  }
  if (typeof record.transactionHash === "string") {
    return record.transactionHash;
  }
  return null;
}

function extractProtocolMetadata(result: unknown): {
  transactionHash: string | null;
  onchainDepositId: string | null;
  compositeDepositId: string | null;
  escrowAddress: string | null;
} {
  if (!result || typeof result !== "object") {
    return {
      transactionHash: null,
      onchainDepositId: null,
      compositeDepositId: null,
      escrowAddress: null,
    };
  }

  const record = result as Record<string, unknown>;
  return {
    transactionHash:
      typeof record.hash === "string"
        ? record.hash
        : typeof record.transactionHash === "string"
          ? record.transactionHash
          : null,
    onchainDepositId:
      typeof record.depositId === "string"
        ? record.depositId
        : typeof record.onchainDepositId === "string"
          ? record.onchainDepositId
          : null,
    compositeDepositId:
      typeof record.compositeDepositId === "string" ? record.compositeDepositId : null,
    escrowAddress:
      typeof record.escrowAddress === "string" ? record.escrowAddress : null,
  };
}

async function registerPayeeDetails(): Promise<void> {
  if (!state.depositPreview) {
    await previewDeposit();
  }
  const runtime = getOfframpRuntime();
  if (!runtime?.registerPayeeDetails || !state.depositPreview) {
    setStatus("Payee registration is not exposed in this demo runtime. Preview data is still valid.", "neutral");
    return;
  }
  await runtime.registerPayeeDetails({ payeeData: state.depositPreview.payeeData });
  recordAuditEvent({
    type: "deposit",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: previewDivision() as AuditEvent["division"],
    title: "Payee details registered",
    description: `Registered payee details for ${selectedPayoutOwner().memberId}`,
    metadata: {
      memberId: selectedPayoutOwner().memberId,
    },
    exportable: true,
  });
  setStatus("Payee details registered successfully.", "success");
}

async function prepareDeposit(): Promise<void> {
  if (!state.depositPreview) {
    await previewDeposit();
  }
  if (!state.depositPreview) {
    return;
  }
  if (!hasAccess("deposit:create")) {
    throw new Error("The signed-in session cannot prepare deposits.");
  }

  setStatus("Deposit prepared locally. Review the preview, register payee details, then create the onchain deposit.", "success");
}

async function executeDeposit(): Promise<void> {
  if (!state.depositPreview) {
    await previewDeposit();
  }
  if (!state.depositPreview) {
    return;
  }
  if (!state.wallet) {
    throw new Error("Connect the deposit-owning wallet before executing a deposit.");
  }
  if (!hasAccess("deposit:create")) {
    throw new Error("The signed-in session cannot create deposits.");
  }

  const runtime = getOfframpRuntime();
  let runtimeResult: unknown = null;
  if (runtime?.createDeposit) {
    runtimeResult = await runtime.createDeposit(state.depositPreview);
  }
  const protocol = extractProtocolMetadata(runtimeResult);
  const response = await peerApi.createPeerDeposit(
    {
      memberId: selectedPayoutOwner().memberId,
      division: previewDivision() as PersistedDepositRecord["division"],
      preferredMethod: formValue(depositForm, "preferredMethod") || state.depositPreview.processorNames[0] || "unknown",
      fiatCurrency: formValue(depositForm, "currency"),
      walletAddress: state.wallet.address,
      live: mustElement<HTMLInputElement>('[name="live"]', depositForm).checked,
      riskLevel:
        (formValue(depositForm, "preferredMethod") || state.depositPreview.processorNames[0] || "unknown") === "paypal"
          ? "medium"
          : "low",
      payload: state.depositPreview,
      protocol: {
        transactionHash: protocol.transactionHash,
        onchainDepositId: protocol.onchainDepositId,
        compositeDepositId: protocol.compositeDepositId,
        escrowAddress: protocol.escrowAddress,
        payeeDetailsHashes: [],
      },
    },
    authHeaders(),
  );
  state.depositPage = 1;
  await refreshProtectedOpsData();
  renderDepositTable();
  recordAuditEvent({
    type: "deposit",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: response.deposit.division,
    title: "Deposit executed",
    description: `Deposit ${response.deposit.recordId} created for ${response.deposit.memberId}`,
    metadata: {
      memberId: response.deposit.memberId,
      depositId: response.deposit.recordId,
      txHash: protocol.transactionHash ?? "server-tracked",
    },
    exportable: true,
  });
  setStatus(
    protocol.transactionHash
      ? `Deposit submitted onchain: ${protocol.transactionHash}`
      : "Deposit persisted to the shared operations ledger.",
    "success",
  );
  pushToast("Deposit execution completed.", "success");
}

function updateSelectedDeposit(id: string, selected: boolean): void {
  if (selected) {
    state.selectedDepositIds.add(id);
  } else {
    state.selectedDepositIds.delete(id);
  }
}

async function performBulkDepositAction(status: DepositRecord["status"]): Promise<void> {
  if (!hasAccess("deposit:manage")) {
    throw new Error("The signed-in session cannot manage deposits.");
  }
  const ids = [...state.selectedDepositIds];
  if (ids.length === 0) {
    throw new Error("Select at least one deposit first.");
  }

  for (const id of ids) {
    if (status === "withdrawn") {
      await peerApi.withdrawPeerDeposit(id, {}, authHeaders());
      continue;
    }
    await peerApi.setPeerDepositAccepting(
      id,
      { accepting: status === "active" },
      authHeaders(),
    );
  }
  await refreshProtectedOpsData();
  recordAuditEvent({
    type: "deposit",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Bulk deposit status update",
    description: `${ids.length} deposit(s) moved to ${status}`,
    metadata: {
      status,
      ids: ids.join(","),
    },
    exportable: true,
  });
  renderDepositTable();
  pushToast(`Updated ${ids.length} deposit(s) to ${status}.`, "success");
}

function exportDeposits(): void {
  const filtered = filterDeposits(currentDepositRecords(), currentDepositFilters());
  const csv = [
    ["id", "memberId", "memberName", "division", "paymentMethod", "status", "riskLevel", "updatedAt"].join(","),
    ...filtered.map((record) =>
      [
        record.id,
        record.memberId,
        record.memberName,
        record.division,
        record.paymentMethod,
        record.status,
        record.riskLevel,
        record.updatedAt,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const anchor = document.createElement("a");
  anchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  anchor.download = "peer-deposits.csv";
  anchor.click();
}

async function checkExtension(): Promise<void> {
  await refreshExtensionState();
  setStatus("Extension state refreshed.", "success");
}

async function connectExtension(): Promise<void> {
  const runtime = getExtensionRuntime();
  if (!runtime.requestConnection) {
    throw new Error("Peer extension connection is not exposed in this runtime.");
  }
  await runtime.requestConnection();
  await refreshExtensionState();
  setStatus("Peer extension connected.", "success");
}

function installExtension(): void {
  window.open("https://chromewebstore.google.com", "_blank", "noopener,noreferrer");
}

function subscribeIntentFulfilled(): void {
  if (state.extensionUnsubscribe) {
    return;
  }
  const runtime = getExtensionRuntime();
  if (!runtime.onIntentFulfilled) {
    return;
  }
  try {
    state.extensionUnsubscribe = runtime.onIntentFulfilled((result) => {
      setText("#advancedRaw", JSON.stringify(result, null, 2));
      pushToast("Peer extension reported an intent fulfillment update.", "success");
    });
  } catch {
    state.extensionUnsubscribe = null;
    state.extension = {
      installed: false,
      connected: false,
      version: "Unavailable",
    };
  }
}

function launchOnramp(): void {
  const runtime = getExtensionRuntime();
  if (!runtime.onramp) {
    throw new Error("Peer extension onramp is not available in this browser.");
  }
  const params = {
    inputCurrency: formValue(onrampForm, "inputCurrency"),
    inputAmount: formValue(onrampForm, "inputAmount"),
    paymentPlatform: formValue(onrampForm, "paymentPlatform"),
    toToken: formValue(onrampForm, "toToken"),
    recipientAddress: formValue(onrampForm, "recipientAddress") || state.wallet?.address,
  };
  runtime.onramp(params);
  setMarkup(
    "#onrampSummary",
    renderSummaryItems([
      { label: "Platform", value: params.paymentPlatform },
      { label: "Input", value: `${params.inputAmount} ${params.inputCurrency}` },
      { label: "Recipient", value: params.recipientAddress ? truncateMiddle(params.recipientAddress, 8, 6) : "Not provided" },
    ]),
  );
  setText("#advancedRaw", JSON.stringify(params, null, 2));
  setStatus("Peer extension onramp launched.", "success");
}

async function saveSettings(): Promise<void> {
  if (!hasAccess("settings:write")) {
    throw new Error("The signed-in session cannot update settings.");
  }
  const nextSettings: SettingsState = {
    ...state.settings,
    uiRole: state.uiRole,
    notifications: {
      telegramEnabled: mustElement<HTMLInputElement>("#telegramEnabled").checked,
      telegramChannel: mustElement<HTMLInputElement>("#telegramChannel").value.trim(),
      approvals: mustElement<HTMLInputElement>("#notifyApprovals").checked,
      depositStatus: mustElement<HTMLInputElement>("#notifyDeposits").checked,
      complianceAlerts: mustElement<HTMLInputElement>("#notifyCompliance").checked,
    },
    featureFlags: {
      realtimePolling: mustElement<HTMLInputElement>("#flagRealtimePolling").checked,
      liveQuotes: mustElement<HTMLInputElement>("#flagLiveQuotes").checked,
      peerExtensionOnramp: mustElement<HTMLInputElement>("#flagOnramp").checked,
      complianceExports: mustElement<HTMLInputElement>("#flagComplianceExports").checked,
    },
  };
  const response = await peerApi.updateSettings(nextSettings, authHeaders());
  state.settings = response.settings;
  renderSettings();
  restartPolling();
  recordAuditEvent({
    type: "settings",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Settings updated",
    description: "Notification and feature flag configuration updated from operations app.",
    metadata: {
      telegram: String(state.settings.notifications.telegramEnabled),
      realtimePolling: String(state.settings.featureFlags.realtimePolling),
    },
    exportable: true,
  });
  setStatus("Settings saved.", "success");
  pushToast("Settings saved to the shared server configuration.", "success");
}

async function refreshAll(): Promise<void> {
  state.liveUpdatedAt = new Date().toISOString();
  await Promise.all([
    refreshDashboard(),
    refreshTeam(),
    refreshDocs(),
    refreshExtensionState().catch(() => undefined),
  ]);
  await refreshSession();
  await refreshProtectedOpsData();
  await refreshExecutionContext().catch(() => undefined);
  renderCompliance();
  renderSettings();
  renderWalletSummary();
  renderLiveOpsSummary();
  renderWorkflowBadges();
  renderHeroStats();
  populateSettingsForm();
  renderDepositTable();
  applyRoleState();
}

function restartPolling(): void {
  state.pollerStop?.();
  state.pollerStop = null;
  if (!state.settings.featureFlags.realtimePolling) {
    return;
  }
  const poller = createPoller(async () => {
    try {
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Realtime refresh failed.";
      setStatus(message, "error");
    }
  }, runtimeConfig.pollingIntervalMs);
  state.pollerStop = poller.stop;
  poller.start();
}

function bindEvents(): void {
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const response = await peerApi.signIn(formValue(signinForm, "memberId"), formValue(signinForm, "password"));
      setStatus(`Signed in as ${response.session.memberId}.`, "success");
      recordAuditEvent({
        type: "auth",
        actor: response.session.memberId,
        division: "Houston HQ",
        title: "Session created",
        description: "Operator signed in to the operations app.",
        metadata: {
          memberId: response.session.memberId,
        },
        exportable: true,
      });
      await refreshAll();
      pushToast("Sign-in complete.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setStatus(message, "error");
    }
  });

  mustElement<HTMLButtonElement>("#signout").addEventListener("click", async () => {
    try {
      await peerApi.signOut(authHeaders());
    } catch {
      // Keep local cleanup even if the demo API session is already gone.
    }
    state.sessionMember = null;
    state.sessionPermissions = [];
    state.uiRole = "Viewer";
    state.executionContext = null;
    mustElement<HTMLSelectElement>("#roleSwitcher").value = state.uiRole;
    renderSession();
    renderExecutionSummary();
    applyRoleState();
    setStatus("Signed out.", "success");
  });

  mustElement<HTMLButtonElement>("#refreshOps").addEventListener("click", () => {
    void refreshAll();
  });
  mustElement<HTMLButtonElement>("#connectWallet").addEventListener("click", () => {
    void connectWallet();
  });
  mustElement<HTMLButtonElement>("#checkExtension").addEventListener("click", () => {
    void checkExtension();
  });
  mustElement<HTMLButtonElement>("#connectExtension").addEventListener("click", () => {
    void connectExtension();
  });
  mustElement<HTMLButtonElement>("#installExtension").addEventListener("click", installExtension);
  mustElement<HTMLButtonElement>("#previewDeposit").addEventListener("click", () => {
    void previewDeposit().catch((error) => {
      const message = error instanceof Error ? error.message : "Preview failed.";
      setStatus(message, "error");
    });
  });
  mustElement<HTMLButtonElement>("#registerPayeeDetails").addEventListener("click", () => {
    void registerPayeeDetails().catch((error) => {
      const message = error instanceof Error ? error.message : "Payee registration failed.";
      setStatus(message, "error");
    });
  });
  mustElement<HTMLButtonElement>("#prepareDeposit").addEventListener("click", () => {
    void prepareDeposit().catch((error) => {
      const message = error instanceof Error ? error.message : "Preparation failed.";
      setStatus(message, "error");
    });
  });
  mustElement<HTMLButtonElement>("#executeDeposit").addEventListener("click", () => {
    void executeDeposit().catch((error) => {
      const message = error instanceof Error ? error.message : "Deposit execution failed.";
      setStatus(message, "error");
    });
  });
  mustElement<HTMLButtonElement>("#launchOnramp").addEventListener("click", () => {
    try {
      launchOnramp();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onramp launch failed.";
      setStatus(message, "error");
    }
  });

  mustElement<HTMLSelectElement>("#memberSelect").addEventListener("change", () => {
    void refreshExecutionContext().catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to refresh execution context.";
      setStatus(message, "error");
    });
  });

  [
    "#depositSearch",
    "#depositStatusFilter",
    "#depositDivisionFilter",
    "#depositMethodFilter",
    "#depositDateFrom",
    "#depositDateTo",
    "#depositAmountMin",
    "#depositAmountMax",
    "#depositPageSize",
  ].forEach((selector) => {
    mustElement<HTMLInputElement | HTMLSelectElement>(selector).addEventListener("input", () => {
      state.depositPage = 1;
      renderDepositTable();
    });
    mustElement<HTMLInputElement | HTMLSelectElement>(selector).addEventListener("change", () => {
      state.depositPage = 1;
      renderDepositTable();
    });
  });

  mustElement<HTMLButtonElement>("#depositPrevPage").addEventListener("click", () => {
    state.depositPage = Math.max(1, state.depositPage - 1);
    renderDepositTable();
  });
  mustElement<HTMLButtonElement>("#depositNextPage").addEventListener("click", () => {
    state.depositPage += 1;
    renderDepositTable();
  });
  mustElement<HTMLInputElement>("#selectAllDeposits").addEventListener("change", (event) => {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const pageSize = Math.min(
      50,
      Math.max(5, Number(mustElement<HTMLSelectElement>("#depositPageSize").value) || 10),
    );
    const visible = paginate(
      filterDeposits(currentDepositRecords(), currentDepositFilters()),
      state.depositPage,
      pageSize,
    ).items;
    visible.forEach((record) => updateSelectedDeposit(record.id, checked));
    renderDepositTable();
  });

  const handleDepositActionClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const actionButton = target.closest<HTMLButtonElement>("[data-action]");
    if (actionButton) {
      const id = actionButton.dataset.id;
      const action = actionButton.dataset.action;
      if (!id || !action) {
        return;
      }
      state.selectedDepositIds = new Set([id]);
      renderDepositTable();
      void performBulkDepositAction(
        action === "withdraw" ? "withdrawn" : action === "pause" ? "paused" : "active",
      ).catch((error) => {
        const message = error instanceof Error ? error.message : "Deposit action failed.";
        setStatus(message, "error");
      });
      return;
    }

    const checkbox = target.closest<HTMLInputElement>("[data-deposit-select]");
    if (checkbox?.dataset.depositSelect) {
      updateSelectedDeposit(checkbox.dataset.depositSelect, checkbox.checked);
      renderDepositTable();
    }
  };

  mustElement<HTMLTableSectionElement>("#depositTable").addEventListener("click", handleDepositActionClick);
  mustElement<HTMLDivElement>("#depositCards").addEventListener("click", handleDepositActionClick);
  mustElement<HTMLDivElement>("#depositCards").addEventListener("change", handleDepositActionClick);
  mustElement<HTMLTableSectionElement>("#depositTable").addEventListener("change", handleDepositActionClick);

  mustElement<HTMLButtonElement>("#bulkActivate").addEventListener("click", () => {
    void performBulkDepositAction("active").catch((error) => {
      setStatus(error instanceof Error ? error.message : "Bulk update failed.", "error");
    });
  });
  mustElement<HTMLButtonElement>("#bulkPause").addEventListener("click", () => {
    void performBulkDepositAction("paused").catch((error) => {
      setStatus(error instanceof Error ? error.message : "Bulk update failed.", "error");
    });
  });
  mustElement<HTMLButtonElement>("#bulkWithdraw").addEventListener("click", () => {
    void performBulkDepositAction("withdrawn").catch((error) => {
      setStatus(error instanceof Error ? error.message : "Bulk update failed.", "error");
    });
  });
  mustElement<HTMLButtonElement>("#exportDeposits").addEventListener("click", exportDeposits);

  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSettings().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Settings save failed.", "error");
    });
  });

  mustElement<HTMLButtonElement>("#openCommandPalette").addEventListener("click", () => {
    commandDialog.showModal();
    mustElement<HTMLInputElement>("#commandSearch").focus();
    renderCommandResults();
  });

  mustElement<HTMLInputElement>("#commandSearch").addEventListener("input", (event) => {
    renderCommandResults((event.currentTarget as HTMLInputElement).value);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !commandDialog.open) {
      event.preventDefault();
      commandDialog.showModal();
      mustElement<HTMLInputElement>("#commandSearch").focus();
      renderCommandResults();
      return;
    }

    if (event.key.toLowerCase() === "g" && !event.metaKey && !event.ctrlKey) {
      const nextKeyHandler = (nextEvent: KeyboardEvent) => {
        if (nextEvent.key.toLowerCase() === "d") {
          scrollToSection("deposits-section");
        }
        if (nextEvent.key.toLowerCase() === "c") {
          scrollToSection("compliance-section");
        }
        document.removeEventListener("keydown", nextKeyHandler);
      };
      document.addEventListener("keydown", nextKeyHandler);
    }
  });
}

async function bootstrap(): Promise<void> {
  populateStaticOptions();
  populateSettingsForm();
  setPanelLoading("#sessionSummary");
  setPanelLoading("#walletSummary");
  setPanelLoading("#liveOpsSummary");
  setPanelLoading("#executionSummary");
  setPanelLoading("#peerModelSummary");
  setPanelLoading("#depositPreviewSummary");
  setPanelLoading("#complianceSummary", 4);
  setPanelLoading("#settingsSummary");
  renderDepositTable();
  bindEvents();
  await refreshCatalog();
  await refreshCurrencies();
  await refreshDocs();
  subscribeIntentFulfilled();
  await refreshAll();
  renderSettings();
  renderDepositPreview();
  renderCompliance();
  renderWalletSummary();
  renderLiveOpsSummary();
  renderWorkflowBadges();
  applyRoleState();
  restartPolling();
}

void bootstrap().catch((error) => {
  const message = error instanceof Error ? error.message : "Operations app boot failed.";
  setStatus(message, "error");
  pushToast(message, "error");
});
