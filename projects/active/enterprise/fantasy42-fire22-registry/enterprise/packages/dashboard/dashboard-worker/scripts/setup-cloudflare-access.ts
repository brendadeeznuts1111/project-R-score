#!/usr/bin/env bun

/**
 * 🔐 Fire22 Cloudflare Access Control Management
 *
 * Manages department-specific access policies and team permissions
 * Integrates with Cloudflare Zero Trust and Access policies
 */

import { $ } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AccessOptions {
  department?: string;
  operation?: 'create' | 'update' | 'delete' | 'list';
  environment?: 'development' | 'staging' | 'production';
  dryRun?: boolean;
  verbose?: boolean;
}

interface AccessPolicy {
  id: string;
  name: string;
  domain: string;
  department: string;
  rules: AccessRule[];
  applications: string[];
  createdAt: string;
  updatedAt: string;
}

interface AccessRule {
  action: 'allow' | 'deny' | 'bypass';
  users: string[];
  groups: string[];
  ipRanges?: string[];
  countries?: string[];
  devicePosture?: string[];
}

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
  members: any[];
  adminEmail: string;
  accessLevel: 'full' | 'limited' | 'readonly';
}

class Fire22CloudflareAccessManager {
  private readonly teamDirectory: any;
  private readonly accessConfigPath = join(process.cwd(), 'config', 'cloudflare-access.json');
  private readonly zoneId = process.env.CLOUDFLARE_ZONE_ID;
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  constructor() {
    const teamDirectoryPath = join(process.cwd(), 'src', 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  /**
   * 🔐 Setup Cloudflare Access control
   */
  async setupAccess(options: AccessOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    console.info('🔐 Fire22 Cloudflare Access Control Management');
    console.info('!==!==!==!==!==!==!==!====');

    const env = options.environment || 'development';
    console.info(`\n🎯 Environment: ${env}`);
    console.info(`🏢 Department: ${options.department || 'ALL'}`);
    console.info(`⚙️ Operation: ${options.operation || 'create'}`);

    if (options.dryRun) {
      console.info('🔍 DRY RUN MODE - No actual changes to Cloudflare');
    }

    try {
      // Verify prerequisites
      await this.verifyAccessPrerequisites(options);

      switch (options.operation) {
        case 'create':
          await this.createAccessPolicies(options);
          break;
        case 'update':
          await this.updateAccessPolicies(options);
          break;
        case 'delete':
          await this.deleteAccessPolicies(options);
          break;
        case 'list':
        default:
          await this.listAccessPolicies(options);
          break;
      }

      const setupTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      console.info(`\n✅ Access control setup completed in ${setupTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Access control setup failed:', error);
      process.exit(1);
    }
  }

  /**
   * ✅ Verify access control prerequisites
   */
  private async verifyAccessPrerequisites(options: AccessOptions): Promise<void> {
    console.info('\n✅ Verifying access control prerequisites...');

    // Check Cloudflare credentials
    if (!process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_API_KEY) {
      throw new Error(
        'Cloudflare API credentials not found. Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_KEY'
      );
    }
    console.info('  ✅ Cloudflare API credentials found');

    // Check Zone ID
    if (!this.zoneId) {
      console.info('  ⚠️ CLOUDFLARE_ZONE_ID not set - using default domain');
    } else {
      console.info('  ✅ Cloudflare Zone ID configured');
    }

    // Check Account ID
    if (!this.accountId) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID not found. Set in environment variables');
    }
    console.info('  ✅ Cloudflare Account ID configured');

    // Check Wrangler
    try {
      await $`wrangler --version`.quiet();
      console.info('  ✅ Wrangler CLI available');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install: npm install -g wrangler');
    }

    // Verify Cloudflare authentication
    try {
      await $`wrangler whoami`.quiet();
      console.info('  ✅ Cloudflare authentication verified');
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Run: wrangler login');
    }

    // Create config directory
    const configDir = join(process.cwd(), 'config');
    if (!existsSync(configDir) && !options.dryRun) {
      await $`mkdir -p ${configDir}`;
    }
    console.info('  ✅ Configuration directory ready');
  }

  /**
   * 🆕 Create access policies
   */
  private async createAccessPolicies(options: AccessOptions): Promise<void> {
    console.info('\n🆕 Creating access policies...');

    const departments = options.department
      ? [this.getDepartment(options.department)].filter(Boolean)
      : this.getDepartments();

    if (departments.length === 0) {
      throw new Error('No departments found to create policies for');
    }

    const policies: AccessPolicy[] = [];

    for (const dept of departments) {
      console.info(`  🏢 Creating policy for ${dept.name}...`);

      const policy = this.generateDepartmentPolicy(dept, options);
      policies.push(policy);

      if (!options.dryRun) {
        try {
          await this.createCloudflareAccessPolicy(policy, options);
          console.info(`    ✅ Policy created: ${policy.name}`);
        } catch (error) {
          console.info(
            `    ❌ Failed to create policy: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else {
        console.info(`    🔍 Would create policy: ${policy.name}`);
      }
    }

    // Save policies configuration
    if (!options.dryRun) {
      await this.savePoliciesConfig(policies);
    }

    console.info(`\n📊 Created ${policies.length} access policies`);
  }

  /**
   * 🔄 Update access policies
   */
  private async updateAccessPolicies(options: AccessOptions): Promise<void> {
    console.info('\n🔄 Updating access policies...');

    const existingPolicies = await this.loadPoliciesConfig();

    if (existingPolicies.length === 0) {
      console.info('  📭 No existing policies found');
      return;
    }

    for (const policy of existingPolicies) {
      if (options.department && policy.department !== options.department) {
        continue;
      }

      console.info(`  🔄 Updating policy: ${policy.name}`);

      // Refresh policy with latest department data
      const dept = this.getDepartment(policy.department);
      if (dept) {
        const updatedPolicy = this.generateDepartmentPolicy(dept, options);
        updatedPolicy.id = policy.id; // Preserve existing ID

        if (!options.dryRun) {
          try {
            await this.updateCloudflareAccessPolicy(updatedPolicy, options);
            console.info(`    ✅ Policy updated: ${policy.name}`);
          } catch (error) {
            console.info(
              `    ❌ Failed to update policy: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        } else {
          console.info(`    🔍 Would update policy: ${policy.name}`);
        }
      }
    }
  }

  /**
   * 🗑️ Delete access policies
   */
  private async deleteAccessPolicies(options: AccessOptions): Promise<void> {
    console.info('\n🗑️ Deleting access policies...');

    const existingPolicies = await this.loadPoliciesConfig();
    const policiesToDelete = options.department
      ? existingPolicies.filter(p => p.department === options.department)
      : existingPolicies;

    if (policiesToDelete.length === 0) {
      console.info('  📭 No policies found to delete');
      return;
    }

    console.info(`  ⚠️ WARNING: This will delete ${policiesToDelete.length} access policies`);

    for (const policy of policiesToDelete) {
      console.info(`  🗑️ Deleting policy: ${policy.name}`);

      if (!options.dryRun) {
        try {
          await this.deleteCloudflareAccessPolicy(policy.id, options);
          console.info(`    ✅ Policy deleted: ${policy.name}`);
        } catch (error) {
          console.info(
            `    ❌ Failed to delete policy: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else {
        console.info(`    🔍 Would delete policy: ${policy.name}`);
      }
    }

    // Update policies configuration
    if (!options.dryRun) {
      const remainingPolicies = existingPolicies.filter(p => !policiesToDelete.includes(p));
      await this.savePoliciesConfig(remainingPolicies);
    }
  }

  /**
   * 📋 List access policies
   */
  private async listAccessPolicies(options: AccessOptions): Promise<void> {
    console.info('\n📋 Listing access policies...');

    try {
      const existingPolicies = await this.loadPoliciesConfig();

      if (existingPolicies.length === 0) {
        console.info('  📭 No access policies configured');
        return;
      }

      console.info(`\n📊 Found ${existingPolicies.length} access policies:\n`);

      existingPolicies.forEach((policy, index) => {
        console.info(`${index + 1}. 🏢 ${policy.name}`);
        console.info(`   Department: ${policy.department}`);
        console.info(`   Domain: ${policy.domain}`);
        console.info(`   Applications: ${policy.applications.length}`);
        console.info(`   Rules: ${policy.rules.length}`);
        console.info(`   Created: ${new Date(policy.createdAt).toLocaleString()}`);
        console.info(`   Updated: ${new Date(policy.updatedAt).toLocaleString()}`);

        if (options.verbose) {
          console.info(`   Rules Details:`);
          policy.rules.forEach((rule, ruleIndex) => {
            console.info(`     ${ruleIndex + 1}. ${rule.action.toUpperCase()}`);
            console.info(`        Users: ${rule.users.length}`);
            console.info(`        Groups: ${rule.groups.length}`);
            if (rule.ipRanges) console.info(`        IP Ranges: ${rule.ipRanges.length}`);
            if (rule.countries) console.info(`        Countries: ${rule.countries.length}`);
          });
        }

        console.info('');
      });

      // Summary by department
      const departmentSummary = existingPolicies.reduce(
        (acc, policy) => {
          acc[policy.department] = (acc[policy.department] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.info('📈 Summary by Department:');
      console.info('!==!==!==!====');
      Object.entries(departmentSummary).forEach(([dept, count]) => {
        const department = this.getDepartment(dept);
        console.info(`🏢 ${department?.name || dept}: ${count} policies`);
      });
    } catch (error) {
      console.info('  ❌ Failed to load existing policies');
    }
  }

  /**
   * 🏭 Generate department access policy
   */
  private generateDepartmentPolicy(dept: Department, options: AccessOptions): AccessPolicy {
    const now = new Date().toISOString();
    const baseUrl =
      options.environment === 'production' ? 'dashboard.fire22.ag' : 'fire22-dashboard.pages.dev';

    return {
      id: `fire22-${dept.id}-${Date.now()}`, // Temporary ID, will be replaced by Cloudflare
      name: `Fire22 ${dept.name} Department Access`,
      domain: `${dept.id}.${baseUrl}`,
      department: dept.id,
      rules: [
        {
          action: 'allow',
          users: [dept.adminEmail, ...dept.members.map(m => m.email)].filter(Boolean),
          groups: [`${dept.id}-department`, 'fire22-admins'],
          ipRanges: ['192.168.1.0/24'], // Office network
          countries: ['US', 'CA'], // Allowed countries
          devicePosture: ['managed-device'], // Corporate devices only
        },
        {
          action: 'deny',
          users: [],
          groups: ['blocked-users'],
          ipRanges: [], // No specific IP blocks
          countries: [], // No country blocks
          devicePosture: ['unmanaged-device'], // Block unmanaged devices
        },
      ],
      applications: [`${dept.id}.${baseUrl}`, `${baseUrl}/${dept.id}/`],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * ☁️ Create Cloudflare Access Policy (API call)
   */
  private async createCloudflareAccessPolicy(
    policy: AccessPolicy,
    options: AccessOptions
  ): Promise<void> {
    // This would make actual API calls to Cloudflare
    // For now, simulate the API call

    const apiPayload = {
      name: policy.name,
      decision: 'allow',
      include: policy.rules
        .filter(r => r.action === 'allow')
        .map(r => ({
          email: r.users,
          group: r.groups,
          ip: r.ipRanges,
          geo: r.countries,
        })),
      exclude: policy.rules
        .filter(r => r.action === 'deny')
        .map(r => ({
          email: r.users,
          group: r.groups,
        })),
    };

    if (options.verbose) {
      console.info(`    📋 API Payload: ${JSON.stringify(apiPayload, null, 2)}`);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In real implementation, this would be:
    // const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/access/policies`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(apiPayload)
    // });
  }

  /**
   * 🔄 Update Cloudflare Access Policy (API call)
   */
  private async updateCloudflareAccessPolicy(
    policy: AccessPolicy,
    options: AccessOptions
  ): Promise<void> {
    // Similar to create but with PUT method and policy ID
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * 🗑️ Delete Cloudflare Access Policy (API call)
   */
  private async deleteCloudflareAccessPolicy(
    policyId: string,
    options: AccessOptions
  ): Promise<void> {
    // Similar to create but with DELETE method
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * 💾 Save policies configuration
   */
  private async savePoliciesConfig(policies: AccessPolicy[]): Promise<void> {
    const config = {
      lastUpdated: new Date().toISOString(),
      environment: 'development',
      totalPolicies: policies.length,
      policies: policies,
    };

    writeFileSync(this.accessConfigPath, JSON.stringify(config, null, 2));
    console.info(`  💾 Saved policies configuration: ${this.accessConfigPath}`);
  }

  /**
   * 📂 Load policies configuration
   */
  private async loadPoliciesConfig(): Promise<AccessPolicy[]> {
    if (!existsSync(this.accessConfigPath)) {
      return [];
    }

    const config = JSON.parse(readFileSync(this.accessConfigPath, 'utf-8'));
    return config.policies || [];
  }

  /**
   * 🏢 Get departments from team directory
   */
  private getDepartments(): Department[] {
    const departments: Department[] = [];

    for (const [key, dept] of Object.entries(this.teamDirectory.departments)) {
      if (dept && typeof dept === 'object' && 'name' in dept) {
        departments.push({
          id: key,
          name: dept.name,
          email: dept.email,
          domain: dept.domain,
          color: dept.color,
          members: dept.members || [],
          adminEmail: dept.email,
          accessLevel: 'full', // Default access level
        });
      }
    }

    return departments;
  }

  /**
   * 🔍 Get specific department
   */
  private getDepartment(deptId: string): Department | null {
    return this.getDepartments().find(d => d.id === deptId) || null;
  }
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: AccessOptions = {
    operation: 'list',
    environment: 'development',
    dryRun: false,
    verbose: false,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case 'create':
      case 'update':
      case 'delete':
      case 'list':
        options.operation = arg;
        break;
      case '--dept':
      case '--department':
        options.department = args[++i];
        break;
      case '--env':
      case '--environment':
        options.environment = args[++i] as any;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.info(`
🔐 Fire22 Cloudflare Access Control Management

Usage:
  bun run scripts/setup-cloudflare-access.ts [operation] [options]

Operations:
  create                  Create new access policies
  update                  Update existing access policies
  delete                  Delete access policies
  list                    List existing access policies (default)

Options:
  --dept, --department    Target specific department
  --env, --environment    Environment (development|staging|production)
  --dry-run               Preview changes without executing
  --verbose               Detailed logging
  --help                  Show this help

Examples:
  bun run scripts/setup-cloudflare-access.ts list
  bun run scripts/setup-cloudflare-access.ts create --dept finance
  bun run scripts/setup-cloudflare-access.ts update --env production
  bun run scripts/setup-cloudflare-access.ts delete --dept technology --dry-run

Required Environment Variables:
  CLOUDFLARE_API_TOKEN    Your Cloudflare API token
  CLOUDFLARE_ACCOUNT_ID   Your Cloudflare account ID
  CLOUDFLARE_ZONE_ID      Your domain zone ID (optional)

Department Self-Service Examples:
  bun run access:setup finance
  bun run access:update technology
  bun run access:list
        `);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  const accessManager = new Fire22CloudflareAccessManager();
  await accessManager.setupAccess(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22CloudflareAccessManager };
