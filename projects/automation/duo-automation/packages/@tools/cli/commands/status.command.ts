/**
 * packages/cli/commands/status.command.ts
 * Status command - queries /api/v1/system-matrix and /api/v1/health from system-status.ts
 * Formats API responses for CLI display with optional browser output
 */

import type { CLICommand, CommandContext } from '../types/commands';
import { CommandCategory } from '../types/commands';
import { Logger } from '../utils/logger';
import { ConfigService } from '../services/config.service';
import { AuditService } from '../services/audit.service';

/**
 * Status Command - Displays comprehensive system status
 * Consumes existing /api/v1/* endpoints from system-status.ts
 */
export const createStatusCommand = (
  configService: ConfigService,
  auditService: AuditService
): CLICommand => ({
  name: 'status',
  category: CommandCategory.Infrastructure,
  metadata: {
    description: 'Display detailed system status and platform capabilities',
    examples: [
      'empire status',
      'empire status --format=json',
      'empire status --browser'
    ],
    parameters: [
      {
        name: 'format',
        type: 'string',
        description: 'Output format (table|json|markdown)',
        default: 'table'
      },
      {
        name: 'browser',
        type: 'boolean',
        description: 'Open enhanced HTML status page in browser',
        default: false
      }
    ]
  },

  handler: async (args: Record<string, unknown>, context: CommandContext) => {
    const logger = context.logger || new Logger();
    const startTime = Date.now();
    let auditId = '';

    try {
      const format = (args.format as string) || 'table';
      const openBrowser = (args.browser as boolean) || false;

      logger.info('Fetching system status from API endpoints');

      // Get API endpoints from config service
      const matrixEndpoint = configService.getApiEndpoint('/api/v1/system-matrix');
      const healthEndpoint = configService.getApiEndpoint('/api/v1/health');

      // Fetch from existing Elysia endpoints
      const [matrixResponse, healthResponse] = await Promise.all([
        fetch(matrixEndpoint).then(r => r.json() as Promise<Record<string, unknown>>),
        fetch(healthEndpoint).then(r => r.json() as Promise<Record<string, unknown>>)
      ]);

      // Format output based on requested format
      let output = '';
      switch (format) {
        case 'json':
          output = JSON.stringify({
            system: matrixResponse,
            health: healthResponse,
            timestamp: new Date().toISOString()
          }, null, 2);
          break;

        case 'markdown':
          output = formatStatusMarkdown(matrixResponse, healthResponse);
          break;

        case 'table':
        default:
          output = formatStatusTable(matrixResponse, healthResponse, logger);
          break;
      }

      console.log(output);

      // Open in browser if requested
      if (openBrowser) {
        logger.info('Opening enhanced status page in browser');
        // Browser launch would be handled by dashboard launcher
        // For now, just log the action
        logger.info('Enhanced status dashboard available at /dashboard');
      }

      // Record successful command execution
      const duration = Date.now() - startTime;
      auditId = auditService.recordCommand('status', args, 'success', duration);

      logger.info(`Status command completed in ${duration}ms`, { auditId });

      return {
        success: true,
        duration,
        format,
        auditId
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      auditService.recordCommand(
        'status',
        args,
        'failed',
        duration,
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }
});

/**
 * Format status as CLI table
 */
function formatStatusTable(
  matrix: Record<string, unknown>,
  health: Record<string, unknown>,
  logger: Logger
): string {
  const lines: string[] = [];

  lines.push('🏗️  EMPIRE PRO SYSTEM STATUS\n');

  // Display matrix data
  if (matrix.data) {
    lines.push('📊 Infrastructure Matrix:');
    lines.push(logger.formatApiResponse('/api/v1/system-matrix', matrix.data as Record<string, unknown>));
  }

  lines.push('\n');

  // Display health data
  if (health.data) {
    lines.push('💚 System Health:');
    const healthData = health.data as Record<string, unknown>;
    const status = healthData.status || 'unknown';
    const statusIcon = status === 'healthy' ? '✅ OPERATIONAL' :
                       status === 'degraded' ? '⚠️ DEGRADED' : '❌ DOWN';
    
    lines.push(`Status: ${statusIcon}`);
    
    if (healthData.memory) {
      const mem = healthData.memory as Record<string, unknown>;
      lines.push(`Memory RSS: ${mem.rss || 'N/A'}`);
      lines.push(`Memory Heap: ${mem.heap || 'N/A'}`);
    }

    if (healthData.uptime) {
      lines.push(`Uptime: ${healthData.uptime}`);
    }
  }

  lines.push('\n✅ Status command executed successfully');

  return lines.join('\n');
}

/**
 * Format status as Markdown
 */
function formatStatusMarkdown(
  matrix: Record<string, unknown>,
  health: Record<string, unknown>
): string {
  const lines: string[] = [];

  lines.push('# Empire Pro System Status\n');
  lines.push(`_Generated: ${new Date().toISOString()}_\n`);

  lines.push('## Infrastructure Matrix\n');
  lines.push('```json');
  lines.push(JSON.stringify(matrix, null, 2));
  lines.push('```\n');

  lines.push('## System Health\n');
  lines.push('```json');
  lines.push(JSON.stringify(health, null, 2));
  lines.push('```\n');

  return lines.join('\n');
}