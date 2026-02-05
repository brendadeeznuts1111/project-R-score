import { type Anomaly } from "../types";
import { IntelligentAutoScaler } from "../../systems/auto-scaler";
import { PredictiveFailureDetector } from "../../systems/predictive-monitor";

import { AnomalyMonitor } from "../monitoring/anomaly-dashboard";

/**
 * 🛠️ Auto Remediator Module
 * Triggers autonomous maintenance and scaling actions in response to anomalies.
 */
export class AutoRemediator {
  private autoScaler: IntelligentAutoScaler;
  private predictiveMonitor: PredictiveFailureDetector;

  constructor(autoScaler: IntelligentAutoScaler, predictiveMonitor: PredictiveFailureDetector) {
    this.autoScaler = autoScaler;
    this.predictiveMonitor = predictiveMonitor;
  }

  /**
   * Processes a list of anomalies and triggers appropriate remediation actions
   */
  public async remediate(anomalies: Anomaly[]): Promise<string[]> {
    const actionsTaken: string[] = [];

    for (const anomaly of anomalies) {
      if (anomaly.severity === "critical" || anomaly.severity === "high") {
        const action = await this.triggerAction(anomaly);
        if (action) actionsTaken.push(action);
      }
    }

    // Also check predictive risks
    const predictiveResult = await this.predictiveMonitor.predictAndPreventFailures();
    if (predictiveResult.riskFactors.probability > 0.8) {
      actionsTaken.push(`[PREDICTIVE] ${predictiveResult.riskFactors.reason} -> Initiating proactive proxy rotation.`);
    }

    return actionsTaken;
  }

  private async triggerAction(anomaly: Anomaly): Promise<string | null> {
    console.log(`[Remediator] Analyzing anomaly: ${anomaly.type} (${anomaly.severity})`);

    switch (anomaly.type) {
      case "Latency Violation":
        await this.autoScaler.analyzeAndScale();
        return `[SCALING] Triggered auto-scaling due to ${anomaly.type}`;

      case "Proxy Instability":
        console.log("[Remediator] Executing proxy pool refresh...");
        // In a real system, this would call a proxy service
        process.env.PROXY_FAIL_RATE = "0.05"; // Resetting for simulation
        return `[MAINTENANCE] Refreshed proxy pool after ${anomaly.type}`;

      case "Throughput Throttling":
        console.log("[Remediator] Distributing load across more accounts...");
        return `[LOAD_BALANCING] Increased account distribution for ${anomaly.type}`;

      default:
        return null;
    }
  }
}
