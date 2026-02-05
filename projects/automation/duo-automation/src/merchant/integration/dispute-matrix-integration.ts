// Integration layer connecting Dispute Resolution Matrix with Merchant Dashboard & AI System

import { DisputeMatrix, DisputeMatrixRow, DisputeAction } from '../../packages/disputes/resolution-matrix/dispute-matrix';
import { DisputeSystem } from '../../packages/disputes/resolution-matrix/dispute-system';
import { MerchantDashboardManager } from '../dashboard/dashboard-manager';
import { AIEvidenceAnalyzer } from '../ai/evidence-analyzer';
import { NotificationService } from '../services/notification-service';

// Enhanced interfaces that combine both systems
export interface EnhancedDisputeMatrixRow extends DisputeMatrixRow {
  aiAnalysis?: {
    riskScore: number;
    confidence: number;
    recommendations: string[];
    estimatedResolutionTime: number;
  };
  merchantMetrics?: {
    averageResponseTime: number;
    winRate: number;
    similarCases: number;
  };
  automationSuggestions: string[];
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DisputeWorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  assignedTo: 'customer' | 'merchant' | 'system' | 'investigator' | 'venmo';
  dueDate?: Date;
  completedAt?: Date;
  actions: DisputeAction[];
  aiAssistance?: {
    suggestions: string[];
    autoActions: string[];
    confidence: number;
  };
}

export interface DisputeResolutionPlan {
  disputeId: string;
  currentStatus: string;
  targetResolution: string;
  estimatedCompletion: Date;
  steps: DisputeWorkflowStep[];
  riskAssessment: {
    overall: number;
    factors: string[];
    mitigation: string[];
  };
  requiredActions: {
    customer: string[];
    merchant: string[];
    system: string[];
  };
  aiRecommendations: string[];
}

export class DisputeMatrixIntegration {
  private dashboardManager: MerchantDashboardManager;
  private aiAnalyzer: AIEvidenceAnalyzer;
  private notificationService: NotificationService;
  private disputeSystem: DisputeSystem;
  
  constructor() {
    this.dashboardManager = new MerchantDashboardManager();
    this.aiAnalyzer = new AIEvidenceAnalyzer();
    this.notificationService = new NotificationService();
    this.disputeSystem = new DisputeSystem();
  }
  
  /**
   * Get enhanced dispute matrix with AI insights and merchant metrics
   */
  async getEnhancedDisputeMatrix(disputeId: string): Promise<EnhancedDisputeMatrixRow[]> {
    const baseMatrix = DisputeMatrix.getMatrixData(disputeId);
    
    // Get dispute details for AI analysis
    const dispute = await this.dashboardManager.getDisputeDetail(disputeId);
    
    // Perform AI analysis if not already done
    let aiAnalysis;
    try {
      aiAnalysis = await this.aiAnalyzer.analyzeDispute(dispute);
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error);
      aiAnalysis = this.createFallbackAIAnalysis(dispute);
    }
    
    // Get merchant metrics
    const merchantMetrics = await this.getMerchantMetrics(dispute.merchantId);
    
    // Enhance each matrix row with AI and merchant data
    const enhancedMatrix = baseMatrix.map(row => {
      const enhanced: EnhancedDisputeMatrixRow = {
        ...row,
        aiAnalysis: {
          riskScore: aiAnalysis.riskScore,
          confidence: aiAnalysis.confidence,
          recommendations: aiAnalysis.recommendations.map(r => r.title),
          estimatedResolutionTime: this.calculateEstimatedResolutionTime(row, aiAnalysis)
        },
        merchantMetrics,
        automationSuggestions: this.generateAutomationSuggestions(row, aiAnalysis),
        priorityLevel: this.calculatePriorityLevel(row, aiAnalysis, merchantMetrics)
      };
      
      return enhanced;
    });
    
    return enhancedMatrix;
  }
  
  /**
   * Generate comprehensive dispute resolution plan
   */
  async generateResolutionPlan(disputeId: string): Promise<DisputeResolutionPlan> {
    const dispute = await this.dashboardManager.getDisputeDetail(disputeId);
    const enhancedMatrix = await this.getEnhancedDisputeMatrix(disputeId);
    const currentRow = enhancedMatrix.find(row => row.status === dispute.status);
    
    if (!currentRow) {
      throw new Error(`Current status ${dispute.status} not found in matrix`);
    }
    
    // Generate workflow steps
    const steps = await this.generateWorkflowSteps(dispute, enhancedMatrix);
    
    // Calculate risk assessment
    const riskAssessment = await this.performRiskAssessment(dispute, enhancedMatrix);
    
    // Determine target resolution based on AI analysis
    const targetResolution = this.determineTargetResolution(dispute, currentRow);
    
    // Estimate completion time
    const estimatedCompletion = this.calculateEstimatedCompletion(steps, currentRow);
    
    return {
      disputeId,
      currentStatus: dispute.status,
      targetResolution,
      estimatedCompletion,
      steps,
      riskAssessment,
      requiredActions: this.extractRequiredActions(steps),
      aiRecommendations: currentRow.aiAnalysis?.recommendations || []
    };
  }
  
  /**
   * Execute automated actions based on AI recommendations
   */
  async executeAutomatedActions(disputeId: string): Promise<{
    executed: string[];
    failed: string[];
    skipped: string[];
  }> {
    const dispute = await this.dashboardManager.getDisputeDetail(disputeId);
    const enhancedMatrix = await this.getEnhancedDisputeMatrix(disputeId);
    const currentRow = enhancedMatrix.find(row => row.status === dispute.status);
    
    const executed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];
    
    if (!currentRow || !currentRow.aiAnalysis) {
      return { executed, failed, skipped };
    }
    
    // Get automation suggestions
    const suggestions = currentRow.automationSuggestions;
    
    for (const suggestion of suggestions) {
      try {
        switch (suggestion) {
          case 'AUTO_ESCALATE_HIGH_RISK':
            if (currentRow.aiAnalysis.riskScore > 0.8) {
              await this.escalateDispute(disputeId, 'HIGH_RISK_DETECTED');
              executed.push(suggestion);
            } else {
              skipped.push(suggestion);
            }
            break;
            
          case 'AUTO_REQUEST_EVIDENCE':
            await this.requestAdditionalEvidence(disputeId);
            executed.push(suggestion);
            break;
            
          case 'AUTO_SEND_REMINDER':
            await this.sendAutomatedReminder(disputeId);
            executed.push(suggestion);
            break;
            
          case 'AUTO_UPDATE_STATUS':
            await this.updateDisputeStatus(disputeId, this.getNextStatus(dispute.status));
            executed.push(suggestion);
            break;
            
          default:
            skipped.push(suggestion);
        }
      } catch (error) {
        console.error(`Failed to execute automation ${suggestion}:`, error);
        failed.push(suggestion);
      }
    }
    
    return { executed, failed, skipped };
  }
  
  /**
   * Get real-time dispute status with AI insights
   */
  async getDisputeStatusWithAI(disputeId: string): Promise<{
    status: string;
    matrixRow: EnhancedDisputeMatrixRow;
    aiInsights: any;
    nextActions: DisputeAction[];
    timeToResolution: number;
    automationAvailable: string[];
  }> {
    const dispute = await this.dashboardManager.getDisputeDetail(disputeId);
    const enhancedMatrix = await this.getEnhancedDisputeMatrix(disputeId);
    const currentRow = enhancedMatrix.find(row => row.status === dispute.status);
    
    if (!currentRow) {
      throw new Error(`Status ${dispute.status} not found in matrix`);
    }
    
    // Get AI insights
    let aiInsights;
    try {
      aiInsights = await this.aiAnalyzer.analyzeDispute(dispute);
    } catch (error) {
      aiInsights = this.createFallbackAIAnalysis(dispute);
    }
    
    // Get next actions
    const nextActions = DisputeMatrix.getQuickActions(dispute);
    
    // Calculate time to resolution
    const timeToResolution = this.calculateTimeToResolution(currentRow, aiInsights);
    
    // Get available automation
    const automationAvailable = currentRow.automationSuggestions;
    
    return {
      status: dispute.status,
      matrixRow: currentRow,
      aiInsights,
      nextActions,
      timeToResolution,
      automationAvailable
    };
  }
  
  /**
   * Generate dispute timeline with AI-powered predictions
   */
  async generateDisputeTimeline(disputeId: string): Promise<{
    currentStep: number;
    totalSteps: number;
    steps: Array<{
      title: string;
      description: string;
      status: 'completed' | 'active' | 'pending';
      estimatedDate?: Date;
      actualDate?: Date;
      confidence: number;
      aiNotes?: string;
    }>;
    predictions: {
      likelyOutcome: string;
      confidence: number;
      estimatedCompletion: Date;
      riskFactors: string[];
    };
  }> {
    const dispute = await this.dashboardManager.getDisputeDetail(disputeId);
    const enhancedMatrix = await this.getEnhancedDisputeMatrix(disputeId);
    
    // Get base timeline
    const baseTimeline = DisputeMatrix.getTimelineProgress(dispute);
    
    // Enhance with AI predictions
    const enhancedSteps = baseTimeline.steps.map((step, index) => {
      const matrixRow = enhancedMatrix.find(row => row.status === step.title.replace(/ /g, '_'));
      
      return {
        ...step,
        estimatedDate: this.calculateStepEstimate(step, index, dispute),
        confidence: matrixRow?.aiAnalysis?.confidence || 0.8,
        aiNotes: matrixRow?.aiAnalysis?.recommendations?.join(', ')
      };
    });
    
    // Generate predictions
    const predictions = await this.generatePredictions(dispute, enhancedMatrix);
    
    return {
      currentStep: baseTimeline.currentStep,
      totalSteps: baseTimeline.totalSteps,
      steps: enhancedSteps,
      predictions
    };
  }
  
  // Private helper methods
  private async generateWorkflowSteps(dispute: any, matrix: EnhancedDisputeMatrixRow[]): Promise<DisputeWorkflowStep[]> {
    const steps: DisputeWorkflowStep[] = [];
    const currentIndex = matrix.findIndex(row => row.status === dispute.status);
    
    for (let i = currentIndex; i < matrix.length; i++) {
      const row = matrix[i];
      
      const step: DisputeWorkflowStep = {
        id: `step_${i}`,
        title: row.status.replace(/_/g, ' '),
        description: row.description,
        status: i === currentIndex ? 'active' : i < currentIndex ? 'completed' : 'pending',
        assignedTo: this.getStepOwner(row.status),
        dueDate: this.calculateStepDueDate(row),
        actions: DisputeMatrix.getQuickActions(dispute),
        aiAssistance: row.aiAnalysis ? {
          suggestions: row.aiAnalysis.recommendations,
          autoActions: row.automationSuggestions,
          confidence: row.aiAnalysis.confidence
        } : undefined
      };
      
      steps.push(step);
    }
    
    return steps;
  }
  
  private async performRiskAssessment(dispute: any, matrix: EnhancedDisputeMatrixRow[]): Promise<{
    overall: number;
    factors: string[];
    mitigation: string[];
  }> {
    const currentRow = matrix.find(row => row.status === dispute.status);
    const riskScore = currentRow?.aiAnalysis?.riskScore || 0.5;
    
    const factors: string[] = [];
    const mitigation: string[] = [];
    
    // Analyze risk factors
    if (riskScore > 0.7) {
      factors.push('High AI risk score detected');
      mitigation.push('Consider escalation to investigation team');
    }
    
    if (dispute.amount > 1000) {
      factors.push('High transaction amount');
      mitigation.push('Require additional verification');
    }
    
    if (currentRow?.priorityLevel === 'CRITICAL') {
      factors.push('Critical priority dispute');
      mitigation.push('Expedite handling process');
    }
    
    return {
      overall: riskScore,
      factors,
      mitigation
    };
  }
  
  private determineTargetResolution(dispute: any, currentRow: EnhancedDisputeMatrixRow): string {
    // Use AI recommendations to determine likely outcome
    if (currentRow.aiAnalysis) {
      const recommendations = currentRow.aiAnalysis.recommendations;
      
      if (recommendations.includes('Rule in Merchant Favor')) {
        return 'RESOLVED_DENIED';
      } else if (recommendations.includes('Accept & Refund')) {
        return 'RESOLVED_REFUND';
      } else if (recommendations.includes('Escalate to Venmo')) {
        return 'VENMO_ESCALATION';
      }
    }
    
    // Default to investigation if uncertain
    return 'UNDER_INVESTIGATION';
  }
  
  private calculateEstimatedCompletion(steps: DisputeWorkflowStep[], currentRow: EnhancedDisputeMatrixRow): Date {
    const now = new Date();
    let totalDays = 0;
    
    // Sum timeline estimates for remaining steps
    for (const step of steps.filter(s => s.status === 'pending')) {
      const timeline = step.description.match(/(\d+)-(\d+)\s*(days?|hours?)/);
      if (timeline) {
        const min = parseInt(timeline[1]);
        const max = parseInt(timeline[2]);
        const unit = timeline[3].includes('hour') ? min / 24 : min;
        totalDays += unit;
      }
    }
    
    // Adjust based on AI confidence
    if (currentRow.aiAnalysis) {
      const confidenceFactor = 2 - currentRow.aiAnalysis.confidence; // Lower confidence = longer time
      totalDays *= confidenceFactor;
    }
    
    return new Date(now.getTime() + (totalDays * 24 * 60 * 60 * 1000));
  }
  
  private extractRequiredActions(steps: DisputeWorkflowStep[]): {
    customer: string[];
    merchant: string[];
    system: string[];
  } {
    const actions = {
      customer: [] as string[],
      merchant: [] as string[],
      system: [] as string[]
    };
    
    steps.forEach(step => {
      step.actions.forEach(action => {
        // Categorize actions based on title and priority
        if (action.title.includes('Upload') || action.title.includes('Message')) {
          actions.customer.push(action.title);
        } else if (action.title.includes('Respond') || action.title.includes('Review')) {
          actions.merchant.push(action.title);
        } else {
          actions.system.push(action.title);
        }
      });
    });
    
    return actions;
  }
  
  private async getMerchantMetrics(merchantId: string): Promise<{
    averageResponseTime: number;
    winRate: number;
    similarCases: number;
  }> {
    // Mock implementation - would query actual merchant data
    return {
      averageResponseTime: 4.2, // hours
      winRate: 78.5, // percentage
      similarCases: 12
    };
  }
  
  private generateAutomationSuggestions(row: DisputeMatrixRow, aiAnalysis: any): string[] {
    const suggestions: string[] = [];
    
    if (aiAnalysis.riskScore > 0.8) {
      suggestions.push('AUTO_ESCALATE_HIGH_RISK');
    }
    
    if (row.status === 'SUBMITTED' && aiAnalysis.confidence < 0.6) {
      suggestions.push('AUTO_REQUEST_EVIDENCE');
    }
    
    if (row.timeline.includes('48 hours')) {
      suggestions.push('AUTO_SEND_REMINDER');
    }
    
    if (aiAnalysis.riskScore < 0.3 && aiAnalysis.confidence > 0.8) {
      suggestions.push('AUTO_UPDATE_STATUS');
    }
    
    return suggestions;
  }
  
  private calculatePriorityLevel(
    row: DisputeMatrixRow, 
    aiAnalysis: any, 
    merchantMetrics: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let score = 0;
    
    // AI risk score contribution
    score += aiAnalysis.riskScore * 0.4;
    
    // Merchant response time contribution
    if (merchantMetrics.averageResponseTime > 24) {
      score += 0.2;
    }
    
    // Amount contribution
    // This would need to be passed in or determined from context
    
    // Status-based contribution
    if (row.status === 'VENMO_ESCALATION') {
      score += 0.3;
    } else if (row.status === 'SUSPENDED_FRAUD') {
      score += 0.5;
    }
    
    if (score > 0.8) return 'CRITICAL';
    if (score > 0.6) return 'HIGH';
    if (score > 0.3) return 'MEDIUM';
    return 'LOW';
  }
  
  private calculateEstimatedResolutionTime(row: DisputeMatrixRow, aiAnalysis: any): number {
    const timeline = row.timeline;
    const match = timeline.match(/(\d+)-(\d+)\s*(days?|hours?)/);
    
    if (!match) return 72; // Default 72 hours
    
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    const unit = match[3].includes('hour') ? 1 : 24;
    
    // Adjust based on AI confidence
    const confidenceFactor = 2 - aiAnalysis.confidence;
    const adjustedTime = ((min + max) / 2) * unit * confidenceFactor;
    
    return adjustedTime;
  }
  
  private createFallbackAIAnalysis(dispute: any): any {
    return {
      riskScore: 0.5,
      confidence: 0.7,
      recommendations: ['Review manually', 'Request additional evidence'],
      estimatedResolutionTime: 72
    };
  }
  
  private async escalateDispute(disputeId: string, reason: string): Promise<void> {
    await this.dashboardManager.updateDisputeStatus(disputeId, 'UNDER_INVESTIGATION');
    await this.notificationService.sendNotification({
      type: 'WARNING',
      title: 'Dispute Escalated',
      message: `Dispute ${disputeId} escalated: ${reason}`,
      merchantId: 'system'
    });
  }
  
  private async requestAdditionalEvidence(disputeId: string): Promise<void> {
    await this.notificationService.sendNotification({
      type: 'INFO',
      title: 'Additional Evidence Requested',
      message: `Please upload more evidence for dispute ${disputeId}`,
      merchantId: 'customer'
    });
  }
  
  private async sendAutomatedReminder(disputeId: string): Promise<void> {
    await this.notificationService.sendNotification({
      type: 'INFO',
      title: 'Dispute Reminder',
      message: `Reminder: Action needed for dispute ${disputeId}`,
      merchantId: 'merchant'
    });
  }
  
  private async updateDisputeStatus(disputeId: string, newStatus: string): Promise<void> {
    await this.dashboardManager.updateDisputeStatus(disputeId, newStatus);
  }
  
  private getNextStatus(currentStatus: string): string {
    const statusFlow = [
      'SUBMITTED',
      'MERCHANT_REVIEW',
      'UNDER_INVESTIGATION',
      'VENMO_ESCALATION',
      'RESOLVED_REFUND',
      'RESOLVED_DENIED'
    ];
    
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : currentStatus;
  }
  
  private getStepOwner(status: string): 'customer' | 'merchant' | 'system' | 'investigator' | 'venmo' {
    switch (status) {
      case 'SUBMITTED': return 'customer';
      case 'MERCHANT_REVIEW': return 'merchant';
      case 'UNDER_INVESTIGATION': return 'investigator';
      case 'VENMO_ESCALATION': return 'venmo';
      default: return 'system';
    }
  }
  
  private calculateStepDueDate(row: DisputeMatrixRow): Date {
    const now = new Date();
    const timeline = row.timeline;
    const match = timeline.match(/(\d+)-(\d+)\s*(days?|hours?)/);
    
    if (!match) return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const max = parseInt(match[2]);
    const unit = match[3].includes('hour') ? 1 : 24;
    
    return new Date(now.getTime() + (max * unit * 60 * 60 * 1000));
  }
  
  private calculateTimeToResolution(row: EnhancedDisputeMatrixRow, aiAnalysis: any): number {
    if (row.aiAnalysis) {
      return row.aiAnalysis.estimatedResolutionTime;
    }
    return 72; // Default 72 hours
  }
  
  private calculateStepEstimate(step: any, index: number, dispute: any): Date {
    const now = new Date();
    const daysPerStep = 2; // Rough estimate
    return new Date(now.getTime() + (index * daysPerStep * 24 * 60 * 60 * 1000));
  }
  
  private async generatePredictions(dispute: any, matrix: EnhancedDisputeMatrixRow[]): Promise<{
    likelyOutcome: string;
    confidence: number;
    estimatedCompletion: Date;
    riskFactors: string[];
  }> {
    const currentRow = matrix.find(row => row.status === dispute.status);
    
    return {
      likelyOutcome: this.determineTargetResolution(dispute, currentRow!),
      confidence: currentRow?.aiAnalysis?.confidence || 0.7,
      estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      riskFactors: ['High dispute amount', 'Limited evidence', 'First-time customer']
    };
  }
}

export const disputeMatrixIntegration = new DisputeMatrixIntegration();
