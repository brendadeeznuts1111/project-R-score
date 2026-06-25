#!/usr/bin/env bun

/**
 * 🎯 Virtual Device Tracker Subscription Demo
 * Comprehensive demonstration of subscription capabilities with CashApp integration
 */

import { VirtualDeviceTracker, VirtualDeviceTask, VirtualDeviceSubscription } from './virtual-device-tracker';
import { VirtualDeviceDashboard } from './virtual-device-dashboard';

/**
 * 🎯 Subscription Demo Class
 */
class SubscriptionDemo {
  private tracker: VirtualDeviceTracker;
  private dashboard: VirtualDeviceDashboard;

  constructor() {
    this.tracker = new VirtualDeviceTracker();
    this.dashboard = new VirtualDeviceDashboard(this.tracker);
  }

  /**
   * 🚀 Run complete subscription demo
   */
  async runDemo(): Promise<void> {
    console.info('🎯 Virtual Device Tracker Subscription Demo');
    console.info('═'.repeat(60));
    
    try {
      await this.createSampleSubscriptions();
      await this.executeTasks();
      await this.displayMetrics();
      await this.testSubscriptionManagement();
      await this.showDashboard();
      
    } catch (error: any) {
      console.error('❌ Demo failed:', error.message);
    } finally {
      this.tracker.stop();
    }
  }

  /**
   * 🔁 Create sample subscriptions
   */
  private async createSampleSubscriptions(): Promise<void> {
    console.info('\n🔁 Creating Sample Subscriptions');
    console.info('─'.repeat(40));

    // 1. Monthly CashApp payment subscription
    const monthlyPayment = await this.tracker.createSubscription(
      'agent-enterprise-001',
      {
        deviceType: 'android',
        platform: 'duoplus',
        taskType: 'transaction',
        details: {
          transaction: {
            type: 'send',
            amount: 29.99,
            recipient: '$ServiceProvider',
            note: 'Monthly SaaS fee',
            status: 'pending'
          }
        },
        tags: ['subscription', 'saas', 'cashapp']
      },
      {
        interval: 'monthly',
        count: 12 // 1-year plan
      },
      {
        amount: 29.99,
        currency: 'USD',
        recipient: '$ServiceProvider',
        note: 'DuoPlus Automation - Monthly',
        nextBillingAt: new Date(Date.now() + 30 * 86400000).toISOString()
      },
      {
        plan: 'enterprise',
        customer: 'Acme Corp'
      }
    );

    console.info(`✅ Created monthly payment subscription: ${monthlyPayment.subscriptionId}`);

    // 2. Weekly monitoring subscription
    const weeklyMonitoring = await this.tracker.createSubscription(
      'agent-monitoring-001',
      {
        deviceType: 'web',
        platform: 'duoplus',
        taskType: 'monitoring',
        details: {
          monitoring: {
            metric: 'system_health',
            threshold: 80,
            alertLevel: 'warning'
          }
        },
        tags: ['monitoring', 'health', 'automated']
      },
      {
        interval: 'weekly'
        // No count - runs indefinitely
      },
      undefined, // No billing
      {
        service: 'system-monitoring',
        environment: 'production'
      }
    );

    console.info(`✅ Created weekly monitoring subscription: ${weeklyMonitoring.subscriptionId}`);

    // 3. Daily maintenance subscription
    const dailyMaintenance = await this.tracker.createSubscription(
      'agent-maintenance-001',
      {
        deviceType: 'api',
        platform: 'duoplus',
        taskType: 'maintenance',
        details: {
          cleanup: true,
          backup: true,
          optimization: true
        },
        tags: ['maintenance', 'automation', 'daily']
      },
      {
        interval: 'daily',
        count: 30 // 30 days
      },
      undefined, // No billing
      {
        service: 'system-maintenance',
        priority: 'low'
      }
    );

    console.info(`✅ Created daily maintenance subscription: ${dailyMaintenance.subscriptionId}`);

    // 4. Hourly analytics subscription
    const hourlyAnalytics = await this.tracker.createSubscription(
      'agent-analytics-001',
      {
        deviceType: 'cli',
        platform: 'standalone',
        taskType: 'analytics',
        details: {
          reportType: 'performance',
          exportFormat: 'json',
          destinations: ['s3', 'email']
        },
        tags: ['analytics', 'reporting', 'hourly']
      },
      {
        interval: 'hourly'
        // No count - runs indefinitely
      },
      undefined, // No billing
      {
        service: 'analytics-engine',
        retention: '90d'
      }
    );

    console.info(`✅ Created hourly analytics subscription: ${hourlyAnalytics.subscriptionId}`);

    // 5. Custom bi-weekly subscription
    const biWeeklyReport = await this.tracker.createSubscription(
      'agent-reporting-001',
      {
        deviceType: 'web',
        platform: 'cashapp',
        taskType: 'transaction',
        details: {
          transaction: {
            type: 'send',
            amount: 15.00,
            recipient: '$Analyst',
            note: 'Bi-weekly report payment',
            status: 'pending'
          }
        },
        tags: ['reporting', 'payment', 'biweekly']
      },
      {
        interval: 'weekly',
        count: 24 // 12 months * 2
      },
      {
        amount: 15.00,
        currency: 'USD',
        recipient: '$Analyst',
        note: 'Bi-weekly reporting service',
        nextBillingAt: new Date(Date.now() + 14 * 86400000).toISOString()
      },
      {
        service: 'reporting-service',
        frequency: 'bi-weekly'
      }
    );

    console.info(`✅ Created bi-weekly reporting subscription: ${biWeeklyReport.subscriptionId}`);

    console.info(`\n📊 Created 5 sample subscriptions with various intervals and billing`);
  }

  /**
   * ⚡ Execute some tasks to demonstrate functionality
   */
  private async executeTasks(): Promise<void> {
    console.info('\n⚡ Executing Sample Tasks');
    console.info('─'.repeat(40));

    // Create some standalone tasks
    const tasks = [
      {
        agentId: 'agent-demo-001',
        deviceType: 'android' as const,
        platform: 'duoplus' as const,
        taskType: 'transaction' as const,
        status: 'pending' as const,
        priority: 'high' as const,
        details: {
          transaction: {
            type: 'send' as const,
            amount: 100.00,
            recipient: '$DemoUser',
            note: 'Demo transaction',
            status: 'pending' as const
          }
        },
        tags: ['demo', 'test'],
        metadata: { demo: true }
      },
      {
        agentId: 'agent-demo-002',
        deviceType: 'web' as const,
        platform: 'cashapp' as const,
        taskType: 'monitoring' as const,
        status: 'pending' as const,
        priority: 'medium' as const,
        details: {
          monitoring: {
            metric: 'response_time',
            threshold: 500,
            alertLevel: 'warning' as const
          }
        },
        tags: ['demo', 'monitoring'],
        metadata: { demo: true }
      },
      {
        agentId: 'agent-demo-003',
        deviceType: 'api' as const,
        platform: 'standalone' as const,
        taskType: 'automation' as const,
        status: 'pending' as const,
        priority: 'low' as const,
        details: {
          automationType: 'data_cleanup',
          target: 'user_sessions',
          retention: '30d'
        },
        tags: ['demo', 'automation'],
        metadata: { demo: true }
      }
    ];

    for (const taskData of tasks) {
      const task = await this.tracker.createTask(taskData);
      console.info(`✅ Created and executed task: ${task.taskId} (${task.taskType})`);
      
      // Wait a moment between tasks
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.info(`\n📊 Executed ${tasks.length} sample tasks`);
  }

  /**
   * 📊 Display metrics and analytics
   */
  private async displayMetrics(): Promise<void> {
    console.info('\n📊 Subscription & Task Metrics');
    console.info('─'.repeat(40));

    const subMetrics = await this.tracker.getSubscriptionMetrics();
    const taskMetrics = await this.tracker.getTaskMetrics();
    const perfMetrics = this.tracker.getPerformanceMetrics();

    console.info('\n🔁 Subscription Metrics:');
    console.info(`   Total: ${subMetrics.total}`);
    console.info(`   Active: ${subMetrics.active}`);
    console.info(`   Paused: ${subMetrics.paused}`);
    console.info(`   Cancelled: ${subMetrics.cancelled}`);
    console.info(`   Success Rate: ${subMetrics.successRate.toFixed(2)}%`);
    console.info(`   Avg Latency: ${subMetrics.avgLatency}ms`);

    console.info('\n📋 Task Metrics:');
    console.info(`   Total: ${taskMetrics.total}`);
    console.info(`   Completed: ${taskMetrics.byStatus.completed || 0}`);
    console.info(`   Running: ${taskMetrics.byStatus.running || 0}`);
    console.info(`   Failed: ${taskMetrics.byStatus.failed || 0}`);
    console.info(`   Avg Duration: ${Math.round(taskMetrics.avgDuration)}ms`);

    console.info('\n⚡ Performance Metrics:');
    Object.entries(perfMetrics).forEach(([metric, value]) => {
      console.info(`   ${metric}: ${value}ms`);
    });
  }

  /**
   * 🛠️ Test subscription management
   */
  private async testSubscriptionManagement(): Promise<void> {
    console.info('\n🛠️ Testing Subscription Management');
    console.info('─'.repeat(40));

    // Get all subscriptions
    const allSubs = await this.tracker.listSubscriptions({});
    console.info(`📋 Found ${allSubs.length} total subscriptions`);

    // Get active subscriptions
    const activeSubs = await this.tracker.listSubscriptions({ status: 'active' });
    console.info(`🟢 ${activeSubs.length} active subscriptions`);

    // Get subscriptions by type
    const transactionSubs = await this.tracker.listSubscriptions({ taskType: 'transaction' });
    console.info(`💳 ${transactionSubs.length} transaction subscriptions`);

    // Test pausing a subscription
    if (activeSubs.length > 0) {
      const firstSub = activeSubs[0];
      const updated = await this.tracker.updateSubscription(firstSub.subscriptionId, {
        status: 'paused'
      });
      
      if (updated) {
        console.info(`⏸️ Paused subscription: ${firstSub.subscriptionId}`);
        
        // Resume it after a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.tracker.updateSubscription(firstSub.subscriptionId, {
          status: 'active'
        });
        console.info(`▶️ Resumed subscription: ${firstSub.subscriptionId}`);
      }
    }

    // Test getting a specific subscription
    if (allSubs.length > 0) {
      const specificSub = await this.tracker.getSubscription(allSubs[0].subscriptionId);
      if (specificSub) {
        console.info(`🔍 Retrieved subscription: ${specificSub.subscriptionId}`);
        console.info(`   Status: ${specificSub.status}`);
        console.info(`   Interval: ${specificSub.recurrence.interval}`);
        console.info(`   Executed: ${specificSub.recurrence.executed}/${specificSub.recurrence.count || '∞'}`);
      }
    }
  }

  /**
   * 📊 Show dashboard
   */
  private async showDashboard(): Promise<void> {
    console.info('\n📊 Virtual Device Dashboard');
    console.info('═'.repeat(60));
    
    await this.dashboard.updateDashboard();
    
    console.info('\n📈 Detailed Subscription Report:');
    await this.dashboard.displaySubscriptionReport();
  }
}

/**
 * 🚀 Main execution function
 */
async function main(): Promise<void> {
  console.info('🎯 Starting Virtual Device Tracker Subscription Demo...\n');
  
  const demo = new SubscriptionDemo();
  await demo.runDemo();
  
  console.info('\n🎉 Demo completed successfully!');
  console.info('\n💡 Next steps:');
  console.info('   • Integrate with real CashApp API');
  console.info('   • Add webhook-based subscription triggers');
  console.info('   • Implement cancellation/refund workflows');
  console.info('   • Add proration logic for plan changes');
  console.info('   • Export to CSV/JSON for billing reconciliation');
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { SubscriptionDemo };
