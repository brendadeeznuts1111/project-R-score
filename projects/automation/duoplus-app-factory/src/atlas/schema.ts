/**
 * Nebula-Flow™ Device Atlas Schema
 * SQLite database for device lifecycle management
 */

import { db } from '../database/db.js';

export interface StarlightRecord {
  id: string;              // DuoPlus device UUID
  handle: string;          // $sarah123
  apple_id?: string;
  venmo?: string;
  cashapp?: string;
  paypal?: string;
  privacy_pan?: string;
  eth_addr?: string;
  mnemonic_enc?: string;   // AES-256 encrypted
  birth_ts: number;
  last_snap_ts?: number;
  month_volume: number;
  status: 'active' | 'retired' | 'destroyed';
  atlas_json: string;      // full birth JSON blob
}

export interface AtlasEvent {
  ts: number;
  type: string;
  payload: any;
}

export interface SnapshotRecord {
  id: string;
  device_id: string;
  name: string;
  ts: number;
  age_days: number;
  retained: boolean;
}

export class AtlasSchema {
  static initialize() {
    // Main starlight table
    db.run(`
      CREATE TABLE IF NOT EXISTS starlight (
        id              TEXT PRIMARY KEY,
        handle          TEXT UNIQUE,
        apple_id        TEXT,
        venmo           TEXT,
        cashapp         TEXT,
        paypal          TEXT,
        privacy_pan     TEXT,
        eth_addr        TEXT,
        mnemonic_enc    TEXT,
        birth_ts        INTEGER,
        last_snap_ts    INTEGER,
        month_volume    REAL DEFAULT 0,
        status          TEXT CHECK(status IN ('active','retired','destroyed')),
        atlas_json      TEXT
      )
    `);

    // Events table (JSONL equivalent in SQLite)
    db.run(`
      CREATE TABLE IF NOT EXISTS atlas_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id  TEXT,
        ts         INTEGER,
        type       TEXT,
        payload    TEXT,
        FOREIGN KEY (device_id) REFERENCES starlight(id)
      )
    `);

    // Snapshots table
    db.run(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id         TEXT PRIMARY KEY,
        device_id  TEXT,
        name       TEXT,
        ts         INTEGER,
        retained   BOOLEAN DEFAULT 1,
        FOREIGN KEY (device_id) REFERENCES starlight(id)
      )
    `);

    // Cold exports table
    db.run(`
      CREATE TABLE IF NOT EXISTS cold_exports (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id  TEXT,
        filename   TEXT,
        ts         INTEGER,
        size_bytes INTEGER,
        checksum   TEXT,
        FOREIGN KEY (device_id) REFERENCES starlight(id)
      )
    `);

    console.log('✅ Atlas schema initialized');
  }

  static async registerDevice(record: StarlightRecord): Promise<void> {
    db.run(`
      INSERT OR REPLACE INTO starlight (
        id, handle, apple_id, venmo, cashapp, paypal, privacy_pan,
        eth_addr, mnemonic_enc, birth_ts, last_snap_ts, month_volume,
        status, atlas_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id,
      record.handle,
      record.apple_id,
      record.venmo,
      record.cashapp,
      record.paypal,
      record.privacy_pan,
      record.eth_addr,
      record.mnemonic_enc,
      record.birth_ts,
      record.last_snap_ts,
      record.month_volume,
      record.status,
      record.atlas_json
    ]);

    await this.logEvent(record.id, 'birth', record);
  }

  static async logEvent(deviceId: string, type: string, payload: any): Promise<void> {
    db.run(`
      INSERT INTO atlas_events (device_id, ts, type, payload)
      VALUES (?, ?, ?, ?)
    `, [
      deviceId,
      Date.now(),
      type,
      JSON.stringify(payload)
    ]);
  }

  static async recordSnapshot(deviceId: string, snapId: string, name: string): Promise<void> {
    db.run(`
      INSERT INTO snapshots (id, device_id, name, ts)
      VALUES (?, ?, ?, ?)
    `, [
      snapId,
      deviceId,
      name,
      Date.now()
    ]);

    db.run(`
      UPDATE starlight SET last_snap_ts = ? WHERE id = ?
    `, [Date.now(), deviceId]);
  }

  static async recordColdExport(deviceId: string, filename: string, sizeBytes: number, checksum: string): Promise<void> {
    db.run(`
      INSERT INTO cold_exports (device_id, filename, ts, size_bytes, checksum)
      VALUES (?, ?, ?, ?, ?)
    `, [
      deviceId,
      filename,
      Date.now(),
      sizeBytes,
      checksum
    ]);
  }

  static async thinSnapshots(deviceId: string): Promise<{ deleted: number }> {
    // Get all snapshots for device, ordered by age
    const snapshots = db.query(`
      SELECT id, name, ts FROM snapshots
      WHERE device_id = ? AND retained = 1
      ORDER BY ts DESC
    `, [deviceId]).rows as any[];

    let deleted = 0;
    const now = Date.now();

    for (const snap of snapshots) {
      const ageDays = (now - snap.ts) / (1000 * 60 * 60 * 24);

      // Retention rules
      let shouldRetain = true;
      if (ageDays > 31) {
        // Monthly retention - keep 12
        const monthlySnaps = snapshots.filter(s =>
          (now - s.ts) / (1000 * 60 * 60 * 24) > 31
        );
        if (monthlySnaps.indexOf(snap) >= 12) {
          shouldRetain = false;
        }
      } else if (ageDays > 7) {
        // Weekly retention - keep 4
        const weeklySnaps = snapshots.filter(s =>
          (now - s.ts) / (1000 * 60 * 60 * 24) > 7 &&
          (now - s.ts) / (1000 * 60 * 60 * 24) <= 31
        );
        if (weeklySnaps.indexOf(snap) >= 4) {
          shouldRetain = false;
        }
      } else {
        // Daily retention - keep 7
        const dailySnaps = snapshots.filter(s =>
          (now - s.ts) / (1000 * 60 * 60 * 24) <= 7
        );
        if (dailySnaps.indexOf(snap) >= 7) {
          shouldRetain = false;
        }
      }

      if (!shouldRetain) {
        db.run(`UPDATE snapshots SET retained = 0 WHERE id = ?`, [snap.id]);
        deleted++;
      }
    }

    return { deleted };
  }

  static getInventory(): {
    ageGroups: Array<{
      range: string;
      count: number;
      active: number;
      volume: number;
      snaps: number;
    }>;
    total: {
      count: number;
      active: number;
      volume: number;
      snaps: number;
      coldExports: number;
      lastExport: number;
    };
  } {
    const now = Date.now();

    // Get all starlight records
    const all = db.query(`
      SELECT * FROM starlight
    `).rows as StarlightRecord[];

    // Get all snapshots
    const snapshots = db.query(`
      SELECT device_id, COUNT(*) as snap_count
      FROM snapshots
      WHERE retained = 1
      GROUP BY device_id
    `).rows as any[];

    // Get cold exports
    const exports = db.query(`
      SELECT COUNT(*) as count, MAX(ts) as last_ts
      FROM cold_exports
    `).rows[0] as any;

    const ageGroups = [
      { range: '0-7', min: 0, max: 7, count: 0, active: 0, volume: 0, snaps: 0 },
      { range: '8-31', min: 8, max: 31, count: 0, active: 0, volume: 0, snaps: 0 },
      { range: '32+', min: 32, max: Infinity, count: 0, active: 0, volume: 0, snaps: 0 }
    ];

    let totalCount = 0;
    let totalActive = 0;
    let totalVolume = 0;
    let totalSnaps = 0;

    for (const device of all) {
      const ageDays = (now - device.birth_ts) / (1000 * 60 * 60 * 24);
      const deviceSnaps = snapshots.find(s => s.device_id === device.id)?.snap_count || 0;

      totalCount++;
      totalVolume += device.month_volume;
      totalSnaps += deviceSnaps;

      if (device.status === 'active') {
        totalActive++;
      }

      for (const group of ageGroups) {
        if (ageDays >= group.min && ageDays < group.max) {
          group.count++;
          group.volume += device.month_volume;
          group.snaps += deviceSnaps;
          if (device.status === 'active') {
            group.active++;
          }
          break;
        }
      }
    }

    return {
      ageGroups,
      total: {
        count: totalCount,
        active: totalActive,
        volume: totalVolume,
        snaps: totalSnaps,
        coldExports: exports?.count || 0,
        lastExport: exports?.last_ts || 0
      }
    };
  }

  static async getDeviceById(deviceId: string): Promise<StarlightRecord | null> {
    const result = db.query(`
      SELECT * FROM starlight WHERE id = ?
    `, [deviceId]).rows as StarlightRecord[];

    return result[0] || null;
  }

  static async getDeviceEvents(deviceId: string, limit = 100): Promise<AtlasEvent[]> {
    const events = db.query(`
      SELECT ts, type, payload FROM atlas_events
      WHERE device_id = ?
      ORDER BY ts DESC
      LIMIT ?
    `, [deviceId, limit]).rows as any[];

    return events.map(e => ({
      ts: e.ts,
      type: e.type,
      payload: JSON.parse(e.payload)
    }));
  }
}

// Initialize schema
AtlasSchema.initialize();