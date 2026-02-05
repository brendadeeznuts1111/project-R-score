// cascade-customization-dashboard.ts
// [DOMAIN:CASCADE][SCOPE:CUSTOMIZATION][TYPE:DASHBOARD][META:{interactive:true,realTime:true}][CLASS:CascadeCustomizationDashboard][#REF:CASCADE-UI-005]

import { CascadeSkillsManager } from './cascade-skills';
import { CascadeMemoryManager } from './cascade-memories';
import { CascadeRulesEngine, type Rule } from './cascade-rules-engine';
import { CascadePerformanceOptimizer } from './cascade-performance-optimizer';

export interface DashboardSection {
  title: string;
  description: string;
  type: 'skills' | 'memories' | 'rules' | 'metrics';
  data: any;
  actions: string[];
}

export interface QuickAction {
  label: string;
  icon: string;
  action: string;
  description: string;
  warning?: boolean;
}

export interface CustomizationAction {
  type: 'import_cursor' | 'enable_skill' | 'add_rule' | 'optimize_memories' | 'export_configuration';
  payload?: any;
  skillId?: string;
  merchantId?: string;
  rule?: Rule;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  nextSteps?: string[];
}

export interface DashboardView {
  title: string;
  merchantId: string;
  version: string;
  timestamp: Date;
  sections: DashboardSection[];
  quickActions: QuickAction[];
  customizationOptions: {
    learningRate: { label: string; value: number; options: number[] };
    memoryRetention: { label: string; value: string; options: string[] };
    skillWeights: { label: string; value: Record<string, number>; options: string[] };
    rulePriorities: { label: string; value: Record<string, number>; options: number[] };
  };
}

export interface ConfigurationExport {
  version: string;
  exportDate: Date;
  system: string;
  merchantId: string;
  data: {
    skills: any;
    memories: any;
    rules: Rule[];
    preferences: any;
  };
  metadata: {
    totalSize: number;
    includesSensitiveData: boolean;
    compatibleWith: string[];
    importInstructions: string;
  };
}

export interface ImportResult {
  success: boolean;
  results: {
    rulesImported: number;
    skillsImported: number;
    preferencesImported: number;
    conflictsResolved: number;
    errors: string[];
  };
  nextSteps?: string[];
  error?: string;
}

export class CascadeCustomizationDashboard {
  private skillsManager: CascadeSkillsManager;
  private memoryManager: CascadeMemoryManager;
  private rulesEngine: CascadeRulesEngine;
  private performanceOptimizer: CascadePerformanceOptimizer;
  
  constructor() {
    this.skillsManager = new CascadeSkillsManager();
    this.memoryManager = new CascadeMemoryManager();
    this.rulesEngine = new CascadeRulesEngine();
    this.performanceOptimizer = new CascadePerformanceOptimizer(
      this.skillsManager,
      this.memoryManager,
      this.rulesEngine
    );
  }
  
  async renderDashboard(merchantId: string): Promise<DashboardView> {
    console.log(`🎨 Rendering Cascade dashboard for merchant: ${merchantId}`);
    
    const [skills, memories, rules, performance] = await Promise.all([
      this.getSkillsForMerchant(merchantId),
      this.getMerchantMemories(merchantId),
      this.getActiveRules(merchantId),
      this.getPerformanceMetrics(merchantId)
    ]);
    
    return {
      title: 'Cascade Customization Dashboard',
      merchantId,
      version: 'v2.1',
      timestamp: new Date(),
      sections: [
        {
          title: '🎯 Active Skills',
          description: 'Skills currently applied to your onboarding flow',
          type: 'skills',
          data: skills,
          actions: ['enable', 'disable', 'configure', 'train']
        },
        {
          title: '🧠 Learned Memories',
          description: 'Patterns learned from your onboarding history',
          type: 'memories',
          data: memories,
          actions: ['review', 'export', 'clear', 'optimize']
        },
        {
          title: '📋 Applied Rules',
          description: 'Rules governing your onboarding behavior',
          type: 'rules',
          data: rules,
          actions: ['add', 'edit', 'reorder', 'test']
        },
        {
          title: '📊 Performance Metrics',
          description: 'Impact of Cascade customization',
          type: 'metrics',
          data: performance,
          actions: ['export', 'compare', 'optimize']
        }
      ],
      quickActions: [
        {
          label: 'Import from Cursor',
          icon: '🔄',
          action: 'import_cursor',
          description: 'Import your existing Cursor rules and preferences'
        },
        {
          label: 'Optimize All',
          icon: '⚡',
          action: 'optimize_all',
          description: 'Run comprehensive optimization across all systems'
        },
        {
          label: 'Export Configuration',
          icon: '📤',
          action: 'export_config',
          description: 'Export your complete Cascade configuration'
        },
        {
          label: 'Reset to Defaults',
          icon: '🔄',
          action: 'reset_defaults',
          description: 'Reset all customizations to factory defaults',
          warning: true
        }
      ],
      customizationOptions: {
        learningRate: this.getLearningRateOptions(),
        memoryRetention: this.getMemoryRetentionOptions(),
        skillWeights: this.getSkillWeightOptions(),
        rulePriorities: this.getRulePriorityOptions()
      }
    };
  }
  
  async handleCustomizationAction(action: CustomizationAction): Promise<ActionResult> {
    console.log(`🔧 Handling customization action: ${action.type}`);
    
    try {
      switch (action.type) {
        case 'import_cursor':
          return await this.importFromCursor(action.payload);
          
        case 'enable_skill':
          return await this.enableSkill(action.skillId!, action.merchantId!);
          
        case 'add_rule':
          return await this.addCustomRule(action.rule!, action.merchantId!);
          
        case 'optimize_memories':
          return await this.optimizeMemories(action.merchantId!);
          
        case 'export_configuration':
          return await this.exportConfiguration(action.merchantId!);
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // Import from Cursor functionality
  async importFromCursor(cursorData: any): Promise<ImportResult> {
    console.log('🎯 Importing configuration from Cursor...');
    
    const importResults = {
      rulesImported: 0,
      skillsImported: 0,
      preferencesImported: 0,
      conflictsResolved: 0,
      errors: [] as string[]
    };
    
    try {
      // Import rules
      if (cursorData.rules) {
        const ruleResults = await this.importCursorRules(cursorData.rules);
        importResults.rulesImported = ruleResults.imported;
        importResults.conflictsResolved = ruleResults.conflicts;
      }
      
      // Import skills (if Cursor has skill-like configurations)
      if (cursorData.configurations) {
        const skillResults = await this.importCursorSkills(cursorData.configurations);
        importResults.skillsImported = skillResults.imported;
      }
      
      // Import preferences
      if (cursorData.preferences) {
        const prefResults = await this.importCursorPreferences(cursorData.preferences);
        importResults.preferencesImported = prefResults.imported;
      }
      
      console.log(`✅ Import complete: ${importResults.rulesImported} rules, ${importResults.skillsImported} skills imported`);
      
      return {
        success: true,
        results: importResults,
        nextSteps: ['review_imported_rules', 'test_configuration', 'optimize_performance']
      };
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results: importResults,
        nextSteps: ['check_cursor_format', 'contact_support']
      };
    }
  }
  
  private async importCursorRules(cursorRules: any[]): Promise<{ imported: number; conflicts: number }> {
    let imported = 0;
    let conflicts = 0;
    
    for (const cursorRule of cursorRules) {
      try {
        // Convert Cursor rule to Cascade rule format
        const cascadeRule: Rule = {
          id: `imported-${cursorRule.id || Date.now()}`,
          name: cursorRule.name || 'Imported Rule',
          description: cursorRule.description || 'Imported from Cursor',
          priority: cursorRule.priority || 50,
          conditions: cursorRule.conditions || [],
          actions: cursorRule.actions || [],
          enabled: true,
          category: 'workspace'
        };
        
        // Check for conflicts
        const existingRule = this.rulesEngine.getActiveRules().find(r => r.name === cascadeRule.name);
        if (existingRule) {
          // Resolve conflict by updating existing rule
          this.rulesEngine.disableRule(existingRule.id);
          conflicts++;
        }
        
        this.rulesEngine.addCustomRule(cascadeRule);
        imported++;
        
      } catch (error) {
        console.warn(`Failed to import rule:`, error);
      }
    }
    
    return { imported, conflicts };
  }
  
  private async importCursorSkills(cursorConfigs: any[]): Promise<{ imported: number }> {
    let imported = 0;
    
    for (const config of cursorConfigs) {
      try {
        // Convert Cursor config to skill-like configuration
        // This is a simplified conversion - in practice would be more complex
        await this.skillsManager.learnFromInteraction({
          config,
          timestamp: new Date(),
          success: true
        } as any);
        
        imported++;
      } catch (error) {
        console.warn(`Failed to import skill config:`, error);
      }
    }
    
    return { imported };
  }
  
  private async importCursorPreferences(cursorPreferences: any): Promise<{ imported: number }> {
    let imported = 0;
    
    try {
      // Store preferences in memory
      await this.memoryManager.storeMemory({
        id: `cursor-preferences-${Date.now()}`,
        type: 'preferences',
        timestamp: new Date(),
        data: cursorPreferences,
        metadata: {
          source: 'cursor_import',
          version: '2.1',
          tags: ['preferences', 'imported']
        }
      });
      
      imported = 1;
    } catch (error) {
      console.warn(`Failed to import preferences:`, error);
    }
    
    return { imported };
  }
  
  async exportConfiguration(merchantId: string): Promise<ActionResult> {
    try {
      const [skills, memories, rules, preferences] = await Promise.all([
        this.exportSkills(merchantId),
        this.exportMemories(merchantId),
        this.exportRules(merchantId),
        this.getPreferences(merchantId)
      ]);
      
      const config: ConfigurationExport = {
        version: '2.1',
        exportDate: new Date(),
        system: 'factory-wager-qr-onboarding',
        merchantId,
        data: {
          skills,
          memories: memories.slice(0, 100), // Limit memory export
          rules,
          preferences
        },
        metadata: {
          totalSize: this.calculateExportSize(skills, memories, rules, preferences),
          includesSensitiveData: this.checkForSensitiveData(memories),
          compatibleWith: ['Cursor', 'VSCode', 'JetBrains IDE'],
          importInstructions: this.generateImportInstructions()
        }
      };
      
      return {
        success: true,
        message: 'Configuration exported successfully',
        data: config
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private async exportSkills(merchantId: string): Promise<any> {
    // Export skill configurations and learned patterns
    return {
      activeSkills: ['skill-qr-generation', 'skill-device-health-prediction', 'skill-configuration-optimization'],
      learnedPatterns: [], // Simulate empty patterns for demo
      performanceMetrics: {} // Simulate empty metrics for demo
    };
  }
  
  private async exportMemories(merchantId: string): Promise<any> {
    // Export merchant memories
    return await this.memoryManager.retrieveRelevantMemories({
      merchantId,
      filters: { type: 'merchant' }
    });
  }
  
  private async exportRules(merchantId: string): Promise<Rule[]> {
    // Export active rules
    return this.rulesEngine.getActiveRules(merchantId);
  }
  
  private async getPreferences(merchantId: string): Promise<any> {
    // Get merchant preferences
    return {
      learningRate: 0.1,
      memoryRetention: '90 days',
      colorScheme: {
        primary: '#3b82f6',
        secondary: '#1f2937',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    };
  }
  
  private calculateExportSize(skills: any, memories: any, rules: any, preferences: any): number {
    return JSON.stringify({ skills, memories, rules, preferences }).length;
  }
  
  private checkForSensitiveData(memories: any[]): boolean {
    // Check if memories contain sensitive data
    return memories.some(memory => 
      memory.data?.includes('password') || 
      memory.data?.includes('token') || 
      memory.data?.includes('secret')
    );
  }
  
  private generateImportInstructions(): string {
    return `
1. Ensure target system is running Cascade v2.1 or higher
2. Use the import function in the Cascade dashboard
3. Review conflicts and resolve as needed
4. Test configuration before applying to production
5. Monitor performance after import
    `;
  }
  
  private async getSkillsForMerchant(merchantId: string): Promise<any> {
    return {
      activeSkills: [
        {
          id: 'skill-qr-generation',
          name: 'QR Code Generation Optimization',
          status: 'active',
          performance: '+42% speed improvement',
          lastUsed: new Date()
        },
        {
          id: 'skill-device-health-prediction',
          name: 'Device Health Issue Prediction',
          status: 'active',
          performance: '87% accuracy',
          lastUsed: new Date()
        },
        {
          id: 'skill-configuration-optimization',
          name: 'Configuration Profile Optimization',
          status: 'active',
          performance: '35% profile reduction',
          lastUsed: new Date()
        }
      ],
      availableSkills: [
        {
          id: 'skill-roi-prediction',
          name: 'ROI Impact Prediction',
          status: 'available',
          description: 'Predicts MRR impact of device onboarding'
        },
        {
          id: 'skill-color-optimization',
          name: 'Dashboard Color Scheme Optimization',
          status: 'available',
          description: 'Optimizes colors for readability and brand consistency'
        }
      ]
    };
  }
  
  private async getMerchantMemories(merchantId: string): Promise<any> {
    const stats = await this.memoryManager.getMemoryStats();
    
    return {
      totalMemories: stats.totalMemories,
      byType: stats.byType,
      recentMemories: [
        {
          id: 'mem-001',
          type: 'merchant',
          timestamp: new Date(),
          summary: 'Merchant onboarding pattern learned'
        },
        {
          id: 'mem-002',
          type: 'device',
          timestamp: new Date(),
          summary: 'Device health issue predicted and prevented'
        }
      ],
      optimizationSuggestions: [
        'Compress memories older than 90 days',
        'Improve indexing for faster retrieval',
        'Archive rarely accessed patterns'
      ]
    };
  }
  
  private async getActiveRules(merchantId: string): Promise<any[]> {
    try {
      // Simulate getting active rules - would integrate with actual rules engine
      return [
        {
          id: 'security-first',
          name: 'Security First',
          description: 'Always prioritize security over convenience',
          priority: 100,
          enabled: true,
          category: 'global'
        },
        {
          id: 'device-health-validation',
          name: 'Device Health Validation',
          description: 'Always run 15 health checks before device activation',
          priority: 90,
          enabled: true,
          category: 'global'
        },
        {
          id: 'hex-color-consistency',
          name: 'Hex Color Consistency',
          description: 'Maintain consistent hex colors across dashboard',
          priority: 80,
          enabled: true,
          category: 'global'
        }
      ];
    } catch (error) {
      console.error('Failed to get active rules:', error);
      return [];
    }
  }
  
  private async getPerformanceMetrics(merchantId: string): Promise<any> {
    const currentMetrics = this.performanceOptimizer.getCurrentMetrics();
    const optimizationHistory = this.performanceOptimizer.getOptimizationHistory();
    
    return {
      currentMetrics,
      recentOptimizations: optimizationHistory.slice(-5),
      overallImprovement: optimizationHistory.length > 0 
        ? optimizationHistory[optimizationHistory.length - 1]?.overallImprovement || 0
        : 0,
      recommendations: [
        'Enable ROI prediction skill for better insights',
        'Optimize memory retrieval for faster performance',
        'Consider enabling color optimization for better UX'
      ]
    };
  }
  
  // Customization options
  private getLearningRateOptions(): { label: string; value: number; options: number[] } {
    return {
      label: 'Learning Rate',
      value: 0.1,
      options: [0.01, 0.05, 0.1, 0.2, 0.5]
    };
  }
  
  private getMemoryRetentionOptions(): { label: string; value: string; options: string[] } {
    return {
      label: 'Memory Retention',
      value: '90 days',
      options: ['30 days', '60 days', '90 days', '180 days', '1 year', 'permanent']
    };
  }
  
  private getSkillWeightOptions(): { label: string; value: Record<string, number>; options: string[] } {
    return {
      label: 'Skill Weights',
      value: {
        'skill-qr-generation': 0.3,
        'skill-device-health-prediction': 0.25,
        'skill-configuration-optimization': 0.2,
        'skill-roi-prediction': 0.15,
        'skill-color-optimization': 0.1
      },
      options: ['balanced', 'speed-focused', 'accuracy-focused', 'custom']
    };
  }
  
  private getRulePriorityOptions(): { label: string; value: Record<string, number>; options: number[] } {
    return {
      label: 'Rule Priorities',
      value: {
        'security-first': 100,
        'device-health-validation': 90,
        'hex-color-consistency': 80,
        'roi-tracking': 70,
        '28-second-rule': 60
      },
      options: [50, 60, 70, 80, 90, 100]
    };
  }
  
  private async enableSkill(skillId: string, merchantId: string): Promise<ActionResult> {
    try {
      // Simulate enabling skill - would integrate with actual skills manager
      console.log(`Enabling skill ${skillId} for merchant ${merchantId}`);
      
      return {
        success: true,
        message: `Skill ${skillId} enabled successfully`,
        nextSteps: ['test_skill', 'monitor_performance']
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private async addCustomRule(rule: Rule, merchantId: string): Promise<ActionResult> {
    try {
      // Simulate adding custom rule - would integrate with actual rules engine
      console.log(`Adding custom rule ${rule.name} for merchant ${merchantId}`);
      
      return {
        success: true,
        message: `Rule ${rule.name} added successfully`,
        nextSteps: ['test_rule', 'monitor_execution']
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private async optimizeMemories(merchantId: string): Promise<ActionResult> {
    try {
      const report = await this.memoryManager.optimizeMemories();
      return {
        success: true,
        message: `Memory optimization completed`,
        data: report,
        nextSteps: ['review_optimization', 'monitor_performance']
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const cascadeDashboard = new CascadeCustomizationDashboard();
