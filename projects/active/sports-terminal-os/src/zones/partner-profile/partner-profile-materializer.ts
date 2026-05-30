/**
 * Partner Profile OS — Profile Materializer
 *
 * Creates a PartnerProfile from a template + partner ID + optional overrides.
 * Uses structuredClone for template isolation — mutations NEVER propagate back.
 *
 * Implements the lifecycle state machine:
 *   signup → materialized → active → cultivating → graduated/frozen/suspended/terminated
 *
 * All lifecycle transitions are guarded and logged to partner_lifecycle_log.
 */

import {
  type PartnerProfile,
  type PartnerRuntimeState,
  type ProfileTemplate,
  PartnerProfileSchema,
  PartnerRuntimeStateSchema,
  type LifecycleState,
  type KycStatus,
  type RiskLevel,
} from "./partner-profile-schema";

// ---------------------------------------------------------------------------
// Guard Checks
// ---------------------------------------------------------------------------

interface GuardCheck {
  name: string;
  validate: (profile: PartnerProfile, runtime: PartnerRuntimeState) => boolean;
  failReason: string;
}

/** Guard definitions for each guarded transition. */
const GUARDS: Record<string, GuardCheck[]> = {
  "materialized→active": [
    {
      name: "kyc_verified",
      validate: (_p, r) => r.kycStatus === "verified",
      failReason: "KYC not verified",
    },
    {
      name: "capital_met",
      validate: (p, r) => r.currentBalance >= p.balance.initial_capital_requirement,
      failReason: "Capital requirement not met",
    },
  ],
  "kyc_pending→active": [
    {
      name: "kyc_verified",
      validate: (_p, r) => r.kycStatus === "verified",
      failReason: "KYC not verified",
    },
  ],
  "cultivating→graduated": [
    {
      name: "limit_target",
      validate: (p, r) => r.currentLimit >= p.cultivation.limit_raise_target,
      failReason: "Limit target not reached",
    },
    {
      name: "deposits_complete",
      validate: (p, r) => r.totalDeposited >= p.cultivation.initial_deposit_target,
      failReason: "Deposit target not met",
    },
    {
      name: "admin_approval",
      validate: () => false, // Always requires external admin approval
      failReason: "Requires admin approval",
    },
  ],
};

export interface TransitionResult {
  success: boolean;
  previousState: LifecycleState;
  currentState: LifecycleState;
  guardChecks: Array<{ name: string; passed: boolean; detail: string }>;
  reason?: string;
}

/** Valid state transitions. Key: "from→to" */
const VALID_TRANSITIONS: Record<string, string[]> = {
  signup: ["materialized", "terminated"],
  materialized: ["active", "kyc_pending", "frozen", "terminated"],
  kyc_pending: ["active", "frozen"],
  active: ["cultivating", "graduated", "frozen", "suspended"],
  cultivating: ["graduated", "active", "frozen"],
  graduated: ["active", "frozen", "suspended"],
  frozen: ["active", "suspended", "terminated"],
  suspended: ["active", "frozen", "terminated"],
  terminated: [],
};

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

/**
 * Create a PartnerProfile + PartnerRuntimeState from a template.
 *
 * Uses structuredClone to ensure complete isolation from the source TOML.
 * Mutations to the returned profile or runtime NEVER propagate back.
 *
 * @param partnerId   Unique partner identifier
 * @param template    Loaded and validated ProfileTemplate
 * @param overrides   Optional partial overrides for profile or runtime
 * @returns Object containing { profile, runtime }
 */
export function materializeProfile(
  partnerId: string,
  template: ProfileTemplate,
  overrides?: {
    profile?: Partial<Omit<PartnerProfile, "partner_id" | "template_id">>;
    runtime?: Partial<PartnerRuntimeState>;
  }
): { profile: PartnerProfile; runtime: PartnerRuntimeState } {
  // structuredClone ensures template isolation — NEVER mutate source TOML
  const tmpl = structuredClone(template);

  const now = Math.floor(Date.now() / 1000);

  // Build the profile
  const profileBase: PartnerProfile = {
    partner_id: partnerId,
    template_id: tmpl.meta.template_id,
    state: "signup", // Will transition to materialized
    display_name: overrides?.profile?.display_name ?? tmpl.meta.name,
    email: overrides?.profile?.email ?? "",
    phone: overrides?.profile?.phone,
    created_at: now,
    materialized_at: now,
    activated_at: overrides?.profile?.activated_at,
    graduated_at: overrides?.profile?.graduated_at,
    frozen_at: overrides?.profile?.frozen_at,
    frozen_reason: overrides?.profile?.frozen_reason,
    terminated_at: overrides?.profile?.terminated_at,
    jurisdiction: { ...tmpl.jurisdiction, ...overrides?.profile?.jurisdiction },
    sources: {
      defaults: tmpl.sources.defaults,
      api_access: tmpl.sources.api_access,
      max_sources: tmpl.sources.max_sources,
    },
    cultivation: { ...tmpl.cultivation, ...overrides?.profile?.cultivation },
    settlement: { ...tmpl.settlement, ...overrides?.profile?.settlement },
    sor: { ...tmpl.sor, ...overrides?.profile?.sor },
    telegram: { ...tmpl.telegram, ...overrides?.profile?.telegram },
    balance: { ...tmpl.balance, ...overrides?.profile?.balance },
    compliance: { ...tmpl.compliance, ...overrides?.profile?.compliance },
    ...overrides?.profile,
  };

  // Validate the constructed profile
  const profile = PartnerProfileSchema.parse(profileBase);

  // Transition state from signup → materialized
  profile.state = "materialized";

  // Build runtime state
  const runtimeBase: PartnerRuntimeState = {
    currentBalance: 0,
    dailyUsed: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalSettledPnl: 0,
    currentLimit: tmpl.cultivation.initial_limit,
    currentLimits: {},
    kycStatus: "pending",
    riskLevel: "green",
    opsecScore: 0,
    ...overrides?.runtime,
  };

  const runtime = PartnerRuntimeStateSchema.parse(runtimeBase);

  return { profile, runtime };
}

// ---------------------------------------------------------------------------
// Lifecycle Transitions
// ---------------------------------------------------------------------------

/**
 * Transition a partner from one lifecycle state to another.
 *
 * @param profile    The partner profile (state will be mutated on success)
 * @param runtime    The partner runtime state
 * @param newState   Target state
 * @param triggeredBy Who triggered the transition (e.g., "admin_user", "system")
 * @param reason     Optional human-readable reason
 * @returns TransitionResult with guard check details
 * @throws Error if transition is invalid or guard checks fail
 */
export function transitionProfile(
  profile: PartnerProfile,
  runtime: PartnerRuntimeState,
  newState: LifecycleState,
  triggeredBy: string = "system",
  reason?: string
): TransitionResult {
  const previousState = profile.state;
  const transitionKey = `${previousState}→${newState}`;

  // Check if transition is valid
  const validTargets = VALID_TRANSITIONS[previousState] ?? [];
  if (!validTargets.includes(newState)) {
    throw new Error(
      `Invalid transition: ${previousState} → ${newState}. Valid targets from ${previousState}: [${validTargets.join(", ")}]`
    );
  }

  // Run guard checks for guarded transitions
  const guards = GUARDS[transitionKey] ?? [];
  const guardChecks = guards.map((g) => {
    const passed = g.validate(profile, runtime);
    return {
      name: g.name,
      passed,
      detail: passed ? `${g.name} passed` : g.failReason,
    };
  });

  // All guards must pass
  const failedGuards = guardChecks.filter((g) => !g.passed);
  if (failedGuards.length > 0) {
    const failReasons = failedGuards.map((g) => `${g.name}: ${g.detail}`).join("; ");
    throw new Error(
      `Guard check failed for transition ${transitionKey} — ${failReasons}`
    );
  }

  // Special cases
  if (newState === "frozen") {
    profile.frozen_at = Math.floor(Date.now() / 1000);
    profile.frozen_reason = reason ?? "Frozen by admin/compliance";
  }

  if (newState === "terminated") {
    profile.terminated_at = Math.floor(Date.now() / 1000);
  }

  if (newState === "active" && previousState === "materialized") {
    profile.activated_at = Math.floor(Date.now() / 1000);
  }

  if (newState === "graduated") {
    profile.graduated_at = Math.floor(Date.now() / 1000);
  }

  if (newState === "active" && (previousState === "frozen" || previousState === "suspended")) {
    // Unfreeze: clear frozen markers
    profile.frozen_reason = undefined;
  }

  // Apply the state change
  profile.state = newState;

  // Persist lifecycle log (best effort — log failure but don't throw)
  try {
    persistLifecycleLog(profile.partner_id, previousState, newState, triggeredBy, reason, guardChecks);
  } catch (err: any) {
    console.error(`[LIFECYCLE] Failed to persist lifecycle log: ${err.message}`);
  }

  return {
    success: true,
    previousState,
    currentState: newState,
    guardChecks,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Convenience: event-based transitions
// ---------------------------------------------------------------------------

/**
 * Transition using event names instead of raw state.
 */
export function transitionByEvent(
  profile: PartnerProfile,
  runtime: PartnerRuntimeState,
  event: "materialize" | "approve" | "graduate" | "freeze" | "reactivate",
  triggeredBy: string = "system",
  reason?: string
): TransitionResult {
  const targetState = resolveEventTarget(profile.state, event);
  return transitionProfile(profile, runtime, targetState, triggeredBy, reason);
}

function resolveEventTarget(
  currentState: LifecycleState,
  event: string
): LifecycleState {
  switch (event) {
    case "materialize":
      return "materialized";
    case "approve":
      if (currentState === "kyc_pending") return "active";
      if (currentState === "materialized") return "active";
      throw new Error(`Cannot approve from state ${currentState}`);
    case "graduate":
      return "graduated";
    case "freeze":
      return "frozen";
    case "reactivate":
      return "active";
    default:
      throw new Error(`Unknown transition event: ${event}`);
  }
}

// ---------------------------------------------------------------------------
// Audit Persistence Helpers
// ---------------------------------------------------------------------------

function persistLifecycleLog(
  partnerId: string,
  fromState: LifecycleState | null,
  toState: LifecycleState,
  triggeredBy: string,
  reason?: string,
  guardChecks?: Array<{ name: string; passed: boolean; detail: string }>
): void {
  // In production this writes to SQLite partner_lifecycle_log
  // Here we log to console and rely on caller to persist
  const guardJson = JSON.stringify(guardChecks ?? []);
  console.log(
    `[LIFECYCLE] ${partnerId}: ${fromState ?? "null"} → ${toState} | ` +
      `triggeredBy=${triggeredBy} reason=${reason ?? "-"} guards=${guardJson}`
  );
}

// ---------------------------------------------------------------------------
// Default Runtime
// ---------------------------------------------------------------------------

export const DEFAULT_RUNTIME: PartnerRuntimeState = {
  currentBalance: 0,
  dailyUsed: 0,
  totalDeposited: 0,
  totalWithdrawn: 0,
  totalSettledPnl: 0,
  currentLimit: 0,
  currentLimits: {},
  kycStatus: "pending",
  riskLevel: "green",
  opsecScore: 0,
};
