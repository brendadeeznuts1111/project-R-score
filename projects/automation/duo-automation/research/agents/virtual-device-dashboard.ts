/**
 * 📊 Virtual Device Dashboard with Subscription Metrics
 * Enhanced dashboard with subscription visibility and analytics
 */

import { VirtualDeviceTracker, VirtualDeviceTask, VirtualDeviceSubscription, SubscriptionMetrics } from './virtual-device-tracker';

/**
 * 📊 Unicode Table Formatter
 */
class UnicodeTableFormatter {
  static generateTable(data: Array<Record<string, any>>, options: { maxWidth?: number; compact?: boolean } = {}): string {
    const { maxWidth = 80, compact = false } = options;
    
    if (data.length === 0) return 'No data available';
    
    const headers = Object.keys(data[0]);
    const columnWidths = headers.map(header => {
      const maxWidthCol = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return Math.min(maxWidthCol, Math.floor(maxWidth / headers.length) - 2);
    });

    const formatRow = (row: Record<string, any>) => {
      return '│ ' + headers.map((header, i) => {
        const value = String(row[header] || '');
        const truncated = value.length > columnWidths[i] ? value.substring(0, columnWidths[i] - 1) + '…' : value;
        return truncated.padEnd(columnWidths[i]);
      }).join(' │ ') + ' │';
    };

    const separator = '├─' + columnWidths.map(width => '─'.repeat(width)).join('─┼─') + '─┤';
    const topBorder = '┌─' + columnWidths.map(width => '─'.repeat(width)).join('─┬─') + '─┐';
    const bottomBorder = '└─' + columnWidths.map(width => '─'.repeat(width)).join('─┴─') + '─┘';

    let table = topBorder + '\n';
    table += '│ ' + headers.map((header, i) => header.padEnd(columnWidths[i])).join(' │ ') + ' │\n';
    table += separator + '\n';
    
    data.forEach(row => {
      table += formatRow(row) + '\n';
      if (!compact) table += separator + '\n';
    });
    
    table += bottomBorder;
    return table;
  }
}

/**
 * 📊 Virtual Device Dashboard Class
 */
export class VirtualDeviceDashboard {
  private tracker: VirtualDeviceTracker;

  constructor(tracker: VirtualDeviceTracker) {
    this.tracker = tracker;
  }

  /**
   * 🔄 Update and display full dashboard
   */
  async updateDashboard(): Promise<void> {
    console.clear();
    console.log('📱 Virtual Device Tracker Dashboard');
    console.log('═'.repeat(60));
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');

    await this.displaySystemStatus();
    await this.displayTaskMetrics();
    await this.displaySubscriptionMetrics();
    await this.displayActiveSubscriptions();
    await this.displayRecentTasks();
    await this.displayPerformanceMetrics();
    await this.displayIntegrationStatus();

    console.log('\n' + '═'.repeat(60));
    console.log('💡 Press Ctrl+C to exit • Dashboard refreshes every 30 seconds');
  }

  /**
   * 🟢 Display system status
   */
  private async displaySystemStatus(): Promise<void> {
    console.log('🟢 SYSTEM STATUS');
    console.log('─'.repeat(40));
    
    const taskMetrics = await this.tracker.getTaskMetrics();
    const subMetrics = await this.tracker.getSubscriptionMetrics();
    
    const statusData = [
      { Component: 'Task Engine', Status: '🟢 Operational', Tasks: taskMetrics.total },
      { Component: 'Subscription Engine', Status: '🟢 Operational', Subscriptions: subMetrics.total },
      { Component: 'CashApp Integration', Status: this.tracker['cashAppIntegrations'].size > 0 ? '🟢 Connected' : '⚠️ Not Connected', Integrations: this.tracker['cashAppIntegrations'].size },
      { Component: 'Scheduler', Status: '🟢 Running', Interval: '1 minute' }
    ];
    
    console.log(UnicodeTableFormatter.generateTable(statusData, { maxWidth: 60, compact: true }));
    console.log('');
  }

  /**
   * 📋 Display task metrics
   */
  private async displayTaskMetrics(): Promise<void> {
    console.log('📋 TASK METRICS');
    console.log('─'.repeat(40));
    
    const metrics = await this.tracker.getTaskMetrics();
    
    const metricsData = [
      { Metric: 'Total Tasks', Value: metrics.total },
      { Metric: 'Completed', Value: metrics.byStatus.completed || 0, Status: '✅' },
      { Metric: 'Running', Value: metrics.byStatus.running || 0, Status: '🔄' },
      { Metric: 'Failed', Value: metrics.byStatus.failed || 0, Status: '❌' },
      { Metric: 'Avg Duration', Value: `${Math.round(metrics.avgDuration)}ms` }
    ];
    
    console.log(UnicodeTableFormatter.generateTable(metricsData, { maxWidth: 60, compact: true }));
    
    // Task type breakdown
    if (Object.keys(metrics.byType).length > 0) {
      console.log('\n📊 By Type:');
      Object.entries(metrics.byType).forEach(([type, count]) => {
        const icon = type === 'transaction' ? '💳' : 
                    type === 'monitoring' ? '📊' : 
                    type === 'automation' ? '🔧' : '⚙️';
        console.log(`   ${icon} ${type}: ${count}`);
      });
    }
    console.log('');
  }

  /**
   * 🔁 Display subscription metrics
   */
  private async displaySubscriptions(): Promise<void> {
    console.log('🔁 SUBSCRIPTIONS');
    console.log('─'.repeat(40));
    
    try {
      const metrics = await this.tracker.getSubscriptionMetrics();
      const subs = await this.tracker.listSubscriptions({ status: 'active' });
      const data = [
        { Metric: 'Total Subscriptions', Value: metrics.total },
        { Metric: 'Active', Value: metrics.active, Status: '🟢' },
        { Metric: 'Paused/Cancelled', Value: metrics.paused + metrics.cancelled, Status: '⏸️' },
        { Metric: 'Success Rate', Value: `${metrics.successRate.toFixed(1)}%` },
        { Metric: 'Avg Latency', Value: `${metrics.avgLatency}ms` }
      ];
      console.log(UnicodeTableFormatter.generateTable(data, { maxWidth: 60, compact: true }));

      if (subs.length > 0) {
        console.log('\n📅 Active Recurrences:');
        subs.slice(0, 3).forEach(sub => {
          console.log(`   • ${sub.recurrence.interval} → ${sub.taskTemplate.taskType} (next: ${new Date(sub.recurrence.nextRunAt).toLocaleTimeString()})`);
        });
      }
    } catch (err) {
      console.log('⚠️ Subscription data unavailable');
    }
    console.log('');
  }

  /**
   * 🔁 Display subscription metrics (alias for consistency)
   */
  private async displaySubscriptionMetrics(): Promise<void> {
    await this.displaySubscriptions();
  }

  /**
   * 📋 Display active subscriptions
   */
  private async displayActiveSubscriptions(): Promise<void> {
    console.log('📋 ACTIVE SUBSCRIPTIONS');
    console.log('─'.repeat(40));
    
    try {
      const activeSubs = await this.tracker.listSubscriptions({ status: 'active' });
      
      if (activeSubs.length === 0) {
        console.log('📭 No active subscriptions');
        console.log('');
        return;
      }

      const subscriptionData = activeSubs.slice(0, 5).map(sub => ({
        ID: sub.subscriptionId.slice(0, 12) + '...',
        Type: sub.taskTemplate.taskType || 'unknown',
        Interval: sub.recurrence.interval,
        Executed: `${sub.recurrence.executed}/${sub.recurrence.count || '∞'}`,
        Next: new Date(sub.recurrence.nextRunAt).toLocaleTimeString()
      }));
      
      console.log(UnicodeTableFormatter.generateTable(subscriptionData, { maxWidth: 70, compact: true }));
      
      if (activeSubs.length > 5) {
        console.log(`\n   ... and ${activeSubs.length - 5} more active subscriptions`);
      }
    } catch (err) {
      console.log('⚠️ Unable to load active subscriptions');
    }
    console.log('');
  }

  /**
   * 📋 Display recent tasks
   */
  private async displayRecentTasks(): Promise<void> {
    console.log('📋 RECENT TASKS');
    console.log('─'.repeat(40));
    
    try {
      const recentTasks = await this.tracker.listTasks({});
      
      if (recentTasks.length === 0) {
        console.log('📭 No tasks found');
        console.log('');
        return;
      }

      const taskData = recentTasks.slice(0, 5).map(task => ({
        ID: task.taskId.slice(0, 12) + '...',
        Type: task.taskType,
        Status: task.status,
        Duration: task.duration ? `${task.duration}ms` : '-',
        Time: new Date(task.createdAt).toLocaleTimeString()
      }));
      
      console.log(UnicodeTableFormatter.generateTable(taskData, { maxWidth: 70, compact: true }));
      
      if (recentTasks.length > 5) {
        console.log(`\n   ... and ${recentTasks.length - 5} more tasks`);
      }
    } catch (err) {
      console.log('⚠️ Unable to load recent tasks');
    }
    console.log('');
  }

  /**
   * ⚡ Display performance metrics
   */
  private async displayPerformanceMetrics(): Promise<void> {
    console.log('⚡ PERFORMANCE METRICS');
    console.log('─'.repeat(40));
    
    const perfMetrics = this.tracker.getPerformanceMetrics();
    
    const performanceData = [
      { Metric: 'Task Execution Time', Value: `${perfMetrics.taskExecutionTime || 0}ms` },
      { Metric: 'Subscription Processing', Value: `${perfMetrics.subscriptionProcessingTime || 0}ms` },
      { Metric: 'CashApp Transactions', Value: `${perfMetrics.cashAppTransactionTime || 0}ms` },
      { Metric: 'Memory Usage', Value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB` }
    ];
    
    console.log(UnicodeTableFormatter.generateTable(performanceData, { maxWidth: 60, compact: true }));
    console.log('');
  }

  /**
   * 🔗 Display integration status
   */
  private async displayIntegrationStatus(): Promise<void> {
    console.log('🔗 INTEGRATION STATUS');
    console.log('─'.repeat(40));
    
    const integrations = this.tracker['cashAppIntegrations'];
    
    const integrationData = [
      { Service: 'CashApp', Status: integrations.size > 0 ? '🟢 Connected' : '⚠️ Not Connected', Count: integrations.size },
      { Service: 'Scheduler', Status: '🟢 Running', Count: '1 min interval' },
      { Service: 'Database', Status: '🟢 In-Memory', Count: 'Local' },
      { Service: 'Logging', Status: '🟢 Console', Count: 'Enabled' }
    ];
    
    console.log(UnicodeTableFormatter.generateTable(integrationData, { maxWidth: 60, compact: true }));
  }

  /**
   * 🔄 Start dashboard refresh loop
   */
  startRefreshLoop(intervalMs: number = 30000): void {
    console.log('🔄 Starting dashboard refresh loop...');
    
    setInterval(async () => {
      try {
        await this.updateDashboard();
      } catch (error) {
        console.error('❌ Dashboard refresh failed:', error);
      }
    }, intervalMs);
  }

  /**
   * 📊 Display detailed subscription report
   */
  async displaySubscriptionReport(): Promise<void> {
    console.log('📊 DETAILED SUBSCRIPTION REPORT');
    console.log('═'.repeat(60));
    
    const metrics = await this.tracker.getSubscriptionMetrics();
    const allSubs = await this.tracker.listSubscriptions({});
    
    console.log('\n📈 Overall Metrics:');
    console.log(`   Total Subscriptions: ${metrics.total}`);
    console.log(`   Active: ${metrics.active} (${((metrics.active / metrics.total) * 100).toFixed(1)}%)`);
    console.log(`   Success Rate: ${metrics.successRate.toFixed(2)}%`);
    console.log(`   Average Latency: ${metrics.avgLatency}ms`);
    
    console.log('\n📅 By Interval:');
    Object.entries(metrics.byInterval).forEach(([interval, count]) => {
      console.log(`   ${interval}: ${count} subscriptions`);
    });
    
    console.log('\n📋 Subscription Details:');
    const subDetails = allSubs.map(sub => ({
      ID: sub.subscriptionId,
      Agent: sub.agentId,
      Status: sub.status,
      Type: sub.taskTemplate.taskType,
      Interval: sub.recurrence.interval,
      Executed: `${sub.recurrence.executed}/${sub.recurrence.count || '∞'}`,
      'Next Run': new Date(sub.recurrence.nextRunAt).toLocaleString(),
      Billing: sub.billing ? `$${sub.billing.amount}/${sub.billing.currency}` : 'No billing'
    }));
    
    console.log(UnicodeTableFormatter.generateTable(subDetails, { maxWidth: 100 }));
  }
}

/**
 * 🚀 Create Virtual Device Dashboard instance
 */
export function createVirtualDeviceDashboard(tracker: VirtualDeviceTracker): VirtualDeviceDashboard {
  return new VirtualDeviceDashboard(tracker);
}

export default VirtualDeviceDashboard;
