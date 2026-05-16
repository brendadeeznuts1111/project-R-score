import { randomUUID } from "node:crypto";

import { Currency } from "@zkp2p/sdk";
import {
  addFundsRequestSchema,
  approvalActionRequestSchema,
  approvalCreateRequestSchema,
  complianceCaseCreateRequestSchema,
  complianceDashboardSchema,
  createPeerDepositRequestSchema,
  depositPreviewRequestSchema,
  executionContextRequestSchema,
  fundsEntryRequestSchema,
  inviteAcceptRequestSchema,
  inviteCreateRequestSchema,
  listPeerDepositsQuerySchema,
  orgMemberRequestSchema,
  settingsUpdateRequestSchema,
  setAcceptingRequestSchema,
  signInRequestSchema,
  teamPayoutRequestSchema,
  withdrawDepositRequestSchema,
} from "./types/schemas";
import {
  buildPeerTeamPayouts,
  getNormalizedTeamMemberOrThrow,
  hasAnySupportedPayoutMethod,
  type TeamPayoutInput,
} from "./peer-team-payouts";
import { buildDemoCreateDepositPayload } from "./peer-create-deposit";
import { buildPeerExecutionContext } from "./peer-execution-context";
import {
  buildOrgMemberRecord,
  getPermissionsForRole,
  getRegionFromState,
  hasPermission,
  summarizeOrg,
  type ApprovalRequest,
  type FundsLedgerEntry,
  type InviteRecord,
  type OrgMemberRecord,
  type Permission,
} from "./org-model";
import {
  addFundsToPeerDeposit,
  createPeerDepositRecord,
  getPeerDepositRecord,
  listPeerDepositRecords,
  setPeerDepositAccepting,
  withdrawPeerDeposit,
} from "./peer-deposit-store";
import { clearSessionCookie, createSession, authTokenFromRequest, setSessionCookie } from "./server-auth";
import { serverConfig } from "./server-config";
import { AuthenticationError, AuthorizationError, HttpError, RateLimitError, errorResponse } from "./server-errors";
import {
  fetchPolymarketMarkets,
  getCurrentOdds,
  getOddsHistory,
  getPatternSummary,
  parseSport,
  refreshOdds,
  SPORTS,
} from "./sports-odds";
import {
  appendAuditEvent,
  clearAuthFailure,
  findSessionByToken,
  mutateStoredOrgData,
  purgeExpiredSessions,
  readAuditEvents,
  readComplianceDashboard,
  readSettingsState,
  readStoredOrgData,
  readAuthFailure,
  writeAuthFailure,
  writeComplianceDashboard,
  writeSettingsState,
  isStoreReady,
} from "./store";

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function getStaticMime(pathname: string): string {
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/html; charset=utf-8";
}

async function serveStatic(pathname: string): Promise<Response> {
  const resolved = pathname === "/" ? "/portal.html" : pathname;
  const file = Bun.file(`${process.cwd()}/public${resolved}`);
  if (!(await file.exists())) return notFound();

  return new Response(file, {
    headers: {
      "Content-Type": getStaticMime(resolved),
    },
  });
}

async function buildClientBundle(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [
      `${process.cwd()}/src/client.ts`,
      `${process.cwd()}/src/portal.ts`,
    ],
    outdir: `${process.cwd()}/public`,
    naming: {
      entry: "[name].js",
    },
    target: "browser",
    format: "esm",
    sourcemap: "inline",
    minify: false,
  });

  if (!result.success) {
    const logs = await Promise.all(result.logs.map((log) => log.message));
    throw new Error(`Failed to build browser bundle:\n${logs.join("\n")}`);
  }
}

function publicMember(member: OrgMemberRecord) {
  const { passwordHash: _passwordHash, ...rest } = member;
  return rest;
}

function toTeamPayoutInput(member: OrgMemberRecord): TeamPayoutInput {
  return {
    memberId: member.memberId,
    displayName: member.displayName,
    venmo: member.venmo ?? null,
    cashapp: member.cashapp ?? null,
    paypal: member.paypal ?? null,
  };
}

function payoutEligibleMembers(members: OrgMemberRecord[]): OrgMemberRecord[] {
  return members.filter((member) => hasAnySupportedPayoutMethod(member));
}

function memberToAppRole(member: Pick<OrgMemberRecord, "role" | "canExecutePeerTransactions">): "Operator" | "Admin" | "Compliance" | "Viewer" {
  if (member.role === "admin") return "Admin";
  if (member.role === "finance") return "Compliance";
  if (member.canExecutePeerTransactions || member.role === "regional_lead") return "Operator";
  return "Viewer";
}

function memberToDivision(member: Pick<OrgMemberRecord, "region">): "Houston HQ" | "Downtown" | "Energy Corridor" | "The Heights" | "Remote Ops" {
  switch (member.region) {
    case "west":
      return "Downtown";
    case "midwest":
      return "Energy Corridor";
    case "northeast":
      return "Remote Ops";
    case "south":
    default:
      return "Houston HQ";
  }
}

async function logAudit(partial: {
  type: "auth" | "member" | "approval" | "deposit" | "settings" | "compliance" | "system";
  actor?: OrgMemberRecord | null;
  title: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  const actor = partial.actor ?? null;
  await appendAuditEvent({
    id: randomUUID(),
    type: partial.type,
    actor: actor?.memberId ?? "system",
    role: actor ? memberToAppRole(actor) : "Admin",
    division: actor ? memberToDivision(actor) : "Houston HQ",
    timestamp: new Date().toISOString(),
    title: partial.title,
    description: partial.description,
    metadata: partial.metadata ?? {},
    exportable: true,
  });
}

async function getSessionMember(request: Request): Promise<OrgMemberRecord | null> {
  const token = authTokenFromRequest(request);
  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;
  const stored = await purgeExpiredSessions();
  return stored.members.find((member) => member.memberId === session.memberId) ?? null;
}

async function requirePermission(
  request: Request,
  permission: Permission,
  targetRegion?: ReturnType<typeof getRegionFromState>,
): Promise<OrgMemberRecord> {
  const member = await getSessionMember(request);
  if (!member) {
    throw new AuthenticationError("Sign in first.");
  }
  if (!hasPermission(member, permission, targetRegion)) {
    throw new AuthorizationError("You do not have permission for this action.");
  }
  return member;
}

function getDashboardData(stored: Awaited<ReturnType<typeof readStoredOrgData>>) {
  return {
    updatedAt: stored.updatedAt,
    summary: summarizeOrg(stored.members, stored.fundsEntries),
    invites: stored.invites,
    approvals: stored.approvals,
    peerModel: {
      appAuth:
        "Each teammate signs into this app individually. Internal permissions decide who can manage members and initiate Peer actions.",
      depositOwnership:
        "Peer deposits are owned by the connected wallet used for execution, not by a shared team account.",
      payoutOwnership:
        "Member payout methods are validated payout destinations only. They are not OAuth-linked app accounts inside Peer.",
      onramp:
        "The Peer browser extension is an optional buyer-side surface and remains separate from team offramp operations.",
    },
  };
}

async function getTeamSummary() {
  const stored = await readStoredOrgData();
  const eligibleMembers = payoutEligibleMembers(stored.members);
  if (eligibleMembers.length === 0) {
    return {
      updatedAt: stored.updatedAt,
      team: [],
      model: {
        description:
          "This list contains payout-ready org members with at least one validated Peer payout destination.",
        ownership:
          "These payout methods belong to the selected member. They are not shared Peer app accounts.",
      },
    };
  }

  const normalized = buildPeerTeamPayouts(eligibleMembers.map(toTeamPayoutInput));
  return {
    updatedAt: stored.updatedAt,
    team: normalized.members,
    model: {
      description:
        "This list contains payout-ready org members with at least one validated Peer payout destination.",
      ownership:
        "These payout methods belong to the selected member. They are not shared Peer app accounts.",
    },
  };
}

async function enforceSignInRateLimit(memberId: string): Promise<void> {
  const failure = await readAuthFailure(memberId);
  if (!failure?.lockedUntil) return;

  const lockedUntilMs = new Date(failure.lockedUntil).getTime();
  if (lockedUntilMs <= Date.now()) {
    await clearAuthFailure(memberId);
    return;
  }

  throw new RateLimitError(
    "Too many failed sign-in attempts. Try again later.",
    Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 1000)),
  );
}

async function recordFailedSignIn(memberId: string): Promise<void> {
  const existing = await readAuthFailure(memberId);
  const now = new Date();
  const nowIso = now.toISOString();
  const lastAttemptMs = existing ? new Date(existing.lastAttemptAt).getTime() : 0;
  const withinWindow = existing && Date.now() - lastAttemptMs <= serverConfig.signinWindowMs;
  const attempts = withinWindow ? existing.attempts + 1 : 1;
  const lockedUntil =
    attempts >= serverConfig.signinMaxAttempts
      ? new Date(Date.now() + serverConfig.signinLockoutMs).toISOString()
      : null;

  await writeAuthFailure({
    memberId,
    attempts,
    lastAttemptAt: nowIso,
    lockedUntil,
  });
}

function requestQuery(url: URL): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    output[key] = value;
  }
  return output;
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
      if (request.method === "GET" && url.pathname === "/healthz") {
        return json({ ok: true, service: "peer-ops" });
      }

      if (request.method === "GET" && url.pathname === "/readyz") {
        return json({ ok: await isStoreReady() });
      }

      if (request.method === "GET" && url.pathname === "/api/team") {
        return json(await getTeamSummary());
      }

      if (request.method === "GET" && url.pathname === "/api/odds/sports") {
        return json({
          sports: Object.entries(SPORTS).map(([key, value]) => ({
            key,
            label: value.label,
            oddsApiKey: value.oddsApiKey,
          })),
          refresh: {
            defaultIntervalMs: 60_000,
            minimumIntervalMs: 30_000,
            allSportsIntervalMs: 300_000,
          },
          liveConfigured: Boolean(serverConfig.oddsApiKey),
        });
      }

      if (request.method === "GET" && url.pathname === "/api/odds/current") {
        return json(await getCurrentOdds(parseSport(url.searchParams.get("sport"))));
      }

      if (request.method === "POST" && url.pathname === "/api/odds/refresh") {
        return json(await refreshOdds(parseSport(url.searchParams.get("sport"))));
      }

      if (request.method === "GET" && url.pathname === "/api/odds/history") {
        const eventId = url.searchParams.get("eventId");
        if (!eventId) {
          throw new HttpError(400, "eventId is required.", "event_id_required");
        }
        return json(await getOddsHistory(eventId, url.searchParams.get("date") ?? undefined));
      }

      if (request.method === "GET" && url.pathname === "/api/odds/patterns") {
        return json(await getPatternSummary(parseSport(url.searchParams.get("sport")), url.searchParams.get("date") ?? undefined));
      }

      if (request.method === "GET" && url.pathname === "/api/odds/polymarket") {
        return json({ markets: await fetchPolymarketMarkets() });
      }

      if (request.method === "POST" && url.pathname === "/api/team") {
        const payload = teamPayoutRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const existing = stored.members.find((member) => member.memberId === payload.memberId);
        const hasBootstrapAdmin = stored.members.some(
          (member) => member.role === "admin" && Boolean(member.passwordHash),
        );
        const targetRegion = getRegionFromState(existing?.state ?? "TX");
        if (stored.members.length > 0 && hasBootstrapAdmin) {
          await requirePermission(request, "team:write", targetRegion);
        }

        const nextMember = await buildOrgMemberRecord(
          {
            ...payload,
            email: existing?.email ?? `${payload.memberId}@local.peer.demo`,
            state: existing?.state ?? "TX",
            role: existing?.role ?? "member",
            leaderForRegion: existing?.leaderForRegion ?? false,
            canExecutePeerTransactions: existing?.canExecutePeerTransactions ?? false,
          },
          existing?.passwordHash,
        );

        await mutateStoredOrgData((current) => {
          const currentExisting = current.members.find((member) => member.memberId === payload.memberId);
          const nextMembers = currentExisting
            ? current.members.map((member) =>
                member.memberId === nextMember.memberId
                  ? { ...nextMember, createdAt: currentExisting.createdAt, updatedAt: new Date().toISOString() }
                  : member,
              )
            : [...current.members, nextMember];
          return { ...current, members: nextMembers };
        });

        return json(await getTeamSummary(), { status: 201 });
      }

      if (request.method === "DELETE" && url.pathname.startsWith("/api/team/")) {
        const memberId = decodeURIComponent(url.pathname.replace("/api/team/", ""));
        const stored = await readStoredOrgData();
        const existing = stored.members.find((member) => member.memberId === memberId);
        const hasBootstrapAdmin = stored.members.some(
          (member) => member.role === "admin" && Boolean(member.passwordHash),
        );
        if (existing && hasBootstrapAdmin) {
          await requirePermission(request, "team:delete", existing.region);
        }

        await mutateStoredOrgData((current) => ({
          ...current,
          members: current.members.filter((member) => member.memberId !== memberId),
          fundsEntries: current.fundsEntries.filter((entry) => entry.memberId !== memberId),
          sessions: current.sessions.filter((session) => session.memberId !== memberId),
        }));
        return json(await getTeamSummary());
      }

      if (request.method === "GET" && (url.pathname === "/api/org" || url.pathname === "/api/org/dashboard")) {
        const stored = await readStoredOrgData();
        return json(getDashboardData(stored));
      }

      if (request.method === "POST" && url.pathname === "/api/org/members") {
        const payload = orgMemberRequestSchema.parse(await request.json());
        const targetRegion = getRegionFromState(payload.state);
        const stored = await readStoredOrgData();
        const hasBootstrapAdmin = stored.members.some(
          (member) => member.role === "admin" && Boolean(member.passwordHash),
        );
        if (stored.members.length > 0 && hasBootstrapAdmin) {
          await requirePermission(request, "team:write", targetRegion);
        }

        const existing = stored.members.find((member) => member.memberId === payload.memberId);
        const nextMember = await buildOrgMemberRecord(payload, existing?.passwordHash);
        await mutateStoredOrgData((current) => {
          const currentExisting = current.members.find((member) => member.memberId === payload.memberId);
          const mergedMember = currentExisting
            ? { ...nextMember, createdAt: currentExisting.createdAt, updatedAt: new Date().toISOString() }
            : nextMember;
          const nextMembers = currentExisting
            ? current.members.map((member) => (member.memberId === mergedMember.memberId ? mergedMember : member))
            : [...current.members, mergedMember];
          return { ...current, members: nextMembers };
        });

        const next = await readStoredOrgData();
        return json({ summary: summarizeOrg(next.members, next.fundsEntries) }, { status: 201 });
      }

      if (request.method === "POST" && url.pathname === "/api/invites") {
        const actor = await requirePermission(request, "invites:manage");
        const payload = inviteCreateRequestSchema.parse(await request.json());
        const invite: InviteRecord = {
          inviteId: randomUUID(),
          email: payload.email.trim().toLowerCase(),
          memberId: payload.memberId.trim(),
          role: payload.role,
          state: payload.state.trim().toUpperCase(),
          region: getRegionFromState(payload.state),
          leaderForRegion: Boolean(payload.leaderForRegion),
          canExecutePeerTransactions: Boolean(payload.canExecutePeerTransactions),
          invitedBy: actor.memberId,
          inviteToken: randomUUID(),
          tokenExpiresAt: new Date(Date.now() + serverConfig.inviteTtlMs).toISOString(),
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        const next = await mutateStoredOrgData((current) => ({
          ...current,
          invites: [
            invite,
            ...current.invites.filter((item) => item.email !== invite.email || item.status !== "pending"),
          ],
        }));

        await logAudit({
          type: "auth",
          actor,
          title: "Invite created",
          description: `Created invite for ${invite.memberId}.`,
          metadata: { inviteId: invite.inviteId, email: invite.email },
        });

        return json({ invite, dashboard: getDashboardData(next) }, { status: 201 });
      }

      if (request.method === "POST" && url.pathname === "/api/invites/accept") {
        const payload = inviteAcceptRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const invite = stored.invites.find((item) => item.inviteToken === payload.inviteToken && item.status === "pending");
        if (!invite) {
          throw new HttpError(404, "Invite is invalid or no longer pending.", "invite_not_found");
        }
        if (invite.tokenExpiresAt && new Date(invite.tokenExpiresAt).getTime() <= Date.now()) {
          throw new HttpError(410, "Invite has expired.", "invite_expired");
        }

        const existing = stored.members.find((member) => member.memberId === invite.memberId);
        const member = await buildOrgMemberRecord(
          {
            memberId: invite.memberId,
            displayName: payload.displayName,
            email: invite.email,
            state: invite.state,
            role: invite.role,
            leaderForRegion: invite.leaderForRegion,
            canExecutePeerTransactions: invite.canExecutePeerTransactions,
            password: payload.password,
            venmo: payload.venmo ?? null,
            cashapp: payload.cashapp ?? null,
            paypal: payload.paypal ?? null,
          },
          existing?.passwordHash,
        );

        const next = await mutateStoredOrgData((current) => ({
          ...current,
          members: current.members.some((item) => item.memberId === member.memberId)
            ? current.members.map((item) =>
                item.memberId === member.memberId ? { ...member, createdAt: item.createdAt } : item,
              )
            : [...current.members, member],
          invites: current.invites.map((item) =>
            item.inviteId === invite.inviteId
              ? { ...item, status: "accepted" as const, acceptedAt: new Date().toISOString() }
              : item,
          ),
        }));

        await logAudit({
          type: "auth",
          actor: member,
          title: "Invite accepted",
          description: `Accepted invite for ${member.memberId}.`,
          metadata: { inviteId: invite.inviteId },
        });

        return json({ dashboard: getDashboardData(next) }, { status: 201 });
      }

      if (request.method === "POST" && url.pathname === "/api/auth/signin") {
        const payload = signInRequestSchema.parse(await request.json());
        await enforceSignInRateLimit(payload.memberId);
        const stored = await purgeExpiredSessions();
        const member = stored.members.find((entry) => entry.memberId === payload.memberId);
        if (!member?.passwordHash) {
          await recordFailedSignIn(payload.memberId);
          throw new AuthenticationError("No sign-in is configured for that member.");
        }

        const valid = await Bun.password.verify(payload.password, member.passwordHash);
        if (!valid) {
          await recordFailedSignIn(payload.memberId);
          throw new AuthenticationError("Invalid sign-in credentials.");
        }

        await clearAuthFailure(payload.memberId);
        const session = createSession(member.memberId);
        await mutateStoredOrgData((current) => ({
          ...current,
          sessions: [
            ...current.sessions.filter((item) => item.memberId !== member.memberId),
            session,
          ],
        }));

        await logAudit({
          type: "auth",
          actor: member,
          title: "Signed in",
          description: `${member.memberId} signed in.`,
        });

        return json(
          {
            session: {
              memberId: member.memberId,
              expiresAt: session.expiresAt,
              member: publicMember(member),
              permissions: getPermissionsForRole(member.role, member.canExecutePeerTransactions),
              appRole: memberToAppRole(member),
            },
          },
          {
            headers: {
              "Set-Cookie": setSessionCookie(session),
            },
          },
        );
      }

      if (request.method === "POST" && url.pathname === "/api/auth/signout") {
        const member = await getSessionMember(request);
        const token = authTokenFromRequest(request);
        if (token) {
          await mutateStoredOrgData((current) => ({
            ...current,
            sessions: current.sessions.filter((session) => session.token !== token),
          }));
        }

        if (member) {
          await logAudit({
            type: "auth",
            actor: member,
            title: "Signed out",
            description: `${member.memberId} signed out.`,
          });
        }

        return json(
          { ok: true },
          {
            headers: {
              "Set-Cookie": clearSessionCookie(),
            },
          },
        );
      }

      if (request.method === "GET" && url.pathname === "/api/auth/session") {
        const member = await getSessionMember(request);
        const token = authTokenFromRequest(request);
        const session = token ? await findSessionByToken(token) : null;
        return json({
          member: member ? publicMember(member) : null,
          permissions: member ? summarizeOrg([member], []).members[0]?.permissions ?? [] : [],
          appRole: member ? memberToAppRole(member) : "Viewer",
          expiresAt: session?.expiresAt ?? null,
        });
      }

      if (request.method === "POST" && url.pathname === "/api/funds/entries") {
        const payload = fundsEntryRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const member = stored.members.find((entry) => entry.memberId === payload.memberId);
        if (!member) {
          throw new HttpError(404, `No member found for "${payload.memberId}".`, "member_not_found");
        }
        const actor = await requirePermission(request, "funds:write", member.region);

        const entry: FundsLedgerEntry = {
          entryId: randomUUID(),
          memberId: payload.memberId,
          amountUsdCents: payload.amountUsdCents,
          type: payload.type,
          note: payload.note,
          createdAt: new Date().toISOString(),
          createdBy: actor.memberId,
        };

        const next = await mutateStoredOrgData((current) => ({
          ...current,
          fundsEntries: [entry, ...current.fundsEntries],
        }));

        await logAudit({
          type: "approval",
          actor,
          title: "Funds entry recorded",
          description: `${payload.type} for ${payload.memberId}.`,
          metadata: { memberId: payload.memberId, amountUsdCents: String(payload.amountUsdCents) },
        });

        return json({ summary: summarizeOrg(next.members, next.fundsEntries) }, { status: 201 });
      }

      if (request.method === "POST" && url.pathname === "/api/approvals") {
        const actor = await requirePermission(request, "team:read");
        const payload = approvalCreateRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const member = stored.members.find((entry) => entry.memberId === payload.memberId);
        if (!member) {
          throw new HttpError(404, `No member found for "${payload.memberId}".`, "member_not_found");
        }

        const approval: ApprovalRequest = {
          approvalId: randomUUID(),
          type: payload.type,
          memberId: payload.memberId,
          region: member.region,
          requestedBy: actor.memberId,
          status: "pending",
          createdAt: new Date().toISOString(),
          note: payload.note,
          payload: payload.payload,
        };

        const next = await mutateStoredOrgData((current) => ({
          ...current,
          approvals: [approval, ...current.approvals],
        }));

        await logAudit({
          type: "approval",
          actor,
          title: "Approval requested",
          description: `${payload.type} approval requested for ${payload.memberId}.`,
          metadata: { approvalId: approval.approvalId },
        });

        return json({ approval, dashboard: getDashboardData(next) }, { status: 201 });
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/approvals/") && url.pathname.endsWith("/action")) {
        const approvalId = decodeURIComponent(url.pathname.replace("/api/approvals/", "").replace(/\/action$/, ""));
        const actor = await requirePermission(request, "approvals:manage");
        const payload = approvalActionRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const approval = stored.approvals.find((item) => item.approvalId === approvalId);
        if (!approval) {
          throw new HttpError(404, "Approval request not found.", "approval_not_found");
        }
        if (approval.status !== "pending") {
          throw new HttpError(409, "Approval request is no longer pending.", "approval_not_pending");
        }

        const next = await mutateStoredOrgData((current) => {
          let result = {
            ...current,
            approvals: current.approvals.map((item) =>
              item.approvalId === approvalId
                ? { ...item, status: payload.action, actedAt: new Date().toISOString(), actedBy: actor.memberId }
                : item,
            ),
          };

          if (payload.action === "approved" && approval.type === "funds_entry") {
            const entry: FundsLedgerEntry = {
              entryId: randomUUID(),
              memberId: approval.memberId,
              amountUsdCents: Number(approval.payload.amountUsdCents ?? 0),
              type: String(approval.payload.type) === "debit" ? "debit" : "credit",
              note: approval.note,
              createdAt: new Date().toISOString(),
              createdBy: actor.memberId,
            };
            result = { ...result, fundsEntries: [entry, ...result.fundsEntries] };
          }

          if (payload.action === "approved" && approval.type === "peer_access") {
            result = {
              ...result,
              members: result.members.map((member) =>
                member.memberId === approval.memberId
                  ? {
                      ...member,
                      canExecutePeerTransactions: true,
                      updatedAt: new Date().toISOString(),
                    }
                  : member,
              ),
            };
          }

          return result;
        });

        await logAudit({
          type: "approval",
          actor,
          title: `Approval ${payload.action}`,
          description: `${approvalId} marked ${payload.action}.`,
          metadata: { approvalId },
        });

        return json({ dashboard: getDashboardData(next) });
      }

      if (request.method === "GET" && url.pathname === "/api/peer/currencies") {
        return json({ options: Object.values(Currency) });
      }

      if (request.method === "POST" && url.pathname === "/api/peer/execution-context") {
        const actor = await requirePermission(request, "peer:execute");
        const payload = executionContextRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const eligibleMembers = payoutEligibleMembers(stored.members);
        if (eligibleMembers.length === 0) {
          throw new HttpError(409, "No payout-ready team members exist yet. Add at least one validated payout identity first.", "no_payout_ready_members");
        }
        const normalized = buildPeerTeamPayouts(eligibleMembers.map(toTeamPayoutInput));
        const payoutOwner = getNormalizedTeamMemberOrThrow(normalized, payload.memberId);

        return json({
          context: buildPeerExecutionContext({
            signedInMember: actor,
            permissions: getPermissionsForRole(actor.role, actor.canExecutePeerTransactions),
            payoutOwner,
            connectedWalletAddress: payload.connectedWalletAddress ?? null,
          }),
        });
      }

      if (request.method === "POST" && url.pathname === "/api/peer/create-deposit-preview") {
        await requirePermission(request, "peer:execute");
        const previewRequest = depositPreviewRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const eligibleMembers = payoutEligibleMembers(stored.members);
        if (eligibleMembers.length === 0) {
          throw new HttpError(409, "Add a payout-ready team member before generating a Peer deposit preview.", "no_payout_ready_members");
        }

        const normalized = buildPeerTeamPayouts(eligibleMembers.map(toTeamPayoutInput));
        const payload = buildDemoCreateDepositPayload(normalized, {
          memberId: previewRequest.memberId,
          token: previewRequest.token as `0x${string}`,
          amount: previewRequest.amount,
          minIntentAmount: previewRequest.minIntentAmount,
          maxIntentAmount: previewRequest.maxIntentAmount,
          conversionRates: [
            {
              currency: previewRequest.currency,
              conversionRate: previewRequest.conversionRate,
            },
          ],
        });

        return json({ payload });
      }

      if (request.method === "POST" && url.pathname === "/api/peer/deposits/preview") {
        await requirePermission(request, "peer:execute");
        const previewRequest = depositPreviewRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const eligibleMembers = payoutEligibleMembers(stored.members);
        if (eligibleMembers.length === 0) {
          throw new HttpError(409, "Add a payout-ready team member before generating a Peer deposit preview.", "no_payout_ready_members");
        }

        const normalized = buildPeerTeamPayouts(eligibleMembers.map(toTeamPayoutInput));
        const payload = buildDemoCreateDepositPayload(normalized, {
          memberId: previewRequest.memberId,
          token: previewRequest.token as `0x${string}`,
          amount: previewRequest.amount,
          minIntentAmount: previewRequest.minIntentAmount,
          maxIntentAmount: previewRequest.maxIntentAmount,
          conversionRates: [
            {
              currency: previewRequest.currency,
              conversionRate: previewRequest.conversionRate,
            },
          ],
        });

        return json({ payload });
      }

      if (request.method === "POST" && url.pathname === "/api/peer/deposits") {
        const actor = await requirePermission(request, "peer:execute");
        const payload = createPeerDepositRequestSchema.parse(await request.json());
        const stored = await readStoredOrgData();
        const payoutOwner = stored.members.find((member) => member.memberId === payload.memberId);
        if (!payoutOwner) {
          throw new HttpError(404, `No member found for "${payload.memberId}".`, "member_not_found");
        }

        const deposit = await createPeerDepositRecord({
          actorMemberId: actor.memberId,
          memberName: payoutOwner.displayName,
          request: payload,
        });

        await logAudit({
          type: "deposit",
          actor,
          title: "Peer deposit created",
          description: `Created deposit ${deposit.recordId} for ${payload.memberId}.`,
          metadata: { recordId: deposit.recordId },
        });

        return json({ deposit, action: { type: "create", accepted: true } }, { status: 201 });
      }

      if (request.method === "GET" && url.pathname === "/api/peer/deposits") {
        await requirePermission(request, "team:read");
        const query = listPeerDepositsQuerySchema.parse(requestQuery(url));
        return json(await listPeerDepositRecords(query));
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/peer/deposits/")) {
        const suffix = url.pathname.replace("/api/peer/deposits/", "");
        if (!suffix.includes("/")) {
          await requirePermission(request, "team:read");
          return json({ deposit: await getPeerDepositRecord(decodeURIComponent(suffix)) });
        }
      }

      if (request.method === "POST" && url.pathname.endsWith("/add-funds")) {
        const recordId = decodeURIComponent(url.pathname.replace("/api/peer/deposits/", "").replace(/\/add-funds$/, ""));
        const actor = await requirePermission(request, "peer:execute");
        const payload = addFundsRequestSchema.parse(await request.json());
        const deposit = await addFundsToPeerDeposit({
          recordId,
          actorMemberId: actor.memberId,
          amount: payload.amount,
          transactionHash: payload.transactionHash ?? null,
        });
        await logAudit({
          type: "deposit",
          actor,
          title: "Peer deposit funded",
          description: `Added funds to deposit ${recordId}.`,
          metadata: { recordId, amount: payload.amount },
        });
        return json({ deposit, action: { type: "add_funds", accepted: true } });
      }

      if (request.method === "POST" && url.pathname.endsWith("/set-accepting")) {
        const recordId = decodeURIComponent(url.pathname.replace("/api/peer/deposits/", "").replace(/\/set-accepting$/, ""));
        const actor = await requirePermission(request, "peer:execute");
        const payload = setAcceptingRequestSchema.parse(await request.json());
        const deposit = await setPeerDepositAccepting({
          recordId,
          actorMemberId: actor.memberId,
          accepting: payload.accepting,
          transactionHash: payload.transactionHash ?? null,
        });
        await logAudit({
          type: "deposit",
          actor,
          title: payload.accepting ? "Peer deposit activated" : "Peer deposit paused",
          description: `${payload.accepting ? "Enabled" : "Disabled"} intent acceptance for ${recordId}.`,
          metadata: { recordId, accepting: String(payload.accepting) },
        });
        return json({ deposit, action: { type: "set_accepting", accepted: true } });
      }

      if (request.method === "POST" && url.pathname.endsWith("/withdraw")) {
        const recordId = decodeURIComponent(url.pathname.replace("/api/peer/deposits/", "").replace(/\/withdraw$/, ""));
        const actor = await requirePermission(request, "peer:execute");
        const payload = withdrawDepositRequestSchema.parse(await request.json());
        const deposit = await withdrawPeerDeposit({
          recordId,
          actorMemberId: actor.memberId,
          transactionHash: payload.transactionHash ?? null,
        });
        await logAudit({
          type: "deposit",
          actor,
          title: "Peer deposit withdrawn",
          description: `Withdrew deposit ${recordId}.`,
          metadata: { recordId },
        });
        return json({ deposit, action: { type: "withdraw", accepted: true } });
      }

      if (request.method === "GET" && url.pathname === "/api/peer/docs") {
        return json({
          sources: [
            "https://docs.peer.xyz/developer/offramp",
            "https://docs.peer.xyz/developer/integrate-zkp2p/integrate-redirect-onramp",
            "https://docs.peer.xyz/developer/build-payment-integration",
            "https://docs.peer.xyz/developer/sdk",
            "https://docs.peer.xyz/developer/developer/api/v3/post-intent-hooks",
            "https://github.com/zkp2p/zkills",
          ],
        });
      }

      if (request.method === "GET" && url.pathname === "/api/settings") {
        await requirePermission(request, "team:read");
        return json(await readSettingsState());
      }

      if (request.method === "PUT" && url.pathname === "/api/settings") {
        const actor = await requirePermission(request, "auth:manage");
        const payload = settingsUpdateRequestSchema.parse(await request.json());
        const result = await writeSettingsState(payload);
        await logAudit({
          type: "settings",
          actor,
          title: "Settings updated",
          description: "Updated shared enterprise settings.",
        });
        return json(result);
      }

      if (request.method === "GET" && url.pathname === "/api/compliance") {
        await requirePermission(request, "team:read");
        return json(await readComplianceDashboard());
      }

      if (request.method === "PUT" && url.pathname === "/api/compliance") {
        const actor = await requirePermission(request, "approvals:manage");
        const payload = complianceDashboardSchema.parse(await request.json());
        const result = await writeComplianceDashboard(payload);
        await logAudit({
          type: "compliance",
          actor,
          title: "Compliance state refreshed",
          description: "Persisted compliance dashboard state.",
        });
        return json(result);
      }

      if (request.method === "POST" && url.pathname === "/api/compliance/cases") {
        const actor = await requirePermission(request, "approvals:manage");
        const payload = complianceCaseCreateRequestSchema.parse(await request.json());
        const current = await readComplianceDashboard();
        const nextCase = {
          id: randomUUID(),
          memberId: payload.memberId,
          division: payload.division,
          severity: payload.severity,
          category: payload.category,
          status: "open" as const,
          owner: "compliance-desk",
          summary: payload.summary,
          lastUpdatedAt: new Date().toISOString(),
        };
        const result = await writeComplianceDashboard({
          ...current.dashboard,
          openAlerts: current.dashboard.openAlerts + 1,
          cases: [nextCase, ...current.dashboard.cases],
        });
        await logAudit({
          type: "compliance",
          actor,
          title: "Compliance case opened",
          description: `Opened compliance case for ${payload.memberId}.`,
          metadata: { memberId: payload.memberId, caseId: nextCase.id, category: payload.category },
        });
        return json(result, { status: 201 });
      }

      if (request.method === "GET" && (url.pathname === "/api/audit" || url.pathname === "/api/audit/events")) {
        await requirePermission(request, "team:read");
        return json(await readAuditEvents({
          type: url.searchParams.get("type") ?? undefined,
          division: url.searchParams.get("division") ?? undefined,
          actor: url.searchParams.get("actor") ?? undefined,
          dateFrom: url.searchParams.get("dateFrom") ?? undefined,
        }));
      }

    return await serveStatic(url.pathname);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function startServer() {
  if (serverConfig.shouldBuildOnStart) {
    await buildClientBundle();
  }

  return Bun.serve({
    port: serverConfig.port,
    fetch: handleRequest,
  });
}

if (import.meta.main) {
  const server = await startServer();
  console.log(`Peer ops running at http://localhost:${server.port}`);
}
