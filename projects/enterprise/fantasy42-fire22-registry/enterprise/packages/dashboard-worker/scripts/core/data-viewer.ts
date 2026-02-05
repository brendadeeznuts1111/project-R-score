#!/usr/bin/env bun

/**
 * 📊 Fire22 Data Viewer - Access All Collected Metrics & Analytics
 *
 * This script shows you where all the data is stored and how to access it
 */

import { ScriptRunner } from './script-runner.js';
import { handleError, createError } from './error-handler.js';

async function showAllData() {
  return await ScriptRunner.run(
    'data-viewer-main',
    async () => {
      const runner = ScriptRunner.getInstance();

      console.log('📊 Fire22 Data Viewer - All Collected Metrics & Analytics');
      console.log('!==!==!==!==!==!==!==!==!==!====\n');

      // 1. Show current metrics for all scripts
      console.log('🔧 Current Script Metrics:');
      console.log('!==!==!==!==!==');
      const metrics = (runner as any).metrics;
      if (metrics && metrics.size > 0) {
        for (const [scriptName, scriptMetrics] of metrics) {
          console.log(`\n📈 ${scriptName}:`);
          console.log(`   Total Executions: ${scriptMetrics.totalExecutions}`);
          console.log(
            `   Success Rate: ${((scriptMetrics.successfulExecutions / scriptMetrics.totalExecutions) * 100).toFixed(1)}%`
          );
          console.log(`   Average Duration: ${scriptMetrics.averageDuration.toFixed(2)}ms`);
          console.log(
            `   Average Memory: ${(scriptMetrics.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`
          );
          console.log(`   Error Rate: ${scriptMetrics.errorRate.toFixed(1)}%`);
          console.log(`   Last Executed: ${scriptMetrics.lastExecuted}`);
        }
      } else {
        console.log('   No metrics collected yet. Run some scripts first!');
      }

      // 2. Show execution history
      console.log('\n📚 Execution History:');
      console.log('!==!==!==!==');
      const history = (runner as any).executionHistory;
      if (history && history.length > 0) {
        console.log(`   Total executions recorded: ${history.length}`);
        console.log(`   Recent executions:`);

        // Show last 5 executions
        const recent = history.slice(-5);
        recent.forEach((execution: any, index: number) => {
          const status = execution.success ? '✅' : '❌';
          const duration = execution.performance.duration.toFixed(2);
          const memory = (execution.performance.memoryDelta.heapUsed / 1024 / 1024).toFixed(2);

          console.log(
            `   ${index + 1}. ${status} ${execution.metadata.scriptName} (${duration}ms, ${memory}MB)`
          );
          console.log(`      ID: ${execution.metadata.executionId}`);
          console.log(`      Time: ${execution.metadata.timestamp}`);
          if (execution.metadata.tags.length > 0) {
            console.log(`      Tags: ${execution.metadata.tags.join(', ')}`);
          }
        });
      } else {
        console.log('   No execution history yet. Run some scripts first!');
      }

      // 3. Show performance report
      console.log('\n📊 Performance Report:');
      console.log('!==!==!==!===');
      const report = runner.generatePerformanceReport();
      console.log(report);

      // 4. Show data storage locations
      console.log('\n💾 Data Storage Locations:');
      console.log('!==!==!==!==!==');
      console.log('   📈 Metrics: Stored in memory (ScriptRunner.metrics Map)');
      console.log('   📚 History: Stored in memory (ScriptRunner.executionHistory Array)');
      console.log('   🕒 Timestamps: ISO format stored with each execution');
      console.log('   🏷️  Tags: Stored with each execution for categorization');
      console.log('   📊 Performance: Duration, memory, CPU usage for each execution');

      // 5. Show how to access data programmatically
      console.log('\n🔧 How to Access Data Programmatically:');
      console.log('!==!==!==!==!==!==!====');
      console.log('   // Get all metrics');
      console.log('   const runner = ScriptRunner.getInstance();');
      console.log('   const metrics = runner.metrics;');
      console.log('');
      console.log('   // Get execution history');
      console.log('   const history = runner.executionHistory;');
      console.log('');
      console.log('   // Generate performance report');
      console.log('   const report = runner.generatePerformanceReport();');
      console.log('');
      console.log('   // Clear data if needed');
      console.log('   runner.clearHistory();');

      return {
        metricsCount: metrics ? metrics.size : 0,
        historyCount: history ? history.length : 0,
        totalExecutions: metrics
          ? Array.from(metrics.values()).reduce((sum: number, m: any) => sum + m.totalExecutions, 0)
          : 0,
      };
    },
    {
      tags: ['data-viewer', 'analytics', 'metrics'],
      logLevel: 'info',
    }
  );
}

async function showSpecificScriptData(scriptName: string) {
  return await ScriptRunner.run(
    'data-viewer-specific',
    async () => {
      const runner = ScriptRunner.getInstance();

      console.log(`📊 Data for Script: ${scriptName}`);
      console.log('!==!==!==!==!==!==\n');

      const metrics = (runner as any).metrics;
      const scriptMetrics = metrics.get(scriptName);

      if (scriptMetrics) {
        console.log(`📈 ${scriptName} Metrics:`);
        console.log(`   Total Executions: ${scriptMetrics.totalExecutions}`);
        console.log(`   Successful: ${scriptMetrics.successfulExecutions}`);
        console.log(`   Failed: ${scriptMetrics.failedExecutions}`);
        console.log(
          `   Success Rate: ${((scriptMetrics.successfulExecutions / scriptMetrics.totalExecutions) * 100).toFixed(1)}%`
        );
        console.log(`   Average Duration: ${scriptMetrics.averageDuration.toFixed(2)}ms`);
        console.log(
          `   Average Memory: ${(scriptMetrics.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`
        );
        console.log(`   Error Rate: ${scriptMetrics.errorRate.toFixed(1)}%`);
        console.log(`   Last Executed: ${scriptMetrics.lastExecuted}`);

        // Show recent executions for this script
        const history = (runner as any).executionHistory;
        const scriptHistory = history.filter(
          (execution: any) => execution.metadata.scriptName === scriptName
        );

        if (scriptHistory.length > 0) {
          console.log(`\n📚 Recent Executions for ${scriptName}:`);
          const recent = scriptHistory.slice(-3);
          recent.forEach((execution: any, index: number) => {
            const status = execution.success ? '✅' : '❌';
            const duration = execution.performance.duration.toFixed(2);
            const memory = (execution.performance.memoryDelta.heapUsed / 1024 / 1024).toFixed(2);

            console.log(`   ${index + 1}. ${status} ${duration}ms, ${memory}MB`);
            console.log(`      ID: ${execution.metadata.executionId}`);
            console.log(`      Time: ${execution.metadata.timestamp}`);
          });
        }
      } else {
        console.log(`   No data found for script: ${scriptName}`);
      }

      return { scriptName, hasData: !!scriptMetrics };
    },
    {
      tags: ['data-viewer', 'script-specific'],
      logLevel: 'info',
    }
  );
}

async function exportDataToFile() {
  return await ScriptRunner.run(
    'data-viewer-export',
    async () => {
      const runner = ScriptRunner.getInstance();

      console.log('💾 Exporting Data to File...');
      console.log('!==!==!==!==!====\n');

      const metrics = (runner as any).metrics;
      const history = (runner as any).executionHistory;

      const exportData = {
        exportTimestamp: new Date().toISOString(),
        metrics: Object.fromEntries(metrics),
        history: history.slice(-100), // Last 100 executions
        summary: {
          totalScripts: metrics.size,
          totalExecutions: Array.from(metrics.values()).reduce(
            (sum: number, m: any) => sum + m.totalExecutions,
            0
          ),
          totalHistoryEntries: history.length,
        },
      };

      // Write to file
      const filename = `fire22-data-export-${Date.now()}.json`;
      await Bun.write(filename, JSON.stringify(exportData, null, 2));

      console.log(`✅ Data exported to: ${filename}`);
      console.log(`   📊 Metrics: ${metrics.size} scripts`);
      console.log(`   📚 History: ${history.length} executions`);
      console.log(`   💾 File size: ${((await Bun.file(filename).size()) / 1024).toFixed(2)}KB`);

      return { filename, dataSize: exportData.summary };
    },
    {
      tags: ['data-viewer', 'export'],
      logLevel: 'info',
    }
  );
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      console.log('📊 Fire22 Data Viewer');
      console.log('!==!==!==!===\n');
      console.log('Usage: bun run data-viewer.ts [options]');
      console.log('');
      console.log('Options:');
      console.log('  --help, -h           Show this help message');
      console.log('  --script <name>      Show data for specific script');
      console.log('  --export             Export all data to JSON file');
      console.log('  --all                Show all data (default)');
      console.log('');
      console.log('Examples:');
      console.log('  bun run data-viewer.ts                    # Show all data');
      console.log('  bun run data-viewer.ts --script enhanced-demo  # Show specific script');
      console.log('  bun run data-viewer.ts --export           # Export to JSON');
      return;
    }

    if (args.includes('--export')) {
      await exportDataToFile();
      return;
    }

    if (args.includes('--script')) {
      const scriptIndex = args.indexOf('--script');
      if (scriptIndex + 1 < args.length) {
        const scriptName = args[scriptIndex + 1];
        await showSpecificScriptData(scriptName);
        return;
      }
    }

    // Default: show all data
    await showAllData();
  } catch (error) {
    await handleError(error, 'data-viewer', 'main');
  }
}

// Export functions for use in other scripts
export { showAllData, showSpecificScriptData, exportDataToFile };

// Run if called directly
if (import.meta.main) {
  main();
}
