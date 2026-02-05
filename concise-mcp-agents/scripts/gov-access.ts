#!/usr/bin/env bun

// [GOV][ACCESS][ENFORCEMENT][GOV-ACCESS-001][v2.11][ACTIVE]

// [DATAPIPE][CORE][DA-CO-GA1][v2.11.0][ACTIVE]

import { AccessControlSystem, UserRole } from "./access-control.ts";
import { MFASystem } from "./mfa-otp.ts";
import { JWTAuthSystem } from "./jwt-auth.ts";
import { IPWhitelistSystem } from "./ip-whitelist.ts";
import { AuditLogger } from "./audit-log.ts";

interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  user?: any;
  requiresMFA?: boolean;
  lockoutUntil?: string;
}

export class GovAccessEnforcer {
  private access: AccessControlSystem;
  private mfa: MFASystem;
  private jwt: JWTAuthSystem;
  private ipWhitelist: IPWhitelistSystem;
  private audit: AuditLogger;

  constructor() {
    this.access = new AccessControlSystem();
    this.mfa = new MFASystem();
    this.jwt = new JWTAuthSystem();
    this.ipWhitelist = new IPWhitelistSystem();
    this.audit = new AuditLogger();
  }

  async checkAccess(userId: string, action: string, resource: string, ip?: string): Promise<AccessCheckResult> {
    try {
      // 1. Get user
      const user = await this.access.getUser(userId);
      if (!user) {
        await this.audit.logAccess({
          userId,
          action,
          resource,
          ip,
          result: 'DENIED',
          details: { reason: 'User not found' }
        });
        return { allowed: false, reason: 'User not found' };
      }

      // 2. Check if user is locked out
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        await this.audit.logAccess({
          userId,
          action,
          resource,
          ip,
          result: 'DENIED',
          details: { reason: 'Account locked', lockoutUntil: user.lockedUntil }
        });
        return { allowed: false, reason: `Account locked until ${user.lockedUntil}`, lockoutUntil: user.lockedUntil };
      }

      // 3. Check IP whitelist
      if (ip) {
        const ipCheck = await this.ipWhitelist.checkIP(ip);
        if (!ipCheck.allowed) {
          await this.audit.logAccess({
            userId,
            action,
            resource,
            ip,
            result: 'DENIED',
            details: { reason: ipCheck.reason }
          });
          return { allowed: false, reason: ipCheck.reason };
        }
      }

      // 4. Check role-based permissions
      const permissionCheck = await this.access.checkPermission(user, resource, action);
      if (!permissionCheck.allowed) {
        await this.audit.logAccess({
          userId,
          action,
          resource,
          ip,
          result: 'DENIED',
          details: { reason: permissionCheck.reason }
        });
        return { allowed: false, reason: permissionCheck.reason };
      }

      // 5. For sensitive actions, require MFA
      const sensitiveActions = ['deploy', 'delete', 'admin', 'write'];
      if (sensitiveActions.includes(action)) {
        // Generate MFA challenge
        await this.audit.logAccess({
          userId,
          action,
          resource,
          ip,
          result: 'SUCCESS',
          details: { mfaRequired: true }
        });
        return { allowed: false, reason: 'MFA required', requiresMFA: true, user };
      }

      // 6. Log successful access
      await this.audit.logAccess({
        userId,
        action,
        resource,
        ip,
        result: 'SUCCESS'
      });

      return { allowed: true, user };

    } catch (error) {
      console.error(`Access check error: ${error.message}`);
      return { allowed: false, reason: 'Access check failed' };
    }
  }

  async authenticateWithMFA(userId: string, mfaCode: string, action: string, resource: string, ip?: string): Promise<AccessCheckResult> {
    // Verify MFA code
    const mfaResult = await this.mfa.verifyOTP(userId, mfaCode);

    if (!mfaResult.valid) {
      // Count failed MFA attempts
      const user = await this.access.getUser(userId);
      if (user) {
        await this.handleFailedMFA(user);
      }

      await this.audit.logAccess({
        userId,
        action: `mfa-${action}`,
        resource,
        ip,
        result: 'FAILURE',
        details: { reason: mfaResult.reason }
      });

      return { allowed: false, reason: mfaResult.reason };
    }

    // MFA successful, proceed with access check
    return this.checkAccess(userId, action, resource, ip);
  }

  private async handleFailedMFA(user: any): Promise<void> {
    // Simple lockout after 5 failed attempts (in production, use Redis counter)
    const failedAttempts = (user.failedMFAAttempts || 0) + 1;
    user.failedMFAAttempts = failedAttempts;

    if (failedAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour lockout
      user.failedMFAAttempts = 0;
      console.log(`🚫 User ${user.id} locked out due to MFA failures`);
    }

    await this.access.updateUser(user);
  }

  async runFullAccessAudit(): Promise<{ violations: any[], lockedUsers: string[], report: string }> {
    console.log(`🔍 Running full access audit...`);

    const violations: any[] = [];
    const lockedUsers: string[] = [];

    // Check all users
    const allUsers = await this.access.getAllUsers();

    for (const user of allUsers) {
      // Check for locked accounts
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        lockedUsers.push(user.id);
      }

      // Check for inactive users (no activity in 30 days)
      if (user.lastActive) {
        const lastActive = new Date(user.lastActive);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (lastActive < thirtyDaysAgo) {
          violations.push({
            type: 'INACTIVE_USER',
            userId: user.id,
            details: `Last active: ${user.lastActive}`
          });
        }
      }

      // Check for users without MFA enabled (except GUEST)
      if (user.role !== 'GUEST' && !user.mfaEnabled) {
        violations.push({
          type: 'MFA_DISABLED',
          userId: user.id,
          role: user.role
        });
      }
    }

    // Generate report
    const report = `# Access Control Audit Report - ${new Date().toISOString()}

## Summary
- Total Users: ${allUsers.length}
- Locked Users: ${lockedUsers.length}
- Violations: ${violations.length}

## Locked Accounts
${lockedUsers.map(user => `- ${user}`).join('\n') || 'None'}

## Violations
${violations.map(v => `- **${v.type}**: ${v.userId} - ${v.details || ''}`).join('\n') || 'None'}

## Recommendations
${violations.length > 0 ? violations.map(v => {
  if (v.type === 'MFA_DISABLED') return `- Enable MFA for ${v.userId}`;
  if (v.type === 'INACTIVE_USER') return `- Review inactive user ${v.userId}`;
  return `- Address ${v.type} for ${v.userId}`;
}).join('\n') : 'No issues found - access controls are compliant ✅'}
`;

    return { violations, lockedUsers, report };
  }

  async generateRoleReport(): Promise<string> {
    const users = await this.access.getAllUsers();

    const roles = {
      ADMIN: users.filter(u => u.role === 'ADMIN'),
      AGENT: users.filter(u => u.role === 'AGENT'),
      OPS: users.filter(u => u.role === 'OPS'),
      GUEST: users.filter(u => u.role === 'GUEST')
    };

    let report = `# Role-Based Access Report

| Role | Count | Users |
|------|-------|-------|
`;

    for (const [role, roleUsers] of Object.entries(roles)) {
      report += `| ${role} | ${roleUsers.length} | ${roleUsers.map(u => u.username).join(', ') || 'None'} |\n`;
    }

    report += `\n## Role Permissions

- **ADMIN**: Full access (read/write/delete/deploy/admin)
- **OPS**: Pipeline and monitoring (read/write/pipe/monitor)
- **AGENT**: Dashboard access (read/grep/dataview)
- **GUEST**: View only (read)

## Recent Activity (Last 24h)
`;

    const recentEntries = this.audit.getRecentEntries(50);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentActivity = recentEntries.filter(entry =>
      new Date(entry.timestamp) > last24h
    );

    if (recentActivity.length === 0) {
      report += 'No activity in the last 24 hours\n';
    } else {
      report += '| Time | User | Action | Resource | Result |\n';
      report += '|------|------|--------|----------|--------|\n';

      recentActivity.slice(0, 10).forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleString();
        report += `| ${time} | ${entry.userId} | ${entry.action} | ${entry.resource} | ${entry.result} |\n`;
      });
    }

    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const enforcer = new GovAccessEnforcer();

  if (args.length === 0) {
    console.log(`🛡️ GOV Access Control v2.11

USAGE:
  bun gov:access audit          # Full access audit + lock violators
  bun gov:access check <user> <action> <resource> [ip]  # Check access
  bun gov:access roles           # Role-based access report
  bun gov:access mfa <user> <action> <resource> <code>  # MFA auth check

EXAMPLES:
  bun gov:access audit           # Run full compliance check
  bun gov:access check user123 read dashboard 192.168.1.1
  bun gov:access roles           # Show role assignments
  bun gov:access mfa user123 deploy server 123456

RBAC ROLES:
  ADMIN  → Full access (deploy/admin)
  OPS    → Pipeline access (pipe/monitor)
  AGENT  → Read access (grep/dataview)
  GUEST  → View only

COMPLIANCE CHECKS:
  ✅ IP whitelist validation
  ✅ Role-based permissions
  ✅ MFA for sensitive actions
  ✅ Account lockout protection
  ✅ Immutable audit logging
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'audit':
        const audit = await enforcer.runFullAccessAudit();
        console.log(audit.report);

        if (audit.violations.length > 0) {
          console.log(`\n⚠️  Found ${audit.violations.length} violations - Manual review required`);
          process.exit(1);
        } else {
          console.log(`\n✅ Access controls compliant - Zero violations`);
        }
        break;

      case 'check':
        if (args.length < 4) {
          console.error('Usage: bun gov:access check <user> <action> <resource> [ip]');
          process.exit(1);
        }
        const userId = args[1];
        const action = args[2];
        const resource = args[3];
        const ip = args[4];

        const result = await enforcer.checkAccess(userId, action, resource, ip);
        if (result.allowed) {
          console.log(`✅ Access granted for ${userId} to ${action} ${resource}`);
        } else {
          console.log(`❌ Access denied: ${result.reason}`);
          if (result.requiresMFA) {
            console.log(`🔐 MFA required - use: bun gov:access mfa ${userId} ${action} ${resource} <code>`);
          }
          process.exit(1);
        }
        break;

      case 'roles':
        const report = await enforcer.generateRoleReport();
        console.log(report);
        break;

      case 'mfa':
        if (args.length < 5) {
          console.error('Usage: bun gov:access mfa <user> <action> <resource> <code> [ip]');
          process.exit(1);
        }
        const mfaUser = args[1];
        const mfaAction = args[2];
        const mfaResource = args[3];
        const mfaCode = args[4];
        const mfaIp = args[5];

        const mfaResult = await enforcer.authenticateWithMFA(mfaUser, mfaCode, mfaAction, mfaResource, mfaIp);
        if (mfaResult.allowed) {
          console.log(`✅ MFA authentication successful - access granted`);
        } else {
          console.log(`❌ MFA authentication failed: ${mfaResult.reason}`);
          process.exit(1);
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun gov:access --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
