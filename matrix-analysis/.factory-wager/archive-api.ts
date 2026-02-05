#!/usr/bin/env bun

/**
 * FactoryWager Archive API
 * RESTful API for managing archived FactoryWager data in R2 storage
 */

import { R2ArchiveManager, type R2Config, type ArchiveResult } from './r2-integration';
import { serve } from 'bun';

interface ArchiveAPIConfig {
  port: number;
  r2Config: R2Config;
  auth: {
    enabled: boolean;
    token?: string;
  };
}

interface ArchiveRequest {
  type: 'audit' | 'reports' | 'releases' | 'all';
  olderThanDays?: number;
  compress?: boolean;
}

interface ArchiveResponse {
  success: boolean;
  timestamp: string;
  results: ArchiveResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
    spaceSaved: number;
  };
  error?: string;
}

class ArchiveAPI {
  private archiver: R2ArchiveManager;
  private config: ArchiveAPIConfig;

  constructor(config: ArchiveAPIConfig) {
    this.config = config;
    this.archiver = new R2ArchiveManager(config.r2Config);
  }

  /**
   * Starts the Archive API server
   */
  async start(): Promise<void> {
    const server = serve({
      port: this.config.port,
      fetch: this.handleRequest.bind(this),
      error(error: Error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    });

    console.log(`🌐 FactoryWager Archive API started on port ${this.config.port}`);
    console.log(`📊 Health check: http://localhost:${this.config.port}/health`);
    console.log(`📚 Documentation: http://localhost:${this.config.port}/docs`);
  }

  /**
   * Handles incoming HTTP requests
   */
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Authentication check
    if (this.config.auth.enabled && !this.authenticate(request)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      switch (path) {
        case '/health':
          return this.handleHealth();

        case '/archive':
          if (method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
          }
          return this.handleArchive(request);

        case '/status':
          return this.handleStatus();

        case '/docs':
          return this.handleDocs();

        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Handles health check requests
   */
  private handleHealth(): Response {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      r2: {
        connected: true, // Would check actual R2 connection
        bucket: this.config.r2Config.bucket
      }
    };

    return new Response(JSON.stringify(health, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Handles archive requests
   */
  private async handleArchive(request: Request): Promise<Response> {
    try {
      const body: ArchiveRequest = await request.json();
      const { type, olderThanDays = 30, compress = true } = body;

      let results: ArchiveResult[] = [];

      switch (type) {
        case 'audit':
          results = await this.archiver.archiveAuditLogs(olderThanDays);
          break;

        case 'reports':
          results = await this.archiver.archiveReports(olderThanDays);
          break;

        case 'releases':
          results = await this.archiver.archiveReleases(olderThanDays);
          break;

        case 'all':
          const [auditResults, reportResults, releaseResults] = await Promise.all([
            this.archiver.archiveAuditLogs(olderThanDays),
            this.archiver.archiveReports(olderThanDays),
            this.archiver.archiveReleases(olderThanDays)
          ]);
          results = [...auditResults, ...reportResults, ...releaseResults];
          break;

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid archive type' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const totalSize = successful.reduce((sum, r) => sum + r.size, 0);
      const originalSize = results.reduce((sum, r) => sum + r.size, 0);

      const response: ArchiveResponse = {
        success: successful.length > 0,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
          totalSize,
          spaceSaved: originalSize - totalSize
        }
      };

      return new Response(JSON.stringify(response, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Handles status requests
   */
  private handleStatus(): Response {
    const status = {
      timestamp: new Date().toISOString(),
      local_storage: {
        audit_log_size: this.getLocalFileSize('.factory-wager/audit.log'),
        reports_count: this.countFiles('.factory-wager/reports', '.html'),
        releases_count: this.countFiles('.factory-wager/releases', '.md')
      },
      archive_settings: {
        default_retention: {
          audit_logs: 90, // days
          reports: 365, // days
          releases: 730 // days
        }
      }
    };

    return new Response(JSON.stringify(status, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Handles documentation requests
   */
  private handleDocs(): Response {
    const docs = {
      title: 'FactoryWager Archive API',
      version: '1.0.0',
      endpoints: {
        'GET /health': {
          description: 'Check API health status',
          response: 'Health status object'
        },
        'POST /archive': {
          description: 'Archive FactoryWager data to R2',
          parameters: {
            type: 'audit | reports | releases | all',
            olderThanDays: 'number (default: 30)',
            compress: 'boolean (default: true)'
          },
          response: 'Archive operation results'
        },
        'GET /status': {
          description: 'Get current storage status',
          response: 'Storage status object'
        }
      },
      examples: {
        archive_all: {
          method: 'POST',
          url: '/archive',
          body: {
            type: 'all',
            olderThanDays: 7,
            compress: true
          }
        },
        archive_reports: {
          method: 'POST',
          url: '/archive',
          body: {
            type: 'reports',
            olderThanDays: 30
          }
        }
      }
    };

    return new Response(JSON.stringify(docs, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Authenticates requests
   */
  private authenticate(request: Request): boolean {
    if (!this.config.auth.enabled || !this.config.auth.token) {
      return true; // No auth required
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return false;
    }

    const expectedAuth = `Bearer ${this.config.auth.token}`;
    return authHeader === expectedAuth;
  }

  /**
   * Helper: Get local file size
   */
  private getLocalFileSize(path: string): number {
    try {
      const { statSync } = require('fs');
      return statSync(path).size;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Count files with extension
   */
  private countFiles(dir: string, extension: string): number {
    try {
      const { readdirSync, statSync } = require('fs');
      const { join } = require('path');

      if (!require('fs').existsSync(dir)) {
        return 0;
      }

      return readdirSync(dir).filter((file: string) =>
        file.endsWith(extension) && statSync(join(dir, file)).isFile()
      ).length;
    } catch {
      return 0;
    }
  }
}

// CLI interface
if (import.meta.main) {
  console.log('🌐 Starting FactoryWager Archive API...');
  console.log('=======================================');

  // Load configuration
  const config: ArchiveAPIConfig = {
    port: parseInt(process.env.ARCHIVE_API_PORT || '3001'),
    r2Config: {
      accountId: process.env.R2_ACCOUNT_ID || 'demo-account',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || 'demo-key',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'demo-secret',
      bucket: process.env.R2_BUCKET || 'factory-wager-archive'
    },
    auth: {
      enabled: process.env.ARCHIVE_API_AUTH === 'true',
      token: process.env.ARCHIVE_API_TOKEN
    }
  };

  const api = new ArchiveAPI(config);

  api.start().catch((error: unknown) => {
    console.error('❌ Failed to start Archive API:', error);
    process.exit(1);
  });
}

export { ArchiveAPI, type ArchiveAPIConfig, type ArchiveRequest, type ArchiveResponse };
