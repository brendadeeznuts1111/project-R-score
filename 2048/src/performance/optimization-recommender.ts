#!/usr/bin/env bun
/**
 * Performance Optimization Recommender
 * Analyzes code patterns and provides specific optimization recommendations
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { ProfileAnalyzer, type AnalysisResult } from './profile-analyzer';

interface CodePattern {
  pattern: RegExp;
  issue: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
}

interface OptimizationRecommendation {
  file: string;
  line: number;
  pattern: string;
  issue: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  codeSnippet: string;
  potentialImpact: string;
}

interface PerformanceReport {
  summary: {
    totalFiles: number;
    totalIssues: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
  recommendations: OptimizationRecommendation[];
  categories: Record<string, number>;
  profileInsights?: AnalysisResult[];
}

class OptimizationRecommender {
  private codePatterns: CodePattern[] = [
    // Performance Patterns
    {
      pattern: /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\.length\s*;\s*\w+\+\+\s*\)\s*\{\s*\w+\.push\(/g,
      issue: 'Inefficient array building in loop',
      recommendation: 'Pre-allocate array size or use more efficient data structures',
      severity: 'medium',
      category: 'Performance'
    },
    {
      pattern: /console\.log\([^)]+\)/g,
      issue: 'Console logging in production code',
      recommendation: 'Remove or conditionally disable console statements',
      severity: 'low',
      category: 'Performance'
    },
    {
      pattern: /\w+\.forEach\(\s*\([^)]+\)\s*=>\s*\{/g,
      issue: 'forEach with arrow function may be slower than for loops',
      recommendation: 'Consider using traditional for loops for performance-critical code',
      severity: 'low',
      category: 'Performance'
    },
    {
      pattern: /new\s+Array\(\d+\)\.fill\([^)]+\)/g,
      issue: 'Array.fill() may be slower than pre-allocated arrays',
      recommendation: 'Use direct array initialization or typed arrays',
      severity: 'low',
      category: 'Performance'
    },

    // Memory Patterns
    {
      pattern: /setInterval\([^,]+,\s*\d+\)/g,
      issue: 'Unmanaged setInterval may cause memory leaks',
      recommendation: 'Store interval ID and clear when component unmounts',
      severity: 'high',
      category: 'Memory'
    },
    {
      pattern: /addEventListener\([^,]+,\s*[^,)]+\)/g,
      issue: 'Event listeners may not be cleaned up',
      recommendation: 'Remove event listeners in cleanup functions',
      severity: 'medium',
      category: 'Memory'
    },

    // Algorithm Patterns
    {
      pattern: /function\s+\w+\s*\([^)]*\)\s*\{\s*if\s*\([^)]+\)\s*return\s+\w+\s*\([^)]*\)\s*\+\s*\w+\s*\([^)]*\)/g,
      issue: 'Potential recursive function without base case optimization',
      recommendation: 'Consider memoization or iterative approach',
      severity: 'high',
      category: 'Algorithm'
    },
    {
      pattern: /\w+\.sort\(\)\.reverse\(\)/g,
      issue: 'Inefficient double sorting operation',
      recommendation: 'Use custom comparator in single sort call',
      severity: 'medium',
      category: 'Algorithm'
    },

    // Bundle Size Patterns
    {
      pattern: /import\s+.*\s+from\s+['"]lodash['"]/g,
      issue: 'Full lodash import increases bundle size',
      recommendation: 'Import only specific lodash functions: import isEqual from "lodash/isEqual"',
      severity: 'medium',
      category: 'Bundle Size'
    },
    {
      pattern: /import\s+.*\s+from\s+['"]moment['"]/g,
      issue: 'Moment.js is large and deprecated',
      recommendation: 'Use date-fns or native Date APIs',
      severity: 'high',
      category: 'Bundle Size'
    },

    // React Patterns (if applicable)
    {
      pattern: /useEffect\(\(\)\s*=>\s*\{[^}]*\}\s*,\s*\[\]\s*\)/g,
      issue: 'useEffect without dependencies runs on every render',
      recommendation: 'Add proper dependencies or move to useMemo/useCallback',
      severity: 'high',
      category: 'React'
    },
    {
      pattern: /<[^>]*\s+style\s*=\s*\{[^}]*\}/g,
      issue: 'Inline styles prevent CSS optimization',
      recommendation: 'Use CSS classes or CSS-in-JS libraries',
      severity: 'low',
      category: 'React'
    }
  ];

  private profileAnalyzer = new ProfileAnalyzer();

  async analyzeCodebase(sourceDir: string = './'): Promise<PerformanceReport> {
    console.log('🔍 Analyzing codebase for optimization opportunities...');

    const files = this.getSourceFiles(sourceDir);
    const recommendations: OptimizationRecommendation[] = [];
    const categories: Record<string, number> = {};

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          this.codePatterns.forEach(pattern => {
            const matches = line.match(pattern.pattern);
            if (matches) {
              const recommendation: OptimizationRecommendation = {
                file: file.replace(sourceDir, '').replace(/^\//, ''),
                line: index + 1,
                pattern: pattern.pattern.source,
                issue: pattern.issue,
                recommendation: pattern.recommendation,
                severity: pattern.severity,
                category: pattern.category,
                codeSnippet: line.trim(),
                potentialImpact: this.getPotentialImpact(pattern.severity, pattern.category)
              };

              recommendations.push(recommendation);
              categories[pattern.category] = (categories[pattern.category] || 0) + 1;
            }
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not analyze ${file}:`, error);
      }
    }

    // Analyze CPU profiles if available
    let profileInsights: AnalysisResult[] = [];
    try {
      const profileResults = await this.profileAnalyzer.analyzeAllProfiles();
      profileInsights = Array.from(profileResults.values());
    } catch (error) {
      console.warn('⚠️ Could not analyze CPU profiles:', error);
    }

    const summary = {
      totalFiles: files.length,
      totalIssues: recommendations.length,
      highPriority: recommendations.filter(r => r.severity === 'high').length,
      mediumPriority: recommendations.filter(r => r.severity === 'medium').length,
      lowPriority: recommendations.filter(r => r.severity === 'low').length
    };

    return {
      summary,
      recommendations: recommendations.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      categories,
      profileInsights
    };
  }

  private getSourceFiles(dir: string): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.getSourceFiles(fullPath));
        } else if (stat.isFile() && extensions.includes(extname(item))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not read directory ${dir}:`, error);
    }

    return files;
  }

  private getPotentialImpact(severity: string, category: string): string {
    const impacts = {
      high: {
        Performance: 'Significant performance improvement (50-80% faster)',
        Memory: 'Prevents memory leaks and reduces memory usage',
        Algorithm: 'Exponential performance gains for large datasets',
        'Bundle Size': 'Reduces bundle size by 20-50KB',
        React: 'Prevents unnecessary re-renders and improves UX'
      },
      medium: {
        Performance: 'Moderate performance improvement (10-30% faster)',
        Memory: 'Reduces memory pressure',
        Algorithm: 'Linear performance improvements',
        'Bundle Size': 'Reduces bundle size by 5-20KB',
        React: 'Improves component efficiency'
      },
      low: {
        Performance: 'Minor performance improvement (<10% faster)',
        Memory: 'Minimal memory savings',
        Algorithm: 'Small algorithmic improvements',
        'Bundle Size': 'Reduces bundle size by <5KB',
        React: 'Minor rendering optimizations'
      }
    };

    return impacts[severity as keyof typeof impacts]?.[category as keyof typeof impacts.high] || 'Minor improvement';
  }

  printReport(report: PerformanceReport) {
    console.log('🚀 Performance Optimization Report');
    console.log('='.repeat(50));

    console.log('\n📊 Summary:');
    console.log(`Files analyzed: ${report.summary.totalFiles}`);
    console.log(`Issues found: ${report.summary.totalIssues}`);
    console.log(`High priority: ${report.summary.highPriority}`);
    console.log(`Medium priority: ${report.summary.mediumPriority}`);
    console.log(`Low priority: ${report.summary.lowPriority}`);

    console.log('\n📈 Issues by Category:');
    Object.entries(report.categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`${category}: ${count}`);
      });

    if (report.recommendations.length > 0) {
      console.log('\n🔧 Top Recommendations:');
      report.recommendations.slice(0, 15).forEach((rec, index) => {
        const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n${index + 1}. ${icon} ${rec.issue}`);
        console.log(`   📁 ${rec.file}:${rec.line}`);
        console.log(`   💻 ${rec.codeSnippet}`);
        console.log(`   💡 ${rec.recommendation}`);
        console.log(`   📈 ${rec.potentialImpact}`);
      });
    }

    if (report.profileInsights && report.profileInsights.length > 0) {
      console.log('\n🔬 CPU Profile Insights:');
      report.profileInsights.forEach((insight, index) => {
        console.log(`\nProfile ${index + 1}:`);
        console.log(`   Total time: ${(insight.totalTime / 1000).toFixed(2)}ms`);
        console.log(`   Samples: ${insight.sampleCount.toLocaleString()}`);

        if (insight.bottlenecks.length > 0) {
          console.log('   🚨 Top bottlenecks:');
          insight.bottlenecks.slice(0, 3).forEach(b => {
            console.log(`      ${b.function}: ${b.issue}`);
          });
        }
      });
    }

    console.log('\n✅ Analysis complete!');
    console.log('\n💡 Next Steps:');
    console.log('1. Address high-priority issues first');
    console.log('2. Test performance improvements after changes');
    console.log('3. Re-run analysis to track progress');
    console.log('4. Consider automated testing for regressions');
  }

  generateActionPlan(report: PerformanceReport): string[] {
    const actions: string[] = [];

    if (report.summary.highPriority > 0) {
      actions.push(`🚨 CRITICAL: Address ${report.summary.highPriority} high-priority issues immediately`);
    }

    if (report.summary.mediumPriority > 0) {
      actions.push(`🟡 IMPORTANT: Review ${report.summary.mediumPriority} medium-priority optimizations`);
    }

    // Category-specific actions
    if (report.categories['Memory'] > 0) {
      actions.push('🧠 MEMORY: Implement proper cleanup for event listeners and intervals');
    }

    if (report.categories['Performance'] > 0) {
      actions.push('⚡ PERFORMANCE: Optimize loops and data structures');
    }

    if (report.categories['Bundle Size'] > 0) {
      actions.push('📦 BUNDLE: Audit and optimize imports');
    }

    if (report.categories['Algorithm'] > 0) {
      actions.push('🧮 ALGORITHM: Review recursive functions and sorting operations');
    }

    actions.push('🧪 TESTING: Create performance regression tests');
    actions.push('📊 MONITORING: Set up continuous performance monitoring');

    return actions;
  }
}

// CLI interface
async function main() {
  const recommender = new OptimizationRecommender();
  const sourceDir = process.argv[2] || '.';

  try {
    const report = await recommender.analyzeCodebase(sourceDir);
    recommender.printReport(report);

    const actionPlan = recommender.generateActionPlan(report);
    console.log('\n📋 Action Plan:');
    actionPlan.forEach(action => console.log(`• ${action}`));

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { OptimizationRecommender, type PerformanceReport, type OptimizationRecommendation };

// Run if called directly
if (import.meta.main) {
  main();
}