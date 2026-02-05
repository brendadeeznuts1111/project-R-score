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
    console.log('🔍 AI-Powered Artifact Discovery');
    console.log('==================================\n');
    
    console.log(`🔎 Searching for: "${query}"`);
    if (options.related) console.log('🔗 Including related artifacts');
    if (options.aiInsights) console.log('🤖 Including AI insights');
    console.log(`📊 Relationship depth: ${options.depth}\n`);
    
    try {
      await this.artifactSystem.initialize();
      
      const discovery = await this.artifactSystem.discoverArtifacts(query, {
        includeRelated: options.related,
        aiInsights: options.aiInsights,
        relationshipDepth: parseInt(options.depth)
      });
      
      // Display artifacts
      console.log('📦 Discovered Artifacts:');
      console.log('========================');
      
      if (discovery.artifacts.length === 0) {
        console.log('❌ No artifacts found matching your query');
        return;
      }
      
      discovery.artifacts.forEach((artifact, index) => {
        console.log(`${index + 1}. ${artifact.title}`);
        console.log(`   📁 ${artifact.path}`);
        console.log(`   🏷️  ${artifact.tags.join(', ')}`);
        console.log(`   📊 Popularity: ${artifact.metadata.metrics.popularity}/100`);
        console.log(`   🛡️  Security: ${artifact.metadata.metrics.securityScore}/100`);
        
        if (options.verbose) {
          console.log(`   📝 ${artifact.description}`);
          console.log(`   🔧 Tech: ${artifact.tech.join(', ')}`);
          console.log(`   📈 Status: ${artifact.status}`);
        }
        console.log();
      });
      
      // Display AI insights
      if (options.aiInsights && discovery.insights.length > 0) {
        console.log('🤖 AI Insights:');
        console.log('===============');
        discovery.insights.forEach((insight, index) => {
          const icon = insight.type === 'warning' ? '⚠️' : 
                     insight.type === 'recommendation' ? '💡' : 
                     insight.type === 'opportunity' ? '🎯' : '📋';
          console.log(`${icon} ${insight.message}`);
          console.log(`   Confidence: ${Math.round(insight.confidence * 100)}%`);
          console.log(`   Actions: ${insight.actions.join(', ')}`);
          console.log();
        });
      }
      
      // Display relationships summary
      if (options.related) {
        console.log('🔗 Relationship Summary:');
        console.log('=======================');
        console.log(`Total relationship nodes: ${discovery.relationships.size}`);
        
        let totalRelationships = 0;
        for (const relationships of discovery.relationships.values()) {
          totalRelationships += relationships.length;
        }
        console.log(`Total relationships: ${totalRelationships}`);
        console.log();
      }
      
    } catch (error) {
      console.error('❌ Discovery failed:', error instanceof Error ? error.message : error);
    }
  }

  private async handleAnalyticsCommand(options: any): Promise<void> {
    console.log('📊 Artifact Analytics Dashboard');
    console.log('===============================\n');
    
    try {
      await this.artifactSystem.initialize();
      const analytics = await this.artifactSystem.generateAnalytics();
      
      // Overview
      console.log('📈 System Overview:');
      console.log('==================');
      console.log(`Total artifacts: ${analytics.overview.totalArtifacts}`);
      console.log(`Active artifacts: ${analytics.overview.activeArtifacts}`);
      console.log(`Deprecated artifacts: ${analytics.overview.deprecatedArtifacts}`);
      console.log(`Domains: ${analytics.overview.domains.join(', ')}`);
      console.log(`Technologies: ${analytics.overview.technologies.join(', ')}\n`);
      
      // Trends
      console.log('📊 Trends Analysis:');
      console.log('==================');
      
      console.log('🔥 Popular Artifacts:');
      analytics.trends.popularityTrend.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.artifact} (${item.popularity}% popularity)`);
      });
      
      console.log('\n💻 Technology Adoption:');
      analytics.trends.technologyAdoption.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.tech} (${item.usage} artifacts)`);
      });
      
      console.log('\n🤖 AI Insights:');
      analytics.insights.forEach((insight, index) => {
        const icon = insight.type === 'warning' ? '⚠️' : 
                   insight.type === 'recommendation' ? '💡' : 
                   insight.type === 'opportunity' ? '🎯' : '📋';
        console.log(`  ${icon} ${insight.message}`);
      });
      
      console.log('\n💡 Recommendations:');
      analytics.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      
    } catch (error) {
      console.error('❌ Analytics generation failed:', error instanceof Error ? error.message : error);
    }
  }

  private async handleRecommendCommand(artifactId: string, options: any): Promise<void> {
    console.log('🎯 Intelligent Artifact Recommendations');
    console.log('=======================================\n');
    
    console.log(`🔍 Analyzing artifact: ${artifactId}\n`);
    
    try {
      await this.artifactSystem.initialize();
      const recommendations = await this.artifactSystem.getRecommendations(artifactId);
      
      console.log('🔄 Alternatives (replacements):');
      if (recommendations.alternatives.length === 0) {
        console.log('  No alternatives found');
      } else {
        recommendations.alternatives.forEach((alt, index) => {
          console.log(`  ${index + 1}. ${alt.title}`);
          console.log(`     📁 ${alt.path}`);
          console.log(`     📊 Popularity: ${alt.metadata.metrics.popularity}/100`);
        });
      }
      
      console.log('\n🚀 Enhancements (extensions):');
      if (recommendations.enhancements.length === 0) {
        console.log('  No enhancements found');
      } else {
        recommendations.enhancements.forEach((enh, index) => {
          console.log(`  ${index + 1}. ${enh.title}`);
          console.log(`     📁 ${enh.path}`);
          console.log(`     📊 Popularity: ${enh.metadata.metrics.popularity}/100`);
        });
      }
      
      console.log('\n🔗 Dependencies:');
      if (recommendations.dependencies.length === 0) {
        console.log('  No dependencies found');
      } else {
        recommendations.dependencies.forEach((dep, index) => {
          console.log(`  ${index + 1}. ${dep.title}`);
          console.log(`     📁 ${dep.path}`);
          console.log(`     📊 Popularity: ${dep.metadata.metrics.popularity}/100`);
        });
      }
      
      console.log('\n⚠️  Conflicts:');
      if (recommendations.conflicts.length === 0) {
        console.log('  No conflicts found');
      } else {
        recommendations.conflicts.forEach((conf, index) => {
          console.log(`  ${index + 1}. ${conf.title}`);
          console.log(`     📁 ${conf.path}`);
          console.log(`     ⚠️  May conflict with current artifact`);
        });
      }
      
    } catch (error) {
      console.error('❌ Recommendation generation failed:', error instanceof Error ? error.message : error);
    }
  }

  private async handleGovernanceCommand(options: any): Promise<void> {
    console.log('🛡️ Artifact Governance & Management');
    console.log('===================================\n');
    
    try {
      await this.artifactSystem.initialize();
      const management = await this.artifactSystem.manageArtifacts();
      
      if (options.healthCheck || !options.cleanup && !options.optimize) {
        console.log('🏥 System Health Check:');
        console.log('=======================');
        console.log(`Status: ${management.healthCheck.status}`);
        
        if (management.healthCheck.issues.length > 0) {
          console.log('\n⚠️  Issues Found:');
          management.healthCheck.issues.forEach(issue => {
            console.log(`  • ${issue}`);
          });
        } else {
          console.log('✅ No issues detected');
        }
        console.log();
      }
      
      if (options.cleanup) {
        console.log('🧹 Cleanup Opportunities:');
        console.log('=========================');
        console.log(`Artifacts to archive: ${management.cleanup.archived}`);
        console.log(`Artifacts to remove: ${management.cleanup.removed}`);
        console.log();
      }
      
      if (options.optimize) {
        console.log('⚡ Optimization Opportunities:');
        console.log('===============================');
        management.optimization.opportunities.forEach((opp, index) => {
          console.log(`${index + 1}. ${opp}`);
        });
        console.log(`Estimated savings: ${management.optimization.savings} MB\n`);
      }
      
    } catch (error) {
      console.error('❌ Governance analysis failed:', error instanceof Error ? error.message : error);
    }
  }

  private async startInteractiveMode(options: any): Promise<void> {
    console.log('🎮 Interactive Artifact Management Mode');
    console.log('======================================\n');
    console.log('Available commands: discover, analytics, recommend, governance, exit');
    
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

    console.log('\n🚀 Initializing Enhanced Artifact System v2.0...');
    await this.artifactSystem.initialize();
    console.log('✅ Ready for interactive commands\n');

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
              console.log('Usage: discover <query> [--related] [--ai-insights]');
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
              console.log('Usage: recommend <artifact-id>');
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
            console.log('Unknown command. Available: discover, analytics, recommend, governance, exit');
        }
        
        console.log('\n---\n');
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    rl.close();
    console.log('\n👋 Goodbye!');
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
