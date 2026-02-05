// Fraud detection system for dispute handling

import { DisputeDatabase } from "./database";
import { 
  Dispute, 
  Merchant, 
  Customer,
  FraudRiskAssessment,
  RiskFactor,
  Transaction
} from "./types";

export class FraudDetector {
  private db: DisputeDatabase;

  constructor() {
    this.db = new DisputeDatabase();
  }

  // Analyze dispute patterns for fraud risk
  async analyzeDisputePatterns(dispute: Dispute): Promise<FraudRiskAssessment> {
    const customer = await this.db.getCustomer(dispute.customerId);
    const merchant = await this.db.getMerchant(dispute.merchantId);
    
    if (!customer || !merchant) {
      throw new Error('Invalid customer or merchant');
    }

    const riskFactors = [];
    
    // 1. Customer dispute history analysis
    const customerRiskFactors = await this.analyzeCustomerDisputeHistory(customer);
    riskFactors.push(...customerRiskFactors);
    
    // 2. Merchant dispute rate analysis
    const merchantRiskFactors = await this.analyzeMerchantDisputeRate(merchant);
    riskFactors.push(...merchantRiskFactors);
    
    // 3. Transaction pattern analysis
    const transactionRiskFactors = await this.analyzeTransactionPattern(dispute.transactionId);
    riskFactors.push(...transactionRiskFactors);
    
    // 4. Evidence quality assessment
    const evidenceRiskFactors = await this.assessEvidenceQuality(dispute);
    riskFactors.push(...evidenceRiskFactors);
    
    // 5. Temporal pattern analysis
    const temporalRiskFactors = await this.analyzeTemporalPatterns(dispute);
    riskFactors.push(...temporalRiskFactors);
    
    // 6. Geographic analysis
    const geographicRiskFactors = await this.analyzeGeographicPatterns(dispute);
    riskFactors.push(...geographicRiskFactors);
    
    // Calculate total risk score
    const totalScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0);
    
    // Determine recommendation based on risk factors
    const recommendation = this.determineRecommendation(totalScore, riskFactors);
    
    return {
      riskScore: Math.min(totalScore, 1.0), // Cap at 1.0
      riskLevel: totalScore > 0.7 ? 'HIGH' : totalScore > 0.4 ? 'MEDIUM' : 'LOW',
      factors: riskFactors,
      recommendation
    };
  }

  // Detect potential friendly fraud
  async detectPotentialFriendlyFraud(dispute: Dispute): Promise<boolean> {
    const redFlags = [];
    
    // Check if customer received goods/services
    const deliveryConfirmation = await this.checkDeliveryConfirmation(dispute.transactionId);
    if (deliveryConfirmation.delivered) {
      redFlags.push('DELIVERY_CONFIRMED');
    }
    
    // Check if customer contacted merchant first
    if (!dispute.contactMerchantFirst) {
      redFlags.push('NO_MERCHANT_CONTACT_ATTEMPT');
    }
    
    // Check timing (dispute immediately after purchase)
    const transaction = await this.db.getTransaction(dispute.transactionId);
    if (transaction) {
      const hoursToDispute = (dispute.createdAt.getTime() - transaction.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursToDispute < 2) {
        redFlags.push('IMMEDIATE_DISPUTE');
      }
    }
    
    // Check for similar disputes from same customer
    const similarDisputes = await this.findSimilarDisputes(dispute.customerId, dispute.reason);
    if (similarDisputes.length > 1) {
      redFlags.push('REPEAT_DISPUTE_PATTERN');
    }
    
    // Check evidence quality
    const evidenceScore = this.scoreEvidence(dispute.evidenceUrls);
    if (evidenceScore < 0.3) {
      redFlags.push('POOR_EVIDENCE');
    }
    
    // Check customer's dispute win rate
    const customer = await this.db.getCustomer(dispute.customerId);
    if (customer && customer.disputeWinRate > 0.8 && customer.totalDisputes > 5) {
      redFlags.push('HIGH_WIN_RATE_PATTERN');
    }
    
    return redFlags.length >= 2;
  }

  // Analyze customer dispute history
  private async analyzeCustomerDisputeHistory(customer: Customer): Promise<RiskFactor[]> {
    const factors = [];
    
    const customerDisputes = await this.db.getCustomerDisputes(customer.id, 100); // Get last 100 disputes
    
    // High frequency of disputes
    const recentDisputes = customerDisputes.filter(d => {
      const daysSinceDispute = (Date.now() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDispute <= 90; // Last 90 days
    });
    
    if (recentDisputes.length > 5) {
      factors.push({
        factor: 'HIGH_CUSTOMER_DISPUTE_RATE',
        score: 0.3,
        details: `Customer has ${recentDisputes.length} disputes in last 90 days`
      });
    }
    
    // High win rate (potential friendly fraud)
    const wonDisputes = recentDisputes.filter(d => 
      d.resolution?.outcome?.includes('CUSTOMER_WINS')
    );
    
    if (recentDisputes.length > 3 && wonDisputes.length / recentDisputes.length > 0.8) {
      factors.push({
        factor: 'SUSPICIOUS_HIGH_WIN_RATE',
        score: 0.2,
        details: `Customer wins ${(wonDisputes.length / recentDisputes.length * 100).toFixed(1)}% of disputes`
      });
    }
    
    // Pattern of similar dispute reasons
    const reasonCounts = recentDisputes.reduce((acc, d) => {
      acc[d.reason] = (acc[d.reason] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const dominantReason = Object.entries(reasonCounts).find(([_, count]) => count > 2);
    if (dominantReason) {
      factors.push({
        factor: 'REPEAT_DISPUTE_REASON',
        score: 0.15,
        details: `Customer frequently disputes: ${dominantReason[0]} (${dominantReason[1]} times)`
      });
    }
    
    return factors;
  }

  // Analyze merchant dispute rate
  private async analyzeMerchantDisputeRate(merchant: Merchant): Promise<RiskFactor[]> {
    const factors = [];
    
    // High dispute rate for merchant
    if (merchant.disputeRate > 0.05) { // 5% of transactions disputed
      factors.push({
        factor: 'HIGH_MERCHANT_DISPUTE_RATE',
        score: 0.25,
        details: `${(merchant.disputeRate * 100).toFixed(1)}% of merchant transactions disputed`
      });
    }
    
    // Low merchant rating
    if (merchant.rating < 3.0) {
      factors.push({
        factor: 'LOW_MERCHANT_RATING',
        score: 0.2,
        details: `Merchant rating: ${merchant.rating}/5.0`
      });
    }
    
    // Unverified merchant
    if (!merchant.isVerified) {
      factors.push({
        factor: 'UNVERIFIED_MERCHANT',
        score: 0.15,
        details: 'Merchant is not verified by Venmo'
      });
    }
    
    return factors;
  }

  // Analyze transaction patterns
  private async analyzeTransactionPattern(transactionId: string): Promise<RiskFactor[]> {
    const factors = [];
    
    const transaction = await this.db.getTransaction(transactionId);
    if (!transaction) return factors;
    
    // Unusually high amount for merchant
    const merchantTransactions = await this.getMerchantRecentTransactions(transaction.merchantId);
    const avgAmount = merchantTransactions.reduce((sum, t) => sum + t.amount, 0) / merchantTransactions.length;
    
    if (transaction.amount > avgAmount * 3) {
      factors.push({
        factor: 'UNUSUAL_TRANSACTION_AMOUNT',
        score: 0.2,
        details: `Transaction amount $${transaction.amount} is 3x higher than merchant average of $${avgAmount.toFixed(2)}`
      });
    }
    
    // Transaction at unusual time
    const hour = transaction.createdAt.getHours();
    if (hour < 6 || hour > 23) {
      factors.push({
        factor: 'UNUSUAL_TRANSACTION_TIME',
        score: 0.1,
        details: `Transaction occurred at ${hour}:00 - unusual business hours`
      });
    }
    
    // Missing location data for in-person transaction
    if (!transaction.requiresDelivery && !transaction.location) {
      factors.push({
        factor: 'MISSING_LOCATION_DATA',
        score: 0.1,
        details: 'In-person transaction missing GPS verification'
      });
    }
    
    return factors;
  }

  // Assess evidence quality
  private async assessEvidenceQuality(dispute: Dispute): Promise<RiskFactor[]> {
    const factors = [];
    
    const evidenceScore = this.scoreEvidence(dispute.evidenceUrls);
    
    if (evidenceScore < 0.3) {
      factors.push({
        factor: 'INSUFFICIENT_EVIDENCE',
        score: 0.2,
        details: `Evidence quality score: ${(evidenceScore * 100).toFixed(1)}%`
      });
    }
    
    // No photo evidence for physical item dispute
    const physicalItemReasons = ['Item not received', 'Item damaged/defective', 'Wrong item received'];
    if (physicalItemReasons.includes(dispute.reason) && !this.hasPhotoEvidence(dispute.evidenceUrls)) {
      factors.push({
        factor: 'MISSING_PHOTO_EVIDENCE',
        score: 0.15,
        details: 'Physical item dispute lacks photo evidence'
      });
    }
    
    return factors;
  }

  // Analyze temporal patterns
  private async analyzeTemporalPatterns(dispute: Dispute): Promise<RiskFactor[]> {
    const factors = [];
    
    const transaction = await this.db.getTransaction(dispute.transactionId);
    if (!transaction) return factors;
    
    const hoursToDispute = (dispute.createdAt.getTime() - transaction.createdAt.getTime()) / (1000 * 60 * 60);
    
    // Immediate dispute (potential friendly fraud)
    if (hoursToDispute < 1) {
      factors.push({
        factor: 'IMMEDIATE_DISPUTE',
        score: 0.2,
        details: `Dispute filed ${hoursToDispute.toFixed(1)} hours after transaction`
      });
    }
    
    // Last minute dispute (near deadline)
    const daysToDispute = hoursToDispute / 24;
    if (daysToDispute > 55) { // Near 60-day limit
      factors.push({
        factor: 'LAST_MINUTE_DISPUTE',
        score: 0.1,
        details: `Dispute filed ${daysToDispute.toFixed(1)} days after transaction (near deadline)`
      });
    }
    
    return factors;
  }

  // Analyze geographic patterns
  private async analyzeGeographicPatterns(dispute: Dispute): Promise<RiskFactor[]> {
    const factors = [];
    
    const transaction = await this.db.getTransaction(dispute.transactionId);
    if (!transaction || !transaction.location) return factors;
    
    // Unusual location for customer
    const customerRecentTransactions = await this.getCustomerRecentTransactions(dispute.customerId);
    const customerLocations = customerRecentTransactions
      .filter(t => t.location)
      .map(t => t.location!);
    
    if (customerLocations.length > 0) {
      const avgLat = customerLocations.reduce((sum, loc) => sum + loc.latitude, 0) / customerLocations.length;
      const avgLng = customerLocations.reduce((sum, loc) => sum + loc.longitude, 0) / customerLocations.length;
      
      const distance = this.calculateDistance(
        avgLat, avgLng,
        transaction.location.latitude, transaction.location.longitude
      );
      
      if (distance > 100) { // 100 miles from usual location
        factors.push({
          factor: 'UNUSUAL_LOCATION',
          score: 0.15,
          details: `Transaction ${distance.toFixed(1)} miles from customer's usual location`
        });
      }
    }
    
    return factors;
  }

  // Helper methods
  private scoreEvidence(evidenceUrls: string[]): number {
    if (evidenceUrls.length === 0) return 0;
    
    let score = 0;
    
    // More evidence = higher score
    score += Math.min(evidenceUrls.length * 0.2, 0.4);
    
    // Photo evidence gets bonus
    const hasPhotos = evidenceUrls.some(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    if (hasPhotos) score += 0.3;
    
    // Document evidence gets bonus
    const hasDocuments = evidenceUrls.some(url => 
      url.match(/\.(pdf|doc|docx)$/i)
    );
    if (hasDocuments) score += 0.2;
    
    // Video evidence gets highest bonus
    const hasVideos = evidenceUrls.some(url => 
      url.match(/\.(mp4|mov|avi)$/i)
    );
    if (hasVideos) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  private hasPhotoEvidence(evidenceUrls: string[]): boolean {
    return evidenceUrls.some(url => url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  }

  private async checkDeliveryConfirmation(transactionId: string): Promise<{ delivered: boolean; details?: string }> {
    // In a real implementation, this would check delivery confirmation services
    // For now, return a mock response
    return { delivered: false };
  }

  private async findSimilarDisputes(customerId: string, reason: string): Promise<Dispute[]> {
    const customerDisputes = await this.db.getCustomerDisputes(customerId, 50);
    return customerDisputes.filter(d => d.reason === reason);
  }

  private async getMerchantRecentTransactions(merchantId: string): Promise<Transaction[]> {
    // In a real implementation, this would query recent transactions
    // For now, return empty array
    return [];
  }

  private async getCustomerRecentTransactions(customerId: string): Promise<Transaction[]> {
    // In a real implementation, this would query recent transactions
    // For now, return empty array
    return [];
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private determineRecommendation(riskScore: number, factors: RiskFactor[]): 'HANDLE_INTERNAL' | 'ESCALATE_TO_VENMO' | 'REJECT' {
    if (riskScore > 0.8) {
      return 'REJECT';
    } else if (riskScore > 0.6 || factors.some(f => f.factor.includes('FRAUD'))) {
      return 'ESCALATE_TO_VENMO';
    } else {
      return 'HANDLE_INTERNAL';
    }
  }

  // Advanced fraud detection using ML patterns
  async detectAdvancedFraudPatterns(dispute: Dispute): Promise<{
    isSuspicious: boolean;
    confidence: number;
    patterns: string[];
  }> {
    const patterns = [];
    let confidence = 0;
    
    // Pattern 1: Circular transactions
    if (await this.detectCircularTransaction(dispute)) {
      patterns.push('CIRCULAR_TRANSACTION');
      confidence += 0.3;
    }
    
    // Pattern 2: Coordinated disputes
    if (await this.detectCoordinatedDisputes(dispute)) {
      patterns.push('COORDINATED_DISPUTES');
      confidence += 0.4;
    }
    
    // Pattern 3: Account takeover indicators
    if (await this.detectAccountTakeover(dispute)) {
      patterns.push('ACCOUNT_TAKEOVER');
      confidence += 0.5;
    }
    
    // Pattern 4: Synthetic identity
    if (await this.detectSyntheticIdentity(dispute)) {
      patterns.push('SYNTHETIC_IDENTITY');
      confidence += 0.3;
    }
    
    return {
      isSuspicious: confidence > 0.5,
      confidence: Math.min(confidence, 1.0),
      patterns
    };
  }

  private async detectCircularTransaction(dispute: Dispute): Promise<boolean> {
    // Check if money flows back to original payer
    const transaction = await this.db.getTransaction(dispute.transactionId);
    if (!transaction) return false;
    
    // Look for transactions from merchant back to customer within 30 days
    const recentTransactions = await this.getMerchantRecentTransactions(transaction.merchantId);
    const returnTransactions = recentTransactions.filter(t => 
      t.customerId === transaction.customerId &&
      t.createdAt > transaction.createdAt &&
      (t.createdAt.getTime() - transaction.createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 30
    );
    
    return returnTransactions.length > 0;
  }

  private async detectCoordinatedDisputes(dispute: Dispute): Promise<boolean> {
    // Check if multiple customers are disputing the same merchant around the same time
    const merchantDisputes = await this.getMerchantRecentDisputes(dispute.merchantId);
    const recentDisputes = merchantDisputes.filter(d => {
      const daysDiff = Math.abs((d.createdAt.getTime() - dispute.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7; // Within 7 days
    });
    
    return recentDisputes.length >= 3;
  }

  private async detectAccountTakeover(dispute: Dispute): Promise<boolean> {
    // Check for signs of account takeover
    const customer = await this.db.getCustomer(dispute.customerId);
    if (!customer) return false;
    
    // Look for recent changes in account behavior
    const recentDisputes = await this.db.getCustomerDisputes(customer.id, 10);
    const accountAge = (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // New account with immediate disputes
    if (accountAge < 30 && recentDisputes.length > 0) {
      return true;
    }
    
    return false;
  }

  private async detectSyntheticIdentity(dispute: Dispute): Promise<boolean> {
    // Check for signs of synthetic identity
    const customer = await this.db.getCustomer(dispute.customerId);
    if (!customer) return false;
    
    // Look for patterns typical of synthetic identities
    const hasRandomUsername = customer.username.match(/^[a-z]+\d{4,}$/i);
    const hasGenericEmail = customer.email.match(/^(user|test|dummy)\d*@/i);
    
    return hasRandomUsername && hasGenericEmail;
  }

  private async getMerchantRecentDisputes(merchantId: string): Promise<Dispute[]> {
    // In a real implementation, this would query recent disputes for merchant
    // For now, return empty array
    return [];
  }
}
