#!/usr/bin/env bun
/**
 * CPU Profile Analyzer - Advanced Performance Analysis Tool
 * Analyzes Chrome DevTools CPU profiles and provides optimization recommendations
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ProfileNode {
  id: number;
  functionName: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  children?: number[];
  hitCount?: number;
  callFrame?: {
    functionName: string;
    scriptId: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

interface Profile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

interface AnalysisResult {
  totalTime: number;
  sampleCount: number;
  topFunctions: Array<{
    name: string;
    selfTime: number;
    totalTime: number;
    callCount: number;
    percentage: number;
  }>;
  bottlenecks: Array<{
    function: string;
    issue: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  optimizationOpportunities: Array<{
    type: string;
    description: string;
    potentialGain: number;
  }>;
}

class ProfileAnalyzer {
  private profiles: Map<string, Profile> = new Map();

  async loadProfile(filePath: string): Promise<Profile> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const profile = JSON.parse(content);
      this.profiles.set(filePath, profile);
      return profile;
    } catch (error) {
      throw new Error(`Failed to load profile ${filePath}: ${error}`);
    }
  }

  analyzeProfile(profile: Profile): AnalysisResult {
    const totalTime = profile.endTime - profile.startTime;
    const sampleCount = profile.samples.length;

    // Build function timing map
    const functionTimes = new Map<number, { selfTime: number; totalTime: number; callCount: number }>();
    const nodeMap = new Map<number, ProfileNode>();

    // Initialize node map
    profile.nodes.forEach(node => {
      nodeMap.set(node.id, node);
      functionTimes.set(node.id, { selfTime: 0, totalTime: 0, callCount: 0 });
    });

    // Calculate self time (time spent directly in function)
    profile.samples.forEach((nodeId, index) => {
      const delta = profile.timeDeltas[index] || 0;
      const times = functionTimes.get(nodeId)!;
      times.selfTime += delta;
      times.callCount++;
    });

    // Calculate total time (including children)
    const calculateTotalTime = (nodeId: number): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return 0;

      let total = functionTimes.get(nodeId)!.selfTime;
      if (node.children) {
        node.children.forEach(childId => {
          total += calculateTotalTime(childId);
        });
      }
      functionTimes.get(nodeId)!.totalTime = total;
      return total;
    };

    // Calculate total times starting from root
    profile.nodes.forEach(node => {
      if (!profile.nodes.some(n => n.children?.includes(node.id))) {
        // This is a root node
        calculateTotalTime(node.id);
      }
    });

    // Get top functions by total time
    const topFunctions = Array.from(functionTimes.entries())
      .map(([nodeId, times]) => {
        const node = nodeMap.get(nodeId)!;
        return {
          name: node.functionName || node.callFrame?.functionName || '(anonymous)',
          selfTime: times.selfTime,
          totalTime: times.totalTime,
          callCount: times.callCount,
          percentage: (times.totalTime / totalTime) * 100
        };
      })
      .filter(fn => fn.totalTime > 0)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 20);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(topFunctions, totalTime);

    // Find optimization opportunities
    const optimizationOpportunities = this.findOptimizationOpportunities(topFunctions, profile);

    return {
      totalTime,
      sampleCount,
      topFunctions,
      bottlenecks,
      optimizationOpportunities
    };
  }

  private identifyBottlenecks(functions: AnalysisResult['topFunctions'], totalTime: number) {
    const bottlenecks: AnalysisResult['bottlenecks'] = [];

    functions.forEach(fn => {
      if (fn.percentage > 30) {
        bottlenecks.push({
          function: fn.name,
          issue: `High execution time (${fn.percentage.toFixed(1)}% of total)`,
          impact: 'high',
          recommendation: 'Consider optimizing this function or reducing its call frequency'
        });
      } else if (fn.percentage > 15) {
        bottlenecks.push({
          function: fn.name,
          issue: `Significant execution time (${fn.percentage.toFixed(1)}% of total)`,
          impact: 'medium',
          recommendation: 'Review for potential optimizations'
        });
      }

      // Check for inefficient patterns
      if (fn.name.includes('forEach') && fn.callCount > 1000) {
        bottlenecks.push({
          function: fn.name,
          issue: 'High-frequency forEach usage may be inefficient',
          impact: 'medium',
          recommendation: 'Consider using for loops or more efficient iteration methods'
        });
      }

      if (fn.name.includes('Math.') && fn.callCount > 10000) {
        bottlenecks.push({
          function: fn.name,
          issue: 'Frequent math operations',
          impact: 'low',
          recommendation: 'Cache results if possible, or use lookup tables for repeated calculations'
        });
      }
    });

    return bottlenecks;
  }

  private findOptimizationOpportunities(functions: AnalysisResult['topFunctions'], profile: Profile) {
    const opportunities: AnalysisResult['optimizationOpportunities'] = [];

    // Check for recursive functions
    const recursiveFunctions = functions.filter(fn =>
      fn.name.includes('fibonacci') || fn.name.includes('recursive')
    );

    if (recursiveFunctions.length > 0) {
      const totalRecursiveTime = recursiveFunctions.reduce((sum, fn) => sum + fn.totalTime, 0);
      opportunities.push({
        type: 'Recursion Optimization',
        description: 'Recursive functions detected - consider iterative implementations',
        potentialGain: totalRecursiveTime * 0.8 // Estimate 80% improvement
      });
    }

    // Check for string operations
    const stringOps = functions.filter(fn =>
      fn.name.includes('String') || fn.name.includes('concat') || fn.name.includes('join')
    );

    if (stringOps.length > 0) {
      const totalStringTime = stringOps.reduce((sum, fn) => sum + fn.totalTime, 0);
      opportunities.push({
        type: 'String Optimization',
        description: 'String concatenation in loops - use array.join() or template literals',
        potentialGain: totalStringTime * 0.6
      });
    }

    // Check for object creation
    const objectOps = functions.filter(fn =>
      fn.name.includes('Object') || fn.name.includes('create') || fn.name.includes('new ')
    );

    if (objectOps.length > 0) {
      const totalObjectTime = objectOps.reduce((sum, fn) => sum + fn.totalTime, 0);
      opportunities.push({
        type: 'Object Creation Optimization',
        description: 'Frequent object creation - consider object pooling or reuse',
        potentialGain: totalObjectTime * 0.4
      });
    }

    return opportunities;
  }

  async analyzeAllProfiles(): Promise<Map<string, AnalysisResult>> {
    const results = new Map<string, AnalysisResult>();
    const profileDir = './profiles';

    try {
      const files = readdirSync(profileDir).filter(f => f.endsWith('.cpuprofile'));

      for (const file of files) {
        const filePath = join(profileDir, file);
        console.log(`🔍 Analyzing ${file}...`);

        const profile = await this.loadProfile(filePath);
        const analysis = this.analyzeProfile(profile);
        results.set(file, analysis);
      }
    } catch (error) {
      console.error('Error analyzing profiles:', error);
    }

    return results;
  }

  printAnalysis(results: Map<string, AnalysisResult>) {
    console.log('🔬 CPU Profile Analysis Report');
    console.log('='.repeat(50));

    for (const [fileName, result] of results) {
      console.log(`\n📊 Profile: ${fileName}`);
      console.log(`Total Time: ${(result.totalTime / 1000).toFixed(2)}ms`);
      console.log(`Samples: ${result.sampleCount.toLocaleString()}`);

      console.log('\n🏆 Top Functions:');
      result.topFunctions.slice(0, 10).forEach((fn, index) => {
        console.log(`${index + 1}. ${fn.name}`);
        console.log(`   Total: ${(fn.totalTime / 1000).toFixed(2)}ms (${fn.percentage.toFixed(1)}%)`);
        console.log(`   Self: ${(fn.selfTime / 1000).toFixed(2)}ms, Calls: ${fn.callCount}`);
      });

      if (result.bottlenecks.length > 0) {
        console.log('\n🚨 Bottlenecks:');
        result.bottlenecks.forEach(b => {
          const icon = b.impact === 'high' ? '🔴' : b.impact === 'medium' ? '🟡' : '🟢';
          console.log(`${icon} ${b.function}: ${b.issue}`);
          console.log(`   💡 ${b.recommendation}`);
        });
      }

      if (result.optimizationOpportunities.length > 0) {
        console.log('\n⚡ Optimization Opportunities:');
        result.optimizationOpportunities.forEach(opp => {
          console.log(`🚀 ${opp.type}: ${opp.description}`);
          console.log(`   📈 Potential gain: ${(opp.potentialGain / 1000).toFixed(2)}ms`);
        });
      }
    }
  }
}

// CLI interface
async function main() {
  const analyzer = new ProfileAnalyzer();

  try {
    console.log('🔬 Starting CPU Profile Analysis...');
    const results = await analyzer.analyzeAllProfiles();
    analyzer.printAnalysis(results);

    console.log('\n✅ Analysis complete!');
    console.log('\n💡 Recommendations:');
    console.log('1. Load profiles in Chrome DevTools for visual analysis');
    console.log('2. Focus on high-impact bottlenecks first');
    console.log('3. Implement suggested optimizations iteratively');
    console.log('4. Re-profile after changes to measure improvements');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { ProfileAnalyzer, type AnalysisResult };

// Run if called directly
if (import.meta.main) {
  main();
}