#!/usr/bin/env bun

/**
 * Enhanced CLI v4.1 - Artifact System Integration
 * 
 * Extending the Enhanced CLI with next-generation artifact management
 * capabilities powered by AI and intelligent discovery.
 */

import { Command } from 'commander';
import { EnhancedArtifactSystemV2 } from '../src/@core/artifacts/enhanced-system-v2.js';

interface ArtifactCLIOptions {
  verbose?: boolean;
  format?: 'table' | 'json' | 'markdown';
  includeRelated?: boolean;
  aiInsights?: boolean;
  relationshipDepth?: number;
  analytics?: boolean;
  governance?: boolean;
}

class ArtifactCLI {
  private artifactSystem: EnhancedArtifactSystemV2;

  constructor() {
    this.artifactSystem = new EnhancedArtifactSystemV2();
  }

  async run(): Promise<void> {
    const program = new Command();
    
    program
      .name('factory-wager-artifacts')
      .description('Enhanced Artifact System v2.0 - AI-Powered Discovery & Management')
      .version('2.0.0');

    // Discovery command
    program
      .command('discover')
      .description('AI-powered artifact discovery')
      .argument('<query>', 'Search query with tags and keywords')
      .option('-r, --related', 'Include related artifacts')
      .option('-a, --ai-insights', 'Include AI-powered insights')
      .option('-d, --depth <number>', 'Relationship traversal depth', '2')
      .option('-f, --format <format>', 'Output format', 'table')
      .option('-v, --verbose', 'Verbose output')
      .action(async (query, options) => {
        await this.handleDiscoverCommand(query, options);
      });

    // Analytics command
    program
      .command('analytics')
      .description('Generate comprehensive artifact analytics')
      .option('-f, --format <format>', 'Output format', 'table')
      .option('-v, --verbose', 'Verbose output')
      .action(async (options) => {
        await this.handleAnalyticsCommand(options);
      });

    // Recommendations command
    program
      .command('recommend')
      .description('Get intelligent artifact recommendations')
      .argument('<artifact-id>', 'Artifact ID or path')
      .option('-f, --format <format>', 'Output format', 'table')
      .option('-v, --verbose', 'Verbose output')
      .action(async (artifactId, options) => {
        await this.handleRecommendCommand(artifactId, options);
      });

    // Governance command
    program
      .command('governance')
      .description('Artifact governance and management')
      .option('--health-check', 'Run system health check')
      .option('--cleanup', 'Identify cleanup opportunities')
      .option('--optimize', 'Suggest optimizations')
      .option('-v, --verbose', 'Verbose output')
      .action(async (options) => {
        await this.handleGovernanceCommand(options);
      });

    // Interactive command
    program
      .command('interactive')
      .description('Start interactive artifact management mode')
      .option('-v, --verbose', 'Verbose output')
      .action(async (options) => {
        await this.startInteractiveMode(options);
      });

    await program.parseAsync();
  }

  private async handleDiscoverCommand(query: string, options: any): Promise<void> {
    console.info('🔍 AI-Powered Artifact Discovery');
    console.info('==================================\n');
    
    console.info(`🔎 Searching for: "${query}"`);
    if (options.related) console.info('🔗 Including related artifacts');
    if (options.aiInsights) console.info('🤖 Including AI insights');
    console.info(`📊 Relationship depth: ${options.depth}\n`);
    
    try {
      await this.artifactSystem.initialize();
      
      const discovery = await this.artifactSystem.discoverArtifacts(query, {
        includeRelated: options.related,
        aiInsights: options.aiInsights,
        relationshipDepth: parseInt(options.depth)
      });
      
      // Display artifacts
      console.info('📦 Discovered Artifacts:');
      console.info('========================');
      
      if (discovery.artifacts.length === 0) {
        console.info('❌ No artifacts found matching your query');
        return;
      }
      
      discovery.artifacts.forEach((artifact, index) => {
        console.info(`${index + 1}. ${artifact.title}`);
        console.info(`   📁 ${artifact.path}`);
        console.info(`   🏷️  ${artifact.tags.join(', ')}`);
        console.info(`   📊 Popularity: ${artifact.metadata.metrics.popularity}/100`);
        console.info(`   🛡️  Security: ${artifact.metadata.metrics.securityScore}/100`);
        
        if (options.verbose) {
          console.info(`   📝 ${artifact.description}`);
          console.info(`   🔧 Tech: ${artifact.tech.join(', ')}`);
          console.info(`   📈 Status: ${artifact.status}`);
        }
        console.info();
      });
      
      // Display AI insights
      if (options.aiInsights && discovery.insights.length > 0) {
        console.info('🤖 AI Insights:');
        console.info('===============');
        discovery.insights.forEach((insight, index) => {
          const icon = insight.type === 'warning' ? '⚠️' : 
                     insight.type === 'recommendation' ? '💡' : 
                     insight.type === 'opportunity' ? '🎯' : '📋';
          console.info(`${icon} ${insight.message}`);
          console.info(`   Confidence: ${Math.round(insight.confidence * 100)}%`);
          console.info(`   Actions: ${insight.actions.join(', ')}`);
          console.info();
        });
      }
      
      // Display relationships summary
      if (options.related) {
        console.info('🔗 Relationship Summary:');
        console.info('=======================');
        console.info(`Total relationship nodes: ${discovery.relationships.size}`);
        
        let totalRelationships = 0;
        for (const relationships of discovery.relationships.values()) {
          totalRelationships += relationships.length;
        }
        console.info(`Total relationships: ${totalRelationships}`);
        console.info();
      }
      
    } catch (error) {
      console.error('❌ Discovery failed:', error instanceof Error ? error.message : error);
    }
  }

  private async handleAnalyticsCommand(options: any): Promise<void> {
    console.info('📊 Artifact Analytics Dashboard');
    console.info('===============================\n');
    
    try {
      await this.artifactSystem.initialize();
      const analytics = await this.artifactSystem.generateAnalytics();
      
      // Overview
      console.info('📈 System Overview:');
      console.info('==================');
      console.info(`Total artifacts: ${analytics.overview.totalArtifacts}`);
      console.info(`Active artifacts: ${analytics.overview.activeArtifacts}`);
      console.info(`Deprecated artifacts: ${analytics.overview.deprecatedArtifacts}`);
      console.info(`Domains: ${analytics.overview.domains.join(', ')}`);
      console.info(`Technologies: ${analytics.overview.technologies.join(', ')}\n`);
      
      // Trends
      console.info('📊 Trends Analysis:');
      console.info('==================');
      
      console.info('🔥 Popular Artifacts:');
      analytics.trends.popularityTrend.slice(0, 5).forEach((item, index) => {
        console.info(`  ${index + 1}. ${item.artifact} (${item.popularity}% popularity)`);
      });
      
      console.info('\n💻 Technology Adoption:');
      analytics.trends.technologyAdoption.slice(0, 5).forEach((item, index) => {
        console.info(`  ${index + 1}. ${item.tech} (${item.usage} artifacts)`);
      });
      
      console.info('\n🤖 AI Insights:');
      analytics.insights.forEach((insight, index) => {
        const icon = insight.type === 'warning' ? '⚠️' : 
                   insight.type === 'recommendation' ? '💡' : 
                   insight.type === 'opportunity' ? '🎯' : '📋';
        console.info(`  ${icon} ${insight.message}`);
      });
      
      console.info('\n💡 Recommendations:');
      analytics.recommendations.forEach((rec, index) => {
        console.info(`  ${index + 1}. ${rec}`);
      });
      
    } catch (error) {
      console.error('❌ Analytics generation failed:', error instanceof Error ? error.message : error);
    }
  }

  private async handleRecommendCommand(artifactId: string, options: any): Promise<void> {
    console.info('🎯 Intelligent Artifact Recommendations');
    console.info('=======================================\n');
    
    console.info(`🔍 Analyzing artifact: ${artifactId}\n`);
    
    try {
      await this.artifactSystem.initialize();
      const recommendations = await this.artifactSystem.getRecommendations(artifactId);
      
      console.info('🔄 Alternatives (replacements):');
      if (recommendations.alternatives.length === 0) {
        console.info('  No alternatives found');
      } else {
        recommendations.alternatives.forEach((alt, index) => {
          console.info(`  ${index + 1}. ${alt.title}`);
          console.info(`     📁 ${alt.path}`);
          console.info(`     📊 Popularity: ${alt.metadata.metrics.popularity}/100`);
        });
      }
      
      console.info('\n🚀 Enhancements (extensions):');
      if (recommendations.enhancements.length === 0) {
        console.info('  No enhancements found');
      } else {
        recommendations.enhancements.forEach((enh, index) => {
          console.info(`  ${index + 1}. ${enh.title}`);
          console.info(`     📁 ${enh.path}`);
          console.info(`     📊 Popularity: ${enh.metadata.metrics.popularity}/100`);
        });
      }
      
      console.info('\n🔗 Dependencies:');
      if (recommendations.dependencies.length === 0) {
        console.info('  No dependencies found');
      } else {
        recommendations.dependencies.forEach((dep, index) => {
          console.info(`  ${index + 1}. ${dep.title}`);
          console.info(`     📁 ${dep.path}`);
          console.info(`     📊 Popularity: ${dep.metadata.metrics.popularity}/100`);
        });
      }
      
      console.info('\n⚠️  Conflicts:');
      if (recommendations.conflicts.length === 0) {
        console.info('  No conflicts found');
      } else {
        recommendations.conflicts.forEach((conf, index) => {
          console.info(`  ${index + 1}. ${conf.title}`);
          console.info(`     📁 ${conf.path}`);
          console.info(`     ⚠️  May conflict with current artifact`);
        });
      }
      
    } catch (error) {
      console.error('❌ Recommendation generation failed:', error instanceof Error ? error.message : error);
    }
  }

  private async handleGovernanceCommand(options: any): Promise<void> {
    console.info('🛡️ Artifact Governance & Management');
    console.info('===================================\n');
    
    try {
      await this.artifactSystem.initialize();
      const management = await this.artifactSystem.manageArtifacts();
      
      if (options.healthCheck || !options.cleanup && !options.optimize) {
        console.info('🏥 System Health Check:');
        console.info('=======================');
        console.info(`Status: ${management.healthCheck.status}`);
        
        if (management.healthCheck.issues.length > 0) {
          console.info('\n⚠️  Issues Found:');
          management.healthCheck.issues.forEach(issue => {
            console.info(`  • ${issue}`);
          });
        } else {
          console.info('✅ No issues detected');
        }
        console.info();
      }
      
      if (options.cleanup) {
        console.info('🧹 Cleanup Opportunities:');
        console.info('=========================');
        console.info(`Artifacts to archive: ${management.cleanup.archived}`);
        console.info(`Artifacts to remove: ${management.cleanup.removed}`);
        console.info();
      }
      
      if (options.optimize) {
        console.info('⚡ Optimization Opportunities:');
        console.info('===============================');
        management.optimization.opportunities.forEach((opp, index) => {
          console.info(`${index + 1}. ${opp}`);
        });
        console.info(`Estimated savings: ${management.optimization.savings} MB\n`);
      }
      
    } catch (error) {
      console.error('❌ Governance analysis failed:', error instanceof Error ? error.message : error);
    }
  }

  private async startInteractiveMode(options: any): Promise<void> {
    console.info('🎮 Interactive Artifact Management Mode');
    console.info('======================================\n');
    console.info('Available commands: discover, analytics, recommend, governance, exit');
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    console.info('\n🚀 Initializing Enhanced Artifact System v2.0...');
    await this.artifactSystem.initialize();
    console.info('✅ Ready for interactive commands\n');

    while (true) {
      try {
        const input = await askQuestion('artifacts> ');
        const [command, ...args] = input.trim().split(' ');
        
        if (command === 'exit' || command === 'quit') {
          break;
        }

        switch (command) {
          case 'discover':
            if (args.length === 0) {
              console.info('Usage: discover <query> [--related] [--ai-insights]');
              continue;
            }
            await this.handleDiscoverCommand(args.join(' '), { 
              related: args.includes('--related'), 
              aiInsights: args.includes('--ai-insights'),
              verbose: options.verbose 
            });
            break;
            
          case 'analytics':
            await this.handleAnalyticsCommand({ verbose: options.verbose });
            break;
            
          case 'recommend':
            if (args.length === 0) {
              console.info('Usage: recommend <artifact-id>');
              continue;
            }
            await this.handleRecommendCommand(args[0], { verbose: options.verbose });
            break;
            
          case 'governance':
            await this.handleGovernanceCommand({ 
              healthCheck: true,
              verbose: options.verbose 
            });
            break;
            
          default:
            console.info('Unknown command. Available: discover, analytics, recommend, governance, exit');
        }
        
        console.info('\n---\n');
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    rl.close();
    console.info('\n👋 Goodbye!');
  }
}

// Export for integration
export { ArtifactCLI };

// CLI entry point
async function runArtifactCLI() {
  const cli = new ArtifactCLI();
  await cli.run();
}

// Auto-run if executed directly
if (import.meta.main) {
  runArtifactCLI().catch(console.error);
}

export { runArtifactCLI };
