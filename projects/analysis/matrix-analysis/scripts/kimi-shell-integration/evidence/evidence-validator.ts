#!/usr/bin/env bun
/**
 * Evidence Validator Middleware
 * 
 * Automated T1-T4 evidence validation for council defense
 * Validates technical claims before they reach production
 */

import { type ServeOptions } from "bun";

// ============================================================================
// Types
// ============================================================================

export interface EvidenceSource {
  t1?: {
    type: "release" | "docs" | "commit";
    url: string;
    commit?: string;
    version?: string;
  };
  t2?: {
    deployment: string;
    metric: string;
    value: number;
    timestamp: string;
  };
  t3?: {
    benchmark: string;
    command: string;
    threshold: number;
    actualValue?: number;
    variancePercent: number;
  };
  t4?: {
    memory: string;
    pattern: string;
    section: string;
  };
}

export interface TechnicalClaim {
  id: string;
  statement: string;
  category: "ipc" | "storage" | "security" | "performance" | "architecture";
  sources: EvidenceSource;
  submittedBy: string;
  submittedAt: Date;
  lastValidated?: Date;
  councilApproved?: boolean;
  expiresAt?: Date;
}

export interface ValidationResult {
  valid: boolean;
  councilRequired: boolean;
  missingTiers: string[];
  message: string;
  fallback?: string;
  evidence?: Record<string, unknown>;
}

export interface CouncilReview {
  claimId: string;
  challengedBy: string;
  challengeReason: string;
  defenseDeadline: Date;
  status: "pending_defense" | "under_review" | "approved" | "rejected" | "conditional";
  members: string[];
  automaticFallback: string;
  notes?: string;
}

// ============================================================================
// Evidence Validator Class
// ============================================================================

export class EvidenceValidator {
  private claims = new Map<string, TechnicalClaim>();
  private reviews = new Map<string, CouncilReview>();
  
  // Minimum requirements by category
  private requirements: Record<string, string[]> = {
    ipc: ["t1", "t3"],
    storage: ["t1", "t3"],
    security: ["t1", "t2"],
    performance: ["t1", "t3"],
    architecture: ["t1", "t4"],
  };
  
  // Fallback protocols by category
  private fallbacks: Record<string, string> = {
    ipc: "Blob transfer (in-memory)",
    storage: "Bun.file with chunked streaming",
    security: "Most restrictive: HTTPS mandatory, TLS 1.3 only",
    performance: "Conservative: higher latency, lower throughput",
    architecture: "Monolithic: single domain, no nesting",
  };

  /**
   * Validate a technical claim
   */
  async validateClaim(claim: TechnicalClaim): Promise<ValidationResult> {
    const missingTiers: string[] = [];
    const required = this.requirements[claim.category] || ["t1"];
    
    // Check minimum evidence requirements
    for (const tier of required) {
      if (!(claim.sources as any)[tier]) {
        missingTiers.push(tier.toUpperCase());
      }
    }
    
    // Performance claims MUST have T3 benchmark
    if (claim.statement.toLowerCase().includes("performance") ||
        claim.statement.toLowerCase().includes("faster") ||
        claim.statement.toLowerCase().includes("latency")) {
      if (!claim.sources.t3) {
        missingTiers.push("T3 (Benchmark - required for performance claims)");
      }
    }
    
    // Security claims MUST have T1 + T2
    if (claim.category === "security") {
      if (!claim.sources.t1) {
        missingTiers.push("T1 (Primary Source - required for security)");
      }
      if (!claim.sources.t2) {
        missingTiers.push("T2 (Production Telemetry - required for security)");
      }
    }
    
    if (missingTiers.length > 0) {
      return {
        valid: false,
        councilRequired: true,
        missingTiers,
        message: `Insufficient evidence. Missing: ${missingTiers.join(", ")}`,
        fallback: this.getFallbackProtocol(claim.category),
      };
    }
    
    // Validate T3 benchmark is reproducible
    if (claim.sources.t3) {
      const benchmarkValid = await this.validateBenchmark(claim.sources.t3);
      if (!benchmarkValid.valid) {
        return {
          valid: false,
          councilRequired: true,
          missingTiers: ["T3 (Benchmark validation failed)"],
          message: benchmarkValid.message,
          fallback: this.getFallbackProtocol(claim.category),
        };
      }
    }
    
    // Check expiration
    if (claim.expiresAt && claim.expiresAt < new Date()) {
      return {
        valid: false,
        councilRequired: true,
        missingTiers: ["EXPIRED"],
        message: `Evidence expired on ${claim.expiresAt.toISOString()}. Requires re-validation.`,
        fallback: this.getFallbackProtocol(claim.category),
      };
    }
    
    // Store valid claim
    this.claims.set(claim.id, {
      ...claim,
      lastValidated: new Date(),
    });
    
    return {
      valid: true,
      councilRequired: false,
      missingTiers: [],
      message: "Evidence sufficient. Council approval not required.",
      evidence: {
        claimId: claim.id,
        validatedAt: new Date().toISOString(),
        expiresAt: claim.expiresAt?.toISOString(),
      },
    };
  }

  /**
   * Validate a benchmark is reproducible
   */
  private async validateBenchmark(
    t3: EvidenceSource["t3"]
  ): Promise<{ valid: boolean; message: string }> {
    if (!t3) {
      return { valid: false, message: "T3 benchmark data missing" };
    }
    
    // Check if benchmark command is documented
    if (!t3.command || t3.command.length < 10) {
      return {
        valid: false,
        message: "T3 benchmark command must be reproducible (minimum 10 chars)",
      };
    }
    
    // Check variance is within acceptable range
    if (t3.variancePercent > 15) {
      return {
        valid: false,
        message: `T3 benchmark variance ${t3.variancePercent}% exceeds 15% threshold`,
      };
    }
    
    // If actual value is provided, compare against threshold
    if (t3.actualValue !== undefined) {
      const meetsThreshold = t3.actualValue <= t3.threshold;
      if (!meetsThreshold) {
        return {
          valid: false,
          message: `T3 benchmark ${t3.actualValue}ms exceeds threshold ${t3.threshold}ms`,
        };
      }
    }
    
    return { valid: true, message: "Benchmark validated" };
  }

  /**
   * Get fallback protocol for a category
   */
  getFallbackProtocol(category: string): string {
    return this.fallbacks[category] || "Revert to previous stable implementation";
  }

  /**
   * Escalate to council review
   */
  async escalateToCouncil(
    claimId: string,
    challengedBy: string,
    challengeReason: string
  ): Promise<CouncilReview> {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    
    const review: CouncilReview = {
      claimId,
      challengedBy,
      challengeReason,
      defenseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      status: "pending_defense",
      members: this.selectCouncilMembers(claim),
      automaticFallback: this.getFallbackProtocol(claim.category),
      notes: `Claim: "${claim.statement}"`,
    };
    
    this.reviews.set(claimId, review);
    
    // Log escalation
    console.log(`[COUNCIL ESCALATION] Claim ${claimId} escalated by ${challengedBy}`);
    console.log(`  Reason: ${challengeReason}`);
    console.log(`  Defense deadline: ${review.defenseDeadline.toISOString()}`);
    console.log(`  Fallback: ${review.automaticFallback}`);
    
    return review;
  }

  /**
   * Select council members based on claim category
   */
  private selectCouncilMembers(claim: TechnicalClaim): string[] {
    const members = ["senior-architect"]; // Always include senior architect
    
    switch (claim.category) {
      case "ipc":
        members.push("domain-expert-memory3", "performance-lead");
        break;
      case "storage":
        members.push("infrastructure-lead", "cost-analyst");
        break;
      case "security":
        members.push("security-lead", "compliance-officer");
        break;
      case "performance":
        members.push("performance-lead", "sre-lead");
        break;
      case "architecture":
        members.push("domain-expert-memory3", "domain-expert-memory4");
        break;
    }
    
    return members;
  }

  /**
   * Express-style middleware for HTTP endpoints
   */
  middleware() {
    return async (req: Request): Promise<Response | null> => {
      // Only validate POST/PUT/PATCH requests that modify state
      if (!["POST", "PUT", "PATCH"].includes(req.method)) {
        return null; // Continue to next handler
      }
      
      // Check if this is a claims endpoint
      const url = new URL(req.url);
      if (!url.pathname.includes("/claims/") && !url.pathname.includes("/api/control/")) {
        return null;
      }
      
      try {
        const body = await req.json();
        
        // If body contains a claim, validate it
        if (body.claim) {
          const result = await this.validateClaim(body.claim);
          
          if (result.councilRequired) {
            // Create council review
            const review = await this.escalateToCouncil(
              body.claim.id,
              "system",
              "Insufficient evidence tiers"
            );
            
            // Return 403 with fallback info
            return new Response(
              JSON.stringify({
                error: "Council review required",
                validation: result,
                review,
              }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
        
        return null; // Continue to next handler
      } catch (e) {
        // Invalid JSON, let the next handler deal with it
        return null;
      }
    };
  }

  /**
   * Get claim by ID
   */
  getClaim(id: string): TechnicalClaim | undefined {
    return this.claims.get(id);
  }

  /**
   * Get all claims
   */
  getAllClaims(): TechnicalClaim[] {
    return Array.from(this.claims.values());
  }

  /**
   * Get pending council reviews
   */
  getPendingReviews(): CouncilReview[] {
    return Array.from(this.reviews.values()).filter(
      (r) => r.status === "pending_defense" || r.status === "under_review"
    );
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let validatorInstance: EvidenceValidator | null = null;

export function getValidator(): EvidenceValidator {
  if (!validatorInstance) {
    validatorInstance = new EvidenceValidator();
  }
  return validatorInstance;
}

// ============================================================================
// Usage Example
// ============================================================================

if (import.meta.main) {
  const validator = getValidator();
  
  // Example claim validation
  const exampleClaim: TechnicalClaim = {
    id: "test-001",
    statement: "Unix sockets optimal for <1KB IPC",
    category: "ipc",
    sources: {
      t1: {
        type: "docs",
        url: "https://bun.com/docs/api/http#unix-sockets",
        version: "1.3.9",
      },
      t3: {
        benchmark: "ipc-transport.bench.ts",
        command: "bun run bench/ipc-transport.bench.ts",
        threshold: 5,
        actualValue: 0.3,
        variancePercent: 5,
      },
      t4: {
        memory: "Memory #3",
        pattern: "WR-001-S-V nested domain",
        section: "ipc-protocols",
      },
    },
    submittedBy: "test-user",
    submittedAt: new Date(),
  };
  
  validator.validateClaim(exampleClaim).then((result) => {
    console.log("\nValidation Result:");
    console.log(JSON.stringify(result, null, 2));
  });
}
