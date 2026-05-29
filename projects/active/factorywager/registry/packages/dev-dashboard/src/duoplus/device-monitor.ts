/**
 * Real-time device monitor: polls DuoPlus for subscribed devices and
 * broadcasts device_update when state changes.
 */

import type { DuoPlusFragmentLoader } from './fragment-loader.ts';
import type { DuoPlusDeviceInfo } from './fragment-loader.ts';

export interface DeviceMonitorOptions {
  pollingIntervalMs: number;
  enabled: boolean;
}

const DEFAULT_POLLING_MS = 10_000;

function deviceStateKey(data: DuoPlusDeviceInfo): string {
  const sim = data.sim?.status ?? -1;
  const wifi = data.wifi?.status ?? -1;
  const err = data.error ?? '';
  return `${data.id ?? ''}:${sim}:${wifi}:${err}`;
}

export interface WebSocketLike {
  readonly readyState: number;
  send(message: string | ArrayBuffer | Uint8Array, compress?: boolean): number;
}

export type OnStateChangeCallback = (
  deviceId: string,
  previousData: DuoPlusDeviceInfo | null,
  currentData: DuoPlusDeviceInfo
) => void;

export class DeviceMonitor {
  private loader: DuoPlusFragmentLoader;
  private broadcast: (type: string, data: any) => void;
  private options: DeviceMonitorOptions;
  private subscriptions = new Map<string, Set<WebSocketLike>>();
  private previousState = new Map<string, string>();
  private previousData = new Map<string, DuoPlusDeviceInfo>();
  private onStateChange: OnStateChangeCallback | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly OPEN = 1;

  constructor(
    loader: DuoPlusFragmentLoader,
    broadcast: (type: string, data: any) => void,
    options?: Partial<DeviceMonitorOptions> & { onStateChange?: OnStateChangeCallback }
  ) {
    this.loader = loader;
    this.broadcast = broadcast;
    this.onStateChange = options?.onStateChange ?? null;
    this.options = {
      pollingIntervalMs: options?.pollingIntervalMs ?? DEFAULT_POLLING_MS,
      enabled: options?.enabled !== false,
    };
    if (this.options.enabled) {
      this.startPolling();
    }
  }

  subscribe(deviceId: string, ws: WebSocketLike): void {
    if (!deviceId) return;
    let set = this.subscriptions.get(deviceId);
    if (!set) {
      set = new Set();
      this.subscriptions.set(deviceId, set);
    }
    set.add(ws);
  }

  unsubscribe(deviceId: string, ws: WebSocketLike): void {
    const set = this.subscriptions.get(deviceId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) this.subscriptions.delete(deviceId);
    }
  }

  unsubscribeAll(ws: WebSocketLike): void {
    for (const [deviceId, set] of this.subscriptions.entries()) {
      set.delete(ws);
      if (set.size === 0) this.subscriptions.delete(deviceId);
    }
  }

  private startPolling(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.poll().catch(() => {});
    }, this.options.pollingIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll(): Promise<void> {
    const deviceIds = Array.from(this.subscriptions.keys());
    if (deviceIds.length === 0) return;

    for (const deviceId of deviceIds) {
      try {
        const data = await this.loader.fetchDeviceInfo(deviceId, null, { bypassCache: true });
        const key = deviceStateKey(data);
        const prev = this.previousState.get(deviceId);
        if (prev !== key) {
          const prevData = this.previousData.get(deviceId) ?? null;
          if (this.onStateChange) this.onStateChange(deviceId, prevData, data);
          this.previousState.set(deviceId, key);
          this.previousData.set(deviceId, data);
          this.broadcast('device_update', { deviceId, data, timestamp: Date.now() });
        }
      } catch {
        // ignore per-device errors
      }
    }
  }

  getSubscribedCount(): number {
    return this.subscriptions.size;
  }
}
