// cli/commands/integrated-heal.ts
// CLI commands for the integrated healing system

import { Command } from 'commander';
import { integratedHealingSystem, type IntegratedHealingConfig } from '../../src/autonomic/integrated-healing-system';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const program = new Command();

program
  .name('integrated-heal')
  .description('Integrated Healing System CLI - v2.01.05 + Autonomic Circuits')
  .version('2.01.05');

// Main healing command
program
  .command('heal')
  .description('Perform integrated healing of filesystem and circuits')
  .option('--dry-run', 'Perform a dry run without making changes')
  .option('--target-dir <dir>', 'Target directory for filesystem healing', 'utils')
  .option('--circuits-only', 'Only heal circuits, skip filesystem')
  .option('--filesystem-only', 'Only heal filesystem, skip circuits')
  .option('--verbose', 'Enable verbose output')
  .action(async (options) => {
    console.log('🔄 Integrated Healing System v2.01.05');
    console.log('=====================================');
    
    try {
      // Get current status
      const status = await integratedHealingSystem.getSystemStatus();
      console.log(`📊 Current health score: ${(status.currentHealthScore * 100).toFixed(1)}%`);
      console.log(`🔧 Last healing: ${new Date(status.lastHealingTime).toLocaleString()}`);
      console.log(`🔄 Currently healing: ${status.isHealing ? 'Yes' : 'No'}`);
      console.log('');

      if (status.isHealing) {
        console.log('⚠️  Healing already in progress. Please wait...');
        return;
      }

      // Update config based on options
      const configUpdate: Partial<IntegratedHealingConfig> = {};
      
      if (options.targetDir) {
        configUpdate.filesystem = { ...status.config.filesystem, targetDir: options.targetDir };
      }
      
      if (options.circuitsOnly) {
        configUpdate.integration = { ...status.config.integration, enableCrossSystemHealing: false };
      }
      
      if (options.filesystemOnly) {
        configUpdate.circuits = { ...status.config.circuits, autoHeal: false };
      }

      if (Object.keys(configUpdate).length > 0) {
        await integratedHealingSystem.updateConfig(configUpdate);
      }

      // Perform healing
      console.log('🚀 Starting integrated healing...');
      const startTime = Date.now();
      
      const result = await integratedHealingSystem.performIntegratedHealing();
      
      const duration = Date.now() - startTime;
      
      // Display results
      console.log('\\n📊 Healing Results:');
      console.log('==================');
      console.log(`✅ Success: ${result.success ? 'Yes' : 'No'}`);
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`🏥 Health Status: ${result.overall.healthStatus}`);
      console.log(`📈 Unified Health Score: ${(result.integration.unifiedHealthScore * 100).toFixed(1)}%`);
      
      if (options.verbose) {
        console.log('\\n📁 Filesystem Healing:');
        console.log(`   Files Found: ${result.filesystem.metrics.filesFound}`);
        console.log(`   Files Deleted: ${result.filesystem.metrics.filesDeleted}`);
        console.log(`   Files Backed Up: ${result.filesystem.metrics.filesBackedUp}`);
        console.log(`   Hashes Generated: ${result.filesystem.metrics.metrics?.hashesGenerated || 0}`);
        
        if (result.filesystem.issues.length > 0) {
          console.log('\\n   Issues:');
          result.filesystem.issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (result.filesystem.repairs.length > 0) {
          console.log('\\n   Repairs:');
          result.filesystem.repairs.forEach(repair => console.log(`   • ${repair}`));
        }
        
        console.log('\\n🔌 Circuit Healing:');
        console.log(`   Total Circuits: ${result.circuits.totalCircuits}`);
        console.log(`   Healed Circuits: ${result.circuits.healedCircuits}`);
        
        if (result.circuits.issues.length > 0) {
          console.log('\\n   Issues:');
          result.circuits.issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        console.log('\\n🔗 Integration:');
        if (result.integration.crossSystemIssues.length > 0) {
          console.log('   Cross-System Issues:');
          result.integration.crossSystemIssues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (result.integration.coordinatedRepairs.length > 0) {
          console.log('   Coordinated Repairs:');
          result.integration.coordinatedRepairs.forEach(repair => console.log(`   • ${repair}`));
        }
      }
      
      if (result.overall.recommendations.length > 0) {
        console.log('\\n💡 Recommendations:');
        result.overall.recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      
      console.log(`\\n⏰ Next healing scheduled: ${new Date(result.overall.nextHealingTime).toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Integrated healing failed:', error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current system status and health')
  .option('--json', 'Output status in JSON format')
  .action(async (options) => {
    try {
      const status = await integratedHealingSystem.getSystemStatus();
      const history = await integratedHealingSystem.getHealingHistory(5);
      
      if (options.json) {
        console.log(JSON.stringify({
          status,
          recentHistory: history
        }, null, 2));
      } else {
        console.log('🏥 Integrated Healing System Status');
        console.log('==================================');
        console.log(`📊 Health Score: ${(status.currentHealthScore * 100).toFixed(1)}%`);
        console.log(`🔄 Currently Healing: ${status.isHealing ? 'Yes' : 'No'}`);
        console.log(`🕐 Last Healing: ${new Date(status.lastHealingTime).toLocaleString()}`);
        console.log(`📁 Target Directory: ${status.config.filesystem.targetDir}`);
        console.log(`🔌 Auto-Heal Circuits: ${status.config.circuits.autoHeal ? 'Enabled' : 'Disabled'}`);
        console.log(`🔗 Cross-System Healing: ${status.config.integration.enableCrossSystemHealing ? 'Enabled' : 'Disabled'}`);
        
        if (history.length > 0) {
          console.log('\\n📈 Recent Healing History:');
          history.forEach((healing, index) => {
            const status = healing.success ? '✅' : '❌';
            const health = (healing.integration.unifiedHealthScore * 100).toFixed(1);
            console.log(`   ${index + 1}. ${status} ${new Date(healing.timestamp).toLocaleString()} - ${health}% health`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      process.exit(1);
    }
  });

// History command
program
  .command('history')
  .description('Show healing history')
  .option('--limit <number>', 'Number of recent healings to show', '10')
  .option('--export <file>', 'Export history to file')
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit);
      const history = await integratedHealingSystem.getHealingHistory(limit);
      
      console.log(`📜 Healing History (Last ${history.length} healings)`);
      console.log('==========================================');
      
      history.forEach((healing, index) => {
        const status = healing.success ? '✅' : '❌';
        const health = (healing.integration.unifiedHealthScore * 100).toFixed(1);
        const duration = healing.duration;
        
        console.log(`${index + 1}. ${status} ${new Date(healing.timestamp).toLocaleString()}`);
        console.log(`   Duration: ${duration}ms | Health: ${health}% | Status: ${healing.overall.healthStatus}`);
        
        if (healing.filesystem.issues.length > 0 || healing.circuits.issues.length > 0) {
          console.log(`   Issues: ${healing.filesystem.issues.length + healing.circuits.issues.length}`);
        }
        
        if (index < history.length - 1) console.log('');
      });
      
      // Export if requested
      if (options.export) {
        await writeFile(options.export, JSON.stringify(history, null, 2));
        console.log(`\\n💾 History exported to: ${options.export}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to get history:', error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Show or update configuration')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set configuration value (can be used multiple times)')
  .action(async (options) => {
    try {
      const status = await integratedHealingSystem.getSystemStatus();
      
      if (options.show || !options.set) {
        console.log('⚙️  Current Configuration');
        console.log('========================');
        console.log(JSON.stringify(status.config, null, 2));
        return;
      }
      
      // Parse and apply configuration updates
      const configUpdates: any = {};
      
      if (Array.isArray(options.set)) {
        options.set.forEach((setting: string) => {
          const [key, value] = setting.split('=');
          if (!key || !value) {
            console.error(`❌ Invalid setting format: ${setting}`);
            return;
          }
          
          // Parse the value
          let parsedValue: any = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (!isNaN(Number(value))) parsedValue = Number(value);
          
          // Set nested property
          const keys = key.split('.');
          let current = configUpdates;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = parsedValue;
        });
      }
      
      await integratedHealingSystem.updateConfig(configUpdates);
      console.log('✅ Configuration updated successfully');
      
    } catch (error) {
      console.error('❌ Configuration operation failed:', error);
      process.exit(1);
    }
  });

// Monitor command
program
  .command('monitor')
  .description('Start real-time monitoring of the healing system')
  .option('--interval <seconds>', 'Monitoring interval in seconds', '30')
  .option('--alert-threshold <number>', 'Alert when health score falls below this', '70')
  .action(async (options) => {
    console.log('🔍 Starting real-time monitoring...');
    console.log(`📊 Health threshold: ${options.alertThreshold}%`);
    console.log(`⏱️  Check interval: ${options.interval}s`);
    console.log('Press Ctrl+C to stop monitoring\\n');
    
    const interval = parseInt(options.interval) * 1000;
    const threshold = parseFloat(options.alertThreshold) / 100;
    
    const monitor = setInterval(async () => {
      try {
        const healthScore = await integratedHealingSystem.getCurrentHealthScore();
        const healthPercent = (healthScore * 100).toFixed(1);
        const timestamp = new Date().toLocaleTimeString();
        
        if (healthScore < threshold) {
          console.log(`🚨 ${timestamp} - ALERT: Health score ${healthPercent}% (threshold: ${options.alertThreshold}%)`);
        } else {
          console.log(`✅ ${timestamp} - Health score: ${healthPercent}%`);
        }
        
      } catch (error) {
        console.error(`❌ ${new Date().toLocaleTimeString()} - Monitoring error:`, error);
      }
    }, interval);
    
    // Handle cleanup
    process.on('SIGINT', () => {
      clearInterval(monitor);
      console.log('\\n🛑 Monitoring stopped');
      process.exit(0);
    });
  });

// Test command
program
  .command('test')
  .description('Run integrated healing system tests')
  .option('--filesystem', 'Test only filesystem healing')
  .option('--circuits', 'Test only circuit healing')
  .option('--integration', 'Test only integration features')
  .action(async (options) => {
    console.log('🧪 Running Integrated Healing System Tests');
    console.log('==========================================');
    
    try {
      let testsPassed = 0;
      let testsTotal = 0;
      
      // Test filesystem healing
      if (!options.circuits && !options.integration) {
        testsTotal++;
        console.log('\\n📁 Testing Filesystem Healing...');
        
        try {
          const testConfig = {
            targetDir: './test-temp',
            enableMetrics: true,
            enablePatternAnalysis: true,
            enableRiskAssessment: true,
            backupBeforeDelete: true,
            parallelProcessing: true
          };
          
          // Create test files
          await writeFile('./test-temp/.test!file1', 'test content');
          await writeFile('./test-temp/.test!file2', 'test content');
          
          // Run filesystem healing
          const result = await integratedHealingSystem.performIntegratedHealing();
          
          if (result.filesystem.metrics.filesFound >= 2) {
            console.log('✅ Filesystem healing test passed');
            testsPassed++;
          } else {
            console.log('❌ Filesystem healing test failed - insufficient files found');
          }
          
        } catch (error) {
          console.log(`❌ Filesystem healing test failed: ${error}`);
        }
      }
      
      // Test circuit healing
      if (!options.filesystem && !options.integration) {
        testsTotal++;
        console.log('\\n🔌 Testing Circuit Healing...');
        
        try {
          const status = await integratedHealingSystem.getSystemStatus();
          
          if (status.config.circuits.autoHeal) {
            console.log('✅ Circuit healing test passed - auto-heal enabled');
            testsPassed++;
          } else {
            console.log('❌ Circuit healing test failed - auto-heal disabled');
          }
          
        } catch (error) {
          console.log(`❌ Circuit healing test failed: ${error}`);
        }
      }
      
      // Test integration
      if (!options.filesystem && !options.circuits) {
        testsTotal++;
        console.log('\\n🔗 Testing Integration Features...');
        
        try {
          const healthScore = await integratedHealingSystem.getCurrentHealthScore();
          
          if (typeof healthScore === 'number' && healthScore >= 0 && healthScore <= 1) {
            console.log('✅ Integration test passed - valid health score');
            testsPassed++;
          } else {
            console.log('❌ Integration test failed - invalid health score');
          }
          
        } catch (error) {
          console.log(`❌ Integration test failed: ${error}`);
        }
      }
      
      // Summary
      console.log(`\\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);
      
      if (testsPassed === testsTotal) {
        console.log('🎉 All tests passed!');
      } else {
        console.log('⚠️  Some tests failed');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  });

export default program;
