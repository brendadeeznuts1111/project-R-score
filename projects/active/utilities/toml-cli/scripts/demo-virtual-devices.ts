#!/usr/bin/env bun

import { VirtualDeviceDashboard } from '../agent-container/virtual-device-dashboard';
import { VirtualDeviceHubIntegration } from '../agent-container/hub-integration';

/**
 * Demo script for virtual device integration
 */
class VirtualDeviceDemo {
  private dashboard: VirtualDeviceDashboard;
  private integration: VirtualDeviceHubIntegration;
  
  constructor() {
    this.dashboard = new VirtualDeviceDashboard();
    this.integration = new VirtualDeviceHubIntegration();
  }
  
  async startDashboard(): Promise<void> {
    console.clear();
    console.info('🚀 VIRTUAL DEVICE DEMO - DuoPlus Integration');
    console.info('='.repeat(100));
    console.info('📱 Android/iOS Simulators | 💳 CashApp | 📧 Email | 📱 Messaging');
    console.info('='.repeat(100));
    
    this.dashboard.start();
    
    // Keep process alive
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }
  
  async runIntegrationDemo(): Promise<void> {
    console.clear();
    console.info('🔗 VIRTUAL DEVICE INTEGRATION DEMO');
    console.info('='.repeat(100));

    console.info('\n1. 📡 STARTING INTEGRATION...');
    await this.integration.startIntegratedMonitoring();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.info('\n2. 📊 SIMULATING TASKS...');
    const result = await this.integration.handleCreateTask({
      taskType: 'cashapp_transaction',
      agentId: 'agent-enterprise-001',
      details: { transaction: { type: 'send', amount: 100 } },
      priority: 'medium'
    });
    console.info(`   ✅ Created task: ${result.taskId}`);

    console.info('\n3. 📈 CHECKING STATISTICS...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const stats = await this.integration.handleGetStats({ timeRange: '1h' });
    console.info(`      • Total tasks: ${stats.stats.total}`);

    console.info('\n4. 🤖 DEVICE CONTROL DEMO...');
    const controlResult = await this.integration.handleDeviceControl({
      deviceId: 'android-emulator-001',
      action: 'restart'
    });
    console.info(`   ✅ Device control: ${controlResult.message}`);

    console.info('\n' + '='.repeat(100));
    console.info('🎯 DEMO COMPLETE');
    process.exit(0);
  }
  
  async generateReport(): Promise<void> {
    console.info('📊 Generating virtual device performance report...');
    
    const reportsDir = './reports';
    
    // Generate report with proper location
    const reportPath = await this.dashboard.generateComprehensiveReport(reportsDir);
    
    // Clean up old reports (keep last 5)
    await this.dashboard.cleanupOldReports(reportsDir, 5);
    
    console.info(`\n✅ Report saved to: ${reportPath}`);
    console.info('🗑️  Old reports cleaned up (keeping last 5)');
    
    process.exit(0);
  }
  
  async runTaskSimulation(): Promise<void> {
    console.info('🎯 Running task simulation...');
    await this.dashboard.runTaskSimulation(3); // 3 minute simulation
    console.info('🎯 Task simulation completed');
    process.exit(0);
  }
  
  stop(): void {
    this.dashboard.stop();
    console.info('\n🛑 Virtual Device Demo stopped');
  }
}

// Run the demo
if (import.meta.main) {
  const demo = new VirtualDeviceDemo();
  const args = process.argv.slice(2);
  
  if (args.includes('--integration')) {
    demo.runIntegrationDemo();
  } else if (args.includes('--report')) {
    demo.generateReport();
  } else if (args.includes('--simulation')) {
    demo.runTaskSimulation();
  } else {
    demo.startDashboard();
  }
}