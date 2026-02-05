#!/usr/bin/env bun

/**
 * Apple ID Grading System CLI
 * Interactive tool for optimizing Apple ID creation configurations
 */

import { AppleIDGradingSystem } from '../../utils/apple-id-grading-system.js';
import { performanceTracker } from '../../utils/apple-id-performance-tracker.js';
import { program } from 'commander';

program
  .name('apple-id-grading')
  .description('Apple ID creation grading and optimization system')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze optimal configuration for budget and timeline')
  .option('-b, --budget <amount>', 'Budget per account in USD', '50')
  .option('-t, --timeline <days>', 'Timeline in days', '30')
  .option('-v, --value <amount>', 'Expected value per successful Apple ID', '50')
  .option('-d, --duoplus', 'Enable DuoPlus cloud integration')
  .option('-a, --automation <level>', 'Automation level: basic, advanced, enterprise', 'advanced')
  .action((options) => {
    const budget = parseFloat(options.budget);
    const accountValue = parseFloat(options.value);
    const duoPlusEnabled = options.duoplus || false;
    const automationLevel = options.automation;

    console.log('🍎 Apple ID Creation Optimization Analysis');
    console.log('==========================================\n');

    console.log(`📊 Budget: $${budget}/account`);
    console.log(`⏰ Timeline: ${options.timeline} days`);
    console.log(`💰 Account Value: $${accountValue}`);
    console.log(`☁️ DuoPlus Enabled: ${duoPlusEnabled ? 'YES' : 'NO'}`);
    if (duoPlusEnabled) {
        console.log(`🤖 Automation Level: ${automationLevel.toUpperCase()}`);
    }
    console.log('');

    let config;
    if (duoPlusEnabled) {
        config = AppleIDDuoPlusGradingSystem.getDuoPlusOptimalConfiguration(
            budget,
            options.timeline,
            accountValue,
            automationLevel as any
        );
    } else {
        config = AppleIDGradingSystem.getOptimalConfiguration(budget, options.timeline, accountValue);
    }

    console.log('🎯 RECOMMENDED CONFIGURATION');
    console.log('===========================\n');

    const isDuoPlus = config.duoPlusDevice !== undefined;

    if (isDuoPlus) {
        console.log(`☁️ DuoPlus Enhanced Configuration`);
        console.log(`   Automation Level: ${config.automationWorkflow.replace('-', ' ').toUpperCase()}`);
        console.log(`   Setup Time: ${config.setupTime} minutes`);
        console.log('');
    }

    console.log(`📱 Phone: ${isDuoPlus ? config.duoPlusNumber.provider : config.phone.provider} ($${isDuoPlus ? config.duoPlusNumber.cost : config.phone.cost})`);
    console.log(`   Grade: ${isDuoPlus ? config.duoPlusNumber.grade : config.phone.grade} | Success Rate: ${((isDuoPlus ? config.duoPlusNumber.successRate : config.phone.successRate) * 100).toFixed(1)}%`);
    console.log(`   ${isDuoPlus ? config.duoPlusNumber.notes : config.phone.notes}\n`);

    console.log(`👤 Identity: ${config.identity.type.replace('_', ' ')} ($${config.identity.cost})`);
    console.log(`   Grade: ${config.identity.grade} | Success Rate: ${(config.identity.successRate * 100).toFixed(1)}%`);
    console.log(`   ${config.identity.notes}\n`);

    console.log(`🔥 Warm-up: ${config.warmup.duration} days ${config.warmup.intensity} ($${config.warmup.cost})`);
    console.log(`   Grade: ${config.warmup.grade} | Success Rate: ${(config.warmup.successRate * 100).toFixed(1)}%`);
    console.log(`   ${config.warmup.notes}\n`);

    console.log(`📱 Device: ${isDuoPlus ? `DuoPlus ${config.duoPlusDevice.duoPlusModel.toUpperCase()}` : config.device.type} (${isDuoPlus ? config.duoPlusDevice.age : config.device.age} days old, $${isDuoPlus ? config.duoPlusDevice.cost : config.device.cost})`);
    console.log(`   Grade: ${isDuoPlus ? config.duoPlusDevice.grade : config.device.grade} | Success Rate: ${((isDuoPlus ? config.duoPlusDevice.successRate : config.device.successRate) * 100).toFixed(1)}%`);
    console.log(`   ${isDuoPlus ? `${config.duoPlusDevice.age} days aged • ${config.duoPlusDevice.automationLevel} automation` : config.device.notes}\n`);

    console.log(`📶 SIM: ${isDuoPlus ? `Cloud ${config.sim.type}` : `${config.sim.type} ${config.sim.carrier}`} ($${config.sim.cost})`);
    console.log(`   Grade: ${config.sim.grade} | Success Rate: ${(config.sim.successRate * 100).toFixed(1)}%`);
    console.log(`   ${config.sim.notes}\n`);

    console.log('💰 FINANCIAL ANALYSIS');
    console.log('===================\n');

    if (isDuoPlus) {
        console.log(`🏠 Base Configuration: $${(config.totalCost - config.totalDuoPlusCost).toFixed(2)}`);
        console.log(`☁️ DuoPlus Services: $${config.totalDuoPlusCost.toFixed(2)}`);
        console.log(`⏱️ Setup Time: ${config.setupTime} minutes`);
        console.log(`🤖 Automation: ${config.automationWorkflow.replace('-', ' ').toUpperCase()}`);
        console.log('');
    }

    console.log(`💵 Total Cost per Account: $${config.totalCost.toFixed(2)}`);
    console.log(`📈 Expected Success Rate: ${(config.expectedSuccessRate * 100).toFixed(1)}%`);
    console.log(`💹 Return on Investment: ${(config.roi).toFixed(1)}%`);
    console.log(`🏆 Overall Grade: ${config.grade}`);
    console.log(`✅ Recommended: ${config.recommended ? 'YES' : 'NO'}\n`);

    if (config.recommended) {
      console.log('🚀 This configuration is recommended for production use!');
    } else {
      console.log('⚠️  Consider increasing budget for better success rates.');
    }
  });

program
  .command('recommend')
  .description('Get recommendations for specific use cases')
  .option('-u, --use-case <type>', 'Use case: premium, production, testing, budget', 'production')
  .action((options) => {
    console.log('🍎 Apple ID Creation Recommendations');
    console.log('====================================\n');

    console.log(`🎯 Use Case: ${options.useCase.toUpperCase()}\n`);

    const recommendations = AppleIDGradingSystem.getRecommendations(options.useCase as any);

    recommendations.forEach((config, index) => {
      console.log(`${index + 1}. ${config.grade} Configuration`);
      console.log(`   💵 Cost: $${config.totalCost} | 📈 Success: ${(config.expectedSuccessRate * 100).toFixed(1)}% | 💹 ROI: ${(config.roi).toFixed(1)}%`);

      if (config.recommended) {
        console.log('   ✅ RECOMMENDED');
      }
      console.log('');
    });
  });

program
  .command('compare')
  .description('Compare different budget configurations')
  .option('-b, --budgets <amounts>', 'Comma-separated budget amounts', '20,50,100,200')
  .action((options) => {
    const budgets = options.budgets.split(',').map((b: string) => parseFloat(b.trim()));

    console.log('🍎 Apple ID Budget Comparison');
    console.log('=============================\n');

    console.log('| Budget | Success Rate | Total Cost | ROI | Grade | Recommended |');
    console.log('|--------|--------------|------------|-----|--------|-------------|');

    budgets.forEach(budget => {
      const config = AppleIDGradingSystem.getOptimalConfiguration(budget, '30 days', 50);
      console.log(`| $${budget.toString().padEnd(6)} | ${(config.expectedSuccessRate * 100).toFixed(1).toString().padEnd(12)}% | $${config.totalCost.toString().padEnd(10)} | ${(config.roi).toFixed(0).toString().padEnd(3)}% | ${config.grade.padEnd(6)} | ${config.recommended ? '✅' : '❌'} |`);
    });

    console.log('\n💡 Pro Tip: Professional tier ($50) offers best ROI for serious operations!');
  });

program
  .command('cost-benefit')
  .description('Generate comprehensive cost-benefit analysis')
  .action(() => {
    const analysis = AppleIDGradingSystem.generateCostBenefitAnalysis();
    console.log(analysis);
  });

program
  .command('record-performance')
  .description('Record performance results for learning and optimization')
  .option('-b, --budget <amount>', 'Budget used for this configuration', '50')
  .option('-t, --timeline <days>', 'Timeline used', '30')
  .option('-c, --created <number>', 'Number of accounts created', '10')
  .option('-s, --successful <number>', 'Number of accounts successful', '8')
  .option('-m, --time <seconds>', 'Average creation time per account', '45')
  .option('-o, --operator <name>', 'Operator name', 'cli-user')
  .option('-e, --environment <type>', 'Environment: production, testing, development', 'production')
  .option('-i, --batch-id <id>', 'Batch ID for tracking')
  .option('-n, --notes <text>', 'Additional notes')
  .action(async (options) => {
    console.log('📊 Recording Apple ID Creation Performance...\n');

    const budget = parseFloat(options.budget);
    const timeline = options.timeline;
    const accountValue = 50; // Default account value

    // Get the configuration that would be used
    const configuration = AppleIDGradingSystem.getOptimalConfiguration(budget, timeline, accountValue);

    // Record the performance
    const record = AppleIDGradingSystem.recordPerformance(
      configuration,
      parseInt(options.created),
      parseInt(options.successful),
      parseFloat(options.time),
      {
        operator: options.operator,
        batchId: options.batchId,
        notes: options.notes,
        environment: options.environment as any
      }
    );

    console.log('✅ Performance recorded successfully!');
    console.log(`📈 Record ID: ${record.id}`);
    console.log(`🎯 Success Rate: ${(record.actualResults.successRate * 100).toFixed(1)}%`);
    console.log(`💰 ROI: ${record.actualResults.roi.toFixed(1)}%`);
    console.log(`📊 Prediction Accuracy: ${(record.validation.accuracy * 100).toFixed(1)}%`);
    console.log(`👤 Operator: ${record.metadata.operator}`);
    console.log(`🏭 Environment: ${record.metadata.environment}`);
  });

program
  .command('performance-analytics')
  .description('Display performance analytics and insights')
  .option('--days <number>', 'Analyze last N days', '30')
  .action((options) => {
    console.log('📊 Apple ID Performance Analytics\n');

    const days = parseInt(options.days);
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const analytics = AppleIDGradingSystem.getPerformanceAnalytics({ start: startTime, end: endTime });
    const recommendations = AppleIDGradingSystem.getPerformanceRecommendations();

    console.log('📈 Overall Performance:');
    console.log(`   Total Records: ${analytics.overall.totalRecords}`);
    console.log(`   Average Accuracy: ${(analytics.overall.averageAccuracy * 100).toFixed(1)}%`);
    console.log(`   Average ROI: ${analytics.overall.averageROI.toFixed(1)}%`);
    console.log(`   Overall Success Rate: ${(analytics.overall.overallSuccessRate * 100).toFixed(1)}%`);
    console.log('');

    console.log('🏆 Best Performing Tiers:');
    Object.entries(analytics.byTier)
      .sort(([, a], [, b]) => b.averageAccuracy - a.averageAccuracy)
      .slice(0, 3)
      .forEach(([tier, stats]) => {
        console.log(`   ${tier}: ${(stats.averageAccuracy * 100).toFixed(1)}% accuracy, ${(stats.averageROI).toFixed(1)}% ROI`);
      });
    console.log('');

    if (recommendations.length > 0) {
      console.log('💡 AI Recommendations:');
      recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }

    console.log(`📅 Analysis Period: Last ${days} days`);
  });

program
  .command('export-performance')
  .description('Export performance data as CSV')
  .option('-o, --output <file>', 'Output file path', 'apple-id-performance-data.csv')
  .action(async (options) => {
    console.log('📤 Exporting performance data...\n');

    const csv = AppleIDGradingSystem.exportPerformanceData();

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync(options.output, csv);

    console.log(`✅ Performance data exported to: ${options.output}`);
    console.log(`📊 Total records: ${performanceTracker.getRecordsCount()}`);
  });

program
  .command('clear-performance')
  .description('Clear all performance records (use with caution)')
  .option('--confirm', 'Confirm deletion of all performance data')
  .action((options) => {
    if (!options.confirm) {
      console.log('⚠️  WARNING: This will delete ALL performance records!');
      console.log('Run with --confirm to proceed.');
      return;
    }

    performanceTracker.clearRecords();
    console.log('🗑️  All performance records cleared.');
  });

program
  .command('tiers')
  .description('Show all available configuration tiers')
  .action(() => {
    console.log('🍎 Apple ID Creation Tiers');
    console.log('==========================\n');

    const tiers = [
      {
        name: 'Premium',
        budget: '$150+',
        success: '98%+',
        roi: '200%+',
        use: 'High-value accounts only',
        components: 'All A+ grade, 90-day natural warm-up'
      },
      {
        name: 'Professional',
        budget: '$50-100',
        success: '92%+',
        roi: '150-200%',
        use: 'Best ROI for serious operations',
        components: 'A/A+ mix, 30-day automated warm-up'
      },
      {
        name: 'Business',
        budget: '$20-50',
        success: '85-90%',
        roi: '100-150%',
        use: 'Medium-scale operations',
        components: 'B/A mix, 7-day intensive warm-up'
      },
      {
        name: 'Budget',
        budget: '$5-20',
        success: '65-80%',
        roi: '50-100%',
        use: 'Testing/low-risk scenarios',
        components: 'C grade, 24-hour warm-up'
      }
    ];

    tiers.forEach(tier => {
      console.log(`${tier.name.toUpperCase()} TIER`);
      console.log('='.repeat(tier.name.length + 5));
      console.log(`💰 Budget: ${tier.budget}`);
      console.log(`📈 Success Rate: ${tier.success}`);
      console.log(`💹 ROI: ${tier.roi}`);
      console.log(`🎯 Use Case: ${tier.use}`);
      console.log(`🧩 Components: ${tier.components}\n`);
    });
  });

// Parse arguments
program.parse();