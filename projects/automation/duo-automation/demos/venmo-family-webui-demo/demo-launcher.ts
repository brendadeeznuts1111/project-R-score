#!/usr/bin/env bun

/**
 * 🚀 Venmo Family System - Web UI Demo Launcher
 * Launches the complete demo with backend server and web interface
 */

import { spawn } from 'bun';
import { VenmoDemoServer } from './server';

/**
 * 🎯 Demo Launcher Class
 */
class VenmoWebUIDemoLauncher {
  private server: VenmoDemoServer;
  private serverProcess: any = null;

  constructor() {
    this.server = new VenmoDemoServer(3001);
  }

  /**
   * 🚀 Launch the complete demo
   */
  async launch(): Promise<void> {
    console.log('🎯 Venmo Family System - Web UI Demo Launcher');
    console.log('═'.repeat(60));
    
    try {
      // Start the backend server
      await this.startBackendServer();
      
      // Wait a moment for server to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Open the web UI
      await this.openWebUI();
      
      // Show demo instructions
      this.showDemoInstructions();
      
      // Keep the server running
      await this.keepRunning();
      
    } catch (error) {
      console.error('❌ Failed to launch demo:', error);
      process.exit(1);
    }
  }

  /**
   * 🌐 Start backend server
   */
  private async startBackendServer(): Promise<void> {
    console.log('🌐 Starting backend server...');
    
    try {
      await this.server.start();
      console.log('✅ Backend server started on port 3001');
    } catch (error) {
      throw new Error(`Failed to start backend server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🌐 Open web UI in browser
   */
  private async openWebUI(): Promise<void> {
    console.log('🌐 Opening web UI in browser...');
    
    const webUIPath = `${import.meta.dir}/index.html`;
    const fileURL = `file://${webUIPath}`;
    
    try {
      // Try to open with default browser
      const openCommand = process.platform === 'darwin' ? 'open' : 
                         process.platform === 'win32' ? 'start' : 'xdg-open';
      
      this.serverProcess = spawn(openCommand, [fileURL], {
        stdio: 'inherit',
        detached: true
      });
      
      console.log(`✅ Web UI opened: ${fileURL}`);
      
    } catch (error) {
      console.log(`⚠️ Could not auto-open browser. Please open manually: ${fileURL}`);
    }
  }

  /**
   * 📋 Show demo instructions
   */
  private showDemoInstructions(): void {
    console.log('\n📋 Demo Instructions:');
    console.log('─'.repeat(40));
    console.log('🎮 Interactive Features:');
    console.log('   • Family Setup: Create your family account');
    console.log('   • QR Payments: Generate and scan QR codes');
    console.log('   • Transactions: View payment history');
    console.log('   • Android Control: Test device integration');
    console.log('');
    console.log('🔗 URLs:');
    console.log('   • Web UI: file://' + `${import.meta.dir}/index.html`);
    console.log('   • API: http://localhost:3001/api');
    console.log('   • Health: http://localhost:3001/health');
    console.log('');
    console.log('📱 Test the Features:');
    console.log('   1. Click "Start Interactive Demo"');
    console.log('   2. Create a family with parents and children');
    console.log('   3. Generate QR codes for payments');
    console.log('   4. Test Android device integration');
    console.log('   5. View real-time analytics');
    console.log('');
    console.log('🛑 Press Ctrl+C to stop the demo');
    console.log('─'.repeat(40));
  }

  /**
   * 🏃 Keep the server running
   */
  private async keepRunning(): Promise<void> {
    console.log('\n🏃 Demo is running... Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down demo...');
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down demo...');
      this.shutdown();
    });
    
    // Keep process alive
    return new Promise(() => {});
  }

  /**
   * 🛑 Shutdown the demo
   */
  private shutdown(): void {
    try {
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
      console.log('✅ Demo shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

/**
 * 🚀 Quick Demo Functions
 */
class QuickDemo {
  /**
   * 🎯 Run quick family demo
   */
  static async runFamilyDemo(): Promise<void> {
    console.log('🎯 Quick Family Demo');
    
    const launcher = new VenmoWebUIDemoLauncher();
    
    // Create demo family data
    const demoFamily = {
      familyId: 'demo-family-' + Date.now(),
      parentName: 'John Doe',
      parentEmail: 'john.doe@duoplus.com',
      children: [
        { name: 'Jimmy Doe', role: 'child', status: 'active', spendingLimit: 50 },
        { name: 'Sarah Doe', role: 'child', status: 'active', spendingLimit: 30 }
      ],
      createdAt: new Date().toISOString()
    };
    
    console.log('🏠 Demo Family Created:');
    console.log(`   Family ID: ${demoFamily.familyId}`);
    console.log(`   Parent: ${demoFamily.parentName} (${demoFamily.parentEmail})`);
    console.log(`   Children: ${demoFamily.children.length} members`);
    
    demoFamily.children.forEach((child, index) => {
      console.log(`   ${index + 1}. ${child.name} - Limit: $${child.spendingLimit}`);
    });
    
    console.log('\n📱 Open the web UI to interact with this family!');
  }

  /**
   * 📱 Run quick QR demo
   */
  static async runQRDemo(): Promise<void> {
    console.log('📱 Quick QR Demo');
    
    const demoQR = {
      qrData: 'duoplus://pay/demo-family-123/25.50/jimmy/Weekly%20allowance',
      amount: 25.50,
      recipient: 'jimmy',
      description: 'Weekly allowance',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('📱 Demo QR Code Generated:');
    console.log(`   Data: ${demoQR.qrData}`);
    console.log(`   Amount: $${demoQR.amount}`);
    console.log(`   Recipient: ${demoQR.recipient}`);
    console.log(`   Description: ${demoQR.description}`);
    console.log(`   Expires: ${demoQR.expiresAt}`);
    
    console.log('\n📷 Open the web UI to scan this QR code!');
  }

  /**
   * 🤖 Run quick Android demo
   */
  static async runAndroidDemo(): Promise<void> {
    console.log('🤖 Quick Android Demo');
    
    const demoAndroid = {
      deviceType: 'android_virtual',
      version: '3.7.0',
      status: 'connected',
      features: [
        'QR Code Scanning',
        'Payment Processing',
        'Push Notifications',
        'Family Sync'
      ]
    };
    
    console.log('🤖 Demo Android Device:');
    console.log(`   Type: ${demoAndroid.deviceType}`);
    console.log(`   Version: ${demoAndroid.version}`);
    console.log(`   Status: ${demoAndroid.status}`);
    console.log(`   Features: ${demoAndroid.features.join(', ')}`);
    
    console.log('\n📱 Open the web UI to control this device!');
  }
}

/**
 * 🚀 Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Launch full demo
    const launcher = new VenmoWebUIDemoLauncher();
    await launcher.launch();
  } else {
    // Run quick demos
    const command = args[0];
    
    switch (command) {
      case 'family':
        await QuickDemo.runFamilyDemo();
        break;
      case 'qr':
        await QuickDemo.runQRDemo();
        break;
      case 'android':
        await QuickDemo.runAndroidDemo();
        break;
      case 'help':
        console.log('🎯 Venmo Family System - Web UI Demo Launcher');
        console.log('');
        console.log('Usage:');
        console.log('  bun demo-launcher.ts           # Launch full interactive demo');
        console.log('  bun demo-launcher.ts family    # Quick family demo');
        console.log('  bun demo-launcher.ts qr        # Quick QR demo');
        console.log('  bun demo-launcher.ts android   # Quick Android demo');
        console.log('  bun demo-launcher.ts help      # Show this help');
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run "bun demo-launcher.ts help" for usage');
        process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { VenmoWebUIDemoLauncher, QuickDemo };
