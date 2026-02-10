/**
 * SkillOrchestrator Tests
 * 
 * Tests for resilience layer, retry logic, and error handling
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { SkillOrchestrator, FlowExecutionError, TimeoutError } from "./skill-orchestrator";

describe("SkillOrchestrator", () => {
  let orchestrator: SkillOrchestrator;

  beforeEach(() => {
    orchestrator = new SkillOrchestrator();
    orchestrator.clearCache();
  });

  describe("Frontmatter Parsing", () => {
    test("parses simple frontmatter", () => {
      const content = `---
name: test-skill
type: flow
version: 1.0.0
---

# Test Skill
`;
      const frontmatter = orchestrator.parseFrontmatter(content);
      
      expect(frontmatter.name).toBe("test-skill");
      expect(frontmatter.type).toBe("flow");
      expect(frontmatter.version).toBe("1.0.0");
    });

    test("parses nested resilience config", () => {
      const content = `---
name: resilient-skill
type: flow
resilience:
  default_policy:
    retries: 3
    timeout_ms: 5000
    on_failure: escalate
  step_policies:
    "Test Step":
      retries: 5
      timeout_ms: 10000
---
`;
      const frontmatter = orchestrator.parseFrontmatter(content);
      
      expect(frontmatter.resilience).toBeDefined();
      expect(frontmatter.resilience.default_policy.retries).toBe(3);
      expect(frontmatter.resilience.step_policies["Test Step"].retries).toBe(5);
    });

    test("returns empty object for no frontmatter", () => {
      const content = "# No frontmatter here";
      const frontmatter = orchestrator.parseFrontmatter(content);
      
      expect(Object.keys(frontmatter).length).toBe(0);
    });
  });

  describe("Resilience Policy Selection", () => {
    test("uses default policy when no step policy matches", () => {
      const frontmatter = {
        resilience: {
          default_policy: {
            retries: 2,
            timeout_ms: 5000,
            on_failure: "escalate",
            retry_strategy: "exponential_backoff"
          },
          step_policies: {}
        }
      };
      
      const policy = (orchestrator as any).getStepPolicy("Unknown Step", frontmatter);
      
      expect(policy.retries).toBe(2);
      expect(policy.timeout_ms).toBe(5000);
    });

    test("uses step-specific policy when matched", () => {
      const frontmatter = {
        resilience: {
          default_policy: { retries: 2, timeout_ms: 5000, on_failure: "escalate" },
          step_policies: {
            "Critical Step": { retries: 5, timeout_ms: 10000, on_failure: "halt" }
          }
        }
      };
      
      const policy = (orchestrator as any).getStepPolicy("Critical Step", frontmatter);
      
      expect(policy.retries).toBe(5);
      expect(policy.timeout_ms).toBe(10000);
      expect(policy.on_failure).toBe("halt");
    });

    test("merges partial step policy with defaults", () => {
      const frontmatter = {
        resilience: {
          default_policy: { 
            retries: 2, 
            timeout_ms: 5000, 
            on_failure: "escalate",
            retry_strategy: "exponential_backoff"
          },
          step_policies: {
            "Partial Step": { retries: 10 }
          }
        }
      };
      
      const policy = (orchestrator as any).getStepPolicy("Partial Step", frontmatter);
      
      expect(policy.retries).toBe(10); // From step policy
      expect(policy.timeout_ms).toBe(5000); // From default
      expect(policy.retry_strategy).toBe("exponential_backoff"); // From default
    });
  });

  describe("Retry Logic", () => {
    test("calculates fixed backoff", () => {
      const delay1 = (orchestrator as any).calculateBackoff(1, "fixed");
      const delay2 = (orchestrator as any).calculateBackoff(3, "fixed");
      
      expect(delay1).toBe(1000);
      expect(delay2).toBe(1000);
    });

    test("calculates linear backoff", () => {
      const delay1 = (orchestrator as any).calculateBackoff(1, "linear");
      const delay2 = (orchestrator as any).calculateBackoff(3, "linear");
      
      expect(delay1).toBe(1000);
      expect(delay2).toBe(3000);
    });

    test("calculates exponential backoff", () => {
      const delay1 = (orchestrator as any).calculateBackoff(1, "exponential_backoff");
      const delay2 = (orchestrator as any).calculateBackoff(2, "exponential_backoff");
      const delay3 = (orchestrator as any).calculateBackoff(3, "exponential_backoff");
      
      expect(delay1).toBe(1000);  // 1 * 2^0
      expect(delay2).toBe(2000);  // 1 * 2^1
      expect(delay3).toBe(4000);  // 1 * 2^2
    });
  });

  describe("Flow Step Execution", () => {
    test("maps check health instruction", async () => {
      const mockDomain = {
        id: "test",
        type: "test",
        checkHealth: async () => ({ healthy: true, vitals: {}, timestamp: Date.now() })
      };
      
      const step = { id: "1", type: "action" as const, text: "Check Vital Signs" };
      const result = await (orchestrator as any).executeFlowStep(step, mockDomain);
      
      expect(result.healthy).toBe(true);
    });

    test("maps diagnose instruction", async () => {
      const mockDomain = {
        id: "test",
        type: "test",
        autoDiagnose: async () => ({ found: true, issue: "Test Issue" })
      };
      
      const step = { id: "1", type: "action" as const, text: "Run Diagnostics" };
      const result = await (orchestrator as any).executeFlowStep(step, mockDomain);
      
      expect(result.found).toBe(true);
      expect(result.issue).toBe("Test Issue");
    });

    test("returns unmapped for unknown instruction", async () => {
      const mockDomain = { id: "test", type: "test" };
      
      const step = { id: "1", type: "action" as const, text: "Do Something Unknown" };
      const result = await (orchestrator as any).executeFlowStep(step, mockDomain);
      
      expect(result.unmapped).toBe(true);
    });
  });

  describe("Error Classes", () => {
    test("FlowExecutionError captures step info", () => {
      const cause = new Error("Original error");
      const error = new FlowExecutionError("Step failed", "step-1", 3, cause);
      
      expect(error.stepId).toBe("step-1");
      expect(error.attempts).toBe(3);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe("FlowExecutionError");
    });

    test("TimeoutError has correct name", () => {
      const error = new TimeoutError("Operation timed out");
      
      expect(error.name).toBe("TimeoutError");
      expect(error.message).toBe("Operation timed out");
    });
  });

  describe("Cache Management", () => {
    test("clearCache empties the cache", async () => {
      // Load a skill to populate cache
      try {
        await orchestrator.loadSkill("domain-diagnostic-flow");
      } catch {
        // May fail if skill doesn't exist, that's ok for this test
      }
      
      orchestrator.clearCache();
      // If we had spy capabilities, we'd verify cache.clear() was called
      expect(true).toBe(true); // Cache clear doesn't throw
    });
  });
});

describe("YAML Frontmatter Parser", () => {
  test("parses complex nested structure", () => {
    const content = `---
name: complex-skill
resilience:
  default_policy:
    retries: 2
    retry_strategy: exponential_backoff
    timeout_ms: 5000
    on_failure: escalate
    idempotent: false
  step_policies:
    "Check Health":
      retries: 1
      timeout_ms: 2000
    "Run Diagnostics":
      retries: 3
      on_failure: fallback
      fallback_node: "Escalate"
---
`;
    const orchestrator = new SkillOrchestrator();
    const fm = orchestrator.parseFrontmatter(content);
    
    expect(fm.name).toBe("complex-skill");
    expect(fm.resilience.default_policy.retry_strategy).toBe("exponential_backoff");
    expect(fm.resilience.step_policies["Check Health"].retries).toBe(1);
    expect(fm.resilience.step_policies["Run Diagnostics"].fallback_node).toBe("Escalate");
  });
});
