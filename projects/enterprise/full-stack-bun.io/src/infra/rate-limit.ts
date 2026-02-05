import { Database } from "bun:sqlite";

export class RateLimiter {
  private db: Database;

  constructor() {
    this.db = new Database("baselines.db", { create: true });
    this.initSchema();
  }

  private initSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ip_budget (
        ip TEXT PRIMARY KEY,
        requests INTEGER DEFAULT 1,
        first_request DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_request DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  checkLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    console.log(`RateLimiter.checkLimit called for IP: ${ip}`);
    const result = this._checkLimit(ip, maxRequests, windowMs);
    console.log(`RateLimiter.checkLimit result: ${result}`);
    return result;
  }

  private _checkLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = new Date().toISOString();

    // Clean up expired entries first
    this.cleanupExpiredEntries(windowMs);

    // Get current count for this IP
    const existing = this.db
      .query("SELECT requests, first_request FROM ip_budget WHERE ip = ?")
      .get(ip) as { requests: number; first_request: string } | undefined;

    if (existing) {
      // Check if the window has expired for this IP
      const firstRequestTime = new Date(existing.first_request);
      const windowExpired = Date.now() - firstRequestTime.getTime() > windowMs;

      if (windowExpired) {
        // Reset the counter
        this.db.run(
          "UPDATE ip_budget SET requests = 1, first_request = ?, last_request = ? WHERE ip = ?",
          [now, now, ip]
        );
      } else {
        // Increment the counter
        if (existing.requests >= maxRequests) {
          return false; // Rate limited
        }
        this.db.run(
          "UPDATE ip_budget SET requests = requests + 1, last_request = ? WHERE ip = ?",
          [now, ip]
        );
      }
    } else {
      // New IP
      this.db.run(
        "INSERT INTO ip_budget (ip, requests, first_request, last_request) VALUES (?, 1, ?, ?)",
        [ip, now, now]
      );
    }

    return true;
  }

  private cleanupExpiredEntries(windowMs: number) {
    const cutoffTime = new Date(Date.now() - windowMs);
    this.db.run(
      "DELETE FROM ip_budget WHERE first_request < ?",
      [cutoffTime.toISOString()]
    );
  }

  getRemainingRequests(ip: string): number {
    const result = this.db
      .query("SELECT requests FROM ip_budget WHERE ip = ?")
      .get(ip) as { requests: number } | undefined;

    return result ? Math.max(0, 10 - result.requests) : 10;
  }
}

export const rateLimiter = new RateLimiter();
