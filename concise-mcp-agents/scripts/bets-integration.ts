#!/usr/bin/env bun

// [BETS][INTEGRATE][PLIVE][BETS-INT-001][v3.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-BI1][v3.0.0][ACTIVE]

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import { join } from "path";
import { YAML } from "bun";

interface BetEvent {
  event: string;
  bet_type: string;
  volume: number;
  time: number;
  outcome: string;
  agent?: string;
  odds?: number;
  player?: string;
}

interface BetsConfig {
  plive: {
    endpoint: string;
    filters: {
      minVolume: number;
      maxTimeUntilScore: number;
      dateFilterBy: string;
    };
    cron: string;
    thresholds: {
      volume_alert: number;
      max_bets_day: number;
    };
    auth?: {
      token?: string;
    };
  };
  etl: {
    input: string;
    output: string;
    rules: string[];
  };
}

class BetsIntegrationSystem {
  private config: BetsConfig;
  private configFile = 'config/bets-integrate.yaml';

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const defaultConfig: BetsConfig = {
      plive: {
        endpoint: "https://plive.sportswidgets.pro/api/bet-history",
        filters: {
          minVolume: 0,
          maxTimeUntilScore: 0,
          dateFilterBy: "calcTime"
        },
        cron: "0 * * * *",
        thresholds: {
          volume_alert: 5000,
          max_bets_day: 1000
        },
        auth: {
          token: process.env.PLIVE_API_TOKEN
        }
      },
      etl: {
        input: "bets-plive.json",
        output: "bets.yaml",
        rules: ["DATA-FRESH-001", "BETS-VOL-001"]
      }
    };

    if (existsSync(this.configFile)) {
      try {
        const customConfig = YAML.parse(readFileSync(this.configFile, 'utf-8'));
        this.config = { ...defaultConfig, ...customConfig };
      } catch {
        this.config = defaultConfig;
      }
    } else {
      this.config = defaultConfig;
      // Save default config
      writeFileSync(this.configFile, YAML.stringify(this.config));
    }
  }

  async fetchPliveBets(from?: number, to?: number, url?: string): Promise<BetEvent[]> {
    const targetUrl = url || this.buildPliveUrl(from, to);

    console.log(`📡 Fetching bets from: ${targetUrl}`);

    try {
      const headers: Record<string, string> = {};
      if (this.config.plive.auth?.token) {
        headers['Authorization'] = `Bearer ${this.config.plive.auth.token}`;
      }

      const response = await fetch(targetUrl, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse plive format (adapt based on actual API response)
      const events: BetEvent[] = data.events?.map((event: any) => ({
        event: event.name || event.event,
        bet_type: event.type || event.betType,
        volume: parseFloat(event.volume || event.totalVolume || 0),
        time: event.calcTime || event.timestamp || Date.now() / 1000,
        outcome: event.status || event.outcome || "Pending",
        agent: event.agent,
        odds: event.odds,
        player: event.player
      })) || [];

      console.log(`✅ Fetched ${events.length} bet events`);
      return events;

    } catch (error) {
      console.error(`❌ Failed to fetch bets: ${error.message}`);
      return [];
    }
  }

  private buildPliveUrl(from?: number, to?: number): string {
    const baseUrl = this.config.plive.endpoint;
    const params = new URLSearchParams();

    params.append('minVolume', this.config.plive.filters.minVolume.toString());
    params.append('maxTimeUntilScore', this.config.plive.filters.maxTimeUntilScore.toString());
    params.append('dateFilterBy', this.config.plive.filters.dateFilterBy);

    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());

    // Add current timestamp for freshness
    params.append('t', Date.now().toString());

    return `${baseUrl}?${params.toString()}`;
  }

  async processBetsToYAML(bets: BetEvent[]): Promise<void> {
    const yamlFile = this.config.etl.output;

    // Load existing bets or create empty structure
    let existingData: { bets: BetEvent[] } = { bets: [] };

    if (existsSync(yamlFile)) {
      try {
        existingData = YAML.parse(readFileSync(yamlFile, 'utf-8')) || { bets: [] };
      } catch {
        console.warn(`⚠️  Could not parse existing ${yamlFile}, starting fresh`);
      }
    }

    // Append new bets (avoid duplicates by time + event)
    const existingKeys = new Set(
      existingData.bets.map(bet => `${bet.time}-${bet.event}`)
    );

    const newBets = bets.filter(bet => {
      const key = `${bet.time}-${bet.event}`;
      return !existingKeys.has(key);
    });

    if (newBets.length === 0) {
      console.log(`ℹ️  No new bets to add`);
      return;
    }

    existingData.bets.push(...newBets);

    // Write back to YAML
    writeFileSync(yamlFile, YAML.stringify(existingData));
    console.log(`✅ Added ${newBets.length} new bets to ${yamlFile}`);

    // Check for volume alerts
    await this.checkVolumeAlerts(newBets);
  }

  private async checkVolumeAlerts(bets: BetEvent[]): Promise<void> {
    const threshold = this.config.plive.thresholds.volume_alert;

    const highVolumeBets = bets.filter(bet => bet.volume > threshold);

    if (highVolumeBets.length > 0) {
      console.log(`🚨 Volume alerts triggered for ${highVolumeBets.length} bets`);

      for (const bet of highVolumeBets) {
        const alertMessage = `💥 *Volume Spike Alert*\n\n` +
          `Event: ${bet.event}\n` +
          `Type: ${bet.bet_type}\n` +
          `Volume: $${bet.volume.toLocaleString()}\n` +
          `Time: ${new Date(bet.time * 1000).toISOString()}\n` +
          `Outcome: ${bet.outcome}`;

        // Log to audit
        await this.logBetAlert(bet, 'VOLUME_SPIKE');

        // Send Telegram alert
        try {
          const { spawn } = await import('child_process');
          spawn('bun', ['telegram:send', alertMessage], {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch {
          console.warn(`⚠️  Could not send Telegram alert`);
        }
      }
    }
  }

  private async logBetAlert(bet: BetEvent, alertType: string): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      const alertData = `${alertType}|${bet.event}|${bet.volume}|${bet.time}`;
      spawn('bun', ['audit:log', 'SYSTEM', alertType, 'BETS', alertData], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
    } catch {
      // Silent fail for logging
    }
  }

  async runETL(bets?: BetEvent[]): Promise<void> {
    if (bets) {
      // Use provided bets
      await this.processBetsToYAML(bets);
    } else {
      // Fetch fresh bets
      const freshBets = await this.fetchPliveBets();
      await this.processBetsToYAML(freshBets);
    }

    // Run validation rules
    for (const rule of this.config.etl.rules) {
      try {
        const { spawn } = await import('child_process');
        spawn('bun', ['rules:enforce', rule], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch {
        console.warn(`⚠️  Could not enforce rule: ${rule}`);
      }
    }

    // WS push
    try {
      const { spawn } = await import('child_process');
      spawn('bun', ['ws:push', 'bets/update', 'Bets updated'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
    } catch {
      console.warn(`⚠️  Could not push WS update`);
    }
  }

  async integratePlive(url?: string, from?: number, to?: number): Promise<void> {
    console.log(`🚀 Starting plive integration...`);

    // Fetch bets
    const bets = await this.fetchPliveBets(from, to, url);

    if (bets.length === 0) {
      console.log(`ℹ️  No bets found`);
      return;
    }

    // Process through ETL
    await this.runETL(bets);

    console.log(`✅ plive integration complete: ${bets.length} events processed`);
  }

  async exportToCSV(date?: string): Promise<string> {
    const yamlFile = this.config.etl.output;

    if (!existsSync(yamlFile)) {
      throw new Error(`Bets file not found: ${yamlFile}`);
    }

    const data = YAML.parse(readFileSync(yamlFile, 'utf-8'));
    const bets: BetEvent[] = data.bets || [];

    // Filter by date if provided
    let filteredBets = bets;
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      filteredBets = bets.filter(bet => {
        const betDate = new Date(bet.time * 1000);
        return betDate >= startOfDay && betDate <= endOfDay;
      });
    }

    // Generate CSV
    const csvHeader = 'Event,Bet Type,Volume,Time,Outcome,Agent,Odds,Player\n';
    const csvRows = filteredBets.map(bet =>
      `"${bet.event}","${bet.bet_type}",${bet.volume},"${new Date(bet.time * 1000).toISOString()}",${bet.outcome},"${bet.agent || ''}",${bet.odds || ''},"${bet.player || ''}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    // Save to file
    const csvFile = `exports/bets-${date || 'all'}.csv`;
    writeFileSync(csvFile, csvContent);

    console.log(`✅ Exported ${filteredBets.length} bets to ${csvFile}`);
    return csvFile;
  }

  getStats(): { totalBets: number; totalVolume: number; alertsTriggered: number; lastSync: string } {
    try {
      const yamlFile = this.config.etl.output;
      if (!existsSync(yamlFile)) {
        return { totalBets: 0, totalVolume: 0, alertsTriggered: 0, lastSync: 'Never' };
      }

      const data = YAML.parse(readFileSync(yamlFile, 'utf-8'));
      const bets: BetEvent[] = data.bets || [];

      const totalVolume = bets.reduce((sum, bet) => sum + bet.volume, 0);
      const alertsTriggered = bets.filter(bet => bet.volume > this.config.plive.thresholds.volume_alert).length;

      return {
        totalBets: bets.length,
        totalVolume,
        alertsTriggered,
        lastSync: bets.length > 0 ? new Date(Math.max(...bets.map(b => b.time * 1000))).toISOString() : 'Never'
      };
    } catch {
      return { totalBets: 0, totalVolume: 0, alertsTriggered: 0, lastSync: 'Error' };
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const bets = new BetsIntegrationSystem();

  if (args.length === 0) {
    console.log(`🏀 BETS Integration System v3.0

USAGE:
  bun bets:integrate plive [url]          # Sync from plive API
  bun bets:fetch [from] [to]               # Fetch bets (Unix timestamps)
  bun bets:etl                             # Process JSON → YAML
  bun bets:alerts                          # Check volume thresholds
  bun bets:export csv [date]               # Export to CSV
  bun bets:stats                           # Show integration stats

CONFIG:
  config/bets-integrate.yaml               # Configuration file
  PLIVE_API_TOKEN                          # Environment variable

EXAMPLES:
  bun bets:integrate plive                  # Sync today's bets
  bun bets:fetch 1761627600 1761638467     # Custom date range
  bun bets:export csv "2025-10-28"         # Export specific date
  bun bets:stats                           # Show current stats

INTEGRATION:
  - Fetches from plive.sportswidgets.pro API
  - Parses bet events (soccer, eSports, etc.)
  - Appends to bets.yaml with deduplication
  - Triggers volume alerts >$5k
  - WS push to live dashboard
  - Enforces GOV rules automatically
`);
    const stats = bets.getStats();
    console.log(`\n📊 Current Stats:`);
    console.log(`   Total Bets: ${stats.totalBets}`);
    console.log(`   Total Volume: $${stats.totalVolume.toLocaleString()}`);
    console.log(`   Alerts: ${stats.alertsTriggered}`);
    console.log(`   Last Sync: ${stats.lastSync}`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'integrate':
        const url = args[1];
        await bets.integratePlive(url);
        break;

      case 'fetch':
        const from = args[1] ? parseInt(args[1]) : undefined;
        const to = args[2] ? parseInt(args[2]) : undefined;
        const fetchedBets = await bets.fetchPliveBets(from, to);
        console.log(`Fetched ${fetchedBets.length} bets`);
        // Save to temp file for ETL
        writeFileSync('bets-temp.json', JSON.stringify(fetchedBets, null, 2));
        break;

      case 'etl':
        let etlBets: BetEvent[] | undefined;
        if (existsSync('bets-temp.json')) {
          etlBets = JSON.parse(readFileSync('bets-temp.json', 'utf-8'));
        }
        await bets.runETL(etlBets);
        break;

      case 'alerts':
        // This is handled automatically in ETL, but can be run standalone
        console.log(`🔍 Volume alerts are checked during ETL process`);
        console.log(`Run: bun bets:integrate plive`);
        break;

      case 'export':
        if (args[1] === 'csv') {
          const date = args[2];
          const csvFile = await bets.exportToCSV(date);
          console.log(`📄 CSV exported: ${csvFile}`);
        } else {
          console.error('Usage: bun bets:export csv [date]');
        }
        break;

      case 'stats':
        const stats = bets.getStats();
        console.log(`📊 BETS Integration Stats:`);
        console.log(`   Total Bets: ${stats.totalBets}`);
        console.log(`   Total Volume: $${stats.totalVolume.toLocaleString()}`);
        console.log(`   Volume Alerts: ${stats.alertsTriggered}`);
        console.log(`   Last Sync: ${stats.lastSync}`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun bets --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
export { BetsIntegrationSystem };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
