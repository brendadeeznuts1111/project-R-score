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
    console.log('🚀 Fire22 Dashboard Worker Release Workflow');
    console.log('='.repeat(60));
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log(`🎯 Release Type: ${this.versionType || 'Interactive'}`);
    console.log('');

    // Interactive version selection if not specified
    if (!this.versionType) {
      await this.selectVersionType();
    }

    console.log(`🔄 Starting ${this.versionType} release workflow...\n`);

    for (const step of this.releaseSteps) {
      console.log(`🔍 ${step.name}: ${step.description}`);

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
      console.log(`   ${statusIcon} ${step.name}${criticalFlag} - ${duration}ms\n`);

      // Stop on critical failures
      if (!passed && step.critical) {
        console.log(`❌ Critical step failed: ${step.name}`);
        console.log('🚫 Release workflow stopped. Fix critical issues before proceeding.\n');
        break;
      }
    }

    this.generateWorkflowReport();
  }

  private async selectVersionType(): Promise<void> {
    console.log('🎯 Select Release Type:');
    console.log('1. patch - Bug fixes and minor improvements');
    console.log('2. minor - New features and enhancements');
    console.log('3. major - Breaking changes and major updates');
    console.log('');

    // For automation, default to patch
    this.versionType = 'patch';
    console.log(`🤖 Auto-selected: ${this.versionType} (for automated workflows)`);
    console.log('');
  }

  private async runPreReleaseTests(): Promise<boolean> {
    try {
      console.log('   🧪 Running quick test suite...');

      // Run quick tests
      const { execSync } = await import('child_process');
      const testResult = execSync('bun run test:quick', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (testResult.includes('✅ Quick test PASSED')) {
        console.log('   ✅ All tests passed');
        return true;
      } else {
        console.log('   ❌ Tests failed');
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

      console.log(`   🔄 Bumping ${this.versionType} version...`);

      const { execSync } = await import('child_process');
      const versionResult = execSync(`bun run version:${this.versionType}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (versionResult.includes('Version bump completed successfully')) {
        console.log('   ✅ Version bumped successfully');
        return true;
      } else {
        console.log('   ❌ Version bump failed');
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Version bump failed: ${error.message}`);
      return false;
    }
  }

  private async validateDeployment(): Promise<boolean> {
    try {
      console.log('   🔍 Running deployment validation...');

      const { execSync } = await import('child_process');
      const validationResult = execSync('bun run deploy:check', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (validationResult.includes('🎉 DEPLOYMENT APPROVED!')) {
        console.log('   ✅ Deployment validation passed');
        return true;
      } else {
        console.log('   ❌ Deployment validation failed');
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Deployment validation failed: ${error.message}`);
      return false;
    }
  }

  private async updateDocumentation(): Promise<boolean> {
    try {
      console.log('   📝 Updating documentation...');

      // Check if changelog was updated
      const changelogContent = await Bun.file('CHANGELOG.md').text();
      const hasRecentEntry = changelogContent.includes(new Date().toISOString().split('T')[0]);

      if (hasRecentEntry) {
        console.log('   ✅ Changelog updated');
        return true;
      } else {
        console.log('   ⚠️ Changelog may not be updated');
        return true; // Not critical
      }
    } catch (error) {
      console.error(`   ❌ Documentation update failed: ${error.message}`);
      return false;
    }
  }

  private async generateReleaseSummary(): Promise<boolean> {
    try {
      console.log('   📊 Generating release summary...');

      // Get current version
      const { execSync } = await import('child_process');
      const versionResult = execSync('bun run version:show', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const versionMatch = versionResult.match(/Version: (\d+\.\d+\.\d+)/);
      const currentVersion = versionMatch ? versionMatch[1] : 'unknown';

      console.log(`   ✅ Release summary generated for version ${currentVersion}`);
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

    console.log('\n' + '='.repeat(70));
    console.log('📋 RELEASE WORKFLOW REPORT');
    console.log('='.repeat(70));
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`🎯 Release Type: ${this.versionType}`);
    console.log(`⏱️  Total Workflow Time: ${totalTime}ms`);
    console.log(`🔍 Total Steps: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Critical Failures: ${criticalFailed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

    // Show failed steps
    if (failed > 0) {
      console.log('\n❌ FAILED STEPS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          const criticalFlag = result.critical ? ' [CRITICAL]' : '';
          console.log(`   - ${result.step}${criticalFlag}: ${result.details}`);
        });
    }

    // Release recommendation
    if (criticalFailed === 0 && failed === 0) {
      console.log('\n🎉 RELEASE READY!');
      console.log('All workflow steps completed successfully.');
      console.log('\n🚀 Next Steps:');
      console.log('   1. Review the changes: git status');
      console.log('   2. Commit and push: git push origin main');
      console.log('   3. Deploy: wrangler deploy');
      console.log('   4. Verify deployment: bun run test:quick');
      console.log('   5. Monitor performance: bun run monitor-health');
    } else if (criticalFailed === 0) {
      console.log('\n⚠️  RELEASE CONDITIONALLY READY');
      console.log('Critical steps passed, but some non-critical issues exist.');
      console.log('Consider fixing non-critical issues before release.');
    } else {
      console.log('\n🚫 RELEASE NOT READY');
      console.log('Critical workflow failures detected. Release is not allowed.');
      console.log('Fix all critical issues before attempting release again.');
    }

    // Performance summary
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`\n📊 Workflow Performance:`);
    console.log(`   Average Step Duration: ${Math.round(avgDuration)}ms`);
    console.log(`   Fastest Step: ${Math.min(...this.results.map(r => r.duration))}ms`);
    console.log(`   Slowest Step: ${Math.max(...this.results.map(r => r.duration))}ms`);
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
      console.log('❌ Invalid version type. Use: patch, minor, or major');
      console.log('Usage: bun run scripts/release-workflow.ts [patch|minor|major]');
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
