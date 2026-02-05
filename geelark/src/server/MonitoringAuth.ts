/**
 * Authentication System for Monitoring
 *
 * Provides token-based authentication for monitoring endpoints
 */

import { Database } from "bun:sqlite";
import crypto from "crypto";
import path from "node:path";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");
const AUTH_DB_PATH = path.join(ROOT_DIR, "monitoring-auth.db");

export interface AuthToken {
  token: string;
  name: string;
  role: "admin" | "viewer" | "auditor";
  createdAt: number;
  expiresAt: number;
  lastUsed?: number;
  permissions: string[];
}

export interface AuthUser {
  username: string;
  hashedPassword: string;
  role: "admin" | "viewer" | "auditor";
  createdAt: number;
}

export interface AuthAuditLog {
  id?: number;
  timestamp: number;
  token: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: string;
}

export class MonitoringAuth {
  private db: Database;
  private secretKey: string;

  constructor(dbPath: string = AUTH_DB_PATH, secretKey?: string) {
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.secretKey = secretKey || process.env.MONITORING_AUTH_SECRET || Bun.hash(Math.random().toString()).toString().slice(0, 64);
    this.initializeSchema();
    this.createDefaultAdmin();
  }

  private initializeSchema(): void {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_users (
        username TEXT PRIMARY KEY,
        hashedPassword TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      )
    `);

    // Tokens table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL,
        lastUsed INTEGER,
        permissions TEXT NOT NULL
      )
    `);

    // Audit log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        token TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        ip TEXT NOT NULL,
        userAgent TEXT,
        success INTEGER NOT NULL,
        reason TEXT
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON auth_audit_log(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_token ON auth_audit_log(token)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tokens_expires ON auth_tokens(expiresAt)`);
  }

  /**
   * Create default admin user if none exists
   */
  private createDefaultAdmin(): void {
    const adminExists = this.db.prepare("SELECT username FROM auth_users WHERE role = 'admin'").get();

    if (!adminExists) {
      const defaultPassword = this.generatePassword();
      const hashedPassword = this.hashPassword(defaultPassword);

      this.db.prepare(`
        INSERT INTO auth_users (username, hashedPassword, role, createdAt)
        VALUES (?, ?, ?, ?)
      `).run("admin", hashedPassword, "admin", Date.now());

      // Calculate proper padding using Bun.stringWidth for Unicode/emoji support
      const passwordPadding = 44 - (typeof Bun !== 'undefined' ? Bun.stringWidth(defaultPassword) : defaultPassword.length);

      console.log(`
╔════════════════════════════════════════════════════════════╗
║           🔐 Monitoring Authentication Setup                  ║
╠════════════════════════════════════════════════════════════╣
║  Default admin account created!                            ║
║  Username: admin                                            ║
║  Password: ${defaultPassword}${" ".repeat(Math.max(0, passwordPadding))} ║
╠════════════════════════════════════════════════════════════╣
║  ⚠️  IMPORTANT: Change this password after first login!     ║
║  Command: change-password <new-password>                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    }
  }

  /**
   * Generate a secure random password
   */
  private generatePassword(length: number = 32): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }

  /**
   * Hash password using SHA-256
   */
  private hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password + this.secretKey).digest("hex");
  }

  /**
   * Verify password
   */
  verifyPassword(password: string, hash: string): boolean {
    const computedHash = this.hashPassword(password);
    return computedHash === hash;
  }

  /**
   * Authenticate user and return token
   */
  authenticate(username: string, password: string): AuthToken | null {
    const user = this.db.prepare(`
      SELECT * FROM auth_users WHERE username = ?
    `).get(username) as AuthUser | undefined;

    if (!user) {
      return null;
    }

    if (!this.verifyPassword(password, user.hashedPassword)) {
      return null;
    }

    // Generate token
    const token = this.generateToken();
    const tokenData: AuthToken = {
      token,
      name: username,
      role: user.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      permissions: this.getPermissionsForRole(user.role),
    };

    // Save token
    this.db.prepare(`
      INSERT INTO auth_tokens (token, name, role, createdAt, expiresAt, permissions)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      tokenData.token,
      tokenData.name,
      tokenData.role,
      tokenData.createdAt,
      tokenData.expiresAt,
      JSON.stringify(tokenData.permissions)
    );

    return tokenData;
  }

  /**
   * Validate token and return token data
   */
  validateToken(token: string): AuthToken | null {
    const tokenRecord = this.db.prepare(`
      SELECT * FROM auth_tokens WHERE token = ? AND expiresAt > ?
    `).get(token, Date.now()) as AuthToken | undefined;

    if (!tokenRecord) {
      return null;
    }

    // Update last used
    this.db.prepare(`
      UPDATE auth_tokens SET lastUsed = ? WHERE token = ?
    `).run(Date.now(), token);

    // Parse permissions
    tokenRecord.permissions = JSON.parse(tokenRecord.permissions as unknown as string);

    return tokenRecord;
  }

  /**
   * Generate token
   */
  private generateToken(): string {
    return Bun.hash(Math.random().toString() + Date.now()).slice(0, 64);
  }

  /**
   * Get permissions for role
   */
  private getPermissionsForRole(role: string): string[] {
    switch (role) {
      case "admin":
        return [
          "monitoring:read",
          "monitoring:write",
          "monitoring:delete",
          "monitoring:export",
          "monitoring:admin",
          "auth:manage",
        ];
      case "viewer":
        return ["monitoring:read"];
      case "auditor":
        return ["monitoring:read", "monitoring:export", "monitoring:audit"];
      default:
        return [];
    }
  }

  /**
   * Check if token has permission
   */
  hasPermission(token: string, permission: string): boolean {
    const tokenData = this.validateToken(token);
    if (!tokenData) {
      return false;
    }

    // Admin has all permissions
    if (tokenData.role === "admin") {
      return true;
    }

    return tokenData.permissions.includes(permission);
  }

  /**
   * Log audit event
   */
  logAudit(event: AuthAuditLog): void {
    this.db.prepare(`
      INSERT INTO auth_audit_log (timestamp, token, action, resource, ip, userAgent, success, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.timestamp,
      event.token,
      event.action,
      event.resource,
      event.ip,
      event.userAgent || null,
      event.success ? 1 : 0,
      event.reason || null
    );
  }

  /**
   * Change password for user
   */
  changePassword(username: string, newPassword: string): boolean {
    const hashedPassword = this.hashPassword(newPassword);

    const result = this.db.prepare(`
      UPDATE auth_users SET hashedPassword = ? WHERE username = ?
    `).run(hashedPassword, username);

    return result.changes > 0;
  }

  /**
   * Create new user
   */
  createUser(username: string, password: string, role: "admin" | "viewer" | "auditor"): boolean {
    const hashedPassword = this.hashPassword(password);

    try {
      this.db.prepare(`
        INSERT INTO auth_users (username, hashedPassword, role, createdAt)
        VALUES (?, ?, ?, ?)
      `).run(username, hashedPassword, role, Date.now());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revoke token
   */
  revokeToken(token: string): boolean {
    const result = this.db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
    return result.changes > 0;
  }

  /**
   * List active tokens
   */
  listActiveTokens(): AuthToken[] {
    const rows = this.db.prepare(`
      SELECT * FROM auth_tokens WHERE expiresAt > ? ORDER BY createdAt DESC
    `).all(Date.now()) as any[];

    return rows.map(row => ({
      ...row,
      permissions: JSON.parse(row.permissions),
    }));
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 100, offset: number = 0): AuthAuditLog[] {
    return this.db.prepare(`
      SELECT * FROM auth_audit_log
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as AuthAuditLog[];
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    const result = this.db.prepare("DELETE FROM auth_tokens WHERE expiresAt <= ?").run(Date.now());
    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
