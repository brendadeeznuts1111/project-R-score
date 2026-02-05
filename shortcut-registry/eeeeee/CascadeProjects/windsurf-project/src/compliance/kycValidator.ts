// src/compliance/kycValidator.ts - KYC Validation and Compliance Engine
// FinCEN compliant validation with risk scoring and audit logging

import { randomBytes } from "crypto";

export interface KYCDocument {
  id?: string;
  type: "passport" | "drivers_license" | "national_id" | "proof_of_address" | "selfie";
  status: "pending" | "verified" | "rejected" | "expired";
  uploadedAt: Date;
  expiresAt?: Date;
  hash: string;
}

export interface KYCUser {
  userId: string;
  email: string;
  tier: "basic" | "verified" | "premium" | "institutional";
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100
  documents: {
    id?: KYCDocument;
    address?: KYCDocument;
    selfie?: KYCDocument;
  };
  verifiedAt?: Date;
  lastActivity: Date;
  flags: string[];
  limits: {
    daily: number;
    monthly: number;
    annual: number;
  };
}

export interface ReviewQueueItem {
  userId: string;
  email: string;
  amount: number;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: Date;
  assignedTo?: string;
}

export class KYCValidator {
  private users: Map<string, KYCUser> = new Map();
  private reviewQueue: ReviewQueueItem[] = [];
  private auditLog: Array<{
    timestamp: Date;
    action: string;
    userId: string;
    data: any;
    performedBy: string;
  }> = [];

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<KYCUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    return user;
  }

  /**
   * Approve user KYC
   */
  async approveUser(userId: string, performedBy: string = "admin"): Promise<void> {
    const user = await this.getUser(userId);
    
    // Verify all required documents
    const hasValidId = user.documents.id?.status === "verified";
    const hasValidAddress = user.documents.address?.status === "verified";
    const hasValidSelfie = user.documents.selfie?.status === "verified";
    
    if (!hasValidId || !hasValidAddress || !hasValidSelfie) {
      throw new Error("Cannot approve user: missing or invalid documents");
    }

    // Update user status
    user.verifiedAt = new Date();
    user.tier = this.calculateTier(user);
    user.riskLevel = this.assessRiskLevel(user);
    this.users.set(userId, user);

    // Log approval
    await this.logAudit("USER_APPROVED", userId, {
      tier: user.tier,
      riskLevel: user.riskLevel,
      documents: {
        id: user.documents.id?.status,
        address: user.documents.address?.status,
        selfie: user.documents.selfie?.status
      }
    }, performedBy);

    // Update limits based on tier
    this.updateLimits(userId);
  }

  /**
   * Reject user KYC
   */
  async rejectUser(userId: string, reason: string, performedBy: string = "admin"): Promise<void> {
    const user = await this.getUser(userId);
    
    user.tier = "basic";
    user.riskLevel = "high";
    user.flags.push(`REJECTED: ${reason}`);
    
    this.users.set(userId, user);
    
    await this.logAudit("USER_REJECTED", userId, { reason }, performedBy);
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, reason: string, performedBy: string = "admin"): Promise<void> {
    const user = await this.getUser(userId);
    
    user.tier = "basic";
    user.riskLevel = "critical";
    user.flags.push(`SUSPENDED: ${reason}`);
    
    // Reduce limits to minimum
    user.limits = {
      daily: 100,
      monthly: 500,
      annual: 1000
    };
    
    this.users.set(userId, user);
    
    await this.logAudit("USER_SUSPENDED", userId, { reason }, performedBy);
  }

  /**
   * Get review queue
   */
  async getReviewQueue(): Promise<ReviewQueueItem[]> {
    return this.reviewQueue.sort((a, b) => {
      // Sort by priority first, then by date
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Manual approval for queue items
   */
  async manualApprove(userId: string, amount: number, performedBy: string = "admin"): Promise<void> {
    const user = await this.getUser(userId);
    
    // Check if amount exceeds limits
    if (amount > user.limits.daily) {
      throw new Error(`Amount $${amount} exceeds daily limit $${user.limits.daily}`);
    }

    // Remove from queue
    this.reviewQueue = this.reviewQueue.filter(item => item.userId !== userId);
    
    await this.logAudit("MANUAL_APPROVAL", userId, { amount }, performedBy);
  }

  /**
   * Get KYC statistics
   */
  async getKYCStats(): Promise<{
    pending: number;
    verified: number;
    highRisk: number;
    dailyVolume: number;
    totalUsers: number;
  }> {
    let pending = 0;
    let verified = 0;
    let highRisk = 0;
    let dailyVolume = 0;

    const users = Array.from(this.users.values());
    for (const user of users) {
      if (user.verifiedAt) {
        verified++;
      } else {
        pending++;
      }
      if (user.riskLevel === "high" || user.riskLevel === "critical") {
        highRisk++;
      }
      // Mock daily volume calculation
      dailyVolume += Math.random() * 1000;
    }

    return {
      pending,
      verified,
      highRisk,
      dailyVolume,
      totalUsers: this.users.size
    };
  }

  /**
   * Search users by email or ID
   */
  async searchUsers(query: string): Promise<KYCUser[]> {
    const lowerQuery = query.toLowerCase();
    const users = Array.from(this.users.values());
    
    return users.filter(user => 
      user.email.toLowerCase().includes(lowerQuery) ||
      user.userId.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Calculate user tier based on verification and risk
   */
  private calculateTier(user: KYCUser): KYCUser["tier"] {
    if (user.riskScore > 80) return "basic";
    if (user.riskScore > 60) return "verified";
    if (user.riskScore > 30) return "premium";
    return "institutional";
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(user: KYCUser): KYCUser["riskLevel"] {
    if (user.riskScore > 80) return "critical";
    if (user.riskScore > 60) return "high";
    if (user.riskScore > 30) return "medium";
    return "low";
  }

  /**
   * Update user limits based on tier
   */
  private updateLimits(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    switch (user.tier) {
      case "basic":
        user.limits = { daily: 500, monthly: 2000, annual: 10000 };
        break;
      case "verified":
        user.limits = { daily: 2000, monthly: 10000, annual: 50000 };
        break;
      case "premium":
        user.limits = { daily: 10000, monthly: 50000, annual: 250000 };
        break;
      case "institutional":
        user.limits = { daily: 100000, monthly: 1000000, annual: 10000000 };
        break;
    }

    this.users.set(userId, user);
  }

  /**
   * Log audit events
   */
  private async logAudit(action: string, userId: string, data: any, performedBy: string): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      action,
      userId,
      data,
      performedBy
    };

    this.auditLog.push(auditEntry);

    // In production, this would write to S3 with ZSTD compression
    console.log(`📝 AUDIT: ${action} for user ${userId} by ${performedBy}`);
  }

  /**
   * Initialize mock data for demonstration
   */
  private initializeMockData(): void {
    // Create mock users
    const mockUsers: KYCUser[] = [
      {
        userId: "user-001",
        email: "alice@example.com",
        tier: "verified",
        riskLevel: "low",
        riskScore: 15,
        documents: {
          id: {
            type: "passport",
            status: "verified",
            uploadedAt: new Date("2024-01-15"),
            hash: randomBytes(32).toString("hex")
          },
          address: {
            type: "proof_of_address",
            status: "verified",
            uploadedAt: new Date("2024-01-15"),
            hash: randomBytes(32).toString("hex")
          },
          selfie: {
            type: "selfie",
            status: "verified",
            uploadedAt: new Date("2024-01-15"),
            hash: randomBytes(32).toString("hex")
          }
        },
        verifiedAt: new Date("2024-01-16"),
        lastActivity: new Date(),
        flags: [],
        limits: { daily: 2000, monthly: 10000, annual: 50000 }
      },
      {
        userId: "user-002",
        email: "bob@example.com",
        tier: "basic",
        riskLevel: "medium",
        riskScore: 45,
        documents: {
          id: {
            type: "drivers_license",
            status: "pending",
            uploadedAt: new Date("2024-01-20"),
            hash: randomBytes(32).toString("hex")
          }
        },
        lastActivity: new Date(),
        flags: ["PENDING_VERIFICATION"],
        limits: { daily: 500, monthly: 2000, annual: 10000 }
      },
      {
        userId: "user-003",
        email: "charlie@example.com",
        tier: "premium",
        riskLevel: "high",
        riskScore: 75,
        documents: {
          id: {
            type: "national_id",
            status: "verified",
            uploadedAt: new Date("2024-01-10"),
            hash: randomBytes(32).toString("hex")
          },
          address: {
            type: "proof_of_address",
            status: "rejected",
            uploadedAt: new Date("2024-01-10"),
            hash: randomBytes(32).toString("hex")
          }
        },
        verifiedAt: new Date("2024-01-11"),
        lastActivity: new Date(),
        flags: ["ADDRESS_REJECTED"],
        limits: { daily: 10000, monthly: 50000, annual: 250000 }
      }
    ];

    // Add users to map
    mockUsers.forEach(user => {
      this.users.set(user.userId, user);
    });

    // Create mock review queue
    this.reviewQueue = [
      {
        userId: "user-004",
        email: "diana@example.com",
        amount: 5000,
        reason: "Large transaction exceeds daily limit",
        priority: "high",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        userId: "user-005",
        email: "eve@example.com",
        amount: 15000,
        reason: "Unusual activity pattern detected",
        priority: "urgent",
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        userId: "user-002",
        email: "bob@example.com",
        amount: 800,
        reason: "Pending KYC verification",
        priority: "medium",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      }
    ];
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 50): Array<{
    timestamp: Date;
    action: string;
    userId: string;
    data: any;
    performedBy: string;
  }> {
    return this.auditLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
