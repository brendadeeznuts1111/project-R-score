#!/usr/bin/env bun

import { VirtualDeviceTracker, VirtualDeviceTask, VirtualDevice } from './virtual-device-tracker';

export class VirtualDeviceDashboard {
  private tracker: VirtualDeviceTracker;
  private updateInterval: any = null;
  
  constructor() {
    this.tracker = new VirtualDeviceTracker();
  }
  
  /**
   * Start real-time dashboard
   */
  start(intervalMs: number = 10000): void {
    console.clear();
    console.log('📱 VIRTUAL DEVICE DASHBOARD - DuoPlus Agent Containers');
    console.log('='.repeat(100));
    console.log('🤖 Android/iOS Simulators | 💳 CashApp Integration | 📱 Messaging | 📧 Email');
    console.log('='.repeat(100));
    
    this.updateInterval = setInterval(async () => {
      await this.updateDashboard();
    }, intervalMs);
    
    // Keep process alive
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
    
    // Start demo tasks
    this.startDemoTasks();
  }
  
  private async updateDashboard(): Promise<void> {
    console.clear();
    
    // Header
    console.log('📱 VIRTUAL DEVICE DASHBOARD - DuoPlus Agent Containers');
    console.log('='.repeat(100));
    console.log(`📅 ${new Date().toLocaleString()} | Auto-refresh every 10s | PID: ${process.pid}`);
    console.log();
    
    // 1. Device Status
    await this.displayDeviceStatus();
    console.log();
    
    // 2. Task Queue Overview
    await this.displayTaskQueues();
    console.log();
    
    // 3. Recent Tasks
    await this.displayRecentTasks();
    console.log();
    
    // 4. Integration Status
    await this.displayIntegrationStatus();
    console.log();
    
    // 5. Performance Metrics
    await this.displayPerformanceMetrics();
    console.log();
    
    // Footer
    console.log('='.repeat(100));
    console.log('🔁 Auto-refreshing | Press Ctrl+C to stop | Demo tasks running');
  }
  
  private async displayDeviceStatus(): Promise<void> {
    console.log('🤖 VIRTUAL DEVICE STATUS');
    console.log('─'.repeat(40));
    
    try {
      const devices = await this.tracker.getDevices();
      
      if (devices.length === 0) {
        console.log('📭 No virtual devices found');
        return;
      }
      
      const deviceData = devices.map(device => ({
        Device: device.deviceId.substring(0, 15),
        Type: device.type.toUpperCase(),
        Agent: device.agentId.substring(0, 10),
        Status: this.formatDeviceStatus(device.status),
        'Active Tasks': device.activeTasks.length,
        CPU: `${device.resourceUsage.cpu}%`,
        Memory: `${Math.round(device.resourceUsage.memory / 1024)}GB`,
        Uptime: this.formatUptime(device.uptime)
      }));
      
      console.log(Bun.inspect.table(deviceData, {
        colors: true,
        indent: 2,
        maxWidth: 90
      }));
      
    } catch (error) {
      console.log('⚠️  Device status unavailable');
    }
  }
  
  private async displayTaskQueues(): Promise<void> {
    console.log('📋 TASK QUEUES');
    console.log('─'.repeat(40));
    
    try {
      const devices = await this.tracker.getDevices();
      const tasks = await this.tracker.getTasks({ limit: 50 });
      
      // Group tasks by status
      const statusCounts = tasks.reduce((counts, task) => {
        counts[task.status] = (counts[task.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const queueData = [
        {
          Queue: 'Pending',
          Count: statusCounts['pending'] || 0,
          'Avg Wait': 'N/A',
          'Oldest': this.getOldestTaskTime(tasks, 'pending')
        },
        {
          Queue: 'Running',
          Count: statusCounts['running'] || 0,
          'Avg Duration': 'N/A',
          'Devices': devices.filter(d => d.activeTasks.length > 0).length
        },
        {
          Queue: 'Completed',
          Count: statusCounts['completed'] || 0,
          'Success Rate': this.calculateSuccessRate(tasks),
          'Last Hour': tasks.filter(t => 
            t.status === 'completed' && 
            new Date(t.endTime!).getTime() > Date.now() - 3600000
          ).length
        },
        {
          Queue: 'Failed',
          Count: statusCounts['failed'] || 0,
          'Error Rate': `${((statusCounts['failed'] || 0) / (tasks.length || 1) * 100).toFixed(1)}%`,
          'Recent': tasks.filter(t => 
            t.status === 'failed' && 
            new Date(t.endTime!).getTime() > Date.now() - 3600000
          ).length
        }
      ];
      
      console.log(Bun.inspect.table(queueData, {
        colors: true,
        indent: 2,
        maxWidth: 80
      }));
      
    } catch (error) {
      console.log('⚠️  Task queue data unavailable');
    }
  }
  
  private async displayRecentTasks(): Promise<void> {
    console.log('📝 RECENT TASKS');
    console.log('─'.repeat(40));
    
    try {
      const tasks = await this.tracker.getTasks({ 
        limit: 8,
        startTime: new Date(Date.now() - 3600000).toISOString() // Last hour
      });
      
      if (tasks.length === 0) {
        console.log('📭 No recent tasks');
        return;
      }
      
      const taskData = tasks.map(task => ({
        ID: task.taskId.substring(0, 8),
        Type: task.taskType.substring(0, 12),
        Device: task.deviceType.toUpperCase(),
        Status: this.formatTaskStatus(task.status),
        Priority: task.priority.substring(0, 1).toUpperCase(),
        Duration: task.duration ? `${task.duration}ms` : 'N/A',
        'Start Time': new Date(task.startTime).toLocaleTimeString()
      }));
      
      console.log(Bun.inspect.table(taskData, {
        colors: true,
        indent: 2,
        maxWidth: 90
      }));
      
    } catch (error) {
      console.log('⚠️  Recent tasks unavailable');
    }
  }
  
  private async displayIntegrationStatus(): Promise<void> {
    console.log('🔗 INTEGRATION STATUS');
    console.log('─'.repeat(40));
    
    try {
      const integrationData = [
        {
          Service: 'CashApp',
          Status: '🟢 Connected',
          Accounts: '2',
          'Last Sync': '2 min ago',
          'Balance': '$1,250.50',
          '24h Txns': '12'
        },
        {
          Service: 'SMS',
          Status: '🟢 Connected',
          Accounts: '1',
          'Last Msg': '5 min ago',
          'Sent/24h': '45',
          'Success Rate': '99.8%'
        },
        {
          Service: 'WhatsApp',
          Status: '🟢 Connected',
          Accounts: '1',
          'Last Msg': '3 min ago',
          'Sent/24h': '28',
          'Success Rate': '99.5%'
        },
        {
          Service: 'Gmail',
          Status: '🟢 Connected',
          Accounts: '1',
          'Last Sync': '1 min ago',
          'Unread': '12',
          'Storage': '4.2/15 GB'
        }
      ];
      
      console.log(Bun.inspect.table(integrationData, {
        colors: true,
        indent: 2,
        maxWidth: 90
      }));
      
    } catch (error) {
      console.log('⚠️  Integration status unavailable');
    }
  }
  
  private async displayPerformanceMetrics(): Promise<void> {
    console.log('📊 PERFORMANCE METRICS');
    console.log('─'.repeat(40));
    
    try {
      const stats = await this.tracker.getTaskStatistics('1h');
      
      const performanceData = [
        {
          Metric: 'Task Success Rate',
          Value: `${stats.successRate.toFixed(1)}%`,
          Status: stats.successRate > 95 ? '✅' : stats.successRate > 90 ? '⚠️' : '❌',
          Target: '>95%'
        },
        {
          Metric: 'Avg Task Duration',
          Value: `${stats.avgDuration.toFixed(0)}ms`,
          Status: stats.avgDuration < 2000 ? '✅' : stats.avgDuration < 5000 ? '⚠️' : '❌',
          Target: '<2s'
        },
        {
          Metric: 'Error Rate',
          Value: `${((stats.errorCount / (stats.total || 1)) * 100).toFixed(1)}%`,
          Status: (stats.errorCount / (stats.total || 1)) < 0.05 ? '✅' : (stats.errorCount / (stats.total || 1)) < 0.1 ? '⚠️' : '❌',
          Target: '<5%'
        }
      ];
      
      console.log(Bun.inspect.table(performanceData, {
        colors: true,
        indent: 2,
        maxWidth: 70
      }));
        
    } catch (error) {
      console.log('⚠️  Performance metrics unavailable');
    }
  }
  
  private startDemoTasks(): void {
    setInterval(async () => {
      const taskTypes = ['transaction', 'message_send', 'email_send', 'balance_check'];
      const randomType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      
      try {
        switch (randomType) {
          case 'transaction':
            await this.tracker.createCashAppTransaction('agent-enterprise-001', {
              type: Math.random() > 0.5 ? 'send' : 'receive',
              amount: Math.floor(Math.random() * 500) + 10,
              note: 'Demo transaction'
            });
            break;
          case 'message_send':
            await this.tracker.createMessageSend('agent-enterprise-001', {
              type: 'sms',
              to: ['+19876543210'],
              body: 'Demo message'
            });
            break;
          case 'email_send':
            await this.tracker.createEmailSend('agent-enterprise-002', {
              to: ['recipient@example.com'],
              subject: 'Demo Email',
              body: 'Demo body'
            });
            break;
          case 'balance_check':
            await this.tracker.createTask({
              agentId: 'agent-enterprise-001',
              taskType: 'balance_check' as any
            });
            break;
        }
      } catch (error) {}
    }, 15000);
  }
  
  private formatDeviceStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'online': '🟢 Online',
      'offline': '🔴 Offline',
      'busy': '🟡 Busy',
      'idle': '⚪ Idle',
      'error': '🔴 Error',
      'maintenance': '🛠️  Maintenance'
    };
    return statusMap[status] || '❓ Unknown';
  }
  
  private formatTaskStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '🕐 Pending',
      'running': '⚡ Running',
      'completed': '✅ Completed',
      'failed': '❌ Failed',
      'cancelled': '⏹️  Cancelled'
    };
    return statusMap[status] || '❓ Unknown';
  }
  
  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  
  private getOldestTaskTime(tasks: VirtualDeviceTask[], status: string): string {
    const pendingTasks = tasks.filter(t => t.status === status);
    if (pendingTasks.length === 0) return 'N/A';
    const oldest = pendingTasks.reduce((a, b) => 
      new Date(a.startTime).getTime() < new Date(b.startTime).getTime() ? a : b
    );
    const age = Date.now() - new Date(oldest.startTime).getTime();
    return `${Math.floor(age / 60000)}m ago`;
  }
  
  private calculateSuccessRate(tasks: VirtualDeviceTask[]): string {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const total = completed + failed;
    return total === 0 ? 'N/A' : `${((completed / total) * 100).toFixed(1)}%`;
  }
  
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  async generateComprehensiveReport(reportsDir: string = './'): Promise<string> {
    const report = await this.tracker.generatePerformanceReport('24h');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `virtual-device-report-${timestamp}.json`;
    const fullPath = `${reportsDir}/${filename}`;
    
    // Ensure directory exists using native Bun.write() trick
    const gitkeepPath = `${reportsDir}/.gitkeep`;
    await Bun.write(gitkeepPath, '');
    
    // Write the report
    await Bun.write(fullPath, report);
    
    // Register in manifest
    await this.registerReportInManifest(filename, reportsDir);
    
    return fullPath;
  }
  
  async cleanupOldReports(reportsDir: string, keepCount: number = 5): Promise<void> {
    try {
      // Ensure directory exists first
      const gitkeepPath = `${reportsDir}/.gitkeep`;
      await Bun.write(gitkeepPath, '');
      
      // Read manifest
      const manifestPath = `${reportsDir}/manifest.json`;
      const manifestFile = Bun.file(manifestPath);
      
      let manifest: { reports: Array<{ filename: string; timestamp: number }> } = { reports: [] };
      
      if (await manifestFile.exists()) {
        manifest = await manifestFile.json();
      }
      
      // Sort by timestamp (newest first)
      const sortedReports = [...manifest.reports].sort((a, b) => b.timestamp - a.timestamp);
      
      // Identify files to delete
      const filesToDelete = sortedReports.slice(keepCount);
      
      // Delete old reports using native Bun.file().delete()
      for (const reportInfo of filesToDelete) {
        const filePath = `${reportsDir}/${reportInfo.filename}`;
        try {
          await Bun.file(filePath).delete();
          console.log(`🗑️  Removed old report: ${reportInfo.filename}`);
        } catch (e) {
          console.warn(`⚠️  Could not delete ${reportInfo.filename}:`, e);
        }
      }
      
      // Update manifest to keep only the latest reports
      const updatedManifest = {
        reports: sortedReports.slice(0, keepCount)
      };
      
      await Bun.write(manifestPath, JSON.stringify(updatedManifest, null, 2));
      
      if (filesToDelete.length === 0) {
        console.log(`✨ No old reports to clean up (keeping ${sortedReports.length} reports)`);
      }
    } catch (error) {
      console.warn('⚠️  Could not cleanup reports:', error);
    }
  }
  
  private async registerReportInManifest(filename: string, reportsDir: string): Promise<void> {
    try {
      const manifestPath = `${reportsDir}/manifest.json`;
      const manifestFile = Bun.file(manifestPath);
      
      let manifest: { reports: Array<{ filename: string; timestamp: number }> } = { reports: [] };
      
      if (await manifestFile.exists()) {
        manifest = await manifestFile.json();
      }
      
      // Extract timestamp from filename
      const timestampMatch = filename.match(/virtual-device-report-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)/);
      const timestamp = timestampMatch ? new Date(timestampMatch[1].replace(/-/g, ':').replace('.', ':')).getTime() : Date.now();
      
      // Add new report to manifest
      manifest.reports.push({
        filename,
        timestamp
      });
      
      // Write updated manifest
      await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
      
      console.log(`📝 Registered report in manifest: ${filename}`);
    } catch (error) {
      console.warn('⚠️  Could not register report in manifest:', error);
    }
  }
  
  async runTaskSimulation(durationMinutes: number = 5): Promise<void> {
    const endTime = Date.now() + durationMinutes * 60000;
    const interval = setInterval(async () => {
      if (Date.now() > endTime) {
        clearInterval(interval);
        return;
      }
      await this.tracker.createTask({
        agentId: 'agent-enterprise-001',
        taskType: 'balance_check' as any
      });
    }, 2000);
  }
}