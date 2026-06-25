#!/usr/bin/env bun

/**
 * 🎯 Venmo Family Account System - Complete Demo
 * Demonstrates the full integration of family accounts, QR payments, and Android SDK
 */

import { VenmoFamilyAccountSystem } from '../../src/venmo/family-account-system';
import { VenmoBackendServer } from '../../src/venmo/venmo-backend-server';
import { DuoPlusSDK, DuoPlusWebSDK, DuoPlusSDKFactory } from '../../src/venmo/duoplus-sdk-integration';

/**
 * 🎯 Venmo Family Demo Class
 */
class VenmoFamilyDemo {
  private familySystem: VenmoFamilyAccountSystem;
  private backendServer: VenmoBackendServer;
  private duoPlusSDK: DuoPlusSDK;
  private webSDK: DuoPlusWebSDK;

  constructor() {
    // Initialize family system
    this.familySystem = new VenmoFamilyAccountSystem('demo-venmo-token');
    
    // Initialize backend server
    this.backendServer = new VenmoBackendServer(3000);
    
    // SDKs will be initialized in async method
    this.duoPlusSDK = {} as DuoPlusSDK;
    this.webSDK = {} as DuoPlusWebSDK;
  }

  /**
   * 🚀 Initialize SDKs asynchronously
   */
  private async initializeSDKs(): Promise<void> {
    // Import and initialize DuoPlus SDK
    const sdkModule = await import('../../src/venmo/duoplus-sdk-integration');
    this.duoPlusSDK = sdkModule.DuoPlusSDKFactory.createDemo();
    
    // Initialize Web SDK
    this.webSDK = new sdkModule.DuoPlusWebSDK({
      apiKey: 'demo-api-key',
      familyId: 'demo-family-123',
      environment: 'demo'
    });
  }

  /**
   * 🚀 Run complete demo
   */
  async runDemo(): Promise<void> {
    console.info('🎯 Venmo Family Account System - Complete Demo');
    console.info('═'.repeat(60));
    
    try {
      await this.initializeSDKs();
      await this.startBackend();
      await this.createFamilyAccount();
      await this.demonstrateQRPayments();
      await this.demonstrateSplitPayments();
      await this.demonstrateAndroidIntegration();
      await this.showTransactionHistory();
      await this.demonstrateWebSDK();
      
      console.info('\n🎉 Complete demo finished successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 🌐 Start backend server
   */
  private async startBackend(): Promise<void> {
    console.info('\n🌐 Starting Backend Server...');
    
    try {
      await this.backendServer.start();
      console.info('✅ Backend server started on port 3000');
      console.info('📡 API available at: http://localhost:3000');
      
      // Wait a moment for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      throw new Error(`Failed to start backend: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🏠 Create family account
   */
  private async createFamilyAccount(): Promise<void> {
    console.info('\n🏠 Creating Family Account...');
    
    try {
      const familyAccount = await this.familySystem.createFamilyAccount(
        'john.doe@duoplus.com',
        'John Doe',
        [
          { email: 'jane.doe@duoplus.com', name: 'Jane Doe' },
          { email: 'jimmy.doe@duoplus.com', name: 'Jimmy Doe' },
          { email: 'sarah.doe@duoplus.com', name: 'Sarah Doe' }
        ],
        {
          requireParentApproval: true,
          approvalThreshold: 25.00,
          allowUnlimitedChildPayments: false,
          notificationSettings: {
            paymentSent: true,
            paymentReceived: true,
            allowanceRequested: true,
            lowBalance: true
          },
          autoAllowance: {
            enabled: true,
            amount: 25.00,
            frequency: 'weekly',
            nextAllowanceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      );

      console.info(`✅ Family account created: ${familyAccount.familyId}`);
      console.info(`👨‍👩‍👧‍👦 Family members: ${familyAccount.children.length}`);
      
      // Display family members
      familyAccount.children.forEach((member, index) => {
        console.info(`   ${index + 1}. ${member.name} (${member.role}) - ${member.status}`);
        if (member.spendingLimit) {
          console.info(`      Spending limit: $${member.spendingLimit}`);
        }
      });
      
    } catch (error) {
      throw new Error(`Failed to create family account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 📱 Demonstrate QR payments
   */
  private async demonstrateQRPayments(): Promise<void> {
    console.info('\n📱 Demonstrating QR Payments...');
    
    try {
      // Generate QR code for payment
      const qrResult = await this.familySystem.generatePaymentQRCode(
        'family-123',
        25.50,
        'jimmy.doe@duoplus.com',
        'Weekly allowance',
        30 // expires in 30 minutes
      );

      console.info(`✅ QR code generated for $${qrResult.amount}`);
      console.info(`📱 Recipient: ${qrResult.recipient}`);
      console.info(`⏰ Expires at: ${qrResult.expiresAt}`);
      console.info(`🔗 QR data: ${qrResult.qrCodeData.substring(0, 50)}...`);

      // Simulate scanning the QR code
      console.info('\n📷 Simulating QR code scan...');
      const transaction = await this.familySystem.processQRPayment(
        qrResult.qrCodeData,
        'john.doe@duoplus.com',
        'John Doe'
      );

      console.info(`✅ Payment processed: ${transaction.transactionId}`);
      console.info(`💰 Amount: $${transaction.amount}`);
      console.info(`📊 Status: ${transaction.status}`);
      
      if (transaction.requiresApproval) {
        console.info(`⏳ Requires parental approval`);
        
        // Approve the transaction
        const approvedTransaction = await this.familySystem.approveTransaction(
          transaction.transactionId,
          'john.doe@duoplus.com'
        );
        
        console.info(`✅ Transaction approved: ${approvedTransaction.status}`);
      }
      
    } catch (error) {
      throw new Error(`QR payment demo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🔄 Demonstrate split payments
   */
  private async demonstrateSplitPayments(): Promise<void> {
    console.info('\n🔄 Demonstrating Split Payments...');
    
    try {
      // Create split payment for family dinner
      const splitResult = await this.familySystem.createSplitPayment(
        'family-123',
        120.00, // Total dinner bill
        ['member-1', 'member-2', 'member-3', 'member-4'], // All family members
        'Family dinner at Italian restaurant',
        'member-1' // Initiated by parent
      );

      console.info(`✅ Split payment created: ${splitResult.splitPayment.transactionId}`);
      console.info(`💰 Total amount: $${splitResult.splitPayment.amount}`);
      console.info(`👥 Participants: ${splitResult.individualPayments.length}`);
      console.info(`💸 Individual share: $${splitResult.individualPayments[0]?.amount || 0}`);

      // Display individual payments
      splitResult.individualPayments.forEach((payment, index) => {
        console.info(`   ${index + 1}. Payment ${payment.transactionId}: $${payment.amount} (${payment.status})`);
      });
      
    } catch (error) {
      throw new Error(`Split payment demo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 📱 Demonstrate Android integration
   */
  private async demonstrateAndroidIntegration(): Promise<void> {
    console.info('\n📱 Demonstrating Android Integration...');
    
    try {
      // Connect to DuoPlus SDK
      console.info('🔌 Connecting to DuoPlus SDK...');
      const connected = await this.duoPlusSDK.connect();
      
      if (connected) {
        console.info('✅ Connected to Android virtual device');
        
        const status = this.duoPlusSDK.getConnectionStatus();
        console.info(`📱 Device: ${status.deviceType}`);
        console.info(`🆔 Device ID: ${status.deviceId}`);
        console.info(`📦 SDK Version: ${status.sdkVersion}`);
        
        // Send payment command to Android
        console.info('\n💳 Sending payment command to Android...');
        const paymentResponse = await this.duoPlusSDK.sendPaymentCommand({
          toMemberId: 'member-3',
          amount: 15.00,
          note: 'Lunch money from Android'
        });
        
        console.info(`✅ Payment command sent: ${paymentResponse.success ? 'Success' : 'Failed'}`);
        
        // Send QR scan command to Android
        console.info('\n📷 Sending QR scan command to Android...');
        const qrResponse = await this.duoPlusSDK.sendQRScanCommand();
        
        console.info(`✅ QR scan command sent: ${qrResponse.success ? 'Success' : 'Failed'}`);
        
        // Send notification to Android
        console.info('\n🔔 Sending notification to Android...');
        const notificationResponse = await this.duoPlusSDK.sendNotificationCommand({
          title: 'Payment Received',
          message: 'You received $15.00 from John Doe',
          type: 'payment'
        });
        
        console.info(`✅ Notification sent: ${notificationResponse.success ? 'Success' : 'Failed'}`);
        
        // Subscribe to events
        console.info('\n📢 Subscribing to Android events...');
        this.duoPlusSDK.subscribeToEvents((event) => {
          console.info(`📢 Event received: ${event.type} from ${event.source}`);
        });
        
        // Disconnect
        await this.duoPlusSDK.disconnect();
        console.info('🔌 Disconnected from Android device');
        
      } else {
        console.info('❌ Failed to connect to Android device');
      }
      
    } catch (error) {
      console.info(`⚠️ Android integration demo (simulated): ${error instanceof Error ? error.message : String(error)}`);
      }
  }

  /**
   * 📊 Show transaction history
   */
  private async showTransactionHistory(): Promise<void> {
    console.info('\n📊 Transaction History...');
    
    try {
      const transactions = await this.familySystem.getFamilyTransactions('family-123');
      
      console.info(`📋 Found ${transactions.length} transactions:`);
      
      transactions.forEach((transaction, index) => {
        console.info(`\n${index + 1}. ${transaction.transactionId}`);
        console.info(`   Type: ${transaction.type}`);
        console.info(`   Amount: $${transaction.amount}`);
        console.info(`   Status: ${transaction.status}`);
        console.info(`   Created: ${new Date(transaction.createdAt).toLocaleString()}`);
        
        if (transaction.note) {
          console.info(`   Note: ${transaction.note}`);
        }
        
        if (transaction.requiresApproval) {
          console.info(`   ⏳ Requires approval: ${transaction.approvedBy || 'Pending'}`);
        }
      });
      
    } catch (error) {
      throw new Error(`Failed to load transaction history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🌐 Demonstrate Web SDK
   */
  private async demonstrateWebSDK(): Promise<void> {
    console.info('\n🌐 Demonstrating Web SDK...');
    
    try {
      // Initialize Web SDK
      console.info('🔌 Initializing Web SDK...');
      await this.webSDK.initialize();
      
      // Set up event listeners
      this.webSDK.on('connected', (status) => {
        console.info('✅ Web SDK connected');
      });
      
      this.webSDK.on('paymentSent', (response) => {
        console.info('💰 Payment sent via Web SDK');
      });
      
      this.webSDK.on('familyDataUpdated', (data) => {
        console.info('👨‍👩‍👧‍👦 Family data updated via Web SDK');
      });
      
      // Send payment via Web SDK
      console.info('\n💳 Sending payment via Web SDK...');
      await this.webSDK.sendPayment('member-2', 20.00, 'Grocery money');
      
      // Start QR scanner via Web SDK
      console.info('\n📷 Starting QR scanner via Web SDK...');
      await this.webSDK.startQRScanner();
      
      // Get family data via Web SDK
      console.info('\n👨‍👩‍👧‍👦 Getting family data via Web SDK...');
      const familyData = await this.webSDK.getFamilyData();
      
      console.info(`✅ Family data retrieved: ${familyData.members.length} members`);
      
      // Send notification via Web SDK
      console.info('\n🔔 Sending notification via Web SDK...');
      await this.webSDK.sendNotification(
        'Welcome to DuoPlus Family!',
        'Your family account is ready to use.',
        'general'
      );
      
      // Get connection status
      const status = this.webSDK.getConnectionStatus();
      console.info(`📊 Connection status: ${status.connected ? 'Connected' : 'Disconnected'}`);
      
      // Disconnect Web SDK
      await this.webSDK.disconnect();
      console.info('🔌 Web SDK disconnected');
      
    } catch (error) {
      console.info(`⚠️ Web SDK demo (simulated): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🧹 Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.info('\n🧹 Cleaning up resources...');
    
    try {
      if (this.duoPlusSDK && typeof this.duoPlusSDK.disconnect === 'function') {
        await this.duoPlusSDK.disconnect();
      }
      
      if (this.webSDK && typeof this.webSDK.disconnect === 'function') {
        await this.webSDK.disconnect();
      }
      
      console.info('✅ Cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * 📊 Show system statistics
   */
  showSystemStats(): void {
    const stats = this.familySystem.getSystemStats();
    
    console.info('\n📊 System Statistics:');
    console.info(`   Total Families: ${stats.totalFamilies}`);
    console.info(`   Total Members: ${stats.totalMembers}`);
    console.info(`   Total Transactions: ${stats.totalTransactions}`);
    console.info(`   Active QR Codes: ${stats.activeQRcodes}`);
  }
}

/**
 * 🎯 Main execution function
 */
async function main(): Promise<void> {
  console.info('🎯 Starting Venmo Family Account System Demo...\n');
  
  const demo = new VenmoFamilyDemo();
  
  try {
    await demo.runDemo();
    demo.showSystemStats();
    
    console.info('\n🎉 Venmo Family System demo completed successfully!');
    console.info('\n📚 What was demonstrated:');
    console.info('   ✅ Family account creation with parents and children');
    console.info('   ✅ QR code generation and scanning');
    console.info('   ✅ Payment processing with approval workflow');
    console.info('   ✅ Split payments among family members');
    console.info('   ✅ Android virtual device integration');
    console.info('   ✅ Web SDK for browser-based applications');
    console.info('   ✅ Real-time transaction history');
    console.info('   ✅ Notification system');
    
    console.info('\n🌐 Open the family dashboard in your browser:');
    console.info('   file:///Users/nolarose/tmp/clones/duo/duo-automation/demos/venmo/family-dashboard.html');
    
    console.info('\n📱 Features available in the dashboard:');
    console.info('   • Family member management');
    console.info('   • QR code generation for payments');
    console.info('   • Transaction history and analytics');
    console.info('   • Real-time balance updates');
    console.info('   • Android device connection status');
    console.info('   • Quick payment actions');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { VenmoFamilyDemo };
