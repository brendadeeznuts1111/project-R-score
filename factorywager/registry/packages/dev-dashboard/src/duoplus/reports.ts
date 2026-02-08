/**
 * Device report export: full/summary templates, JSON/CSV/HTML.
 */

import type { DuoPlusFragmentLoader, DuoPlusDeviceInfo } from './fragment-loader.ts';

export interface ReportMetadata {
  generated: string;
  deviceCount: number;
  template: string;
  reportId: string;
}

export interface ReportSummary {
  online: number;
  offline: number;
  byOS: Record<string, number>;
  byLocation: Record<string, number>;
}

export interface ReportDeviceRow {
  id: string;
  name: string;
  status: string;
  os: string;
  location: string;
  phoneNumber: string;
  model: string;
  imei: string;
  issues: string[];
}

export interface FullReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  devices: ReportDeviceRow[];
  recommendations: string[];
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsv(s: string): string {
  const str = String(s);
  if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function identifyIssues(device: DuoPlusDeviceInfo): string[] {
  const issues: string[] = [];
  if (device.sim?.status !== 1) issues.push('SIM offline');
  if (device.wifi?.status !== 1) issues.push('WiFi disconnected');
  if (device.error) issues.push(device.error);
  return issues;
}

function groupByOS(devices: DuoPlusDeviceInfo[]): Record<string, number> {
  const out: Record<string, number> = {};
  devices.forEach((d) => {
    const os = d.os || 'Unknown';
    out[os] = (out[os] || 0) + 1;
  });
  return out;
}

function groupByLocation(devices: DuoPlusDeviceInfo[]): Record<string, number> {
  const out: Record<string, number> = {};
  devices.forEach((d) => {
    const loc = d.proxy?.country || d.proxy?.city || 'Unknown';
    out[loc] = (out[loc] || 0) + 1;
  });
  return out;
}

function generateRecommendations(devices: DuoPlusDeviceInfo[]): string[] {
  const recs: string[] = [];
  const offline = devices.filter((d) => d.sim?.status !== 1);
  if (offline.length > 0) recs.push(`Investigate ${offline.length} offline device(s).`);
  const withErrors = devices.filter((d) => d.error);
  if (withErrors.length > 0) recs.push(`Check ${withErrors.length} device(s) with errors.`);
  return recs;
}

export class DeviceReportExporter {
  private loader: DuoPlusFragmentLoader;

  constructor(loader: DuoPlusFragmentLoader) {
    this.loader = loader;
  }

  async generateReport(
    deviceIds: string[],
    cookieHeader: string | null,
    options: { format: 'json' | 'csv' | 'html'; template?: 'full' | 'summary' }
  ): Promise<{ report: FullReport; format: string; content?: string; downloadUrl?: string }> {
    const devices = await Promise.all(
      deviceIds.map((id) => this.loader.fetchDeviceInfo(id, cookieHeader))
    );
    const template = options.template || 'full';
    const reportId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const report: FullReport = {
      metadata: {
        generated: new Date().toISOString(),
        deviceCount: devices.length,
        template,
        reportId,
      },
      summary: {
        online: devices.filter((d) => d.sim?.status === 1).length,
        offline: devices.filter((d) => d.sim?.status !== 1).length,
        byOS: groupByOS(devices),
        byLocation: groupByLocation(devices),
      },
      devices: devices.map((d) => ({
        id: d.id ?? 'unknown',
        name: d.name ?? 'Unnamed',
        status: d.sim?.status === 1 ? 'online' : 'offline',
        os: d.os ?? 'Unknown',
        location: [d.proxy?.city, d.proxy?.country].filter(Boolean).join(', ') || 'Unknown',
        phoneNumber: d.sim?.msisdn ?? 'N/A',
        model: d.device?.model ?? 'Unknown',
        imei: d.device?.imei ?? 'N/A',
        issues: identifyIssues(d),
      })),
      recommendations: generateRecommendations(devices),
    };

    const format = options.format || 'json';
    if (format === 'json') {
      return { report, format, content: JSON.stringify(report, null, 2) };
    }
    if (format === 'csv') {
      const headers = ['ID', 'Name', 'Status', 'OS', 'Location', 'Phone', 'Model', 'IMEI', 'Issues'];
      const rows = report.devices.map((d) =>
        [d.id, d.name, d.status, d.os, d.location, d.phoneNumber, d.model, d.imei, d.issues.join('; ')].map(escapeCsv).join(',')
      );
      const content = [headers.map(escapeCsv).join(','), ...rows].join('\n');
      return { report, format, content };
    }
    if (format === 'html') {
      const content = this.renderHtmlReport(report);
      return { report, format, content };
    }
    return { report, format };
  }

  private renderHtmlReport(report: FullReport): string {
    const rows = report.devices
      .map(
        (d) => `
        <tr>
          <td>${escapeHtml(d.name)}</td>
          <td class="status-${d.status}">${escapeHtml(d.status)}</td>
          <td>${escapeHtml(d.os)}</td>
          <td>${escapeHtml(d.location)}</td>
          <td>${escapeHtml(d.phoneNumber)}</td>
          <td>${escapeHtml(d.issues.join(', '))}</td>
        </tr>`
      )
      .join('');
    return `<!DOCTYPE html>
<html>
<head><title>Device Report</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; background: #111; color: #eee; }
.header { border-bottom: 2px solid #333; padding-bottom: 20px; }
.device { margin: 20px 0; padding: 15px; border: 1px solid #333; }
.status-online { color: #0f8; }
.status-offline { color: #f44; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #333; padding: 8px; text-align: left; }
</style>
</head>
<body>
<div class="header">
  <h1>Device Management Report</h1>
  <p>Generated: ${escapeHtml(report.metadata.generated)}</p>
  <p>Devices: ${report.metadata.deviceCount}</p>
</div>
<h2>Summary</h2>
<p>Online: ${report.summary.online} | Offline: ${report.summary.offline}</p>
<h2>Devices</h2>
<table>
  <tr><th>Name</th><th>Status</th><th>OS</th><th>Location</th><th>Phone</th><th>Issues</th></tr>
  ${rows}
</table>
<h2>Recommendations</h2>
<ul>${report.recommendations.map((r) => '<li>' + escapeHtml(r) + '</li>').join('')}</ul>
</body>
</html>`;
  }
}
