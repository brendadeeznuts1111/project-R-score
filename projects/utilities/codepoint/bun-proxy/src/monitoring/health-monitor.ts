// @bun/proxy/monitoring/health-monitor.ts - Health monitor implementation
import type { HealthMonitorConfiguration } from './index.js';

export class HealthMonitor {
  // @ts-ignore - unused in base class but needed for constructor signature
  constructor(private _configuration: HealthMonitorConfiguration) {}

  async checkHealth(): Promise<{ status: string; checks: any[] }> {
    return {
      status: 'healthy',
      checks: []
    };
  }

  async checkReadiness(): Promise<boolean> {
    return true;
  }

  async checkLiveness(): Promise<boolean> {
    return true;
  }
}
