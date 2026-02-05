// src/core/dispute-resolution-protocol.ts
/**
 * 🏛️ Dispute Resolution Protocol - Domain Protocol Implementation
 * 
 * [DOMAIN: financial-tech][SCOPE: dispute-resolution]
 * [TYPE: protocol-engine][META: {REAL-TIME, AI, SECURE}]
 */

import { safeFilename, encodeContentDisposition } from "../native/safeFilename.bun.ts";

// ============================================================================
// PROTOCOL DEFINITIONS
// ============================================================================

export type DisputeState = 
  | "SUBMITTED"
  | "EVIDENCE_REVIEW"
  | "MERCHANT_RESPONSE"
  | "AUTO_DECISION"
  | "AI_ANALYSIS"
  | "MANUAL_REVIEW"
  | "FRAUD_CHECK"
  | "RECOMMENDATION"
  | "HUMAN_REVIEW"
  | "FRAUD_ALERT"
  | "RESOLVED"
  | "ESCALATED";

export interface Dispute {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: string;
  description: string;
  status: DisputeState;
  evidence: Evidence[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

export interface Evidence {
  id: string;
  disputeId: string;
  type: "receipt" | "photo" | "document" | "video" | "audio" | "text";
  filename: string;
  filePath: string;
  mimeType: string;
  size: number;
  hash: string;
  uploadedAt: Date;
  metadata?: any;
  analysis?: EvidenceAnalysis;
}

export interface EvidenceAnalysis {
  tamperingScore: number;
  authenticityScore: number;
  confidence: number;
  recommendations: string[];
  analyzedAt: Date;
  metadata?: any;
}

export interface StateTransition {
  to: DisputeState;
  condition: string;
  action: (dispute: Dispute, context: ProtocolContext) => Promise<TransitionResult>;
  priority?: number;
  timeout?: number;
}

export interface TransitionResult {
  success: boolean;
  message?: string;
  metadata?: any;
  nextActions?: string[];
}

export interface TransitionLog {
  from: DisputeState;
  to: DisputeState;
  timestamp: Date;
  condition: string;
  metadata?: any;
  executionTime?: number;
}

export interface ProtocolContext {
  systemContext: any;
  aiEngine: any;
  securityEngine: any;
  realtimeEngine: any;
  config: ProtocolConfig;
}

export interface ProtocolConfig {
  autoAssignEnabled: boolean;
  aiAnalysisEnabled: boolean;
  fraudDetectionEnabled: boolean;
  merchantNotificationTimeout: number;
  evidenceReviewTimeout: number;
  aiAnalysisTimeout: number;
  escalationThresholds: {
    amount: number;
    complexity: number;
    riskScore: number;
  };
}

export interface ProtocolResult {
  success: boolean;
  finalState: DisputeState;
  transitions: TransitionLog[];
  executionTime: number;
  traceId: string;
  protocolVersion: string;
  recommendations?: string[];
  metadata?: any;
}

// ============================================================================
// DISPUTE RESOLUTION PROTOCOL IMPLEMENTATION
// ============================================================================

export class DisputeResolutionProtocol implements IDomainProtocol {
  readonly protocolVersion = "2.0.0";
  readonly supportedFormats = ["JSON-LD", "Protocol-Buffers", "MessagePack"];
  
  // Protocol state machine
  private stateMachine: Map<DisputeState, StateTransition[]> = new Map([
    ["SUBMITTED", [
      { 
        to: "EVIDENCE_REVIEW", 
        condition: "auto_assign", 
        action: this.assignToReviewer.bind(this),
        priority: 1,
        timeout: 5000
      },
      { 
        to: "MERCHANT_RESPONSE", 
        condition: "merchant_notified", 
        action: this.notifyMerchant.bind(this),
        priority: 2,
        timeout: 30000
      },
      { 
        to: "AUTO_DECISION", 
        condition: "simple_case", 
        action: this.autoDecideSimpleCase.bind(this),
        priority: 0,
        timeout: 1000
      }
    ]],
    ["EVIDENCE_REVIEW", [
      { 
        to: "AI_ANALYSIS", 
        condition: "evidence_complete", 
        action: this.triggerAIAnalysis.bind(this),
        priority: 1,
        timeout: 10000
      },
      { 
        to: "MANUAL_REVIEW", 
        condition: "complex_case", 
        action: this.escalateToHuman.bind(this),
        priority: 2,
        timeout: 15000
      },
      { 
        to: "FRAUD_CHECK", 
        condition: "suspicious", 
        action: this.runFraudCheck.bind(this),
        priority: 0,
        timeout: 5000
      }
    ]],
    ["AI_ANALYSIS", [
      { 
        to: "RECOMMENDATION", 
        condition: "analysis_complete", 
        action: this.generateRecommendation.bind(this),
        priority: 1,
        timeout: 30000
      },
      { 
        to: "HUMAN_REVIEW", 
        condition: "low_confidence", 
        action: this.escalateForReview.bind(this),
        priority: 2,
        timeout: 5000
      },
      { 
        to: "FRAUD_ALERT", 
        condition: "fraud_detected", 
        action: this.triggerFraudAlert.bind(this),
        priority: 0,
        timeout: 1000
      }
    ]],
    ["MERCHANT_RESPONSE", [
      { 
        to: "EVIDENCE_REVIEW", 
        condition: "merchant_responded", 
        action: this.reviewMerchantResponse.bind(this),
        priority: 1,
        timeout: 10000
      },
      { 
        to: "AUTO_DECISION", 
        condition: "sufficient_evidence", 
        action: this.makeAutoDecision.bind(this),
        priority: 0,
        timeout: 5000
      }
    ]],
    ["RECOMMENDATION", [
      { 
        to: "RESOLVED", 
        condition: "accept_recommendation", 
        action: this.resolveWithRecommendation.bind(this),
        priority: 1,
        timeout: 5000
      },
      { 
        to: "HUMAN_REVIEW", 
        condition: "reject_recommendation", 
        action: this.escalateToHuman.bind(this),
        priority: 2,
        timeout: 5000
      }
    ]],
    ["MANUAL_REVIEW", [
      { 
        to: "RESOLVED", 
        condition: "review_complete", 
        action: this.resolveFromReview.bind(this),
        priority: 1,
        timeout: 86400000 // 24 hours
      },
      { 
        to: "ESCALATED", 
        condition: "escalation_required", 
        action: this.escalateDispute.bind(this),
        priority: 0,
        timeout: 43200000 // 12 hours
      }
    ]]
  ]);

  // ============================================================================
  // PROTOCOL EXECUTION ENGINE
  // ============================================================================

  async executeProtocol(dispute: Dispute, context: ProtocolContext): Promise<ProtocolResult> {
    const startTime = performance.now();
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 Executing protocol for dispute ${dispute.id} [${traceId}]`);
    
    // Protocol execution with Bun-native performance monitoring
    const transitions: TransitionLog[] = [];
    let currentState = dispute.status;
    let iterationCount = 0;
    const maxIterations = 20; // Prevent infinite loops
    
    while (currentState !== "RESOLVED" && currentState !== "ESCALATED" && iterationCount < maxIterations) {
      const availableTransitions = this.stateMachine.get(currentState) || [];
      
      if (availableTransitions.length === 0) {
        console.warn(`⚠️ No transitions available for state: ${currentState}`);
        break;
      }
      
      // Select transition based on conditions and priorities
      const selectedTransition = await this.selectTransition(
        availableTransitions, 
        dispute, 
        context
      );
      
      if (!selectedTransition) {
        console.warn(`⚠️ No valid transition from state: ${currentState}`);
        break;
      }
      
      // Execute transition action
      const transitionStart = performance.now();
      const result = await this.executeTransitionWithTimeout(
        selectedTransition, 
        dispute, 
        context
      );
      const transitionTime = performance.now() - transitionStart;
      
      // Log transition
      const transitionLog: TransitionLog = {
        from: currentState,
        to: selectedTransition.to,
        timestamp: new Date(),
        condition: selectedTransition.condition,
        metadata: result.metadata,
        executionTime: transitionTime
      };
      
      transitions.push(transitionLog);
      
      // Update dispute state
      currentState = selectedTransition.to;
      dispute.status = currentState;
      dispute.updatedAt = new Date();
      
      console.log(`✅ Transition: ${transitionLog.from} → ${transitionLog.to} (${transitionTime.toFixed(2)}ms)`);
      
      // Bun-native yield for non-blocking execution
      await Bun.sleep(0); // Yield to event loop
      
      iterationCount++;
    }
    
    const executionTime = performance.now() - startTime;
    
    const result: ProtocolResult = {
      success: currentState === "RESOLVED",
      finalState: currentState,
      transitions,
      executionTime,
      traceId,
      protocolVersion: this.protocolVersion
    };
    
    console.log(`🏁 Protocol execution complete: ${result.success ? 'SUCCESS' : 'PARTIAL'} [${executionTime.toFixed(2)}ms]`);
    
    return result;
  }

  private async selectTransition(
    transitions: StateTransition[], 
    dispute: Dispute, 
    context: ProtocolContext
  ): Promise<StateTransition | null> {
    // Sort by priority (lower number = higher priority)
    const sortedTransitions = transitions.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    for (const transition of sortedTransitions) {
      if (await this.evaluateCondition(transition.condition, dispute, context)) {
        return transition;
      }
    }
    
    return null;
  }

  private async evaluateCondition(
    condition: string, 
    dispute: Dispute, 
    context: ProtocolContext
  ): Promise<boolean> {
    switch (condition) {
      case "auto_assign":
        return context.config.autoAssignEnabled;
      
      case "merchant_notified":
        return dispute.metadata?.merchantNotified === true;
      
      case "simple_case":
        return dispute.amount < context.config.escalationThresholds.amount && 
               dispute.evidence.length <= 2;
      
      case "evidence_complete":
        return dispute.evidence.length >= 2 && 
               dispute.evidence.every(e => e.analysis);
      
      case "complex_case":
        return dispute.amount >= context.config.escalationThresholds.amount ||
               dispute.evidence.length > 5;
      
      case "suspicious":
        return dispute.evidence.some(e => e.analysis?.tamperingScore > 0.7);
      
      case "analysis_complete":
        return dispute.evidence.every(e => e.analysis);
      
      case "low_confidence":
        const avgConfidence = dispute.evidence.reduce((sum, e) => 
          sum + (e.analysis?.confidence || 0), 0) / dispute.evidence.length;
        return avgConfidence < 0.7;
      
      case "fraud_detected":
        return dispute.evidence.some(e => e.analysis?.tamperingScore > 0.8);
      
      case "merchant_responded":
        return dispute.metadata?.merchantResponse === true;
      
      case "sufficient_evidence":
        return dispute.evidence.length >= 3 && 
               dispute.evidence.some(e => e.type === "receipt");
      
      case "accept_recommendation":
        return dispute.metadata?.recommendationAccepted === true;
      
      case "reject_recommendation":
        return dispute.metadata?.recommendationRejected === true;
      
      case "review_complete":
        return dispute.metadata?.reviewComplete === true;
      
      case "escalation_required":
        return dispute.amount >= context.config.escalationThresholds.amount * 2 ||
               dispute.metadata?.riskScore > 0.8;
      
      default:
        console.warn(`Unknown condition: ${condition}`);
        return false;
    }
  }

  private async executeTransitionWithTimeout(
    transition: StateTransition,
    dispute: Dispute,
    context: ProtocolContext
  ): Promise<TransitionResult> {
    const timeout = transition.timeout || 30000;
    
    return Promise.race([
      transition.action(dispute, context),
      new Promise<TransitionResult>((_, reject) => 
        setTimeout(() => reject(new Error(`Transition timeout: ${transition.condition}`)), timeout)
      )
    ]);
  }

  // ============================================================================
  // TRANSITION ACTIONS
  // ============================================================================

  private async assignToReviewer(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`👤 Assigning reviewer to dispute ${dispute.id}`);
    
    // Auto-assign to available reviewer
    const reviewerId = `reviewer-${Math.floor(Math.random() * 10) + 1}`;
    dispute.metadata = { ...dispute.metadata, assignedReviewer: reviewerId };
    
    // Send real-time notification
    if (context.realtimeEngine) {
      // Use the dashboard's sendUpdate method instead
      if (context.systemContext.subsystems.dashboard) {
        await context.systemContext.subsystems.dashboard.sendUpdate(reviewerId, {
          type: "new_dispute",
          disputeId: dispute.id,
          amount: dispute.amount,
          priority: dispute.amount > 1000 ? "high" : "normal"
        });
      }
    }
    
    return {
      success: true,
      message: `Assigned to reviewer ${reviewerId}`,
      metadata: { reviewerId, assignedAt: new Date() }
    };
  }

  private async notifyMerchant(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`📧 Notifying merchant for dispute ${dispute.id}`);
    
    // Send merchant notification
    dispute.metadata = { ...dispute.metadata, merchantNotified: true, notifiedAt: new Date() };
    
    // Store secure filename for evidence upload
    const evidenceFilename = safeFilename(`evidence-${dispute.id}-merchant.zip`);
    dispute.metadata.evidenceUploadPath = `uploads/${evidenceFilename}`;
    
    return {
      success: true,
      message: "Merchant notified successfully",
      metadata: { 
        notifiedAt: new Date(),
        evidenceUploadPath: dispute.metadata.evidenceUploadPath
      }
    };
  }

  private async autoDecideSimpleCase(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`⚡ Auto-deciding simple case ${dispute.id}`);
    
    // Simple decision logic
    const hasReceipt = dispute.evidence.some(e => e.type === "receipt");
    const decision = hasReceipt ? "approve" : "request_more_info";
    
    dispute.metadata = { 
      ...dispute.metadata, 
      autoDecision: decision,
      decisionAt: new Date()
    };
    
    return {
      success: true,
      message: `Auto decision: ${decision}`,
      metadata: { decision, decisionAt: new Date() }
    };
  }

  private async triggerAIAnalysis(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`🤖 Triggering AI analysis for dispute ${dispute.id}`);
    
    if (!context.config.aiAnalysisEnabled) {
      return {
        success: false,
        message: "AI analysis disabled"
      };
    }
    
    // Analyze evidence with AI
    const analysisPromises = dispute.evidence.map(async (evidence) => {
      if (!evidence.analysis) {
        evidence.analysis = await context.aiEngine.analyzeEvidence(evidence);
      }
      return evidence.analysis;
    });
    
    const results = await Promise.allSettled(analysisPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    dispute.metadata = { 
      ...dispute.metadata, 
      aiAnalysisComplete: successful === dispute.evidence.length,
      analyzedAt: new Date()
    };
    
    return {
      success: successful === dispute.evidence.length,
      message: `AI analysis complete: ${successful}/${dispute.evidence.length} evidence`,
      metadata: { analyzedCount: successful, totalCount: dispute.evidence.length }
    };
  }

  private async escalateToHuman(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`🧑‍💼 Escalating dispute ${dispute.id} to human review`);
    
    const escalationReason = this.getEscalationReason(dispute);
    dispute.metadata = { 
      ...dispute.metadata, 
      escalated: true,
      escalationReason,
      escalatedAt: new Date()
    };
    
    return {
      success: true,
      message: `Escalated to human review: ${escalationReason}`,
      metadata: { escalationReason, escalatedAt: new Date() }
    };
  }

  private async runFraudCheck(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`🔍 Running fraud check for dispute ${dispute.id}`);
    
    if (!context.config.fraudDetectionEnabled) {
      return {
        success: false,
        message: "Fraud detection disabled"
      };
    }
    
    // Run fraud detection
    const fraudScore = await this.calculateFraudScore(dispute, context);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      fraudScore,
      fraudCheckedAt: new Date()
    };
    
    return {
      success: true,
      message: `Fraud check complete: score ${fraudScore.toFixed(3)}`,
      metadata: { fraudScore }
    };
  }

  private async generateRecommendation(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`📋 Generating recommendation for dispute ${dispute.id}`);
    
    const recommendation = await this.generateAIRecommendation(dispute, context);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      recommendation,
      recommendationGeneratedAt: new Date()
    };
    
    return {
      success: true,
      message: `Recommendation generated: ${recommendation.action}`,
      metadata: { recommendation }
    };
  }

  private async escalateForReview(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`🔍 Escalating dispute ${dispute.id} for review`);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      escalatedForReview: true,
      reviewReason: "Low AI confidence",
      escalatedAt: new Date()
    };
    
    return {
      success: true,
      message: "Escalated for human review due to low AI confidence",
      metadata: { reviewReason: "Low AI confidence" }
    };
  }

  private async triggerFraudAlert(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`🚨 TRIGGERING FRAUD ALERT for dispute ${dispute.id}`);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      fraudAlert: true,
      fraudAlertAt: new Date()
    };
    
    // Send immediate notification to security team
    if (context.realtimeEngine && context.systemContext.subsystems.dashboard) {
      await context.systemContext.subsystems.dashboard.sendUpdate("security-team", {
        type: "fraud_alert",
        disputeId: dispute.id,
        merchantId: dispute.merchantId,
        amount: dispute.amount,
        riskScore: dispute.metadata.fraudScore
      });
    }
    
    return {
      success: true,
      message: "Fraud alert triggered and security team notified",
      metadata: { fraudAlert: true, alertedAt: new Date() }
    };
  }

  private async reviewMerchantResponse(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`📝 Reviewing merchant response for dispute ${dispute.id}`);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      merchantResponseReviewed: true,
      reviewedAt: new Date()
    };
    
    return {
      success: true,
      message: "Merchant response reviewed",
      metadata: { reviewedAt: new Date() }
    };
  }

  private async makeAutoDecision(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`⚖️ Making auto decision for dispute ${dispute.id}`);
    
    const decision = this.makeDecisionBasedOnEvidence(dispute);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      autoDecision: decision,
      decisionAt: new Date()
    };
    
    return {
      success: true,
      message: `Auto decision made: ${decision}`,
      metadata: { decision, decisionAt: new Date() }
    };
  }

  private async resolveWithRecommendation(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`✅ Resolving dispute ${dispute.id} with recommendation`);
    
    const recommendation = dispute.metadata?.recommendation;
    
    dispute.metadata = { 
      ...dispute.metadata, 
      resolved: true,
      resolution: recommendation.action,
      resolvedAt: new Date()
    };
    
    return {
      success: true,
      message: `Resolved with recommendation: ${recommendation.action}`,
      metadata: { resolution: recommendation.action, resolvedAt: new Date() }
    };
  }

  private async resolveFromReview(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`✅ Resolving dispute ${dispute.id} from review`);
    
    const resolution = dispute.metadata?.reviewResolution || "manual_review";
    
    dispute.metadata = { 
      ...dispute.metadata, 
      resolved: true,
      resolution,
      resolvedAt: new Date()
    };
    
    return {
      success: true,
      message: `Resolved from review: ${resolution}`,
      metadata: { resolution, resolvedAt: new Date() }
    };
  }

  private async escalateDispute(dispute: Dispute, context: ProtocolContext): Promise<TransitionResult> {
    console.log(`🔥 Escalating dispute ${dispute.id} to higher authority`);
    
    dispute.metadata = { 
      ...dispute.metadata, 
      escalated: true,
      escalationLevel: "senior_review",
      escalatedAt: new Date()
    };
    
    return {
      success: true,
      message: "Dispute escalated to senior review",
      metadata: { escalationLevel: "senior_review", escalatedAt: new Date() }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getEscalationReason(dispute: Dispute): string {
    if (dispute.amount > 10000) return "High amount";
    if (dispute.evidence.length > 10) return "Complex evidence";
    if (dispute.metadata?.fraudScore > 0.7) return "High fraud risk";
    return "Standard escalation";
  }

  private async calculateFraudScore(dispute: Dispute, context: ProtocolContext): Promise<number> {
    // Simple fraud scoring algorithm
    let score = 0;
    
    // Amount-based scoring
    if (dispute.amount > 5000) score += 0.2;
    if (dispute.amount > 10000) score += 0.3;
    
    // Evidence-based scoring
    const suspiciousEvidence = dispute.evidence.filter(e => 
      e.analysis?.tamperingScore > 0.5
    ).length;
    score += (suspiciousEvidence / dispute.evidence.length) * 0.3;
    
    // Time-based scoring
    const hoursSinceCreation = (Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 1) score += 0.1; // Very quick disputes can be suspicious
    
    return Math.min(score, 1.0);
  }

  private async generateAIRecommendation(dispute: Dispute, context: ProtocolContext): Promise<any> {
    const avgAuthenticity = dispute.evidence.reduce((sum, e) => 
      sum + (e.analysis?.authenticityScore || 0), 0) / dispute.evidence.length;
    
    const avgTampering = dispute.evidence.reduce((sum, e) => 
      sum + (e.analysis?.tamperingScore || 0), 0) / dispute.evidence.length;
    
    if (avgAuthenticity > 0.8 && avgTampering < 0.2) {
      return { action: "approve", confidence: 0.9, reasoning: "High authenticity evidence" };
    } else if (avgTampering > 0.6) {
      return { action: "deny", confidence: 0.85, reasoning: "High tampering risk" };
    } else {
      return { action: "review", confidence: 0.7, reasoning: "Mixed evidence quality" };
    }
  }

  private makeDecisionBasedOnEvidence(dispute: Dispute): string {
    const hasReceipt = dispute.evidence.some(e => e.type === "receipt");
    const hasPhoto = dispute.evidence.some(e => e.type === "photo");
    const avgAuthenticity = dispute.evidence.reduce((sum, e) => 
      sum + (e.analysis?.authenticityScore || 0), 0) / dispute.evidence.length;
    
    if (hasReceipt && avgAuthenticity > 0.8) return "approve";
    if (hasPhoto && hasReceipt && avgAuthenticity > 0.6) return "approve";
    return "review";
  }
}

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

export interface IDomainProtocol {
  readonly protocolVersion: string;
  readonly supportedFormats: string[];
  executeProtocol(dispute: Dispute, context: ProtocolContext): Promise<ProtocolResult>;
}
