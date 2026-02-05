/**
 * Cascade Follow-Up System
 * Implements dynamic follow-up generation and readiness
 * [#REF:FOLLOWUP-INFRASTRUCTURE] - Building on medium variation's follow-up emphasis
 */

import { DeepWikiIntegration } from '../integrations/deepwiki.ts';

export interface FollowUpSuggestion {
  id: string;
  type: 'command' | 'query' | 'action' | 'learning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  context: string;
  parameters?: Record<string, any>;
  knowledgeEnhanced?: boolean;
}

export interface FollowUpContext {
  lastOperation: string;
  lastResult: any;
  error?: Error;
  userHistory: string[];
  sessionContext: any;
  timestamp: number;
}

export class FollowUpManager {
  private static instance: FollowUpManager;
  private deepWiki: DeepWikiIntegration;
  private suggestionHistory: FollowUpSuggestion[] = [];
  private readonly MAX_HISTORY = 50;
  
  static getInstance(): FollowUpManager {
    if (!FollowUpManager.instance) {
      FollowUpManager.instance = new FollowUpManager();
    }
    return FollowUpManager.instance;
  }
  
  private constructor() {
    this.deepWiki = DeepWikiIntegration.getInstance();
  }
  
  /**
   * Generate contextual follow-up suggestions
   * (Building on variation 2's "handle follow-ups dynamically")
   */
  async generateFollowUps(context: FollowUpContext): Promise<FollowUpSuggestion[]> {
    const suggestions: FollowUpSuggestion[] = [];
    
    // Error-based follow-ups
    if (context.error) {
      suggestions.push(...this.generateErrorFollowUps(context));
    }
    
    // Operation-based follow-ups
    suggestions.push(...this.generateOperationFollowUps(context));
    
    // Learning-based follow-ups (veiled discovery pattern)
    suggestions.push(...await this.generateLearningFollowUps(context));
    
    // History-based follow-ups
    suggestions.push(...this.generateHistoryBasedFollowUps(context));
    
    // Sort by priority and limit
    return suggestions
      .sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority))
      .slice(0, 5); // Top 5 suggestions
  }
  
  private generateErrorFollowUps(context: FollowUpContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    const error = context.error!;
    
    if (error.message.includes('configuration')) {
      suggestions.push({
        id: 'fix-config',
        type: 'action',
        priority: 'high',
        title: 'Fix Configuration Issue',
        description: 'Validate and update configuration settings',
        context: 'config:error',
        parameters: { errorType: 'configuration' }
      });
    }
    
    if (error.message.includes('permission')) {
      suggestions.push({
        id: 'check-permissions',
        type: 'action',
        priority: 'high',
        title: 'Check Security Permissions',
        description: 'Verify security context and permissions',
        context: 'security:permission',
        parameters: { securityLevel: 'elevated' }
      });
    }
    
    // Generic error follow-up
    suggestions.push({
      id: 'debug-error',
      type: 'query',
      priority: 'medium',
      title: 'Debug Error Details',
      description: 'Get detailed error analysis and solutions',
      context: 'debug:error',
      parameters: { errorId: this.generateErrorId(error) }
    });
    
    return suggestions;
  }
  
  private generateOperationFollowUps(context: FollowUpContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    const operation = context.lastOperation;
    
    // Operation-specific follow-ups
    const operationMap: Record<string, FollowUpSuggestion[]> = {
      'rule.evaluate': [
        {
          id: 'optimize-rules',
          type: 'action',
          priority: 'medium',
          title: 'Optimize Rule Performance',
          description: 'Analyze and optimize rule execution patterns',
          context: 'rules:optimization'
        },
        {
          id: 'add-rule',
          type: 'command',
          priority: 'low',
          title: 'Add New Rule',
          description: 'Create a new business rule',
          context: 'rules:create'
        }
      ],
      'skill.execute': [
        {
          id: 'enhance-skill',
          type: 'action',
          priority: 'medium',
          title: 'Enhance Skill Logic',
          description: 'Improve skill execution with better patterns',
          context: 'skills:enhancement'
        }
      ],
      'config.update': [
        {
          id: 'validate-config',
          type: 'action',
          priority: 'high',
          title: 'Validate Configuration',
          description: 'Run comprehensive configuration validation',
          context: 'config:validation'
        }
      ]
    };
    
    return operationMap[operation] || [];
  }
  
  private async generateLearningFollowUps(context: FollowUpContext): Promise<FollowUpSuggestion[]> {
    const suggestions: FollowUpSuggestion[] = [];
    
    // Knowledge-enhanced follow-ups (veiled discovery pattern)
    try {
      const learningQuestion = `What are the advanced patterns for ${context.lastOperation}?`;
      const knowledge = await this.deepWiki.askQuestion('microsoft/typescript', learningQuestion);
      
      suggestions.push({
        id: 'learn-advanced',
        type: 'learning',
        priority: 'medium',
        title: 'Learn Advanced Patterns',
        description: 'Explore advanced implementation patterns',
        context: 'learning:advanced',
        knowledgeEnhanced: true,
        parameters: { knowledge: knowledge.substring(0, 200) }
      });
    } catch (error) {
      // Fallback learning suggestion
      suggestions.push({
        id: 'learn-basics',
        type: 'learning',
        priority: 'low',
        title: 'Learn Best Practices',
        description: 'Review best practices for current operation',
        context: 'learning:basics'
      });
    }
    
    return suggestions;
  }
  
  private generateHistoryBasedFollowUps(context: FollowUpContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    const history = context.userHistory;
    
    // Pattern detection in user history
    const recentOperations = history.slice(-5);
    const operationCounts = new Map<string, number>();
    
    recentOperations.forEach(op => {
      operationCounts.set(op, (operationCounts.get(op) || 0) + 1);
    });
    
    // Suggest follow-ups based on frequent operations
    for (const [operation, count] of operationCounts.entries()) {
      if (count >= 3 && operation !== context.lastOperation) {
        suggestions.push({
          id: `continue-${operation}`,
          type: 'command',
          priority: 'low',
          title: `Continue ${operation}`,
          description: `Continue working on ${operation} (used ${count} times recently)`,
          context: `history:${operation}`
        });
      }
    }
    
    return suggestions;
  }
  
  /**
   * Execute follow-up suggestion
   */
  async executeFollowUp(suggestion: FollowUpSuggestion): Promise<any> {
    console.log(`🔄 Executing follow-up: ${suggestion.title}`);
    
    // Record in history
    this.recordSuggestion(suggestion);
    
    // Execute based on type
    switch (suggestion.type) {
      case 'command':
        return await this.executeCommandFollowUp(suggestion);
      case 'action':
        return await this.executeActionFollowUp(suggestion);
      case 'query':
        return await this.executeQueryFollowUp(suggestion);
      case 'learning':
        return await this.executeLearningFollowUp(suggestion);
      default:
        throw new Error(`Unknown follow-up type: ${suggestion.type}`);
    }
  }
  
  private async executeCommandFollowUp(suggestion: FollowUpSuggestion): Promise<any> {
    // Simulate command execution
    console.log(`⚡ Executing command: ${suggestion.context}`);
    return { status: 'executed', command: suggestion.context };
  }
  
  private async executeActionFollowUp(suggestion: FollowUpSuggestion): Promise<any> {
    // Simulate action execution
    console.log(`🎬 Executing action: ${suggestion.context}`);
    return { status: 'completed', action: suggestion.context };
  }
  
  private async executeQueryFollowUp(suggestion: FollowUpSuggestion): Promise<any> {
    // Execute knowledge query
    const knowledge = await this.deepWiki.askQuestion(
      'microsoft/vscode',
      suggestion.description
    );
    return { status: 'queried', knowledge };
  }
  
  private async executeLearningFollowUp(suggestion: FollowUpSuggestion): Promise<any> {
    // Enhanced learning with knowledge
    if (suggestion.knowledgeEnhanced && suggestion.parameters?.knowledge) {
      return {
        status: 'learned',
        knowledge: suggestion.parameters.knowledge,
        enhanced: true
      };
    }
    
    const learning = await this.deepWiki.askQuestion(
      'facebook/react',
      'What are the best learning resources for advanced patterns?'
    );
    
    return { status: 'learned', learning };
  }
  
  /**
   * Get follow-up history
   */
  getHistory(): FollowUpSuggestion[] {
    return [...this.suggestionHistory];
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.suggestionHistory = [];
    console.log('🧹 Follow-up history cleared');
  }
  
  private recordSuggestion(suggestion: FollowUpSuggestion): void {
    this.suggestionHistory.push(suggestion);
    
    // Keep only recent history
    if (this.suggestionHistory.length > this.MAX_HISTORY) {
      this.suggestionHistory = this.suggestionHistory.slice(-this.MAX_HISTORY);
    }
  }
  
  private getPriorityScore(priority: string): number {
    const scores = { high: 3, medium: 2, low: 1 };
    return scores[priority as keyof typeof scores] || 0;
  }
  
  private generateErrorId(error: Error): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}
