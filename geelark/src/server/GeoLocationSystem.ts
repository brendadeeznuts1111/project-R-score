/**
 * Geolocation System
 *
 * Tracks and manages IP geolocation data
 */

import { Database } from "bun:sqlite";
import path from "node:path";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");
const GEO_DB_PATH = path.join(ROOT_DIR, "monitoring-geo.db");

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  lastUpdated: number;
}

export interface GeoStats {
  country: string;
  countryCode: string;
  requestCount: number;
  uniqueIPs: number;
  lastRequest: number;
}

export class GeoLocationSystem {
  private db: any;

  constructor(dbPath: string = GEO_DB_PATH) {
    // @ts-ignore - Using dynamic import
    const { Database } = require("bun:sqlite");
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Geolocation table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS geolocation (
        ip TEXT PRIMARY KEY,
        country TEXT NOT NULL,
        countryCode TEXT NOT NULL,
        region TEXT,
        city TEXT,
        latitude REAL,
        longitude REAL,
        timezone TEXT,
        isp TEXT,
        organization TEXT,
        lastUpdated INTEGER NOT NULL
      )
    `);

    // Geo statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS geo_stats (
        country TEXT NOT NULL,
        countryCode TEXT NOT NULL,
        requestCount INTEGER NOT NULL DEFAULT 1,
        uniqueIPs INTEGER NOT NULL DEFAULT 1,
        lastRequest INTEGER NOT NULL,
        PRIMARY KEY (country, countryCode)
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_geo_country ON geolocation(country)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_geo_stats_requests ON geo_stats(requestCount)`);
  }

  /**
   * Update or insert geolocation for IP
   */
  updateGeoLocation(ip: string, geo: Partial<GeoLocation>): void {
    const existing = this.db.prepare("SELECT * FROM geolocation WHERE ip = ?").get(ip);

    const now = Date.now();
    const geoData: GeoLocation = existing
      ? { ...existing, ...geo, lastUpdated: now }
      : {
          ip,
          country: geo.country || "Unknown",
          countryCode: geo.countryCode || "XX",
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
          timezone: geo.timezone,
          isp: geo.isp,
          organization: geo.organization,
          lastUpdated: now,
        };

    this.db.prepare(`
      INSERT OR REPLACE INTO geolocation
      (ip, country, countryCode, region, city, latitude, longitude, timezone, isp, organization, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      geoData.ip,
      geoData.country,
      geoData.countryCode,
      geoData.region || null,
      geoData.city || null,
      geoData.latitude || null,
      geoData.longitude || null,
      geoData.timezone || null,
      geoData.isp || null,
      geoData.organization || null,
      geoData.lastUpdated
    );

    // Update stats
    this.updateStats(geoData.country, geoData.countryCode);
  }

  /**
   * Update geo statistics
   */
  private updateStats(country: string, countryCode: string): void {
    const existing = this.db.prepare(`
      SELECT * FROM geo_stats WHERE country = ? AND countryCode = ?
    `).get(country, countryCode);

    if (existing) {
      this.db.prepare(`
        UPDATE geo_stats
        SET requestCount = requestCount + 1, lastRequest = ?
        WHERE country = ? AND countryCode = ?
      `).run(Date.now(), country, countryCode);
    } else {
      this.db.prepare(`
        INSERT INTO geo_stats (country, countryCode, requestCount, uniqueIPs, lastRequest)
        VALUES (?, ?, 1, 1, ?)
      `).run(country, countryCode, Date.now());
    }
  }

  /**
   * Get geolocation for IP
   */
  getGeoLocation(ip: string): GeoLocation | null {
    return this.db.prepare("SELECT * FROM geolocation WHERE ip = ?").get(ip) || null;
  }

  /**
   * Get all geolocations
   */
  getAllGeoLocations(limit: number = 100, offset: number = 0): GeoLocation[] {
    return this.db.prepare(`
      SELECT * FROM geolocation ORDER BY lastUpdated DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as GeoLocation[];
  }

  /**
   * Get top countries by request count
   */
  getTopCountries(limit: number = 20): GeoStats[] {
    return this.db.prepare(`
      SELECT * FROM geo_stats ORDER BY requestCount DESC LIMIT ?
    `).all(limit) as GeoStats[];
  }

  /**
   * Get geo statistics
   */
  getGeoStats(): {
    totalCountries: number;
    totalLocations: number;
    topCountries: GeoStats[];
  } {
    const totalCountries = this.db.prepare(`SELECT COUNT(DISTINCT country) as count FROM geolocation`).get() as { count: number };
    const totalLocations = this.db.prepare(`SELECT COUNT(*) as count FROM geolocation`).get() as { count: number };
    const topCountries = this.getTopCountries(10);

    return {
      totalCountries: totalCountries.count,
      totalLocations: totalLocations.count,
      topCountries,
    };
  }

  /**
   * Bulk update geolocations
   */
  bulkUpdateGeoLocations(geoData: Array<{ ip: string; geo: Partial<GeoLocation> }>): void {
    const update = this.db.prepare(`
      INSERT OR REPLACE INTO geolocation
      (ip, country, countryCode, region, city, latitude, longitude, timezone, isp, organization, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStats = this.db.prepare(`
      INSERT OR REPLACE INTO geo_stats (country, countryCode, requestCount, uniqueIPs, lastRequest)
      VALUES (?, ?, 1, 1, ?)
    `);

    this.db.exec("BEGIN TRANSACTION");

    try {
      for (const { ip, geo } of geoData) {
        const now = Date.now();
        update.run(
          ip,
          geo.country || "Unknown",
          geo.countryCode || "XX",
          geo.region || null,
          geo.city || null,
          geo.latitude || null,
          geo.longitude || null,
          geo.timezone || null,
          geo.isp || null,
          geo.organization || null,
          now
        );

        updateStats.run(
          geo.country || "Unknown",
          geo.countryCode || "XX",
          now
        );
      }

      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  /**
   * Search geolocations by country
   */
  searchByCountry(country: string): GeoLocation[] {
    return this.db.prepare(`
      SELECT * FROM geolocation WHERE country LIKE ? ORDER BY lastUpdated DESC
    `).all(`%${country}%`) as GeoLocation[];
  }

  /**
   * Search geolocations by city
   */
  searchByCity(city: string): GeoLocation[] {
    return this.db.prepare(`
      SELECT * FROM geolocation WHERE city LIKE ? ORDER BY lastUpdated DESC
    `).all(`%${city}%`) as GeoLocation[];
  }

  /**
   * Cleanup old geolocation data
   */
  cleanup(olderThanDays: number = 90): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Get IPs to delete
    const ips = this.db.prepare(`
      SELECT ip FROM geolocation WHERE lastUpdated < ?
    `).all(cutoff) as Array<{ ip: string }>;

    // Delete from geo table
    const result = this.db.prepare(`DELETE FROM geolocation WHERE lastUpdated < ?`).run(cutoff);

    // Update stats (decrement counters)
    // This is complex, so we'll rebuild stats
    this.rebuildStats();

    return result.changes;
  }

  /**
   * Rebuild statistics from geolocation data
   */
  private rebuildStats(): void {
    this.db.exec("DELETE FROM geo_stats");

    const stats = this.db.prepare(`
      SELECT country, countryCode, COUNT(DISTINCT ip) as count, MAX(lastUpdated) as lastRequest
      FROM geolocation
      GROUP BY country, countryCode
    `).all() as Array<{ country: string; countryCode: string; count: number; lastRequest: number }>;

    const insert = this.db.prepare(`
      INSERT INTO geo_stats (country, countryCode, requestCount, uniqueIPs, lastRequest)
      VALUES (?, ?, ?, ?, ?)
    `);

    stats.forEach(stat => {
      insert.run(stat.country, stat.countryCode, stat.count, stat.count, stat.lastRequest);
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
