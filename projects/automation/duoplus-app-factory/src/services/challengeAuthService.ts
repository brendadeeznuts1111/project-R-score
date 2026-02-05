/**
 * Challenge-Based Authentication Service
 * 
 * Implements 2FA, biometric verification, and email challenges
 * for high-risk sessions
 */

export interface Challenge {
  id: string;
  sessionId: string;
  userId: string;
  type: '2fa' | 'biometric' | 'email' | 'security_question';
  createdAt: number;
  expiresAt: number;
  verified: boolean;
  verifiedAt?: number;
  attempts: number;
  maxAttempts: number;
  metadata?: Record<string, any>;
}

export interface ChallengeResponse {
  success: boolean;
  message: string;
  sessionId?: string;
  challenge?: Challenge;
}

export class ChallengeAuthService {
  private challenges = new Map<string, Challenge>();
  private readonly CHALLENGE_TIMEOUT = 10 * 60 * 1000;
  private readonly MAX_ATTEMPTS = 3;

  createChallenge(
    sessionId: string,
    userId: string,
    type: Challenge['type'] = '2fa',
    metadata?: Record<string, any>
  ): Challenge {
    const challengeId = `chal_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();

    const challenge: Challenge = {
      id: challengeId,
      sessionId,
      userId,
      type,
      createdAt: now,
      expiresAt: now + this.CHALLENGE_TIMEOUT,
      verified: false,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      metadata,
    };

    this.challenges.set(challengeId, challenge);
    console.log(`🔐 Challenge created: ${type} for user ${userId}`);

    return challenge;
  }

  verifyChallenge(
    challengeId: string,
    code: string,
    expectedCode?: string
  ): ChallengeResponse {
    const challenge = this.challenges.get(challengeId);

    if (!challenge) {
      return {
        success: false,
        message: 'Challenge not found',
      };
    }

    if (challenge.verified) {
      return {
        success: false,
        message: 'Challenge already verified',
      };
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return {
        success: false,
        message: 'Challenge expired',
      };
    }

    challenge.attempts++;

    if (challenge.attempts > challenge.maxAttempts) {
      this.challenges.delete(challengeId);
      return {
        success: false,
        message: 'Too many failed attempts',
      };
    }

    const isValid = expectedCode ? code === expectedCode : this.validateCode(code, challenge.type);

    if (!isValid) {
      return {
        success: false,
        message: `Invalid code. ${challenge.maxAttempts - challenge.attempts} attempts remaining`,
        challenge,
      };
    }

    challenge.verified = true;
    challenge.verifiedAt = Date.now();
    console.log(`✅ Challenge verified: ${challenge.type} for user ${challenge.userId}`);

    return {
      success: true,
      message: 'Challenge verified successfully',
      sessionId: challenge.sessionId,
      challenge,
    };
  }

  getChallenge(challengeId: string): Challenge | undefined {
    return this.challenges.get(challengeId);
  }

  getSessionChallenges(sessionId: string): Challenge[] {
    return Array.from(this.challenges.values())
      .filter(c => c.sessionId === sessionId && !c.verified && Date.now() < c.expiresAt);
  }

  getUserChallenges(userId: string): Challenge[] {
    return Array.from(this.challenges.values())
      .filter(c => c.userId === userId && !c.verified && Date.now() < c.expiresAt);
  }

  cancelChallenge(challengeId: string): boolean {
    return this.challenges.delete(challengeId);
  }

  cleanupExpiredChallenges(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired challenges`);
    }

    return cleaned;
  }

  private validateCode(code: string, type: Challenge['type']): boolean {
    if (type === '2fa') {
      return /^\d{6}$/.test(code);
    }
    if (type === 'email') {
      return code.length >= 32;
    }
    if (type === 'biometric') {
      return code === 'biometric_verified';
    }
    if (type === 'security_question') {
      return code.length >= 3;
    }

    return false;
  }

  generateMockCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const challengeAuthService = new ChallengeAuthService();

setInterval(() => {
  challengeAuthService.cleanupExpiredChallenges();
}, 5 * 60 * 1000);

