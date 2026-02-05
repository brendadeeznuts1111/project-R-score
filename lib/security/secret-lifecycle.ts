import { env } from 'bun';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { VersionedSecretManager } from './versioned-secrets';

export type LifecycleRule = {
  key: string;
  schedule: { type: 'cron' | 'interval'; cron?: string; intervalMs?: number };
  action: 'rotate';
  metadata?: Record<string, string>;
};

export class SecretLifecycleManager {
  private scheduler = new Map<string, LifecycleRule & { ruleId: string; nextRotation?: string }>();
  private versioned = new VersionedSecretManager();
  private registry = new Map<string, { expiresAt?: string }>();

  async scheduleRotation(key: string, rule: LifecycleRule) {
    const ruleId = `rotation-${key}-${Date.now()}`;
    const nextRotation = this.calculateNextRotation(rule.schedule);

    this.scheduler.set(ruleId, { ...rule, key, ruleId, nextRotation });

    if (env.R2_BUCKET) {
      await env.R2_BUCKET.put(
        `lifecycle/rules/${ruleId}.json`,
        JSON.stringify(this.scheduler.get(ruleId), null, 2),
        { customMetadata: { 'lifecycle:type': 'rotation-rule', 'lifecycle:key': key } }
      );
    }

    return { ruleId, nextRotation };
  }

  async rotateNow(key: string, reason = 'Manual rotation') {
    const current = await this.versioned.getWithVersion(key);
    const newValue = this.generateNewValue(key, current.value);
    const result = await this.versioned.set(key, newValue, {
      author: 'lifecycle-manager',
      description: `Auto-rotation: ${reason}`,
      level: 'HIGH',
      tags: { 'factorywager:auto-rotated': 'true' }
    });

    return result;
  }

  async checkExpirations() {
    const expiring: Array<{ key: string; daysLeft: number }> = [];
    const now = Date.now();

    await this.loadRegistry();

    for (const [key, meta] of this.registry) {
      if (!meta.expiresAt) continue;
      const expiresAt = Date.parse(meta.expiresAt);
      if (Number.isNaN(expiresAt)) continue;
      const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        expiring.push({ key, daysLeft });
      }
    }

    if (expiring.length) {
      const reportInfo = await this.generateExpirationReport(expiring);
      return { expiring, reportInfo };
    }

    return { expiring, reportInfo: undefined };
  }

  private calculateNextRotation(schedule: LifecycleRule['schedule']) {
    if (schedule.type === 'interval') {
      const next = new Date(Date.now() + (schedule.intervalMs ?? 0));
      return next.toISOString();
    }
    return undefined;
  }

  private generateNewValue(_key: string, current: string) {
    return current + '-rotated';
  }

  private async loadRegistry() {
    if (this.registry.size) return;
    const path = env.SECRET_REGISTRY_PATH ?? 'config/secret-registry.json';
    try {
      const raw = await readFile(path, 'utf8');
      const data = JSON.parse(raw) as Array<{ key: string; expiresAt?: string }>;
      data.forEach((entry) => this.registry.set(entry.key, { expiresAt: entry.expiresAt }));
    } catch {
      // No registry file; leave empty
    }
  }

  private async generateExpirationReport(expiring: Array<{ key: string; daysLeft: number }>) {
    const report = {
      generated: new Date().toISOString(),
      count: expiring.length,
      critical: expiring.filter((e) => e.daysLeft <= 3).length,
      warnings: expiring.filter((e) => e.daysLeft > 3 && e.daysLeft <= 7).length,
      secrets: expiring.map((e) => ({
        key: e.key,
        daysLeft: e.daysLeft,
        severity: e.daysLeft <= 3 ? 'CRITICAL' : 'WARNING',
        action: e.daysLeft <= 1 ? 'ROTATE_NOW' : 'SCHEDULE_ROTATION'
      }))
    };

    const date = new Date().toISOString().split('T')[0];
    const key = `reports/expirations/${date}.json`;
    const htmlKey = `reports/expirations/${date}.html`;
    const localDir = env.SECRET_REPORT_DIR ?? 'reports/expirations';
    const localJson = `${localDir}/${date}.json`;
    const localHtml = `${localDir}/${date}.html`;
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.put(key, JSON.stringify(report, null, 2), {
        customMetadata: {
          'report:type': 'secret-expirations',
          'report:date': report.generated,
          'report:critical-count': report.critical.toString()
        }
      });
    }

    const html = this.generateExpirationHtml(report);
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.put(htmlKey, html, {
        customMetadata: {
          'report:type': 'secret-expirations',
          'report:format': 'html',
          'report:date': report.generated
        }
      });
    }

    let jsonUrl: string | undefined;
    let htmlUrl: string | undefined;
    if (env.R2_BUCKET && typeof env.R2_BUCKET.createSignedUrl === 'function') {
      jsonUrl = await env.R2_BUCKET.createSignedUrl(key, { expiresInSeconds: 86400 });
      htmlUrl = await env.R2_BUCKET.createSignedUrl(htmlKey, { expiresInSeconds: 86400 });
    }

    await this.writeLocalReport(localJson, JSON.stringify(report, null, 2));
    await this.writeLocalReport(localHtml, html);

    return { jsonUrl, htmlUrl, key, htmlKey, localJson, localHtml };
  }

  private async writeLocalReport(path: string, contents: string) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, 'utf8');
  }

  private generateExpirationHtml(report: any) {
    const rows = report.secrets.map((s: any) => {
      return `<tr><td>${s.key}</td><td>${s.daysLeft}</td><td>${s.severity}</td><td>${s.action}</td></tr>`;
    }).join('');
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Secret Expiration Report</title>
<style>
body{font-family:ui-sans-serif,system-ui;margin:24px;background:#0b0f1a;color:#e8f2ff}
table{border-collapse:collapse;width:100%;background:#0f1a2b}
th,td{border:1px solid #1c2740;padding:8px;font-size:12px}
th{background:#101b35;text-align:left}
</style></head><body>
<h2>Secret Expiration Report</h2>
<p>Generated: ${report.generated}</p>
<p>Count: ${report.count} | Critical: ${report.critical} | Warnings: ${report.warnings}</p>
<table><thead><tr><th>Key</th><th>Days Left</th><th>Severity</th><th>Action</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
  }
}
