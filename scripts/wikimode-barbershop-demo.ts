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
    console.info(styled('\n🚀 Initializing Enhanced WikiMode + Barbershop Demo', 'enterprise'));
    console.info(colorBar('enterprise', 70));

    try {
      // Initialize Enhanced WikiMode
      console.info(styled('📝 Initializing Enhanced WikiMode...', 'info'));
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
      console.info(styled('🏗️ Initializing Barbershop Integration...', 'info'));
      this.barbershopIntegration = new BarbershopWikiIntegration({
        endpoint: this.config.barbershop.endpoint,
        dashboardWidgets: this.config.barbershop.dashboardWidgets,
        analyticsEnabled: this.config.barbershop.analyticsEnabled,
        collaborationEnabled: this.config.wikiMode.collaborativeEditing,
        realTimeSync: true,
      });

      await this.barbershopIntegration.initialize();

      console.info(styled('✅ Demo initialization complete!', 'success'));
      console.info('');
    } catch (error) {
      console.error(styled('❌ Demo initialization failed:', 'error'), error);
      throw error;
    }
  }

  async runCompleteDemo(): Promise<void> {
    console.info(styled('🎯 Running Complete Enhanced WikiMode + Barbershop Demo', 'enterprise'));
    console.info(colorBar('success', 70));

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

    console.info(
      styled(
        '\n🎉 Demo Complete! Enhanced WikiMode + Barbershop Integration showcased successfully!',
        'success'
      )
    );
    console.info(colorBar('success', 70));
  }

  private async demoEnhancedMatrix(): Promise<void> {
    console.info(styled('\n📊 Demo 1: Enhanced Template Matrix', 'info'));
    console.info(colorBar('info', 50));

    await this.wikiMode.displayEnhancedMatrix();

    console.info(
      styled('✨ Enhanced matrix displayed with Barbershop integration indicators', 'success')
    );
    console.info('');
  }

  private async demoBasicWikiGeneration(): Promise<void> {
    console.info(styled('📝 Demo 2: Basic Wiki Generation', 'info'));
    console.info(colorBar('info', 50));

    try {
      const result = await this.wikiMode.generateWiki('Confluence Integration', {
        title: 'Enhanced WikiMode Demo',
        description: 'Demonstrating basic wiki generation with Barbershop integration',
        author: 'WikiMode Demo',
      });

      console.info(styled('✅ Basic wiki generation completed', 'success'));
      console.info(`   Generation Time: ${result.metadata.generationTime.toFixed(2)}ms`);
      console.info(
        `   Barbershop Integration: ${result.metadata.barbershopIntegration ? 'Enabled' : 'Disabled'}`
      );
      console.info('');

      // Process through Barbershop integration
      if (this.config.wikiMode.barbershopMode) {
        const barbershopResult = await this.barbershopIntegration.processWikiResult(result);
        console.info(styled('🏗️ Barbershop integration processed successfully', 'success'));
        console.info(`   Dashboard Widgets: ${barbershopResult.dashboardWidgets.length}`);
        console.info(
          `   Analytics Data: ${Object.keys(barbershopResult.analyticsData).length} categories`
        );
        console.info('');
      }
    } catch (error) {
      console.error(styled('❌ Basic wiki generation failed:', 'error'), error);
    }
  }

  private async demoAdvancedWikiGeneration(): Promise<void> {
    console.info(styled('⚡ Demo 3: Advanced Wiki Generation with Profiling', 'info'));
    console.info(colorBar('info', 50));

    try {
      const result = await this.wikiMode.generateWiki('GitHub Wiki', {
        title: 'Advanced WikiMode with Performance Profiling',
        description: 'Comprehensive demo showcasing advanced features, profiling, and optimization',
        features: ['real-time-profiling', 'performance-optimization', 'analytics-integration'],
        complexity: 'advanced',
      });

      console.info(styled('✅ Advanced wiki generation completed', 'success'));
      console.info(`   Generation Time: ${result.metadata.generationTime.toFixed(2)}ms`);

      if (result.performance) {
        console.info(`   Optimization Score: ${result.performance.optimizationScore}%`);
        console.info(`   Recommendations: ${result.performance.recommendations.length}`);

        if (result.performance.recommendations.length > 0) {
          console.info(styled('💡 Performance Recommendations:', 'warning'));
          result.performance.recommendations.forEach(rec => {
            console.info(`   • ${rec}`);
          });
        }
      }

      // Process through Barbershop integration with full features
      if (this.config.wikiMode.barbershopMode) {
        const barbershopResult = await this.barbershopIntegration.processWikiResult(result);

        console.info(styled('🏗️ Full Barbershop integration completed', 'success'));
        console.info(`   Dashboard Widgets: ${barbershopResult.dashboardWidgets.length}`);
        console.info(
          `   Analytics Categories: ${Object.keys(barbershopResult.analyticsData).length}`
        );
        console.info(
          `   Collaboration Metrics: ${Object.keys(barbershopResult.collaborationMetrics).length}`
        );
        console.info(
          `   Performance Insights: ${Object.keys(barbershopResult.performanceInsights).length}`
        );
      }

      console.info('');
    } catch (error) {
      console.error(styled('❌ Advanced wiki generation failed:', 'error'), error);
    }
  }

  private async demoBarbershopIntegration(): Promise<void> {
    console.info(styled('🏗️ Demo 4: Barbershop Integration Showcase', 'info'));
    console.info(colorBar('info', 50));

    // Show connection status
    const connectionStatus = this.barbershopIntegration.getConnectionStatus();
    console.info(styled('📡 Connection Status:', 'muted'));
    console.info(
      `   Connected: ${connectionStatus.connected ? styled('✅', 'success') : styled('❌', 'error')}`
    );
    console.info(`   Health: ${connectionStatus.health}`);
    console.info(`   Endpoint: ${connectionStatus.endpoint}`);
    console.info('');

    // Generate content for integration demo
    try {
      const result = await this.wikiMode.generateWiki('Internal Docs Portal', {
        title: 'Barbershop Integration Demo',
        description: 'Comprehensive demonstration of Barbershop system integration',
        sections: ['overview', 'integration', 'widgets', 'analytics', 'collaboration'],
      });

      const barbershopResult = await this.barbershopIntegration.processWikiResult(result);

      // Display dashboard widgets
      console.info(styled('📊 Dashboard Widgets Generated:', 'success'));
      barbershopResult.dashboardWidgets.forEach((widget, index) => {
        console.info(`   ${index + 1}. ${widget.title} (${widget.type})`);
        console.info(
          `      Position: (${widget.position.x}, ${widget.position.y}) - ${widget.position.width}x${widget.position.height}`
        );
      });

      console.info('');

      // Display analytics summary
      if (this.config.demo.showAnalytics) {
        console.info(styled('📈 Analytics Summary:', 'success'));
        const analytics = barbershopResult.analyticsData;

        if (analytics.contentAnalytics) {
          console.info(`   Content Words: ${analytics.contentAnalytics.totalWords}`);
          console.info(`   Reading Time: ${analytics.contentAnalytics.readingTime} min`);
          console.info(`   Complexity: ${analytics.contentAnalytics.complexity}`);
        }

        if (analytics.performanceAnalytics) {
          console.info(`   Efficiency: ${analytics.performanceAnalytics.efficiency.toFixed(1)}%`);
        }

        console.info('');
      }
    } catch (error) {
      console.error(styled('❌ Barbershop integration demo failed:', 'error'), error);
    }
  }

  private async demoCollaborativeFeatures(): Promise<void> {
    console.info(styled('👥 Demo 5: Collaborative Features', 'info'));
    console.info(colorBar('info', 50));

    if (!this.config.demo.showCollaboration) {
      console.info(styled('Collaborative features disabled in demo config', 'muted'));
      console.info('');
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

      console.info(styled('🤝 Collaborative Features Enabled:', 'success'));

      const collaboration = barbershopResult.collaborationMetrics;
      if (collaboration.editingMetrics) {
        console.info(`   Active Contributors: ${collaboration.editingMetrics.activeContributors}`);
        console.info(`   Average Edit Time: ${collaboration.editingMetrics.averageEditTime} min`);
        console.info(`   Edit Frequency: ${collaboration.editingMetrics.editFrequency} per day`);
      }

      if (collaboration.reviewMetrics) {
        console.info(`   Pending Reviews: ${collaboration.reviewMetrics.pendingReviews}`);
        console.info(`   Approval Rate: ${collaboration.reviewMetrics.approvalRate}%`);
      }

      if (collaboration.communicationMetrics) {
        console.info(`   Comments Count: ${collaboration.communicationMetrics.commentsCount}`);
        console.info(
          `   Discussions Count: ${collaboration.communicationMetrics.discussionsCount}`
        );
      }

      console.info('');
    } catch (error) {
      console.error(styled('❌ Collaborative features demo failed:', 'error'), error);
    }
  }

  private async demoAnalyticsInsights(): Promise<void> {
    console.info(styled('🔍 Demo 6: Analytics and Insights', 'info'));
    console.info(colorBar('info', 50));

    if (!this.config.demo.showAnalytics) {
      console.info(styled('Analytics features disabled in demo config', 'muted'));
      console.info('');
      return;
    }

    try {
      const result = await this.wikiMode.generateWiki('API Reference', {
        title: 'Advanced Analytics and Insights Demo',
        description:
          'Comprehensive analytics, performance insights, and optimization recommendations',
        includeAnalytics: true,
        includePerformanceMetrics: true,
      });

      const barbershopResult = await this.barbershopIntegration.processWikiResult(result);

      // Display performance insights
      console.info(styled('⚡ Performance Insights:', 'success'));
      const insights = barbershopResult.performanceInsights;

      if (insights.generationInsights) {
        const genInsights = insights.generationInsights;
        console.info(`   Generation Percentile: ${genInsights.timeAnalysis.percentile}%`);
        console.info(`   Trend: ${genInsights.timeAnalysis.trend}`);
        console.info(`   Target Score: ${genInsights.optimizationInsights.targetScore}%`);

        if (genInsights.optimizationInsights.improvementAreas.length > 0) {
          console.info(styled('   Improvement Areas:', 'warning'));
          genInsights.optimizationInsights.improvementAreas.forEach(area => {
            console.info(`     • ${area}`);
          });
        }
      }

      console.info('');

      // Display content insights
      console.info(styled('📄 Content Insights:', 'success'));
      if (insights.contentInsights) {
        const contentInsights = insights.contentInsights;
        console.info(`   Sections: ${contentInsights.structureAnalysis.sections}`);
        console.info(`   Balance Score: ${contentInsights.structureAnalysis.balanceScore}%`);
        console.info(`   Overall Quality: ${contentInsights.qualityMetrics.overallScore}%`);

        if (contentInsights.optimizationSuggestions.length > 0) {
          console.info(styled('   Content Suggestions:', 'warning'));
          contentInsights.optimizationSuggestions.forEach(suggestion => {
            console.info(`     • ${suggestion}`);
          });
        }
      }

      console.info('');
    } catch (error) {
      console.error(styled('❌ Analytics insights demo failed:', 'error'), error);
    }
  }

  private async demoExportReporting(): Promise<void> {
    console.info(styled('📤 Demo 7: Export and Reporting', 'info'));
    console.info(colorBar('info', 50));

    if (!this.config.demo.exportResults) {
      console.info(styled('Export features disabled in demo config', 'muted'));
      console.info('');
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
      console.info(styled('📄 Exporting Results in Multiple Formats:', 'success'));

      // JSON Export
      console.info('   Exporting to JSON...');
      await this.wikiMode.exportResults('json');

      // Markdown Export
      console.info('   Exporting to Markdown...');
      await this.wikiMode.exportResults('markdown');

      // HTML Export
      console.info('   Exporting to HTML...');
      await this.wikiMode.exportResults('html');

      console.info(styled('✅ All exports completed successfully', 'success'));
      console.info('   Check the output directory for exported files');
      console.info('');
    } catch (error) {
      console.error(styled('❌ Export and reporting demo failed:', 'error'), error);
    }
  }

  async runInteractiveDemo(): Promise<void> {
    console.info(styled('\n🎮 Interactive Demo Mode', 'enterprise'));
    console.info(styled('Choose which demo to run or "all" for complete demo', 'muted'));

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
            console.info(styled('👋 Exiting interactive demo mode', 'muted'));
            return;

          default:
            if (command) {
              console.info(styled(`Unknown demo: ${command}`, 'error'));
              console.info(styled('Type "help" for available demos', 'muted'));
            }
        }
      } catch (error) {
        console.error(styled('Demo error:', 'error'), error);
      }
    }
  }

  private showDemoHelp(): void {
    console.info(styled('\n📚 Available Demos:', 'info'));
    console.info(styled('  all              Run complete demo suite', 'muted'));
    console.info(styled('  matrix           Show enhanced template matrix', 'muted'));
    console.info(styled('  basic            Basic wiki generation demo', 'muted'));
    console.info(styled('  advanced         Advanced wiki generation with profiling', 'muted'));
    console.info(styled('  barbershop       Barbershop integration showcase', 'muted'));
    console.info(styled('  collaboration    Collaborative features demo', 'muted'));
    console.info(styled('  analytics        Analytics and insights demo', 'muted'));
    console.info(styled('  export           Export and reporting demo', 'muted'));
    console.info(styled('  help             Show this help message', 'muted'));
    console.info(styled('  exit             Exit interactive demo mode', 'muted'));
    console.info('');
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
        console.info(styled('🎯 Enhanced WikiMode + Barbershop Demo', 'enterprise'));
        console.info('');
        console.info(styled('Usage:', 'info'));
        console.info('  bun run wikimode-barbershop-demo.ts <command>');
        console.info('');
        console.info(styled('Commands:', 'info'));
        console.info('  interactive, i         Start interactive demo mode');
        console.info('  complete, all           Run complete demo suite');
        console.info('  help, h                 Show this help');
        console.info('');
        break;

      default:
        console.info(styled('🎯 Enhanced WikiMode + Barbershop Demo', 'enterprise'));
        console.info(styled('Starting complete demo...', 'info'));
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
