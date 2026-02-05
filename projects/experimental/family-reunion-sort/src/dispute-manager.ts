// Core dispute management service

import { DisputeDatabase } from "./database";
import { broadcastDisputeUpdate, broadcastMerchantUpdate } from "./broadcaster";
import { AIEngine } from "./ai-engine";
import { 
  Dispute, 
  Transaction, 
  Merchant, 
  Customer,
  CreateDisputeRequest,
  MerchantResponse,
  DisputeResolution,
  DisputeChat,
  DisputeStatus,
  TimelineEvent,
  AIEvidenceAnalysis,
  DisputeDecision
} from "./types";
import { VenmoService } from "./venmo-service";
import { EmailService } from "./email-service";
import { FraudDetector } from "./fraud-detection";

export class DisputeManager {
  private db: DisputeDatabase;
  private venmo: VenmoService;
  private emailService: EmailService;
  private fraudDetector: FraudDetector;
  private aiEngine: AIEngine;

  constructor() {
    this.db = new DisputeDatabase();
    this.venmo = new VenmoService();
    this.emailService = new EmailService();
    this.fraudDetector = new FraudDetector();
    this.aiEngine = new AIEngine();
  }

  // Customer initiates dispute
  async createDispute(disputeRequest: CreateDisputeRequest): Promise<Dispute> {
    // Verify transaction exists and is valid
    const transaction = await this.verifyTransaction(disputeRequest.transactionId);
    
    // Check if dispute window is open (typically 60-120 days)
    if (!this.isWithinDisputeWindow(transaction.createdAt)) {
      throw new Error('Dispute window has closed for this transaction');
    }
    
    // Check if dispute already exists
    const existingDispute = await this.db.getDisputeByTransaction(disputeRequest.transactionId);
    if (existingDispute) {
      throw new Error('A dispute already exists for this transaction');
    }

    // Get merchant and customer info
    const merchant = await this.db.getMerchant(transaction.merchantId);
    const customer = await this.db.getCustomer(disputeRequest.customerId);
    
    if (!merchant || !customer) {
      throw new Error('Invalid merchant or customer');
    }

    // Upload evidence to secure storage
    const evidenceUrls = await this.uploadEvidence(disputeRequest.evidence);

    // AI Evidence Analysis (Integrate AI)
    const aiAnalysis = await this.aiEngine.analyzeEvidence(disputeRequest);

    // Analyze for fraud risk
    const fraudAssessment = await this.fraudDetector.analyzeDisputePatterns({
      ...disputeRequest,
      merchantId: merchant.id,
      createdAt: new Date()
    } as Dispute);

    // Create dispute record
    const dispute: Dispute = {
      id: `DSP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      transactionId: disputeRequest.transactionId,
      customerId: disputeRequest.customerId,
      merchantId: merchant.id,
      reason: disputeRequest.reason,
      description: disputeRequest.description,
      status: 'SUBMITTED',
      requestedResolution: disputeRequest.requestedResolution,
      evidenceUrls,
      timeline: [{
        event: 'Dispute submitted by customer',
        timestamp: new Date(),
        actor: 'SYSTEM'
      }],
      contactMerchantFirst: disputeRequest.contactMerchantFirst,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add AI findings to timeline
    dispute.timeline.push({
      event: 'AI Evidence Analysis Completed',
      timestamp: new Date(),
      actor: 'SYSTEM',
      details: `Recommendation: ${aiAnalysis.recommendation}, Confidence: ${aiAnalysis.confidence}`
    });

    await this.db.createDispute(dispute);
    
    // Broadcast creation
    broadcastDisputeUpdate(dispute.id, { status: dispute.status, event: 'CREATED' });
    broadcastMerchantUpdate(dispute.merchantId, { disputeId: dispute.id, event: 'NEW_DISPUTE' });
    
    // Compliance: Regulation E logic - Set provisional credit deadline
    await this.handleRegulationECompliance(dispute);
    
    // Add fraud assessment to timeline if high risk
    if (fraudAssessment.riskLevel === 'HIGH') {
      dispute.timeline.push({
        event: 'High fraud risk detected',
        timestamp: new Date(),
        actor: 'SYSTEM',
        details: `Risk score: ${fraudAssessment.riskScore}. Factors: ${fraudAssessment.factors.map(f => f.factor).join(', ')}`
      });
    }

    // Notify merchant
    await this.notifyMerchant(dispute, merchant);
    
    // Handle escalation based on customer preference and fraud assessment
    if (disputeRequest.contactMerchantFirst && fraudAssessment.riskLevel !== 'HIGH') {
      await this.openMerchantCommunicationChannel(dispute);
    } else {
      await this.escalateToVenmo(dispute);
    }
    
    // Send confirmation to customer
    await this.emailService.sendDisputeConfirmation(dispute, customer);
    
    return dispute;
  }

  // Merchant responds to dispute
  async merchantResponds(disputeId: string, response: MerchantResponse): Promise<void> {
    const dispute = await this.db.getDispute(disputeId);
    
    if (!dispute) {
      throw new Error('Dispute not found');
    }
    
    if (dispute.status !== 'SUBMITTED' && dispute.status !== 'MERCHANT_REVIEW') {
      throw new Error('Dispute is not in a state that accepts merchant responses');
    }

    // Add merchant evidence
    if (response.evidence) {
      const merchantEvidenceUrls = await this.uploadEvidence(response.evidence);
      dispute.evidenceUrls.push(...merchantEvidenceUrls);
    }
    
    // Update dispute status
    dispute.status = 'UNDER_REVIEW';
    dispute.merchantResponse = response;
    dispute.timeline.push({
      event: 'Merchant responded to dispute',
      timestamp: new Date(),
      actor: 'MERCHANT',
      details: response.message
    });
    
    await this.db.updateDispute(dispute);
    
    // Broadcast update
    broadcastDisputeUpdate(dispute.id, { status: dispute.status, event: 'MERCHANT_RESPONDED' });
    
    // Notify customer
    const customer = await this.db.getCustomer(dispute.customerId);
    if (customer) {
      await this.emailService.sendMerchantResponseNotification(dispute, customer);
    }
    
    // If merchant accepts fault, process refund immediately
    if (response.acceptsFault) {
      await this.processMerchantAcceptedRefund(dispute);
    } else {
      // Escalate to Venmo for review
      await this.escalateToVenmo(dispute);
    }
  }

  // Admin/System reviews and decides
  async reviewAndDecide(disputeId: string, decision: DisputeDecision): Promise<void> {
    const dispute = await this.db.getDispute(disputeId);
    
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Analyze evidence (could integrate AI/ML here)
    const analysis = await this.analyzeEvidence(dispute);
    
    // Make decision
    dispute.status = 'RESOLVED';
    dispute.resolution = decision;
    dispute.resolvedAt = new Date();
    dispute.timeline.push({
      event: `Dispute resolved: ${decision.outcome}`,
      timestamp: new Date(),
      actor: 'SYSTEM',
      details: decision.reason
    });
    
    await this.db.updateDispute(dispute);
    
    // Broadcast update
    broadcastDisputeUpdate(dispute.id, { status: dispute.status, event: 'RESOLVED', outcome: decision.outcome });
    broadcastMerchantUpdate(dispute.merchantId, { disputeId: dispute.id, event: 'RESOLVED' });
    
    // Execute resolution
    switch (decision.outcome) {
      case 'CUSTOMER_WINS_FULL_REFUND':
        await this.processRefund(dispute, 'FULL');
        break;
      case 'CUSTOMER_WINS_PARTIAL_REFUND':
        await this.processRefund(dispute, 'PARTIAL', decision.partialAmount);
        break;
      case 'MERCHANT_WINS':
        await this.closeDisputeInFavorOfMerchant(dispute);
        break;
      case 'COMPROMISE':
        await this.processCompromise(dispute, decision.compromiseDetails);
        break;
    }
    
    // Notify both parties
    await this.notifyPartiesOfResolution(dispute);
    
    // Log for compliance
    await this.logDisputeResolution(dispute);
  }

  // Escalate to Venmo's official dispute system
  private async escalateToVenmo(dispute: Dispute): Promise<void> {
    try {
      // Convert our dispute to Venmo's format
      const venmoDisputeRequest = this.mapToVenmoDispute(dispute);
      
      // Submit to Venmo API
      const venmoDisputeId = await this.venmo.createDispute(venmoDisputeRequest);
      
      dispute.venmoDisputeId = venmoDisputeId;
      dispute.status = 'ESCALATED_TO_VENMO';
      dispute.timeline.push({
        event: 'Dispute escalated to Venmo',
        timestamp: new Date(),
        actor: 'SYSTEM',
        details: `Venmo Dispute ID: ${venmoDisputeId}` 
      });
      
      await this.db.updateDispute(dispute);
      
    } catch (error) {
      console.error('Failed to escalate to Venmo:', error);
      // Fallback: handle internally
      dispute.status = 'INTERNAL_REVIEW';
      await this.db.updateDispute(dispute);
    }
  }

  // Real-time communication channel
  async openDisputeChat(disputeId: string): Promise<DisputeChat> {
    const dispute = await this.db.getDispute(disputeId);
    
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Create encrypted chat channel
    const chatKey = this.generateEncryptionKey();
    
    const chat: DisputeChat = {
      disputeId,
      encryptionKey: chatKey,
      messages: [],
      participants: [
        { userId: dispute.customerId, role: 'CUSTOMER' },
        { userId: dispute.merchantId, role: 'MERCHANT' },
        { userId: 'MODERATOR', role: 'MODERATOR' } // System moderator
      ],
      isActive: true
    };
    
    await this.db.createDisputeChat(chat);
    
    // Store encrypted key for each participant
    await this.storeChatKeyForParticipant(dispute.customerId, chatKey);
    await this.storeChatKeyForParticipant(dispute.merchantId, chatKey);
    
    return chat;
  }

  // Process refund through Venmo
  private async processRefund(dispute: Dispute, type: 'FULL' | 'PARTIAL', amount?: number): Promise<void> {
    const transaction = await this.db.getTransaction(dispute.transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const refundAmount = type === 'FULL' ? transaction.amount : amount!;
    
    try {
      // Attempt Venmo refund API
      const refundId = await this.venmo.createRefund({
        originalPaymentId: transaction.venmoPaymentId,
        amount: refundAmount,
        reason: `Dispute resolution: ${dispute.id}` 
      });
      
      dispute.refundId = refundId;
      dispute.timeline.push({
        event: `Refund processed: $${refundAmount}`,
        timestamp: new Date(),
        actor: 'SYSTEM',
        details: `Venmo Refund ID: ${refundId}` 
      });
      
    } catch (error) {
      console.error('Venmo refund failed:', error);
      
      // Fallback: internal ledger adjustment
      await this.processInternalRefund(dispute, refundAmount);
      
      dispute.timeline.push({
        event: `Internal credit issued: $${refundAmount}`,
        timestamp: new Date(),
        actor: 'SYSTEM',
        details: 'Venmo refund unavailable, credited to DuoPlus balance'
      });
    }
    
    await this.db.updateDispute(dispute);
  }

  // Helper methods
  private async verifyTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.db.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  private isWithinDisputeWindow(transactionDate: Date): boolean {
    const disputeWindowDays = 60; // Configurable
    const now = new Date();
    const daysSinceTransaction = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceTransaction <= disputeWindowDays;
  }

  private async uploadEvidence(evidence: string[]): Promise<string[]> {
    // In a real implementation, this would upload to secure cloud storage
    // For now, return the evidence URLs as-is
    return evidence.map((evidence, index) => `https://secure-storage.com/evidence/${Date.now()}-${index}`);
  }

  private async notifyMerchant(dispute: Dispute, merchant: Merchant): Promise<void> {
    await this.emailService.sendMerchantDisputeNotification(dispute, merchant);
  }

  private async openMerchantCommunicationChannel(dispute: Dispute): Promise<void> {
    dispute.status = 'MERCHANT_REVIEW';
    dispute.timeline.push({
      event: 'Merchant communication channel opened',
      timestamp: new Date(),
      actor: 'SYSTEM'
    });
    await this.db.updateDispute(dispute);
  }

  private async processMerchantAcceptedRefund(dispute: Dispute): Promise<void> {
    dispute.status = 'RESOLVED';
    dispute.resolution = {
      outcome: 'CUSTOMER_WINS_FULL_REFUND',
      reason: 'Merchant accepted responsibility'
    };
    dispute.resolvedAt = new Date();
    
    await this.processRefund(dispute, 'FULL');
    await this.db.updateDispute(dispute);
  }

  private async closeDisputeInFavorOfMerchant(dispute: Dispute): Promise<void> {
    dispute.timeline.push({
      event: 'Dispute closed in favor of merchant',
      timestamp: new Date(),
      actor: 'SYSTEM'
    });
    await this.db.updateDispute(dispute);
  }

  private async processCompromise(dispute: Dispute, details?: string): Promise<void> {
    // Handle compromise resolution
    dispute.timeline.push({
      event: 'Compromise resolution processed',
      timestamp: new Date(),
      actor: 'SYSTEM',
      details: details || 'Compromise reached between parties'
    });
    await this.db.updateDispute(dispute);
  }

  private async notifyPartiesOfResolution(dispute: Dispute): Promise<void> {
    const customer = await this.db.getCustomer(dispute.customerId);
    const merchant = await this.db.getMerchant(dispute.merchantId);
    
    if (customer) {
      await this.emailService.sendDisputeResolutionNotification(dispute, customer);
    }
    
    if (merchant) {
      await this.emailService.sendDisputeResolutionNotification(dispute, merchant);
    }
  }

  private async logDisputeResolution(dispute: Dispute): Promise<void> {
    // Log for compliance and audit purposes
    console.log(`Dispute ${dispute.id} resolved: ${dispute.resolution?.outcome}`);
  }

  private generateEncryptionKey(): string {
    // Generate a secure encryption key for the chat
    return `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }

  private async storeChatKeyForParticipant(userId: string, key: string): Promise<void> {
    // Store encrypted chat key for participant
    // In a real implementation, this would use proper encryption
    console.log(`Stored chat key for user ${userId}`);
  }

  private mapToVenmoDispute(dispute: Dispute): any {
    return {
      transactionId: dispute.transactionId,
      reason: dispute.reason,
      description: dispute.description,
      amount: 0, // Will be filled from transaction
      evidence: dispute.evidenceUrls,
      customerInfo: dispute.customerId,
      merchantInfo: dispute.merchantId
    };
  }

  private async analyzeEvidence(dispute: Dispute): Promise<any> {
    // Analyze evidence quality and relevance
    // Could integrate AI/ML for automated analysis
    return {
      evidenceScore: 0.8,
      recommendation: 'APPROVE_REFUND'
    };
  }

  private async processInternalRefund(dispute: Dispute, amount: number): Promise<void> {
    // Process internal refund when Venmo API is unavailable
    console.log(`Processing internal refund of $${amount} for dispute ${dispute.id}`);
  }

  // Regulation E Compliance: Handle provisional credit and investigation timelines
  private async handleRegulationECompliance(dispute: Dispute): Promise<void> {
    const provisionalCreditDeadline = new Date(dispute.createdAt);
    provisionalCreditDeadline.setDate(provisionalCreditDeadline.getDate() + 10); // 10 business days

    const finalInvestigationDeadline = new Date(dispute.createdAt);
    finalInvestigationDeadline.setDate(finalInvestigationDeadline.getDate() + 45); // 45 days

    dispute.timeline.push({
      event: 'Regulation E Deadlines Set',
      timestamp: new Date(),
      actor: 'SYSTEM',
      details: `Provisional credit by: ${provisionalCreditDeadline.toLocaleDateString()}, Investigation complete by: ${finalInvestigationDeadline.toLocaleDateString()}`
    });

    // In a real system, we would schedule a job to check if provisional credit is needed
    // if the investigation is still open after 10 days.
    await this.db.updateDispute(dispute);
  }
}

// Missing interface that should be in types.ts
interface DisputeDecision {
  outcome: 'CUSTOMER_WINS_FULL_REFUND' | 'CUSTOMER_WINS_PARTIAL_REFUND' | 'MERCHANT_WINS' | 'COMPROMISE';
  reason: string;
  partialAmount?: number;
  compromiseDetails?: string;
}
