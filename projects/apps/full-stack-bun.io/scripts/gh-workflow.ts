#!/usr/bin/env bun
/**
 * GitHub CLI Workflow Automation
 * GH.WORKFLOW - Automated GitHub operations with Cursor Rules compliance
 */

import { spawn } from "bun";
import { readFileSync } from "fs";

// GH.WORKFLOW - GitHub CLI integration with Cursor Rules
class GitHubWorkflow {
  private repo: string;

  constructor() {
    // Extract repo from git remote
    this.repo = this.getRepoInfo();
  }

  private getRepoInfo(): string {
    try {
      const result = spawn({
        cmd: ["git", "remote", "get-url", "origin"],
        stdout: "pipe",
        stderr: "pipe"
      });

      const output = new Response(result.stdout).textSync();
      // Extract owner/repo from URL
      const match = output.match(/github\.com[\/:]([^\/]+\/[^\/\.]+)/);
      return match ? match[1] : "unknown/repo";
    } catch {
      return "unknown/repo";
    }
  }

  // Create a new issue with Cursor Rules formatting
  async createIssue(type: 'feature' | 'bug' | 'chore', title: string, body?: string) {
    const labels = {
      feature: "enhancement",
      bug: "bug",
      chore: "maintenance"
    };

    const fullTitle = `${type}: ${title}`;
    const issueBody = body || this.generateIssueTemplate(type);

    console.log(`GH.WORKFLOW - Creating ${type} issue: ${fullTitle}`);

    const result = spawn({
      cmd: [
        "gh", "issue", "create",
        "--title", fullTitle,
        "--body", issueBody,
        "--label", labels[type],
        "--assignee", "@me"
      ],
      stdout: "inherit",
      stderr: "inherit"
    });

    const exitCode = await result.exited;
    if (exitCode === 0) {
      console.log("✅ Issue created successfully");
    } else {
      console.error("❌ Failed to create issue");
    }
  }

  // Create PR with DDA tagging and Cursor Rules compliance
  async createPR(branch: string, title: string, body?: string) {
    const scope = this.detectScope(title);
    const type = this.detectType(title);
    const ddd = this.detectDDD(title);

    const taggedTitle = `[SCOPE:${scope}][TPE:${type}][DDD:${ddd}] ${title}`;
    const prBody = body || this.generatePRTemplate(scope, type, ddd);

    console.log(`GH.WORKFLOW - Creating PR: ${taggedTitle}`);

    const result = spawn({
      cmd: [
        "gh", "pr", "create",
        "--title", taggedTitle,
        "--body", prBody,
        "--base", "main",
        "--head", branch
      ],
      stdout: "inherit",
      stderr: "inherit"
    });

    const exitCode = await result.exited;
    if (exitCode === 0) {
      console.log("✅ PR created successfully");
    } else {
      console.error("❌ Failed to create PR");
    }
  }

  // Check CI status and wait for completion
  async waitForChecks() {
    console.log("GH.WORKFLOW - Waiting for CI checks to complete...");

    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10s intervals

    while (attempts < maxAttempts) {
      const result = spawn({
        cmd: ["gh", "pr", "checks"],
        stdout: "pipe",
        stderr: "pipe"
      });

      const output = new Response(result.stdout).textSync();
      const exitCode = await result.exited;

      if (output.includes("✓") && !output.includes("×") && !output.includes("!")) {
        console.log("✅ All checks passed");
        return true;
      }

      if (output.includes("×")) {
        console.log("❌ Some checks failed");
        return false;
      }

      console.log(`⏳ Checks still running... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    console.log("⏰ Timeout waiting for checks");
    return false;
  }

  // Deploy to production with safety checks
  async deploy(environment: 'staging' | 'production' = 'staging') {
    console.log(`GH.WORKFLOW - Deploying to ${environment}`);

    // Pre-deployment checks
    const checks = await this.runPreDeployChecks();
    if (!checks.allPassed) {
      console.error("❌ Pre-deployment checks failed");
      return false;
    }

    // Trigger deployment workflow
    const result = spawn({
      cmd: [
        "gh", "workflow", "run",
        `deploy-${environment}.yml`,
        "--ref", "main"
      ],
      stdout: "inherit",
      stderr: "inherit"
    });

    const exitCode = await result.exited;
    if (exitCode === 0) {
      console.log(`✅ Deployment to ${environment} triggered`);
      return true;
    } else {
      console.error(`❌ Failed to trigger ${environment} deployment`);
      return false;
    }
  }

  // Get repository metrics
  async getMetrics() {
    console.log("GH.WORKFLOW - Fetching repository metrics");

    const commands = [
      ["gh", "repo", "view", "--json", "name,description,stargazersCount,forksCount"],
      ["gh", "pr", "list", "--state", "open", "--json", "number,title,author"],
      ["gh", "issue", "list", "--state", "open", "--json", "number,title,labels"]
    ];

    for (const cmd of commands) {
      const result = spawn({
        cmd,
        stdout: "pipe",
        stderr: "pipe"
      });

      const output = new Response(result.stdout).textSync();
      console.log(`📊 ${cmd.slice(-1)}:`, JSON.parse(output));
    }
  }

  private detectScope(title: string): string {
    const scopes = ['api', 'core', 'shared', 'infra', 'cli', 'ui', 'docs', 'test'];
    for (const scope of scopes) {
      if (title.toLowerCase().includes(scope)) {
        return scope;
      }
    }
    return 'misc';
  }

  private detectType(title: string): string {
    if (title.includes('feat') || title.includes('add')) return 'feature';
    if (title.includes('fix') || title.includes('bug')) return 'bugfix';
    if (title.includes('refactor')) return 'refactor';
    if (title.includes('docs')) return 'docs';
    return 'chore';
  }

  private detectDDD(title: string): string {
    // Simple DDD detection based on common patterns
    if (title.includes('auth')) return 'authentication';
    if (title.includes('user')) return 'user-management';
    if (title.includes('api')) return 'api-gateway';
    if (title.includes('security')) return 'security';
    if (title.includes('performance')) return 'performance';
    return 'general';
  }

  private generateIssueTemplate(type: string): string {
    return `# ${type.toUpperCase()} Issue

## Description
<!-- Describe the ${type} request -->

## Expected Behavior
<!-- What should happen -->

## Additional Context
<!-- Any additional information -->

---
*Created with Cursor Rules v1.3.5 - GH.WORKFLOW*`;
  }

  private generatePRTemplate(scope: string, type: string, ddd: string): string {
    return `# Pull Request

## Changes
<!-- Describe what this PR changes -->

## Testing
<!-- How was this tested? -->

## Checklist
- [ ] Tests pass: \`bun test\`
- [ ] Security audit passes: \`bun audit\`
- [ ] Code formatted: \`bun run format\`
- [ ] Documentation updated
- [ ] Performance impact assessed

## DDA Tags
- **Scope**: ${scope}
- **Type**: ${type}
- **Domain**: ${ddd}

---
*Created with Cursor Rules v1.3.5 - GH.WORKFLOW*`;
  }

  private async runPreDeployChecks(): Promise<{ allPassed: boolean; results: any[] }> {
    console.log("🔍 Running pre-deployment checks...");

    const checks = [
      { name: "Security Audit", cmd: ["bun", "audit"] },
      { name: "Type Check", cmd: ["bun", "run", "type-check"] },
      { name: "Tests", cmd: ["bun", "test"] },
      { name: "Build", cmd: ["bun", "build", "--target=bun"] }
    ];

    const results = [];

    for (const check of checks) {
      console.log(`Checking: ${check.name}`);
      const result = spawn({
        cmd: check.cmd,
        stdout: "pipe",
        stderr: "pipe"
      });

      const exitCode = await result.exited;
      const passed = exitCode === 0;

      results.push({
        name: check.name,
        passed,
        exitCode
      });

      console.log(`${passed ? '✅' : '❌'} ${check.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    }

    const allPassed = results.every(r => r.passed);
    return { allPassed, results };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
GH.WORKFLOW - GitHub CLI Integration v1.3.5

Usage:
  bun run scripts/gh-workflow.ts <command> [options]

Commands:
  issue <type> <title> [body]    Create issue (type: feature|bug|chore)
  pr <branch> <title> [body]      Create PR with DDA tagging
  checks                            Wait for CI checks to complete
  deploy [environment]             Deploy to staging/production
  metrics                          Show repository metrics

Examples:
  bun run scripts/gh-workflow.ts issue feature "add user auth"
  bun run scripts/gh-workflow.ts pr feature/user-auth "feat: user authentication"
  bun run scripts/gh-workflow.ts checks
  bun run scripts/gh-workflow.ts deploy production
`);
    return;
  }

  const workflow = new GitHubWorkflow();

  try {
    switch (command) {
      case 'issue':
        const [type, title, ...bodyParts] = args.slice(1);
        await workflow.createIssue(type as any, title, bodyParts.join(' '));
        break;

      case 'pr':
        const [branch, prTitle, ...prBodyParts] = args.slice(1);
        await workflow.createPR(branch, prTitle, prBodyParts.join(' '));
        break;

      case 'checks':
        await workflow.waitForChecks();
        break;

      case 'deploy':
        const env = args[1] as 'staging' | 'production' || 'staging';
        await workflow.deploy(env);
        break;

      case 'metrics':
        await workflow.getMetrics();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('GH.WORKFLOW - Error:', error);
    process.exit(1);
  }
}

main();
