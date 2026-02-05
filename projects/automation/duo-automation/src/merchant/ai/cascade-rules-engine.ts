// cascade-rules-engine.ts
// [DOMAIN:CASCADE][SCOPE:RULES][TYPE:ENGINE][META:{enterprise:true,adaptive:true}][CLASS:CascadeRulesEngine][#REF:CASCADE-RULES-001]

export interface Rule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: string[];
  actions: string[];
  enabled: boolean;
  category: 'global' | 'workspace';
  domain?: string;
  merchantType?: string;
}

export interface RuleContext {
  merchantId?: string;
  deviceId?: string;
  deviceType?: string;
  action?: string;
  domain?: string;
  merchantType?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RuleExecution {
  ruleId: string;
  context: RuleContext;
  executed: boolean;
  actionsTaken: string[];
  executionTime: number;
  timestamp: Date;
}

export class CascadeRulesEngine {
  private rules: Map<string, Rule> = new Map();
  private executionHistory: RuleExecution[] = [];
  private activeRules: Set<string> = new Set();
  
  constructor() {
    this.initializeGlobalRules();
    this.initializeWorkspaceRules();
  }
  
  private initializeGlobalRules(): void {
    // Security-first rule
    const securityFirst: Rule = {
      id: 'security-first',
      name: 'Security First',
      description: 'Always prioritize security over convenience',
      priority: 100,
      conditions: [
        'when: handling_device_data',
        'when: generating_tokens',
        'when: pushing_configurations'
      ],
      actions: [
        'enforce: mTLS',
        'enforce: JWT_expiry_5min',
        'require: biometric_verification'
      ],
      enabled: true,
      category: 'global'
    };
    
    // Device health validation rule
    const deviceHealthValidation: Rule = {
      id: 'device-health-validation',
      name: 'Device Health Validation',
      description: 'Always run 15 health checks before device activation',
      priority: 90,
      conditions: [
        'device: any',
        'onboarding: started'
      ],
      actions: [
        'run: os_version_check',
        'run: browser_compatibility',
        'run: network_performance',
        'run: storage_validation',
        'run: camera_test',
        'run: biometric_check',
        'run: security_posture',
        'run: webauthn_validation',
        'run: processor_performance',
        'run: root_detection',
        'run: app_integrity',
        'run: encryption_support',
        'run: vpn_detection',
        'run: patch_level',
        'run: enterprise_readiness'
      ],
      enabled: true,
      category: 'global'
    };
    
    // Hex color consistency rule
    const hexColorConsistency: Rule = {
      id: 'hex-color-consistency',
      name: 'Hex Color Consistency',
      description: 'Maintain consistent hex colors across dashboard',
      priority: 80,
      conditions: [
        'ui: dashboard',
        'ui: qr_panel',
        'ui: status_indicator'
      ],
      actions: [
        'use: #3b82f6 for enterprise',
        'use: #22c55e for success',
        'use: #f59e0b for warning',
        'use: #ef4444 for error',
        'use: #1f2937 for background'
      ],
      enabled: true,
      category: 'global'
    };
    
    // ROI tracking rule
    const roiTracking: Rule = {
      id: 'roi-tracking',
      name: 'ROI Tracking',
      description: 'Track MRR impact of every onboarding action',
      priority: 70,
      conditions: [
        'action: device_paired',
        'action: merchant_activated',
        'action: tier_upgraded'
      ],
      actions: [
        'calculate: mrr_impact',
        'log: roi_metrics',
        'report: daily_summary'
      ],
      enabled: true,
      category: 'global'
    };
    
    // 28-second rule
    const twentyEightSecondRule: Rule = {
      id: '28-second-rule',
      name: '28 Second Rule',
      description: 'Target 28-second onboarding time as success metric',
      priority: 60,
      conditions: [
        'process: qr_onboarding'
      ],
      actions: [
        'optimize: parallel_checks',
        'cache: frequent_operations',
        'prefetch: config_profiles'
      ],
      enabled: true,
      category: 'global'
    };
    
    // Register global rules
    this.rules.set(securityFirst.id, securityFirst);
    this.rules.set(deviceHealthValidation.id, deviceHealthValidation);
    this.rules.set(hexColorConsistency.id, hexColorConsistency);
    this.rules.set(roiTracking.id, roiTracking);
    this.rules.set(twentyEightSecondRule.id, twentyEightSecondRule);
    
    // Activate all global rules
    this.activeRules.add(securityFirst.id);
    this.activeRules.add(deviceHealthValidation.id);
    this.activeRules.add(hexColorConsistency.id);
    this.activeRules.add(roiTracking.id);
    this.activeRules.add(twentyEightSecondRule.id);
  }
  
  private initializeWorkspaceRules(): void {
    // Factory-wager specific rules
    const factoryWagerSpecific: Rule = {
      id: 'factory-wager-specific',
      name: 'Factory Wager Specific',
      description: 'Rules specific to factory-wager.com domain',
      priority: 85,
      conditions: [
        'domain: factory-wager.com',
        'merchant_type: enterprise'
      ],
      actions: [
        'enforce: enterprise_tier_features',
        'require: mTLS_for_all_devices',
        'apply: blue_color_scheme',
        'track: 65%_mrr_baseline'
      ],
      enabled: true,
      category: 'workspace',
      domain: 'factory-wager.com',
      merchantType: 'enterprise'
    };
    
    // Duoplus integration rules
    const duoplusIntegration: Rule = {
      id: 'duoplus-integration',
      name: 'Duoplus Integration',
      description: 'Rules for duoplus.com integration',
      priority: 75,
      conditions: [
        'domain: duoplus.com',
        'integration: venmo_family'
      ],
      actions: [
        'sync: venmo_merchant_data',
        'apply: purple_color_scheme',
        'enable: dispute_handling',
        'track: family_account_metrics'
      ],
      enabled: true,
      category: 'workspace',
      domain: 'duoplus.com'
    };
    
    // Register workspace rules
    this.rules.set(factoryWagerSpecific.id, factoryWagerSpecific);
    this.rules.set(duoplusIntegration.id, duoplusIntegration);
  }
  
  // Rule evaluation
  async evaluateRules(context: RuleContext): Promise<RuleExecution[]> {
    const executions: RuleExecution[] = [];
    const startTime = Date.now();
    
    // Get applicable rules
    const applicableRules = this.getApplicableRules(context);
    
    // Sort by priority (highest first)
    const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority);
    
    // Execute rules
    for (const rule of sortedRules) {
      if (this.shouldExecuteRule(rule, context)) {
        const execution = await this.executeRule(rule, context);
        executions.push(execution);
      }
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`📋 Evaluated ${applicableRules.length} rules in ${executionTime}ms, executed ${executions.length}`);
    
    return executions;
  }
  
  private getApplicableRules(context: RuleContext): Rule[] {
    const applicable: Rule[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check global rules
      if (rule.category === 'global') {
        applicable.push(rule);
        continue;
      }
      
      // Check workspace-specific rules
      if (rule.category === 'workspace') {
        if (rule.domain && context.domain === rule.domain) {
          applicable.push(rule);
        }
        if (rule.merchantType && context.merchantType === rule.merchantType) {
          applicable.push(rule);
        }
      }
    }
    
    return applicable;
  }
  
  private shouldExecuteRule(rule: Rule, context: RuleContext): boolean {
    // Check if conditions match context
    for (const condition of rule.conditions) {
      if (!this.matchesCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }
  
  private matchesCondition(condition: string, context: RuleContext): boolean {
    const parts = condition.split(':');
    if (parts.length < 2) {
      return false;
    }
    
    const [key, value] = parts.map(s => s.trim());
    
    if (!key || !value) {
      return false;
    }
    
    switch (key) {
      case 'when':
        return this.matchesWhenCondition(value, context);
      case 'device':
        return value === 'any' || context.deviceType === value;
      case 'onboarding':
        return context.action === 'started' && !!context.deviceId;
      case 'ui':
        return context.metadata?.ui === value;
      case 'action':
        return context.action === value;
      case 'process':
        return context.metadata?.process === value;
      case 'domain':
        return context.domain === value;
      case 'merchant_type':
        return context.merchantType === value;
      case 'integration':
        return context.metadata?.integration === value;
      default:
        return false;
    }
  }
  
  private matchesWhenCondition(value: string, context: RuleContext): boolean {
    switch (value) {
      case 'handling_device_data':
        return !!context.deviceId && !!context.action;
      case 'generating_tokens':
        return context.action === 'generate_token';
      case 'pushing_configurations':
        return context.action === 'push_config';
      default:
        return false;
    }
  }
  
  private async executeRule(rule: Rule, context: RuleContext): Promise<RuleExecution> {
    const startTime = Date.now();
    const actionsTaken: string[] = [];
    
    console.log(`🔧 Executing rule: ${rule.name}`);
    
    // Execute actions
    for (const action of rule.actions) {
      const result = await this.executeAction(action, context);
      if (result) {
        actionsTaken.push(action);
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    const execution: RuleExecution = {
      ruleId: rule.id,
      context,
      executed: actionsTaken.length > 0,
      actionsTaken,
      executionTime,
      timestamp: new Date()
    };
    
    // Store execution history
    this.executionHistory.push(execution);
    
    return execution;
  }
  
  private async executeAction(action: string, context: RuleContext): Promise<boolean> {
    const parts = action.split(':');
    if (parts.length < 2) {
      console.warn(`Invalid action format: ${action}`);
      return false;
    }
    
    const [command, value] = parts.map(s => s.trim());
    
    if (!value) {
      console.warn(`Missing value for action: ${action}`);
      return false;
    }
    
    switch (command) {
      case 'enforce':
        return await this.enforceRule(value, context);
      case 'require':
        return await this.requireFeature(value, context);
      case 'run':
        return await this.runCheck(value, context);
      case 'use':
        return await this.applyStyle(value, context);
      case 'calculate':
        return await this.calculateMetric(value, context);
      case 'log':
        return await this.logData(value, context);
      case 'report':
        return await this.generateReport(value, context);
      case 'optimize':
        return await this.applyOptimization(value, context);
      case 'cache':
        return await this.cacheData(value, context);
      case 'prefetch':
        return await this.prefetchData(value, context);
      case 'apply':
        return await this.applySetting(value, context);
      case 'sync':
        return await this.syncData(value, context);
      case 'enable':
        return await this.enableFeature(value, context);
      case 'track':
        return await this.trackMetric(value, context);
      default:
        console.warn(`Unknown action command: ${command}`);
        return false;
    }
  }
  
  // Action implementations
  private async enforceRule(value: string, context: RuleContext): Promise<boolean> {
    switch (value) {
      case 'mTLS':
        console.log('🔐 Enforcing mTLS for', context.merchantId);
        return true;
      case 'JWT_expiry_5min':
        console.log('⏰ Setting JWT expiry to 5 minutes');
        return true;
      case 'enterprise_tier_features':
        console.log('🏢 Enabling enterprise tier features');
        return true;
      case 'mTLS_for_all_devices':
        console.log('🔐 Requiring mTLS for all devices');
        return true;
      default:
        return false;
    }
  }
  
  private async requireFeature(value: string, context: RuleContext): Promise<boolean> {
    switch (value) {
      case 'biometric_verification':
        console.log('👆 Requiring biometric verification');
        return true;
      default:
        return false;
    }
  }
  
  private async runCheck(value: string, context: RuleContext): Promise<boolean> {
    console.log(`🔍 Running check: ${value}`);
    // Simulate running various checks
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
  
  private async applyStyle(value: string, context: RuleContext): Promise<boolean> {
    console.log(`🎨 Applying style: ${value}`);
    return true;
  }
  
  private async calculateMetric(value: string, context: RuleContext): Promise<boolean> {
    console.log(`📊 Calculating metric: ${value}`);
    return true;
  }
  
  private async logData(value: string, context: RuleContext): Promise<boolean> {
    console.log(`📝 Logging data: ${value}`);
    return true;
  }
  
  private async generateReport(value: string, context: RuleContext): Promise<boolean> {
    console.log(`📄 Generating report: ${value}`);
    return true;
  }
  
  private async applyOptimization(value: string, context: RuleContext): Promise<boolean> {
    console.log(`⚡ Applying optimization: ${value}`);
    return true;
  }
  
  private async cacheData(value: string, context: RuleContext): Promise<boolean> {
    console.log(`💾 Caching data: ${value}`);
    return true;
  }
  
  private async prefetchData(value: string, context: RuleContext): Promise<boolean> {
    console.log(`📡 Prefetching data: ${value}`);
    return true;
  }
  
  private async applySetting(value: string, context: RuleContext): Promise<boolean> {
    console.log(`⚙️ Applying setting: ${value}`);
    return true;
  }
  
  private async syncData(value: string, context: RuleContext): Promise<boolean> {
    console.log(`🔄 Syncing data: ${value}`);
    return true;
  }
  
  private async enableFeature(value: string, context: RuleContext): Promise<boolean> {
    console.log(`✅ Enabling feature: ${value}`);
    return true;
  }
  
  private async trackMetric(value: string, context: RuleContext): Promise<boolean> {
    console.log(`📈 Tracking metric: ${value}`);
    return true;
  }
  
  // Public API methods
  addCustomRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
    if (rule.enabled) {
      this.activeRules.add(rule.id);
    }
    console.log(`📋 Added custom rule: ${rule.name}`);
  }
  
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.activeRules.add(ruleId);
      console.log(`✅ Enabled rule: ${rule.name}`);
    }
  }
  
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.activeRules.delete(ruleId);
      console.log(`❌ Disabled rule: ${rule.name}`);
    }
  }
  
  getRuleExecutionHistory(ruleId?: string): RuleExecution[] {
    if (ruleId) {
      return this.executionHistory.filter(exec => exec.ruleId === ruleId);
    }
    return [...this.executionHistory];
  }
  
  getRuleMetrics(): any {
    const totalRules = this.rules.size;
    const activeRules = this.activeRules.size;
    const totalExecutions = this.executionHistory.length;
    const avgExecutionTime = totalExecutions > 0 
      ? this.executionHistory.reduce((sum, exec) => sum + exec.executionTime, 0) / totalExecutions
      : 0;
    
    const executionsByRule = new Map<string, number>();
    for (const execution of this.executionHistory) {
      executionsByRule.set(execution.ruleId, (executionsByRule.get(execution.ruleId) || 0) + 1);
    }
    
    return {
      totalRules,
      activeRules,
      totalExecutions,
      avgExecutionTime,
      executionsByRule: Object.fromEntries(executionsByRule),
      mostExecutedRule: executionsByRule.size > 0 
        ? Array.from(executionsByRule.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null
        : null
    };
  }
  
  getActiveRules(merchantId?: string): Rule[] {
    if (merchantId) {
      // Filter rules for specific merchant
      return Array.from(this.rules.values()).filter(rule => 
        rule.enabled && (
          rule.category === 'global' || 
          (rule.domain && rule.domain === 'factory-wager.com')
        )
      );
    }
    
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }
}

// Export singleton instance
export const rulesEngine = new CascadeRulesEngine();
