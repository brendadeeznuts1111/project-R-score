import { type Anomaly } from "../types";

/**
 * 📈 Anomaly Monitor Module
 * Translates system anomalies into actionable executive insights.
 */
export class AnomalyMonitor {
  private activeAnomalies: Anomaly[] = [];

  constructor() {
    // Initial scan
    this.scanForAnomalies();
  }

  /**
   * Scans system state for active anomalies
   */
  public scanForAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check Latency
    const latency = parseInt(process.env.CHAOS_LATENCY || "0") || parseInt(process.env.CURRENT_LATENCY || "120");
    if (latency > 500) {
      anomalies.push({
        type: "Latency Violation",
        severity: latency > 1000 ? "critical" : "high",
        metric: "p95_latency",
        threshold: 500,
        actual: latency,
        recommendation: "Scale out proxy nodes and check downstream connectivity."
      });
    }

    // Check Proxy Status
    const proxyFailRate = parseFloat(process.env.PROXY_FAIL_RATE || "0.05");
    if (proxyFailRate > 0.2) {
      anomalies.push({
        type: "Proxy Instability",
        severity: proxyFailRate > 0.5 ? "critical" : "medium",
        metric: "proxy_success_rate",
        threshold: 0.8,
        actual: 1 - proxyFailRate,
        recommendation: "Trigger automatic proxy pool rotation."
      });
    }

    // Check Rate Limits
    if (process.env.SIMULATE_RATE_LIMITS === "true") {
      anomalies.push({
        type: "Throughput Throttling",
        severity: "medium",
        metric: "rate_limit_hits",
        threshold: 100,
        actual: 450,
        recommendation: "Adjust token bucket size or increase account distribution."
      });
    }

    this.activeAnomalies = anomalies;
    return anomalies;
  }

  /**
   * Generates a formatted report for the terminal
   */
  public displayRealTimeAnomalies(): string {
    const anomalies = this.scanForAnomalies();
    
    if (anomalies.length === 0) {
      return "✅ System Healthy: No active anomalies detected.";
    }

    let output = "\n🚨 ACTIVE SYSTEM ANOMALIES\n";
    output += "==========================\n";

    anomalies.forEach((a) => {
      const icon = a.severity === "critical" ? "🛑" : a.severity === "high" ? "🟠" : "🟡";
      output += `${icon} [${a.severity.toUpperCase()}] ${a.type}\n`;
      output += `   Metric: ${a.metric} | Actual: ${a.actual} (Threshold: ${a.threshold})\n`;
      output += `   💡 Rec: ${a.recommendation}\n\n`;
    });

    return output;
  }

  public getAnomalies(): Anomaly[] {
    return this.activeAnomalies;
  }
}
