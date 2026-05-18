export interface ThreatData {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: string[];
  lastUpdated: string;
}

export interface IPReputationData {
  ip: string;
  reputation: number;
  malicious: boolean;
  categories: string[];
  lastSeen: string;
}

export interface UserRiskProfile {
  userId: string;
  riskScore: number;
  behaviorPattern: "NORMAL" | "SUSPICIOUS" | "MALICIOUS";
  anomalies: string[];
  lastActivity: string;
}

export interface AnomalyDetection {
  score: number;
  anomalies: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
}

export class ThreatIntelligenceService {
  private readonly ipReputationCache: Map<string, IPReputationData>;
  private readonly userRiskProfiles: Map<string, UserRiskProfile>;
  private readonly registryReputation: Map<string, ThreatData>;
  private readonly knownMaliciousIPs: Set<string>;
  private readonly suspiciousPatterns: RegExp[];

  constructor() {
    this.ipReputationCache = new Map();
    this.userRiskProfiles = new Map();
    this.registryReputation = new Map();
    this.knownMaliciousIPs = new Set();
    this.suspiciousPatterns = [
      /\.\./g, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JS protocol
      /data:.*base64/i, // Base64 data URIs
    ];

    this.initializeThreatData();
  }

  private initializeThreatData(): void {
    // Initialize known malicious IPs (demo data)
    this.knownMaliciousIPs.add("192.168.1.100");
    this.knownMaliciousIPs.add("10.0.0.50");

    // Initialize registry reputation data
    this.registryReputation.set("https://registry.npmjs.org/", {
      score: 95,
      level: "LOW",
      factors: ["Official registry", "HTTPS", "Well-established"],
      lastUpdated: new Date().toISOString(),
    });

    this.registryReputation.set("http://insecure-registry.com", {
      score: 15,
      level: "HIGH",
      factors: ["HTTP protocol", "Unverified source"],
      lastUpdated: new Date().toISOString(),
    });
  }

  async analyzeRequest(
    ipAddress: string,
    userId?: string
  ): Promise<"LOW" | "MEDIUM" | "HIGH"> {
    const ipRisk = await this.getIPRiskScore(ipAddress);
    const userRisk = userId ? await this.getUserRiskScore(userId) : 0;
    const combinedScore = Math.max(ipRisk, userRisk);

    if (combinedScore >= 70) return "HIGH";
    if (combinedScore >= 40) return "MEDIUM";
    return "LOW";
  }

  async getIPRiskScore(ipAddress: string): Promise<number> {
    // Check if IP is in known malicious list
    if (this.knownMaliciousIPs.has(ipAddress)) {
      return 100;
    }

    // Check cache first
    const cached = this.ipReputationCache.get(ipAddress);
    if (cached) {
      return cached.reputation;
    }

    // Simulate IP reputation lookup
    const reputationData = await this.lookupIPReputation(ipAddress);
    this.ipReputationCache.set(ipAddress, reputationData);

    return reputationData.reputation;
  }

  private async lookupIPReputation(
    ipAddress: string
  ): Promise<IPReputationData> {
    // Simulate external API call
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simple heuristic based on IP patterns
    let reputation = 50; // Neutral
    const categories: string[] = [];

    if (ipAddress.startsWith("192.168.") || ipAddress.startsWith("10.")) {
      reputation = 20; // Private networks are lower risk
      categories.push("private-network");
    } else if (ipAddress.startsWith("127.")) {
      reputation = 0; // Localhost is safe
      categories.push("localhost");
    } else {
      reputation = 60; // Public IPs get moderate risk
      categories.push("public-ip");
    }

    // Check for suspicious patterns in IP
    if (this.isSuspiciousIP(ipAddress)) {
      reputation += 30;
      categories.push("suspicious-pattern");
    }

    return {
      ip: ipAddress,
      reputation: Math.min(reputation, 100),
      malicious: reputation >= 80,
      categories,
      lastSeen: new Date().toISOString(),
    };
  }

  private isSuspiciousIP(ipAddress: string): boolean {
    // Simple heuristic for suspicious IPs
    const parts = ipAddress.split(".");
    if (parts.length !== 4) return true;

    // Check for common patterns in malicious IPs
    return parts.some(
      (part) =>
        part === "0" ||
        part === "255" ||
        parseInt(part) > 254 ||
        part.length > 3
    );
  }

  async getUserRiskScore(userId: string): Promise<number> {
    const profile = this.userRiskProfiles.get(userId);
    if (!profile) {
      // New user gets moderate risk
      return 30;
    }

    // Update user activity
    profile.lastActivity = new Date().toISOString();

    // Calculate risk based on behavior pattern
    switch (profile.behaviorPattern) {
      case "MALICIOUS":
        return 90;
      case "SUSPICIOUS":
        return 60;
      case "NORMAL":
      default:
        return 20;
    }
  }

  async getAnomalyScore(userId: string, ipAddress: string): Promise<number> {
    const userRisk = await this.getUserRiskScore(userId);
    const ipRisk = await this.getIPRiskScore(ipAddress);

    // Check for anomalies in user behavior
    const anomalies = await this.detectAnomalies(userId, ipAddress);

    const baseScore = (userRisk + ipRisk) / 2;
    const anomalyBonus = anomalies.anomalies.length * 10;

    return Math.min(baseScore + anomalyBonus, 100);
  }

  private async detectAnomalies(
    userId: string,
    ipAddress: string
  ): Promise<AnomalyDetection> {
    const anomalies: string[] = [];
    let score = 0;

    const profile = this.userRiskProfiles.get(userId);
    if (profile) {
      // Check for unusual time patterns (simplified)
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        anomalies.push("Unusual activity time");
        score += 15;
      }

      // Check for rapid successive requests (would need request history in real implementation)
      // This is a placeholder for that logic
    }

    // Check IP-based anomalies
    if (this.knownMaliciousIPs.has(ipAddress)) {
      anomalies.push("Known malicious IP");
      score += 50;
    }

    const riskLevel = score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
    const confidence = Math.min(90, 60 + anomalies.length * 10);

    return {
      score,
      anomalies,
      riskLevel,
      confidence,
    };
  }

  async getRegistryReputation(registryUrl: string): Promise<ThreatData> {
    const cached = this.registryReputation.get(registryUrl);
    if (cached) {
      return cached;
    }

    // Analyze registry URL for security
    let score = 50;
    const factors: string[] = [];

    if (registryUrl.startsWith("https://")) {
      score += 30;
      factors.push("HTTPS protocol");
    } else if (registryUrl.startsWith("http://")) {
      score -= 20;
      factors.push("HTTP protocol (insecure)");
    }

    if (registryUrl.includes("npmjs.org")) {
      score += 20;
      factors.push("Official npm registry");
    } else if (
      registryUrl.includes("localhost") ||
      registryUrl.includes("127.0.0.1")
    ) {
      score += 10;
      factors.push("Local registry");
    } else {
      score -= 10;
      factors.push("Unknown registry");
    }

    const level = score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH";
    const threatData: ThreatData = {
      score: Math.max(0, Math.min(100, score)),
      level,
      factors,
      lastUpdated: new Date().toISOString(),
    };

    this.registryReputation.set(registryUrl, threatData);
    return threatData;
  }

  updateUserRiskProfile(
    userId: string,
    behavior: "NORMAL" | "SUSPICIOUS" | "MALICIOUS",
    anomalies: string[] = []
  ): void {
    const profile: UserRiskProfile = {
      userId,
      riskScore:
        behavior === "MALICIOUS" ? 90 : behavior === "SUSPICIOUS" ? 60 : 20,
      behaviorPattern: behavior,
      anomalies,
      lastActivity: new Date().toISOString(),
    };

    this.userRiskProfiles.set(userId, profile);
  }

  getThreatSummary(): {
    totalMaliciousIPs: number;
    cachedIPReputations: number;
    trackedUsers: number;
    registryReputations: number;
  } {
    return {
      totalMaliciousIPs: this.knownMaliciousIPs.size,
      cachedIPReputations: this.ipReputationCache.size,
      trackedUsers: this.userRiskProfiles.size,
      registryReputations: this.registryReputation.size,
    };
  }

  clearCache(): void {
    this.ipReputationCache.clear();
    this.userRiskProfiles.clear();
  }
}
