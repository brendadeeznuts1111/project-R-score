// src/observability/metrics.ts
// Prometheus metrics for 13-byte config monitoring

interface Counter {
  inc(labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

interface Gauge {
  set(value: number): void;
  get(): number;
}

// Simple in-memory metrics store (in production, use prom-client)
class SimpleCounter implements Counter {
  private value = 0;
  private labelValues: Map<string, number> = new Map();

  inc(labels?: Record<string, string>): void {
    this.value++;
    if (labels) {
      const key = JSON.stringify(labels);
      this.labelValues.set(key, (this.labelValues.get(key) || 0) + 1);
    }
  }

  get(labels?: Record<string, string>): number {
    if (labels) {
      const key = JSON.stringify(labels);
      return this.labelValues.get(key) || 0;
    }
    return this.value;
  }
}

class SimpleGauge implements Gauge {
  private value = 0;

  set(value: number): void {
    this.value = value;
  }

  get(): number {
    return this.value;
  }
}

// Metrics registry
export const metrics = {
  // Increment on every config read (for profiling)
  configReads: new SimpleCounter(),

  // Gauge of terminal mode (for alerting)
  terminalMode: new SimpleGauge(),

  // Feature flag states
  featureFlags: new SimpleGauge(),

  // Registry hash (for drift detection)
  registryHash: new SimpleGauge(),

  // Config version (for version tracking)
  configVersion: new SimpleGauge(),
};

// Get current config values
async function getConfig(): Promise<{
  version: number;
  registryHash: number;
  featureFlags: number;
  terminalMode: number;
}> {
  try {
    const lockfile = Bun.file("bun.lockb");
    if (!(await lockfile.exists())) {
      return {
        version: 1,
        registryHash: 0x3b8b5a5a,
        featureFlags: 0,
        terminalMode: 1,
      };
    }

    const header = await lockfile.arrayBuffer();
    const view = new DataView(header.slice(0, 104));

    return {
      version: view.getUint8(4),
      registryHash: view.getUint32(5, true),
      featureFlags: view.getUint32(9, true),
      terminalMode: view.getUint8(13),
    };
  } catch (error) {
    console.error("Error reading config:", error);
    return {
      version: 0,
      registryHash: 0,
      featureFlags: 0,
      terminalMode: 0,
    };
  }
}

// Update metrics from current config
export async function updateMetrics(): Promise<void> {
  const config = await getConfig();

  metrics.configVersion.set(config.version);
  metrics.registryHash.set(config.registryHash);
  metrics.featureFlags.set(config.featureFlags);
  metrics.terminalMode.set(config.terminalMode);
}

// Middleware: trace every request handler
export function withMetrics<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async function (this: any, ...args: Parameters<T>) {
    const start = Bun.nanoseconds();
    metrics.configReads.inc();

    try {
      const result = await handler.apply(this, args);
      const duration = Bun.nanoseconds() - start;

      // Alert if handler took >100µs due to config drift
      if (duration > 100_000) {
        console.error(`SLOW: ${duration}ns for request`);
      }

      return result;
    } catch (error) {
      const duration = Bun.nanoseconds() - start;
      console.error(`ERROR: Handler failed after ${duration}ns:`, error);
      throw error;
    }
  }) as T;
}

// Export metrics in Prometheus format
export function exportMetrics(): string {
  const config = getConfigSync();

  let output = `# HELP bun_config_reads_total Total number of 13-byte config reads
# TYPE bun_config_reads_total counter
bun_config_reads_total ${metrics.configReads.get()}

# HELP bun_config_version Current config version (0=legacy, 1=modern)
# TYPE bun_config_version gauge
bun_config_version{version="${config.version}"} ${config.version}

# HELP bun_registry_hash Registry hash (for drift detection)
# TYPE bun_registry_hash gauge
bun_registry_hash{hash="0x${config.registryHash.toString(16)}"} ${config.registryHash}

# HELP bun_feature_flags Enabled feature flags as bitmask
# TYPE bun_feature_flags gauge
bun_feature_flags ${config.featureFlags}

# HELP bun_terminal_mode Current terminal mode (0=disabled, 1=cooked, 2=raw, 3=pipe)
# TYPE bun_terminal_mode gauge
bun_terminal_mode{mode="${config.terminalMode}"} ${config.terminalMode}
`;

  return output;
}

function getConfigSync(): {
  version: number;
  registryHash: number;
  featureFlags: number;
  terminalMode: number;
} {
  try {
    const lockfileContent = Bun.file("bun.lockb").arrayBufferSync();
    const view = new DataView(lockfileContent.slice(0, 104));

    return {
      version: view.getUint8(4),
      registryHash: view.getUint32(5, true),
      featureFlags: view.getUint32(9, true),
      terminalMode: view.getUint8(13),
    };
  } catch {
    return {
      version: 1,
      registryHash: 0x3b8b5a5a,
      featureFlags: 0,
      terminalMode: 1,
    };
  }
}

// HTTP endpoint for metrics scraping
export function createMetricsEndpoint() {
  return {
    async fetch(req: Request): Promise<Response> {
      const start = Bun.nanoseconds();
      await updateMetrics();
      const metrics = exportMetrics();
      const duration = Bun.nanoseconds() - start;

      // Target: 150ns response time
      if (duration > 150) {
        console.warn(`Slow metrics export: ${duration}ns`);
      }

      return new Response(metrics, {
        headers: {
          "Content-Type": "text/plain; version=0.0.4",
        },
      });
    },
  };
}

