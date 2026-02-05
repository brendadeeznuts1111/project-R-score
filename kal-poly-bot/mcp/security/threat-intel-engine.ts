/**
 * Component #12: Threat Intelligence Service
 *
 * Provides threat intelligence for MCP server security
 * Integrates with Component #41 MCP Server Engine
 */

interface ThreatScore {
  ip: string;
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source: string;
  lastSeen: number;
  metadata: Record<string, unknown>;
}

interface ThreatIntelConfig {
  serviceUrl: string;
  apiKey?: string;
  cacheTimeout: number;
  blockThreshold: number;
}

export class ThreatIntelligenceService {
  private config: ThreatIntelConfig;
  private cache: Map<string, { score: ThreatScore; expires: number }> =
    new Map();

  constructor(serviceUrl: string, apiKey?: string) {
    this.config = {
      serviceUrl,
      apiKey,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      blockThreshold: 0.8,
    };
  }

  async analyzeIP(ip: string): Promise<number> {
    // Check cache first
    const cached = this.cache.get(ip);
    if (cached && Date.now() < cached.expires) {
      return cached.score.score;
    }

    let score = 0.1; // Default low score

    // Basic IP analysis
    score = Math.max(score, this.analyzeIPPattern(ip));

    // External threat intel (if configured)
    if (this.config.serviceUrl) {
      try {
        const externalScore = await this.queryExternalThreatIntel(ip);
        score = Math.max(score, externalScore);
      } catch {
        // Fall back to basic analysis if external service fails
      }
    }

    // Cache the result
    const threatScore: ThreatScore = {
      ip,
      score,
      riskLevel: this.calculateRiskLevel(score),
      source: "internal",
      lastSeen: Date.now(),
      metadata: {
        userAgent: "MCP-Server-Engine-v2.4.1",
        component: 41,
      },
    };

    this.cache.set(ip, {
      score: threatScore,
      expires: Date.now() + this.config.cacheTimeout,
    });

    return score;
  }

  private analyzeIPPattern(ip: string): number {
    // Private IP ranges - low risk
    if (this.isPrivateIP(ip)) return 0.1;

    // Localhost - very low risk
    if (ip === "127.0.0.1" || ip === "::1") return 0.05;

    // Known malicious patterns
    if (this.isSuspiciousIP(ip)) return 0.9;

    // Cloud provider IPs - medium risk
    if (this.isCloudProviderIP(ip)) return 0.3;

    // Public IPs - default medium risk
    return 0.4;
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  private isSuspiciousIP(ip: string): boolean {
    // Simple heuristic for suspicious IPs
    const suspiciousPatterns = [
      /^0\./, // Invalid IPs starting with 0
      /^255\./, // Broadcast addresses
      /^22[4-9]\./, // Reserved multicast
      /^23[0-9]\./, // Reserved
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(ip));
  }

  private isCloudProviderIP(ip: string): boolean {
    // Simple cloud provider detection (would be more sophisticated in production)
    const cloudRanges = [
      /^3\./, // AWS
      /^52\./, // AWS
      /^54\./, // AWS
      /^13\./, // AWS
      /^104\./, // Google Cloud
      /^35\./, // Google Cloud
      /^20\./, // Microsoft Azure
      /^40\./, // Microsoft Azure
    ];

    return cloudRanges.some((range) => range.test(ip));
  }

  private async queryExternalThreatIntel(ip: string): Promise<number> {
    if (!this.config.serviceUrl) return 0.1;

    try {
      const response = await fetch(`${this.config.serviceUrl}/ip/${ip}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "User-Agent": "MCP-Server-Engine/2.4.1",
        },
      });

      if (!response.ok) {
        throw new Error(`Threat intel service error: ${response.status}`);
      }

      const data = await response.json();
      return data.threatScore || 0.1;
    } catch {
      return 0.1;
    }
  }

  private calculateRiskLevel(
    score: number
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score < 0.3) return "LOW";
    if (score < 0.6) return "MEDIUM";
    if (score < 0.8) return "HIGH";
    return "CRITICAL";
  }

  async getThreatReport(ip: string): Promise<ThreatScore | null> {
    await this.analyzeIP(ip); // Ensure we have recent data
    const cached = this.cache.get(ip);
    return cached?.score || null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.85, // Placeholder - would track actual hit rate in production
    };
  }
}
