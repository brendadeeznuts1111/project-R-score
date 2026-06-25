#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard Worker Release Workflow
 * Automated release process combining testing, versioning, and deployment validation
 */

interface ReleaseStep {
  name: string;
  description: string;
  executor: () => Promise<boolean>;
  critical: boolean;
}

interface ReleaseResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  duration: number;
  critical: boolean;
}

class ReleaseWorkflow {
  private results: ReleaseResult[] = [];
  private startTime = Date.now();
  private versionType: 'patch' | 'minor' | 'major' | null = null;

  constructor(versionType?: 'patch' | 'minor' | 'major') {
    this.versionType = versionType || null;
  }

  // Release workflow steps
  private releaseSteps: ReleaseStep[] = [
    {
      name: 'Pre-Release Testing',
      description: 'Run comprehensive test suite to ensure system health',
      executor: this.runPreReleaseTests.bind(this),
      critical: true,
    },
    {
      name: 'Version Bump',
      description: 'Bump version according to semantic versioning',
      executor: this.bumpVersion.bind(this),
      critical: true,
    },
    {
      name: 'Deployment Validation',
      description: 'Validate all systems are ready for production deployment',
      executor: this.validateDeployment.bind(this),
      critical: true,
    },
    {
      name: 'Documentation Update',
      description: 'Update changelog and documentation',
      executor: this.updateDocumentation.bind(this),
      critical: false,
    },
    {
      name: 'Release Summary',
      description: 'Generate comprehensive release summary',
      executor: this.generateReleaseSummary.bind(this),
      critical: false,
    },
  ];

  async runWorkflow(): Promise<void> {
    console.info('🚀 Fire22 Dashboard Worker Release Workflow');
    console.info('='.repeat(60));
    console.info(`⏰ ${new Date().toISOString()}`);
    console.info(`🎯 Release Type: ${this.versionType || 'Interactive'}`);
    console.info('');

    // Interactive version selection if not specified
    if (!this.versionType) {
      await this.selectVersionType();
    }

    console.info(`🔄 Starting ${this.versionType} release workflow...\n`);

    for (const step of this.releaseSteps) {
      console.info(`🔍 ${step.name}: ${step.description}`);

      const stepStart = Date.now();
      const passed = await step.executor();
      const duration = Date.now() - stepStart;

      const result: ReleaseResult = {
        step: step.name,
        status: passed ? 'PASS' : 'FAIL',
        details: passed ? 'Step completed successfully' : 'Step failed',
        duration,
        critical: step.critical,
      };

      this.results.push(result);

      const statusIcon = passed ? '✅' : '❌';
      const criticalFlag = step.critical ? ' [CRITICAL]' : '';
      console.info(`   ${statusIcon} ${step.name}${criticalFlag} - ${duration}ms\n`);

      // Stop on critical failures
      if (!passed && step.critical) {
        console.info(`❌ Critical step failed: ${step.name}`);
        console.info('🚫 Release workflow stopped. Fix critical issues before proceeding.\n');
        break;
      }
    }

    this.generateWorkflowReport();
  }

  private async selectVersionType(): Promise<void> {
    console.info('🎯 Select Release Type:');
    console.info('1. patch - Bug fixes and minor improvements');
    console.info('2. minor - New features and enhancements');
    console.info('3. major - Breaking changes and major updates');
    console.info('');

    // For automation, default to patch
    this.versionType = 'patch';
    console.info(`🤖 Auto-selected: ${this.versionType} (for automated workflows)`);
    console.info('');
  }

  private async runPreReleaseTests(): Promise<boolean> {
    try {
      console.info('   🧪 Running quick test suite...');

      // Run quick tests
      const { execSync } = await import('child_process');
      const testResult = execSync('bun run test:quick', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (testResult.includes('✅ Quick test PASSED')) {
        console.info('   ✅ All tests passed');
        return true;
      } else {
        console.info('   ❌ Tests failed');
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Test execution failed: ${error.message}`);
      return false;
    }
  }

  private async bumpVersion(): Promise<boolean> {
    try {
      if (!this.versionType) {
        throw new Error('Version type not specified');
      }

      console.info(`   🔄 Bumping ${this.versionType} version...`);

      const { execSync } = await import('child_process');
      const versionResult = execSync(`bun run version:${this.versionType}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (versionResult.includes('Version bump completed successfully')) {
        console.info('   ✅ Version bumped successfully');
        return true;
      } else {
        console.info('   ❌ Version bump failed');
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Version bump failed: ${error.message}`);
      return false;
    }
  }

  private async validateDeployment(): Promise<boolean> {
    try {
      console.info('   🔍 Running deployment validation...');

      const { execSync } = await import('child_process');
      const validationResult = execSync('bun run deploy:check', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (validationResult.includes('🎉 DEPLOYMENT APPROVED!')) {
        console.info('   ✅ Deployment validation passed');
        return true;
      } else {
        console.info('   ❌ Deployment validation failed');
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Deployment validation failed: ${error.message}`);
      return false;
    }
  }

  private async updateDocumentation(): Promise<boolean> {
    try {
      console.info('   📝 Updating documentation...');

      // Check if changelog was updated
      const changelogContent = await Bun.file('CHANGELOG.md').text();
      const hasRecentEntry = changelogContent.includes(new Date().toISOString().split('T')[0]);

      if (hasRecentEntry) {
        console.info('   ✅ Changelog updated');
        return true;
      } else {
        console.info('   ⚠️ Changelog may not be updated');
        return true; // Not critical
      }
    } catch (error) {
      console.error(`   ❌ Documentation update failed: ${error.message}`);
      return false;
    }
  }

  private async generateReleaseSummary(): Promise<boolean> {
    try {
      console.info('   📊 Generating release summary...');

      // Get current version
      const { execSync } = await import('child_process');
      const versionResult = execSync('bun run version:show', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const versionMatch = versionResult.match(/Version: (\d+\.\d+\.\d+)/);
      const currentVersion = versionMatch ? versionMatch[1] : 'unknown';

      console.info(`   ✅ Release summary generated for version ${currentVersion}`);
      return true;
    } catch (error) {
      console.error(`   ❌ Release summary generation failed: ${error.message}`);
      return false;
    }
  }

  private generateWorkflowReport(): void {
    const totalTime = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    const criticalFailed = this.results.filter(r => r.status === 'FAIL' && r.critical).length;

    console.info('\n' + '='.repeat(70));
    console.info('📋 RELEASE WORKFLOW REPORT');
    console.info('='.repeat(70));
    console.info(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.info(`🎯 Release Type: ${this.versionType}`);
    console.info(`⏱️  Total Workflow Time: ${totalTime}ms`);
    console.info(`🔍 Total Steps: ${total}`);
    console.info(`✅ Passed: ${passed}`);
    console.info(`❌ Failed: ${failed}`);
    console.info(`🚨 Critical Failures: ${criticalFailed}`);
    console.info(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

    // Show failed steps
    if (failed > 0) {
      console.info('\n❌ FAILED STEPS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          const criticalFlag = result.critical ? ' [CRITICAL]' : '';
          console.info(`   - ${result.step}${criticalFlag}: ${result.details}`);
        });
    }

    // Release recommendation
    if (criticalFailed === 0 && failed === 0) {
      console.info('\n🎉 RELEASE READY!');
      console.info('All workflow steps completed successfully.');
      console.info('\n🚀 Next Steps:');
      console.info('   1. Review the changes: git status');
      console.info('   2. Commit and push: git push origin main');
      console.info('   3. Deploy: wrangler deploy');
      console.info('   4. Verify deployment: bun run test:quick');
      console.info('   5. Monitor performance: bun run monitor-health');
    } else if (criticalFailed === 0) {
      console.info('\n⚠️  RELEASE CONDITIONALLY READY');
      console.info('Critical steps passed, but some non-critical issues exist.');
      console.info('Consider fixing non-critical issues before release.');
    } else {
      console.info('\n🚫 RELEASE NOT READY');
      console.info('Critical workflow failures detected. Release is not allowed.');
      console.info('Fix all critical issues before attempting release again.');
    }

    // Performance summary
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.info(`\n📊 Workflow Performance:`);
    console.info(`   Average Step Duration: ${Math.round(avgDuration)}ms`);
    console.info(`   Fastest Step: ${Math.min(...this.results.map(r => r.duration))}ms`);
    console.info(`   Slowest Step: ${Math.max(...this.results.map(r => r.duration))}ms`);
  }

  // Export results for external systems
  exportResults(): ReleaseResult[] {
    return this.results;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let versionType: 'patch' | 'minor' | 'major' | null = null;

  // Parse command line arguments
  if (args.length > 0) {
    const arg = args[0].toLowerCase();
    if (['patch', 'minor', 'major'].includes(arg)) {
      versionType = arg as 'patch' | 'minor' | 'major';
    } else {
      console.info('❌ Invalid version type. Use: patch, minor, or major');
      console.info('Usage: bun run scripts/release-workflow.ts [patch|minor|major]');
      process.exit(1);
    }
  }

  const workflow = new ReleaseWorkflow(versionType);

  try {
    await workflow.runWorkflow();

    // Exit with appropriate code for CI/CD systems
    const hasCriticalFailures = workflow
      .exportResults()
      .some(r => r.status === 'FAIL' && r.critical);
    const hasFailures = workflow.exportResults().some(r => r.status === 'FAIL');

    if (hasCriticalFailures) {
      process.exit(2); // Critical failures - block release
    } else if (hasFailures) {
      process.exit(1); // Non-critical failures - warn but allow
    } else {
      process.exit(0); // All passed - release ready
    }
  } catch (error) {
    console.error('❌ Release workflow failed:', error);
    process.exit(3); // Workflow system failure
  }
}

if (import.meta.main) {
  main();
}
