/**
 * @fileoverview Connection Health Dashboard
 * @description Real-time monitoring of http.Agent connection pools and reuse metrics
 * @module monitoring/connection-dashboard
 */

import { BookmakerApiClient17 } from "../clients/BookmakerApiClient17"

export interface ConnectionHealthReport {
  timestamp: number
  bookmakers: BookmakerHealth[]
  summary: ConnectionSummary
}

export interface BookmakerHealth {
  name: string
  sockets: {
    total: number
    free: number
    active: number
  }
  reusedConnections: number
  errorRate: number
  health: "healthy" | "degraded" | "critical"
}

export interface ConnectionSummary {
  totalSockets: number
  freeSockets: number
  reusedConnections: number
  errors: number
}

/**
 * Connection Health Dashboard for monitoring agent pools
 */
export class ConnectionHealthDashboard {
  private agents: Map<string, BookmakerApiClient17>
  private monitoringInterval?: ReturnType<typeof setInterval>
  private alertCallbacks: Array<(report: ConnectionHealthReport) => void> = []

  constructor(agents: Map<string, BookmakerApiClient17>) {
    this.agents = agents
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    this.monitoringInterval = setInterval(() => {
      const report = this.getConnectionHealth()

      // Check for alerts
      this.checkAlerts(report)

      // Notify subscribers
      this.alertCallbacks.forEach((callback) => callback(report))
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
  }

  /**
   * Subscribe to health reports
   */
  onHealthReport(callback: (report: ConnectionHealthReport) => void): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * Get current connection health across all bookmakers
   */
  getConnectionHealth(): ConnectionHealthReport {
    const report: ConnectionHealthReport = {
      timestamp: Date.now(),
      bookmakers: [],
      summary: {
        totalSockets: 0,
        freeSockets: 0,
        reusedConnections: 0,
        errors: 0,
      },
    }

    for (const [bookmaker, client] of this.agents) {
      const stats = client.getAgentStats()

      const health: BookmakerHealth = {
        name: bookmaker,
        sockets: {
          total: stats.totalSocketCount,
          free: stats.freeSockets,
          active: stats.totalSocketCount - stats.freeSockets,
        },
        reusedConnections: stats.reusedConnections,
        errorRate: stats.totalRequests > 0 ? stats.connectionErrors / stats.totalRequests : 0,
        health: this.calculateHealthScore(stats),
      }

      report.bookmakers.push(health)

      // Update summary
      report.summary.totalSockets += health.sockets.total
      report.summary.freeSockets += health.sockets.free
      report.summary.reusedConnections += health.reusedConnections
      report.summary.errors += stats.connectionErrors
    }

    return report
  }

  /**
   * Calculate health score based on connection metrics
   */
  private calculateHealthScore(stats: any): "healthy" | "degraded" | "critical" {
    const errorRate = stats.totalRequests > 0 ? stats.connectionErrors / stats.totalRequests : 0
    const reuseRate = stats.reuseRate

    if (errorRate > 0.05) return "critical" // >5% errors
    if (reuseRate < 0.8) return "degraded" // <80% reuse
    return "healthy"
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(report: ConnectionHealthReport): void {
    const alerts: string[] = []

    // Pool exhaustion alert
    if (report.summary.freeSockets === 0 && report.summary.totalSockets > 0) {
      alerts.push(`Connection pool exhausted: 0 free sockets out of ${report.summary.totalSockets}`)
    }

    // High error rate alert
    if (report.summary.errors > report.summary.reusedConnections * 0.01) {
      alerts.push(
        `High error rate: ${report.summary.errors} errors vs ${report.summary.reusedConnections} reused connections`
      )
    }

    // Individual bookmaker alerts
    for (const bookmaker of report.bookmakers) {
      if (bookmaker.health === "critical") {
        alerts.push(
          `${bookmaker.name}: Critical health - ${bookmaker.errorRate.toFixed(3)} error rate`
        )
      } else if (bookmaker.health === "degraded") {
        alerts.push(
          `${bookmaker.name}: Degraded health - ${(bookmaker.reusedConnections / Math.max(bookmaker.sockets.total, 1)).toFixed(2)} reuse rate`
        )
      }
    }

    // Log alerts
    if (alerts.length > 0) {
      console.log(`[${new Date().toISOString()}] Connection Health Alerts:`)
      alerts.forEach((alert) => console.log(`  ⚠️  ${alert}`))
    }
  }

  /**
   * Get formatted dashboard display
   */
  getDashboardDisplay(): string {
    const report = this.getConnectionHealth()

    let output = "\n=== Connection Health Dashboard ===\n"
    output += `Timestamp: ${new Date(report.timestamp).toISOString()}\n\n`

    output += "Bookmaker Status:\n"
    for (const bookmaker of report.bookmakers) {
      const status =
        bookmaker.health === "healthy" ? "🟢" : bookmaker.health === "degraded" ? "🟡" : "🔴"
      output += `${status} ${bookmaker.name}: ${bookmaker.sockets.active}/${bookmaker.sockets.total} active sockets, `
      output += `${bookmaker.reusedConnections} reused, ${(bookmaker.errorRate * 100).toFixed(2)}% errors\n`
    }

    output += "\nSummary:\n"
    output += `Total Sockets: ${report.summary.totalSockets}\n`
    output += `Free Sockets: ${report.summary.freeSockets}\n`
    output += `Reused Connections: ${report.summary.reusedConnections}\n`
    output += `Total Errors: ${report.summary.errors}\n`

    const overallHealth = report.bookmakers.every((b) => b.health === "healthy")
      ? "🟢 HEALTHY"
      : report.bookmakers.some((b) => b.health === "critical")
        ? "🔴 CRITICAL"
        : "🟡 DEGRADED"
    output += `\nOverall Status: ${overallHealth}\n`

    return output
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): Record<string, number> {
    const report = this.getConnectionHealth()
    const metrics: Record<string, number> = {}

    // Summary metrics
    metrics.connection_pool_total_sockets = report.summary.totalSockets
    metrics.connection_pool_free_sockets = report.summary.freeSockets
    metrics.connection_pool_reused_connections = report.summary.reusedConnections
    metrics.connection_pool_errors = report.summary.errors

    // Per-bookmaker metrics
    for (const bookmaker of report.bookmakers) {
      const prefix = `bookmaker_${bookmaker.name}`
      metrics[`${prefix}_sockets_total`] = bookmaker.sockets.total
      metrics[`${prefix}_sockets_free`] = bookmaker.sockets.free
      metrics[`${prefix}_sockets_active`] = bookmaker.sockets.active
      metrics[`${prefix}_reused_connections`] = bookmaker.reusedConnections
      metrics[`${prefix}_error_rate`] = bookmaker.errorRate
      metrics[`${prefix}_health_score`] =
        bookmaker.health === "healthy" ? 2 : bookmaker.health === "degraded" ? 1 : 0
    }

    return metrics
  }
}
