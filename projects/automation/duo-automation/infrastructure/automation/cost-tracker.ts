// cost-tracker.ts
import { secrets } from "bun";
import { Database } from "bun:sqlite";
import { PATHS } from "./utils/constants.js";

interface CostTrackerConfig {
  enterpriseId: string;
  serviceName: string;
  budgetLimit?: number;
  alertThreshold?: number;
}

interface ProvisioningRecord {
  deviceId: string;
  region: string;
  androidVersion: string;
  timestamp: Date;
}

// Pricing per hour (example rates - adjust based on actual DuoPlus pricing)
const PRICING = {
  "us-west": { base: 0.10, android10: 0.10, android11: 0.12, android12B: 0.15 },
  "us-east": { base: 0.10, android10: 0.10, android11: 0.12, android12B: 0.15 },
  "eu-west": { base: 0.12, android10: 0.12, android11: 0.14, android12B: 0.17 },
  "eu-central": { base: 0.12, android10: 0.12, android11: 0.14, android12B: 0.17 },
  "asia-pacific": { base: 0.11, android10: 0.11, android11: 0.13, android12B: 0.16 }
};

const DEFAULT_REGION = "us-west";

export class CostTracker {
  private config: CostTrackerConfig;
  private db: Database;

  constructor(config: CostTrackerConfig) {
    this.config = config;
    this.db = new Database(`${PATHS.LOGS_DIR}/costs-${config.enterpriseId}.db`);
    this.initDatabase();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS provisioning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        region TEXT NOT NULL,
        android_version TEXT NOT NULL,
        provisioned_at INTEGER NOT NULL,
        decommissioned_at INTEGER,
        hours_used REAL DEFAULT 0,
        cost REAL DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_device_id ON provisioning(device_id);
      CREATE INDEX IF NOT EXISTS idx_provisioned_at ON provisioning(provisioned_at);
      CREATE INDEX IF NOT EXISTS idx_region ON provisioning(region);
    `);
  }

  /**
   * Record device provisioning
   */
  async recordProvisioning(record: ProvisioningRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO provisioning (device_id, region, android_version, provisioned_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(
      record.deviceId,
      record.region,
      record.androidVersion,
      record.timestamp.getTime()
    );
  }

  /**
   * Record device decommissioning
   */
  async recordDecommissioning(deviceId: string): Promise<void> {
    const device = this.db.prepare(`
      SELECT region, android_version, provisioned_at
      FROM provisioning
      WHERE device_id = ? AND decommissioned_at IS NULL
    `).get(deviceId) as { region: string; android_version: string; provisioned_at: number } | undefined;

    if (!device) {
      console.warn(`Device ${deviceId} not found in cost tracking`);
      return;
    }

    const decommissionedAt = Date.now();
    const hoursUsed = (decommissionedAt - device.provisioned_at) / (1000 * 60 * 60);
    const cost = this.calculateCost(device.region, device.android_version, hoursUsed);

    this.db.prepare(`
      UPDATE provisioning
      SET decommissioned_at = ?, hours_used = ?, cost = ?
      WHERE device_id = ?
    `).run(decommissionedAt, hoursUsed, cost, deviceId);
  }

  /**
   * Get estimated cost for provisioning
   */
  async getEstimatedCost(count: number, region: string, androidVersion: string = "12B", hours: number = 1): Promise<number> {
    const hourlyRate = this.getHourlyRate(region, androidVersion);
    return count * hourlyRate * hours;
  }

  /**
   * Get total cost for a period
   */
  async getTotalCost(period: "day" | "week" | "month" = "month"): Promise<number> {
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const result = this.db.prepare(`
      SELECT SUM(cost) as total
      FROM provisioning
      WHERE provisioned_at >= ? AND (decommissioned_at IS NULL OR decommissioned_at <= ?)
    `).get(startTime, now) as { total: number | null } | undefined;

    // Also calculate cost for active devices
    const activeDevices = this.db.prepare(`
      SELECT region, android_version, provisioned_at
      FROM provisioning
      WHERE decommissioned_at IS NULL AND provisioned_at >= ?
    `).all(startTime) as Array<{ region: string; android_version: string; provisioned_at: number }>;

    let activeCost = 0;
    for (const device of activeDevices) {
      const hoursUsed = (now - device.provisioned_at) / (1000 * 60 * 60);
      activeCost += this.calculateCost(device.region, device.android_version, hoursUsed);
    }

    return (result?.total || 0) + activeCost;
  }

  /**
   * Get detailed cost report
   */
  async getReport(period: "day" | "week" | "month" = "month"): Promise<{
    total: number;
    byRegion: Record<string, number>;
    byProfile: Record<string, number>;
    breakdown: Array<{ deviceId: string; cost: number; region: string; timestamp: Date }>;
  }> {
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const records = this.db.prepare(`
      SELECT device_id, region, android_version, provisioned_at, decommissioned_at, cost, hours_used
      FROM provisioning
      WHERE provisioned_at >= ?
      ORDER BY provisioned_at DESC
    `).all(startTime) as Array<{
      device_id: string;
      region: string;
      android_version: string;
      provisioned_at: number;
      decommissioned_at: number | null;
      cost: number;
      hours_used: number;
    }>;

    // Calculate costs for active devices
    const breakdown: Array<{ deviceId: string; cost: number; region: string; timestamp: Date }> = [];
    const byRegion: Record<string, number> = {};
    const byProfile: Record<string, number> = {}; // Would need profile mapping

    let total = 0;

    for (const record of records) {
      let cost = record.cost;
      
      // If device is still active, calculate current cost
      if (!record.decommissioned_at) {
        const hoursUsed = (now - record.provisioned_at) / (1000 * 60 * 60);
        cost = this.calculateCost(record.region, record.android_version, hoursUsed);
      }

      total += cost;
      byRegion[record.region] = (byRegion[record.region] || 0) + cost;

      breakdown.push({
        deviceId: record.device_id,
        cost,
        region: record.region,
        timestamp: new Date(record.provisioned_at)
      });
    }

    return {
      total,
      byRegion,
      byProfile, // Would need to join with device metadata
      breakdown
    };
  }

  private calculateCost(region: string, androidVersion: string, hours: number): number {
    const hourlyRate = this.getHourlyRate(region, androidVersion);
    return hourlyRate * hours;
  }

  private getHourlyRate(region: string, androidVersion: string): number {
    const regionPricing = PRICING[region as keyof typeof PRICING] || PRICING[DEFAULT_REGION];
    
    switch (androidVersion) {
      case "10":
        return regionPricing.android10;
      case "11":
        return regionPricing.android11;
      case "12B":
        return regionPricing.android12B;
      default:
        return regionPricing.base;
    }
  }

  /**
   * Check if budget threshold is exceeded
   */
  async checkBudgetThreshold(): Promise<{ exceeded: boolean; current: number; limit: number }> {
    if (!this.config.budgetLimit) {
      return { exceeded: false, current: 0, limit: 0 };
    }

    const current = await this.getTotalCost("month");
    const threshold = this.config.alertThreshold 
      ? this.config.budgetLimit * (this.config.alertThreshold / 100)
      : this.config.budgetLimit * 0.8; // Default 80% threshold

    return {
      exceeded: current >= threshold,
      current,
      limit: this.config.budgetLimit
    };
  }
}
