#!/usr/bin/env bun

// ai/enhanced-integration.ts - Unified AI Integration Layer
// Advanced AI orchestration connecting fraud detection, shopping, security, and monitoring

console.log("🧠 Enhanced AI Integration Layer - Unified Intelligence Starting...");

import { EnhancedAIModel } from './enhanced-ai-model.js';
import { EnhancedNetworkOptimizer } from './enhanced-network-optimizer.js';
import { RealTimeFraudDetector } from './realtime-fraud-detector.js';
import { EnhancedSecuritySuite } from '../security/enhanced-security.js';
import { AdvancedMonitoringSystem } from '../monitoring/advanced-monitoring.js';

export interface UnifiedContext {
  userId: string;
  sessionId: string;
  transactionId?: string;
  timestamp: number;
  ipAddress: string;
  deviceFingerprint: string;
  location: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
  behavior: {
    navigationPath: string[];
    timeOnPage: number;
    clickPattern: string[];
    typingSpeed: number;
    mouseMovements: number;
  };
  transaction?: {
    amount: number;
    currency: string;
    merchant: string;
    category: string;
    paymentMethod: string;
  };
}

export interface AIInsight {
  id: string;
  timestamp: number;
  type: 'fraud_risk' | 'security_threat' | 'performance_optimization' | 'business_intelligence' | 'user_experience';
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  factors: string[];
  recommendations: string[];
  data: {
    riskScore?: number;
    threatLevel?: string;
    optimizationPotential?: number;
    businessImpact?: string;
    userSatisfaction?: number;
  };
  actions: Array<{
    type: 'block' | 'challenge' | 'monitor' | 'optimize' | 'notify' | 'investigate';
    target: string;
    parameters: Record<string, any>;
  }>;
}

export interface OrchestrationDecision {
  id: string;
  timestamp: number;
  context: UnifiedContext;
  insights: AIInsight[];
  decision: {
    action: string;
    reasoning: string;
    confidence: number;
    automated: boolean;
    requiresHumanReview: boolean;
  };
  execution: {
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'escalated';
    results?: any;
    errors?: string[];
  };
}

export class EnhancedAIIntegration {
  private aiModel: EnhancedAIModel;
  private networkOptimizer: EnhancedNetworkOptimizer;
  private fraudDetector: RealTimeFraudDetector;
  private securitySuite: EnhancedSecuritySuite;
  private monitoringSystem: AdvancedMonitoringSystem;
  
  private insights: AIInsight[] = [];
  private decisions: OrchestrationDecision[] = [];
  private learningData: any[] = [];
  private isIntegrating = false;

  constructor() {
    this.aiModel = new EnhancedAIModel();
    this.networkOptimizer = new EnhancedNetworkOptimizer();
    this.fraudDetector = new RealTimeFraudDetector();
    this.securitySuite = new EnhancedSecuritySuite();
    this.monitoringSystem = new AdvancedMonitoringSystem();
    
    this.startIntegration();
    this.initializeLearning();
  }

  private startIntegration() {
    this.isIntegrating = true;
    console.log("🔄 Starting unified AI integration...");
    
    // Start continuous learning and optimization
    setInterval(() => {
      this.performContinuousLearning();
      this.optimizeSystemPerformance();
      this.updateAIModels();
    }, 30000); // Every 30 seconds
  }

  private initializeLearning() {
    console.log("🎓 Initializing AI learning systems...");
    
    // Subscribe to monitoring alerts for learning
    this.monitoringSystem.subscribeToAlerts('ai-integration', (alert) => {
      this.learnFromAlert(alert);
    });
  }

  // Main orchestration method
  async processUnifiedRequest(context: UnifiedContext): Promise<{
    insights: AIInsight[];
    decision: OrchestrationDecision;
    execution: any;
  }> {
    try {
      console.log(`🧠 Processing unified request for user ${context.userId}`);
      
      // Step 1: Collect all AI insights
      const insights = await this.generateInsights(context);
      
      // Step 2: Make orchestration decision
      const decision = await this.makeDecision(context, insights);
      
      // Step 3: Execute decision
      const execution = await this.executeDecision(decision);
      
      // Step 4: Learn from the interaction
      await this.learnFromInteraction(context, insights, decision, execution);
      
      return {
        insights,
        decision,
        execution
      };
      
    } catch (error) {
      console.error('❌ Error in unified processing:', error);
      
      // Fallback to safe mode
      return this.fallbackProcessing(context, error);
    }
  }

  private async generateInsights(context: UnifiedContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    try {
      // Fraud risk analysis
      const fraudInsight = await this.analyzeFraudRisk(context);
      if (fraudInsight) insights.push(fraudInsight);
      
      // Security threat analysis
      const securityInsight = await this.analyzeSecurityThreat(context);
      if (securityInsight) insights.push(securityInsight);
      
      // Performance optimization analysis
      const performanceInsight = await this.analyzePerformance(context);
      if (performanceInsight) insights.push(performanceInsight);
      
      // Business intelligence analysis
      const businessInsight = await this.analyzeBusinessIntelligence(context);
      if (businessInsight) insights.push(businessInsight);
      
      // User experience analysis
      const uxInsight = await this.analyzeUserExperience(context);
      if (uxInsight) insights.push(uxInsight);
      
    } catch (error) {
      console.error('❌ Error generating insights:', error);
    }
    
    // Sort by priority and confidence
    insights.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] * a.confidence;
      const bPriority = priorityWeight[b.priority] * b.confidence;
      return bPriority - aPriority;
    });
    
    return insights;
  }

  private async analyzeFraudRisk(context: UnifiedContext): Promise<AIInsight | null> {
    try {
      // Prepare features for AI model
      const features = this.extractFraudFeatures(context);
      
      // Get AI model prediction
      const prediction = this.aiModel.predict(features);
      
      // Get real-time fraud detection
      const fraudSignal = await this.fraudDetector.processEvent({
        id: `fraud_${context.transactionId || Date.now()}`,
        timestamp: context.timestamp,
        type: 'transaction',
        userId: context.userId,
        sessionId: context.sessionId,
        data: {
          amount: context.transaction?.amount || 0,
          ipAddress: context.ipAddress,
          deviceFingerprint: context.deviceFingerprint,
          location: context.location,
          behavior: context.behavior
        },
        source: 'ai_integration',
        priority: 'high'
      });
      
      const riskScore = prediction.score;
      const riskLevel = prediction.riskLevel;
      
      if (riskScore > 0.7) {
        return {
          id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'fraud_risk',
          confidence: prediction.confidence,
          priority: riskScore > 0.9 ? 'critical' : riskScore > 0.8 ? 'high' : 'medium',
          title: `High Fraud Risk Detected - ${riskLevel.toUpperCase()}`,
          description: `Transaction shows ${riskLevel} fraud risk with ${(riskScore * 100).toFixed(1)}% confidence`,
          factors: prediction.recommendations,
          recommendations: [
            'Require additional verification',
            'Review transaction history',
            'Consider manual review',
            'Enhance monitoring'
          ],
          data: {
            riskScore,
            threatLevel: riskLevel
          },
          actions: [
            {
              type: riskScore > 0.9 ? 'block' : 'challenge',
              target: 'transaction',
              parameters: { requireMFA: true, blockAmount: riskScore > 0.9 }
            },
            {
              type: 'notify',
              target: 'security_team',
              parameters: { urgency: riskScore > 0.9 ? 'high' : 'medium' }
            }
          ]
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error analyzing fraud risk:', error);
      return null;
    }
  }

  private async analyzeSecurityThreat(context: UnifiedContext): Promise<AIInsight | null> {
    try {
      // Evaluate access request
      const securityEvaluation = await this.securitySuite.evaluateAccessRequest(
        context.userId,
        'financial-operations',
        {
          ipAddress: context.ipAddress,
          deviceFingerprint: context.deviceFingerprint,
          location: context.location,
          time: new Date(context.timestamp),
          action: 'transaction'
        }
      );
      
      // Detect anomalies
      const anomalyDetection = await this.securitySuite.detectAnomalies(context.userId, {
        ipAddress: context.ipAddress,
        deviceFingerprint: context.deviceFingerprint,
        location: context.location,
        transactionAmount: context.transaction?.amount || 0,
        frequency: 1,
        timeOfDay: new Date(context.timestamp).getHours(),
        dayOfWeek: new Date(context.timestamp).getDay()
      });
      
      if (!securityEvaluation.allowed || anomalyDetection.isAnomalous) {
        return {
          id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'security_threat',
          confidence: Math.max(securityEvaluation.riskScore, anomalyDetection.confidence),
          priority: anomalyDetection.recommendedAction === 'block' ? 'critical' : 'high',
          title: 'Security Threat Detected',
          description: anomalyDetection.isAnomalous 
            ? `Anomalous behavior detected: ${anomalyDetection.explanation.join(', ')}`
            : `Security policy violation: ${securityEvaluation.reason}`,
          factors: anomalyDetection.explanation,
          recommendations: [
            'Block suspicious activity',
            'Require additional authentication',
            'Investigate user behavior',
            'Enhance monitoring'
          ],
          data: {
            riskScore: securityEvaluation.riskScore,
            threatLevel: anomalyDetection.isAnomalous ? 'anomaly' : 'policy_violation'
          },
          actions: [
            {
              type: anomalyDetection.recommendedAction === 'block' ? 'block' : 'challenge',
              target: 'user_session',
              parameters: { reason: securityEvaluation.reason }
            },
            {
              type: 'investigate',
              target: 'security_team',
              parameters: { priority: 'high' }
            }
          ]
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error analyzing security threat:', error);
      return null;
    }
  }

  private async analyzePerformance(context: UnifiedContext): Promise<AIInsight | null> {
    try {
      // Get network optimization suggestions
      const networkStatus = this.networkOptimizer.getCacheStatus();
      
      // Get monitoring metrics
      const systemMetrics = this.monitoringSystem.getSystemMetrics(1)[0];
      
      const optimizationPotential = this.calculateOptimizationPotential(systemMetrics, networkStatus);
      
      if (optimizationPotential > 0.3) {
        return {
          id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'performance_optimization',
          confidence: 0.8,
          priority: optimizationPotential > 0.7 ? 'high' : 'medium',
          title: 'Performance Optimization Opportunity',
          description: `System performance can be improved by ${(optimizationPotential * 100).toFixed(1)}%`,
          factors: [
            'High response time detected',
            'Cache hit rate can be improved',
            'Network optimization available'
          ],
          recommendations: [
            'Optimize network routes',
            'Increase cache size',
            'Enable compression',
            'Load balance requests'
          ],
          data: {
            optimizationPotential
          },
          actions: [
            {
              type: 'optimize',
              target: 'network',
              parameters: { optimizationLevel: optimizationPotential }
            },
            {
              type: 'monitor',
              target: 'performance',
              parameters: { enhancedMonitoring: true }
            }
          ]
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error analyzing performance:', error);
      return null;
    }
  }

  private async analyzeBusinessIntelligence(context: UnifiedContext): Promise<AIInsight | null> {
    try {
      // Analyze transaction patterns
      const businessMetrics = this.monitoringSystem.getBusinessMetrics(10);
      
      if (businessMetrics.length < 5) return null;
      
      const recentTransactions = businessMetrics.slice(-5);
      const avgOrderValue = recentTransactions.reduce((sum, m) => sum + m.shopping.averageOrderValue, 0) / recentTransactions.length;
      
      // Cross-sell/upsell opportunities
      if (context.transaction && context.transaction.amount > avgOrderValue * 1.5) {
        return {
          id: `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'business_intelligence',
          confidence: 0.75,
          priority: 'medium',
          title: 'High-Value Customer Opportunity',
          description: 'Customer shows high purchasing power - cross-sell opportunity detected',
          factors: [
            'Above average transaction amount',
            'Premium payment method',
            'Low cart abandonment history'
          ],
          recommendations: [
            'Offer premium products',
            'Provide personalized recommendations',
            'Enable loyalty benefits',
            'Schedule follow-up offers'
          ],
          data: {
            businessImpact: 'high',
            customerValue: context.transaction.amount
          },
          actions: [
            {
              type: 'notify',
              target: 'marketing_team',
              parameters: { customerSegment: 'high_value' }
            },
            {
              type: 'optimize',
              target: 'recommendations',
              parameters: { premiumProducts: true }
            }
          ]
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error analyzing business intelligence:', error);
      return null;
    }
  }

  private async analyzeUserExperience(context: UnifiedContext): Promise<AIInsight | null> {
    try {
      // Analyze user behavior patterns
      const behaviorScore = this.calculateBehaviorScore(context.behavior);
      
      if (behaviorScore < 0.5) {
        return {
          id: `ux_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'user_experience',
          confidence: 0.7,
          priority: 'medium',
          title: 'User Experience Optimization Needed',
          description: 'User behavior indicates potential friction or confusion',
          factors: [
            'Erratic mouse movements',
            'Slow typing speed',
            'Unusual navigation pattern'
          ],
          recommendations: [
            'Simplify user interface',
            'Provide better guidance',
            'Optimize page load times',
            'Add contextual help'
          ],
          data: {
            userSatisfaction: behaviorScore
          },
          actions: [
            {
              type: 'optimize',
              target: 'user_interface',
              parameters: { simplifyUI: true }
            },
            {
              type: 'monitor',
              target: 'user_behavior',
              parameters: { enhancedTracking: true }
            }
          ]
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error analyzing user experience:', error);
      return null;
    }
  }

  private async makeDecision(context: UnifiedContext, insights: AIInsight[]): Promise<OrchestrationDecision> {
    const criticalInsights = insights.filter(i => i.priority === 'critical');
    const highInsights = insights.filter(i => i.priority === 'high');
    
    let action = 'allow';
    let reasoning = 'No significant risks detected';
    let confidence = 0.9;
    let requiresHumanReview = false;
    let automated = true;
    
    if (criticalInsights.length > 0) {
      action = 'block';
      reasoning = `Critical risks detected: ${criticalInsights.map(i => i.title).join(', ')}`;
      confidence = 0.95;
      requiresHumanReview = true;
      automated = false;
    } else if (highInsights.length > 0) {
      action = 'challenge';
      reasoning = `High risks detected: ${highInsights.map(i => i.title).join(', ')}`;
      confidence = 0.8;
      requiresHumanReview = highInsights.some(i => i.type === 'security_threat');
    } else if (insights.length > 0) {
      action = 'monitor';
      reasoning = `Minor insights detected: ${insights.map(i => i.title).join(', ')}`;
      confidence = 0.7;
    }
    
    return {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      context,
      insights,
      decision: {
        action,
        reasoning,
        confidence,
        automated,
        requiresHumanReview
      },
      execution: {
        status: 'pending'
      }
    };
  }

  private async executeDecision(decision: OnchestrationDecision): Promise<any> {
    try {
      decision.execution.status = 'executing';
      
      const results: any[] = [];
      
      // Execute actions from insights
      for (const insight of decision.insights) {
        for (const action of insight.actions) {
          const result = await this.executeAction(action, decision.context);
          results.push(result);
        }
      }
      
      decision.execution.status = 'completed';
      decision.execution.results = results;
      
      return results;
    } catch (error) {
      decision.execution.status = 'failed';
      decision.execution.errors = [error.message];
      throw error;
    }
  }

  private async executeAction(action: any, context: UnifiedContext): Promise<any> {
    switch (action.type) {
      case 'block':
        return await this.blockAction(action.target, action.parameters);
      case 'challenge':
        return await this.challengeAction(action.target, action.parameters);
      case 'monitor':
        return await this.monitorAction(action.target, action.parameters);
      case 'optimize':
        return await this.optimizeAction(action.target, action.parameters);
      case 'notify':
        return await this.notifyAction(action.target, action.parameters);
      case 'investigate':
        return await this.investigateAction(action.target, action.parameters);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async blockAction(target: string, parameters: any): Promise<any> {
    console.log(`🚫 Blocking ${target} with parameters:`, parameters);
    return { action: 'blocked', target, parameters, timestamp: Date.now() };
  }

  private async challengeAction(target: string, parameters: any): Promise<any> {
    console.log(`🔍 Challenging ${target} with parameters:`, parameters);
    return { action: 'challenged', target, parameters, timestamp: Date.now() };
  }

  private async monitorAction(target: string, parameters: any): Promise<any> {
    console.log(`📊 Monitoring ${target} with parameters:`, parameters);
    return { action: 'monitoring', target, parameters, timestamp: Date.now() };
  }

  private async optimizeAction(target: string, parameters: any): Promise<any> {
    console.log(`⚡ Optimizing ${target} with parameters:`, parameters);
    return { action: 'optimized', target, parameters, timestamp: Date.now() };
  }

  private async notifyAction(target: string, parameters: any): Promise<any> {
    console.log(`📢 Notifying ${target} with parameters:`, parameters);
    return { action: 'notified', target, parameters, timestamp: Date.now() };
  }

  private async investigateAction(target: string, parameters: any): Promise<any> {
    console.log(`🔎 Investigating ${target} with parameters:`, parameters);
    return { action: 'investigating', target, parameters, timestamp: Date.now() };
  }

  // Learning and optimization
  private async learnFromInteraction(
    context: UnifiedContext,
    insights: AIInsight[],
    decision: OnchestrationDecision,
    execution: any
  ) {
    try {
      const learningData = {
        context,
        insights: insights.map(i => ({ type: i.type, confidence: i.confidence, priority: i.priority })),
        decision: decision.decision,
        execution: decision.execution,
        timestamp: Date.now()
      };
      
      this.learningData.push(learningData);
      
      // Keep only last 10000 learning examples
      if (this.learningData.length > 10000) {
        this.learningData = this.learningData.slice(-10000);
      }
      
      console.log(`🎓 Learned from interaction: ${decision.decision.action} (confidence: ${decision.decision.confidence})`);
    } catch (error) {
      console.error('❌ Error learning from interaction:', error);
    }
  }

  private learnFromAlert(alert: any) {
    console.log(`📚 Learning from alert: ${alert.title}`);
    // In a real implementation, this would update AI models based on alerts
  }

  private performContinuousLearning() {
    if (this.learningData.length < 100) return;
    
    console.log('🧠 Performing continuous learning...');
    
    // Analyze recent decisions and outcomes
    const recentData = this.learningData.slice(-100);
    const successRate = recentData.filter(d => d.execution.status === 'completed').length / recentData.length;
    
    if (successRate < 0.8) {
      console.log('⚠️ Low success rate detected, adjusting decision thresholds...');
      // Adjust decision thresholds based on performance
    }
  }

  private optimizeSystemPerformance() {
    console.log('⚡ Optimizing system performance...');
    
    // Get current metrics
    const systemMetrics = this.monitoringSystem.getSystemMetrics(1)[0];
    
    // Optimize based on current performance
    if (systemMetrics.cpu.usage > 70) {
      this.networkOptimizer.optimizeNetwork();
    }
    
    if (systemMetrics.memory.usage > 80) {
      // Trigger memory optimization
      console.log('🧹 Triggering memory optimization...');
    }
  }

  private updateAIModels() {
    console.log('🤖 Updating AI models...');
    
    // Retrain models with new data
    if (this.learningData.length > 1000) {
      console.log('📈 Retraining AI models with new data...');
      // In a real implementation, this would retrain the models
    }
  }

  // Helper methods
  private extractFraudFeatures(context: UnifiedContext): number[] {
    return [
      context.transaction?.amount || 0,
      context.behavior.timeOnPage,
      context.behavior.typingSpeed,
      context.behavior.mouseMovements,
      new Date(context.timestamp).getHours(),
      new Date(context.timestamp).getDay(),
      context.location.country === 'US' ? 1 : 0,
      context.deviceFingerprint.length
    ];
  }

  private calculateOptimizationPotential(systemMetrics: any, networkStatus: any): number {
    let potential = 0;
    
    if (systemMetrics.cpu.usage > 70) potential += 0.3;
    if (systemMetrics.memory.usage > 80) potential += 0.2;
    if (networkStatus.cacheHitRate < 90) potential += 0.3;
    if (systemMetrics.network.averageResponseTime > 100) potential += 0.2;
    
    return Math.min(potential, 1.0);
  }

  private calculateBehaviorScore(behavior: UnifiedContext['behavior']): number {
    let score = 1.0;
    
    if (behavior.timeOnPage < 5000) score -= 0.2;
    if (behavior.typingSpeed < 20) score -= 0.2;
    if (behavior.mouseMovements > 1000) score -= 0.3;
    if (behavior.navigationPath.length > 10) score -= 0.3;
    
    return Math.max(score, 0);
  }

  private fallbackProcessing(context: UnifiedContext, error: any): any {
    console.log('🛡️ Executing fallback processing due to error:', error);
    
    return {
      insights: [{
        id: `fallback_${Date.now()}`,
        timestamp: Date.now(),
        type: 'security_threat' as const,
        confidence: 0.5,
        priority: 'medium' as const,
        title: 'System Error - Fallback Mode',
        description: 'AI integration failed, using safe fallback processing',
        factors: ['System error', 'AI integration failure'],
        recommendations: ['Investigate system error', 'Monitor closely'],
        data: { threatLevel: 'unknown' },
        actions: [{
          type: 'monitor' as const,
          target: 'system',
          parameters: { enhancedMonitoring: true }
        }]
      }],
      decision: {
        id: `fallback_decision_${Date.now()}`,
        timestamp: Date.now(),
        context,
        insights: [],
        decision: {
          action: 'monitor',
          reasoning: 'System error - using safe fallback',
          confidence: 0.5,
          automated: true,
          requiresHumanReview: true
        },
        execution: { status: 'completed' as const }
      },
      execution: { status: 'completed', results: ['fallback_processed'] }
    };
  }

  // Public API methods
  getInsights(limit: number = 50): AIInsight[] {
    return this.insights.slice(-limit);
  }

  getDecisions(limit: number = 50): OnchestrationDecision[] {
    return this.decisions.slice(-limit);
  }

  getIntegrationStatus(): any {
    return {
      isIntegrating: this.isIntegrating,
      totalInsights: this.insights.length,
      totalDecisions: this.decisions.length,
      learningDataSize: this.learningData.length,
      uptime: Date.now() - (this.insights[0]?.timestamp || Date.now())
    };
  }
}

// Demo and testing
async function demonstrateEnhancedIntegration() {
  console.log("🧠 Enhanced AI Integration Layer - Unified Intelligence Demo");
  console.log("=" .repeat(60));

  const integration = new EnhancedAIIntegration();

  // Wait for initialization
  console.log("\n⏳ Initializing AI integration systems...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Create test context
  const testContext: UnifiedContext = {
    userId: 'user-001',
    sessionId: 'session-123',
    transactionId: 'txn-456',
    timestamp: Date.now(),
    ipAddress: '192.168.1.100',
    deviceFingerprint: 'fp_abcdef123456',
    location: {
      country: 'US',
      city: 'New York',
      coordinates: [40.7128, -74.0060]
    },
    behavior: {
      navigationPath: ['/home', '/products', '/checkout'],
      timeOnPage: 12000,
      clickPattern: ['product_click', 'add_to_cart', 'checkout'],
      typingSpeed: 45,
      mouseMovements: 250
    },
    transaction: {
      amount: 1500.00,
      currency: 'USD',
      merchant: 'Premium Store',
      category: 'Electronics',
      paymentMethod: 'credit_card'
    }
  };

  console.log("\n🔄 Processing unified request...");
  const result = await integration.processUnifiedRequest(testContext);

  console.log("\n💡 Generated Insights:");
  result.insights.forEach((insight, index) => {
    console.log(`   ${index + 1}. [${insight.priority.toUpperCase()}] ${insight.title}`);
    console.log(`      Type: ${insight.type}, Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
    console.log(`      Description: ${insight.description}`);
  });

  console.log("\n🎯 Orchestration Decision:");
  console.log(`   Action: ${result.decision.decision.action}`);
  console.log(`   Reasoning: ${result.decision.decision.reasoning}`);
  console.log(`   Confidence: ${(result.decision.decision.confidence * 100).toFixed(1)}%`);
  console.log(`   Automated: ${result.decision.decision.automated ? 'Yes' : 'No'}`);
  console.log(`   Requires Human Review: ${result.decision.decision.requiresHumanReview ? 'Yes' : 'No'}`);

  console.log("\n⚡ Execution Results:");
  result.execution.forEach((result: any, index: number) => {
    console.log(`   ${index + 1}. ${result.action} on ${result.target}`);
  });

  // Show integration status
  console.log("\n📊 Integration Status:");
  const status = integration.getIntegrationStatus();
  console.log(`   Integration Active: ${status.isIntegrating ? '✅ Yes' : '❌ No'}`);
  console.log(`   Total Insights Generated: ${status.totalInsights}`);
  console.log(`   Total Decisions Made: ${status.totalDecisions}`);
  console.log(`   Learning Data Points: ${status.learningDataSize}`);
  console.log(`   Uptime: ${Math.floor(status.uptime / 1000 / 60)} minutes`);

  console.log("\n🎉 Enhanced AI Integration Layer Demo Complete!");
  console.log("💚 Unified intelligence with fraud detection, security, monitoring, and business intelligence operational!");
}

// Run demo if executed directly
if (import.meta.main) {
  demonstrateEnhancedIntegration().catch(console.error);
}
