#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Cloudflare Status Checker
 * Comprehensive status verification for Cloudflare integration
 */

import { $ } from 'bun';

interface StatusCheck {
  name: string;
  status: '✅' | '❌' | '⏳' | '⚠️';
  message: string;
  details?: string;
}

async function checkRepositoryPrivacy(): Promise<StatusCheck> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/brendadeeznuts1111/fantasy42-fire22-registry'
    );
    const data = await response.json();

    if (data.private) {
      return {
        name: 'Repository Privacy',
        status: '✅',
        message: 'Repository is private and secure',
        details: '✅ Private repository confirmed',
      };
    } else {
      return {
        name: 'Repository Privacy',
        status: '❌',
        message: 'Repository is PUBLIC - SECURITY RISK',
        details: '❌ Repository must be made private immediately',
      };
    }
  } catch (error) {
    return {
      name: 'Repository Privacy',
      status: '⚠️',
      message: 'Unable to verify repository privacy',
      details: `Error: ${error.message}`,
    };
  }
}

async function checkWranglerAuth(): Promise<StatusCheck> {
  try {
    const result = await $`wrangler auth whoami`.quiet();

    if (result.exitCode === 0 && result.stdout.includes('Authenticated')) {
      return {
        name: 'Wrangler Authentication',
        status: '✅',
        message: 'Authenticated with Cloudflare',
        details: result.stdout.toString().trim(),
      };
    } else {
      return {
        name: 'Wrangler Authentication',
        status: '❌',
        message: 'Not authenticated with Cloudflare',
        details: 'Run: wrangler auth login',
      };
    }
  } catch (error) {
    return {
      name: 'Wrangler Authentication',
      status: '❌',
      message: 'Wrangler authentication failed',
      details: `Error: ${error.message}`,
    };
  }
}

async function checkCloudflareResources(): Promise<StatusCheck[]> {
  const checks: StatusCheck[] = [];

  // Check D1 Database
  try {
    const d1Result = await $`wrangler d1 list`.quiet();
    if (d1Result.exitCode === 0) {
      const d1Output = d1Result.stdout.toString();
      if (d1Output.includes('fantasy42-registry')) {
        checks.push({
          name: 'D1 Database',
          status: '✅',
          message: 'D1 database configured',
          details: 'fantasy42-registry database found',
        });
      } else {
        checks.push({
          name: 'D1 Database',
          status: '⚠️',
          message: 'D1 database may need setup',
          details: 'fantasy42-registry database not found',
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'D1 Database',
      status: '❌',
      message: 'D1 database check failed',
      details: `Error: ${error.message}`,
    });
  }

  // Check KV Namespaces
  try {
    const kvResult = await $`wrangler kv:namespace list`.quiet();
    if (kvResult.exitCode === 0) {
      const kvOutput = kvResult.stdout.toString();
      if (kvOutput.includes('CACHE')) {
        checks.push({
          name: 'KV Namespaces',
          status: '✅',
          message: 'KV namespaces configured',
          details: 'CACHE namespace found',
        });
      } else {
        checks.push({
          name: 'KV Namespaces',
          status: '⚠️',
          message: 'KV namespaces may need setup',
          details: 'CACHE namespace not found',
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'KV Namespaces',
      status: '❌',
      message: 'KV namespace check failed',
      details: `Error: ${error.message}`,
    });
  }

  // Check R2 Buckets
  try {
    const r2Result = await $`wrangler r2 bucket list`.quiet();
    if (r2Result.exitCode === 0) {
      const r2Output = r2Result.stdout.toString();
      if (r2Output.includes('fantasy42-packages')) {
        checks.push({
          name: 'R2 Buckets',
          status: '✅',
          message: 'R2 buckets configured',
          details: 'fantasy42-packages bucket found',
        });
      } else {
        checks.push({
          name: 'R2 Buckets',
          status: '⚠️',
          message: 'R2 buckets may need setup',
          details: 'fantasy42-packages bucket not found',
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'R2 Buckets',
      status: '❌',
      message: 'R2 bucket check failed',
      details: `Error: ${error.message}`,
    });
  }

  // Check Queues
  try {
    const queueResult = await $`wrangler queues list`.quiet();
    if (queueResult.exitCode === 0) {
      const queueOutput = queueResult.stdout.toString();
      if (queueOutput.includes('registry-events')) {
        checks.push({
          name: 'Queues',
          status: '✅',
          message: 'Queues configured',
          details: 'registry-events queue found',
        });
      } else {
        checks.push({
          name: 'Queues',
          status: '⚠️',
          message: 'Queues may need setup',
          details: 'registry-events queue not found',
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'Queues',
      status: '❌',
      message: 'Queue check failed',
      details: `Error: ${error.message}`,
    });
  }

  return checks;
}

async function checkEnvironmentConfig(): Promise<StatusCheck> {
  const requiredEnvVars = [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'REGISTRY_DB_ID',
    'CACHE_KV_ID',
  ];

  const missingVars: string[] = [];
  const presentVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (Bun.env[envVar]) {
      presentVars.push(envVar);
    } else {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length === 0) {
    return {
      name: 'Environment Configuration',
      status: '✅',
      message: 'All required environment variables configured',
      details: `Present: ${presentVars.join(', ')}`,
    };
  } else {
    return {
      name: 'Environment Configuration',
      status: '⚠️',
      message: 'Some environment variables missing',
      details: `Missing: ${missingVars.join(', ')}\nPresent: ${presentVars.join(', ')}`,
    };
  }
}

async function checkGitHubActions(): Promise<StatusCheck> {
  try {
    // Check if .github directory exists
    const githubDir = './.github';
    const workflowsDir = `${githubDir}/workflows`;

    const hasGithubDir = await Bun.file(githubDir).exists();
    const hasWorkflowsDir = await Bun.file(workflowsDir).exists();

    if (!hasGithubDir) {
      return {
        name: 'GitHub Actions',
        status: '❌',
        message: 'GitHub Actions not configured',
        details: '.github directory missing',
      };
    }

    if (!hasWorkflowsDir) {
      return {
        name: 'GitHub Actions',
        status: '⚠️',
        message: 'GitHub Actions partially configured',
        details: 'workflows directory missing',
      };
    }

    // Count workflow files
    const workflowFiles = await Bun.$`ls -1 .github/workflows/*.yml 2>/dev/null | wc -l`.quiet();
    const workflowCount = parseInt(workflowFiles.stdout.toString().trim()) || 0;

    return {
      name: 'GitHub Actions',
      status: workflowCount > 0 ? '✅' : '⚠️',
      message: `${workflowCount} workflow(s) configured`,
      details:
        workflowCount > 0 ? `${workflowCount} workflow files found` : 'No workflow files found',
    };
  } catch (error) {
    return {
      name: 'GitHub Actions',
      status: '⚠️',
      message: 'Unable to check GitHub Actions',
      details: `Error: ${error.message}`,
    };
  }
}

async function runStatusCheck() {
  console.log(`🔍 Fantasy42-Fire22 Cloudflare Status Check`);
  console.log('═'.repeat(60));
  console.log('');

  const allChecks: StatusCheck[] = [];

  // Repository Privacy
  console.log(`📦 Checking repository privacy...`);
  const repoCheck = await checkRepositoryPrivacy();
  allChecks.push(repoCheck);
  console.log(`${repoCheck.status} ${repoCheck.name}: ${repoCheck.message}`);
  if (repoCheck.details) console.log(`   └─ ${repoCheck.details}`);
  console.log('');

  // Wrangler Authentication
  console.log(`🔐 Checking Wrangler authentication...`);
  const authCheck = await checkWranglerAuth();
  allChecks.push(authCheck);
  console.log(`${authCheck.status} ${authCheck.name}: ${authCheck.message}`);
  if (authCheck.details) console.log(`   └─ ${authCheck.details}`);
  console.log('');

  // Environment Configuration
  console.log(`⚙️ Checking environment configuration...`);
  const envCheck = await checkEnvironmentConfig();
  allChecks.push(envCheck);
  console.log(`${envCheck.status} ${envCheck.name}: ${envCheck.message}`);
  if (envCheck.details) console.log(`   └─ ${envCheck.details}`);
  console.log('');

  // Cloudflare Resources
  console.log(`☁️ Checking Cloudflare resources...`);
  const resourceChecks = await checkCloudflareResources();
  allChecks.push(...resourceChecks);

  for (const check of resourceChecks) {
    console.log(`${check.status} ${check.name}: ${check.message}`);
    if (check.details) console.log(`   └─ ${check.details}`);
  }
  console.log('');

  // GitHub Actions
  console.log(`🚀 Checking GitHub Actions...`);
  const githubCheck = await checkGitHubActions();
  allChecks.push(githubCheck);
  console.log(`${githubCheck.status} ${githubCheck.name}: ${githubCheck.message}`);
  if (githubCheck.details) console.log(`   └─ ${githubCheck.details}`);
  console.log('');

  // Summary
  console.log(`📊 Status Summary`);
  console.log('═'.repeat(60));

  const successCount = allChecks.filter(c => c.status === '✅').length;
  const warningCount = allChecks.filter(c => c.status === '⚠️').length;
  const errorCount = allChecks.filter(c => c.status === '❌').length;
  const totalCount = allChecks.length;

  console.log(`Total Checks: ${totalCount}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⚠️ Warnings: ${warningCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  console.log('');

  // Critical Issues
  const criticalIssues = allChecks.filter(c => c.status === '❌');
  if (criticalIssues.length > 0) {
    console.log(`🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:`);
    for (const issue of criticalIssues) {
      console.log(`   ❌ ${issue.name}: ${issue.message}`);
    }
    console.log('');
  }

  // Recommendations
  console.log(`💡 RECOMMENDATIONS:`);

  if (repoCheck.status === '❌') {
    console.log(`   🔒 Make repository private immediately`);
    console.log(
      `      Visit: https://github.com/brendadeeznuts1111/fantasy42-fire22-registry/settings`
    );
  }

  if (authCheck.status === '❌') {
    console.log(`   🔑 Authenticate with Cloudflare`);
    console.log(`      Run: wrangler auth login`);
  }

  if (envCheck.status === '⚠️' || envCheck.status === '❌') {
    console.log(`   ⚙️ Configure environment variables`);
    console.log(`      Copy: enterprise/config/.env.example to .env`);
    console.log(`      Fill in your Cloudflare credentials`);
  }

  if (resourceChecks.some(c => c.status === '⚠️' || c.status === '❌')) {
    console.log(`   🏗️ Setup Cloudflare resources`);
    console.log(`      Run: bun run enterprise:setup`);
  }

  if (githubCheck.status === '⚠️' || githubCheck.status === '❌') {
    console.log(`   🚀 Configure GitHub Actions`);
    console.log(`      Add required secrets to repository settings`);
  }

  console.log('');
  console.log(`🔧 QUICK SETUP COMMANDS:`);
  console.log(`   bun run enterprise:setup     # Complete setup`);
  console.log(`   bun run enterprise:verify    # Verify everything`);
  console.log(`   wrangler auth login         # Authenticate`);
  console.log(`   bun run dns:check           # Check DNS`);

  if (successCount === totalCount) {
    console.log('');
    console.log(`🎉 ALL CHECKS PASSED! Cloudflare integration is ready!`);
  } else {
    console.log('');
    console.log(`⚠️ Some issues found. Follow the recommendations above.`);
  }
}

// Run the status check
if (import.meta.main) {
  runStatusCheck().catch(console.error);
}
