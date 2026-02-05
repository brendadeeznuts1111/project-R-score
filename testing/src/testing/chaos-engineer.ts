import { type ChaosScenario, type ResilienceScore } from "../types";

/**
 * 🌪️ Chaos Tester Module
 * Orchestrates failure scenarios to measure system resilience.
 */
export class ChaosTester {
  private scenarios: Map<string, ChaosScenario> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.registerScenario({
      name: "latency_simulation",
      execute: async () => {
        console.log("🌊 Injecting 500ms network latency simulation...");
        process.env.CHAOS_LATENCY = "500";
        // Simulate a period of instability
        await Bun.sleep(3000);
        process.env.CHAOS_LATENCY = "0";
      }
    });

    this.registerScenario({
      name: "proxy_failure",
      execute: async () => {
        console.log("🔥 Triggering proxy failure wave...");
        process.env.PROXY_FAIL_RATE = "0.8"; // 80% failure rate
        await Bun.sleep(4000);
        process.env.PROXY_FAIL_RATE = "0.05"; // Back to normal 5%
      }
    });

    this.registerScenario({
      name: "rate_limit_storm",
      execute: async () => {
        console.log("⚡ Simulating rate limit storm...");
        process.env.SIMULATE_RATE_LIMITS = "true";
        await Bun.sleep(2000);
        process.env.SIMULATE_RATE_LIMITS = "false";
      }
    });
  }

  registerScenario(scenario: ChaosScenario) {
    this.scenarios.set(scenario.name, scenario);
  }

  async runChaosTest(scenarioName: string): Promise<ResilienceScore> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown chaos scenario: ${scenarioName}`);
    }

    const start = Date.now();
    await scenario.execute();
    const end = Date.now();

    const recoveryTime = end - start;
    
    // Heuristic resilience score calculation
    let score = 100;
    if (recoveryTime > 5000) score -= 30;
    if (recoveryTime > 2000) score -= 10;
    
    const recommendations = [];
    if (score < 90) recommendations.push("Increase timeout budgets for downstream services");
    if (recoveryTime > 3000) recommendations.push("Implement circuit breakers for proxy connections");

    return {
      score,
      recoveryTime,
      recommendations
    };
  }

  getScenarios(): string[] {
    return Array.from(this.scenarios.keys());
  }
}
