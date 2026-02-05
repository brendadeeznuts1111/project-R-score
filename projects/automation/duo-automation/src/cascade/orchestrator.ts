/**
 * Cascade Orchestrator - Context-Rich Integration Hub
 * Harmonizes all framework components with historical thread awareness
 * [#REF:ORCHESTRATOR] - Building on comprehensive thread evolution
 */

import { HookRegistry } from './hooks/hook-registry.ts';
import { ConfigManager } from './config/config-manager.ts';
import { DeepWikiIntegration } from './integrations/deepwiki.ts';
import { FollowUpManager } from './followups/followup-manager.ts';
import { VeiledDiscoveryEngine } from './discovery/veiled-discovery.ts';
import { withValidatedContext, ContextValidator, CascadeContext } from './principles/context-first.ts';
import { IdempotencyManager } from './principles/idempotency.ts';
import { ObservabilityManager, withInstrumentation } from './principles/observability.ts';

export interface OrchestratorContext extends CascadeContext {
  threadHistory?: any[];
  promptVariations?: string[];
  toolAvailability?: string[];
  discoveryEnabled?: boolean;
  followUpReady?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  followUps?: any[];
  discoveries?: any[];
  knowledge?: any;
  metrics?: any;
}

/**
 * Main orchestrator that weaves together all framework components
 * with historical context awareness and follow-up readiness
 */
export class CascadeOrchestrator {
  private static instance: CascadeOrchestrator;
  private hooks: HookRegistry;
  private config: ConfigManager;
  private deepWiki: DeepWikiIntegration;
  private followUps: FollowUpManager;
  private discovery: VeiledDiscoveryEngine;
  private idempotency: IdempotencyManager;
  private observability: ObservabilityManager;
  
  static getInstance(): CascadeOrchestrator {
    if (!CascadeOrchestrator.instance) {
      CascadeOrchestrator.instance = new CascadeOrchestrator();
    }
    return CascadeOrchestrator.instance;
  }
  
  private constructor() {
    this.initializeComponents();
    this.setupIntegrations();
  }
  
  private async initializeComponents(): Promise<void> {
    // Initialize all core components
    this.hooks = HookRegistry.getInstance();
    this.config = ConfigManager.getInstance();
    this.deepWiki = DeepWikiIntegration.getInstance();
    this.followUps = FollowUpManager.getInstance();
    this.discovery = VeiledDiscoveryEngine.getInstance();
    this.idempotency = new IdempotencyManager();
    this.observability = ObservabilityManager.getInstance();
    
    // Discover and register adaptive hooks
    await this.hooks.discoverAndRegisterHooks();
    
    console.log('🎯 Cascade Orchestrator initialized with context-rich components');
  }
  
  private setupIntegrations(): void {
    // Setup configuration change listeners
    this.config.onChange((event) => {
      this.handleConfigChange(event);
    });
    
    // Setup discovery integration
    this.setupDiscoveryIntegration();
    
    console.log('🔗 Component integrations established');
  }
  
  /**
   * Execute operation with full framework integration
   * (Building on thread's "comprehensive, context-rich refinement cycle")
   */
  async execute(
    operation: string,
    context: OrchestratorContext,
    handler: () => Promise<any>
  ): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    try {
      // Validate context (Principle #1: Context-First)
      const validatedContext = await withValidatedContext(context, async (ctx) => {
        return ctx;
      });
      
      // Execute with idempotency (Principle #2: Idempotent Operations)
      const idempotencyKey = this.idempotency.generateKey(operation, validatedContext);
      
      const result = await this.idempotency.executeWithIdempotency(
        idempotencyKey,
        operation,
        async () => {
          // Execute with observability (Principle #3: Observable Everything)
          return await withInstrumentation(
            operation,
            validatedContext,
            { executionId, framework: 'cascade' },
            async () => {
              // Execute with hooks
              return await this.hooks.executeWithHooks(
                operation,
                validatedContext,
                async () => {
                  // Enhance with knowledge (DeepWiki integration)
                  const enhancedContext = await this.deepWiki.enhanceWithKnowledge(
                    validatedContext,
                    operation
                  );
                  
                  // Execute main logic
                  const result = await handler();
                  
                  // Sense for veiled discoveries
                  if (context.discoveryEnabled !== false) {
                    await this.discovery.senseContext({
                      operation,
                      context: enhancedContext,
                      result,
                      timestamp: Date.now()
                    });
                  }
                  
                  return result;
                }
              );
            }
          );
        }
      );
      
      // Generate follow-ups (if ready)
      const followUps = context.followUpReady !== false 
        ? await this.generateFollowUps(operation, result, context)
        : [];
      
      // Get discoveries
      const discoveries = this.discovery.getEmergenceMetrics();
      
      // Compile execution result
      const executionResult: ExecutionResult = {
        success: true,
        result,
        followUps,
        discoveries,
        metrics: {
          executionId,
          duration: Date.now() - startTime,
          operation,
          timestamp: Date.now()
        }
      };
      
      console.log(`✅ Executed ${operation} in ${Date.now() - startTime}ms`);
      
      return executionResult;
      
    } catch (error) {
      // Handle error with follow-ups
      const errorFollowUps = await this.generateErrorFollowUps(operation, error as Error, context);
      
      const executionResult: ExecutionResult = {
        success: false,
        error: error as Error,
        followUps: errorFollowUps,
        metrics: {
          executionId,
          duration: Date.now() - startTime,
          operation,
          timestamp: Date.now(),
          error: true
        }
      };
      
      console.error(`❌ Failed to execute ${operation}:`, error);
      
      return executionResult;
    }
  }
  
  /**
   * Generate contextual follow-ups
   * (Building on variation 2's "follow-up readiness")
   */
  private async generateFollowUps(
    operation: string,
    result: any,
    context: OrchestratorContext
  ): Promise<any[]> {
    const followUpContext = {
      lastOperation: operation,
      lastResult: result,
      userHistory: context.threadHistory || [],
      sessionContext: context,
      timestamp: Date.now()
    };
    
    return await this.followUps.generateFollowUps(followUpContext);
  }
  
  /**
   * Generate error-specific follow-ups
   */
  private async generateErrorFollowUps(
    operation: string,
    error: Error,
    context: OrchestratorContext
  ): Promise<any[]> {
    const followUpContext = {
      lastOperation: operation,
      lastResult: null,
      error,
      userHistory: context.threadHistory || [],
      sessionContext: context,
      timestamp: Date.now()
    };
    
    return await this.followUps.generateFollowUps(followUpContext);
  }
  
  /**
   * Handle configuration changes
   */
  private handleConfigChange(event: any): void {
    console.log('⚙️ Configuration changed:', event.source);
    
    // Re-initialize components if needed
    if (event.changes.engine) {
      console.log('🔄 Engine configuration updated, reinitializing...');
      // Component reinitialization logic here
    }
  }
  
  /**
   * Setup discovery integration
   */
  private setupDiscoveryIntegration(): void {
    // Add custom discovery patterns based on thread history
    this.discovery.addPattern({
      id: 'thread-context-pattern',
      name: 'Thread Context Discovery',
      subtlety: 'gentle',
      trigger: (context) => {
        return context.operations.length >= 10;
      },
      reveal: async (context) => {
        return {
          type: 'pattern',
          message: 'Thread context patterns emerging from execution history',
          subtlety: 'gentle',
          context: { operationCount: context.operations.length },
          followUp: 'analyze-patterns',
          actionable: true
        };
      }
    });
  }
  
  /**
   * Get comprehensive framework status
   */
  getStatus(): any {
    return {
      hooks: {
        registered: this.hooks.getHookCount(),
        stats: this.hooks.getHookStats()
      },
      config: {
        valid: this.config.validateCurrentConfig().valid,
        environment: this.config.get('environment')
      },
      deepWiki: {
        cacheStats: this.deepWiki.getCacheStats()
      },
      followUps: {
        history: this.followUps.getHistory().length
      },
      discovery: {
        metrics: this.discovery.getEmergenceMetrics()
      },
      idempotency: {
        stats: this.idempotency.getStats()
      },
      observability: {
        spanStats: this.observability.getSpanStats()
      }
    };
  }
  
  /**
   * Execute follow-up action
   */
  async executeFollowUp(followUpId: string): Promise<any> {
    const history = this.followUps.getHistory();
    const followUp = history.find(f => f.id === followUpId);
    
    if (!followUp) {
      throw new Error(`Follow-up not found: ${followUpId}`);
    }
    
    return await this.followUps.executeFollowUp(followUp);
  }
  
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

/**
 * Convenience function for framework execution
 */
export async function executeWithCascade(
  operation: string,
  context: OrchestratorContext,
  handler: () => Promise<any>
): Promise<ExecutionResult> {
  const orchestrator = CascadeOrchestrator.getInstance();
  return await orchestrator.execute(operation, context, handler);
}

/**
 * Initialize framework with context-rich awareness
 */
export async function initializeCascade(): Promise<void> {
  const orchestrator = CascadeOrchestrator.getInstance();
  const status = orchestrator.getStatus();
  
  console.log('🎯 Cascade Framework Initialized');
  console.log(`📊 Status: ${status.hooks.registered} hooks, ${status.deepWiki.cacheStats.size} cached knowledge items`);
  console.log('🔗 Follow-up readiness: ENABLED');
  console.log('🔮 Veiled discovery: ACTIVE');
  console.log('🧠 DeepWiki integration: CONNECTED');
}
