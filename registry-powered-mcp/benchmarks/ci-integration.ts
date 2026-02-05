#!/usr/bin/env bun

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface CIConfig {
  benchmarkCommand: string;
  regressionCommand: string;
  dashboardCommand: string;
  failureThreshold: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  notifyOnRegression: boolean;
  webhookUrl?: string;
  slackWebhook?: string;
  githubToken?: string;
}

class BenchmarkCIIntegration {
  private config: CIConfig;

  constructor() {
    this.config = this.loadCIConfig();
  }

  async runCIIntegration() {
    console.log('🚀 Starting Benchmark CI/CD Integration\n');

    try {
      // Step 1: Run benchmarks
      console.log('📊 Step 1: Running Benchmarks...');
      await this.runBenchmarks();

      // Step 2: Generate dashboard
      console.log('📈 Step 2: Generating Dashboard...');
      await this.generateDashboard();

      // Step 3: Analyze regressions
      console.log('🔍 Step 3: Analyzing Performance Regressions...');
      const hasRegressions = await this.analyzeRegressions();

      // Step 4: Handle results
      console.log('📋 Step 4: Processing Results...');
      await this.processResults(hasRegressions);

      console.log('✅ CI/CD Integration completed successfully!');

    } catch (error) {
      console.error('❌ CI/CD Integration failed:', error);
      await this.handleFailure(error);
      process.exit(1);
    }
  }

  private loadCIConfig(): CIConfig {
    // Default configuration
    const defaultConfig: CIConfig = {
      benchmarkCommand: 'bun run urlpattern-vs-regex.ts',
      regressionCommand: 'bun run performance-regression.ts',
      dashboardCommand: 'bun run dashboard-generator.ts',
      failureThreshold: 'critical',
      notifyOnRegression: true,
      webhookUrl: process.env.BENCHMARK_WEBHOOK_URL,
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
      githubToken: process.env.GITHUB_TOKEN
    };

    // Try to load from config file
    const configPath = 'benchmarks/ci-config.json';
    if (existsSync(configPath)) {
      try {
        const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
        return { ...defaultConfig, ...configData };
      } catch (error) {
        console.warn('Warning: Could not load CI config, using defaults');
      }
    }

    return defaultConfig;
  }

  private async runBenchmarks() {
    try {
      execSync(`bun run urlpattern-vs-regex.ts`, {
        cwd: process.cwd(), // Already in benchmarks directory
        stdio: 'inherit',
        timeout: 300000 // 5 minutes timeout
      });
      console.log('✅ Benchmarks completed successfully');
    } catch (error) {
      throw new Error(`Benchmark execution failed: ${error}`);
    }
  }

  private async generateDashboard() {
    try {
      execSync(`bun run dashboard-generator.ts`, {
        cwd: process.cwd(),
        stdio: 'inherit',
        timeout: 60000 // 1 minute timeout
      });
      console.log('✅ Dashboard generated successfully');
    } catch (error) {
      console.warn('Warning: Dashboard generation failed, continuing...');
    }
  }

  private async analyzeRegressions(): Promise<boolean> {
    try {
      const result = execSync(`bun run performance-regression.ts`, {
        cwd: process.cwd(),
        stdio: 'pipe', // Capture output
        timeout: 120000 // 2 minutes timeout
      });

      const output = result.toString();
      const hasRegressions = output.includes('CRITICAL REGRESSIONS DETECTED') ||
                           output.includes('SEVERE REGRESSIONS DETECTED');

      if (hasRegressions) {
        console.log('⚠️  Performance regressions detected');
      } else {
        console.log('✅ No performance regressions detected');
      }

      return hasRegressions;
    } catch (error) {
      // If regression analysis fails with exit code, it means regressions were found
      if (error.status && error.status > 0) {
        console.log('⚠️  Performance regressions detected (exit code > 0)');
        return true;
      }
      throw new Error(`Regression analysis failed: ${error}`);
    }
  }

  private async processResults(hasRegressions: boolean) {
    // Determine if we should fail the build
    const shouldFail = this.shouldFailBuild(hasRegressions);

    if (shouldFail) {
      console.log('❌ Build will fail due to performance regressions');

      // Create failure summary
      await this.createFailureSummary();
    } else {
      console.log('✅ Build will continue - regressions within acceptable threshold');
    }

    // Send notifications if configured
    if (this.config.notifyOnRegression && hasRegressions) {
      await this.sendNotifications(shouldFail);
    }

    // Upload artifacts
    await this.uploadArtifacts();

    if (shouldFail) {
      throw new Error('Performance regression threshold exceeded');
    }
  }

  private shouldFailBuild(hasRegressions: boolean): boolean {
    if (!hasRegressions) return false;

    // Check if we have a regression analysis file
    const regressionFile = this.findLatestFile('results', 'regression-analysis-*.json');
    if (!regressionFile) return true; // Fail if we can't determine severity

    try {
      const analysis = JSON.parse(readFileSync(regressionFile, 'utf-8'));

      // Check if we have regressions at or above the failure threshold
      const severityLevels = ['minor', 'moderate', 'severe', 'critical'];
      const thresholdIndex = severityLevels.indexOf(this.config.failureThreshold);

      for (const level of severityLevels.slice(thresholdIndex)) {
        if (analysis.analysis.bySeverity[level] > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn('Warning: Could not parse regression analysis, failing build');
      return true;
    }
  }

  private async createFailureSummary() {
    const summary = {
      status: 'failed',
      reason: 'Performance regression detected',
      timestamp: new Date().toISOString(),
      config: this.config,
      regressionFile: this.findLatestFile('results', 'regression-analysis-*.json'),
      dashboardFile: 'results/dashboard.html'
    };

    const filename = `results/ci-failure-summary-${Date.now()}.json`;
    Bun.write(filename, JSON.stringify(summary, null, 2));
    console.log(`💾 Failure summary saved: ${filename}`);
  }

  private async sendNotifications(isFailure: boolean) {
    const status = isFailure ? 'FAILED' : 'WARNING';
    const color = isFailure ? '#ff0000' : '#ffa500';

    // Slack notification
    if (this.config.slackWebhook) {
      await this.sendSlackNotification(status, color);
    }

    // Webhook notification
    if (this.config.webhookUrl) {
      await this.sendWebhookNotification(status);
    }

    // GitHub comment/check
    if (this.config.githubToken) {
      await this.createGitHubCheck(status);
    }
  }

  private async sendSlackNotification(status: string, color: string) {
    try {
      const payload = {
        attachments: [{
          color,
          title: `Benchmark CI/CD: ${status}`,
          text: `Performance ${status.toLowerCase()} detected in CI/CD pipeline`,
          fields: [
            {
              title: 'Repository',
              value: process.env.GITHUB_REPOSITORY || 'Unknown',
              short: true
            },
            {
              title: 'Branch',
              value: process.env.GITHUB_REF || 'Unknown',
              short: true
            },
            {
              title: 'Commit',
              value: process.env.GITHUB_SHA || 'Unknown',
              short: true
            }
          ],
          actions: [{
            type: 'button',
            text: 'View Dashboard',
            url: `${process.env.CI_BASE_URL || 'http://localhost'}/benchmarks/results/dashboard.html`
          }]
        }]
      };

      const response = await fetch(this.config.slackWebhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Slack notification sent');
      } else {
        console.warn('Warning: Slack notification failed');
      }
    } catch (error) {
      console.warn('Warning: Could not send Slack notification:', error);
    }
  }

  private async sendWebhookNotification(status: string) {
    try {
      const payload = {
        event: 'benchmark_ci_complete',
        status,
        timestamp: new Date().toISOString(),
        repository: process.env.GITHUB_REPOSITORY,
        branch: process.env.GITHUB_REF,
        commit: process.env.GITHUB_SHA,
        dashboardUrl: `${process.env.CI_BASE_URL || 'http://localhost'}/benchmarks/results/dashboard.html`
      };

      const response = await fetch(this.config.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Webhook notification sent');
      } else {
        console.warn('Warning: Webhook notification failed');
      }
    } catch (error) {
      console.warn('Warning: Could not send webhook notification:', error);
    }
  }

  private async createGitHubCheck(status: string) {
    // This would integrate with GitHub Checks API
    // Implementation depends on specific CI/CD platform
    console.log('📝 GitHub check integration not implemented yet');
  }

  private async uploadArtifacts() {
    // Upload dashboard and results to artifact storage
    const artifacts = [
      'results/dashboard.html',
      'results/dashboard.json',
      'results/dashboard.md'
    ];

    const regressionFile = this.findLatestFile('results', 'regression-analysis-*.json');
    if (regressionFile) {
      artifacts.push(regressionFile);
    }

    console.log('📦 Artifacts ready for upload:', artifacts);
    // Implementation depends on CI/CD platform (GitHub Actions, GitLab CI, etc.)
  }

  private findLatestFile(dir: string, pattern: string): string | null {
    try {
      const files = readdirSync(dir)
        .filter(f => f.includes(pattern.replace('*', '')))
        .sort()
        .reverse();

      return files.length > 0 ? join(dir, files[0]) : null;
    } catch {
      return null;
    }
  }

  private async handleFailure(error: any) {
    console.error('🚨 CI/CD Integration failed with error:', error.message);

    // Create error summary
    const errorSummary = {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      config: this.config
    };

    try {
      const filename = `results/ci-error-${Date.now()}.json`;
      Bun.write(filename, JSON.stringify(errorSummary, null, 2));
      console.log(`💾 Error summary saved: ${filename}`);
    } catch {
      // Ignore if we can't save error summary
    }
  }
}

// Run if main
if (import.meta.main) {
  const ci = new BenchmarkCIIntegration();
  await ci.runCIIntegration();
}