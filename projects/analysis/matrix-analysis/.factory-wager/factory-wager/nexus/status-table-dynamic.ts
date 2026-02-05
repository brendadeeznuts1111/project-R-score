#!/usr/bin/env bun
/**
 * FactoryWager Dynamic Status Table Renderer v1.3.8
 * Real-time endpoint monitoring with dynamic HSL coloring
 */

interface EndpointStatus {
  name: string;
  type: 'domain' | 'registry' | 'r2';
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  latency: number; // ms
  httpStatus?: number;
  lastCheck: Date;
  drift?: boolean;
}

interface DomainHealth {
  endpoints: Array<{
    endpoint: string;
    healthy: boolean;
    status: number;
    latency: string;
  }>;
  checkedAt: string;
}

interface RegistryHealth {
  reachable: boolean;
  latency?: string;
}

interface R2Health {
  bucket: string;
  error?: boolean;
  latency?: string;
  integrity?: {
    checked: boolean;
    valid: boolean;
  };
}

export function renderDynamicStatusTable(
  domain: DomainHealth,
  registry: RegistryHealth,
  r2: R2Health
): void {
  // Collect all endpoints
  const endpoints: EndpointStatus[] = [];

  // Domain endpoints
  domain.endpoints.forEach(ep => {
    endpoints.push({
      name: ep.endpoint.replace(/^https?:\/\//, '').slice(0, 20),
      type: 'domain',
      status: ep.healthy ? 'healthy' : ep.status > 0 ? 'degraded' : 'critical',
      latency: parseFloat(ep.latency) || 9999,
      httpStatus: ep.status,
      lastCheck: new Date(domain.checkedAt),
      drift: false
    });
  });

  // Registry
  endpoints.push({
    name: 'registry',
    type: 'registry',
    status: registry.reachable ? 'healthy' : 'critical',
    latency: parseFloat(registry.latency || '9999'),
    lastCheck: new Date(),
    drift: false
  });

  // R2
  endpoints.push({
    name: r2.bucket,
    type: 'r2',
    status: r2.error ? 'critical' : 'healthy',
    latency: parseFloat(r2.latency || '9999'),
    lastCheck: new Date(),
    drift: r2.integrity?.checked && !r2.integrity.valid
  });

  // Dynamic HSL calculation based on health
  const getStatusColor = (status: EndpointStatus): string => {
    if (status.drift) return "hsl(280, 70%, 60%)"; // Purple for config drift

    switch(status.status) {
      case 'healthy':
        // Green gradient based on latency
        // < 100ms = vibrant green, > 500ms = muted green
        const greenIntensity = Math.max(40, 80 - (status.latency / 10));
        return `hsl(145, 80%, ${greenIntensity}%)`;

      case 'degraded':
        // Orange/Yellow based on latency
        const orangeHue = Math.min(45, 30 + (status.latency / 50));
        return `hsl(${orangeHue}, 90%, 55%)`;

      case 'critical':
        // Red with intensity based on how critical
        const redLightness = status.latency > 5000 ? 40 : 55;
        return `hsl(10, 90%, ${redLightness}%)`;

      default:
        return "hsl(0, 0%, 50%)"; // Gray
    }
  };

  // Enhanced severity gradient for registry health with quantum glyph state mapping
  const severityGradient = (latency: number, http: number, drift: boolean) => {
    const base = drift ? 180 : 0; // Phase shift for drift detection

    if (http >= 500 || latency === 9999) {
      // QUANTUM_ROLLBACK_PATTERN (⊟) — critical
      return {
        color: `hsl(0 + base, 90, 45)`,
        glyph: "⊟",
        state: "CRITICAL"
      };
    }
    if (latency > 2000) {
      // STRUCTURAL_DRIFT_PATTERN (▵⟂⥂) — degraded
      return {
        color: `hsl(45 + base, 95, 55)`,
        glyph: "▵⟂⥂",
        state: "DEGRADED"
      };
    }
    // DEPENDENCY_COHERENCE_PATTERN (⥂⟂(▵⟜⟳)) — healthy
    return {
      color: `hsl(140, 75, 55)`,
      glyph: "⥂⟂(▵⟜⟳)",
      state: "HEALTHY"
    };
  };

  const getLatencyColor = (ms: number): string => {
    if (ms < 50) return "hsl(145, 80%, 50%)";   // Fast: bright green
    if (ms < 150) return "hsl(100, 70%, 50%)";  // Good: lime
    if (ms < 300) return "hsl(60, 90%, 50%)";   // OK: yellow
    if (ms < 500) return "hsl(30, 90%, 55%)";   // Slow: orange
    return "hsl(10, 90%, 55%)";                  // Bad: red
  };

  // Render table
  console.log("\n" + "█".repeat(100));
  console.log(Bun.color("hsl(220, 60%, 70%)") + " 🔌 LIVE ENDPOINT STATUS" + "\x1b[0m");
  console.log("█".repeat(100));

  // Headers
  const headers = [
    { name: "Endpoint", w: 22, align: "left" },
    { name: "Type", w: 10, align: "center" },
    { name: "Status", w: 12, align: "center" },
    { name: "Latency", w: 10, align: "right" },
    { name: "HTTP", w: 6, align: "center" },
    { name: "Drift", w: 6, align: "center" },
    { name: "Last Check", w: 12, align: "right" }
  ];

  const headerLine = headers.map(h =>
    Bun.color("hsl(220, 20%, 60%)") +
    (h.align === "right" ? h.name.padStart(h.w) : h.name.padEnd(h.w)) +
    "\x1b[0m"
  ).join(" │ ");

  console.log(headerLine);
  console.log("─".repeat(100));

  // Rows with dynamic colors
  endpoints.forEach(ep => {
    const statusColor = getStatusColor(ep);
    const latencyColor = getLatencyColor(ep.latency);
    const severity = severityGradient(ep.latency, ep.httpStatus || 200, ep.drift || false);

    const cells = [
      // Endpoint name (white)
      "\x1b[1m" + ep.name.padEnd(22) + "\x1b[0m",

      // Type (cyan for domain, magenta for registry, orange for r2)
      Bun.color(
        ep.type === 'domain' ? "hsl(180, 60%, 55%)" :
        ep.type === 'registry' ? "hsl(300, 70%, 65%)" :
        "hsl(30, 90%, 60%)"
      ) + ep.type.padEnd(10) + "\x1b[0m",

      // Status (dynamic HSL with quantum glyph)
      Bun.color(statusColor) +
      `${severity.glyph} ${ep.status}`.padEnd(12) + "\x1b[0m",

      // Latency (dynamic gradient)
      Bun.color(latencyColor) +
      `${ep.latency.toFixed(0)}ms`.padStart(10) + "\x1b[0m",

      // HTTP status
      (ep.httpStatus === 200 ? "\x1b[32m" : "\x1b[31m") +
      (ep.httpStatus?.toString() || "N/A").padStart(6) + "\x1b[0m",

      // Drift indicator
      ep.drift ?
        Bun.color("hsl(280, 70%, 60%)") + "⚠ drift" + "\x1b[0m" :
        "  ✓   ",

      // Last check (dim)
      "\x1b[90m" + ep.lastCheck.toLocaleTimeString().padStart(12) + "\x1b[0m"
    ];

    console.log(cells.join(" │ "));
  });

  console.log("█".repeat(100));

  // Overall health score with dynamic color
  const healthScore = calculateHealthScore(endpoints);
  const scoreColor = healthScore >= 90 ? "hsl(145, 80%, 45%)" :
                    healthScore >= 70 ? "hsl(48, 100%, 60%)" :
                    "hsl(10, 90%, 55%)";

  console.log(`\n${Bun.color(scoreColor)}` +
    ` Overall Health: ${healthScore}/100` +
    `\x1b[0m` +
    (healthScore < 90 ? " ⚠️ Run /fw-vault-health-fix" : " ✅ All systems optimal"));
}

function calculateHealthScore(endpoints: EndpointStatus[]): number {
  if (endpoints.length === 0) return 0;

  let score = 100;

  endpoints.forEach(ep => {
    if (ep.status === 'critical') score -= 25;
    else if (ep.status === 'degraded') score -= 10;
    if (ep.latency > 500) score -= 5;
    if (ep.drift) score -= 15;
  });

  return Math.max(0, score);
}

// Demo function for standalone testing
export function demoDynamicStatusTable(): void {
  const mockDomain: DomainHealth = {
    endpoints: [
      {
        endpoint: "https://api.factory-wager.com",
        healthy: true,
        status: 200,
        latency: "12"
      },
      {
        endpoint: "https://staging-api.factory-wager.com",
        healthy: true,
        status: 200,
        latency: "245"
      },
      {
        endpoint: "https://registry.factory-wager.com",
        healthy: false,
        status: 500,
        latency: "9999"
      }
    ],
    checkedAt: new Date().toISOString()
  };

  const mockRegistry: RegistryHealth = {
    reachable: true,
    latency: "45"
  };

  const mockR2: R2Health = {
    bucket: "factory-wager-artifacts",
    latency: "89",
    integrity: {
      checked: true,
      valid: true
    }
  };

  renderDynamicStatusTable(mockDomain, mockRegistry, mockR2);
}

// CLI interface for standalone execution
async function main() {
  const args = process.argv.slice(2);
  const watch = args.includes('--watch');

  if (watch) {
    console.log('👁️  Watch mode - Refreshing every 5 seconds (Ctrl+C to stop)');
    while (true) {
      console.clear();
      demoDynamicStatusTable();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } else {
    demoDynamicStatusTable();
  }
}

if (import.meta.main) {
  main();
}
