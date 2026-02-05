#!/usr/bin/env bun

/**
 * 🔍 Deployment Validation Script
 * Validates GitHub Pages, Cloudflare Pages, and Wiki deployments
 */

import { $ } from 'bun';

interface ValidationResult {
  target: string;
  status: 'success' | 'failure' | 'warning';
  checks: {
    name: string;
    passed: boolean;
    message: string;
    duration?: number;
  }[];
  timestamp: string;
}

class DeploymentValidator {
  private results: ValidationResult[] = [];

  async validate(target?: string): Promise<void> {
    console.log('🔍 Deployment Validation');
    console.log('!==!==!==!====');

    const targets = target ? [target] : ['github-pages', 'cloudflare-pages', 'wiki-mirror'];

    for (const t of targets) {
      await this.validateTarget(t);
    }

    // Generate summary
    this.generateSummary();

    // Save results
    await this.saveResults();

    // Exit with appropriate code
    const hasFailures = this.results.some(r => r.status === 'failure');
    process.exit(hasFailures ? 1 : 0);
  }

  private async validateTarget(target: string): Promise<void> {
    console.log(`\n🎯 Validating: ${target}`);
    console.log('-'.repeat(40));

    const result: ValidationResult = {
      target,
      status: 'success',
      checks: [],
      timestamp: new Date().toISOString(),
    };

    switch (target) {
      case 'github-pages':
        await this.validateGitHubPages(result);
        break;
      case 'cloudflare-pages':
        await this.validateCloudflarePages(result);
        break;
      case 'wiki-mirror':
        await this.validateWikiMirror(result);
        break;
      default:
        console.error(`❌ Unknown target: ${target}`);
        return;
    }

    // Determine overall status
    const failedChecks = result.checks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      result.status = failedChecks.length === result.checks.length ? 'failure' : 'warning';
    }

    this.results.push(result);
  }

  private async validateGitHubPages(result: ValidationResult): Promise<void> {
    // Check if GitHub Pages is enabled
    const ghPagesUrl = 'https://brendadeeznuts1111.github.io/fire22-dashboard-worker';

    // Test main page
    await this.checkUrl(result, 'Main Page', ghPagesUrl);

    // Test department pages
    await this.checkUrl(result, 'Department Index', `${ghPagesUrl}/departments`);

    // Test wiki pages
    await this.checkUrl(result, 'Wiki Index', `${ghPagesUrl}/wiki`);

    // Test RSS feeds
    await this.checkUrl(result, 'RSS Feed', `${ghPagesUrl}/feeds/error-codes-rss.xml`);

    // Check deployment status via GitHub API
    await this.checkGitHubDeploymentStatus(result);
  }

  private async validateCloudflarePages(result: ValidationResult): Promise<void> {
    const cfPagesUrl = 'https://fire22-dashboard.pages.dev';
    const customDomain = 'https://dashboard.fire22.ag';

    // Test Cloudflare Pages URL
    await this.checkUrl(result, 'Cloudflare Pages URL', cfPagesUrl);

    // Test custom domain
    await this.checkUrl(result, 'Custom Domain', customDomain);

    // Test API endpoints
    await this.checkUrl(result, 'API Health', `${customDomain}/api/health`);

    // Test department redirects
    const departments = ['finance', 'support', 'compliance', 'operations'];
    for (const dept of departments) {
      await this.checkUrl(result, `${dept} Redirect`, `${customDomain}/${dept}`, true);
    }

    // Check DNS resolution
    await this.checkDnsResolution(result, 'dashboard.fire22.ag');
  }

  private async validateWikiMirror(result: ValidationResult): Promise<void> {
    // Check if wiki directory exists
    const wikiExists = await this.checkPathExists('wiki');
    result.checks.push({
      name: 'Wiki Directory',
      passed: wikiExists,
      message: wikiExists ? 'Wiki directory exists' : 'Wiki directory not found',
    });

    // Check if wiki pages are generated
    const distWikiExists = await this.checkPathExists('dist/pages/wiki');
    result.checks.push({
      name: 'Wiki Build Output',
      passed: distWikiExists,
      message: distWikiExists ? 'Wiki pages generated' : 'Wiki pages not found',
    });

    // Check search index
    const searchIndexExists = await this.checkPathExists('dist/pages/wiki/search-index.json');
    result.checks.push({
      name: 'Search Index',
      passed: searchIndexExists,
      message: searchIndexExists ? 'Search index generated' : 'Search index not found',
    });

    // Validate wiki content
    if (distWikiExists) {
      const fileCount = await this.countFiles('dist/pages/wiki', '.html');
      result.checks.push({
        name: 'Wiki Pages Count',
        passed: fileCount > 0,
        message: `Found ${fileCount} wiki pages`,
      });
    }
  }

  private async checkUrl(
    result: ValidationResult,
    name: string,
    url: string,
    allowRedirect: boolean = false
  ): Promise<void> {
    const startTime = Bun.nanoseconds();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: allowRedirect ? 'follow' : 'manual',
      });

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      const passed =
        response.ok || (allowRedirect && response.status >= 300 && response.status < 400);

      result.checks.push({
        name,
        passed,
        message: `Status: ${response.status} (${duration.toFixed(2)}ms)`,
        duration,
      });
    } catch (error) {
      result.checks.push({
        name,
        passed: false,
        message: `Failed: ${error}`,
      });
    }
  }

  private async checkGitHubDeploymentStatus(result: ValidationResult): Promise<void> {
    try {
      const repo = 'brendadeeznuts1111/fire22-dashboard-worker';
      const response = await fetch(`https://api.github.com/repos/${repo}/pages`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Fire22-Validator',
        },
      });

      if (response.ok) {
        const data = await response.json();
        result.checks.push({
          name: 'GitHub Pages Status',
          passed: data.status === 'built',
          message: `Status: ${data.status}`,
        });
      } else if (response.status === 404) {
        result.checks.push({
          name: 'GitHub Pages Status',
          passed: false,
          message: 'GitHub Pages not enabled',
        });
      } else {
        result.checks.push({
          name: 'GitHub Pages Status',
          passed: false,
          message: `API returned ${response.status}`,
        });
      }
    } catch (error) {
      result.checks.push({
        name: 'GitHub Pages Status',
        passed: false,
        message: `Failed to check: ${error}`,
      });
    }
  }

  private async checkDnsResolution(result: ValidationResult, domain: string): Promise<void> {
    try {
      const { stdout } = await $`nslookup ${domain}`.quiet();
      const hasAddress = stdout.includes('Address:') || stdout.includes('answer:');

      result.checks.push({
        name: 'DNS Resolution',
        passed: hasAddress,
        message: hasAddress ? 'Domain resolves correctly' : 'Domain resolution failed',
      });
    } catch (error) {
      result.checks.push({
        name: 'DNS Resolution',
        passed: false,
        message: `Failed to resolve: ${error}`,
      });
    }
  }

  private async checkPathExists(path: string): Promise<boolean> {
    try {
      await $`test -e ${path}`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  private async countFiles(directory: string, extension: string): Promise<number> {
    try {
      const { stdout } = await $`find ${directory} -name "*${extension}" | wc -l`.quiet();
      return parseInt(stdout.trim());
    } catch {
      return 0;
    }
  }

  private generateSummary(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));

    for (const result of this.results) {
      const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const passed = result.checks.filter(c => c.passed).length;
      const total = result.checks.length;

      console.log(`\n${icon} ${result.target}: ${passed}/${total} checks passed`);

      // Show failed checks
      const failed = result.checks.filter(c => !c.passed);
      if (failed.length > 0) {
        console.log('  Failed checks:');
        for (const check of failed) {
          console.log(`    ❌ ${check.name}: ${check.message}`);
        }
      }

      // Show slow checks
      const slow = result.checks.filter(c => c.duration && c.duration > 1000);
      if (slow.length > 0) {
        console.log('  Slow checks (>1s):');
        for (const check of slow) {
          console.log(`    ⏱️ ${check.name}: ${check.duration?.toFixed(2)}ms`);
        }
      }
    }

    // Overall status
    const allPassed = this.results.every(r => r.status === 'success');
    const hasWarnings = this.results.some(r => r.status === 'warning');
    const hasFailures = this.results.some(r => r.status === 'failure');

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('✅ All deployments validated successfully!');
    } else if (hasFailures) {
      console.log('❌ Some deployments have critical failures');
    } else if (hasWarnings) {
      console.log('⚠️ Deployments validated with warnings');
    }
  }

  private async saveResults(): Promise<void> {
    const reportPath = 'reports/deployment-validation.json';

    try {
      // Ensure reports directory exists
      await $`mkdir -p reports`.quiet();

      // Save validation results
      await Bun.write(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n📁 Validation report saved to: ${reportPath}`);
    } catch (error) {
      console.error(`❌ Failed to save report: ${error}`);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetIndex = args.findIndex(arg => arg === '--target');
const target = targetIndex !== -1 ? args[targetIndex + 1] : undefined;

// Run validation
const validator = new DeploymentValidator();
validator.validate(target).catch(console.error);
