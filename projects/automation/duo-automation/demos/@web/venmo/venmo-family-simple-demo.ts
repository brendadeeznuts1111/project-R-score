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
    console.log('🎯 Venmo Family Account System - Simple Demo');
    console.log('═'.repeat(60));
    
    try {
      await this.createFamilyAccount();
      await this.demonstrateQRPayments();
      await this.demonstrateSplitPayments();
      await this.showTransactionHistory();
      
      console.log('\n🎉 Simple demo finished successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }

  /**
   * 🏠 Create family account
   */
  private async createFamilyAccount(): Promise<void> {
    console.log('\n🏠 Creating Family Account...');
    
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

      console.log(`✅ Family account created: ${familyAccount.familyId}`);
      this.currentFamilyId = familyAccount.familyId;
      this.familyMembers = familyAccount.children;
      console.log(`👨‍👩‍👧‍👦 Family members: ${familyAccount.children.length}`);
      
      // Display family members
      familyAccount.children.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.name} (${member.role}) - ${member.status}`);
        if (member.spendingLimit) {
          console.log(`      Spending limit: $${member.spendingLimit}`);
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
    console.log('\n📱 Demonstrating QR Payments...');
    
    try {
      // Generate QR code for payment
      const qrResult = await this.familySystem.generatePaymentQRCode(
        this.currentFamilyId,
        25.50,
        'jimmy.doe@duoplus.com',
        'Weekly allowance',
        30 // expires in 30 minutes
      );

      console.log(`✅ QR code generated for $${qrResult.amount}`);
      console.log(`📱 Recipient: ${qrResult.recipient}`);
      console.log(`⏰ Expires at: ${qrResult.expiresAt}`);
      console.log(`🔗 QR data: ${qrResult.qrCodeData.substring(0, 50)}...`);

      // Simulate scanning the QR code
      console.log('\n📷 Simulating QR code scan...');
      const transaction = await this.familySystem.processQRPayment(
        qrResult.qrCodeData,
        'john.doe@duoplus.com',
        'John Doe'
      );

      console.log(`✅ Payment processed: ${transaction.transactionId}`);
      console.log(`💰 Amount: $${transaction.amount}`);
      console.log(`📊 Status: ${transaction.status}`);
      
      if (transaction.requiresApproval && transaction.status === 'pending') {
        console.log(`⏳ Requires parental approval`);
        
        // Approve the transaction
        const approvedTransaction = await this.familySystem.approveTransaction(
          transaction.transactionId,
          'john.doe@duoplus.com'
        );
        
        console.log(`✅ Transaction approved: ${approvedTransaction.status}`);
      } else if (transaction.requiresApproval) {
        console.log(`⏳ Required approval but was auto-completed`);
      } else {
        console.log(`✅ Payment completed without approval required`);
      }
      
    } catch (error) {
      throw new Error(`QR payment demo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🔄 Demonstrate split payments
   */
  private async demonstrateSplitPayments(): Promise<void> {
    console.log('\n🔄 Demonstrating Split Payments...');
    
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

      console.log(`✅ Split payment created: ${splitResult.splitPayment.transactionId}`);
      console.log(`💰 Total amount: $${splitResult.splitPayment.amount}`);
      console.log(`👥 Participants: ${splitResult.individualPayments.length}`);
      console.log(`💸 Individual share: $${splitResult.individualPayments[0]?.amount || 0}`);

      // Display individual payments
      splitResult.individualPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. Payment ${payment.transactionId}: $${payment.amount} (${payment.status})`);
      });
      
    } catch (error) {
      throw new Error(`Split payment demo failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 📊 Show transaction history
   */
  private async showTransactionHistory(): Promise<void> {
    console.log('\n📊 Transaction History...');
    
    try {
      const transactions = await this.familySystem.getFamilyTransactions(this.currentFamilyId);
      
      console.log(`📋 Found ${transactions.length} transactions:`);
      
      transactions.forEach((transaction, index) => {
        console.log(`\n${index + 1}. ${transaction.transactionId}`);
        console.log(`   Type: ${transaction.type}`);
        console.log(`   Amount: $${transaction.amount}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   Created: ${new Date(transaction.createdAt).toLocaleString()}`);
        
        if (transaction.note) {
          console.log(`   Note: ${transaction.note}`);
        }
        
        if (transaction.requiresApproval) {
          console.log(`   ⏳ Requires approval: ${transaction.approvedBy || 'Pending'}`);
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
    
    console.log('\n📊 System Statistics:');
    console.log(`   Total Families: ${stats.totalFamilies}`);
    console.log(`   Total Members: ${stats.totalMembers}`);
    console.log(`   Total Transactions: ${stats.totalTransactions}`);
    console.log(`   Active QR Codes: ${stats.activeQRcodes}`);
  }
}

/**
 * 🎯 Main execution function
 */
async function main(): Promise<void> {
  console.log('🎯 Starting Venmo Family Account System Simple Demo...\n');
  
  const demo = new VenmoFamilySimpleDemo();
  
  try {
    await demo.runDemo();
    demo.showSystemStats();
    
    console.log('\n🎉 Venmo Family System simple demo completed successfully!');
    console.log('\n📚 What was demonstrated:');
    console.log('   ✅ Family account creation with parents and children');
    console.log('   ✅ QR code generation and scanning');
    console.log('   ✅ Payment processing with approval workflow');
    console.log('   ✅ Split payments among family members');
    console.log('   ✅ Transaction history and management');
    
    console.log('\n🌐 Open the family dashboard in your browser:');
    console.log('   file:///Users/nolarose/tmp/clones/duo/duo-automation/demos/venmo/family-dashboard.html');
    
    console.log('\n📱 Features available in the dashboard:');
    console.log('   • Family member management');
    console.log('   • QR code generation for payments');
    console.log('   • Transaction history and analytics');
    console.log('   • Real-time balance updates');
    console.log('   • Android device connection status');
    console.log('   • Quick payment actions');
    
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
