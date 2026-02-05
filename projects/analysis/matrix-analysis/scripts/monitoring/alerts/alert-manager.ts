#!/usr/bin/env bun
/**
 * OpenClaw Alert Manager
 * Monitors systems and sends alerts on failures
 */

import { $ } from "bun";

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  component: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

const ALERTS_FILE = `${process.env.HOME}/.matrix/alerts/active.json`;
const ALERT_HISTORY = `${process.env.HOME}/.matrix/alerts/history.jsonl`;

class AlertManager {
  private alerts: Alert[] = [];
  private checkInterval: number = 30000; // 30 seconds
  
  async init() {
    await $`mkdir -p ${process.env.HOME}/.matrix/alerts`.quiet();
    this.startMonitoring();
    console.log("🚨 Alert Manager started");
  }
  
  private async startMonitoring() {
    setInterval(async () => {
      await this.checkSystems();
    }, this.checkInterval);
    
    // Initial check
    await this.checkSystems();
  }
  
  private async checkSystems() {
    const checks = [
      { name: "openclaw_gateway", check: this.checkGateway },
      { name: "matrix_agent", check: this.checkMatrixAgent },
      { name: "telegram_bot", check: this.checkTelegram },
      { name: "tailscale", check: this.checkTailscale }
    ];
    
    for (const { name, check } of checks) {
      try {
        const healthy = await check.call(this);
        if (!healthy) {
          this.raiseAlert(name, "critical", `${name} is down`);
        } else {
          this.clearAlert(name);
        }
      } catch (e) {
        this.raiseAlert(name, "warning", `Check failed: ${e}`);
      }
    }
  }
  
  private async checkGateway(): Promise<boolean> {
    try {
      const response = await fetch("http://127.0.0.1:18789/health", { timeout: 5000 });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async checkMatrixAgent(): Promise<boolean> {
    const result = await $`bun ~/.matrix/matrix-agent.ts status`.quiet().nothrow();
    return result.exitCode === 0;
  }
  
  private async checkTelegram(): Promise<boolean> {
    const result = await $`openclaw status 2>&1 | grep -q "Telegram.*ON.*OK"`.quiet().nothrow();
    return result.exitCode === 0;
  }
  
  private async checkTailscale(): Promise<boolean> {
    const result = await $`tailscale status 2>&1 | grep -q "100.115.89.61"`.quiet().nothrow();
    return result.exitCode === 0;
  }
  
  private raiseAlert(component: string, severity: Alert["severity"], message: string) {
    const existing = this.alerts.find(a => a.component === component && !a.acknowledged);
    if (existing) {
      existing.message = message;
      existing.timestamp = Date.now();
      return;
    }
    
    const alert: Alert = {
      id: crypto.randomUUID(),
      severity,
      component,
      message,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    this.persistAlerts();
    this.notify(alert);
    
    console.log(`🚨 ALERT [${severity.toUpperCase()}] ${component}: ${message}`);
  }
  
  private clearAlert(component: string) {
    const index = this.alerts.findIndex(a => a.component === component && !a.acknowledged);
    if (index >= 0) {
      const alert = this.alerts[index];
      alert.acknowledged = true;
      this.persistAlerts();
      console.log(`✅ CLEARED ${component}`);
    }
  }
  
  private async persistAlerts() {
    await Bun.write(ALERTS_FILE, JSON.stringify(this.alerts, null, 2));
  }
  
  private async notify(alert: Alert) {
    // Log to history
    const line = JSON.stringify(alert) + "\n";
    await Bun.write(ALERT_HISTORY, line, { append: true });
    
    // Could send Telegram notification here
    // Could send email
    // Could trigger PagerDuty
  }
  
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }
}

// Start if main
if (import.meta.main) {
  const manager = new AlertManager();
  await manager.init();
  
  // Keep alive
  setInterval(() => {}, 60000);
}

export { AlertManager };
