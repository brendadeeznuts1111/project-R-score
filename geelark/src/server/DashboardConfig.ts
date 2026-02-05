/**
 * Custom Dashboard Configuration System
 *
 * Manages per-environment dashboard configurations
 */

import { Database } from "bun:sqlite";
import path from "node:path";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");
const DASHBOARD_DB_PATH = path.join(ROOT_DIR, "monitoring-dashboards.db");

export interface DashboardWidget {
  id: string;
  type: "summary" | "chart" | "table" | "map" | "alerts" | "geolocation" | "anomalies";
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

export interface DashboardConfig {
  id?: number;
  name: string;
  environment: string;
  widgets: DashboardWidget[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

export class DashboardConfigSystem {
  private db: Database;

  constructor(dbPath: string = DASHBOARD_DB_PATH) {
    // @ts-ignore - Using dynamic import
    const { Database } = require("bun:sqlite");
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.initializeSchema();
    this.createDefaultDashboards();
  }

  private initializeSchema(): void {
    // Dashboard configurations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        environment TEXT NOT NULL,
        widgets TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        isDefault INTEGER NOT NULL DEFAULT 0,
        UNIQUE(environment, name)
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_dashboards_environment ON dashboards(environment)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_dashboards_default ON dashboards(isDefault)`);
  }

  /**
   * Create default dashboard configurations for each environment
   */
  private createDefaultDashboards(): void {
    const environments = ["development", "staging", "production"];

    const defaultWidgets: DashboardWidget[] = [
      {
        id: "summary",
        type: "summary",
        title: "Summary Metrics",
        position: { x: 0, y: 0, w: 12, h: 4 },
        config: { showCharts: true },
      },
      {
        id: "alerts",
        type: "alerts",
        title: "Active Alerts",
        position: { x: 0, y: 4, w: 6, h: 6 },
        config: { limit: 10 },
      },
      {
        id: "top-ips",
        type: "table",
        title: "Top IPs",
        position: { x: 6, y: 4, w: 6, h: 6 },
        config: { limit: 10, showIPs: true },
      },
      {
        id: "geolocation",
        type: "geolocation",
        title: "Geographic Distribution",
        position: { x: 0, y: 10, w: 12, h: 6 },
        config: { showMap: true, showTable: true },
      },
      {
        id: "anomalies",
        type: "anomalies",
        title: "Recent Anomalies",
        position: { x: 0, y: 16, w: 12, h: 6 },
        config: { limit: 20 },
      },
    ];

    for (const env of environments) {
      const existing = this.db
        .prepare("SELECT * FROM dashboards WHERE environment = ? AND isDefault = 1")
        .get(env);

      if (!existing) {
        this.createDashboard({
          name: "Default",
          environment: env,
          widgets: defaultWidgets,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDefault: true,
        });
      }
    }
  }

  /**
   * Create a new dashboard configuration
   */
  createDashboard(config: DashboardConfig): DashboardConfig {
    const result = this.db.prepare(`
      INSERT INTO dashboards (name, environment, widgets, createdBy, createdAt, updatedAt, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      config.name,
      config.environment,
      JSON.stringify(config.widgets),
      config.createdBy,
      config.createdAt,
      config.updatedAt,
      config.isDefault ? 1 : 0
    );

    return { ...config, id: result.lastInsertRowid as number };
  }

  /**
   * Get dashboard configuration for environment
   */
  getDashboard(environment: string, name: string = "Default"): DashboardConfig | null {
    const row = this.db
      .prepare("SELECT * FROM dashboards WHERE environment = ? AND name = ?")
      .get(environment, name) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      environment: row.environment,
      widgets: JSON.parse(row.widgets),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isDefault: row.isDefault === 1,
    };
  }

  /**
   * Get all dashboards for environment
   */
  getDashboardsForEnvironment(environment: string): DashboardConfig[] {
    const rows = this.db
      .prepare("SELECT * FROM dashboards WHERE environment = ? ORDER BY isDefault DESC, updatedAt DESC")
      .all(environment) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      environment: row.environment,
      widgets: JSON.parse(row.widgets),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isDefault: row.isDefault === 1,
    }));
  }

  /**
   * Update dashboard configuration
   */
  updateDashboard(
    environment: string,
    name: string,
    updates: Partial<DashboardConfig>
  ): boolean {
    const fields = [];
    const values = [];

    if (updates.widgets !== undefined) {
      fields.push("widgets = ?");
      values.push(JSON.stringify(updates.widgets));
    }
    if (updates.updatedAt !== undefined) {
      fields.push("updatedAt = ?");
      values.push(updates.updatedAt);
    }

    if (fields.length === 0) return false;

    values.push(environment, name);

    const result = this.db
      .prepare(`UPDATE dashboards SET ${fields.join(", ")} WHERE environment = ? AND name = ?`)
      .run(...values);

    return result.changes > 0;
  }

  /**
   * Delete dashboard
   */
  deleteDashboard(environment: string, name: string): boolean {
    // Prevent deleting default dashboards
    const existing = this.getDashboard(environment, name);
    if (existing?.isDefault) {
      return false;
    }

    const result = this.db
      .prepare("DELETE FROM dashboards WHERE environment = ? AND name = ?")
      .run(environment, name);

    return result.changes > 0;
  }

  /**
   * Clone dashboard to another environment
   */
  cloneDashboard(
    sourceEnvironment: string,
    sourceName: string,
    targetEnvironment: string,
    newName: string
  ): DashboardConfig | null {
    const source = this.getDashboard(sourceEnvironment, sourceName);
    if (!source) return null;

    const clone: DashboardConfig = {
      ...source,
      name: newName,
      environment: targetEnvironment,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: false,
    };

    return this.createDashboard(clone);
  }

  /**
   * Set dashboard as default for environment
   */
  setAsDefault(environment: string, name: string): boolean {
    // Remove default flag from all dashboards in environment
    this.db.prepare("UPDATE dashboards SET isDefault = 0 WHERE environment = ?").run(environment);

    // Set new default
    const result = this.db
      .prepare("UPDATE dashboards SET isDefault = 1 WHERE environment = ? AND name = ?")
      .run(environment, name);

    return result.changes > 0;
  }

  /**
   * Export dashboard configuration as JSON
   */
  exportDashboard(environment: string, name: string): string | null {
    const dashboard = this.getDashboard(environment, name);
    if (!dashboard) return null;

    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * Import dashboard configuration from JSON
   */
  importDashboard(json: string, overrideName?: string): DashboardConfig | null {
    try {
      const config = JSON.parse(json) as DashboardConfig;

      // Validate required fields
      if (!config.name || !config.environment || !config.widgets) {
        return null;
      }

      const dashboard: DashboardConfig = {
        ...config,
        name: overrideName || config.name,
        createdBy: config.createdBy || "imported",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: false,
      };

      // Check if dashboard already exists
      const existing = this.getDashboard(dashboard.environment, dashboard.name);
      if (existing) {
        // Update existing
        this.updateDashboard(dashboard.environment, dashboard.name, {
          widgets: dashboard.widgets,
          updatedAt: Date.now(),
        });
        return this.getDashboard(dashboard.environment, dashboard.name);
      }

      // Create new
      return this.createDashboard(dashboard);
    } catch (error) {
      console.error("Failed to import dashboard:", error);
      return null;
    }
  }

  /**
   * Get widget templates
   */
  getWidgetTemplates(): DashboardWidget[] {
    return [
      {
        id: "summary",
        type: "summary",
        title: "Summary Metrics",
        position: { x: 0, y: 0, w: 12, h: 4 },
        config: { showCharts: true, showNumbers: true },
      },
      {
        id: "chart-response-times",
        type: "chart",
        title: "Response Times",
        position: { x: 0, y: 0, w: 6, h: 4 },
        config: { metric: "responseTime", chartType: "line" },
      },
      {
        id: "chart-error-rate",
        type: "chart",
        title: "Error Rate",
        position: { x: 6, y: 0, w: 6, h: 4 },
        config: { metric: "errorRate", chartType: "bar" },
      },
      {
        id: "table-top-ips",
        type: "table",
        title: "Top IPs",
        position: { x: 0, y: 4, w: 6, h: 6 },
        config: { limit: 10, entityType: "ips" },
      },
      {
        id: "table-top-devices",
        type: "table",
        title: "Top Devices",
        position: { x: 6, y: 4, w: 6, h: 6 },
        config: { limit: 10, entityType: "devices" },
      },
      {
        id: "alerts",
        type: "alerts",
        title: "Active Alerts",
        position: { x: 0, y: 0, w: 12, h: 6 },
        config: { limit: 10, showResolved: false },
      },
      {
        id: "geolocation",
        type: "geolocation",
        title: "Geographic Distribution",
        position: { x: 0, y: 0, w: 12, h: 6 },
        config: { showMap: true, showTable: true, limit: 20 },
      },
      {
        id: "anomalies",
        type: "anomalies",
        title: "Recent Anomalies",
        position: { x: 0, y: 0, w: 12, h: 6 },
        config: { limit: 20, type: "all" },
      },
      {
        id: "endpoints",
        type: "table",
        title: "Endpoint Statistics",
        position: { x: 0, y: 0, w: 12, h: 6 },
        config: { limit: 20, entityType: "endpoints" },
      },
    ];
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
