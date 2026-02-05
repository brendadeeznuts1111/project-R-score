import { type QualityGate, type QualityGateResult } from "../types";

/**
 * 🛡️ Quality Gatekeeper Module
 * Enforces production standards and protects system integrity.
 */
export class QualityGate {
  private gates: Map<string, QualityGate> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.registerGate({
      name: "Success Rate",
      check: async () => {
        // Mock check against env or state
        const rate = parseFloat(process.env.CURRENT_SUCCESS_RATE || "0.98");
        return rate >= 0.95;
      },
      message: "Success rate must be ≥ 95%"
    });

    this.registerGate({
      name: "Latency Baseline",
      check: async () => {
        const latency = parseInt(process.env.CURRENT_LATENCY || "120");
        return latency < 500;
      },
      message: "P95 Latency must be < 500ms"
    });

    this.registerGate({
      name: "Error Budget",
      check: async () => {
        const errors = parseInt(process.env.MINUTE_ERROR_COUNT || "5");
        return errors < 50;
      },
      message: "Error count must be < 50 per minute"
    });
  }

  registerGate(gate: QualityGate) {
    this.gates.set(gate.name, gate);
  }

  async checkAllGates(): Promise<QualityGateResult[]> {
    const results: QualityGateResult[] = [];
    
    for (const [id, gate] of this.gates) {
      try {
        const success = await gate.check();
        results.push({
          name: gate.name,
          success,
          message: success ? "Requirement met" : gate.message
        });
      } catch (error: any) {
        results.push({
          name: gate.name,
          success: false,
          message: `Gate execution failed: ${error.message}`
        });
      }
    }

    return results;
  }
}
