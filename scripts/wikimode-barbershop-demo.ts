#!/usr/bin/env bun

/**
 * 🎯 Enhanced WikiMode + Barbershop Integration Demo
 * 
 * This demo showcases the complete integration between Enhanced WikiMode and the Barbershop system,
 * featuring advanced wiki generation, real-time profiling, dashboard widgets, and collaborative features.
 */

import { EnhancedWikiMode } from './enhanced-wikimode.ts';
import BarbershopWikiIntegration from './barbershop-wiki-integration.ts';
import { styled, FW_COLORS, colorBar } from '../lib/theme/colors.ts';

interface DemoConfig {
  wikiMode: {
    profileMode: boolean;
    barbershopMode: boolean;
    realTimeProfiling: boolean;
    collaborativeEditing: boolean;
  };
  barbershop: {
    endpoint: string;
    dashboardWidgets: any[];
    analyticsEnabled: boolean;
  };
  demo: {
    showPerformance: boolean;
    showAnalytics: boolean;
    showCollaboration: boolean;
    exportResults: boolean;
  };
}

class WikiModeBarbershopDemo {
  private wikiMode: EnhancedWikiMode;
  private barbershopIntegration: BarbershopWikiIntegration;
  private config: DemoConfig;

  constructor() {
    this.config = this.setupDemoConfig();
  }

  private setupDemoConfig(): DemoConfig {
    return {
      wikiMode: {
        profileMode: true,
        barbershopMode: true,
        realTimeProfiling: true,
        collaborativeEditing: true,
      },
      barbershop: {
        endpoint: 'http://localhost:3003',
        dashboardWidgets: [
          {
            id: 'wiki-stats-widget',
            type: 'wiki-stats',
            title: 'Wiki Statistics',
            config: { showWordCount: true, showReadingTime: true },
            position: { x: 0, y: 0, width: 400, height: 300 },
          },
          {
            id: 'performance-widget',
            type: 'performance',
            title: 'Performance Metrics',
            config: { showBenchmarks: true, showTrends: true },
            position: { x: 420, y: 0, width: 400, height: 300 },
          },
          {
            id: 'collaboration-widget',
            type: 'collaboration',
            title: 'Collaboration Metrics',
            config: { showActiveUsers: true, showVersionHistory: true },
            position: { x: 0, y: 320, width: 400, height: 250 },
          },
          {
            id: 'analytics-widget',
            type: 'analytics',
            title: 'Content Analytics',
            config: { showSEO: true, showEngagement: true },
            position: { x: 420, y: 320, width: 400, height: 250 },
          },
        ],
        analyticsEnabled: true,
      },
      demo: {
        showPerformance: true,
        showAnalytics: true,
        showCollaboration: true,
        exportResults: true,
      },
    };
  }

  async initialize(): Promise<void> {
    console.log(styled('\n🚀 Initializing Enhanced WikiMode + Barbershop Demo', 'enterprise'));
    console.log(colorBar('enterprise', 70));

    try {
      // Initialize Enhanced WikiMode
      console.log(styled('📝 Initializing Enhanced WikiMode...', 'info'));
      this.wikiMode = await EnhancedWikiMode.create({
        profileMode: this.config.wikiMode.profileMode,
        barbershopMode: this.config.wikiMode.barbershopMode,
        realTimeProfiling: this.config.wikiMode.realTimeProfiling,
        collaborativeEditing: this.config.wikiMode.collaborativeEditing,
        barbershopEndpoint: this.config.barbershop.endpoint,
        dashboardWidgets: this.config.barbershop.dashboardWidgets.map(w => w.type),
        analyticsEnabled: this.config.barbershop.analyticsEnabled,
      });

      // Initialize Barbershop Integration
      console.log(styled('🏗️ Initializing Barbershop Integration...', 'info'));
      this.barbershopIntegration = new BarbershopWikiIntegration({
        endpoint: this.config.barbershop.endpoint,
        dashboardWidgets: this.config.barbershop.dashboardWidgets,
        analyticsEnabled: this.config.barbershop.analyticsEnabled,
        collaborationEnabled: this.config.wikiMode.collaborativeEditing,
        realTimeSync: true,
      });

      await this.barbershopIntegration.initialize();

      console.log(styled('✅ Demo initialization complete!', 'success'));
      console.log('');

    } catch (error) {
      console.error(styled('❌ Demo initialization failed:', 'error'), error);
      throw error;
    }
  }

  async runCompleteDemo(): Promise<void> {
    console.log(styled('🎯 Running Complete Enhanced WikiMode + Barbershop Demo', 'enterprise'));
    console.log(colorBar('success', 70));

    // Demo 1: Display Enhanced Matrix
    await this.demoEnhancedMatrix();

    // Demo 2: Generate Wiki with Basic Template
    await this.demoBasicWikiGeneration();

    // Demo 3: Generate Wiki with Advanced Profiling
    await this.demoAdvancedWikiGeneration();

    // Demo 4: Showcase Barbershop Integration
    await this.demoBarbershopIntegration();

    // Demo 5: Collaborative Features Demo
    await this.demoCollaborativeFeatures();

    // Demo 6: Analytics and Insights
    await this.demoAnalyticsInsights();

    // Demo 7: Export and Reporting
    await this.demoExportReporting();

    console.log(styled('\n🎉 Demo Complete! Enhanced WikiMode + Barbershop Integration showcased successfully!', 'success'));
    console.log(colorBar('success', 70));
  }

  private async demoEnhancedMatrix(): Promise<void> {
    console.log(styled('\n📊 Demo 1: Enhanced Template Matrix', 'info'));
    console.log(colorBar('info', 50));

    await this.wikiMode.displayEnhancedMatrix();
    
    console.log(styled('✨ Enhanced matrix displayed with Barbershop integration indicators', 'success'));
    console.log('');
  }

  private async demoBasicWikiGeneration(): Promise<void> {
    console.log(styled('📝 Demo 2: Basic Wiki Generation', 'info'));
    console.log(colorBar('info', 50));

    try {
      const result = await this.wikiMode.generateWiki('Confluence Integration', {
        title: 'Enhanced WikiMode Demo',
        description: 'Demonstrating basic wiki generation with Barbershop integration',
        author: 'WikiMode Demo',
      });

      console.log(styled('✅ Basic wiki generation completed', 'success'));
      console.log(`   Generation Time: ${result.metadata.generationTime.toFixed(2)}ms`);
      console.log(`   Barbershop Integration: ${result.metadata.barbershopIntegration ? 'Enabled' : 'Disabled'}`);
      console.log('');

      // Process through Barbershop integration
      if (this.config.wikiMode.barbershopMode) {
        const barbershopResult = await this.barbershopIntegration.processWikiResult(result);
        console.log(styled('🏗️ Barbershop integration processed successfully', 'success'));
        console.log(`   Dashboard Widgets: ${barbershopResult.dashboardWidgets.length}`);
        console.log(`   Analytics Data: ${Object.keys(barbershopResult.analyticsData).length} categories`);
        console.log('');
      }

    } catch (error) {
      console.error(styled('❌ Basic wiki generation failed:', 'error'), error);
    }
  }

  private async demoAdvancedWikiGeneration(): Promise<void> {
    console.log(styled('⚡ Demo 3: Advanced Wiki Generation with Profiling', 'info'));
    console.log(colorBar('info', 50));

    try {
      const result = await this.wikiMode.generateWiki('GitHub Wiki', {
        title: 'Advanced WikiMode with Performance Profiling',
        description: 'Comprehensive demo showcasing advanced features, profiling, and optimization',
        features: ['real-time-profiling', 'performance-optimization', 'analytics-integration'],
        complexity: 'advanced',
      });

      console.log(styled('✅ Advanced wiki generation completed', 'success'));
      console.log(`   Generation Time: ${result.metadata.generationTime.toFixed(2)}ms`);
      
      if (result.performance) {
        console.log(`   Optimization Score: ${result.performance.optimizationScore}%`);
        console.log(`   Recommendations: ${result.performance.recommendations.length}`);
        
        if (result.performance.recommendations.length > 0) {
          console.log(styled('💡 Performance Recommendations:', 'warning'));
          result.performance.recommendations.forEach(rec => {
            console.log(`   • ${rec}`);
          });
        }
      }

      // Process through Barbershop integration with full features
      if (this.config.wikiMode.barbershopMode) {
        const barbershopResult = await this.barbershopIntegration.processWikiResult(result);
        
        console.log(styled('🏗️ Full Barbershop integration completed', 'success'));
        console.log(`   Dashboard Widgets: ${barbershopResult.dashboardWidgets.length}`);
        console.log(`   Analytics Categories: ${Object.keys(barbershopResult.analyticsData).length}`);
        console.log(`   Collaboration Metrics: ${Object.keys(barbershopResult.collaborationMetrics).length}`);
        console.log(`   Performance Insights: ${Object.keys(barbershopResult.performanceInsights).length}`);
      }

      console.log('');

    } catch (error) {
      console.error(styled('❌ Advanced wiki generation failed:', 'error'), error);
    }
  }

  private async demoBarbershopIntegration(): Promise<void> {
    console.log(styled('🏗️ Demo 4: Barbershop Integration Showcase', 'info'));
    console.log(colorBar('info', 50));

    // Show connection status
    const connectionStatus = this.barbershopIntegration.getConnectionStatus();
    console.log(styled('📡 Connection Status:', 'muted'));
    console.log(`   Connected: ${connectionStatus.connected ? styled('✅', 'success') : styled('❌', 'error')}`);
    console.log(`   Health: ${connectionStatus.health}`);
    console.log(`   Endpoint: ${connectionStatus.endpoint}`);
    console.log('');

    // Generate content for integration demo
    try {
      const result = await this.wikiMode.generateWiki('Internal Docs Portal', {
        title: 'Barbershop Integration Demo',
        description: 'Comprehensive demonstration of Barbershop system integration',
        sections: ['overview', 'integration', 'widgets', 'analytics', 'collaboration'],
      });

      const barbershopResult = await this.barbershopIntegration.processWikiResult(result);

      // Display dashboard widgets
      console.log(styled('📊 Dashboard Widgets Generated:', 'success'));
      barbershopResult.dashboardWidgets.forEach((widget, index) => {
        console.log(`   ${index + 1}. ${widget.title} (${widget.type})`);
        console.log(`      Position: (${widget.position.x}, ${widget.position.y}) - ${widget.position.width}x${widget.position.height}`);
      });

      console.log('');

      // Display analytics summary
      if (this.config.demo.showAnalytics) {
        console.log(styled('📈 Analytics Summary:', 'success'));
        const analytics = barbershopResult.analyticsData;
        
        if (analytics.contentAnalytics) {
          console.log(`   Content Words: ${analytics.contentAnalytics.totalWords}`);
          console.log(`   Reading Time: ${analytics.contentAnalytics.readingTime} min`);
          console.log(`   Complexity: ${analytics.contentAnalytics.complexity}`);
        }
        
        if (analytics.performanceAnalytics) {
          console.log(`   Efficiency: ${analytics.performanceAnalytics.efficiency.toFixed(1)}%`);
        }
        
        console.log('');
      }

    } catch (error) {
      console.error(styled('❌ Barbershop integration demo failed:', 'error'), error);
    }
  }

  private async demoCollaborativeFeatures(): Promise<void> {
    console.log(styled('👥 Demo 5: Collaborative Features', 'info'));
    console.log(colorBar('info', 50));

    if (!this.config.demo.showCollaboration) {
      console.log(styled('Collaborative features disabled in demo config', 'muted'));
      console.log('');
      return;
    }

    try {
      const result = await this.wikiMode.generateWiki('Notion Sync', {
        title: 'Collaborative Wiki Editing Demo',
        description: 'Demonstrating real-time collaboration and version control features',
        collaborative: true,
        versionControl: true,
      });

      const barbershopResult = await this.barbershopIntegration.processWikiResult(result);

      console.log(styled('🤝 Collaborative Features Enabled:', 'success'));
      
      const collaboration = barbershopResult.collaborationMetrics;
      if (collaboration.editingMetrics) {
        console.log(`   Active Contributors: ${collaboration.editingMetrics.activeContributors}`);
        console.log(`   Average Edit Time: ${collaboration.editingMetrics.averageEditTime} min`);
        console.log(`   Edit Frequency: ${collaboration.editingMetrics.editFrequency} per day`);
      }
      
      if (collaboration.reviewMetrics) {
        console.log(`   Pending Reviews: ${collaboration.reviewMetrics.pendingReviews}`);
        console.log(`   Approval Rate: ${collaboration.reviewMetrics.approvalRate}%`);
      }
      
      if (collaboration.communicationMetrics) {
        console.log(`   Comments Count: ${collaboration.communicationMetrics.commentsCount}`);
        console.log(`   Discussions Count: ${collaboration.communicationMetrics.discussionsCount}`);
      }

      console.log('');

    } catch (error) {
      console.error(styled('❌ Collaborative features demo failed:', 'error'), error);
    }
  }

  private async demoAnalyticsInsights(): Promise<void> {
    console.log(styled('🔍 Demo 6: Analytics and Insights', 'info'));
    console.log(colorBar('info', 50));

    if (!this.config.demo.showAnalytics) {
      console.log(styled('Analytics features disabled in demo config', 'muted'));
      console.log('');
      return;
    }

    try {
      const result = await this.wikiMode.generateWiki('API Reference', {
        title: 'Advanced Analytics and Insights Demo',
        description: 'Comprehensive analytics, performance insights, and optimization recommendations',
        includeAnalytics: true,
        includePerformanceMetrics: true,
      });

      const barbershopResult = await this.barbershopIntegration.processWikiResult(result);

      // Display performance insights
      console.log(styled('⚡ Performance Insights:', 'success'));
      const insights = barbershopResult.performanceInsights;
      
      if (insights.generationInsights) {
        const genInsights = insights.generationInsights;
        console.log(`   Generation Percentile: ${genInsights.timeAnalysis.percentile}%`);
        console.log(`   Trend: ${genInsights.timeAnalysis.trend}`);
        console.log(`   Target Score: ${genInsights.optimizationInsights.targetScore}%`);
        
        if (genInsights.optimizationInsights.improvementAreas.length > 0) {
          console.log(styled('   Improvement Areas:', 'warning'));
          genInsights.optimizationInsights.improvementAreas.forEach(area => {
            console.log(`     • ${area}`);
          });
        }
      }

      console.log('');

      // Display content insights
      console.log(styled('📄 Content Insights:', 'success'));
      if (insights.contentInsights) {
        const contentInsights = insights.contentInsights;
        console.log(`   Sections: ${contentInsights.structureAnalysis.sections}`);
        console.log(`   Balance Score: ${contentInsights.structureAnalysis.balanceScore}%`);
        console.log(`   Overall Quality: ${contentInsights.qualityMetrics.overallScore}%`);
        
        if (contentInsights.optimizationSuggestions.length > 0) {
          console.log(styled('   Content Suggestions:', 'warning'));
          contentInsights.optimizationSuggestions.forEach(suggestion => {
            console.log(`     • ${suggestion}`);
          });
        }
      }

      console.log('');

    } catch (error) {
      console.error(styled('❌ Analytics insights demo failed:', 'error'), error);
    }
  }

  private async demoExportReporting(): Promise<void> {
    console.log(styled('📤 Demo 7: Export and Reporting', 'info'));
    console.log(colorBar('info', 50));

    if (!this.config.demo.exportResults) {
      console.log(styled('Export features disabled in demo config', 'muted'));
      console.log('');
      return;
    }

    try {
      // Generate content for export
      await this.wikiMode.generateWiki('Confluence Integration', {
        title: 'Export and Reporting Demo',
        description: 'Demonstrating export capabilities in multiple formats',
      });

      await this.wikiMode.generateWiki('GitHub Wiki', {
        title: 'Advanced Export Features',
        description: 'Showcasing comprehensive export and reporting capabilities',
      });

      // Export in different formats
      console.log(styled('📄 Exporting Results in Multiple Formats:', 'success'));

      // JSON Export
      console.log('   Exporting to JSON...');
      await this.wikiMode.exportResults('json');

      // Markdown Export
      console.log('   Exporting to Markdown...');
      await this.wikiMode.exportResults('markdown');

      // HTML Export
      console.log('   Exporting to HTML...');
      await this.wikiMode.exportResults('html');

      console.log(styled('✅ All exports completed successfully', 'success'));
      console.log('   Check the output directory for exported files');
      console.log('');

    } catch (error) {
      console.error(styled('❌ Export and reporting demo failed:', 'error'), error);
    }
  }

  async runInteractiveDemo(): Promise<void> {
    console.log(styled('\n🎮 Interactive Demo Mode', 'enterprise'));
    console.log(styled('Choose which demo to run or "all" for complete demo', 'muted'));

    while (true) {
      try {
        const { createInterface } = await import('node:readline/promises');
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await rl.question(styled('\ndemo> ', 'enterprise'));
        rl.close();

        const [command] = answer.trim().split(' ');

        switch (command.toLowerCase()) {
          case 'all':
            await this.runCompleteDemo();
            break;

          case 'matrix':
            await this.demoEnhancedMatrix();
            break;

          case 'basic':
            await this.demoBasicWikiGeneration();
            break;

          case 'advanced':
            await this.demoAdvancedWikiGeneration();
            break;

          case 'barbershop':
            await this.demoBarbershopIntegration();
            break;

          case 'collaboration':
            await this.demoCollaborativeFeatures();
            break;

          case 'analytics':
            await this.demoAnalyticsInsights();
            break;

          case 'export':
            await this.demoExportReporting();
            break;

          case 'help':
            this.showDemoHelp();
            break;

          case 'exit':
          case 'quit':
            console.log(styled('👋 Exiting interactive demo mode', 'muted'));
            return;

          default:
            if (command) {
              console.log(styled(`Unknown demo: ${command}`, 'error'));
              console.log(styled('Type "help" for available demos', 'muted'));
            }
        }
      } catch (error) {
        console.error(styled('Demo error:', 'error'), error);
      }
    }
  }

  private showDemoHelp(): void {
    console.log(styled('\n📚 Available Demos:', 'info'));
    console.log(styled('  all              Run complete demo suite', 'muted'));
    console.log(styled('  matrix           Show enhanced template matrix', 'muted'));
    console.log(styled('  basic            Basic wiki generation demo', 'muted'));
    console.log(styled('  advanced         Advanced wiki generation with profiling', 'muted'));
    console.log(styled('  barbershop       Barbershop integration showcase', 'muted'));
    console.log(styled('  collaboration    Collaborative features demo', 'muted'));
    console.log(styled('  analytics        Analytics and insights demo', 'muted'));
    console.log(styled('  export           Export and reporting demo', 'muted'));
    console.log(styled('  help             Show this help message', 'muted'));
    console.log(styled('  exit             Exit interactive demo mode', 'muted'));
    console.log('');
  }
}

// CLI execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    const demo = new WikiModeBarbershopDemo();
    await demo.initialize();

    switch (command) {
      case 'interactive':
      case 'i':
        await demo.runInteractiveDemo();
        break;

      case 'complete':
      case 'all':
        await demo.runCompleteDemo();
        break;

      case 'help':
      case 'h':
        console.log(styled('🎯 Enhanced WikiMode + Barbershop Demo', 'enterprise'));
        console.log('');
        console.log(styled('Usage:', 'info'));
        console.log('  bun run wikimode-barbershop-demo.ts <command>');
        console.log('');
        console.log(styled('Commands:', 'info'));
        console.log('  interactive, i         Start interactive demo mode');
        console.log('  complete, all           Run complete demo suite');
        console.log('  help, h                 Show this help');
        console.log('');
        break;

      default:
        console.log(styled('🎯 Enhanced WikiMode + Barbershop Demo', 'enterprise'));
        console.log(styled('Starting complete demo...', 'info'));
        await demo.runCompleteDemo();
        break;
    }
  } catch (error) {
    console.error(styled('❌ Demo failed:', 'error'), error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { WikiModeBarbershopDemo };
