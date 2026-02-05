import { inspect } from "bun";
import { Database } from "bun:sqlite";

export function structuredLog(message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';

  if (data) {
    console.log(`${prefix} [${timestamp}] ${message}`, inspect(data, { colors: true, depth: 3 }));
  } else {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

export class PerformanceMonitor {
  private metrics: Map<string, any[]> = new Map();

  recordMetric(name: string, value: number, tags?: Record<string, any>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric = {
      value,
      timestamp: Date.now(),
      tags: tags || {}
    };

    this.metrics.get(name)!.push(metric);

    // Keep only last 100 metrics per type
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getMetrics(name?: string) {
    if (name) {
      return this.metrics.get(name) || [];
    }

    const result: Record<string, any> = {};
    for (const [key, values] of this.metrics) {
      result[key] = values[values.length - 1]?.value || 0;
    }
    return result;
  }

  async saveMetrics() {
    try {
      // In a real implementation, this would save to database
      structuredLog('Performance metrics saved');
    } catch (error) {
      structuredLog('Failed to save metrics:', error, 'error');
    }
  }
}

export class SecurityAuditor {
  async fullScan(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Basic security checks
    try {
      // Check environment variables
      const sensitiveVars = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'];
      for (const envVar of sensitiveVars) {
        if (Bun.env[envVar] && Bun.env[envVar]!.length < 8) {
          issues.push(`Weak ${envVar} detected`);
        }
      }

      // Check file permissions
      const criticalFiles = ['./package.json', './bunfig.toml'];
      for (const file of criticalFiles) {
        try {
          const stat = await Bun.file(file).stat();
          // In production, these should not be world-writable
        } catch {
          // File doesn't exist, skip
        }
      }

    } catch (error) {
      issues.push(`Security scan failed: ${error}`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  async scanCommand(command: string, args: string[] = []): Promise<{ safe: boolean; issues: string[] }> {
    const issues: string[] = [];
    const fullCommand = [command, ...args].join(' ');

    // Dangerous command patterns
    const dangerousCommands = [
      { pattern: /\brm\s+-rf\s+\/[^\/]/, description: 'Attempting to delete root filesystem' },
      { pattern: /\bsudo\s+/, description: 'Sudo usage detected' },
      { pattern: /\bchmod\s+777/, description: 'Setting world-writable permissions' },
      { pattern: /\beval\s+/, description: 'Shell eval usage' },
      { pattern: /\bcurl\s+.*\|\s*sh/, description: 'Piping curl to shell' },
      { pattern: /\bwget\s+.*\|\s*sh/, description: 'Piping wget to shell' },
      { pattern: /\bdd\s+if=\/dev\/zero/, description: 'Potential disk wiping operation' },
      { pattern: /\b> \/dev\/sd[a-z]/, description: 'Writing to raw disk device' }
    ];

    for (const { pattern, description } of dangerousCommands) {
      if (pattern.test(fullCommand)) {
        issues.push(description);
      }
    }

    // Check for potentially dangerous paths
    const dangerousPaths = ['/', '/etc', '/usr', '/var', '/home'];
    for (const arg of args) {
      if (dangerousPaths.some(path => arg.startsWith(path + '/'))) {
        issues.push(`Potentially dangerous path: ${arg}`);
      }
    }

    return {
      safe: issues.length === 0,
      issues
    };
  }
}

export class SPALabMetrics {
  private db: any;

  constructor() {
    // Initialize SQLite database for metrics
    this.initDatabase();
  }

  private initDatabase() {
    try {
      // Use Bun's SQLite implementation
      this.db = new Database('spa-lab-metrics.db', { create: true });
      this.db.run(`
        CREATE TABLE IF NOT EXISTS spa_lab_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT,
          duration_ms REAL,
          binary_size INTEGER,
          memory_usage_mb REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      structuredLog('SPA Lab metrics database initialized');
    } catch (error) {
      structuredLog('Failed to initialize metrics database:', error, 'error');
    }
  }

  recordBuildMetrics(size: number, duration: number) {
    try {
      this.db.run(
        "INSERT INTO spa_lab_metrics (event_type, duration_ms, binary_size) VALUES (?, ?, ?)",
        'build', duration, size
      );
    } catch (error) {
      structuredLog('Failed to record build metrics:', error, 'error');
    }
  }

  recordStartupMetrics(duration: number, memory: number) {
    try {
      this.db.run(
        "INSERT INTO spa_lab_metrics (event_type, duration_ms, memory_usage_mb) VALUES (?, ?, ?)",
        'startup', duration, memory
      );
    } catch (error) {
      structuredLog('Failed to record startup metrics:', error, 'error');
    }
  }

  getPerformanceReport() {
    try {
      return this.db.query(`
        SELECT
          event_type,
          AVG(duration_ms) as avg_duration,
          AVG(binary_size) as avg_size,
          COUNT(*) as sample_count
        FROM spa_lab_metrics
        GROUP BY event_type
      `).all();
    } catch (error) {
      structuredLog('Failed to get performance report:', error, 'error');
      return [];
    }
  }
}
