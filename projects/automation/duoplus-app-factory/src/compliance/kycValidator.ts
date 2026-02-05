import { db } from "../database/db.js";

export interface KYCValidationResult {
  allowed: boolean;
  message?: string;
  requiresReview?: boolean;
}

export interface RiskProfile {
  level: 'low' | 'medium' | 'high';
  score?: number;
}

export class KYCValidator {
  /**
   * Validate Lightning payment against FinCEN rules
   */
  async validateLightningPayment(userId: string, amountUsd: number): Promise<KYCValidationResult> {
    const userRisk = await this.getUserRiskProfile(userId);
    
    // FinCEN CTR threshold: $10,000 daily
    if (amountUsd > 10000) {
      return {
        allowed: false,
        message: "Amount exceeds $10,000 FinCEN threshold",
        requiresReview: true,
      };
    }

    // FinCEN Recordkeeping threshold: $3,000
    if (amountUsd > 3000) {
      if (userRisk.level === "high") {
        await this.triggerManualReview(userId, amountUsd, "HIGH_RISK_AMOUNT");
        return {
          allowed: false,
          message: "Manual review required for high-risk user",
          requiresReview: true,
        };
      }
    }

    // Daily Lightning limit per risk tier
    const limits = {
      low: 10000,    // $10k daily
      medium: 5000,  // $5k daily
      high: 1000,    // $1k daily
    };

    const todayVolume = await this.getDailyLightningVolume(userId);
    const newVolume = todayVolume + amountUsd;

    if (newVolume > limits[userRisk.level]) {
      return {
        allowed: false,
        message: `Daily Lightning limit exceeded: $${limits[userRisk.level]}`,
      };
    }

    // Geo-restrictions (OFAC compliance)
    if (await this.isSanctionedJurisdiction(userId)) {
      return {
        allowed: false,
        message: "Jurisdiction not supported for Lightning payments",
      };
    }

    // Additional velocity checks
    const recentTxCount = await this.getRecentTransactionCount(userId);
    if (recentTxCount > 20 && amountUsd > 1000) {
      await this.triggerManualReview(userId, amountUsd, "VELOCITY_THRESHOLD");
      return {
        allowed: false,
        message: "High velocity detected - manual review required",
        requiresReview: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Track daily volume for each user
   */
  private async getDailyLightningVolume(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await db.query(
        "SELECT SUM(amount_usd) as total FROM lightning_payments WHERE user_id = ? AND DATE(timestamp) = ?",
        [userId, today]
      );
      return result.rows[0]?.total || 0;
    } catch (error) {
      console.error("Error getting daily volume:", error);
      return 0;
    }
  }

  private async getUserRiskProfile(userId: string): Promise<RiskProfile> {
    try {
      // Check if user exists in database
      const result = await db.query(
        "SELECT risk_level, risk_score FROM users WHERE id = ?",
        [userId]
      );
      
      if (result.rows.length === 0) {
        // New user - default to low risk but with monitoring
        return { level: 'low', score: 0 };
      }

      const user = result.rows[0];
      return {
        level: user.risk_level || 'low',
        score: user.risk_score || 0
      };
    } catch (error) {
      console.error("Error getting risk profile:", error);
      return { level: 'low', score: 0 };
    }
  }

  private async getRecentTransactionCount(userId: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const result = await db.query(
        "SELECT COUNT(*) as count FROM lightning_payments WHERE user_id = ? AND timestamp > ?",
        [userId, oneHourAgo]
      );
      return result.rows[0]?.count || 0;
    } catch (error) {
      console.error("Error getting recent transaction count:", error);
      return 0;
    }
  }

  private async triggerManualReview(userId: string, amount: number, reason: string): Promise<void> {
    const reviewFile = process.env.COMPLIANCE_LOG || "./logs/compliance-review-queue.jsonl";
    await Bun.write(
      reviewFile,
      JSON.stringify({
        userId,
        amount,
        reason,
        timestamp: new Date(),
        status: "PENDING_REVIEW",
      }) + '\n',
      { flag: 'a', createPath: true }
    );
    
    console.log(`🚨 Manual review triggered for user ${userId}: ${reason}`);
  }

  private async isSanctionedJurisdiction(userId: string): Promise<boolean> {
    try {
      // Check user IP, registered address, etc.
      const result = await db.query(
        "SELECT country, ip_address FROM users WHERE id = ?",
        [userId]
      );

      if (result.rows.length === 0) return false;

      const user = result.rows[0];
      const sanctionedCountries = ['IR', 'KP', 'SY', 'CU', 'VE', 'BY', 'MM'];
      
      if (user.country && sanctionedCountries.includes(user.country)) {
        return true;
      }

      // Check IP against OFAC list (mock implementation)
      if (user.ip_address) {
        // In production, query external OFAC API
        const ofacCheck = await this.checkOfacList(user.ip_address);
        return ofacCheck;
      }

      return false;
    } catch (error) {
      console.error("Error checking jurisdiction:", error);
      return false;
    }
  }

  private async checkOfacList(ip: string): Promise<boolean> {
    // Mock implementation - in production, integrate with real OFAC API
    // For now, return false (no sanctions)
    return false;
  }

  /**
   * Additional compliance methods for future expansion
   */
  async validateKYCDocument(userId: string, documentType: string, documentData: any): Promise<KYCValidationResult> {
    // Implement document validation logic
    // Check document authenticity, expiration, etc.
    return { allowed: true };
  }

  async checkPEPStatus(userId: string): Promise<boolean> {
    // Check if user is Politically Exposed Person
    // In production, integrate with PEP databases
    return false;
  }

  async validateSourceOfFunds(userId: string, amount: number): Promise<KYCValidationResult> {
    // Validate source of funds for large amounts
    if (amount > 5000) {
      return {
        allowed: false,
        message: "Source of funds verification required for amounts > $5,000",
        requiresReview: true,
      };
    }
    return { allowed: true };
  }
}