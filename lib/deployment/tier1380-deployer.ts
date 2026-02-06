/**
 * 🚀 Tier1380Deployer - Production-Grade Deployment System
 *
 * Enterprise deployment orchestrator with Bun Shell integration,
 * Runtime Hardening v4.5 features, and comprehensive rollback safety.
 *
 * @version 4.5
 * @see lib/r2/signed-url.ts for R2 signed URL generation
 * @see lib/s3-content-encoding.ts for compression support
 */

import { $ } from 'bun';

export class Tier1380Deployer {
  private static readonly BACKUP_DIR = './backups';
  private static readonly METRICS_FILE = 'deployment-metrics.json';

  static async deploySnapshot(
    snapshotId: string,
    options: {
      contentEncoding?: 'gzip' | 'br' | 'deflate';
      preserveHeaders?: boolean;
      signedUrl?: boolean;
    } = {}
  ): Promise<DeploymentResult> {
    // 🔐 Enhanced error handling with rollback safety
    try {
      // 1. Validate inputs using Bun Shell safety features
      if (!snapshotId.match(/^[a-zA-Z0-9_-]+$/)) {
        throw new Error(`Invalid snapshotId: ${snapshotId}`);
      }

      // 2. Create timestamped backup directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.BACKUP_DIR}/${snapshotId}_${timestamp}`;

      await $`mkdir -p ${backupPath}`;

      // 3. Backup with progress and checksum
      console.log(`📦 Creating backup to ${backupPath}...`);
      const backupResult = await $`
        # Create backup with rsync (more reliable than cp -r)
        rsync -ah --progress --checksum \
          ./scanner-cookies/ \
          ${backupPath}/ \
        2>&1 | tee ${backupPath}/backup.log
      `.nothrow();

      if (backupResult.exitCode !== 0) {
        // Sanitize stderr to prevent information leakage
        const sanitizedError =
          backupResult.stderr?.toString().slice(0, 200).replace(/\s+/g, ' ') || 'Unknown error';
        console.error(`Backup failed: ${sanitizedError}`);
        throw new Error(`Backup failed: Check backup.log for details`);
      }

      // 4. Enhanced metrics with deployment metadata
      const metrics = {
        timestamp: new Date().toISOString(),
        snapshotId,
        system: {
          node: process.version,
          bun: Bun.version,
          platform: process.platform,
        },
        deployment: {
          contentEncoding: options.contentEncoding,
          preserveHeaders: options.preserveHeaders,
          signedUrl: options.signedUrl,
        },
        performance: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
        },
      };

      // Use Bun.write for safer file operations
      await Bun.write(`${backupPath}/${this.METRICS_FILE}`, JSON.stringify(metrics, null, 2));

      // 5. Run deployment with enhanced monitoring
      console.log(`🚀 Deploying snapshot ${snapshotId}...`);

      const deployment = await $`
        # Set deployment environment variables
        export TIER1380_SNAPSHOT_ID=${snapshotId}
        export TIER1380_TIMESTAMP=${timestamp}
        export TIER1380_CONTENT_ENCODING=${options.contentEncoding || 'none'}
        
        # Run deployment with timeout and resource limits
        timeout 300 ./deploy.sh --id ${snapshotId} \
          ${options.contentEncoding ? `--content-encoding ${options.contentEncoding}` : ''} \
          ${options.signedUrl ? '--signed-url' : ''}
        
        # Capture deployment checksum for verification
        sha256sum ${backupPath}/**/*.json 2>/dev/null | head -5
      `
        .env({
          ...process.env,
          NODE_ENV: 'production',
          BUN_ENV: 'tier1380',
        })
        .cwd(process.cwd());

      // 6. Parse and validate deployment output
      const output = deployment.stdout.toString();
      const lines = output.split('\n');

      const success = lines.some(
        l =>
          l.includes('Deployment complete') ||
          l.includes('SUCCESS') ||
          l.includes('Snapshot deployed')
      );

      const errors = lines.filter(
        l => l.includes('ERROR') || l.includes('FAILED') || l.includes('WARNING:')
      );

      // 7. Generate signed URL if requested (v4.5 feature)
      let signedUrl: string | undefined;
      if (options.signedUrl && success) {
        const r2Signed = await $`
          # Generate R2 signed URL with v4.5 features
          bun run ./lib/r2/signed-url.ts \
            --bucket scanner-cookies \
            --key ${snapshotId} \
            ${options.contentEncoding ? `--content-encoding ${options.contentEncoding}` : ''} \
            --expires 3600
        `
          .quiet()
          .text();

        signedUrl = r2Signed.trim();
      }

      // 8. Health check post-deployment
      if (success) {
        const health = await this.healthCheck(snapshotId);

        if (!health.healthy) {
          console.warn(`⚠️  Health check warnings: ${health.warnings?.join(', ')}`);
        }

        return {
          success: true,
          snapshotId,
          timestamp,
          backupPath,
          signedUrl,
          output: {
            stdout: output,
            errors,
            health,
          },
          metrics,
        };
      } else {
        throw new Error(`Deployment incomplete: ${errors.join('; ')}`);
      }
    } catch (error) {
      // 🚨 Enhanced rollback with diagnostics
      console.error(`❌ Deployment failed: ${error.message}`);

      await this.emergencyRollback(snapshotId, error);

      throw new DeploymentError({
        message: `Deployment failed for ${snapshotId}`,
        cause: error,
        timestamp: new Date().toISOString(),
        rollbackInitiated: true,
      });
    }
  }

  /**
   * Enhanced rollback with diagnostics and cleanup
   */
  private static async emergencyRollback(snapshotId: string, error: Error): Promise<void> {
    console.log(`🔄 Initiating rollback for ${snapshotId}...`);

    const rollbackLog = `/tmp/tier1380-rollback-${Date.now()}.log`;

    const result = await $`
      # Run rollback with detailed logging
      ./rollback.sh ${snapshotId} \
        --reason "${error.message.replace(/"/g, '\\"')}" \
        --log ${rollbackLog} \
        2>&1 | tee -a ${rollbackLog}
      
      # Cleanup temporary files (keep backup)
      find /tmp -name "tier1380-*" -mtime +1 -delete 2>/dev/null || true
      
      # Report rollback completion
      echo "ROLLBACK_COMPLETE $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    `.nothrow();

    if (result.exitCode !== 0) {
      console.error(`⚠️  Rollback encountered issues: ${result.stderr.toString()}`);
    }

    // Send rollback notification
    await this.notifyRollback(snapshotId, error, result);
  }

  /**
   * Post-deployment health check
   */
  private static async healthCheck(snapshotId: string): Promise<HealthCheckResult> {
    const health = await $`
      # Check R2 bucket accessibility
      curl -s -o /dev/null -w "%{http_code}" \
        https://scanner-cookies.r2.cloudflarestorage.com/health 2>/dev/null || echo "000"
      
      # Verify snapshot exists
      bun run ./lib/r2/verify-snapshot.ts --id ${snapshotId} 2>/dev/null || echo "NOT_FOUND"
      
      # Check system resources
      free -m | awk 'NR==2{printf "%.1f", $3*100/$2}'
    `
      .quiet()
      .text();

    const [httpStatus, snapshotStatus, memoryUsage] = health.trim().split('\n');

    return {
      healthy: httpStatus === '200' && snapshotStatus === 'OK',
      httpStatus: parseInt(httpStatus) || 0,
      snapshotStatus,
      memoryUsage: parseFloat(memoryUsage) || 0,
      warnings: httpStatus !== '200' ? ['R2 bucket inaccessible'] : undefined,
    };
  }

  /**
   * Send rollback notification
   */
  private static async notifyRollback(
    snapshotId: string,
    error: Error,
    rollbackResult: ShellResult
  ): Promise<void> {
    const notification = {
      event: 'deployment_rollback',
      timestamp: new Date().toISOString(),
      snapshotId,
      error: {
        message: error.message,
        stack: error.stack,
      },
      rollback: {
        stdout: rollbackResult.stdout?.toString().slice(-500), // Last 500 chars
        stderr: rollbackResult.stderr?.toString().slice(-500),
        exitCode: rollbackResult.exitCode,
      },
    };

    // Send to webhook if configured
    if (process.env.TIER1380_WEBHOOK_URL) {
      await fetch(process.env.TIER1380_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tier1380-Event': 'rollback',
          Authorization: `Bearer ${process.env.TIER1380_API_KEY}`,
        },
        body: JSON.stringify(notification),
      }).catch(err => console.error(`Failed to send notification: ${err.message}`));
    }
  }

  /**
   * List recent deployments
   */
  static async listDeployments(limit: number = 10): Promise<DeploymentInfo[]> {
    const output = await $`
      find ${this.BACKUP_DIR} -name "*.json" -type f \
        | grep deployment-metrics \
        | xargs cat 2>/dev/null \
        | jq -s 'sort_by(.timestamp) | reverse | .[0:${limit}]' \
        || echo "[]"
    `
      .quiet()
      .text();

    try {
      return JSON.parse(output);
    } catch {
      return [];
    }
  }
}

// Types
interface DeploymentResult {
  success: boolean;
  snapshotId: string;
  timestamp: string;
  backupPath: string;
  signedUrl?: string;
  output: {
    stdout: string;
    errors: string[];
    health: HealthCheckResult;
  };
  metrics: any;
}

interface HealthCheckResult {
  healthy: boolean;
  httpStatus: number;
  snapshotStatus: string;
  memoryUsage: number;
  warnings?: string[];
}

interface DeploymentInfo {
  snapshotId: string;
  timestamp: string;
  success: boolean;
  duration?: number;
}

interface ShellResult {
  stdout: Buffer | null;
  stderr: Buffer | null;
  exitCode: number;
}

export class DeploymentError extends Error {
  constructor(
    public details: {
      message: string;
      cause: Error;
      timestamp: string;
      rollbackInitiated: boolean;
    }
  ) {
    super(details.message);
    this.name = 'DeploymentError';
  }
}

// Entry guard
if (import.meta.main) {
  // CLI usage example
  const snapshotId = process.argv[2] || 'snapshot-' + Date.now();

  Tier1380Deployer.deploySnapshot(snapshotId, {
    contentEncoding: 'gzip',
    preserveHeaders: true,
    signedUrl: true,
  })
    .then(result => {
      console.log('✅ Deployment successful!');
      console.log(`📊 Backup: ${result.backupPath}`);
      if (result.signedUrl) {
        console.log(`🔗 Signed URL: ${result.signedUrl}`);
      }
    })
    .catch(error => {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    });
}

export { Tier1380Deployer as default };

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
