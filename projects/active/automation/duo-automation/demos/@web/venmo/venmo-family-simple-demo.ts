#!/usr/bin/env bun

/**
 * 🎯 Venmo Family Account System - Simple Demo
 * Demonstrates core family account functionality
 */

import { VenmoFamilyAccountSystem } from '../../src/venmo/family-account-system';

/**
 * 🎯 Venmo Family Simple Demo Class
 */
class VenmoFamilySimpleDemo {
  private familySystem: VenmoFamilyAccountSystem;
  private currentFamilyId: string = '';
  private familyMembers: any[] = [];

  constructor() {
    this.familySystem = new VenmoFamilyAccountSystem('demo-venmo-token');
  }

  /**
   * 🚀 Run simple demo
   */
  async runDemo(): Promise<void> {
    console.info('🎯 Venmo Family Account System - Simple Demo');
    console.info('═'.repeat(60));
    
    try {
      await this.createFamilyAccount();
      await this.demonstrateQRPayments();
      await this.demonstrateSplitPayments();
      await this.showTransactionHistory();
      
      console.info('\n🎉 Simple demo finished successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
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
      this.currentFamilyId = familyAccount.familyId;
      this.familyMembers = familyAccount.children;
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
        this.currentFamilyId,
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
      
      if (transaction.requiresApproval && transaction.status === 'pending') {
        console.info(`⏳ Requires parental approval`);
        
        // Approve the transaction
        const approvedTransaction = await this.familySystem.approveTransaction(
          transaction.transactionId,
          'john.doe@duoplus.com'
        );
        
        console.info(`✅ Transaction approved: ${approvedTransaction.status}`);
      } else if (transaction.requiresApproval) {
        console.info(`⏳ Required approval but was auto-completed`);
      } else {
        console.info(`✅ Payment completed without approval required`);
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
      const memberIds = this.familyMembers.map(member => member.memberId);
      const splitResult = await this.familySystem.createSplitPayment(
        this.currentFamilyId,
        120.00, // Total dinner bill
        memberIds, // All family members
        'Family dinner at Italian restaurant',
        memberIds[0] // Initiated by first member (parent)
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
   * 📊 Show transaction history
   */
  private async showTransactionHistory(): Promise<void> {
    console.info('\n📊 Transaction History...');
    
    try {
      const transactions = await this.familySystem.getFamilyTransactions(this.currentFamilyId);
      
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
  console.info('🎯 Starting Venmo Family Account System Simple Demo...\n');
  
  const demo = new VenmoFamilySimpleDemo();
  
  try {
    await demo.runDemo();
    demo.showSystemStats();
    
    console.info('\n🎉 Venmo Family System simple demo completed successfully!');
    console.info('\n📚 What was demonstrated:');
    console.info('   ✅ Family account creation with parents and children');
    console.info('   ✅ QR code generation and scanning');
    console.info('   ✅ Payment processing with approval workflow');
    console.info('   ✅ Split payments among family members');
    console.info('   ✅ Transaction history and management');
    
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

export { VenmoFamilySimpleDemo };
