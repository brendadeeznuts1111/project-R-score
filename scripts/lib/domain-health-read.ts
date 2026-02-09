#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client } from 'bun';

export type DomainHealthLevel = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface DomainHealthSummary {
  domain: string;
  source: 'local' | 'r2';
  checkedAt: string;
  overall: { status: DomainHealthLevel; score: number };
  dns: { status: DomainHealthLevel; score: number };
  storage: { status: DomainHealthLevel; score: number };
  cookie: { status: DomainHealthLevel; score: number };
  latency?: { strictP95Ms?: number };
  notes: string[];
}

export interface ReadinessResult {
  ready: boolean;
  status: 'healthy' | 'degraded' | 'critical';
  reasons: string[];
  metrics: {
    overallScore: number;
    dnsStatus: DomainHealthLevel;
    storageStatus: DomainHealthLevel;
    cookieStatus: DomainHealthLevel;
    strictP95Ms?: number;
    strictP95Threshold?: number;
  };
}

export interface DomainHealthLoadInput {
  domain?: string;
  source?: 'local' | 'r2';
  strictP95?: number;
  timeoutMs?: number;
  localHealthReportPath?: string;
  localLatestSnapshotPath?: string;
  r2Prefix?: string;
}

type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type R2CookieTelemetrySummary = {
  status: DomainHealthLevel;
  score: number;
  notes: string[];
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseLevel(value: unknown): DomainHealthLevel {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'healthy' || text === 'ok' || text === 'pass') return 'healthy';
  if (text === 'degraded' || text === 'warning' || text === 'warn') return 'degraded';
  if (text === 'critical' || text === 'unhealthy' || text === 'fail' || text === 'error') return 'critical';
  return 'unknown';
}

function scoreFromLevel(level: DomainHealthLevel): number {
  if (level === 'healthy') return 1;
  if (level === 'degraded') return 0.5;
  if (level === 'critical') return 0.15;
  return 0.35;
}

function toLevelFromRatio(ratio: number): DomainHealthLevel {
  if (ratio >= 0.9) return 'healthy';
  if (ratio >= 0.5) return 'degraded';
  return 'critical';
}

function resolveR2Config(): R2Config | null {
  const accountId = Bun.env.R2_ACCOUNT_ID || '';
  const endpoint = Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const bucket = Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || '';
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || '';

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

async function readJsonFile(path: string): Promise<any | null> {
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pullStrictP95(snapshot: any): number | undefined {
  const profiles = Array.isArray(snapshot?.rankedProfiles) ? snapshot.rankedProfiles : [];
  const strict = profiles.find((p: any) => String(p?.profile || '').toLowerCase() === 'strict');
  const value = Number(strict?.latencyP95Ms);
  return Number.isFinite(value) ? value : undefined;
}

function strictPenaltyStatus(strictP95Ms: number | undefined, threshold: number | undefined): DomainHealthLevel {
  if (!Number.isFinite(strictP95Ms) || !Number.isFinite(threshold)) return 'unknown';
  return strictP95Ms <= threshold ? 'healthy' : 'critical';
}

async function loadLocalHealth(input: Required<Pick<DomainHealthLoadInput, 'domain' | 'strictP95'>> & {
  healthReportPath: string;
  latestSnapshotPath: string;
}): Promise<DomainHealthSummary> {
  const notes: string[] = [];
  const report = await readJsonFile(input.healthReportPath);
  const latest = await readJsonFile(input.latestSnapshotPath);

  const checkedAt =
    String(report?.timestamp || report?.status?.lastCheck || latest?.createdAt || new Date().toISOString());

  const details = Array.isArray(report?.details) ? report.details : [];
  const domainRows = details.filter((row: any) => {
    const host = String(row?.domain || row?.url || '').toLowerCase();
    return host.includes(input.domain.toLowerCase());
  });

  const domainHealthy = domainRows.filter((row: any) => parseLevel(row?.status) === 'healthy').length;
  const dnsRatio = domainRows.length > 0 ? domainHealthy / domainRows.length : NaN;
  const dnsStatus = Number.isFinite(dnsRatio) ? toLevelFromRatio(dnsRatio) : 'unknown';

  const overallStatus = parseLevel(report?.status?.overall || report?.summary?.overall || 'unknown');
  const overallResolved = overallStatus === 'unknown' ? dnsStatus : overallStatus;

  const storageStatus = existsSync(input.healthReportPath) && existsSync(input.latestSnapshotPath)
    ? 'healthy'
    : 'degraded';

  const cookieStatus = 'unknown';
  notes.push('cookie telemetry unavailable in local health-report fallback');

  const strictP95Ms = pullStrictP95(latest);
  if (Number.isFinite(input.strictP95) && Number.isFinite(strictP95Ms)) {
    const strictStatus = strictPenaltyStatus(strictP95Ms, input.strictP95);
    notes.push(
      strictStatus === 'critical'
        ? `strict_p95_exceeded (${strictP95Ms}ms > ${input.strictP95}ms)`
        : `strict_p95_ok (${strictP95Ms}ms <= ${input.strictP95}ms)`
    );
  }

  const overallScore = clamp01(
    scoreFromLevel(overallResolved) * 0.6 +
      scoreFromLevel(dnsStatus) * 0.2 +
      scoreFromLevel(storageStatus) * 0.15 +
      scoreFromLevel(cookieStatus) * 0.05
  );

  if (!report) notes.push(`missing_local_health_report:${input.healthReportPath}`);
  if (!latest) notes.push(`missing_local_latest_snapshot:${input.latestSnapshotPath}`);

  return {
    domain: input.domain,
    source: 'local',
    checkedAt,
    overall: { status: overallResolved, score: overallScore },
    dns: { status: dnsStatus, score: scoreFromLevel(dnsStatus) },
    storage: { status: storageStatus, score: scoreFromLevel(storageStatus) },
    cookie: { status: cookieStatus, score: scoreFromLevel(cookieStatus) },
    latency: { strictP95Ms },
    notes,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout_after_${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadR2Health(input: Required<Pick<DomainHealthLoadInput, 'domain' | 'strictP95' | 'timeoutMs' | 'r2Prefix'>>): Promise<DomainHealthSummary> {
  const notes: string[] = [];
  const cfg = resolveR2Config();
  if (!cfg) {
    return {
      domain: input.domain,
      source: 'r2',
      checkedAt: new Date().toISOString(),
      overall: { status: 'degraded', score: 0.35 },
      dns: { status: 'unknown', score: scoreFromLevel('unknown') },
      storage: { status: 'critical', score: scoreFromLevel('critical') },
      cookie: { status: 'unknown', score: scoreFromLevel('unknown') },
      notes: ['r2_not_configured'],
    };
  }

  const client = new S3Client({
    endpoint: cfg.endpoint,
    bucket: cfg.bucket,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
  });

  const prefix = input.r2Prefix.replace(/^\/+|\/+$/g, '');
  const healthPrefix = `${prefix}/health/`;

  const readR2Json = async (key: string): Promise<any | null> => {
    try {
      return await withTimeout(client.file(key).json(), input.timeoutMs);
    } catch {
      return null;
    }
  };

  const resolveCookieTelemetry = async (): Promise<R2CookieTelemetrySummary> => {
    const legacy = await readR2Json(`domains/${input.domain}/cookies.json`);
    if (legacy && Array.isArray(legacy.cookies)) {
      const cookies = legacy.cookies as Array<Record<string, any>>;
      const total = cookies.length;
      if (total === 0) {
        return { status: 'degraded', score: 0.45, notes: ['legacy_cookie_payload_empty'] };
      }
      let secure = 0;
      let httpOnly = 0;
      let sameSite = 0;
      for (const row of cookies) {
        if (row?.secure === true) secure += 1;
        if (row?.httpOnly === true || row?.httponly === true) httpOnly += 1;
        const site = String(row?.sameSite ?? row?.samesite ?? '').toLowerCase();
        if (site === 'strict' || site === 'lax') sameSite += 1;
      }
      const ratio = clamp01((secure / total + httpOnly / total + sameSite / total) / 3);
      const status = ratio >= 0.9 ? 'healthy' : ratio >= 0.5 ? 'degraded' : 'critical';
      return { status, score: ratio, notes: ['legacy_cookie_payload_used'] };
    }

    const ctx = await readR2Json(`cookies/${input.domain}/secure_domain_ctx`);
    const state = await readR2Json(`cookies/${input.domain}/secure_subdomain_state`);
    const latest = await readR2Json(`cookies/${input.domain}/latest_payload`);
    if (!ctx && !state && !latest) {
      return { status: 'unknown', score: 0.35, notes: ['cookie_telemetry_missing'] };
    }

    const secure = Boolean(ctx?.secure);
    const httpOnly = Boolean(ctx?.httpOnly);
    const sameSite = String(ctx?.sameSite || '').toLowerCase();
    const active = Boolean(state?.active);
    const cookieCount = Number(latest?.cookies);
    const keysCount = Array.isArray(latest?.keys) ? latest.keys.length : 0;

    let score = 0;
    if (secure) score += 0.3;
    if (httpOnly) score += 0.3;
    if (sameSite === 'strict') score += 0.25;
    else if (sameSite === 'lax') score += 0.15;
    if (active) score += 0.1;
    if (Number.isFinite(cookieCount) && cookieCount > 0) score += 0.05;
    if (keysCount > 0) score += 0.05;
    score = clamp01(score);

    const status: DomainHealthLevel =
      (!secure || !httpOnly)
        ? 'critical'
        : score >= 0.85
          ? 'healthy'
          : score >= 0.5
            ? 'degraded'
            : 'critical';

    const telemetryNotes: string[] = ['cookie_telemetry_ctx_state_payload_used'];
    if (!active) telemetryNotes.push('cookie_state_inactive');
    if (!(Number.isFinite(cookieCount) && cookieCount > 0)) telemetryNotes.push('cookie_payload_empty');

    return { status, score, notes: telemetryNotes };
  };

  try {
    const listed = await withTimeout(client.list({ prefix: healthPrefix }), input.timeoutMs);
    const keys = (listed?.objects || [])
      .map((o: any) => String(o?.key || ''))
      .filter((k: string) => k.endsWith('.json'))
      .sort((a: string, b: string) => b.localeCompare(a));

    if (keys.length === 0) {
      return {
        domain: input.domain,
        source: 'r2',
        checkedAt: new Date().toISOString(),
        overall: { status: 'degraded', score: 0.35 },
        dns: { status: 'unknown', score: scoreFromLevel('unknown') },
        storage: { status: 'degraded', score: scoreFromLevel('degraded') },
        cookie: { status: 'unknown', score: scoreFromLevel('unknown') },
        notes: ['r2_health_missing'],
      };
    }

    const latestKey = keys[0];
    const objectRes = await withTimeout(client.file(latestKey).json(), input.timeoutMs);
    const checkedAt = String(objectRes?.timestamp || new Date().toISOString());
    const dnsRatio = Number(objectRes?.dnsPrefetch?.ratio);
    const dnsStatus = Number.isFinite(dnsRatio) ? toLevelFromRatio(dnsRatio) : 'unknown';

    const storageStatus: DomainHealthLevel = 'healthy';
    const cookieTelemetry = await resolveCookieTelemetry();
    const cookieStatus: DomainHealthLevel = cookieTelemetry.status;
    notes.push(`r2_key:${latestKey}`);
    notes.push(...cookieTelemetry.notes);

    const strictP95Ms = undefined;
    if (Number.isFinite(input.strictP95)) {
      notes.push('strict_p95_unavailable_in_r2_payload');
    }

    const overallScore = clamp01(
      scoreFromLevel(dnsStatus) * 0.7 +
        scoreFromLevel(storageStatus) * 0.2 +
        cookieTelemetry.score * 0.1
    );

    return {
      domain: input.domain,
      source: 'r2',
      checkedAt,
      overall: { status: dnsStatus, score: overallScore },
      dns: { status: dnsStatus, score: scoreFromLevel(dnsStatus) },
      storage: { status: storageStatus, score: scoreFromLevel(storageStatus) },
      cookie: { status: cookieStatus, score: scoreFromLevel(cookieStatus) },
      latency: { strictP95Ms },
      notes,
    };
  } catch (error) {
    return {
      domain: input.domain,
      source: 'r2',
      checkedAt: new Date().toISOString(),
      overall: { status: 'degraded', score: 0.35 },
      dns: { status: 'unknown', score: scoreFromLevel('unknown') },
      storage: { status: 'critical', score: scoreFromLevel('critical') },
      cookie: { status: 'unknown', score: scoreFromLevel('unknown') },
      notes: [
        `r2_read_failed:${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

export async function loadDomainHealthSummary(input: DomainHealthLoadInput = {}): Promise<DomainHealthSummary> {
  const domain = (input.domain || Bun.env.SEARCH_BENCH_DOMAIN || 'factory-wager.com').trim().toLowerCase();
  const source = input.source || 'local';
  const strictP95 = Number.isFinite(input.strictP95) ? Number(input.strictP95) : undefined;
  const timeoutMs = Number.isFinite(input.timeoutMs) ? Number(input.timeoutMs) : 2200;
  const localHealthReportPath = resolve(
    input.localHealthReportPath || Bun.env.DOMAIN_HEALTH_REPORT_PATH || 'reports/health-report.json'
  );
  const localLatestSnapshotPath = resolve(
    input.localLatestSnapshotPath || Bun.env.DOMAIN_HEALTH_LATEST_SNAPSHOT_PATH || 'reports/search-benchmark/latest.json'
  );
  const r2Prefix =
    (input.r2Prefix || Bun.env.DOMAIN_HEALTH_R2_PREFIX || `domains/${domain}`).replace(/^\/+|\/+$/g, '');

  if (source === 'r2') {
    return loadR2Health({ domain, strictP95, timeoutMs, r2Prefix });
  }

  return loadLocalHealth({
    domain,
    strictP95,
    healthReportPath: localHealthReportPath,
    latestSnapshotPath: localLatestSnapshotPath,
  });
}

export function evaluateReadiness(
  summary: DomainHealthSummary,
  strictP95Threshold?: number
): ReadinessResult {
  const reasons: string[] = [];

  const criticalSignals = [summary.overall.status, summary.dns.status, summary.storage.status, summary.cookie.status]
    .filter((s) => s === 'critical').length;
  const degradedSignals = [summary.overall.status, summary.dns.status, summary.storage.status, summary.cookie.status]
    .filter((s) => s === 'degraded' || s === 'unknown').length;

  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (criticalSignals > 0) {
    status = 'critical';
  } else if (degradedSignals > 0) {
    status = 'degraded';
  }

  const strictP95Ms = Number(summary.latency?.strictP95Ms);
  if (Number.isFinite(strictP95Threshold) && Number.isFinite(strictP95Ms) && strictP95Ms > strictP95Threshold) {
    status = 'critical';
    reasons.push(`strict_p95_exceeded:${strictP95Ms}>${strictP95Threshold}`);
  }

  if (summary.overall.status === 'critical') reasons.push('overall_critical');
  if (summary.dns.status === 'critical') reasons.push('dns_critical');
  if (summary.storage.status === 'critical') reasons.push('storage_critical');
  if (summary.cookie.status === 'critical') reasons.push('cookie_critical');
  if (summary.storage.status === 'unknown') reasons.push('storage_unknown');
  if (summary.notes.length > 0) reasons.push(...summary.notes.slice(0, 5));

  return {
    ready: status === 'healthy',
    status,
    reasons,
    metrics: {
      overallScore: Number(summary.overall.score.toFixed(4)),
      dnsStatus: summary.dns.status,
      storageStatus: summary.storage.status,
      cookieStatus: summary.cookie.status,
      strictP95Ms: Number.isFinite(strictP95Ms) ? strictP95Ms : undefined,
      strictP95Threshold,
    },
  };
}
