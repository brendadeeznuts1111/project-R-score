/**
 * Zod Schema Definitions
 *
 * Provides runtime validation schemas for all API inputs.
 * Used by the router to validate request bodies and query parameters.
 *
 * Usage:
 *   import { playerIdSchema, wagerQuerySchema } from '@utils/validators';
 *   const result = playerIdSchema.safeParse(req.params);
 */

import { z } from "zod";
import { ValidationError } from "./errors";

// ---------------------------------------------------------------------------
// Common primitives
// ---------------------------------------------------------------------------

export const idSchema = z.string().min(1).max(128);
export const uuidSchema = z.string().uuid();
export const timestampSchema = z.coerce.number().int().min(0);
export const positiveNumberSchema = z.coerce.number().positive();
export const nonNegativeNumberSchema = z.coerce.number().min(0);
export const percentSchema = z.coerce.number().min(0).max(1);
export const limitSchema = z.coerce.number().int().min(1).max(500).default(50);
export const offsetSchema = z.coerce.number().int().min(0).default(0);

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  limit: limitSchema.optional(),
  offset: offsetSchema.optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  captchaToken: z.string().optional(),
});

export const tokenRenewSchema = z.object({
  token: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type TokenRenewInput = z.infer<typeof tokenRenewSchema>;

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export const playerIdSchema = z.object({
  playerId: idSchema,
});

export const playerSearchSchema = z.object({
  query: z.string().optional(),
  riskTier: z.enum(["BLACK", "RED", "YELLOW", "GREEN"]).optional(),
  archetype: z
    .enum(["sharp", "whale", "chase_gambler", "new", "recreational", "suspicious"])
    .optional(),
  agentLogin: z.string().optional(),
  status: z.enum(["active", "suspended", "closed"]).optional(),
  ...paginationSchema.shape,
});

export type PlayerSearchParams = z.infer<typeof playerSearchSchema>;

// ---------------------------------------------------------------------------
// Wagers
// ---------------------------------------------------------------------------

export const wagerQuerySchema = z.object({
  sessionId: z.string().optional(),
  since: timestampSchema.optional(),
  playerId: z.string().optional(),
  agentLogin: z.string().optional(),
  sport: z.string().optional(),
  status: z.enum(["pending", "settled", "cancelled", "all"]).optional(),
  ...paginationSchema.shape,
});

export type WagerQueryParams = z.infer<typeof wagerQuerySchema>;

export const createWagerSchema = z.object({
  playerId: idSchema,
  sport: z.string().min(1).max(20),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  market: z.enum(["spread", "ml", "total", "parlay", "teaser", "prop"]),
  selection: z.string().min(1),
  odds: z.coerce.number(),
  stake: positiveNumberSchema,
  ipAddress: z.string().ip().optional(),
});

export type CreateWagerInput = z.infer<typeof createWagerSchema>;

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

export const riskAnalysisSchema = z.object({
  playerId: idSchema,
  context: z
    .object({
      recentWagers: z.number().int().min(0).optional(),
      timeWindow: z.string().optional(),
      stakeVelocity: z.number().optional(),
      winRate: percentSchema.optional(),
      unusualMarkets: z.array(z.string()).optional(),
      ipFlags: z.array(z.string()).optional(),
    })
    .optional(),
  deepAnalysis: z.boolean().default(false),
});

export type RiskAnalysisInput = z.infer<typeof riskAnalysisSchema>;

// ---------------------------------------------------------------------------
// Rules Engine
// ---------------------------------------------------------------------------

export const ruleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ruleType: z.enum(["threshold", "pattern", "composite", "time_based"]),
  condition: z.record(z.unknown()),
  action: z.record(z.unknown()),
  priority: z.number().int().min(1).max(1000).default(100),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  active: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

export type RuleInput = z.infer<typeof ruleSchema>;

// ---------------------------------------------------------------------------
// IP Intelligence
// ---------------------------------------------------------------------------

export const ipBlockSchema = z.object({
  ipAddress: z.string().ip(),
  reason: z.string().min(1).max(1000),
  scope: z.enum(["all", "login", "wager", "deposit"]).default("all"),
  expiresAt: timestampSchema.optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
});

export type IpBlockInput = z.infer<typeof ipBlockSchema>;

export const ipTrackingQuerySchema = z.object({
  ip: z.string().ip().optional(),
  playerId: z.string().optional(),
  flagged: z.coerce.boolean().optional(),
  ...paginationSchema.shape,
});

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export const webhookConfigSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string()).optional(),
  authType: z.enum(["none", "bearer", "hmac", "api_key"]).optional(),
  authConfig: z.record(z.unknown()).optional(),
  eventTypes: z.array(z.string()).min(1),
  filters: z.record(z.unknown()).optional(),
  retryPolicy: z
    .object({
      max_retries: z.number().int().min(0).max(10).default(3),
      backoff_ms: z.number().int().default(1000),
    })
    .optional(),
  timeoutMs: z.number().int().min(1000).max(30000).default(5000),
});

export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>;

// ---------------------------------------------------------------------------
// Vault (Secrets)
// ---------------------------------------------------------------------------

export const secretSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Key must be UPPER_SNAKE_CASE"),
  value: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(20).optional(),
});

export type SecretInput = z.infer<typeof secretSchema>;

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------

export const sandboxScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scenarioType: z
    .enum(["a_b_test", "simulation", "regression", "stress"])
    .default("simulation"),
  config: z.record(z.unknown()),
});

export type SandboxScenarioInput = z.infer<typeof sandboxScenarioSchema>;

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const agentHierarchySchema = z.object({
  parentLogin: z.string().min(1),
  childLogin: z.string().min(1),
  commissionPct: z.coerce.number().min(0).max(100).default(0),
  effectiveFrom: timestampSchema.default(() => Math.floor(Date.now() / 1000)),
});

export type AgentHierarchyInput = z.infer<typeof agentHierarchySchema>;

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

export const enforcementSchema = z.object({
  playerId: idSchema,
  action: z.enum(["apply_limit", "auto_enforce", "suspend"]),
  limitType: z.enum(["wager", "payout", "deposit"]).optional(),
  value: z.coerce.number().optional(),
  reason: z.string().min(1).optional(),
  durationHours: z.coerce.number().int().positive().optional(),
});

export type EnforcementInput = z.infer<typeof enforcementSchema>;

// ---------------------------------------------------------------------------
// Signal / Partner
// ---------------------------------------------------------------------------

export const signalContextSchema = z.object({
  signalId: z.string().min(1),
  partnerId: z.string().min(1),
  bookId: z.string().min(1),
  tier: z.string().min(1),
  type: z.string().min(1),
  suggestedStake: z.coerce.number().positive(),
  eventId: z.string().min(1),
  market: z.string().min(1),
  sport: z.string().min(1),
  confidence: percentSchema,
  urgencyMs: z.coerce.number().int().positive(),
});

export type SignalContextInput = z.infer<typeof signalContextSchema>;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Validate data against a Zod schema and return the result or throw
 * a formatted validation error.
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join("."),
      issue: i.message,
    }));
    throw new ValidationError("Request validation failed", { issues });
  }
  return result.data;
}


