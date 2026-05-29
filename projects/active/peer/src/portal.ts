import {
  appendAuditEvent,
  getComplianceDashboard,
  getSettingsState,
} from "./services/local-store";
import { peerApi } from "./services/peer-api";
import { createPoller } from "./services/realtime";
import type {
  AppRole,
  AuditEvent,
  ComplianceDashboard,
  DashboardResponse,
  SettingsState,
  SummaryItem,
} from "./types/app";
import { APP_ROLES, AUDIT_EVENT_TYPES, DIVISIONS } from "./types/app";
import { renderAuditRows, renderBadge, renderExportHref, renderTimelineEntry } from "./components/cards";
import { renderSkeleton, renderSummaryItems, renderTextSummary } from "./components/summary";
import { escapeHtml, formValue, mustElement } from "./utils/dom";
import { formatMoneyFromCents, formatTimestamp } from "./utils/formatters";
import { canAccessWithSession, deriveAppRoleFromSession } from "./utils/rbac";

type StatusTone = "neutral" | "success" | "error";
type Member = DashboardResponse["summary"]["members"][number];

type PortalState = {
  uiRole: AppRole;
  settings: SettingsState;
  dashboard: DashboardResponse | null;
  sessionMember: Member | null;
  sessionPermissions: string[];
  audit: AuditEvent[];
  compliance: ComplianceDashboard;
  selectedMemberId: string | null;
  pollerStop: (() => void) | null;
};

const state: PortalState = {
  uiRole: "Viewer",
  settings: getSettingsState(),
  dashboard: null,
  sessionMember: null,
  sessionPermissions: [],
  audit: [],
  compliance: getComplianceDashboard(),
  selectedMemberId: null,
  pollerStop: null,
};

const portalSigninForm = mustElement<HTMLFormElement>("#portalSigninForm");
const portalInviteForm = mustElement<HTMLFormElement>("#portalInviteForm");
const portalOnboardingForm = mustElement<HTMLFormElement>("#portalOnboardingForm");
const portalMemberForm = mustElement<HTMLFormElement>("#portalMemberForm");
const portalFundsForm = mustElement<HTMLFormElement>("#portalFundsForm");
let previousFocusedElement: HTMLElement | null = null;

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  return extra;
}

function hasAccess(capability: Parameters<typeof canAccessWithSession>[1]): boolean {
  return canAccessWithSession(state.sessionPermissions, capability);
}

function setStatus(message: string, tone: StatusTone = "neutral"): void {
  const banner = mustElement<HTMLDivElement>("#portalStatus");
  banner.textContent = message;
  banner.className = `status-banner ${tone}`;
}

function pushToast(message: string, tone: StatusTone = "neutral"): void {
  const region = mustElement<HTMLDivElement>("#portalToastRegion");
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

function setMarkup(selector: string, html: string): void {
  mustElement(selector).innerHTML = html;
}

function recordAuditEvent(partial: Omit<AuditEvent, "id" | "timestamp" | "role"> & { timestamp?: string }): void {
  state.audit = appendAuditEvent({
    id: crypto.randomUUID(),
    timestamp: partial.timestamp ?? new Date().toISOString(),
    role: state.uiRole,
    ...partial,
  });
}

function getMember(memberId: string | null): Member | null {
  if (!memberId) {
    return null;
  }
  return state.dashboard?.summary.members.find((member) => member.memberId === memberId) ?? null;
}

function currentFilters() {
  return {
    search: mustElement<HTMLInputElement>("#memberSearch").value.trim().toLowerCase(),
    region: mustElement<HTMLSelectElement>("#regionFilter").value,
    role: mustElement<HTMLSelectElement>("#roleFilter").value,
    approvalStatus: mustElement<HTMLSelectElement>("#approvalFilter").value,
  };
}

function filteredMembers(): Member[] {
  const dashboard = state.dashboard;
  if (!dashboard) {
    return [];
  }
  const filters = currentFilters();
  return dashboard.summary.members.filter((member) => {
    const matchesSearch =
      filters.search.length === 0 ||
      member.memberId.toLowerCase().includes(filters.search) ||
      member.displayName.toLowerCase().includes(filters.search) ||
      member.email.toLowerCase().includes(filters.search);
    const matchesRegion = filters.region === "all" || member.region === filters.region;
    const matchesRole = filters.role === "all" || member.role === filters.role;
    return matchesSearch && matchesRegion && matchesRole;
  });
}

function filteredApprovals() {
  const dashboard = state.dashboard;
  if (!dashboard) {
    return [];
  }
  const { approvalStatus } = currentFilters();
  return dashboard.approvals.filter((approval) => approvalStatus === "all" || approval.status === approvalStatus);
}

function filteredAuditEvents(): AuditEvent[] {
  const type = mustElement<HTMLSelectElement>("#auditTypeFilter").value;
  const division = mustElement<HTMLSelectElement>("#auditDivisionFilter").value;
  const actor = mustElement<HTMLInputElement>("#auditActorFilter").value.trim().toLowerCase();
  const dateFrom = mustElement<HTMLInputElement>("#auditDateFrom").value;
  const from = dateFrom ? new Date(dateFrom).getTime() : null;
  return state.audit.filter((event) => {
    const matchesType = type === "all" || event.type === type;
    const matchesDivision = division === "all" || event.division === division;
    const matchesActor = actor.length === 0 || event.actor.toLowerCase().includes(actor);
    const matchesDate = from === null || new Date(event.timestamp).getTime() >= from;
    return matchesType && matchesDivision && matchesActor && matchesDate;
  });
}

function renderSidebarSummary(): void {
  const dashboard = state.dashboard;
  const items: SummaryItem[] = [
    { label: "Access profile", value: state.uiRole },
    { label: "Session", value: state.sessionMember?.memberId ?? "No active session" },
    { label: "Pending approvals", value: String(dashboard?.approvals.filter((approval) => approval.status === "pending").length ?? 0) },
    { label: "Open alerts", value: String(state.compliance.openAlerts) },
  ];
  setMarkup("#portalRailSummary", renderSummaryItems(items));
}

function renderSessionSummary(): void {
  if (!state.sessionMember) {
    setMarkup("#portalSessionSummary", renderTextSummary(["No active session. Sign in with an individual app account."]));
    mustElement<HTMLPreElement>("#portalSessionRaw").textContent = "No active session.";
    return;
  }
  setMarkup(
    "#portalSessionSummary",
    renderSummaryItems([
      { label: "Operator", value: state.sessionMember.displayName },
      { label: "Server role", value: state.sessionMember.role },
      { label: "Access profile", value: state.uiRole },
      { label: "Region", value: state.sessionMember.region },
      { label: "Permissions", value: String(state.sessionPermissions.length) },
    ]),
  );
  mustElement<HTMLPreElement>("#portalSessionRaw").textContent = JSON.stringify(
    {
      sessionMember: state.sessionMember,
      permissions: state.sessionPermissions,
      uiRole: state.uiRole,
    },
    null,
    2,
  );
}

function renderOverviewStats(): void {
  const dashboard = state.dashboard;
  if (!dashboard) {
    setMarkup("#overviewStats", renderSkeleton(4));
    return;
  }
  const members = dashboard.summary.members;
  const stats = [
    ["Members", String(members.length)],
    ["Regional leaders", String(members.filter((member) => member.leaderForRegion).length)],
    ["Privileged users", String(members.filter((member) => member.role === "admin" || member.role === "finance").length)],
    ["Tracked funds", formatMoneyFromCents(dashboard.summary.funds.totalUsdCents)],
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
  setMarkup("#overviewStats", stats);
}

function renderRegionBoard(): void {
  const dashboard = state.dashboard;
  if (!dashboard) {
    setMarkup("#regionBoard", renderTextSummary(["No region data yet."]));
    return;
  }

  const html = Object.entries(dashboard.summary.leadersByRegion)
    .map(([region, leader]) => {
      const members = dashboard.summary.members.filter((member) => member.region === region);
      const total = dashboard.summary.funds.byRegion[region] ?? 0;
      return `
        <article class="entity-card">
          <div class="entity-topline">
            <div>
              <h3>${escapeHtml(region)}</h3>
              <div class="member-id">${escapeHtml(leader || "No leader assigned")}</div>
            </div>
            ${renderBadge(`${members.length} member${members.length === 1 ? "" : "s"}`)}
          </div>
          <div class="portal-meta-list">
            <div>Tracked funds: ${escapeHtml(formatMoneyFromCents(total))}</div>
            <div>Peer operators: ${members.filter((member) => member.canExecutePeerTransactions).length}</div>
          </div>
        </article>
      `;
    })
    .join("");
  setMarkup("#regionBoard", html || `<div class="empty-state">No regional data available.</div>`);
}

function renderCompliance(): void {
  const summary = [
    ["KYC ready", String(state.compliance.kycReadyCount)],
    ["AML review", String(state.compliance.amlReviewCount)],
    ["Open alerts", String(state.compliance.openAlerts)],
    ["Proof backlog", String(state.compliance.proofBacklog)],
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
  setMarkup("#portalComplianceSummary", summary);

  const cases = state.compliance.cases
    .map(
      (item) => `
        <article class="entity-card">
          <div class="entity-topline">
            <div>
              <h3>${escapeHtml(item.category)} case</h3>
              <div class="member-id">${escapeHtml(item.memberId)} • ${escapeHtml(item.division)}</div>
            </div>
            ${renderBadge(item.severity, item.severity === "high" || item.severity === "critical" ? "danger" : "warning")}
          </div>
          <p class="body-copy">${escapeHtml(item.summary)}</p>
          <div class="portal-meta-list">
            <div>Owner: ${escapeHtml(item.owner)}</div>
            <div>Status: ${escapeHtml(item.status)}</div>
          </div>
        </article>
      `,
    )
    .join("");
  setMarkup("#portalComplianceCases", cases || `<div class="empty-state">No open compliance cases.</div>`);
}

function approvalActionsMarkup(approvalId: string): string {
  if (!hasAccess("approval:act")) {
    return `<span class="helper-copy">Read only for ${escapeHtml(state.uiRole)}</span>`;
  }
  return `
    <div class="actions wrap">
      <button type="button" class="mini-button" data-approval-action="approved" data-approval-id="${escapeHtml(approvalId)}">Approve</button>
      <button type="button" class="mini-button danger" data-approval-action="rejected" data-approval-id="${escapeHtml(approvalId)}">Reject</button>
    </div>
  `;
}

function renderApprovalFeed(): void {
  const approvals = filteredApprovals();
  if (approvals.length === 0) {
    setMarkup("#approvalFeed", `<div class="empty-state">No approvals match the current filters.</div>`);
    return;
  }

  setMarkup(
    "#approvalFeed",
    approvals
      .map(
        (approval) => `
          <article class="entity-card">
            <div class="entity-topline">
              <div>
                <h3>${escapeHtml(approval.type)}</h3>
                <div class="member-id">${escapeHtml(approval.memberId)} • ${escapeHtml(approval.region)}</div>
              </div>
              ${renderBadge(approval.status, approval.status === "approved" ? "success" : approval.status === "rejected" ? "danger" : "accent")}
            </div>
            <div class="portal-meta-list">
              <div>${escapeHtml(approval.note)}</div>
              <div>Requested by ${escapeHtml(approval.requestedBy)} on ${escapeHtml(formatTimestamp(approval.createdAt))}</div>
            </div>
            ${approval.status === "pending" ? approvalActionsMarkup(approval.approvalId) : ""}
          </article>
        `,
      )
      .join(""),
  );
}

function renderDirectory(): void {
  const members = filteredMembers();
  if (members.length === 0) {
    setMarkup("#memberDirectory", `<div class="empty-state">No members match the current filters.</div>`);
    return;
  }

  setMarkup(
    "#memberDirectory",
    members
      .map(
        (member) => `
          <button type="button" class="entity-card clickable-card member-card-button" data-member-card="${escapeHtml(member.memberId)}">
            <div class="entity-topline">
              <div>
                <h3>${escapeHtml(member.displayName)}</h3>
                <div class="member-id">${escapeHtml(member.memberId)} • ${escapeHtml(member.region)}</div>
              </div>
              ${renderBadge(member.role)}
            </div>
            <div class="chip-row">
              ${member.venmo ? renderBadge("Venmo", "accent") : ""}
              ${member.cashapp ? renderBadge("Cash App", "accent") : ""}
              ${member.paypal ? renderBadge("PayPal", "accent") : ""}
              ${member.canExecutePeerTransactions ? renderBadge("Peer execute", "success") : renderBadge("No execute", "warning")}
            </div>
            <div class="portal-meta-list">
              <div>${escapeHtml(member.email)}</div>
              <div>Balance: ${escapeHtml(formatMoneyFromCents(member.balanceUsdCents))}</div>
            </div>
          </button>
        `,
      )
      .join(""),
  );
}

function renderLedgerAndInvites(): void {
  const dashboard = state.dashboard;
  if (!dashboard) {
    setMarkup("#ledgerFeed", `<div class="empty-state">No ledger data available.</div>`);
    setMarkup("#inviteFeed", `<div class="empty-state">No invite data available.</div>`);
    return;
  }

  setMarkup(
    "#ledgerFeed",
    dashboard.summary.funds.entries.length === 0
      ? `<div class="empty-state">No ledger entries yet.</div>`
      : dashboard.summary.funds.entries
          .slice(0, 8)
          .map(
            (entry) => `
              <article class="entity-card">
                <div class="entity-topline">
                  <div>
                    <h3>${escapeHtml(entry.memberId)}</h3>
                    <div class="member-id">${escapeHtml(entry.type)} • ${escapeHtml(formatTimestamp(entry.createdAt))}</div>
                  </div>
                  ${renderBadge(formatMoneyFromCents(entry.amountUsdCents), entry.type === "credit" ? "success" : "warning")}
                </div>
                <div class="portal-meta-list">
                  <div>${escapeHtml(entry.note)}</div>
                  <div>Created by ${escapeHtml(entry.createdBy)}</div>
                </div>
              </article>
            `,
          )
          .join(""),
  );

  setMarkup(
    "#inviteFeed",
    dashboard.invites.length === 0
      ? `<div class="empty-state">No invites yet.</div>`
      : dashboard.invites
          .slice(0, 8)
          .map(
            (invite) => `
              <article class="entity-card">
                <div class="entity-topline">
                  <div>
                    <h3>${escapeHtml(invite.memberId)}</h3>
                    <div class="member-id">${escapeHtml(invite.email)}</div>
                  </div>
                  ${renderBadge(invite.status, invite.status === "accepted" ? "success" : "accent")}
                </div>
                <div class="portal-meta-list">
                  <div>${escapeHtml(invite.role)} • ${escapeHtml(invite.region)}</div>
                  <div>Invited by ${escapeHtml(invite.invitedBy)}</div>
                </div>
              </article>
            `,
          )
          .join(""),
  );
}

function renderAuditTimeline(): void {
  const events = filteredAuditEvents();
  setMarkup("#auditTimeline", renderAuditRows(events));
  const exportAnchor = mustElement<HTMLAnchorElement>("#auditExport");
  exportAnchor.href = renderExportHref(events);
  exportAnchor.setAttribute("aria-disabled", hasAccess("audit:export") ? "false" : "true");
  exportAnchor.classList.toggle("disabled-link", !hasAccess("audit:export"));
}

function closeMemberDrawer(options: { restoreFocus?: boolean } = {}): void {
  const drawer = mustElement<HTMLElement>("#memberDrawer");
  drawer.classList.add("hidden");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  document.querySelector("main")?.removeAttribute("inert");
  if (options.restoreFocus !== false) {
    previousFocusedElement?.focus();
  }
}

function openMemberDrawer(): void {
  const drawer = mustElement<HTMLElement>("#memberDrawer");
  previousFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  document.querySelector("main")?.setAttribute("inert", "");
  window.setTimeout(() => {
    mustElement<HTMLButtonElement>("#closeDrawer").focus();
  }, 0);
}

function renderMemberDrawer(): void {
  const member = getMember(state.selectedMemberId);
  if (!member) {
    closeMemberDrawer({ restoreFocus: false });
    return;
  }

  openMemberDrawer();
  setMarkup("#drawerName", escapeHtml(member.displayName));
  setMarkup("#drawerId", `${escapeHtml(member.memberId)} • ${escapeHtml(member.region)} • ${escapeHtml(member.role)}`);
  setMarkup(
    "#drawerSummary",
    renderSummaryItems([
      { label: "Email", value: member.email },
      { label: "Balance", value: formatMoneyFromCents(member.balanceUsdCents) },
      { label: "Peer execution", value: member.canExecutePeerTransactions ? "Enabled" : "Not enabled" },
      {
        label: "Payout routes",
        value: [member.venmo && "venmo", member.cashapp && "cashapp", member.paypal && "paypal"].filter(Boolean).join(", ") || "No payout routes",
      },
    ]),
  );

  const relatedEvents = state.audit
    .filter((event) =>
      event.metadata.memberId === member.memberId ||
      event.description.includes(member.memberId) ||
      event.actor === member.memberId,
    )
    .slice(0, 8);

  setMarkup(
    "#drawerTimeline",
    relatedEvents.length === 0
      ? `<div class="empty-state">No timeline events yet for this member.</div>`
      : relatedEvents.map((event) => renderTimelineEntry(event.title, event.description, event.timestamp)).join(""),
  );
  mustElement<HTMLPreElement>("#drawerRaw").textContent = JSON.stringify(member, null, 2);
}

function populateFilters(): void {
  mustElement<HTMLSelectElement>("#portalRoleSwitcher").innerHTML = APP_ROLES.map(
    (role) => `<option value="${role}">${role}</option>`,
  ).join("");
  mustElement<HTMLSelectElement>("#portalRoleSwitcher").value = state.uiRole;
  mustElement<HTMLSelectElement>("#portalRoleSwitcher").disabled = true;

  const members = state.dashboard?.summary.members ?? [];
  const regions = new Set(["all", ...members.map((member) => member.region)]);
  const roles = new Set(["all", ...members.map((member) => member.role)]);

  mustElement<HTMLSelectElement>("#regionFilter").innerHTML = [...regions]
    .map((region) => `<option value="${region}">${region}</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#roleFilter").innerHTML = [...roles]
    .map((role) => `<option value="${role}">${role}</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#approvalFilter").innerHTML = ["all", "pending", "approved", "rejected"]
    .map((status) => `<option value="${status}">${status}</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#auditTypeFilter").innerHTML = ["all", ...AUDIT_EVENT_TYPES]
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#auditDivisionFilter").innerHTML = ["all", ...DIVISIONS]
    .map((division) => `<option value="${division}">${division}</option>`)
    .join("");

  const memberOptions = members
    .map((member) => `<option value="${member.memberId}">${member.displayName} (${member.memberId})</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#portalFundsMemberSelect").innerHTML = memberOptions;
  mustElement<HTMLSelectElement>("#inviteRoleSelect").innerHTML = ["member", "regional_lead", "finance", "admin"]
    .map((role) => `<option value="${role}">${role}</option>`)
    .join("");
  mustElement<HTMLSelectElement>("#memberRoleSelect").innerHTML = ["member", "regional_lead", "finance", "admin"]
    .map((role) => `<option value="${role}">${role}</option>`)
    .join("");
}

function applyRoleState(): void {
  const managementEnabled = hasAccess("member:write");
  const fundsEnabled = hasAccess("funds:write");
  const approvalEnabled = hasAccess("approval:act");

  portalInviteForm
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")
    .forEach((field) => {
      field.disabled = !managementEnabled;
    });
  portalMemberForm
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")
    .forEach((field) => {
      field.disabled = !managementEnabled;
    });
  portalFundsForm
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")
    .forEach((field) => {
      field.disabled = !fundsEnabled;
    });
  mustElement<HTMLButtonElement>("#requestFundsApproval").disabled = !hasAccess("approval:request");
  mustElement<HTMLButtonElement>("#requestPeerApproval").disabled = !hasAccess("approval:request");
  mustElement<HTMLButtonElement>("#drawerGrantPeer").disabled = !approvalEnabled && !managementEnabled;
  mustElement<HTMLButtonElement>("#drawerRequestReview").disabled = !hasAccess("compliance:view");
}

async function refreshDashboard(): Promise<void> {
  state.dashboard = await peerApi.getDashboard(authHeaders());
  populateFilters();
  renderOverviewStats();
  renderRegionBoard();
  renderApprovalFeed();
  renderDirectory();
  renderLedgerAndInvites();
  renderSidebarSummary();
}

async function refreshProtectedPortalData(): Promise<void> {
  if (!state.sessionMember) {
    state.audit = [];
    renderCompliance();
    renderAuditTimeline();
    return;
  }

  const [settingsResponse, complianceResponse, auditResponse] = await Promise.all([
    peerApi.getSettings(authHeaders()),
    peerApi.getCompliance(authHeaders()),
    peerApi.getAuditEvents({}, authHeaders()),
  ]);

  state.settings = settingsResponse.settings;
  state.compliance = complianceResponse.dashboard;
  state.audit = auditResponse.items;
}

async function refreshSession(): Promise<void> {
  const session = await peerApi.getSession(authHeaders());
  state.sessionPermissions = session.permissions;
  if (!session.member) {
    state.sessionMember = null;
    state.uiRole = "Viewer";
    mustElement<HTMLSelectElement>("#portalRoleSwitcher").value = state.uiRole;
    renderSessionSummary();
    return;
  }
  state.sessionMember =
    state.dashboard?.summary.members.find((member) => member.memberId === session.member?.memberId) ?? null;
  state.uiRole = session.appRole ?? deriveAppRoleFromSession(session.permissions, session.member.role);
  mustElement<HTMLSelectElement>("#portalRoleSwitcher").value = state.uiRole;
  renderSessionSummary();
  renderSidebarSummary();
}

async function refreshAll(): Promise<void> {
  await refreshDashboard();
  await refreshSession();
  await refreshProtectedPortalData();
  renderCompliance();
  renderAuditTimeline();
  renderMemberDrawer();
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
      setStatus(error instanceof Error ? error.message : "Portal polling failed.", "error");
    }
  }, 20000);
  state.pollerStop = poller.stop;
  poller.start();
}

async function signInPortal(): Promise<void> {
  const response = await peerApi.signIn(formValue(portalSigninForm, "memberId"), formValue(portalSigninForm, "password"));
  recordAuditEvent({
    type: "auth",
    actor: response.session.memberId,
    division: "Houston HQ",
    title: "Portal sign-in",
    description: "Operator signed in via management portal.",
    metadata: { memberId: response.session.memberId },
    exportable: true,
  });
  await refreshAll();
  setStatus(`Signed in as ${response.session.memberId}.`, "success");
}

async function signOutPortal(): Promise<void> {
  try {
    await peerApi.signOut(authHeaders());
  } catch {
    // Local cleanup remains safe for expired sessions.
  }
  state.sessionMember = null;
  state.sessionPermissions = [];
  state.uiRole = "Viewer";
  mustElement<HTMLSelectElement>("#portalRoleSwitcher").value = state.uiRole;
  state.selectedMemberId = null;
  state.audit = [];
  renderSessionSummary();
  renderSidebarSummary();
  renderAuditTimeline();
  renderMemberDrawer();
  applyRoleState();
  setStatus("Signed out.", "success");
}

async function createInvite(): Promise<void> {
  const response = await peerApi.createInvite(
    {
      email: formValue(portalInviteForm, "email"),
      memberId: formValue(portalInviteForm, "memberId"),
      role: formValue(portalInviteForm, "role"),
      state: formValue(portalInviteForm, "state"),
      leaderForRegion: mustElement<HTMLInputElement>('[name="leaderForRegion"]', portalInviteForm).checked,
      canExecutePeerTransactions: mustElement<HTMLInputElement>('[name="canExecutePeerTransactions"]', portalInviteForm).checked,
    },
    authHeaders(),
  );
  state.dashboard = response.dashboard;
  setMarkup(
    "#inviteSummary",
    renderSummaryItems([
      { label: "Invite token", value: response.invite.inviteToken },
      { label: "Member", value: response.invite.memberId },
      { label: "Role", value: response.invite.role },
    ]),
  );
  recordAuditEvent({
    type: "member",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Invite created",
    description: `Invite created for ${response.invite.memberId}`,
    metadata: {
      memberId: response.invite.memberId,
      inviteId: response.invite.inviteId,
    },
    exportable: true,
  });
  await refreshAll();
  setStatus("Invite created.", "success");
}

async function completeOnboarding(): Promise<void> {
  const response = await peerApi.acceptInvite({
    inviteToken: formValue(portalOnboardingForm, "inviteToken"),
    displayName: formValue(portalOnboardingForm, "displayName"),
    password: formValue(portalOnboardingForm, "password"),
    venmo: formValue(portalOnboardingForm, "venmo") || null,
    cashapp: formValue(portalOnboardingForm, "cashapp") || null,
    paypal: formValue(portalOnboardingForm, "paypal") || null,
  });
  state.dashboard = response.dashboard;
  recordAuditEvent({
    type: "member",
    actor: formValue(portalOnboardingForm, "displayName"),
    division: "Houston HQ",
    title: "Onboarding completed",
    description: "Invite accepted and member payout identities attached.",
    metadata: {
      inviteToken: "accepted",
    },
    exportable: true,
  });
  await refreshAll();
  setStatus("Onboarding complete.", "success");
}

async function saveMember(): Promise<void> {
  await peerApi.saveOrgMember(
    {
      memberId: formValue(portalMemberForm, "memberId"),
      displayName: formValue(portalMemberForm, "displayName"),
      email: formValue(portalMemberForm, "email"),
      state: formValue(portalMemberForm, "state"),
      role: formValue(portalMemberForm, "role"),
      password: formValue(portalMemberForm, "password") || undefined,
      venmo: formValue(portalMemberForm, "venmo") || null,
      cashapp: formValue(portalMemberForm, "cashapp") || null,
      paypal: formValue(portalMemberForm, "paypal") || null,
      leaderForRegion: mustElement<HTMLInputElement>('[name="leaderForRegion"]', portalMemberForm).checked,
      canExecutePeerTransactions: mustElement<HTMLInputElement>('[name="canExecutePeerTransactions"]', portalMemberForm).checked,
    },
    authHeaders(),
  );
  recordAuditEvent({
    type: "member",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Member saved",
    description: `Member ${formValue(portalMemberForm, "memberId")} updated.`,
    metadata: {
      memberId: formValue(portalMemberForm, "memberId"),
    },
    exportable: true,
  });
  await refreshAll();
  setStatus("Member saved.", "success");
}

async function addFundsEntry(): Promise<void> {
  await peerApi.createFundsEntry(
    {
      memberId: formValue(portalFundsForm, "memberId"),
      type: formValue(portalFundsForm, "type"),
      amountUsdCents: Number(formValue(portalFundsForm, "amountUsdCents")),
      note: formValue(portalFundsForm, "note"),
    },
    authHeaders(),
  );
  recordAuditEvent({
    type: "system",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Funds entry added",
    description: `Funds entry created for ${formValue(portalFundsForm, "memberId")}.`,
    metadata: {
      memberId: formValue(portalFundsForm, "memberId"),
      amountUsdCents: formValue(portalFundsForm, "amountUsdCents"),
    },
    exportable: true,
  });
  await refreshAll();
  setStatus("Funds entry added.", "success");
}

async function requestApproval(type: "funds_entry" | "peer_access"): Promise<void> {
  const member = getMember(state.selectedMemberId) ?? filteredMembers()[0];
  if (!member) {
    throw new Error("Select a member first.");
  }
  await peerApi.createApproval(
    {
      type,
      memberId: member.memberId,
      note: type === "funds_entry" ? "Manual funds adjustment requires approval." : "Grant Peer execution access.",
      payload:
        type === "funds_entry"
          ? { amountUsdCents: 25000, type: "credit" }
          : { canExecutePeerTransactions: true },
    },
    authHeaders(),
  );
  recordAuditEvent({
    type: "approval",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Approval requested",
    description: `${type} requested for ${member.memberId}`,
    metadata: {
      memberId: member.memberId,
      type,
    },
    exportable: true,
  });
  await refreshAll();
  setStatus("Approval request created.", "success");
}

async function actOnApproval(approvalId: string, action: "approved" | "rejected"): Promise<void> {
  await peerApi.actionApproval(approvalId, action, authHeaders());
  recordAuditEvent({
    type: "approval",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: `Approval ${action}`,
    description: `${approvalId} marked ${action}.`,
    metadata: {
      approvalId,
      action,
    },
    exportable: true,
  });
  await refreshAll();
  setStatus(`Approval ${action}.`, "success");
}

async function grantPeerAccessFromDrawer(): Promise<void> {
  const member = getMember(state.selectedMemberId);
  if (!member) {
    throw new Error("Select a member first.");
  }

  if (hasAccess("member:write")) {
    await peerApi.saveOrgMember(
      {
        memberId: member.memberId,
        displayName: member.displayName,
        email: member.email,
        state: member.state,
        role: member.role,
        leaderForRegion: member.leaderForRegion,
        canExecutePeerTransactions: true,
        venmo: member.venmo ?? null,
        cashapp: member.cashapp ?? null,
        paypal: member.paypal ?? null,
      },
      authHeaders(),
    );
    recordAuditEvent({
      type: "member",
      actor: state.sessionMember?.memberId ?? "unknown",
      division: "Houston HQ",
      title: "Peer access granted",
      description: `${member.memberId} can now initiate Peer SDK actions.`,
      metadata: {
        memberId: member.memberId,
      },
      exportable: true,
    });
  } else {
    await requestApproval("peer_access");
  }

  await refreshAll();
  setStatus("Peer access workflow completed.", "success");
}

async function requestComplianceReview(): Promise<void> {
  const member = getMember(state.selectedMemberId);
  if (!member) {
    return;
  }

  const response = await peerApi.createComplianceCase(
    {
      memberId: member.memberId,
      division: "Houston HQ",
      severity: "medium",
      category: "Operational",
      summary: `Manual compliance review requested for ${member.memberId}.`,
    },
    authHeaders(),
  );
  state.compliance = response.dashboard;
  recordAuditEvent({
    type: "compliance",
    actor: state.sessionMember?.memberId ?? "unknown",
    division: "Houston HQ",
    title: "Compliance review requested",
    description: `Manual review opened for ${member.memberId}.`,
    metadata: {
      memberId: member.memberId,
    },
    exportable: true,
  });
  await refreshProtectedPortalData();
  renderCompliance();
  renderAuditTimeline();
  renderSidebarSummary();
  renderMemberDrawer();
  setStatus("Compliance review requested and persisted.", "success");
}

function bindEvents(): void {
  portalSigninForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void signInPortal().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Portal sign-in failed.", "error");
    });
  });

  mustElement<HTMLButtonElement>("#portalSignout").addEventListener("click", () => {
    void signOutPortal().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Portal sign-out failed.", "error");
    });
  });

  mustElement<HTMLButtonElement>("#portalRefresh").addEventListener("click", () => {
    void refreshAll();
  });

  portalInviteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void createInvite().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Invite creation failed.", "error");
    });
  });

  portalOnboardingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void completeOnboarding().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Onboarding failed.", "error");
    });
  });

  portalMemberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveMember().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Member save failed.", "error");
    });
  });

  portalFundsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void addFundsEntry().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Funds entry failed.", "error");
    });
  });

  mustElement<HTMLButtonElement>("#requestFundsApproval").addEventListener("click", () => {
    void requestApproval("funds_entry").catch((error) => {
      setStatus(error instanceof Error ? error.message : "Approval request failed.", "error");
    });
  });
  mustElement<HTMLButtonElement>("#requestPeerApproval").addEventListener("click", () => {
    void requestApproval("peer_access").catch((error) => {
      setStatus(error instanceof Error ? error.message : "Approval request failed.", "error");
    });
  });

  mustElement<HTMLDivElement>("#approvalFeed").addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-approval-action]");
    if (!target?.dataset.approvalAction || !target.dataset.approvalId) {
      return;
    }
    void actOnApproval(
      target.dataset.approvalId,
      target.dataset.approvalAction as "approved" | "rejected",
    ).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Approval action failed.", "error");
    });
  });

  mustElement<HTMLDivElement>("#memberDirectory").addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-member-card]");
    if (!target?.dataset.memberCard) {
      return;
    }
    state.selectedMemberId = target.dataset.memberCard;
    renderMemberDrawer();
  });

  mustElement<HTMLDivElement>("#memberDirectory").addEventListener("keydown", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-member-card]");
    if (!target?.dataset.memberCard) {
      return;
    }
    state.selectedMemberId = target.dataset.memberCard;
    renderMemberDrawer();
  });

  mustElement<HTMLButtonElement>("#closeDrawer").addEventListener("click", () => {
    state.selectedMemberId = null;
    renderMemberDrawer();
  });
  mustElement<HTMLElement>("#memberDrawer").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      state.selectedMemberId = null;
      renderMemberDrawer();
    }
  });
  mustElement<HTMLButtonElement>("#drawerGrantPeer").addEventListener("click", () => {
    void grantPeerAccessFromDrawer().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Peer access update failed.", "error");
    });
  });
  mustElement<HTMLButtonElement>("#drawerRequestReview").addEventListener("click", () => {
    void requestComplianceReview().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Compliance review request failed.", "error");
    });
  });
  mustElement<HTMLElement>("#memberDrawer").addEventListener("keydown", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      state.selectedMemberId = null;
      renderMemberDrawer();
      return;
    }
    if (keyboardEvent.key !== "Tab") {
      return;
    }
    const drawer = event.currentTarget as HTMLElement;
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute("hidden"));
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  });

  [
    "#memberSearch",
    "#regionFilter",
    "#roleFilter",
    "#approvalFilter",
    "#auditTypeFilter",
    "#auditDivisionFilter",
    "#auditActorFilter",
    "#auditDateFrom",
  ].forEach((selector) => {
    mustElement<HTMLInputElement | HTMLSelectElement>(selector).addEventListener("input", () => {
      renderDirectory();
      renderApprovalFeed();
      renderAuditTimeline();
    });
    mustElement<HTMLInputElement | HTMLSelectElement>(selector).addEventListener("change", () => {
      renderDirectory();
      renderApprovalFeed();
      renderAuditTimeline();
    });
  });
}

async function bootstrap(): Promise<void> {
  mustElement("#overviewStats").innerHTML = renderSkeleton(4);
  mustElement("#portalSessionSummary").innerHTML = renderSkeleton(3);
  mustElement("#portalComplianceSummary").innerHTML = renderSkeleton(4);
  mustElement("#approvalFeed").innerHTML = renderSkeleton(4);
  mustElement("#auditTimeline").innerHTML = renderSkeleton(4);
  bindEvents();
  await refreshAll();
  restartPolling();
}

void bootstrap().catch((error) => {
  const message = error instanceof Error ? error.message : "Portal boot failed.";
  setStatus(message, "error");
  pushToast(message, "error");
});
