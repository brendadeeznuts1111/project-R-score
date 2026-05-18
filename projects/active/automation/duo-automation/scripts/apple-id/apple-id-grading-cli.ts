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

    console.info('🍎 Apple ID Creation Optimization Analysis');
    console.info('==========================================\n');

    console.info(`📊 Budget: $${budget}/account`);
    console.info(`⏰ Timeline: ${options.timeline} days`);
    console.info(`💰 Account Value: $${accountValue}`);
    console.info(`☁️ DuoPlus Enabled: ${duoPlusEnabled ? 'YES' : 'NO'}`);
    if (duoPlusEnabled) {
        console.info(`🤖 Automation Level: ${automationLevel.toUpperCase()}`);
    }
    console.info('');

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

    console.info('🎯 RECOMMENDED CONFIGURATION');
    console.info('===========================\n');

    const isDuoPlus = config.duoPlusDevice !== undefined;

    if (isDuoPlus) {
        console.info(`☁️ DuoPlus Enhanced Configuration`);
        console.info(`   Automation Level: ${config.automationWorkflow.replace('-', ' ').toUpperCase()}`);
        console.info(`   Setup Time: ${config.setupTime} minutes`);
        console.info('');
    }

    console.info(`📱 Phone: ${isDuoPlus ? config.duoPlusNumber.provider : config.phone.provider} ($${isDuoPlus ? config.duoPlusNumber.cost : config.phone.cost})`);
    console.info(`   Grade: ${isDuoPlus ? config.duoPlusNumber.grade : config.phone.grade} | Success Rate: ${((isDuoPlus ? config.duoPlusNumber.successRate : config.phone.successRate) * 100).toFixed(1)}%`);
    console.info(`   ${isDuoPlus ? config.duoPlusNumber.notes : config.phone.notes}\n`);

    console.info(`👤 Identity: ${config.identity.type.replace('_', ' ')} ($${config.identity.cost})`);
    console.info(`   Grade: ${config.identity.grade} | Success Rate: ${(config.identity.successRate * 100).toFixed(1)}%`);
    console.info(`   ${config.identity.notes}\n`);

    console.info(`🔥 Warm-up: ${config.warmup.duration} days ${config.warmup.intensity} ($${config.warmup.cost})`);
    console.info(`   Grade: ${config.warmup.grade} | Success Rate: ${(config.warmup.successRate * 100).toFixed(1)}%`);
    console.info(`   ${config.warmup.notes}\n`);

    console.info(`📱 Device: ${isDuoPlus ? `DuoPlus ${config.duoPlusDevice.duoPlusModel.toUpperCase()}` : config.device.type} (${isDuoPlus ? config.duoPlusDevice.age : config.device.age} days old, $${isDuoPlus ? config.duoPlusDevice.cost : config.device.cost})`);
    console.info(`   Grade: ${isDuoPlus ? config.duoPlusDevice.grade : config.device.grade} | Success Rate: ${((isDuoPlus ? config.duoPlusDevice.successRate : config.device.successRate) * 100).toFixed(1)}%`);
    console.info(`   ${isDuoPlus ? `${config.duoPlusDevice.age} days aged • ${config.duoPlusDevice.automationLevel} automation` : config.device.notes}\n`);

    console.info(`📶 SIM: ${isDuoPlus ? `Cloud ${config.sim.type}` : `${config.sim.type} ${config.sim.carrier}`} ($${config.sim.cost})`);
    console.info(`   Grade: ${config.sim.grade} | Success Rate: ${(config.sim.successRate * 100).toFixed(1)}%`);
    console.info(`   ${config.sim.notes}\n`);

    console.info('💰 FINANCIAL ANALYSIS');
    console.info('===================\n');

    if (isDuoPlus) {
        console.info(`🏠 Base Configuration: $${(config.totalCost - config.totalDuoPlusCost).toFixed(2)}`);
        console.info(`☁️ DuoPlus Services: $${config.totalDuoPlusCost.toFixed(2)}`);
        console.info(`⏱️ Setup Time: ${config.setupTime} minutes`);
        console.info(`🤖 Automation: ${config.automationWorkflow.replace('-', ' ').toUpperCase()}`);
        console.info('');
    }

    console.info(`💵 Total Cost per Account: $${config.totalCost.toFixed(2)}`);
    console.info(`📈 Expected Success Rate: ${(config.expectedSuccessRate * 100).toFixed(1)}%`);
    console.info(`💹 Return on Investment: ${(config.roi).toFixed(1)}%`);
    console.info(`🏆 Overall Grade: ${config.grade}`);
    console.info(`✅ Recommended: ${config.recommended ? 'YES' : 'NO'}\n`);

    if (config.recommended) {
      console.info('🚀 This configuration is recommended for production use!');
    } else {
      console.info('⚠️  Consider increasing budget for better success rates.');
    }
  });

program
  .command('recommend')
  .description('Get recommendations for specific use cases')
  .option('-u, --use-case <type>', 'Use case: premium, production, testing, budget', 'production')
  .action((options) => {
    console.info('🍎 Apple ID Creation Recommendations');
    console.info('====================================\n');

    console.info(`🎯 Use Case: ${options.useCase.toUpperCase()}\n`);

    const recommendations = AppleIDGradingSystem.getRecommendations(options.useCase as any);

    recommendations.forEach((config, index) => {
      console.info(`${index + 1}. ${config.grade} Configuration`);
      console.info(`   💵 Cost: $${config.totalCost} | 📈 Success: ${(config.expectedSuccessRate * 100).toFixed(1)}% | 💹 ROI: ${(config.roi).toFixed(1)}%`);

      if (config.recommended) {
        console.info('   ✅ RECOMMENDED');
      }
      console.info('');
    });
  });

program
  .command('compare')
  .description('Compare different budget configurations')
  .option('-b, --budgets <amounts>', 'Comma-separated budget amounts', '20,50,100,200')
  .action((options) => {
    const budgets = options.budgets.split(',').map((b: string) => parseFloat(b.trim()));

    console.info('🍎 Apple ID Budget Comparison');
    console.info('=============================\n');

    console.info('| Budget | Success Rate | Total Cost | ROI | Grade | Recommended |');
    console.info('|--------|--------------|------------|-----|--------|-------------|');

    budgets.forEach(budget => {
      const config = AppleIDGradingSystem.getOptimalConfiguration(budget, '30 days', 50);
      console.info(`| $${budget.toString().padEnd(6)} | ${(config.expectedSuccessRate * 100).toFixed(1).toString().padEnd(12)}% | $${config.totalCost.toString().padEnd(10)} | ${(config.roi).toFixed(0).toString().padEnd(3)}% | ${config.grade.padEnd(6)} | ${config.recommended ? '✅' : '❌'} |`);
    });

    console.info('\n💡 Pro Tip: Professional tier ($50) offers best ROI for serious operations!');
  });

program
  .command('cost-benefit')
  .description('Generate comprehensive cost-benefit analysis')
  .action(() => {
    const analysis = AppleIDGradingSystem.generateCostBenefitAnalysis();
    console.info(analysis);
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
    console.info('📊 Recording Apple ID Creation Performance...\n');

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

    console.info('✅ Performance recorded successfully!');
    console.info(`📈 Record ID: ${record.id}`);
    console.info(`🎯 Success Rate: ${(record.actualResults.successRate * 100).toFixed(1)}%`);
    console.info(`💰 ROI: ${record.actualResults.roi.toFixed(1)}%`);
    console.info(`📊 Prediction Accuracy: ${(record.validation.accuracy * 100).toFixed(1)}%`);
    console.info(`👤 Operator: ${record.metadata.operator}`);
    console.info(`🏭 Environment: ${record.metadata.environment}`);
  });

program
  .command('performance-analytics')
  .description('Display performance analytics and insights')
  .option('--days <number>', 'Analyze last N days', '30')
  .action((options) => {
    console.info('📊 Apple ID Performance Analytics\n');

    const days = parseInt(options.days);
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const analytics = AppleIDGradingSystem.getPerformanceAnalytics({ start: startTime, end: endTime });
    const recommendations = AppleIDGradingSystem.getPerformanceRecommendations();

    console.info('📈 Overall Performance:');
    console.info(`   Total Records: ${analytics.overall.totalRecords}`);
    console.info(`   Average Accuracy: ${(analytics.overall.averageAccuracy * 100).toFixed(1)}%`);
    console.info(`   Average ROI: ${analytics.overall.averageROI.toFixed(1)}%`);
    console.info(`   Overall Success Rate: ${(analytics.overall.overallSuccessRate * 100).toFixed(1)}%`);
    console.info('');

    console.info('🏆 Best Performing Tiers:');
    Object.entries(analytics.byTier)
      .sort(([, a], [, b]) => b.averageAccuracy - a.averageAccuracy)
      .slice(0, 3)
      .forEach(([tier, stats]) => {
        console.info(`   ${tier}: ${(stats.averageAccuracy * 100).toFixed(1)}% accuracy, ${(stats.averageROI).toFixed(1)}% ROI`);
      });
    console.info('');

    if (recommendations.length > 0) {
      console.info('💡 AI Recommendations:');
      recommendations.forEach(rec => {
        console.info(`   • ${rec}`);
      });
      console.info('');
    }

    console.info(`📅 Analysis Period: Last ${days} days`);
  });

program
  .command('export-performance')
  .description('Export performance data as CSV')
  .option('-o, --output <file>', 'Output file path', 'apple-id-performance-data.csv')
  .action(async (options) => {
    console.info('📤 Exporting performance data...\n');

    const csv = AppleIDGradingSystem.exportPerformanceData();

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync(options.output, csv);

    console.info(`✅ Performance data exported to: ${options.output}`);
    console.info(`📊 Total records: ${performanceTracker.getRecordsCount()}`);
  });

program
  .command('clear-performance')
  .description('Clear all performance records (use with caution)')
  .option('--confirm', 'Confirm deletion of all performance data')
  .action((options) => {
    if (!options.confirm) {
      console.info('⚠️  WARNING: This will delete ALL performance records!');
      console.info('Run with --confirm to proceed.');
      return;
    }

    performanceTracker.clearRecords();
    console.info('🗑️  All performance records cleared.');
  });

program
  .command('tiers')
  .description('Show all available configuration tiers')
  .action(() => {
    console.info('🍎 Apple ID Creation Tiers');
    console.info('==========================\n');

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
      console.info(`${tier.name.toUpperCase()} TIER`);
      console.info('='.repeat(tier.name.length + 5));
      console.info(`💰 Budget: ${tier.budget}`);
      console.info(`📈 Success Rate: ${tier.success}`);
      console.info(`💹 ROI: ${tier.roi}`);
      console.info(`🎯 Use Case: ${tier.use}`);
      console.info(`🧩 Components: ${tier.components}\n`);
    });
  });

// Parse arguments
program.parse();