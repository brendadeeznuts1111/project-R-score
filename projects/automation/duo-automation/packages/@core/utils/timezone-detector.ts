/**
 * 🕵️ TimezoneDetector
 * Provides real-time visibility into the system's current TZ state
 * and its impact on Date instances.
 */
export class TimezoneDetector {
  /**
   * Get current TZ settings
   */
  static getContext() {
    const now = new Date();
    return {
      systemTZ: process.env.TZ || "SYSTEM (DEFAULT)",
      localTime: now.toLocaleString(),
      utcTime: now.toISOString(),
      offsetMinutes: now.getTimezoneOffset(),
      isUTC: now.getTimezoneOffset() === 0,
      hours: now.getHours()
    };
  }

  /**
   * Log regional context for audit logs
   */
  static logRegionalContext(label: string = "AUDIT"): void {
    const ctx = this.getContext();
    console.log(`🌍 [${label}] Node TZ: ${ctx.systemTZ} | Local: ${ctx.localTime} | Offset: ${ctx.offsetMinutes}m`);
  }
}