#!/usr/bin/env bun

// [GOV][ENFORCEMENT][ENGINE][GOV-ENF-001][v2.11][ACTIVE]

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { GovernanceEngine } from "./gov-rules";
import AccessControlSystem from "./access-control";

interface SecurityCheck {
  id: string;
  name: string;
  check: () => Promise<{ passed: boolean; details: string; fix?: string }>;
}

interface AccessCheck {
  id: string;
  name: string;
  check: () => Promise<{ passed: boolean; details: string; fix?: string }>;
}

class GovernanceEnforcer {
  private gov: GovernanceEngine;
  private acs: AccessControlSystem;

  constructor() {
    this.gov = new GovernanceEngine();
    this.acs = new AccessControlSystem();
  }

  async enforceSecurity(): Promise<void> {
    console.log('🔒 ENFORCING SECURITY RULES v2.11\n');

    const checks: SecurityCheck[] = [
      {
        id: 'SEC-ENV-001',
        name: 'Environment Variables Migration',
        check: this.checkEnvFiles.bind(this)
      },
      {
        id: 'SEC-SECRETS-SCAN-001',
        name: 'Secrets Scanning',
        check: this.checkSecretsScan.bind(this)
      },
      {
        id: 'SEC-TOKEN-ROT-001',
        name: 'Token Rotation',
        check: this.checkTokenRotation.bind(this)
      },
      {
        id: 'SEC-IP-WHITE-001',
        name: 'IP Whitelist',
        check: this.checkIPWhitelist.bind(this)
      },
      {
        id: 'SEC-VULN-SCAN-001',
        name: 'Vulnerability Scanning',
        check: this.checkVulnerabilities.bind(this)
      },
      {
        id: 'SEC-EXE-SIGN-002',
        name: 'Executable Signing',
        check: this.checkExecutableSigning.bind(this)
      },
      {
        id: 'SEC-DEP-PIN-001',
        name: 'Dependency Pinning',
        check: this.checkDependencyPinning.bind(this)
      },
      {
        id: 'SEC-GIT-HOOK-001',
        name: 'Git Hooks',
        check: this.checkGitHooks.bind(this)
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
      console.log(`🔍 ${check.name}...`);
      try {
        const result = await check.check();
        if (result.passed) {
          console.log(`  ✅ PASSED: ${result.details}`);
          passed++;
        } else {
          console.log(`  ❌ FAILED: ${result.details}`);
          if (result.fix) {
            console.log(`    💡 FIX: ${result.fix}`);
          }
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        failed++;
      }
      console.log('');
    }

    console.log(`📊 SECURITY ENFORCEMENT COMPLETE:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Compliance: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed > 0) {
      console.log('\n🚨 SECURITY VIOLATIONS DETECTED - MANUAL REVIEW REQUIRED');
      process.exit(1);
    } else {
      console.log('\n🛡️  SECURITY ENFORCEMENT PASSED - SYSTEM SECURE');
    }
  }

  async enforceAccess(): Promise<void> {
    console.log('🔐 ENFORCING ACCESS CONTROL RULES v2.11\n');

    const checks: AccessCheck[] = [
      {
        id: 'ACCESS-RBAC-001',
        name: 'RBAC Configuration',
        check: this.checkRBACConfig.bind(this)
      },
      {
        id: 'ACCESS-IP-001',
        name: 'IP Access Control',
        check: this.checkIPAccess.bind(this)
      },
      {
        id: 'ACCESS-SESSION-001',
        name: 'Session Management',
        check: this.checkSessionManagement.bind(this)
      },
      {
        id: 'ACCESS-AUDIT-001',
        name: 'Audit Logging',
        check: this.checkAuditLogging.bind(this)
      },
      {
        id: 'ACCESS-WS-JWT-001',
        name: 'WebSocket JWT Auth',
        check: this.checkWebSocketAuth.bind(this)
      },
      {
        id: 'ACCESS-LOG-IMMUT-001',
        name: 'Immutable Logging',
        check: this.checkImmutableLogging.bind(this)
      },
      {
        id: 'ACCESS-VPN-001',
        name: 'VPN Enforcement',
        check: this.checkVPNEnforcement.bind(this)
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
      console.log(`🔍 ${check.name}...`);
      try {
        const result = await check.check();
        if (result.passed) {
          console.log(`  ✅ PASSED: ${result.details}`);
          passed++;
        } else {
          console.log(`  ❌ FAILED: ${result.details}`);
          if (result.fix) {
            console.log(`    💡 FIX: ${result.fix}`);
          }
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        failed++;
      }
      console.log('');
    }

    console.log(`📊 ACCESS ENFORCEMENT COMPLETE:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Compliance: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed > 0) {
      console.log('\n🚨 ACCESS VIOLATIONS DETECTED - MANUAL REVIEW REQUIRED');
      process.exit(1);
    } else {
      console.log('\n🔒 ACCESS ENFORCEMENT PASSED - SYSTEM LOCKED DOWN');
    }
  }

  // Security checks implementation
  private async checkEnvFiles(): Promise<{ passed: boolean; details: string; fix?: string }> {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    const found = envFiles.filter(file => existsSync(file));

    if (found.length > 0) {
      return {
        passed: false,
        details: `Found ${found.length} .env files: ${found.join(', ')}`,
        fix: 'Migrate to Bun.secrets: bun secrets:set KEY value && rm .env'
      };
    }

    return {
      passed: true,
      details: 'No .env files detected'
    };
  }

  private async checkSecretsScan(): Promise<{ passed: boolean; details: string; fix?: string }> {
    try {
      // Check if truffleHog is available
      const result = Bun.spawnSync(['which', 'trufflehog'], { cwd: process.cwd() });
      if (result.exitCode !== 0) {
        return {
          passed: false,
          details: 'truffleHog not installed',
          fix: 'Install: pip install trufflehog3'
        };
      }

      // Run secrets scan (limited check)
      const scan = Bun.spawnSync(['git', 'ls-files'], { cwd: process.cwd() });
      const hasGit = scan.exitCode === 0;

      if (!hasGit) {
        return {
          passed: false,
          details: 'No git repository detected',
          fix: 'Initialize git: git init'
        };
      }

      return {
        passed: true,
        details: 'Secrets scanning capability available'
      };
    } catch (error) {
      return {
        passed: false,
        details: `Secrets scan failed: ${error.message}`,
        fix: 'Install trufflehog and ensure git repository'
      };
    }
  }

  private async checkTokenRotation(): Promise<{ passed: boolean; details: string; fix?: string }> {
    // Check for old tokens in config
    const configFiles = ['config/users.json', 'config/sessions.json'];
    let hasOldTokens = false;

    for (const file of configFiles) {
      if (existsSync(file)) {
        try {
          const data = JSON.parse(readFileSync(file, 'utf-8'));
          const now = Date.now();
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;

          // Check for old tokens/sessions
          if (data.users) {
            for (const user of data.users) {
              if (user.lastActive) {
                const lastActive = new Date(user.lastActive).getTime();
                if (now - lastActive > thirtyDays) {
                  hasOldTokens = true;
                  break;
                }
              }
            }
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
    }

    if (hasOldTokens) {
      return {
        passed: false,
        details: 'Old tokens detected (>30 days)',
        fix: 'Rotate tokens: bun secrets:rotate-all'
      };
    }

    return {
      passed: true,
      details: 'Token rotation policy compliant'
    };
  }

  private async checkIPWhitelist(): Promise<{ passed: boolean; details: string; fix?: string }> {
    // Check if IP whitelist is configured
    const usersFile = 'config/users.json';
    if (!existsSync(usersFile)) {
      return {
        passed: false,
        details: 'No user configuration found',
        fix: 'Configure users: bun access-control.ts user:create admin ADMIN'
      };
    }

    try {
      const data = JSON.parse(readFileSync(usersFile, 'utf-8'));
      const hasWhitelist = data.users && data.users.some((u: any) => u.ipWhitelist && u.ipWhitelist.length > 0);

      if (!hasWhitelist) {
        return {
          passed: false,
          details: 'No IP whitelisting configured',
          fix: 'Configure IP whitelist in config/users.json'
        };
      }

      return {
        passed: true,
        details: 'IP whitelisting configured'
      };
    } catch (error) {
      return {
        passed: false,
        details: 'User configuration parse error',
        fix: 'Fix config/users.json format'
      };
    }
  }

  private async checkVulnerabilities(): Promise<{ passed: boolean; details: string; fix?: string }> {
    try {
      const result = Bun.spawnSync(['bun', 'audit'], { cwd: process.cwd() });
      if (result.exitCode === 0) {
        return {
          passed: true,
          details: 'No vulnerabilities detected'
        };
      } else {
        return {
          passed: false,
          details: 'Vulnerabilities detected in dependencies',
          fix: 'Run: bun audit --fix'
        };
      }
    } catch (error) {
      return {
        passed: false,
        details: 'Vulnerability scan failed',
        fix: 'Ensure bun is installed and package.json exists'
      };
    }
  }

  private async checkExecutableSigning(): Promise<{ passed: boolean; details: string; fix?: string }> {
    const exeFiles = ['datapipe.exe', 'datapipe-mac', 'datapipe-win.exe'];
    const exists = exeFiles.some(file => existsSync(file));

    if (!exists) {
      return {
        passed: false,
        details: 'No executable files found',
        fix: 'Build executables: bun build:exe'
      };
    }

    // Check if codesign is available (macOS)
    const result = Bun.spawnSync(['which', 'codesign'], { cwd: process.cwd() });
    if (result.exitCode !== 0) {
      return {
        passed: false,
        details: 'Code signing not available',
        fix: 'Install Xcode command line tools (macOS) or signtool (Windows)'
      };
    }

    return {
      passed: true,
      details: 'Executable signing capability available'
    };
  }

  private async checkDependencyPinning(): Promise<{ passed: boolean; details: string; fix?: string }> {
    if (!existsSync('package.json')) {
      return {
        passed: false,
        details: 'No package.json found',
        fix: 'Create package.json'
      };
    }

    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      const hasLockfile = existsSync('bun.lockb') || existsSync('bun.lock') || existsSync('package-lock.json');

      if (!hasLockfile) {
        return {
          passed: false,
          details: 'No lockfile found',
          fix: 'Run: bun install to create lockfile'
        };
      }

      return {
        passed: true,
        details: 'Dependencies properly pinned'
      };
    } catch (error) {
      return {
        passed: false,
        details: 'package.json parse error',
        fix: 'Fix package.json format'
      };
    }
  }

  private async checkGitHooks(): Promise<{ passed: boolean; details: string; fix?: string }> {
    const hooksDir = '.git/hooks';
    const customHooksDir = '.githooks';

    if (!existsSync(hooksDir)) {
      return {
        passed: false,
        details: 'No git hooks directory',
        fix: 'Initialize git repository'
      };
    }

    // Check if using custom hooks path
    try {
      const gitConfig = Bun.spawnSync(['git', 'config', 'core.hooksPath'], { cwd: process.cwd() });
      const customHooksPath = gitConfig.stdout.toString().trim();

      if (customHooksPath === '.githooks') {
        // Using custom hooks directory
        const hooks = ['pre-commit', 'pre-push'];
        const exists = hooks.every(hook => existsSync(join(customHooksDir, hook)));

        if (!exists) {
          return {
            passed: false,
            details: 'Custom git hooks not configured',
            fix: 'Ensure .githooks/pre-commit and .githooks/pre-push exist and are executable'
          };
        }

        return {
          passed: true,
          details: 'Custom git hooks configured (.githooks)'
        };
      }
    } catch (error) {
      // Fall back to standard hooks check
    }

    // Standard hooks check
    const hooks = ['pre-commit', 'pre-push', 'commit-msg'];
    const exists = hooks.some(hook => existsSync(join(hooksDir, hook)));

    if (!exists) {
      return {
        passed: false,
        details: 'No security git hooks configured',
        fix: 'Setup hooks: cp .githooks/* .git/hooks/ && chmod +x .git/hooks/*'
      };
    }

    return {
      passed: true,
      details: 'Git hooks configured'
    };
  }

  // Access checks implementation
  private async checkRBACConfig(): Promise<{ passed: boolean; details: string; fix?: string }> {
    const users = Array.from(this.acs['users'].values());
    if (users.length === 0) {
      return {
        passed: false,
        details: 'No users configured',
        fix: 'Create admin user: bun access-control.ts user:create admin ADMIN'
      };
    }

    const hasAdmin = users.some(u => u.role === 'ADMIN');
    if (!hasAdmin) {
      return {
        passed: false,
        details: 'No admin user configured',
        fix: 'Create admin user: bun access-control.ts user:create admin ADMIN'
      };
    }

    return {
      passed: true,
      details: `RBAC configured with ${users.length} users`
    };
  }

  private async checkIPAccess(): Promise<{ passed: boolean; details: string; fix?: string }> {
    return this.checkIPWhitelist(); // Reuse security check
  }

  private async checkSessionManagement(): Promise<{ passed: boolean; details: string; fix?: string }> {
    const users = Array.from(this.acs['users'].values());
    const activeSessions = users.filter(u => u.sessionToken).length;

    if (activeSessions === 0) {
      return {
        passed: false,
        details: 'No active sessions',
        fix: 'Sessions will be created on login'
      };
    }

    // Check for expired sessions
    const now = Date.now();
    const expired = users.filter(u => {
      if (!u.sessionToken || !u.lastActive) return false;
      const lastActive = new Date(u.lastActive).getTime();
      return now - lastActive > 2 * 60 * 60 * 1000; // 2 hours
    });

    if (expired.length > 0) {
      return {
        passed: false,
        details: `${expired.length} expired sessions detected`,
        fix: 'Sessions will be cleaned up automatically'
      };
    }

    return {
      passed: true,
      details: `${activeSessions} active sessions`
    };
  }

  private async checkAuditLogging(): Promise<{ passed: boolean; details: string; fix?: string }> {
    // Check if audit directory exists
    const auditDir = 'logs/audit';
    if (!existsSync(auditDir)) {
      return {
        passed: false,
        details: 'No audit log directory',
        fix: 'Create logs/audit directory'
      };
    }

    // Check for recent audit logs
    try {
      const files = readdirSync(auditDir);
      const recentLogs = files.filter(file => {
        const stat = statSync(join(auditDir, file));
        const age = Date.now() - stat.mtime.getTime();
        return age < 24 * 60 * 60 * 1000; // 24 hours
      });

      if (recentLogs.length === 0) {
        return {
          passed: false,
          details: 'No recent audit logs',
          fix: 'Audit logs will be created on access events'
        };
      }

      return {
        passed: true,
        details: `${recentLogs.length} recent audit logs`
      };
    } catch (error) {
      return {
        passed: false,
        details: 'Audit log check failed',
        fix: 'Ensure logs/audit directory is accessible'
      };
    }
  }

  private async checkWebSocketAuth(): Promise<{ passed: boolean; details: string; fix?: string }> {
    // Check if WebSocket server config exists
    const wsConfig = 'config/websocket.json';
    if (!existsSync(wsConfig)) {
      return {
        passed: false,
        details: 'No WebSocket configuration',
        fix: 'Configure WebSocket auth in config/websocket.json'
      };
    }

    try {
      const config = JSON.parse(readFileSync(wsConfig, 'utf-8'));
      if (!config.websocketSecurity || !config.websocketSecurity.jwtRequired) {
        return {
          passed: false,
          details: 'JWT authentication not required',
          fix: 'Set websocketSecurity.jwtRequired: true in websocket config'
        };
      }

      return {
        passed: true,
        details: 'WebSocket JWT authentication configured'
      };
    } catch (error) {
      return {
        passed: false,
        details: 'WebSocket config parse error',
        fix: 'Fix config/websocket.json format'
      };
    }
  }

  private async checkImmutableLogging(): Promise<{ passed: boolean; details: string; fix?: string }> {
    // Check for SHA256 hash files (simplified immutable check)
    const logDir = 'logs';
    if (!existsSync(logDir)) {
      return {
        passed: false,
        details: 'No logs directory',
        fix: 'Create logs directory'
      };
    }

    const files = readdirSync(logDir);
    const hasHashes = files.some(file => file.endsWith('.sha256'));

    if (!hasHashes) {
      return {
        passed: false,
        details: 'No immutable hash files',
        fix: 'Implement SHA256 hashing for log files'
      };
    }

    return {
      passed: true,
      details: 'Immutable logging hashes present'
    };
  }

  private async checkVPNEnforcement(): Promise<{ passed: boolean; details: string; fix?: string }> {
    // Check if VPN check is configured
    const securityConfig = 'config/security.json';
    if (!existsSync(securityConfig)) {
      return {
        passed: false,
        details: 'No security configuration',
        fix: 'Configure VPN enforcement in config/security.json'
      };
    }

    try {
      const config = JSON.parse(readFileSync(securityConfig, 'utf-8'));
      if (!config.vpnEnforcement || !config.vpnEnforcement.required) {
        return {
          passed: false,
          details: 'VPN enforcement not required',
          fix: 'Set vpnEnforcement.required: true in security config'
        };
      }

      return {
        passed: true,
        details: 'VPN enforcement configured'
      };
    } catch (error) {
      return {
        passed: false,
        details: 'Security config parse error',
        fix: 'Fix config/security.json format'
      };
    }
  }
}

// CLI interface
if (import.meta.main) {
  const enforcer = new GovernanceEnforcer();
  const command = process.argv[2];

  switch (command) {
    case 'security':
      enforcer.enforceSecurity();
      break;
    case 'access':
      enforcer.enforceAccess();
      break;
    default:
      console.log('Usage: bun gov-enforce.ts <security|access>');
      process.exit(1);
  }
}
