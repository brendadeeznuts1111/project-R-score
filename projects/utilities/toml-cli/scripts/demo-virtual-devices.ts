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
    console.log('🚀 VIRTUAL DEVICE DEMO - DuoPlus Integration');
    console.log('='.repeat(100));
    console.log('📱 Android/iOS Simulators | 💳 CashApp | 📧 Email | 📱 Messaging');
    console.log('='.repeat(100));
    
    this.dashboard.start();
    
    // Keep process alive
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }
  
  async runIntegrationDemo(): Promise<void> {
    console.clear();
    console.log('🔗 VIRTUAL DEVICE INTEGRATION DEMO');
    console.log('='.repeat(100));

    console.log('\n1. 📡 STARTING INTEGRATION...');
    await this.integration.startIntegratedMonitoring();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n2. 📊 SIMULATING TASKS...');
    const result = await this.integration.handleCreateTask({
      taskType: 'cashapp_transaction',
      agentId: 'agent-enterprise-001',
      details: { transaction: { type: 'send', amount: 100 } },
      priority: 'medium'
    });
    console.log(`   ✅ Created task: ${result.taskId}`);

    console.log('\n3. 📈 CHECKING STATISTICS...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const stats = await this.integration.handleGetStats({ timeRange: '1h' });
    console.log(`      • Total tasks: ${stats.stats.total}`);

    console.log('\n4. 🤖 DEVICE CONTROL DEMO...');
    const controlResult = await this.integration.handleDeviceControl({
      deviceId: 'android-emulator-001',
      action: 'restart'
    });
    console.log(`   ✅ Device control: ${controlResult.message}`);

    console.log('\n' + '='.repeat(100));
    console.log('🎯 DEMO COMPLETE');
    process.exit(0);
  }
  
  async generateReport(): Promise<void> {
    console.log('📊 Generating virtual device performance report...');
    
    const reportsDir = './reports';
    
    // Generate report with proper location
    const reportPath = await this.dashboard.generateComprehensiveReport(reportsDir);
    
    // Clean up old reports (keep last 5)
    await this.dashboard.cleanupOldReports(reportsDir, 5);
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    console.log('🗑️  Old reports cleaned up (keeping last 5)');
    
    process.exit(0);
  }
  
  async runTaskSimulation(): Promise<void> {
    console.log('🎯 Running task simulation...');
    await this.dashboard.runTaskSimulation(3); // 3 minute simulation
    console.log('🎯 Task simulation completed');
    process.exit(0);
  }
  
  stop(): void {
    this.dashboard.stop();
    console.log('\n🛑 Virtual Device Demo stopped');
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