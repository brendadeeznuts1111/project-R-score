/**
 * @fileoverview NEXUS Pattern Registry Visualizer
 * @description ANSI visualization for pattern registry with performance metrics
 * @module patterns/viz
 */

import { PatternRegistry, PatternMetadata, globalPatternRegistry } from './index';
import { colors, table, printTable, formatBytes, formatDuration } from '../utils';
import type { MarketCategory } from '../arbitrage/types';

/**
 * Pattern registry visualizer with ANSI art
 */
export class PatternRegistryVisualizer {
  constructor(private registry: PatternRegistry = globalPatternRegistry) {}

  /**
   * Display full registry status with ASCII art
   */
  displayStatus(): void {
    const stats = this.registry.getStats();
    const patterns = this.registry.getAllPatterns();

    // Header
    console.info(colors.cyan('╔══════════════════════════════════════════════════════════════════════════════╗'));
    console.info(colors.cyan('║') + '\x1b[1m' + '                        NEXUS Pattern Registry                                ' + '\x1b[0m' + colors.cyan('║'));
    console.info(colors.cyan('╚══════════════════════════════════════════════════════════════════════════════╝'));

    // Stats overview
    console.info(colors.yellow('\n📊 Registry Statistics:'));
    console.info(`   Total Patterns: ${colors.cyan(stats.totalPatterns.toString())}`);
    console.info(`   Enabled Patterns: ${colors.green(stats.enabledPatterns.toString())}`);
    console.info(`   Disabled Patterns: ${colors.red((stats.totalPatterns - stats.enabledPatterns).toString())}`);
    console.info(`   Average Execution Time: ${colors.cyan(formatDuration(stats.avgExecutionTime))}`);
    console.info(`   Total Executions: ${colors.cyan(stats.totalExecutions.toLocaleString())}`);

    // Category breakdown
    console.info(colors.yellow('\n🏷️  Categories:'));
    for (const [category, count] of Object.entries(stats.categories)) {
      const percentage = ((count / stats.totalPatterns) * 100).toFixed(1);
      console.info(`   ${category.padEnd(12)} ${colors.cyan(count.toString().padStart(3))} patterns (${percentage}%)`);
    }

    // Priority breakdown
    console.info(colors.yellow('\n🎯 Priorities:'));
    const priorityColors = {
      critical: colors.red,
      high: colors.yellow,
      medium: colors.cyan,
      low: colors.gray,
    };

    for (const [priority, count] of Object.entries(stats.priorities)) {
      const color = priorityColors[priority as keyof typeof priorityColors] || colors.gray;
      const percentage = ((count / stats.totalPatterns) * 100).toFixed(1);
      console.info(`   ${priority.padEnd(8)} ${color(count.toString().padStart(3))} patterns (${percentage}%)`);
    }

    // Top performing patterns
    const topPatterns = patterns
      .filter(p => p.performance.totalMatches > 0)
      .sort((a, b) => b.performance.successRate - a.performance.successRate)
      .slice(0, 5);

    if (topPatterns.length > 0) {
      console.info(colors.yellow('\n🏆 Top Performing Patterns:'));
      for (const pattern of topPatterns) {
        const successRate = (pattern.performance.successRate * 100).toFixed(1);
        const avgTime = formatDuration(pattern.performance.avgExecutionTime);
        console.info(`   ${pattern.name.padEnd(30)} ${colors.green(successRate + '%')} success, ${colors.cyan(avgTime)} avg`);
      }
    }

    // Recently active patterns
    const recentPatterns = patterns
      .filter(p => p.updated)
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 3);

    if (recentPatterns.length > 0) {
      console.info(colors.yellow('\n🕒 Recently Updated Patterns:'));
      for (const pattern of recentPatterns) {
        const updated = new Date(pattern.updated).toLocaleDateString();
        console.info(`   ${pattern.name.padEnd(30)} v${pattern.version} (${updated})`);
      }
    }

    console.info(colors.gray('\n💡 Use "patterns:list" to see all patterns or "patterns:stats <id>" for detailed stats'));
  }

  /**
   * Display detailed pattern list
   */
  displayPatternList(): void {
    const patterns = this.registry.getAllPatterns();

    if (patterns.length === 0) {
      console.info(colors.yellow('No patterns registered'));
      return;
    }

    const tableData = patterns.map(pattern => ({
      id: pattern.id,
      name: pattern.name,
      category: pattern.category,
      priority: pattern.priority,
      version: pattern.version,
      enabled: pattern.enabled ? '✅' : '❌',
      confidence: `${(pattern.confidence * 100).toFixed(0)}%`,
      matches: pattern.performance.totalMatches.toString(),
      'avg time': formatDuration(pattern.performance.avgExecutionTime),
    }));

    console.info('ID'.padEnd(25), 'Name'.padEnd(25), 'Category'.padEnd(10), 'Priority'.padEnd(8), 'Version'.padEnd(8), 'Enabled'.padEnd(8), 'Confidence'.padEnd(10), 'Matches'.padEnd(8), 'Avg Time');
    console.info('─'.repeat(110));

    for (const pattern of patterns) {
      console.info(
        pattern.id.padEnd(25),
        pattern.name.padEnd(25),
        pattern.category.padEnd(10),
        pattern.priority.padEnd(8),
        pattern.version.padEnd(8),
        (pattern.enabled ? '✅' : '❌').padEnd(8),
        `${(pattern.confidence * 100).toFixed(0)}%`.padEnd(10),
        pattern.performance.totalMatches.toString().padEnd(8),
        formatDuration(pattern.performance.avgExecutionTime)
      );
    }
  }

  /**
   * Display detailed stats for a specific pattern
   */
  displayPatternStats(patternId: string): void {
    const pattern = this.registry.getPattern(patternId);

    if (!pattern) {
      console.info(colors.red(`Pattern "${patternId}" not found`));
      return;
    }

    const meta = pattern.metadata;

    console.info(colors.cyan('╔══════════════════════════════════════════════════════════════════════════════╗'));
    console.info(colors.cyan('║') + '\x1b[1m' + ` Pattern: ${meta.name}`.padEnd(79) + '\x1b[0m' + colors.cyan('║'));
    console.info(colors.cyan('╚══════════════════════════════════════════════════════════════════════════════╝'));

    console.info(colors.yellow('📋 Basic Info:'));
    console.info(`   ID: ${colors.cyan(meta.id)}`);
    console.info(`   Description: ${meta.description}`);
    console.info(`   Version: ${colors.cyan(meta.version)}`);
    console.info(`   Category: ${colors.cyan(meta.category)}`);
    console.info(`   Priority: ${this.getPriorityColor(meta.priority)(meta.priority)}`);
    console.info(`   Enabled: ${meta.enabled ? colors.green('✅ Yes') : colors.red('❌ No')}`);
    console.info(`   Confidence: ${colors.cyan((meta.confidence * 100).toFixed(1) + '%')}`);
    console.info(`   Author: ${meta.author}`);
    console.info(`   Created: ${new Date(meta.created).toLocaleDateString()}`);
    console.info(`   Updated: ${new Date(meta.updated).toLocaleDateString()}`);

    console.info(colors.yellow('\n🏷️  Tags:'));
    if (meta.tags.length > 0) {
      console.info(`   ${meta.tags.map(tag => colors.gray(tag)).join(', ')}`);
    } else {
      console.info(`   ${colors.gray('None')}`);
    }

    console.info(colors.yellow('\n📊 Performance Metrics:'));
    console.info(`   Total Matches: ${colors.cyan(meta.performance.totalMatches.toString())}`);
    console.info(`   Success Rate: ${colors.green((meta.performance.successRate * 100).toFixed(1) + '%')}`);
    console.info(`   False Positive Rate: ${colors.red((meta.performance.falsePositiveRate * 100).toFixed(1) + '%')}`);
    console.info(`   Average Execution Time: ${colors.cyan(formatDuration(meta.performance.avgExecutionTime))}`);

    console.info(colors.yellow('\n🔗 Dependencies:'));
    if (meta.dependencies.length > 0) {
      for (const dep of meta.dependencies) {
        console.info(`   • ${colors.cyan(dep)}`);
      }
    } else {
      console.info(`   ${colors.gray('None')}`);
    }

    if (meta.urlPattern) {
      console.info(colors.yellow('\n🌐 URL Pattern:'));
      console.info(`   ${colors.cyan(meta.urlPattern)}`);
    }
  }

  /**
   * Display pattern execution visualization
   */
  displayExecutionFlow(patternResults: Array<{ patternId: string; executionTime: number; opportunities: number }>): void {
    console.info(colors.cyan('🚀 Pattern Execution Flow\n'));

    for (const result of patternResults) {
      const pattern = this.registry.getPattern(result.patternId);
      const name = pattern?.metadata.name || result.patternId;

      const timeColor = result.executionTime > 100 ? colors.red : result.executionTime > 50 ? colors.yellow : colors.green;
      const oppColor = result.opportunities > 0 ? colors.green : colors.gray;

      console.info(`${colors.cyan('⚡')} ${name.padEnd(30)} ${timeColor(formatDuration(result.executionTime).padStart(8))} ${oppColor(result.opportunities.toString().padStart(3) + ' ops')}`);
    }
  }

  /**
   * Display registry health check
   */
  displayHealthCheck(): void {
    const stats = this.registry.getStats();
    const patterns = this.registry.getAllPatterns();

    console.info(colors.cyan('🏥 Pattern Registry Health Check\n'));

    // Overall health
    const healthScore = this.calculateHealthScore(stats, patterns);
    const healthColor = healthScore > 80 ? colors.green : healthScore > 60 ? colors.yellow : colors.red;

    console.info(`Overall Health: ${healthColor(healthScore.toFixed(1) + '%')}`);

    // Component checks
    const checks = [
      {
        name: 'Pattern Count',
        status: stats.totalPatterns > 0,
        message: `${stats.totalPatterns} patterns registered`,
      },
      {
        name: 'Enabled Patterns',
        status: stats.enabledPatterns > 0,
        message: `${stats.enabledPatterns} patterns enabled`,
      },
      {
        name: 'Performance Data',
        status: stats.totalExecutions > 0,
        message: `${stats.totalExecutions} total executions`,
      },
      {
        name: 'High Priority Patterns',
        status: stats.priorities.high > 0 || stats.priorities.critical > 0,
        message: `${(stats.priorities.high || 0) + (stats.priorities.critical || 0)} high/critical priority patterns`,
      },
      {
        name: 'Average Execution Time',
        status: stats.avgExecutionTime < 1000, // Less than 1 second
        message: `Average ${formatDuration(stats.avgExecutionTime)} per execution`,
      },
    ];

    for (const check of checks) {
      const statusIcon = check.status ? '✅' : '❌';
      const statusColor = check.status ? colors.green : colors.red;
      console.info(`${statusIcon} ${check.name.padEnd(25)} ${statusColor(check.message)}`);
    }

    // Recommendations
    const recommendations = this.generateHealthRecommendations(stats, patterns);
    if (recommendations.length > 0) {
      console.info(colors.yellow('\n💡 Recommendations:'));
      for (const rec of recommendations) {
        console.info(`   • ${rec}`);
      }
    }
  }

  private getPriorityColor(priority: PatternMetadata['priority']): (text: string) => string {
    const colors = {
      critical: '\x1b[31m', // red
      high: '\x1b[33m',     // yellow
      medium: '\x1b[36m',   // cyan
      low: '\x1b[37m',      // gray
    };
    return (text: string) => `${colors[priority]}${text}\x1b[0m`;
  }

  private calculateHealthScore(stats: ReturnType<PatternRegistry['getStats']>, patterns: PatternMetadata[]): number {
    let score = 0;

    // Pattern diversity (20 points)
    const categories = Object.keys(stats.categories).length;
    score += Math.min(categories * 5, 20);

    // Enabled patterns (20 points)
    const enabledRatio = stats.enabledPatterns / stats.totalPatterns;
    score += enabledRatio * 20;

    // Performance data (20 points)
    if (stats.totalExecutions > 0) {
      score += 20;
    }

    // Success rates (20 points)
    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.performance.successRate, 0) / patterns.length;
    score += (avgSuccessRate || 0) * 20;

    // Execution time (20 points)
    const timeScore = Math.max(0, 20 - (stats.avgExecutionTime / 50)); // Penalize slow execution
    score += timeScore;

    return Math.min(score, 100);
  }

  private generateHealthRecommendations(stats: ReturnType<PatternRegistry['getStats']>, patterns: PatternMetadata[]): string[] {
    const recommendations: string[] = [];

    if (stats.totalPatterns === 0) {
      recommendations.push('Register some arbitrage patterns to get started');
    }

    if (stats.enabledPatterns === 0) {
      recommendations.push('Enable some patterns for active scanning');
    }

    if (stats.totalExecutions === 0) {
      recommendations.push('Run pattern execution to gather performance data');
    }

    if (stats.avgExecutionTime > 1000) {
      recommendations.push('Optimize slow patterns or consider parallel execution');
    }

    const lowSuccessPatterns = patterns.filter(p => p.performance.successRate < 0.1 && p.performance.totalMatches > 10);
    if (lowSuccessPatterns.length > 0) {
      recommendations.push(`Review ${lowSuccessPatterns.length} patterns with low success rates`);
    }

    return recommendations;
  }
}

/**
 * Global visualizer instance
 */
export const patternVisualizer = new PatternRegistryVisualizer();

/**
 * CLI commands for pattern registry
 */
export const patternCommands = {
  status: () => patternVisualizer.displayStatus(),
  list: () => patternVisualizer.displayPatternList(),
  stats: (patternId: string) => patternVisualizer.displayPatternStats(patternId),
  health: () => patternVisualizer.displayHealthCheck(),
};