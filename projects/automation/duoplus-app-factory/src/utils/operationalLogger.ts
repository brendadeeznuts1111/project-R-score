/**
 * Operational Metrics Logger
 * Logs and displays Nebula-Flow™ performance metrics
 */

import { db } from '../database/db.js';
import chalk from 'chalk';

export interface OperationalMetrics {
  starlightIDs: number;
  orbitAssignLegs: number;
  coverStardustStatus: string;
  cometCollectSwept: number;
  cometCollectPending: number;
  cometCollectEtaMinutes: number;
  stardropYieldPct: number;
  stardropProfitUsd: number;
  blackHoleRatePct: number;
  blackHoleDisputes: number;
  eventHorizonAvgSec: number;
}

export class OperationalLogger {
  private static instance: OperationalLogger;

  private constructor() {}

  static getInstance(): OperationalLogger {
    if (!OperationalLogger.instance) {
      OperationalLogger.instance = new OperationalLogger();
    }
    return OperationalLogger.instance;
  }

  /**
   * Parse operational metrics from text input
   */
  parseMetrics(input: string): OperationalMetrics | null {
    try {
      const lines = input.trim().split('\n');

      const metrics: Partial<OperationalMetrics> = {};

      for (const line of lines) {
        const trimmed = line.trim();

        // Starlight-IDs: 120 ✔
        if (trimmed.startsWith('Starlight-IDs:')) {
          const match = trimmed.match(/Starlight-IDs:\s*(\d+)/);
          if (match) metrics.starlightIDs = parseInt(match[1]);
        }

        // Orbit-Assign™: 100 legs ✔
        else if (trimmed.startsWith('Orbit-Assign™:')) {
          const match = trimmed.match(/Orbit-Assign™:\s*(\d+)\s*legs/);
          if (match) metrics.orbitAssignLegs = parseInt(match[1]);
        }

        // Cover-Stardust™: PS5 notes ✔
        else if (trimmed.startsWith('Cover-Stardust™:')) {
          const match = trimmed.match(/Cover-Stardust™:\s*(.+?)\s*✔/);
          if (match) metrics.coverStardustStatus = match[1].trim();
        }

        // Comet-Collect™: 98/100 swept (2 pending < 15 min)
        else if (trimmed.startsWith('Comet-Collect™:')) {
          const match = trimmed.match(/Comet-Collect™:\s*(\d+)\/(\d+)\s*swept\s*\((\d+)\s*pending\s*<*\s*(\d+)\s*min\)/);
          if (match) {
            metrics.cometCollectSwept = parseInt(match[1]);
            // Total would be match[2], but we don't need it
            metrics.cometCollectPending = parseInt(match[3]);
            metrics.cometCollectEtaMinutes = parseInt(match[4]);
          }
        }

        // Stardrop™ Yield: 1.74 % → $735 profit
        else if (trimmed.startsWith('Stardrop™ Yield:')) {
          const match = trimmed.match(/Stardrop™\s*Yield:\s*([\d.]+)\s*%\s*→\s*\$([\d,]+)\s*profit/);
          if (match) {
            metrics.stardropYieldPct = parseFloat(match[1]);
            metrics.stardropProfitUsd = parseFloat(match[2].replace(',', ''));
          }
        }

        // Black-Hole-Rate™: 0.8 % (1 dispute, auto-refunded)
        else if (trimmed.startsWith('Black-Hole-Rate™:')) {
          const match = trimmed.match(/Black-Hole-Rate™:\s*([\d.]+)\s*%\s*\((\d+)\s*dispute/);
          if (match) {
            metrics.blackHoleRatePct = parseFloat(match[1]);
            metrics.blackHoleDisputes = parseInt(match[2]);
          }
        }

        // Event-Horizon™: 14 min 12 sec avg
        else if (trimmed.startsWith('Event-Horizon™:')) {
          const match = trimmed.match(/Event-Horizon™:\s*(\d+)\s*min\s*(\d+)\s*sec\s*avg/);
          if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            metrics.eventHorizonAvgSec = minutes * 60 + seconds;
          }
        }
      }

      // Validate required fields
      if (metrics.starlightIDs !== undefined &&
          metrics.orbitAssignLegs !== undefined &&
          metrics.coverStardustStatus &&
          metrics.cometCollectSwept !== undefined &&
          metrics.cometCollectPending !== undefined &&
          metrics.cometCollectEtaMinutes !== undefined &&
          metrics.stardropYieldPct !== undefined &&
          metrics.stardropProfitUsd !== undefined &&
          metrics.blackHoleRatePct !== undefined &&
          metrics.blackHoleDisputes !== undefined &&
          metrics.eventHorizonAvgSec !== undefined) {
        return metrics as OperationalMetrics;
      }

      return null;
    } catch (error) {
      console.error('Error parsing operational metrics:', error);
      return null;
    }
  }

  /**
   * Log operational metrics to database
   */
  async logMetrics(metrics: OperationalMetrics): Promise<void> {
    try {
      db.run(`
        INSERT INTO operational_metrics (
          starlight_ids, orbit_assign_legs, cover_stardust_status,
          comet_collect_swept, comet_collect_pending, comet_collect_eta,
          stardrop_yield_pct, stardrop_profit_usd,
          black_hole_rate_pct, black_hole_disputes, event_horizon_avg_sec
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        metrics.starlightIDs,
        metrics.orbitAssignLegs,
        metrics.coverStardustStatus,
        metrics.cometCollectSwept,
        metrics.cometCollectPending,
        metrics.cometCollectEtaMinutes,
        metrics.stardropYieldPct,
        metrics.stardropProfitUsd,
        metrics.blackHoleRatePct,
        metrics.blackHoleDisputes,
        metrics.eventHorizonAvgSec
      ]);

      console.log(chalk.green('✅ Operational metrics logged to database'));
    } catch (error) {
      console.error('❌ Error logging operational metrics:', error);
      throw error;
    }
  }

  /**
   * Display metrics in a formatted dashboard
   */
  displayMetrics(metrics: OperationalMetrics): void {
    console.clear();
    console.log(chalk.hex("#FF6B35").bold(`
╔══════════════════════════════════════════════╗
║     🌌 NEBULA-FLOW™ OPERATIONAL STATUS       ║
║        Real-time Performance Metrics         ║
╚══════════════════════════════════════════════╝
`));

    console.log(chalk.blue.bold("📊 Core Metrics"));
    console.log(`  Starlight-IDs: ${metrics.starlightIDs} ${chalk.green('✔')}`);
    console.log(`  Orbit-Assign™: ${metrics.orbitAssignLegs} legs ${chalk.green('✔')}`);
    console.log(`  Cover-Stardust™: ${metrics.coverStardustStatus} ${chalk.green('✔')}`);
    console.log("");

    console.log(chalk.cyan.bold("💫 Collection Status"));
    console.log(`  Comet-Collect™: ${metrics.cometCollectSwept}/100 swept (${metrics.cometCollectPending} pending < ${metrics.cometCollectEtaMinutes} min)`);
    console.log("");

    console.log(chalk.green.bold("💰 Yield Performance"));
    console.log(`  Stardrop™ Yield: ${metrics.stardropYieldPct}% → $${metrics.stardropProfitUsd.toLocaleString()} profit`);
    console.log("");

    console.log(chalk.red.bold("⚠️ Risk Management"));
    console.log(`  Black-Hole-Rate™: ${metrics.blackHoleRatePct}% (${metrics.blackHoleDisputes} dispute${metrics.blackHoleDisputes !== 1 ? 's' : ''}, auto-refunded)`);
    console.log("");

    console.log(chalk.yellow.bold("⏱️ Performance"));
    const minutes = Math.floor(metrics.eventHorizonAvgSec / 60);
    const seconds = metrics.eventHorizonAvgSec % 60;
    console.log(`  Event-Horizon™: ${minutes} min ${seconds} sec avg`);
    console.log("");

    // Performance indicators
    console.log(chalk.gray.bold("📈 Health Indicators"));
    const yieldHealth = metrics.stardropYieldPct >= 1.5 ? chalk.green('✅') : chalk.yellow('⚠️');
    const disputeHealth = metrics.blackHoleRatePct <= 1.0 ? chalk.green('✅') : chalk.red('❌');
    const etaHealth = metrics.cometCollectEtaMinutes <= 15 ? chalk.green('✅') : chalk.yellow('⚠️');

    console.log(`  Yield Health: ${yieldHealth} (${metrics.stardropYieldPct}% target: ≥1.5%)`);
    console.log(`  Dispute Health: ${disputeHealth} (${metrics.blackHoleRatePct}% target: ≤1.0%)`);
    console.log(`  ETA Health: ${etaHealth} (${metrics.cometCollectEtaMinutes}min target: ≤15min)`);
    console.log("");

    console.log(chalk.gray(`⏰ Logged: ${new Date().toLocaleString()} | Status: ${chalk.green('OPERATIONAL')}`));
  }

  /**
   * Get latest metrics from database
   */
  async getLatestMetrics(): Promise<OperationalMetrics | null> {
    try {
      const result = db.query(`
        SELECT * FROM operational_metrics
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) return null;

      const row = rows[0];
      return {
        starlightIDs: row.starlight_ids,
        orbitAssignLegs: row.orbit_assign_legs,
        coverStardustStatus: row.cover_stardust_status,
        cometCollectSwept: row.comet_collect_swept,
        cometCollectPending: row.comet_collect_pending,
        cometCollectEtaMinutes: row.comet_collect_eta,
        stardropYieldPct: row.stardrop_yield_pct,
        stardropProfitUsd: row.stardrop_profit_usd,
        blackHoleRatePct: row.black_hole_rate_pct,
        blackHoleDisputes: row.black_hole_disputes,
        eventHorizonAvgSec: row.event_horizon_avg_sec
      };
    } catch (error) {
      console.error('Error retrieving latest metrics:', error);
      return null;
    }
  }

  /**
   * Process and log metrics from text input
   */
  async processMetricsReport(report: string): Promise<void> {
    const metrics = this.parseMetrics(report);
    if (!metrics) {
      console.error('❌ Failed to parse metrics report');
      return;
    }

    await this.logMetrics(metrics);
    this.displayMetrics(metrics);
  }
}

export default OperationalLogger;