/**
 * Multi-device comparison: metrics, differences, rankings.
 */

import type { DuoPlusFragmentLoader } from './fragment-loader.ts';
import type { DuoPlusDeviceInfo } from './fragment-loader.ts';

export interface ComparisonMetrics {
  connectivity?: {
    simStatus: number[];
    wifiStatus: number[];
  };
  devices: DuoPlusDeviceInfo[];
}

export interface DeviceDifference {
  deviceId: string;
  differences: Record<string, { device1: unknown; device2: unknown }>;
}

export interface DeviceRanking {
  deviceId: string;
  score: number;
  name: string;
}

export interface ComparisonResult {
  id: string;
  deviceIds: string[];
  timestamp: number;
  metrics: ComparisonMetrics;
  differences: DeviceDifference[];
  rankings: DeviceRanking[];
}

export class DeviceComparisonEngine {
  private loader: DuoPlusFragmentLoader;

  constructor(loader: DuoPlusFragmentLoader) {
    this.loader = loader;
  }

  async createComparison(
    deviceIds: string[],
    cookieHeader: string | null,
    options?: { layout?: string }
  ): Promise<ComparisonResult> {
    const devices = await Promise.all(
      deviceIds.map((id) => this.loader.fetchDeviceInfo(id, cookieHeader))
    );

    const metrics = this.calculateMetrics(devices);
    const differences = this.findDifferences(devices);
    const rankings = this.rankDevices(devices);

    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `comp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return {
      id,
      deviceIds,
      timestamp: Date.now(),
      metrics,
      differences,
      rankings,
    };
  }

  private calculateMetrics(devices: DuoPlusDeviceInfo[]): ComparisonMetrics {
    const connectivity = {
      simStatus: devices.map((d) => d.sim?.status ?? -1),
      wifiStatus: devices.map((d) => d.wifi?.status ?? -1),
    };
    return { connectivity, devices };
  }

  private findDifferences(devices: DuoPlusDeviceInfo[]): DeviceDifference[] {
    if (devices.length < 2) return [];
    const reference = devices[0];
    const result: DeviceDifference[] = [];
    for (let i = 1; i < devices.length; i++) {
      const diff = this.compareDevices(reference, devices[i]);
      if (Object.keys(diff).length > 0) {
        result.push({
          deviceId: devices[i].id ?? String(i),
          differences: diff,
        });
      }
    }
    return result;
  }

  private compareDevices(
    a: DuoPlusDeviceInfo,
    b: DuoPlusDeviceInfo
  ): Record<string, { device1: unknown; device2: unknown }> {
    const diffs: Record<string, { device1: unknown; device2: unknown }> = {};
    const keys = new Set([
      ...Object.keys(a),
      ...Object.keys(b),
    ]) as Set<keyof DuoPlusDeviceInfo>;
    for (const key of keys) {
      const va = (a as Record<string, unknown>)[key];
      const vb = (b as Record<string, unknown>)[key];
      if (JSON.stringify(va) !== JSON.stringify(vb)) {
        diffs[key] = { device1: va, device2: vb };
      }
    }
    return diffs;
  }

  private rankDevices(devices: DuoPlusDeviceInfo[]): DeviceRanking[] {
    const scores = devices.map((d) => ({
      deviceId: d.id ?? 'unknown',
      score: this.calculateDeviceScore(d),
      name: d.name ?? 'Unnamed',
    }));
    return scores.sort((x, y) => y.score - x.score);
  }

  private calculateDeviceScore(device: DuoPlusDeviceInfo): number {
    let score = 100;
    if (device.sim?.status !== 1) score -= 30;
    if (device.wifi?.status !== 1) score -= 20;
    if (device.error) score -= 25;
    return Math.max(0, score);
  }

  renderComparisonHTML(result: ComparisonResult, layout: string = 'grid'): string {
    const { devices, rankings } = result;
    const layoutClass = layout === 'list' ? 'list' : 'grid';
    const rows = devices
      .map(
        (d) => `
      <div class="device-card" data-device-id="${escapeHtml(d.id ?? '')}">
        <h3>${escapeHtml(d.name ?? 'Unnamed')}</h3>
        <div class="device-score">Score: ${rankings.find((r) => r.deviceId === d.id)?.score ?? 0}</div>
        <div class="device-metrics">
          <div class="detail-row"><span class="label">OS:</span><span class="value">${escapeHtml(d.os ?? 'Unknown')}</span></div>
          <div class="detail-row"><span class="label">SIM:</span><span class="value">${d.sim?.status === 1 ? 'Online' : 'Offline'}</span></div>
          <div class="detail-row"><span class="label">WiFi:</span><span class="value">${d.wifi?.status === 1 ? 'Connected' : 'Disconnected'}</span></div>
          <div class="detail-row"><span class="label">Location:</span><span class="value">${escapeHtml([d.proxy?.city, d.proxy?.country].filter(Boolean).join(', ') || 'Unknown')}</span></div>
        </div>
      </div>`
      )
      .join('');
    const diffRows =
      result.differences.length > 0
        ? result.differences
            .map(
              (d) => `
        <div class="difference-item">
          <h4>Device ${escapeHtml(d.deviceId)}</h4>
          ${Object.entries(d.differences)
            .map(
              ([k, v]) =>
                `<div class="difference"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v.device1))} → ${escapeHtml(String(v.device2))}</div>`
            )
            .join('')}
        </div>`
            )
            .join('')
        : '<p class="no-diff">No differences</p>';
    return `
<div class="comparison-view ${layoutClass}">
  <div class="comparison-header">
    <h2>Device Comparison</h2>
  </div>
  <div class="devices-grid">${rows}</div>
  <div class="differences-panel">
    <h3>Key Differences</h3>
    ${diffRows}
  </div>
</div>`;
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
