/**
 * Enhanced Routing with URLPattern API
 * 
 * Replaces manual path parsing with declarative, spec-compliant URLPattern routing.
 * Matches Web Platform standard with 408 WPT-passing implementation.
 */

import { URLPattern } from "urlpattern-polyfill";

// Define patterns once - declarative and type-safe
export const API_PATTERNS = {
  // QR Code endpoints
  qrGenerate: new URLPattern({ pathname: "/api/qr/generate" }),
  qrValidate: new URLPattern({ pathname: "/api/qr/validate/:code" }),
  
  // Payment endpoints
  paymentIntent: new URLPattern({ pathname: "/api/pay/intent/:id" }),
  paymentStatus: new URLPattern({ pathname: "/api/pay/status/:id" }),
  paymentComplete: new URLPattern({ pathname: "/api/pay/complete/:id" }),
  
  // Family endpoints
  familyMembers: new URLPattern({ pathname: "/api/family/:familyId/members" }),
  familyStats: new URLPattern({ pathname: "/api/family/:familyId/stats" }),
  familyInvite: new URLPattern({ pathname: "/api/family/:familyId/invite" }),
  
  // Guest endpoints
  guestVerify: new URLPattern({ pathname: "/api/guest/verify/:code" }),
  guestOnboard: new URLPattern({ pathname: "/api/guest/onboard/:sessionId" }),
  
  // Quest endpoints
  questList: new URLPattern({ pathname: "/api/quests/:userId" }),
  questProgress: new URLPattern({ pathname: "/api/quests/:userId/:questId}" }),
  questComplete: new URLPattern({ pathname: "/api/quests/:userId/:questId/complete" }),
  
  // Security endpoints
  securityCheck: new URLPattern({ pathname: "/api/security/check/:guestId" }),
  securityAlerts: new URLPattern({ pathname: "/api/security/alerts/:familyId" }),
  
  // Webhook endpoints
  webhookVenmo: new URLPattern({ pathname: "/api/webhooks/venmo" }),
  webhookCashApp: new URLPattern({ pathname: "/api/webhooks/cashapp" }),
  webhookGeneric: new URLPattern({ pathname: "/api/webhooks/:provider" }),
  
  // Inspection endpoints
  inspectionTree: new URLPattern({ pathname: "/api/inspection/tree" }),
  inspectionScope: new URLPattern({ pathname: "/api/inspection/scope/:scopeName" }),
  inspectionSearch: new URLPattern({ pathname: "/api/inspection/search" }),
  
  // Health and metrics
  health: new URLPattern({ pathname: "/api/health" }),
  metrics: new URLPattern({ pathname: "/api/metrics" }),
  status: new URLPattern({ pathname: "/api/status" })
} as const;

// Type-safe pattern matching result
export interface PatternMatch {
  pattern: keyof typeof API_PATTERNS;
  groups: Record<string, string>;
  input: string;
}

/**
 * Enhanced request router using URLPattern
 */
export class EnhancedRouter {
  private handlers: Map<keyof typeof API_PATTERNS, (match: PatternMatch, req: Request) => Promise<Response>> = new Map();
  
  /**
   * Register a handler for a specific pattern
   */
  register<T extends keyof typeof API_PATTERNS>(
    pattern: T, 
    handler: (match: PatternMatch, req: Request) => Promise<Response>
  ): void {
    this.handlers.set(pattern, handler);
  }
  
  /**
   * Route request to appropriate handler
   */
  async route(req: Request): Promise<Response> {
    const url = req.url;
    
    // Find matching pattern
    for (const [patternName, pattern] of Object.entries(API_PATTERNS)) {
      if (pattern.test(url)) {
        const match = pattern.exec(url)!;
        const patternMatch: PatternMatch = {
          pattern: patternName as keyof typeof API_PATTERNS,
          groups: match.pathname.groups,
          input: url
        };
        
        const handler = this.handlers.get(patternMatch.pattern);
        if (handler) {
          return handler(patternMatch, req);
        }
        
        return new Response(`Pattern matched but no handler registered for ${patternMatch.pattern}`, {
          status: 501
        });
      }
    }
    
    return new Response("Not found", { status: 404 });
  }
  
  /**
   * Get all registered patterns
   */
  getPatterns(): Array<{ name: string; pattern: string }> {
    return Object.entries(API_PATTERNS).map(([name, pattern]) => ({
      name,
      pattern: pattern.toString()
    }));
  }
}

/**
 * Example usage in server
 */
export function createEnhancedServer() {
  const router = new EnhancedRouter();
  
  // Register handlers
  router.register("qrGenerate", async (match, req) => {
    const params = new URL(req.url).searchParams;
    const amount = params.get("amount");
    const recipient = params.get("recipient");
    
    // Generate QR code logic
    return Response.json({
      qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      amount,
      recipient,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
  });
  
  router.register("paymentIntent", async (match, req) => {
    const intentId = match.groups.id;
    
    // Get payment intent logic
    return Response.json({
      id: intentId,
      status: "pending",
      amount: 25.50,
      recipient: "alice"
    });
  });
  
  router.register("familyMembers", async (match, req) => {
    const familyId = match.groups.familyId;
    
    // Get family members logic
    return Response.json({
      familyId,
      members: [
        { id: "alice", role: "admin", trust: 100 },
        { id: "bob", role: "member", trust: 70 },
        { id: "sarah", role: "guest", trust: 30 }
      ]
    });
  });
  
  router.register("questProgress", async (match, req) => {
    const { userId, questId } = match.groups;
    
    // Get quest progress logic
    return Response.json({
      userId,
      questId,
      progress: 75,
      completed: false,
      nextMilestone: "Complete 5 payments"
    });
  });
  
  router.register("securityCheck", async (match, req) => {
    const guestId = match.groups.guestId;
    
    // Security check logic
    return Response.json({
      guestId,
      allowed: true,
      requiresFronting: false,
      securityChecks: ["amount_limit", "daily_limit", "concurrent_check"]
    });
  });
  
  router.register("inspectionTree", async (match, req) => {
    // Return inspection tree
    const { createInspectionContext } = await import("../inspection/index.js");
    const ctx = createInspectionContext("localhost");
    
    return Response.json(ctx);
  });
  
  router.register("health", async (match, req) => {
    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.1.0",
      features: ["URLPattern", "FakeTimers", "ProxyHeaders", "SQLite351"]
    });
  });
  
  return router;
}

/**
 * Type-safe route handler decorator
 */
export function Route(pattern: keyof typeof API_PATTERNS) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    // Store the route metadata
    if (!target._routes) {
      target._routes = new Map();
    }
    target._routes.set(pattern, originalMethod);
    
    descriptor.value = function (req: Request) {
      const router = new EnhancedRouter();
      router.register(pattern, async (match, req) => {
        return originalMethod.call(this, match, req);
      });
      return router.route(req);
    };
  };
}

/**
 * Example class with route decorators
 */
export class APIController {
  @Route("qrGenerate")
  async handleQRGenerate(match: PatternMatch, req: Request): Promise<Response> {
    const params = new URL(req.url).searchParams;
    return Response.json({ qrCode: "generated", params: Object.fromEntries(params) });
  }
  
  @Route("paymentIntent")
  async handlePaymentIntent(match: PatternMatch, req: Request): Promise<Response> {
    const intentId = match.groups.id;
    return Response.json({ intentId, status: "processed" });
  }
  
  @Route("familyMembers")
  async handleFamilyMembers(match: PatternMatch, req: Request): Promise<Response> {
    const familyId = match.groups.familyId;
    return Response.json({ familyId, members: [] });
  }
}

/**
 * Migration helper from old string-based routing
 */
export function migrateFromLegacyRouting(legacyPath: string): keyof typeof API_PATTERNS | null {
  const migrationMap: Record<string, keyof typeof API_PATTERNS> = {
    "/api/qr/generate": "qrGenerate",
    "/api/qr/validate": "qrValidate",
    "/api/pay/intent": "paymentIntent",
    "/api/pay/status": "paymentStatus",
    "/api/family/members": "familyMembers",
    "/api/guest/verify": "guestVerify",
    "/api/quests": "questList",
    "/api/security/check": "securityCheck",
    "/api/webhooks": "webhookGeneric",
    "/api/health": "health"
  };
  
  // Extract base path and handle dynamic segments
  const basePath = legacyPath.replace(/\/[^\/]*$/, "");
  return migrationMap[basePath] || null;
}

export default EnhancedRouter;
