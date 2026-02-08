/**
 * Device-level alert rules: device_offline, security_issue, performance_issue.
 * Cooldown per (deviceId, ruleId). Broadcasts device_alert via callback.
 */

import type { DuoPlusDeviceInfo } from './fragment-loader.ts';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface DeviceAlert {
  id: string;
  deviceId: string;
  ruleId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  acknowledged?: boolean;
  previousState?: Record<string, unknown>;
  currentState?: Record<string, unknown>;
}

export interface DeviceAlertRule {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number;
  condition: (previous: DuoPlusDeviceInfo | null, current: DuoPlusDeviceInfo) => boolean;
}

const defaultRules: DeviceAlertRule[] = [
  {
    id: 'device_offline',
    name: 'Device offline',
    severity: 'warning',
    message: 'Device SIM is offline',
    cooldownMs: 60_000, // 1 min
    condition: (_prev, current) => (current.sim?.status ?? -1) !== 1,
  },
  {
    id: 'wifi_disconnected',
    name: 'WiFi disconnected',
    severity: 'info',
    message: 'Device WiFi is disconnected',
    cooldownMs: 120_000,
    condition: (_prev, current) => (current.wifi?.status ?? -1) !== 1,
  },
  {
    id: 'device_error',
    name: 'Device error',
    severity: 'critical',
    message: 'Device reported an error',
    cooldownMs: 30_000,
    condition: (_prev, current) => Boolean(current.error),
  },
];

function shallowState(d: DuoPlusDeviceInfo): Record<string, unknown> {
  return {
    simStatus: d.sim?.status,
    wifiStatus: d.wifi?.status,
    error: d.error,
  };
}

function alertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type OnAlertFiredCallback = (alert: DeviceAlert) => void;

export class DeviceAlertSystem {
  private broadcast: (type: string, data: unknown) => void;
  private rules: DeviceAlertRule[];
  private cooldownUntil = new Map<string, number>(); // key: `${deviceId}:${ruleId}`
  private recentAlerts: DeviceAlert[] = [];
  private readonly maxRecent = 100;
  private onAlertFired: OnAlertFiredCallback | null = null;

  constructor(
    broadcast: (type: string, data: unknown) => void,
    rules?: DeviceAlertRule[],
    onAlertFired?: OnAlertFiredCallback
  ) {
    this.broadcast = broadcast;
    this.rules = rules ?? defaultRules;
    this.onAlertFired = onAlertFired ?? null;
  }

  checkAlerts(
    deviceId: string,
    previousData: DuoPlusDeviceInfo | null,
    currentData: DuoPlusDeviceInfo
  ): DeviceAlert[] {
    const now = Date.now();
    const fired: DeviceAlert[] = [];

    for (const rule of this.rules) {
      const cooldownKey = `${deviceId}:${rule.id}`;
      const until = this.cooldownUntil.get(cooldownKey) ?? 0;
      if (now < until) continue;
      if (!rule.condition(previousData, currentData)) continue;

      this.cooldownUntil.set(cooldownKey, now + rule.cooldownMs);
      const alert: DeviceAlert = {
        id: alertId(),
        deviceId,
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        timestamp: now,
        previousState: previousData ? shallowState(previousData) : undefined,
        currentState: shallowState(currentData),
      };
      fired.push(alert);
      this.recentAlerts.unshift(alert);
      if (this.recentAlerts.length > this.maxRecent) this.recentAlerts.pop();
      this.broadcast('device_alert', alert);
      if (this.onAlertFired) this.onAlertFired(alert);
    }

    return fired;
  }

  getRecentAlerts(limit = 50): DeviceAlert[] {
    return this.recentAlerts.slice(0, limit);
  }

  acknowledge(alertId: string): boolean {
    const a = this.recentAlerts.find((x) => x.id === alertId);
    if (a) {
      a.acknowledged = true;
      return true;
    }
    return false;
  }

  getAlert(alertId: string): DeviceAlert | null {
    return this.recentAlerts.find((x) => x.id === alertId) ?? null;
  }
}
