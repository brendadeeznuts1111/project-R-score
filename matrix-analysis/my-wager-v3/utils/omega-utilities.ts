// utils/omega-utilities.ts
// Omega Phase 3.25 - Integrated Bun Utilities for Enhanced Operations

import { resolveOmegaTool, validateRequiredTools } from "./omega-tool-resolver";

// Omega utility class integrating all Bun utilities
export class OmegaUtilities {
  private static instance: OmegaUtilities;
  private sessionId: string;
  private toolCache: Map<string, string | null> = new Map();
  private startTime: number;

  private constructor() {
    this.sessionId = Bun.randomUUIDv7('base64');
    this.startTime = Date.now();
  }

  static getInstance(): OmegaUtilities {
    if (!OmegaUtilities.instance) {
      OmegaUtilities.instance = new OmegaUtilities();
    }
    return OmegaUtilities.instance;
  }

  // Enhanced tool resolution with caching
  async resolveTool(tool: string): Promise<string | null> {
    if (this.toolCache.has(tool)) {
      return this.toolCache.get(tool)!;
    }

    const path = await resolveOmegaTool(tool);
    this.toolCache.set(tool, path);
    return path;
  }

  // Batch tool validation for Omega operations
  async validateTools(tools: string[]): Promise<{
    valid: boolean;
    missing: string[];
    found: Record<string, string>;
    report: string;
  }> {
    const validation = await validateRequiredTools(tools);

    // Generate CLI report using stringWidth
    const report = this.generateToolReport(validation.found, validation.missing);

    return {
      ...validation,
      report
    };
  }

  // Generate aligned CLI report
  private generateToolReport(found: Record<string, string>, missing: string[]): string {
    const lines = ['🔧 Tool Resolution Report', '========================', ''];

    // Calculate column widths
    const toolWidth = Math.max(
      'Tool'.length,
      ...Object.keys(found).map(t => Bun.stringWidth(t)),
      ...missing.map(t => Bun.stringWidth(t))
    );

    const pathWidth = 40;

    // Header
    lines.push('Tool'.padEnd(toolWidth) + ' | Path'.padEnd(pathWidth) + ' | Status');
    lines.push('-'.repeat(toolWidth) + '-+-' + '-'.repeat(pathWidth) + '-+-' + '------');

    // Found tools
    Object.entries(found).forEach(([tool, path]) => {
      const displayPath = path.length > pathWidth ?
        path.substring(0, pathWidth - 3) + '...' : path;
      lines.push(tool.padEnd(toolWidth) + ' | ' + displayPath.padEnd(pathWidth) + ' | ✅');
    });

    // Missing tools
    missing.forEach(tool => {
      lines.push(tool.padEnd(toolWidth) + ' | ' + 'Not found'.padEnd(pathWidth) + ' | ❌');
    });

    return lines.join('\n');
  }

  // Create secure session with UUID
  createSession(context?: string): {
    id: string;
    context?: string;
    timestamp: string;
    toolsValidated: boolean;
  } {
    return {
      id: this.sessionId,
      context,
      timestamp: new Date().toISOString(),
      toolsValidated: false
    };
  }

  // Async operation monitoring with peek
  async monitorOperation<T>(
    operation: Promise<T>,
    name: string
  ): Promise<{
    result?: T;
    status: 'pending' | 'fulfilled' | 'rejected';
    duration?: number;
    error?: string;
  }> {
    const start = Bun.nanoseconds();

    // Non-blocking status check
    const initialStatus = Bun.peek.status(operation);

    // Wait for completion
    try {
      const result = await operation;
      const duration = (Bun.nanoseconds() - start) / 1000000;

      return {
        result,
        status: 'fulfilled',
        duration
      };
    } catch (error) {
      const duration = (Bun.nanoseconds() - start) / 1000000;

      return {
        status: 'rejected',
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Generate HTML-safe dashboard content
  sanitizeForHTML(content: any): string {
    if (typeof content === 'string') {
      return Bun.escapeHTML(content);
    }

    if (typeof content === 'object' && content !== null) {
      return Bun.escapeHTML(JSON.stringify(content, null, 2));
    }

    return Bun.escapeHTML(String(content));
  }

  // Path handling for cross-platform compatibility
  normalizePath(path: string): string {
    const url = Bun.pathToFileURL(path);
    return Bun.fileURLToPath(url);
  }

  // Configuration validation with deep equality
  validateConfig(
    config: any,
    expected: any,
    strict: boolean = false
  ): {
    valid: boolean;
    diff?: any;
  } {
    const valid = Bun.deepEquals(config, expected, strict);

    return {
      valid,
      // In a real implementation, you might want to generate a proper diff
      diff: valid ? undefined : { config, expected }
    };
  }

  // Performance metrics collection
  getMetrics(): {
    sessionId: string;
    uptime: number;
    cacheSize: number;
    cacheHitRate: number;
    toolsResolved: number;
  } {
    return {
      sessionId: this.sessionId,
      uptime: Date.now() - this.startTime,
      cacheSize: this.toolCache.size,
      cacheHitRate: 0, // Would need to track hits/misses
      toolsResolved: this.toolCache.size
    };
  }

  // Export data in various formats
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      session: {
        id: this.sessionId,
        startTime: new Date(this.startTime).toISOString(),
        uptime: Date.now() - this.startTime
      },
      tools: Object.fromEntries(this.toolCache),
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const lines = [
      'Metric,Value',
      `Session ID,${data.session.id}`,
      `Start Time,${data.session.startTime}`,
      `Uptime,${data.session.uptime}`,
      `Cache Size,${data.metrics.cacheSize}`,
      `Tools Resolved,${data.metrics.toolsResolved}`
    ];

    return lines.join('\n');
  }

  // Debug helper - open file in editor
  debugFile(path: string, line?: number, column?: number): void {
    Bun.openInEditor(path, { line, column });
  }
}

// Export singleton instance and utilities
export const omegaUtils = OmegaUtilities.getInstance();

// Convenience exports
export const {
  resolveTool,
  validateTools,
  createSession,
  monitorOperation,
  sanitizeForHTML,
  normalizePath,
  validateConfig,
  getMetrics,
  exportData,
  debugFile
} = omegaUtils;

// Demo function
export async function demoOmegaUtilities(): Promise<void> {
  console.log('🚀 Omega Phase 3.25 Utilities Demo');
  console.log('===================================\n');

  // 1. Tool validation
  console.log('1. Tool Validation');
  console.log('-----------------');
  const tools = ['bun', 'git', 'node', 'npm'];
  const validation = await omegaUtils.validateTools(tools);
  console.log(validation.report);

  // 2. Session creation
  console.log('\n2. Session Management');
  console.log('--------------------');
  const session = omegaUtils.createSession('demo');
  console.log(`Session ID: ${session.id}`);
  console.log(`Created: ${session.timestamp}`);

  // 3. Async monitoring
  console.log('\n3. Async Operation Monitoring');
  console.log('-----------------------------');
  const operation = new Promise(resolve =>
    setTimeout(() => resolve({ data: 'success' }), 100)
  );
  const monitored = await omegaUtils.monitorOperation(operation, 'test-op');
  console.log(`Status: ${monitored.status}, Duration: ${monitored.duration}ms`);

  // 4. HTML sanitization
  console.log('\n4. HTML Sanitization');
  console.log('-------------------');
  const unsafe = '<script>alert("xss")</script>';
  const safe = omegaUtils.sanitizeForHTML(unsafe);
  console.log(`Unsafe: ${unsafe}`);
  console.log(`Safe: ${safe}`);

  // 5. Path normalization
  console.log('\n5. Path Normalization');
  console.log('---------------------');
  const paths = ['./package.json', '/tmp/../tmp/file'];
  paths.forEach(p => {
    console.log(`${p} -> ${omegaUtils.normalizePath(p)}`);
  });

  // 6. Metrics
  console.log('\n6. Metrics');
  console.log('--------');
  const metrics = omegaUtils.getMetrics();
  console.log(`Uptime: ${metrics.uptime}ms`);
  console.log(`Cache size: ${metrics.cacheSize}`);

  // 7. Export
  console.log('\n7. Data Export (JSON)');
  console.log('---------------------');
  const exported = omegaUtils.exportData('json');
  console.log(exported.substring(0, 200) + '...');

  console.log('\n✅ Demo complete!');
}

// Run demo if executed directly
if (import.meta.path === Bun.main) {
  demoOmegaUtilities().catch(console.error);
}
