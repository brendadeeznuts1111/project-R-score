#!/usr/bin/env bun
/**
 * Syndicate Analysis Database Schema and Mappings
 * 
 * Database schema and type mappings for advanced syndicate group analysis
 * with pattern recognition and real-time monitoring.
 */

import { Database } from 'bun:sqlite';
import type { PatternData } from './types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface SyndicateGroupRow {
  id: string;
  name: string;
  members_count: number;
  total_funds: number;
  created_at: number;
  updated_at: number;
  metadata?: string | null;
}

interface SyndicateBetRow {
  id: string;
  syndicate_id: string;
  game: string;
  bet_type: string;
  amount: number;
  odds: number;
  timestamp: number;
  result?: string | null;
  platform?: string | null;
  os?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
}

interface SyndicatePatternRow {
  id: number;
  syndicate_id: string;
  pattern_type: string;
  pattern_data: string;
  strength: number;
  confidence: number;
  last_seen: number;
  created_at: number;
  grading?: string | null;
  priority?: string | null;
  category?: string | null;
  content_type?: string | null;
  protocol_type?: string | null;
}

interface PlatformActivityRow {
  id: number;
  syndicate_id: string;
  platform: string;
  os?: string | null;
  total_bets: number;
  total_amount: number;
  first_seen: number;
  last_seen: number;
}

interface ActivityRecordRow {
  platform_activity_id: number;
  timestamp: number;
  amount: number;
  game: string;
  bet_type: string;
}

interface EmergingPatternRow {
  pattern_key: string;
  pattern_type: string;
  pattern_data: string;
  syndicate_count: number;
  strength: number;
  confidence: number;
  first_seen: number;
  last_seen: number;
  is_active: number;
}

interface SyndicateGroup {
  id: string;
  name: string;
  members: string[];
  membersCount: number;
  totalFunds: number;
  createdAt: number;
  updatedAt: number;
}

interface SyndicateBet {
  id: string;
  syndicateId: string;
  game: string;
  betType: string;
  amount: number;
  odds: number;
  timestamp: number;
  result?: 'win' | 'loss' | 'push' | 'pending';
  platform?: string;
  os?: string;
}

interface SyndicatePattern {
  id: number;
  syndicateId: string;
  patternType: 'betting_frequency' | 'game_selection' | 'bet_type_preference' | 'real_time_frequency' | 'real_time_game_selection';
  patternData: PatternData;
  strength: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  lastSeen: number;
  createdAt: number;
}

export interface PlatformActivity {
  syndicateId: string;
  platform: string;
  activities: ActivityRecord[];
  totalBets: number;
  totalAmount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ActivityRecord {
  timestamp: number;
  amount: number;
  game: string;
  betType: string;
}

export interface EmergingPattern {
  patternKey: string;
  patternType: string;
  data: PatternData;
  syndicates: Set<string>;
  syndicateCount: number;
  strength: number;
  confidence: number;
  lastSeen: number;
  firstSeen: number;
}

// =============================================================================
// DATABASE SCHEMA
// =============================================================================

export class SyndicateDatabase {
  private db: Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    // Syndicate Groups Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS syndicate_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        members_count INTEGER NOT NULL DEFAULT 0,
        total_funds REAL NOT NULL DEFAULT 0.0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      )
    `);

    // Syndicate Members Table (many-to-many relationship)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS syndicate_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        syndicate_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        member_name TEXT,
        joined_at INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        FOREIGN KEY (syndicate_id) REFERENCES syndicate_groups(id) ON DELETE CASCADE,
        UNIQUE(syndicate_id, member_id)
      )
    `);

    // Syndicate Bets Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS syndicate_bets (
        id TEXT PRIMARY KEY,
        syndicate_id TEXT NOT NULL,
        game TEXT NOT NULL,
        bet_type TEXT NOT NULL,
        amount REAL NOT NULL,
        odds REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        result TEXT CHECK(result IN ('win', 'loss', 'push', 'pending')),
        platform TEXT,
        os TEXT,
        user_agent TEXT,
        ip_address TEXT,
        FOREIGN KEY (syndicate_id) REFERENCES syndicate_groups(id) ON DELETE CASCADE
      )
    `);

    // Syndicate Patterns Table (Enhanced with metadata)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS syndicate_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        syndicate_id TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        pattern_data TEXT NOT NULL,
        strength REAL NOT NULL CHECK(strength >= 0 AND strength <= 1),
        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        last_seen INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        grading TEXT CHECK(grading IN ('Critical', 'High', 'Medium', 'Low')),
        priority TEXT CHECK(priority IN ('P1', 'P2', 'P3', 'P4')),
        category TEXT CHECK(category IN ('Analytical', 'Real-Time', 'Financial', 'Fraud', 'Competitive')),
        content_type TEXT CHECK(content_type IN ('Structured Data', 'Time-series Data', 'Streaming Data')),
        protocol_type TEXT,
        FOREIGN KEY (syndicate_id) REFERENCES syndicate_groups(id) ON DELETE CASCADE
      )
    `);

    // Platform Activities Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS platform_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        syndicate_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        os TEXT,
        total_bets INTEGER NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0.0,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        FOREIGN KEY (syndicate_id) REFERENCES syndicate_groups(id) ON DELETE CASCADE,
        UNIQUE(syndicate_id, platform, os)
      )
    `);

    // Activity Records Table (detailed activity log)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS activity_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_activity_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        amount REAL NOT NULL,
        game TEXT NOT NULL,
        bet_type TEXT NOT NULL,
        FOREIGN KEY (platform_activity_id) REFERENCES platform_activities(id) ON DELETE CASCADE
      )
    `);

    // Emerging Patterns Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS emerging_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_key TEXT NOT NULL UNIQUE,
        pattern_type TEXT NOT NULL,
        pattern_data TEXT NOT NULL,
        syndicate_count INTEGER NOT NULL DEFAULT 0,
        strength REAL NOT NULL CHECK(strength >= 0 AND strength <= 1),
        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Pattern Syndicates Junction Table (many-to-many)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pattern_syndicates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_key TEXT NOT NULL,
        syndicate_id TEXT NOT NULL,
        detected_at INTEGER NOT NULL,
        FOREIGN KEY (pattern_key) REFERENCES emerging_patterns(pattern_key) ON DELETE CASCADE,
        FOREIGN KEY (syndicate_id) REFERENCES syndicate_groups(id) ON DELETE CASCADE,
        UNIQUE(pattern_key, syndicate_id)
      )
    `);

    // Create indexes for performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_bets_syndicate_id ON syndicate_bets(syndicate_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_bets_timestamp ON syndicate_bets(timestamp)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_bets_game ON syndicate_bets(game)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_patterns_syndicate_id ON syndicate_patterns(syndicate_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_patterns_type ON syndicate_patterns(pattern_type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_patterns_last_seen ON syndicate_patterns(last_seen)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_patterns_grading ON syndicate_patterns(grading)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_patterns_priority ON syndicate_patterns(priority)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_syndicate_patterns_category ON syndicate_patterns(category)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_platform_activities_syndicate ON platform_activities(syndicate_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emerging_patterns_active ON emerging_patterns(is_active, last_seen)`);
  }

  // =============================================================================
  // SYNDICATE GROUPS MAPPING
  // =============================================================================

  createSyndicateGroup(group: SyndicateGroup): void {
    this.db.run(`
      INSERT INTO syndicate_groups (id, name, members_count, total_funds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      group.id,
      group.name,
      group.membersCount,
      group.totalFunds,
      group.createdAt,
      group.updatedAt
    ]);

    // Insert members
    group.members.forEach((memberId, index) => {
      this.db.run(`
        INSERT INTO syndicate_members (syndicate_id, member_id, member_name, joined_at, role)
        VALUES (?, ?, ?, ?, ?)
      `, [
        group.id,
        memberId,
        `Member ${index + 1}`,
        group.createdAt,
        'member'
      ]);
    });
  }

  getSyndicateGroup(syndicateId: string): SyndicateGroup | null {
    const groupRow = this.db.query(`
      SELECT * FROM syndicate_groups WHERE id = ?
    `).get(syndicateId) as SyndicateGroupRow | undefined;

    if (!groupRow) return null;

    const members = this.db.query(`
      SELECT member_id FROM syndicate_members WHERE syndicate_id = ?
    `).all(syndicateId) as Array<{ member_id: string }>;

    return {
      id: groupRow.id,
      name: groupRow.name,
      members: members.map(m => m.member_id),
      membersCount: groupRow.members_count,
      totalFunds: groupRow.total_funds,
      createdAt: groupRow.created_at,
      updatedAt: groupRow.updated_at
    };
  }

  updateSyndicateGroup(syndicateId: string, updates: Partial<SyndicateGroup>): void {
    const fields: string[] = [];
    const values: Array<string | number> = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.totalFunds !== undefined) {
      fields.push('total_funds = ?');
      values.push(updates.totalFunds);
    }
    if (updates.membersCount !== undefined) {
      fields.push('members_count = ?');
      values.push(updates.membersCount);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(syndicateId);

    this.db.run(`
      UPDATE syndicate_groups 
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);
  }

  // =============================================================================
  // SYNDICATE BETS MAPPING
  // =============================================================================

  recordSyndicateBet(bet: SyndicateBet): void {
    this.db.run(`
      INSERT INTO syndicate_bets (
        id, syndicate_id, game, bet_type, amount, odds, timestamp, result, platform, os
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bet.id,
      bet.syndicateId,
      bet.game,
      bet.betType,
      bet.amount,
      bet.odds,
      bet.timestamp,
      bet.result || null,
      bet.platform || null,
      bet.os || null
    ]);
  }

  getSyndicateBets(syndicateId: string, limit?: number, startTime?: number, endTime?: number): SyndicateBet[] {
    const conditions: string[] = ['syndicate_id = ?'];
    const params: Array<string | number> = [syndicateId];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }

    const queryParts = [
      `SELECT * FROM syndicate_bets WHERE ${conditions.join(' AND ')}`,
      `ORDER BY timestamp DESC`,
      limit ? `LIMIT ?` : null
    ].filter((part): part is string => part !== null);

    if (limit) {
      params.push(limit);
    }

    const query = queryParts.join(' ');
    const rows = this.db.query(query).all(...params) as SyndicateBetRow[];

    return rows.map(row => ({
      id: row.id,
      syndicateId: row.syndicate_id,
      game: row.game,
      betType: row.bet_type,
      amount: row.amount,
      odds: row.odds,
      timestamp: row.timestamp,
      result: row.result as SyndicateBet['result'] | undefined,
      platform: row.platform || undefined,
      os: row.os || undefined
    }));
  }

  // =============================================================================
  // SYNDICATE PATTERNS MAPPING
  // =============================================================================

  storeSyndicatePattern(pattern: Omit<SyndicatePattern, 'id'>): number {
    const result = this.db.run(`
      INSERT INTO syndicate_patterns (
        syndicate_id, pattern_type, pattern_data, strength, confidence, last_seen, created_at,
        grading, priority, category, content_type, protocol_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pattern.syndicateId,
      pattern.patternType,
      JSON.stringify(pattern.patternData),
      pattern.strength,
      pattern.confidence,
      pattern.lastSeen,
      pattern.createdAt || Date.now(),
      pattern.grading || null,
      pattern.priority || null,
      pattern.category || null,
      pattern.contentType || null,
      pattern.protocolType || null
    ]);

    return result.lastInsertRowId as number;
  }

  getSyndicatePatterns(syndicateId: string, patternType?: string): SyndicatePattern[] {
    const conditions: string[] = ['syndicate_id = ?'];
    const params: Array<string> = [syndicateId];

    if (patternType) {
      conditions.push('pattern_type = ?');
      params.push(patternType);
    }

    const query = `SELECT * FROM syndicate_patterns WHERE ${conditions.join(' AND ')} ORDER BY last_seen DESC`;
    const rows = this.db.query(query).all(...params) as SyndicatePatternRow[];

    return rows.map(row => ({
      id: row.id,
      syndicateId: row.syndicate_id,
      patternType: row.pattern_type as SyndicatePattern['patternType'],
      patternData: JSON.parse(row.pattern_data) as PatternData,
      strength: row.strength,
      confidence: row.confidence,
      lastSeen: row.last_seen,
      createdAt: row.created_at,
      grading: (row.grading as SyndicatePattern['grading']) || undefined,
      priority: (row.priority as SyndicatePattern['priority']) || undefined,
      category: (row.category as SyndicatePattern['category']) || undefined,
      contentType: (row.content_type as SyndicatePattern['contentType']) || undefined,
      protocolType: (row.protocol_type as SyndicatePattern['protocolType']) || undefined
    }));
  }

  // =============================================================================
  // PLATFORM ACTIVITIES MAPPING
  // =============================================================================

  registerPlatformActivity(activity: PlatformActivity): number {
    // Check if platform activity exists
    const existing = this.db.query(`
      SELECT id FROM platform_activities 
      WHERE syndicate_id = ? AND platform = ? AND os = ?
    `).get(activity.syndicateId, activity.platform, activity.os || null) as { id: number } | undefined;

    const activityId: number = existing
      ? (() => {
          // Update existing
          this.db.run(`
            UPDATE platform_activities
            SET total_bets = total_bets + ?,
                total_amount = total_amount + ?,
                last_seen = ?
            WHERE id = ?
          `, [
            activity.totalBets,
            activity.totalAmount,
            activity.lastSeen,
            existing.id
          ]);
          return existing.id;
        })()
      : (() => {
          // Insert new
          const result = this.db.run(`
            INSERT INTO platform_activities (
              syndicate_id, platform, os, total_bets, total_amount, first_seen, last_seen
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            activity.syndicateId,
            activity.platform,
            activity.os || null,
            activity.totalBets,
            activity.totalAmount,
            activity.firstSeen,
            activity.lastSeen
          ]);
          return result.lastInsertRowId as number;
        })();

    // Insert activity records
    activity.activities.forEach(record => {
      this.db.run(`
        INSERT INTO activity_records (
          platform_activity_id, timestamp, amount, game, bet_type
        )
        VALUES (?, ?, ?, ?, ?)
      `, [
        activityId,
        record.timestamp,
        record.amount,
        record.game,
        record.betType
      ]);
    });

    return activityId;
  }

  getPlatformActivities(syndicateId: string): PlatformActivity[] {
    interface PlatformActivityWithData extends PlatformActivityRow {
      activities_data?: string | null;
    }

    const rows = this.db.query(`
      SELECT pa.*, 
             GROUP_CONCAT(ar.timestamp || '|' || ar.amount || '|' || ar.game || '|' || ar.bet_type, ';') as activities_data
      FROM platform_activities pa
      LEFT JOIN activity_records ar ON pa.id = ar.platform_activity_id
      WHERE pa.syndicate_id = ?
      GROUP BY pa.id
    `).all(syndicateId) as PlatformActivityWithData[];

    return rows.map(row => ({
      syndicateId: row.syndicate_id,
      platform: row.platform,
      activities: row.activities_data ? row.activities_data.split(';').map((data: string) => {
        const [timestamp, amount, game, betType] = data.split('|');
        return {
          timestamp: parseInt(timestamp),
          amount: parseFloat(amount),
          game,
          betType
        };
      }) : [],
      totalBets: row.total_bets,
      totalAmount: row.total_amount,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen
    }));
  }

  // =============================================================================
  // EMERGING PATTERNS MAPPING
  // =============================================================================

  storeEmergingPattern(pattern: EmergingPattern): void {
    // Insert or update emerging pattern
    this.db.run(`
      INSERT INTO emerging_patterns (
        pattern_key, pattern_type, pattern_data, syndicate_count, strength, confidence, first_seen, last_seen, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(pattern_key) DO UPDATE SET
        syndicate_count = ?,
        strength = ?,
        confidence = ?,
        last_seen = ?,
        is_active = 1
    `, [
      pattern.patternKey,
      pattern.patternType,
      JSON.stringify(pattern.data),
      pattern.syndicateCount,
      pattern.strength,
      pattern.confidence,
      pattern.firstSeen,
      pattern.lastSeen,
      pattern.syndicateCount,
      pattern.strength,
      pattern.confidence,
      pattern.lastSeen
    ]);

    // Update pattern-syndicate relationships
    this.db.run(`
      DELETE FROM pattern_syndicates WHERE pattern_key = ?
    `, [pattern.patternKey]);

    pattern.syndicates.forEach(syndicateId => {
      this.db.run(`
        INSERT INTO pattern_syndicates (pattern_key, syndicate_id, detected_at)
        VALUES (?, ?, ?)
      `, [pattern.patternKey, syndicateId, pattern.lastSeen]);
    });
  }

  getEmergingPatterns(activeOnly: boolean = true): EmergingPattern[] {
    const conditions = activeOnly ? ['ep.is_active = 1'] : [];
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const query = `
      SELECT ep.*, 
             GROUP_CONCAT(ps.syndicate_id) as syndicate_ids
      FROM emerging_patterns ep
      LEFT JOIN pattern_syndicates ps ON ep.pattern_key = ps.pattern_key
      ${whereClause}
      GROUP BY ep.pattern_key ORDER BY ep.last_seen DESC
    `;

    const params: Array<number> = [];

    interface EmergingPatternWithSyndicates extends EmergingPatternRow {
      syndicate_ids?: string | null;
    }

    const rows = this.db.query(query).all(...params) as EmergingPatternWithSyndicates[];

    return rows.map(row => ({
      patternKey: row.pattern_key,
      patternType: row.pattern_type,
      data: JSON.parse(row.pattern_data) as PatternData,
      syndicates: new Set(row.syndicate_ids ? row.syndicate_ids.split(',') : []),
      syndicateCount: row.syndicate_count,
      strength: row.strength,
      confidence: row.confidence,
      lastSeen: row.last_seen,
      firstSeen: row.first_seen
    }));
  }

  // =============================================================================
  // ANALYTICS QUERIES
  // =============================================================================

  getSyndicateStats(syndicateId: string): {
    totalBets: number;
    totalAmount: number;
    winRate: number;
    averageBetSize: number;
    favoriteGame: string | null;
    preferredBetType: string | null;
  } {
    interface StatsRow {
      total_bets: number;
      total_amount: number | null;
      avg_bet_size: number | null;
      win_rate: number | null;
    }

    interface GameStatsRow {
      game: string;
      count: number;
    }

    interface BetTypeStatsRow {
      bet_type: string;
      count: number;
    }

    const stats = this.db.query(`
      SELECT 
        COUNT(*) as total_bets,
        SUM(amount) as total_amount,
        AVG(amount) as avg_bet_size,
        SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate
      FROM syndicate_bets
      WHERE syndicate_id = ?
    `).get(syndicateId) as StatsRow | undefined;

    const gameStats = this.db.query(`
      SELECT game, COUNT(*) as count
      FROM syndicate_bets
      WHERE syndicate_id = ?
      GROUP BY game
      ORDER BY count DESC
      LIMIT 1
    `).get(syndicateId) as GameStatsRow | undefined;

    const betTypeStats = this.db.query(`
      SELECT bet_type, COUNT(*) as count
      FROM syndicate_bets
      WHERE syndicate_id = ?
      GROUP BY bet_type
      ORDER BY count DESC
      LIMIT 1
    `).get(syndicateId) as BetTypeStatsRow | undefined;

    return {
      totalBets: stats?.total_bets || 0,
      totalAmount: stats?.total_amount || 0,
      winRate: stats?.win_rate || 0,
      averageBetSize: stats?.avg_bet_size || 0,
      favoriteGame: gameStats?.game || null,
      preferredBetType: betTypeStats?.bet_type || null
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  close(): void {
    this.db.close();
  }

  getDatabase(): Database {
    return this.db;
  }
}
