#!/usr/bin/env bun
/**
 * FactoryWager Network Triage v1.3.8
 * Tier-1380 network-layer diagnostics with quantum glyph state mapping
 */

interface TriageResult {
  timestamp: number;
  dns: string;
  http: string;
  tls: {
    subject: string;
    dates: string;
    status: string;
  };
  assessment: string;
}

class NetworkTriage {
  private registry = "registry.factory-wager.co";

  async execute(): Promise<TriageResult> {
    console.log("=== TIER-1380 NETWORK TRIAGE ===");

    const result: TriageResult = {
      timestamp: Date.now(),
      dns: "unknown",
      http: "unknown",
      tls: {
        subject: "unknown",
        dates: "unknown",
        status: "unknown"
      },
      assessment: "unknown"
    };

    try {
      // Execute triage commands
      const triage = await Bun.$`
        echo "=== DNS RESOLUTION ===" && \
        dig +short ${this.registry} | head -1 || echo "DNS_FAILED" && \
        echo "=== HTTP HEADERS ===" && \
        curl -sI --connect-timeout 5 https://${this.registry}/health 2>&1 | head -5 || echo "HTTP_FAILED" && \
        echo "=== TLS CERTIFICATE ===" && \
        echo | openssl s_client -connect ${this.registry}:443 -servername ${this.registry} 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null || echo "TLS_FAILED"
      `.text();

      // Parse results
      const lines = triage.split('\n');
      let currentSection = '';

      lines.forEach(line => {
        if (line.includes('DNS RESOLUTION')) {
          currentSection = 'dns';
        } else if (line.includes('HTTP HEADERS')) {
          currentSection = 'http';
        } else if (line.includes('TLS CERTIFICATE')) {
          currentSection = 'tls';
        } else if (line.trim() && !line.includes('===')) {
          if (currentSection === 'dns' && !line.includes('DNS_FAILED')) {
            result.dns = line.trim();
          } else if (currentSection === 'http' && !line.includes('HTTP_FAILED')) {
            result.http = line.trim();
          } else if (currentSection === 'tls' && !line.includes('TLS_FAILED')) {
            if (line.includes('subject=')) {
              result.tls.subject = line.trim();
            } else if (line.includes('notBefore=') || line.includes('notAfter=')) {
              result.tls.dates += line.trim() + ' ';
            }
          }
        }
      });

      // Assessment
      result.assessment = this.assess(result);

      // Log results
      console.log(triage);
      await Bun.write(Bun.file('./.factory-wager/triage.log'), `[${new Date().toISOString()}] ${JSON.stringify(result)}\n`);

      return result;
    } catch (error) {
      result.assessment = `TRIAGE_FAILED: ${(error as Error).message}`;
      return result;
    }
  }

  private assess(result: TriageResult): string {
    if (result.dns === 'unknown' || result.dns.includes('DNS_FAILED')) {
      return "CRITICAL: DNS resolution failure - domain not registered or DNS misconfigured";
    }
    if (result.http === 'unknown' || result.http.includes('HTTP_FAILED')) {
      return "CRITICAL: HTTP connectivity failure - service unreachable or firewall blocked";
    }
    if (result.tls.subject === 'unknown') {
      return "WARNING: TLS certificate issue - expired, invalid, or misconfigured";
    }
    return "HEALTHY: All network layers functional";
  }
}

// CLI interface
async function main() {
  const triage = new NetworkTriage();
  const result = await triage.execute();
  
  console.log("\n=== ASSESSMENT ===");
  console.log(result.assessment);
  
  if (result.assessment.includes('CRITICAL')) {
    process.exit(1);
  } else if (result.assessment.includes('WARNING')) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

if (import.meta.main) {
  main();
}
