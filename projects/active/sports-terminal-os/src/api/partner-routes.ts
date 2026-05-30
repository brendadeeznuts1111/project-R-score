/**
 * Partner Profile OS — REST API Routes (21 Endpoints)
 *
 * Base: /api/partners, /api/signals, /api/templates
 * Auth: JWT (reads), JWT + Admin (mutations)
 * Rate Limit: standard (reads), admin (mutations), signal (routing)
 */

import type { SignalContext, GateResult, LifecycleState } from "../zones/partner-profile";
import {
  partnerProfileService,
  processSignal,
  processSignalRoute,
  processSignalBatch,
  getTemplate,
  loadAndCacheTemplates,
  listTemplateIds,
  transitionByEvent,
  startTemplateWatcher,
  reloadTemplates,
  authorizeSource,
  healthCheckSources,
  getSourceStatus,
  getCommissionTiers,
  getCommissionRate,
  processSettlement,
  autoCreateTelegramGroups,
  type BetResult,
} from "../zones/partner-profile";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function partnerRoutes(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;

  // ── Partner Profiles ──

  if (url.pathname === "/api/partners" && method === "GET") {
    return handleListPartners(url);
  }

  if (url.pathname === "/api/partners" && method === "POST") {
    return handleCreatePartner(req);
  }

  // /api/partners/:id
  const partnerMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)$/);
  if (partnerMatch && method === "GET") {
    return handleGetPartner(partnerMatch[1]!);
  }
  if (partnerMatch && method === "PUT") {
    return handleUpdatePartner(req, partnerMatch[1]!);
  }
  if (partnerMatch && method === "DELETE") {
    return handleDeletePartner(partnerMatch[1]!);
  }

  // /api/partners/:id/evaluate
  const evalMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/evaluate$/);
  if (evalMatch && method === "POST") {
    return handleEvaluate(req, evalMatch[1]!);
  }

  // /api/partners/:id/transition
  const transMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/transition$/);
  if (transMatch && method === "POST") {
    return handleTransition(req, transMatch[1]!);
  }

  // /api/partners/:id/gate-log
  const gateLogMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/gate-log$/);
  if (gateLogMatch && method === "GET") {
    return handleGetGateLog(url, gateLogMatch[1]!);
  }

  // /api/partners/:id/lifecycle-log
  const lifecycleMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/lifecycle-log$/);
  if (lifecycleMatch && method === "GET") {
    return handleGetLifecycleLog(lifecycleMatch[1]!);
  }

  // /api/partners/:id/settlement
  const settleMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/settlement$/);
  if (settleMatch && method === "GET") {
    return handleGetSettlement(settleMatch[1]!);
  }

  // /api/partners/:id/deposit
  const depositMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/deposit$/);
  if (depositMatch && method === "POST") {
    return handleDeposit(req, depositMatch[1]!);
  }

  // /api/partners/:id/withdrawal
  const withdrawMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/withdrawal$/);
  if (withdrawMatch && method === "POST") {
    return handleWithdrawal(req, withdrawMatch[1]!);
  }

  // /api/partners/:id/set-market-limit
  const limitMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/set-market-limit$/);
  if (limitMatch && method === "POST") {
    return handleSetMarketLimit(req, limitMatch[1]!);
  }

  // /api/partners/:id/sources/health
  const srcHealthMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/sources\/health$/);
  if (srcHealthMatch && method === "GET") {
    return handleSourceHealth(srcHealthMatch[1]!);
  }

  // ── Signal Routing ──

  if (url.pathname === "/api/signals/route" && method === "POST") {
    return handleRouteSignal(req);
  }

  if (url.pathname === "/api/signals/gate-results" && method === "GET") {
    return handleGetGateResults(url);
  }

  if (url.pathname === "/api/signals/evaluate-batch" && method === "POST") {
    return handleEvaluateBatch(req);
  }

  // ── Templates ──

  if (url.pathname === "/api/templates" && method === "GET") {
    return handleListTemplates();
  }

  // /api/templates/:id
  const tmplMatch = url.pathname.match(/^\/api\/templates\/([^\/]+)$/);
  if (tmplMatch && method === "GET") {
    return handleGetTemplate(tmplMatch[1]!);
  }

  if (url.pathname === "/api/templates/reload" && method === "POST") {
    return handleReloadTemplates(req);
  }

  if (url.pathname === "/api/templates/validate" && method === "POST") {
    return handleValidateTemplate(req);
  }

  // /api/partners/:id/sources — get source status
  const srcMatch = url.pathname.match(/^\/api\/partners\/([^\/]+)\/sources$/);
  if (srcMatch && method === "GET") {
    return handleGetSources(srcMatch[1]!);
  }

  return notFound();
}

// ---------------------------------------------------------------------------
// Handlers: Partner Profiles
// ---------------------------------------------------------------------------

function handleListPartners(url: URL): Response {
  try {
    const status = url.searchParams.get("status") as LifecycleState | undefined;
    const templateId = url.searchParams.get("templateId") ?? undefined;
    const kycStatus = url.searchParams.get("kycStatus") as "pending" | "verified" | "rejected" | undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const partners = partnerProfileService.listPartners({
      status,
      templateId,
      kycStatus,
      limit,
      offset,
    });

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const p of partners) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }

    return json({ partners, total: partners.length, byStatus });
  } catch (err: any) {
    return error(err.message, 500);
  }
}

async function handleCreatePartner(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { partnerId, templateId, displayName, email, phone, overrides } = body;

    if (!partnerId || !templateId || !displayName || !email) {
      return error("Missing required fields: partnerId, templateId, displayName, email", 400, "VALIDATION_ERROR");
    }

    const gateway = partnerProfileService.createPartner(partnerId, templateId, {
      profile: { display_name: displayName, email, phone, ...overrides?.profile },
      runtime: overrides?.runtime,
    });

    // Auto-create Telegram groups (best effort)
    autoCreateTelegramGroups(partnerId).catch(() => {});

    return json({
      partnerId: gateway.profile.partner_id,
      templateId: gateway.profile.template_id,
      displayName: gateway.profile.display_name,
      email: gateway.profile.email,
      status: gateway.profile.state,
      kycStatus: gateway.runtime.kycStatus,
      currentBalance: gateway.runtime.currentBalance,
      currentLimit: gateway.runtime.currentLimit,
      dailyUsed: gateway.runtime.dailyUsed,
      createdAt: gateway.profile.created_at,
      materializedAt: gateway.profile.materialized_at,
    }, 201);
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      return error(err.message, 409, "DUPLICATE_PARTNER");
    }
    if (err.message.includes("not found")) {
      return error(err.message, 404, "TEMPLATE_NOT_FOUND");
    }
    return error(err.message, 400);
  }
}

function handleGetPartner(partnerId: string): Response {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

  const p = gateway.profile;
  const r = gateway.runtime;

  return json({
    partnerId: p.partner_id,
    templateId: p.template_id,
    displayName: p.display_name,
    email: p.email,
    phone: p.phone,
    status: p.state,
    kycStatus: r.kycStatus,
    riskLevel: r.riskLevel,
    opsecScore: r.opsecScore,
    currentBalance: r.currentBalance,
    dailyUsed: r.dailyUsed,
    totalDeposited: r.totalDeposited,
    totalWithdrawn: r.totalWithdrawn,
    totalSettledPnl: r.totalSettledPnl,
    currentLimit: r.currentLimit,
    currentLimits: r.currentLimits,
    jurisdiction: p.jurisdiction,
    sources: {
      defaults: p.sources.defaults,
      maxSources: p.sources.max_sources,
      apiAccess: p.sources.api_access,
    },
    cultivation: p.cultivation,
    settlement: p.settlement,
    sor: p.sor,
    telegram: p.telegram,
    createdAt: p.created_at,
    materializedAt: p.materialized_at,
    activatedAt: p.activated_at,
    graduatedAt: p.graduated_at,
    frozenAt: p.frozen_at,
    frozenReason: p.frozen_reason,
    terminatedAt: p.terminated_at,
  });
}

async function handleUpdatePartner(req: Request, partnerId: string): Promise<Response> {
  try {
    const gateway = partnerProfileService.getGateway(partnerId);
    if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

    const body = await req.json();
    const { displayName, email, phone } = body;

    if (displayName) gateway.profile.display_name = displayName;
    if (email) gateway.profile.email = email;
    if (phone !== undefined) gateway.profile.phone = phone;

    return json({
      partnerId: gateway.profile.partner_id,
      displayName: gateway.profile.display_name,
      email: gateway.profile.email,
      phone: gateway.profile.phone,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 400);
  }
}

function handleDeletePartner(partnerId: string): Response {
  try {
    partnerProfileService.deletePartner(partnerId, "API termination request");
    return json({
      partnerId,
      status: "terminated" as LifecycleState,
      terminatedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 404, "PARTNER_NOT_FOUND");
  }
}

// ---------------------------------------------------------------------------
// Handlers: Evaluation & Routing
// ---------------------------------------------------------------------------

async function handleEvaluate(req: Request, partnerId: string): Promise<Response> {
  try {
    const body = await req.json();
    const signal: SignalContext = {
      signalId: body.signalId ?? `eval_${Date.now()}`,
      partnerId,
      bookId: body.bookId,
      type: body.type,
      suggestedStake: body.suggestedStake,
      tier: body.tier ?? "T2",
      eventId: body.eventId ?? "",
      market: body.market ?? "",
      sport: body.sport ?? "",
      confidence: body.confidence ?? 0.5,
      urgencyMs: body.urgencyMs ?? 5000,
      odds: body.odds,
      line: body.line,
      side: body.side,
    };

    const result = processSignal(signal);
    return json({
      partnerId,
      signalId: signal.signalId,
      allowed: result.allowed,
      action: result.action,
      reason: result.reason,
      adjustedStake: result.adjustedStake,
      metadata: result.metadata,
    });
  } catch (err: any) {
    return error(err.message, 400);
  }
}

async function handleRouteSignal(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const signal: SignalContext = {
      signalId: body.signalId ?? `route_${Date.now()}`,
      partnerId: body.partnerId ?? "__BROADCAST__",
      bookId: body.bookId,
      type: body.type,
      suggestedStake: body.suggestedStake,
      tier: body.tier ?? "T2",
      eventId: body.eventId ?? "",
      market: body.market ?? "",
      sport: body.sport ?? "",
      confidence: body.confidence ?? 0.5,
      urgencyMs: body.urgencyMs ?? 5000,
      odds: body.odds,
      line: body.line,
      side: body.side,
    };

    const results = processSignalRoute(signal);

    const summary = {
      allowed: results.filter((r) => r.result.allowed).length,
      blocked: results.filter((r) => r.result.action === "block").length,
      adjusted: results.filter((r) => r.result.action === "adjust").length,
      totalExposureRecorded: results
        .filter((r) => r.result.allowed)
        .reduce((sum, r) => sum + (r.result.adjustedStake ?? signal.suggestedStake), 0),
    };

    return json({
      signalId: signal.signalId,
      routedAt: Math.floor(Date.now() / 1000),
      candidatesEvaluated: results.length,
      results: results.map((r) => ({
        partnerId: r.partnerId,
        allowed: r.result.allowed,
        action: r.result.action,
        reason: r.result.reason,
        adjustedStake: r.result.adjustedStake,
        metadata: r.result.metadata,
      })),
      summary,
    });
  } catch (err: any) {
    return error(err.message, 400);
  }
}

async function handleEvaluateBatch(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { partnerId, signals } = body;

    if (!partnerId || !Array.isArray(signals)) {
      return error("Missing partnerId or signals array", 400, "VALIDATION_ERROR");
    }

    const ctxs: SignalContext[] = signals.map((s: any) => ({
      signalId: s.signalId ?? `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      partnerId,
      bookId: s.bookId,
      type: s.type,
      suggestedStake: s.suggestedStake,
      tier: s.tier ?? "T2",
      eventId: s.eventId ?? "",
      market: s.market ?? "",
      sport: s.sport ?? "",
      confidence: s.confidence ?? 0.5,
      urgencyMs: s.urgencyMs ?? 5000,
    }));

    const results = processSignalBatch(ctxs);
    const totalExposure = results
      .filter((r) => r.result.allowed)
      .reduce((sum, r) => sum + (r.result.adjustedStake ?? r.signal.suggestedStake), 0);

    return json({
      partnerId,
      evaluatedAt: Math.floor(Date.now() / 1000),
      results: results.map((r) => ({
        signalId: r.signal.signalId,
        allowed: r.result.allowed,
        action: r.result.action,
        metadata: r.result.metadata,
      })),
      totalExposureRecorded: totalExposure,
    });
  } catch (err: any) {
    return error(err.message, 400);
  }
}

// ---------------------------------------------------------------------------
// Handlers: Lifecycle
// ---------------------------------------------------------------------------

async function handleTransition(req: Request, partnerId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { event, reason, guardOverrides } = body;

    if (!event) {
      return error("Missing 'event' field", 400, "VALIDATION_ERROR");
    }

    const gateway = partnerProfileService.getGateway(partnerId);
    if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

    const result = transitionByEvent(
      gateway.profile,
      gateway.runtime,
      event,
      "api_admin",
      reason
    );

    return json({
      partnerId,
      previousState: result.previousState,
      currentState: result.currentState,
      transition: `${result.previousState}→${result.currentState}`,
      reason: result.reason,
      guardChecks: result.guardChecks,
      transitionedAt: Math.floor(Date.now() / 1000),
      triggeredBy: "api_admin",
    });
  } catch (err: any) {
    if (err.message.includes("Invalid transition")) {
      return error(err.message, 400, "INVALID_TRANSITION");
    }
    if (err.message.includes("Guard check failed")) {
      return error(err.message, 400, "GUARD_CHECK_FAILED");
    }
    return error(err.message, 400);
  }
}

// ---------------------------------------------------------------------------
// Handlers: Logs
// ---------------------------------------------------------------------------

function handleGetGateLog(url: URL, partnerId: string): Response {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

  const action = url.searchParams.get("action") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  // Query gate log if table exists, otherwise return runtime state
  try {
    const db = require("@db/index").getDb();
    const rows = db.query(
      `SELECT action, COUNT(*) as count FROM partner_gate_log
       WHERE partner_id = ? GROUP BY action`
    ).all(partnerId) as Array<{ action: string; count: number }>;

    const byAction = { allow: 0, block: 0, adjust: 0, defer: 0 };
    for (const r of rows) {
      if (r.action in byAction) (byAction as any)[r.action] = r.count;
    }

    const entries = db.query(
      `SELECT * FROM partner_gate_log WHERE partner_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(partnerId, limit) as Array<Record<string, unknown>>;

    return json({ partnerId, entries, total: entries.length, byAction });
  } catch {
    // Table may not exist yet — return runtime summary
    return json({
      partnerId,
      entries: [],
      total: 0,
      byAction: { allow: 0, block: 0, adjust: 0, defer: 0 },
    });
  }
}

function handleGetLifecycleLog(partnerId: string): Response {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

  // Query lifecycle log if table exists
  try {
    const db = require("@db/index").getDb();
    const entries = db.query(
      `SELECT * FROM partner_lifecycle_log WHERE partner_id = ? ORDER BY changed_at DESC LIMIT 50`
    ).all(partnerId) as Array<Record<string, unknown>>;

    return json({
      partnerId,
      entries,
      total: entries.length,
      currentState: gateway.profile.state,
    });
  } catch {
    return json({
      partnerId,
      entries: [],
      total: 0,
      currentState: gateway.profile.state,
    });
  }
}

function handleGetGateResults(url: URL): Response {
  const hours = parseInt(url.searchParams.get("hours") ?? "24", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);

  try {
    const db = require("@db/index").getDb();
    const cutoff = Math.floor(Date.now() / 1000) - hours * 3600;

    const entries = db.query(
      `SELECT * FROM partner_gate_log WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?`
    ).all(cutoff, limit) as Array<Record<string, unknown>>;

    const actionRows = db.query(
      `SELECT action, COUNT(*) as count FROM partner_gate_log WHERE created_at >= ? GROUP BY action`
    ).all(cutoff) as Array<{ action: string; count: number }>;

    const byAction = { allow: 0, block: 0, adjust: 0, defer: 0 };
    for (const r of actionRows) {
      if (r.action in byAction) (byAction as any)[r.action] = r.count;
    }

    return json({ entries, total: entries.length, byAction });
  } catch {
    return json({
      entries: [],
      total: 0,
      byAction: { allow: 0, block: 0, adjust: 0, defer: 0 },
    });
  }
}

// ---------------------------------------------------------------------------
// Handlers: Settlement
// ---------------------------------------------------------------------------

function handleGetSettlement(partnerId: string): Response {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

  try {
    const tiers = getCommissionTiers(partnerId);
    return json({
      partnerId,
      commissionStructure: tiers.structure,
      commissionTiers: tiers.tiers,
      currentRate: getCommissionRate(partnerId, gateway.runtime.totalDeposited),
      makeupEnabled: tiers.makeupEnabled,
      makeupBalance: tiers.currentMakeupBalance,
      payoutCadence: gateway.profile.settlement.payout_cadence,
      payoutMethod: gateway.profile.settlement.payout_method,
      payoutMinimum: gateway.profile.settlement.payout_minimum,
      currency: gateway.profile.settlement.currency,
    });
  } catch (err: any) {
    return error(err.message, 500);
  }
}

async function handleDeposit(req: Request, partnerId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { amount, method, reference, notes } = body;

    if (!amount || amount <= 0) {
      return error("Amount must be > 0", 400, "DEPOSIT_FAILED");
    }

    const gateway = partnerProfileService.getGateway(partnerId);
    if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

    const previousBalance = gateway.runtime.currentBalance;
    gateway.recordDeposit(amount);

    return json({
      partnerId,
      depositId: reference ?? `dep_${Date.now()}`,
      amount,
      previousBalance,
      newBalance: gateway.runtime.currentBalance,
      totalDeposited: gateway.runtime.totalDeposited,
      processedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 400, "DEPOSIT_FAILED");
  }
}

async function handleWithdrawal(req: Request, partnerId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { amount, method, reference } = body;

    if (!amount || amount <= 0) {
      return error("Amount must be > 0", 400, "WITHDRAWAL_FAILED");
    }

    const gateway = partnerProfileService.getGateway(partnerId);
    if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

    if (amount > gateway.runtime.currentBalance) {
      return error("Insufficient balance", 400, "WITHDRAWAL_FAILED");
    }

    const previousBalance = gateway.runtime.currentBalance;
    gateway.recordWithdrawal(amount);

    return json({
      partnerId,
      withdrawalId: reference ?? `wdr_${Date.now()}`,
      amount,
      previousBalance,
      newBalance: gateway.runtime.currentBalance,
      totalWithdrawn: gateway.runtime.totalWithdrawn,
      processedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 400, "WITHDRAWAL_FAILED");
  }
}

async function handleSetMarketLimit(req: Request, partnerId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { market, limit } = body;

    if (!market || limit === undefined || limit < 0) {
      return error("Invalid market or limit", 400, "VALIDATION_ERROR");
    }

    const gateway = partnerProfileService.getGateway(partnerId);
    if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

    const previousLimit = gateway.runtime.currentLimits[market] ?? 0;
    gateway.setMarketLimit(market, limit);

    return json({
      partnerId,
      market,
      previousLimit,
      newLimit: limit,
      allLimits: gateway.runtime.currentLimits,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 400);
  }
}

// ---------------------------------------------------------------------------
// Handlers: Sources
// ---------------------------------------------------------------------------

async function handleSourceHealth(partnerId: string): Promise<Response> {
  try {
    const results = await healthCheckSources(partnerId);
    const overall = results.every((r) => r.healthy)
      ? "healthy"
      : results.some((r) => r.healthy)
      ? "degraded"
      : "unhealthy";

    return json({
      partnerId,
      sources: results,
      overall,
      checkedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 500);
  }
}

function handleGetSources(partnerId: string): Response {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return error("Partner not found", 404, "PARTNER_NOT_FOUND");

  return json({
    partnerId,
    sources: getSourceStatus(partnerId),
  });
}

// ---------------------------------------------------------------------------
// Handlers: Templates
// ---------------------------------------------------------------------------

function handleListTemplates(): Response {
  const ids = listTemplateIds();
  const templates = ids.map((id) => {
    const t = getTemplate(id);
    return {
      templateId: id,
      description: t?.meta.description ?? "",
      version: t?.meta.version ?? "1.0.0",
      categories: [t?.jurisdiction.type ?? "unknown"],
      loadedAt: Math.floor(Date.now() / 1000),
    };
  });

  return json({ templates, total: templates.length });
}

function handleGetTemplate(templateId: string): Response {
  const template = getTemplate(templateId);
  if (!template) return error("Template not found", 404, "TEMPLATE_NOT_FOUND");

  return json({
    templateId: template.meta.template_id,
    name: template.meta.name,
    version: template.meta.version,
    jurisdiction: template.jurisdiction,
    sources: {
      maxSources: template.sources.max_sources,
      apiAccess: template.sources.api_access,
      sourceCount: template.sources.defaults.length,
    },
    sor: {
      eligibleTiers: template.sor.eligible_tiers,
      maxExposurePerSignal: template.sor.max_exposure_per_signal,
      steamAllowed: template.sor.steam_allowed,
      arbAllowed: template.sor.arb_allowed,
    },
    settlement: {
      commissionStructure: template.settlement.commission_structure,
      payoutCadence: template.settlement.payout_cadence,
    },
    telegram: {
      groupTypes: template.telegram.groups.map((g) => g.type),
      alertTypes: template.telegram.alert_types,
    },
  });
}

async function handleReloadTemplates(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const templateDir = body.templateDir ?? "./profiles";

    const result = await reloadTemplates(templateDir);
    return json({
      success: true,
      templatesLoaded: result.templatesLoaded,
      partnersRefreshed: partnerProfileService["gateways" as keyof typeof partnerProfileService],
      bookIndexRefreshed: true,
      errors: result.errors,
      reloadedAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return error(err.message, 500);
  }
}

async function handleValidateTemplate(req: Request): Promise<Response> {
  try {
    const { templateContent } = await req.json();
    if (!templateContent) {
      return error("Missing templateContent", 400, "VALIDATION_ERROR");
    }

    const parsed = Bun.TOML.parse(templateContent);
    const { ProfileTemplateSchema } = await import("../zones/partner-profile");
    const result = ProfileTemplateSchema.safeParse(parsed);

    return json({
      valid: result.success,
      templateId: result.success ? result.data.meta.template_id : null,
      parsed: result.success ? result.data : null,
      errors: result.success ? [] : result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      warnings: [],
    });
  } catch (err: any) {
    return json({
      valid: false,
      templateId: null,
      parsed: null,
      errors: [{ path: "toml", message: err.message }],
      warnings: [],
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function error(message: string, status = 500, code = "INTERNAL_ERROR"): Response {
  return Response.json(
    { error: message, code, timestamp: new Date().toISOString() },
    { status }
  );
}

function notFound(): Response {
  return error("Not found", 404, "NOT_FOUND");
}
