import { Database } from 'bun:sqlite';

// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import

export type SkillStatus = 'active' | 'deprecated' | 'draft';
export type SkillDefinition = {
  actions: string[];
  confidence: number;
  description: string;
  evidenceHash: string;
  lastUsed?: number;
  name: string;
  status: SkillStatus;
  triggers: string[];
};
export type SkillMetric = {
  errorCount: number;
  interruptionCount: number;
  sessionId: string;
  skillName: string | null;
  timestamp: number;
  turnsToResolution: number;
};
export type SkillImpact = {
  averageErrors: number;
  averageInterruptions: number;
  averageTurns: number;
  baselineTurnsDelta: number | null;
  samples: number;
  skillName: string;
  successRate: number;
};
export type RankedSkill = {
  actions: string[];
  confidence: number;
  name: string;
  priority: number;
  successRate: number;
  triggers: string[];
};
export type SkillTelemetry = {
  metrics: SkillMetric[];
  triggers: Array<{ sessionId: string; skillName: string; timestamp: number }>;
};

type ImpactRow = {
  average_errors: number;
  average_interruptions: number;
  average_turns: number;
  samples: number;
  skill_name: string;
  success_rate: number;
};
type SkillRow = {
  actions_json: string;
  confidence: number;
  last_used: number | null;
  name: string;
  triggers_json: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
const timestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return Date.parse(value);
  return Date.now();
};

export function parseSkillTelemetry(value: unknown): SkillTelemetry {
  if (!isRecord(value)) return { metrics: [], triggers: [] };
  const type = typeof value.type === 'string' ? value.type : null;
  const payload = isRecord(value.payload) ? value.payload : value;
  const eventType = type ?? (typeof payload.type === 'string' ? payload.type : null);
  const eventTimestamp = timestamp(value.timestamp ?? payload.timestamp);
  if (eventType === 'skill_triggered') {
    const skillName = payload.skill_name ?? payload.skillName;
    const sessionId = payload.session_id ?? payload.sessionId;
    return typeof skillName === 'string' && typeof sessionId === 'string'
      ? { metrics: [], triggers: [{ sessionId, skillName, timestamp: eventTimestamp }] }
      : { metrics: [], triggers: [] };
  }
  if (eventType !== 'session_summary') return { metrics: [], triggers: [] };
  const sessionId = payload.session_id ?? payload.sessionId;
  const turns = integer(payload.turns_to_resolution ?? payload.turnsToResolution);
  const errors = integer(payload.error_count ?? payload.errorCount);
  const interruptions = integer(payload.interruption_count ?? payload.interruptionCount);
  if (
    typeof sessionId !== 'string' ||
    turns === null ||
    errors === null ||
    interruptions === null
  ) {
    return { metrics: [], triggers: [] };
  }
  const skillNames = Array.isArray(payload.skills)
    ? payload.skills.filter((item): item is string => typeof item === 'string')
    : [];
  const metrics = (skillNames.length > 0 ? skillNames : [null]).map(skillName => ({
    errorCount: errors,
    interruptionCount: interruptions,
    sessionId,
    skillName,
    timestamp: eventTimestamp,
    turnsToResolution: turns,
  }));
  return { metrics, triggers: [] };
}

export class SkillRegistry {
  readonly db: Database;

  constructor(path: string) {
    this.db = new Database(path, { create: true });
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run(`
      CREATE TABLE IF NOT EXISTS skills (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        triggers_json TEXT NOT NULL,
        actions_json TEXT NOT NULL,
        confidence REAL NOT NULL,
        evidence_hash TEXT NOT NULL,
        last_used INTEGER,
        drafted_at INTEGER,
        promoted_at INTEGER,
        status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'deprecated')),
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS skill_metrics (
        skill_name TEXT NOT NULL,
        session_id TEXT NOT NULL,
        turns_to_resolution INTEGER NOT NULL CHECK (turns_to_resolution >= 0),
        error_count INTEGER NOT NULL CHECK (error_count >= 0),
        interruption_count INTEGER NOT NULL CHECK (interruption_count >= 0),
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (skill_name, session_id),
        FOREIGN KEY (skill_name) REFERENCES skills(name) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS skill_events (
        skill_name TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (skill_name, session_id, event_type, timestamp),
        FOREIGN KEY (skill_name) REFERENCES skills(name) ON DELETE CASCADE
      );
    `);
    this.upsertSkill({
      actions: [],
      confidence: 0,
      description: 'Internal no-skill baseline for effectiveness comparison.',
      evidenceHash: 'baseline',
      name: '__baseline__',
      status: 'deprecated',
      triggers: [],
    });
  }

  close(): void {
    this.db.close();
  }

  upsertSkill(skill: SkillDefinition): void {
    const now = Date.now();
    this.db
      .query(
        `
        INSERT INTO skills (
          name, description, triggers_json, actions_json, confidence,
          evidence_hash, last_used, drafted_at, promoted_at, status, updated_at
        ) VALUES (
          $name, $description, $triggers, $actions, $confidence,
          $evidenceHash, $lastUsed, $draftedAt, $promotedAt, $status, $updatedAt
        )
        ON CONFLICT(name) DO UPDATE SET
          description = excluded.description,
          triggers_json = excluded.triggers_json,
          actions_json = excluded.actions_json,
          confidence = excluded.confidence,
          evidence_hash = excluded.evidence_hash,
          last_used = COALESCE(excluded.last_used, skills.last_used),
          status = CASE WHEN skills.status = 'active' THEN 'active' ELSE excluded.status END,
          updated_at = excluded.updated_at
      `
      )
      .run({
        $actions: JSON.stringify(skill.actions),
        $confidence: skill.confidence,
        $description: skill.description,
        $draftedAt: skill.status === 'draft' ? now : null,
        $evidenceHash: skill.evidenceHash,
        $lastUsed: skill.lastUsed ?? null,
        $name: skill.name,
        $promotedAt: skill.status === 'active' ? now : null,
        $status: skill.status,
        $triggers: JSON.stringify(skill.triggers),
        $updatedAt: now,
      });
  }

  recordTrigger(skillName: string, sessionId: string, timestamp: number): void {
    this.ensureSkill(skillName);
    this.db
      .query(
        `
        INSERT OR IGNORE INTO skill_events (skill_name, session_id, event_type, timestamp)
        VALUES ($skillName, $sessionId, 'triggered', $timestamp)
      `
      )
      .run({ $sessionId: sessionId, $skillName: skillName, $timestamp: timestamp });
    this.db
      .query('UPDATE skills SET last_used = $timestamp, updated_at = $timestamp WHERE name = $name')
      .run({ $name: skillName, $timestamp: timestamp });
  }

  recordMetric(metric: SkillMetric): void {
    if (metric.skillName) this.ensureSkill(metric.skillName);
    this.db
      .query(
        `
        INSERT INTO skill_metrics (
          skill_name, session_id, turns_to_resolution, error_count,
          interruption_count, timestamp
        ) VALUES (
          $skillName, $sessionId, $turns, $errors, $interruptions, $timestamp
        )
        ON CONFLICT(skill_name, session_id) DO UPDATE SET
          turns_to_resolution = excluded.turns_to_resolution,
          error_count = excluded.error_count,
          interruption_count = excluded.interruption_count,
          timestamp = excluded.timestamp
      `
      )
      .run({
        $errors: metric.errorCount,
        $interruptions: metric.interruptionCount,
        $sessionId: metric.sessionId,
        $skillName: metric.skillName ?? '__baseline__',
        $timestamp: metric.timestamp,
        $turns: metric.turnsToResolution,
      });
  }

  impactSummary(): SkillImpact[] {
    const rows = this.db
      .query(
        `
        SELECT
          skill_name,
          COUNT(*) AS samples,
          AVG(turns_to_resolution) AS average_turns,
          AVG(error_count) AS average_errors,
          AVG(interruption_count) AS average_interruptions,
          AVG(CASE WHEN error_count = 0 AND interruption_count = 0 THEN 1.0 ELSE 0.0 END) AS success_rate
        FROM skill_metrics
        GROUP BY skill_name
      `
      )
      .all() as ImpactRow[];
    const baseline = rows.find(row => row.skill_name === '__baseline__')?.average_turns ?? null;
    return rows
      .filter(row => row.skill_name !== '__baseline__')
      .map(row => ({
        averageErrors: Number(row.average_errors.toFixed(2)),
        averageInterruptions: Number(row.average_interruptions.toFixed(2)),
        averageTurns: Number(row.average_turns.toFixed(2)),
        baselineTurnsDelta:
          baseline === null ? null : Number((row.average_turns - baseline).toFixed(2)),
        samples: row.samples,
        skillName: row.skill_name,
        successRate: Number(row.success_rate.toFixed(3)),
      }))
      .sort((a, b) => a.skillName.localeCompare(b.skillName));
  }

  rankedSkills(topK = 3, now = Date.now()): RankedSkill[] {
    return this.rank(topK, now);
  }

  rankMatches(input: string, topK = 3, now = Date.now()): RankedSkill[] {
    return this.rank(topK, now, input);
  }

  private rank(topK: number, now: number, input?: string): RankedSkill[] {
    const impact = new Map(this.impactSummary().map(item => [item.skillName, item]));
    const rows = this.db
      .query(
        `
        SELECT name, triggers_json, actions_json, confidence, last_used
        FROM skills
        WHERE status IN ('active', 'draft')
      `
      )
      .all() as SkillRow[];
    const normalizedInput = input?.toLowerCase();
    return rows
      .map(row => {
        const triggers = JSON.parse(row.triggers_json) as string[];
        const actions = JSON.parse(row.actions_json) as string[];
        const matches =
          normalizedInput === undefined ||
          triggers.some(trigger => normalizedInput.includes(trigger.toLowerCase()));
        if (!matches) return null;
        const daysSinceLastUse = row.last_used ? Math.max(0, now - row.last_used) / 86_400_000 : 0;
        const recency = Math.max(0, 1 - daysSinceLastUse / 90);
        const successRate = impact.get(row.name)?.successRate ?? 0.5;
        return {
          actions,
          confidence: row.confidence,
          name: row.name,
          priority: Number((row.confidence * recency * successRate).toFixed(4)),
          successRate,
          triggers,
        };
      })
      .filter((item): item is RankedSkill => item !== null)
      .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
      .slice(0, Math.max(1, topK));
  }

  private ensureSkill(name: string): void {
    this.db
      .query(
        `
        INSERT OR IGNORE INTO skills (
          name, description, triggers_json, actions_json, confidence,
          evidence_hash, last_used, drafted_at, promoted_at, status, updated_at
        ) VALUES ($name, 'Telemetry-observed skill pending review.', '[]', '[]', 0, 'telemetry', NULL, $now, NULL, 'draft', $now)
      `
      )
      .run({ $name: name, $now: Date.now() });
  }
}
