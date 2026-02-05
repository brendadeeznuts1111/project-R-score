#!/usr/bin/env bun

// [ACCESS][RBAC][SYSTEM][ACCESS-RBAC-001][v2.11][ACTIVE]

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export type UserRole = 'ADMIN' | 'AGENT' | 'OPS' | 'GUEST';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  ipWhitelist?: string[];
  mfaEnabled: boolean;
  lastActive: string;
  sessionToken?: string;
  lockedUntil?: string;
}

export interface Permission {
  resource: string;
  action: string;
  roles: UserRole[];
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  user?: User;
}

export class AccessControlSystem {
  private users: Map<string, User> = new Map();
  private permissions: Permission[] = [];
  private usersFile = 'config/users.json';
  private permissionsFile = 'config/permissions.json';

  constructor() {
    this.loadUsers();
    this.loadPermissions();
    this.initializeDefaultPermissions();
  }

  private loadUsers(): void {
    if (existsSync(this.usersFile)) {
      try {
        const data = JSON.parse(readFileSync(this.usersFile, 'utf-8'));
        if (data.users) {
          data.users.forEach((user: User) => {
            this.users.set(user.id, user);
          });
        }
      } catch (error) {
        console.warn(`⚠️  Failed to load users: ${error}`);
      }
    } else {
      // Initialize default admin user
      this.createDefaultAdmin();
    }
  }

  private createDefaultAdmin(): void {
    const adminUser: User = {
      id: 'admin-001',
      username: 'admin',
      role: 'ADMIN',
      mfaEnabled: false,
      lastActive: new Date().toISOString(),
      ipWhitelist: ['127.0.0.1', 'localhost']
    };
    this.users.set(adminUser.id, adminUser);
    this.saveUsers();
  }

  private loadPermissions(): void {
    if (existsSync(this.permissionsFile)) {
      try {
        const data = JSON.parse(readFileSync(this.permissionsFile, 'utf-8'));
        if (data.permissions) {
          this.permissions = data.permissions;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to load permissions: ${error}`);
      }
    }
  }

  private initializeDefaultPermissions(): void {
    if (this.permissions.length === 0) {
      this.permissions = [
        // Admin permissions
        { resource: 'deploy', action: 'execute', roles: ['ADMIN'] },
        { resource: 'users', action: 'manage', roles: ['ADMIN'] },
        { resource: 'rules', action: 'edit', roles: ['ADMIN'] },
        { resource: 'backup', action: 'read', roles: ['ADMIN'] },

        // Agent permissions
        { resource: 'dashboard', action: 'read', roles: ['ADMIN', 'AGENT', 'OPS'] },
        { resource: 'bets', action: 'read', roles: ['ADMIN', 'AGENT', 'OPS'] },
        { resource: 'yaml', action: 'read', roles: ['ADMIN', 'AGENT', 'OPS'] },
        { resource: 'grep', action: 'execute', roles: ['ADMIN', 'AGENT'] },

        // Ops permissions
        { resource: 'pipe', action: 'execute', roles: ['ADMIN', 'OPS'] },
        { resource: 'etl', action: 'run', roles: ['ADMIN', 'OPS'] },
        { resource: 'logs', action: 'read', roles: ['ADMIN', 'OPS'] },
        { resource: 'websocket', action: 'connect', roles: ['ADMIN', 'OPS'] },

        // Guest permissions
        { resource: 'dashboard', action: 'view', roles: ['ADMIN', 'AGENT', 'OPS', 'GUEST'] }
      ];
      this.savePermissions();
    }
  }

  private saveUsers(): void {
    const data = { users: Array.from(this.users.values()) };
    writeFileSync(this.usersFile, JSON.stringify(data, null, 2));
  }

  private savePermissions(): void {
    const data = { permissions: this.permissions };
    writeFileSync(this.permissionsFile, JSON.stringify(data, null, 2));
  }

  // User management
  createUser(username: string, role: UserRole, ipWhitelist?: string[]): User {
    const user: User = {
      id: `user-${Date.now()}`,
      username,
      role,
      mfaEnabled: false,
      lastActive: new Date().toISOString(),
      ipWhitelist
    };
    this.users.set(user.id, user);
    this.saveUsers();
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  updateUserRole(userId: string, newRole: UserRole): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.role = newRole;
    this.saveUsers();
    return true;
  }

  lockUser(userId: string, durationMinutes: number = 60): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    this.saveUsers();
    return true;
  }

  // Permission checking
  checkPermission(userId: string, resource: string, action: string, clientIP?: string): AccessResult {
    const user = this.users.get(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Check if user is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return { allowed: false, reason: 'Account locked', user };
    }

    // Check IP whitelist if configured
    if (user.ipWhitelist && user.ipWhitelist.length > 0 && clientIP) {
      if (!user.ipWhitelist.includes(clientIP)) {
        return { allowed: false, reason: 'IP not whitelisted', user };
      }
    }

    // Find matching permission
    const permission = this.permissions.find(p =>
      p.resource === resource && p.action === action && p.roles.includes(user.role)
    );

    if (!permission) {
      return { allowed: false, reason: `No permission for ${action} on ${resource}`, user };
    }

    // Update last active
    user.lastActive = new Date().toISOString();
    this.saveUsers();

    return { allowed: true, user };
  }

  // Role-based command filtering
  getAllowedCommands(userId: string): string[] {
    const user = this.users.get(userId);
    if (!user) return [];

    const commands: string[] = [];

    // Admin commands
    if (user.role === 'ADMIN') {
      commands.push('/deploy', '/pause', '/top', '/users', '/rules', '/backup');
    }

    // Agent commands
    if (['ADMIN', 'AGENT'].includes(user.role)) {
      commands.push('/top', '/pending', '/grep');
    }

    // Ops commands
    if (['ADMIN', 'OPS'].includes(user.role)) {
      commands.push('/alerts', '/logs', '/pipe', '/etl');
    }

    return commands;
  }

  // MFA verification (placeholder - would integrate with Telegram)
  verifyMFA(userId: string, code: string): boolean {
    // In real implementation, this would verify against Telegram OTP
    // For now, accept any 4-digit code
    return /^\d{4}$/.test(code);
  }

  // Session management
  createSession(userId: string): string {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const token = `session-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    user.sessionToken = token;
    this.saveUsers();
    return token;
  }

  validateSession(token: string): User | null {
    const user = Array.from(this.users.values()).find(u => u.sessionToken === token);
    if (!user) return null;

    // Check session expiry (2 hours)
    const sessionAge = Date.now() - new Date(user.lastActive).getTime();
    if (sessionAge > 2 * 60 * 60 * 1000) { // 2 hours
      user.sessionToken = undefined;
      this.saveUsers();
      return null;
    }

    return user;
  }

  // Audit logging
  logAccess(userId: string, action: string, resource: string, allowed: boolean, clientIP?: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      allowed,
      clientIP,
      userAgent: 'system'
    };

    // In real implementation, this would write to immutable audit log
    console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
  }
}

// CLI interface
if (import.meta.main) {
  const acs = new AccessControlSystem();
  const command = process.argv[2];

  switch (command) {
    case 'users:list':
      console.log('Users:');
      Array.from(acs['users'].values()).forEach(user => {
        console.log(`  ${user.username} (${user.role}) - ${user.id}`);
        if (user.ipWhitelist) {
          console.log(`    IP Whitelist: ${user.ipWhitelist.join(', ')}`);
        }
        console.log(`    Last Active: ${user.lastActive}`);
        console.log(`    MFA: ${user.mfaEnabled ? 'Enabled' : 'Disabled'}`);
        console.log('');
      });
      break;

    case 'user:create':
      const username = process.argv[3];
      const role = process.argv[4] as UserRole;
      if (!username || !role) {
        console.log('Usage: bun access-control.ts user:create <username> <role>');
        process.exit(1);
      }
      const user = acs.createUser(username, role);
      console.log(`Created user: ${user.username} (${user.role})`);
      break;

    case 'role:switch':
      const targetUser = process.argv[3];
      const newRole = process.argv[4] as UserRole;
      if (!targetUser || !newRole) {
        console.log('Usage: bun access-control.ts role:switch <username> <role>');
        console.log('Roles: ADMIN, AGENT, OPS, GUEST');
        process.exit(1);
      }
      const userToUpdate = acs.getUserByUsername(targetUser);
      if (!userToUpdate) {
        console.log(`User ${targetUser} not found`);
        process.exit(1);
      }
      const updated = acs.updateUserRole(userToUpdate.id, newRole);
      if (updated) {
        console.log(`✅ Role updated: ${targetUser} → ${newRole}`);
        acs.logAccess(userToUpdate.id, 'role_change', 'user_management', true);
      } else {
        console.log(`❌ Failed to update role for ${targetUser}`);
      }
      break;

    case 'ip:add':
      const targetUsername = process.argv[3];
      const ip = process.argv[4];
      if (!targetUsername || !ip) {
        console.log('Usage: bun access-control.ts ip:add <username> <ip>');
        process.exit(1);
      }
      const userForIP = acs.getUserByUsername(targetUsername);
      if (!userForIP) {
        console.log(`User ${targetUsername} not found`);
        process.exit(1);
      }
      userForIP.ipWhitelist = userForIP.ipWhitelist || [];
      if (!userForIP.ipWhitelist.includes(ip)) {
        userForIP.ipWhitelist.push(ip);
        acs['saveUsers']();
        console.log(`✅ Added IP ${ip} to whitelist for ${targetUsername}`);
      } else {
        console.log(`ℹ️  IP ${ip} already in whitelist for ${targetUsername}`);
      }
      break;

    case 'check':
      const userId = process.argv[3];
      const resource = process.argv[4];
      const action = process.argv[5];
      const clientIP = process.argv[6];
      if (!userId || !resource || !action) {
        console.log('Usage: bun access-control.ts check <userId> <resource> <action> [clientIP]');
        process.exit(1);
      }
      const result = acs.checkPermission(userId, resource, action, clientIP);
      console.log(`Access ${result.allowed ? 'GRANTED' : 'DENIED'}: ${result.reason || 'OK'}`);
      acs.logAccess(userId, action, resource, result.allowed, clientIP);
      break;

    case 'audit':
      const since = process.argv[3] || '1d';
      console.log(`Access audit logs (last ${since}):`);
      console.log('Recent audit entries would be shown here...');
      // In real implementation, read from audit logs
      break;

    case 'commands':
      const cmdUser = process.argv[3];
      if (!cmdUser) {
        console.log('Usage: bun access-control.ts commands <username>');
        process.exit(1);
      }
      const cmdUserObj = acs.getUserByUsername(cmdUser);
      if (!cmdUserObj) {
        console.log(`User ${cmdUser} not found`);
        process.exit(1);
      }
      const allowedCommands = acs.getAllowedCommands(cmdUserObj.id);
      console.log(`Allowed commands for ${cmdUser} (${cmdUserObj.role}):`);
      allowedCommands.forEach(cmd => console.log(`  ${cmd}`));
      break;

    default:
      console.log('Available commands:');
      console.log('  users:list                    - List all users');
      console.log('  user:create <username> <role> - Create new user');
      console.log('  role:switch <username> <role> - Change user role');
      console.log('  ip:add <username> <ip>        - Add IP to user whitelist');
      console.log('  check <userId> <resource> <action> [ip] - Check permissions');
      console.log('  commands <username>           - Show allowed commands');
      console.log('  audit [since]                 - Show audit logs');
  }
}

export default AccessControlSystem;
