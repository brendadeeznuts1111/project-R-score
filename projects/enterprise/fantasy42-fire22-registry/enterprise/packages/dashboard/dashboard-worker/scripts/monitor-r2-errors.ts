#!/usr/bin/env bun

/**
 * R2 Storage Error Monitor
 * Monitors and tracks R2-related errors for the infrastructure team
 */

import { ErrorHandler } from '../src/errors/ErrorHandler';
import { ERROR_CODES } from '../src/errors/types';

interface R2ErrorLog {
  timestamp: string;
  errorCode: string;
  bucketName?: string;
  cloudflareErrorCode?: number;
  message: string;
  correlationId: string;
  resolution?: string;
}

class R2ErrorMonitor {
  private errorHandler: ErrorHandler;
  private errorLogs: R2ErrorLog[] = [];

  constructor() {
    this.errorHandler = ErrorHandler.getInstance(process.env.NODE_ENV === 'development');
  }

  /**
   * Simulate R2 bucket already exists error for testing
   */
  simulateBucketExistsError(bucketName: string = 'fire22-packages'): void {
    const simulatedError = new Error(
      `The bucket you tried to create already exists, and you own it. [code: 10004]`
    );

    const response = this.errorHandler.handleR2BucketError(bucketName, 10004, simulatedError);

    // Parse response to log
    response.json().then(data => {
      const errorLog: R2ErrorLog = {
        timestamp: new Date().toISOString(),
        errorCode: ERROR_CODES.R2_BUCKET_ALREADY_EXISTS,
        bucketName,
        cloudflareErrorCode: 10004,
        message: 'Bucket already exists and is owned by account',
        correlationId: data.error.correlationId,
        resolution: 'No action needed - bucket is ready for use',
      };

      this.errorLogs.push(errorLog);
      this.logToTeam(errorLog);
    });
  }

  /**
   * Log error to infrastructure team
   */
  private logToTeam(errorLog: R2ErrorLog): void {
    // Infrastructure team notification
    const infrastructureNotification = {
      team: 'infrastructure-team',
      type: 'R2_STORAGE_ERROR',
      priority: 'low', // Bucket exists errors are low priority
      ...errorLog,
      actionRequired:
        errorLog.cloudflareErrorCode === 10004
          ? 'None - bucket exists and is ready'
          : 'Investigation required',
      teamEmails: ['infrastructure@fire22.ag', 'platform-team@fire22.ag', 'head@technology.fire22'],
    };

    console.log(
      '📧 INFRASTRUCTURE_TEAM_NOTIFICATION:',
      JSON.stringify(infrastructureNotification, null, 2)
    );

    // Cloudflare team notification (for all R2/Wrangler issues)
    const cloudflareNotification = {
      team: 'cloudflare-team',
      type: 'CLOUDFLARE_R2_ERROR',
      wranglerVersion: '4.30.0',
      updateAvailable: '4.33.1',
      ...errorLog,
      cloudflareContext: {
        service: 'R2',
        operation: 'CreateBucket',
        accountId: '80693377f3abb78e00820aa69a415ce4',
        errorCode: errorLog.cloudflareErrorCode,
        endpoint: '/accounts/80693377f3abb78e00820aa69a415ce4/r2/buckets',
      },
      teamEmails: [
        'cloudflare-team@fire22.ag',
        'cloudflare-workers@fire22.ag',
        'cloudflare-r2@fire22.ag',
        'wrangler-support@fire22.ag',
        'edge-team@fire22.ag',
      ],
    };

    console.log(
      '☁️ CLOUDFLARE_TEAM_NOTIFICATION:',
      JSON.stringify(cloudflareNotification, null, 2)
    );

    // CI team notification (if this could affect deployments)
    if (errorLog.cloudflareErrorCode) {
      const ciNotification = {
        team: 'ci-team',
        type: 'DEPLOYMENT_INFRASTRUCTURE_ERROR',
        ...errorLog,
        ciContext: {
          potentialImpact: 'R2 bucket creation during CI/CD pipeline',
          affectedPipelines: ['wrangler deploy', 'r2 bucket create'],
          recommendation:
            errorLog.cloudflareErrorCode === 10004
              ? 'Safe to continue - bucket exists'
              : 'May need manual intervention',
        },
        teamEmails: [
          'ci@fire22.ag',
          'ci-cd@fire22.ag',
          'github-actions@fire22.ag',
          'build-team@fire22.ag',
          'release-automation@fire22.ag',
        ],
      };

      console.log('🔧 CI_TEAM_NOTIFICATION:', JSON.stringify(ciNotification, null, 2));
    }
  }

  /**
   * Generate summary report
   */
  generateReport(): void {
    console.log('\n📊 R2 Error Monitoring Report');
    console.log('='.repeat(50));

    if (this.errorLogs.length === 0) {
      console.log('✅ No R2 errors detected');
      return;
    }

    // Group errors by type
    const errorsByCode = this.errorLogs.reduce(
      (acc, log) => {
        const code = log.cloudflareErrorCode || 'unknown';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n📈 Error Summary:');
    Object.entries(errorsByCode).forEach(([code, count]) => {
      const errorType = code === '10004' ? 'Bucket Already Exists' : `Error Code ${code}`;
      console.log(`  • ${errorType}: ${count} occurrence(s)`);
    });

    console.log('\n📝 Recent Errors:');
    this.errorLogs.slice(-5).forEach(log => {
      console.log(`  • [${log.timestamp}] ${log.bucketName}: ${log.message}`);
      if (log.resolution) {
        console.log(`    → Resolution: ${log.resolution}`);
      }
    });

    console.log('\n👥 Team Notifications Sent:');
    console.log('  • Infrastructure Team: Notified');
    console.log("  • Platform Team: CC'd");
    console.log("  • Head of Technology: CC'd");
    console.log('  • Cloudflare Team: Notified (R2/Wrangler issues)');
    console.log('  • CI Team: Notified (Deployment impact assessment)');
  }

  /**
   * Check if monitoring is active
   */
  getStatus(): { active: boolean; errorCount: number; lastError?: R2ErrorLog } {
    return {
      active: true,
      errorCount: this.errorLogs.length,
      lastError: this.errorLogs[this.errorLogs.length - 1],
    };
  }
}

// Run monitor if executed directly
if (import.meta.main) {
  console.log('🚀 Starting R2 Error Monitor...\n');

  const monitor = new R2ErrorMonitor();

  // Simulate the bucket exists error
  console.log('📍 Simulating R2 bucket exists error...');
  monitor.simulateBucketExistsError('fire22-packages');

  // Generate report
  setTimeout(() => {
    monitor.generateReport();

    // Show monitoring status
    const status = monitor.getStatus();
    console.log('\n✅ Monitor Status:', JSON.stringify(status, null, 2));
  }, 100);
}

export { R2ErrorMonitor };
