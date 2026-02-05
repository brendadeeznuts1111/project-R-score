import config from '../src/config/config-loader';

import { Pattern, Query as R2Query } from '../../../utils/empire-patterns.js';
import { PhoneSanitizerV2 as PhoneSanitizer } from '../filter/phone-sanitizer-v2.js';
import { NumberQualifier, type NumberIntelligence } from '../number-intelligence.js';
import { ProductionR2Manager } from '../storage/production-r2-manager.js';
import { NumberMonitor, type Watcher } from '../number-monitor.js';

export interface HealthReport {
  e164: string;
  healthScore: number;
  degradation: {
    severity: number;
    requiresRevalidation: boolean;
    changedSince?: Date;
  };
  recommendedAction: string;
  lastChecked: Date;
}

/**
 * §Workflow:97 - Number Health Monitor
 * Aggregates intelligence and detects degradation over time.
 */
export class NumberHealthMonitor extends Pattern {
  private sanitizer: PhoneSanitizer;
  private qualifier: NumberQualifier;
  private monitor: NumberMonitor;
  private r2Manager: ProductionR2Manager;
  private r2Query: R2Query;
  private interval: number;

  constructor(config: { checkInterval: string; alertThreshold: number }) {
    super({ pathname: 'monitor/:phone/:interval' });
    this.interval = this.parseDuration(config.checkInterval);
    this.sanitizer = new PhoneSanitizer();
    this.qualifier = new NumberQualifier();
    this.monitor = new NumberMonitor();
    this.r2Manager = new ProductionR2Manager();
    this.r2Query = new R2Query('health/*');
  }

  private parseDuration(val: string): number {
    if (val.endsWith('h')) return parseInt(val) * 3600000;
    if (val.endsWith('m')) return parseInt(val) * 60000;
    return parseInt(val);
  }

  override test(phone: string): boolean {
    return this.sanitizer.test(phone);
  }

  override async exec(phone: string): Promise<HealthReport> {
    const sanitized = await this.sanitizer.exec(phone);
    const intelligence = await this.qualifier.qualify(phone);

    // Historical lookup via R2
    // For this implementation, we simulate the history retrieval
    const history: any[] = []; 
    
    const degradation = this.detectDegradation(intelligence, history);
    
    if (degradation.requiresRevalidation) {
      // Logic for triggering revalidation
    }

    const report: HealthReport = {
      e164: sanitized.e164,
      healthScore: intelligence.trustScore - (degradation.severity * 10),
      degradation,
      recommendedAction: degradation.severity > 3 ? 'REPROCESS' : 'CONTINUE',
      lastChecked: new Date()
    };

    // Production storage
    await this.r2Manager.saveIntelligence(sanitized.e164, {
      ...intelligence,
      health: report,
      timestamp: Date.now()
    });

    return report;
  }

  private detectDegradation(current: NumberIntelligence, history: any[]): HealthReport['degradation'] {
    if (history.length < 2) return { severity: 0, requiresRevalidation: false };
    const previous = history[history.length - 1];
    return {
      severity: Math.max(0, previous.trustScore - current.trustScore),
      requiresRevalidation: (current.fraudScore || 0) > 75,
      changedSince: previous.timestamp
    };
  }

  async startMonitoring(phone: string): Promise<Watcher> {
    return this.monitor.watch(phone, ['REACHABILITY_CHANGE', 'SPAM_SCORE_CHANGE'], (changes) => {
      console.log(`[HealthMonitor] Alert: ${phone} changed`, changes);
    });
  }
}
