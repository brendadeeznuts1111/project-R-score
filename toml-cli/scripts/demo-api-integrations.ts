#!/usr/bin/env bun

import { CashAppAPI, CashAppConfig } from '../integrations/cashapp-api';
import { SMSGateway, SMSConfig } from '../integrations/sms-gateway';
import { EmailService, EmailConfig } from '../integrations/email-service';

/**
 * Demo script for API integrations
 * Shows how to use CashApp, SMS, and Email services
 */
class APIIntegrationsDemo {
  private cashApp: CashAppAPI;
  private sms: SMSGateway;
  private email: EmailService;

  constructor() {
    // Initialize with demo/sandbox credentials
    // In production, these would come from environment variables or secure config

    // CashApp (Sandbox)
    const cashAppConfig: CashAppConfig = {
      clientId: process.env.CASHAPP_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.CASHAPP_CLIENT_SECRET || 'demo-client-secret',
      environment: 'sandbox',
      redirectUri: 'http://localhost:3000/oauth/callback'
    };
    this.cashApp = new CashAppAPI(cashAppConfig);

    // SMS (Twilio)
    const smsConfig: SMSConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || 'demo-account-sid',
      authToken: process.env.TWILIO_AUTH_TOKEN || 'demo-auth-token',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '+15551234567',
      environment: 'sandbox'
    };
    this.sms = new SMSGateway(smsConfig);

    // Email (Gmail)
    const emailConfig: EmailConfig = {
      provider: 'gmail',
      credentials: {
        clientId: process.env.GMAIL_CLIENT_ID || 'demo-client-id',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || 'demo-client-secret',
        refreshToken: process.env.GMAIL_REFRESH_TOKEN || 'demo-refresh-token'
      },
      environment: 'sandbox'
    };
    this.email = new EmailService(emailConfig);
  }

  async runDemo(): Promise<void> {
    console.clear();
    console.log('🚀 API INTEGRATIONS DEMO - CashApp, SMS & Email');
    console.log('='.repeat(80));
    console.log('⚠️  Note: Using demo credentials - replace with real ones for production');
    console.log('='.repeat(80));
    console.log();

    try {
      // 1. CashApp Demo
      await this.demoCashApp();

      // 2. SMS Demo
      await this.demoSMS();

      // 3. Email Demo
      await this.demoEmail();

      console.log('\n' + '='.repeat(80));
      console.log('✅ ALL API DEMOS COMPLETED');
      console.log('💡 Next steps:');
      console.log('   • Set up real API credentials in environment variables');
      console.log('   • Configure webhooks for status callbacks');
      console.log('   • Implement error handling and retries');
      console.log('   • Add rate limiting and monitoring');
      process.exit(0);

    } catch (error: any) {
      console.error('❌ Demo failed:', error.message);
      console.log('\n🔧 To fix:');
      console.log('   1. Set environment variables with real API credentials');
      console.log('   2. Ensure API services are enabled and accessible');
      console.log('   3. Check network connectivity');
      process.exit(1);
    }
  }

  private async demoCashApp(): Promise<void> {
    console.log('💳 CASHAPP API DEMO');
    console.log('─'.repeat(30));

    try {
      // Show OAuth URL (would normally redirect user)
      const authUrl = this.cashApp.getAuthorizationUrl();
      console.log('🔗 OAuth URL:', authUrl);
      console.log('   (In production, redirect user to this URL)');
      console.log();

      // Simulate OAuth flow with demo token
      console.log('🔐 Simulating OAuth token exchange...');
      // Note: This would fail with demo credentials, but shows the flow

      console.log('💰 CashApp features available:');
      console.log('   ✅ Send payments');
      console.log('   ✅ Request payments');
      console.log('   ✅ Check balance');
      console.log('   ✅ Transaction history');
      console.log('   ✅ Profile management');

      console.log('\n📊 Example usage:');
      console.log(`   await cashApp.sendPayment(25.00, '$cashtag', 'Lunch payment');`);
      console.log(`   await cashApp.getBalance();`);
      console.log(`   await cashApp.getTransactions({ limit: 10 });`);

    } catch (error: any) {
      console.log('⚠️  CashApp demo skipped (requires real credentials):', error.message);
    }

    console.log();
  }

  private async demoSMS(): Promise<void> {
    console.log('📱 SMS GATEWAY DEMO (Twilio)');
    console.log('─'.repeat(30));

    try {
      // Validate phone number
      const testNumber = '+15551234567';
      const isValid = this.sms.validatePhoneNumber(testNumber);
      console.log(`📞 Phone validation: ${testNumber} → ${isValid ? '✅ Valid' : '❌ Invalid'}`);

      // Show SMS features
      console.log('\n📤 SMS features available:');
      console.log('   ✅ Send single SMS');
      console.log('   ✅ Send bulk SMS with rate limiting');
      console.log('   ✅ Message status tracking');
      console.log('   ✅ Delivery confirmations');
      console.log('   ✅ Message history');

      console.log('\n📊 Example usage:');
      console.log(`   await sms.sendSMS('+15551234567', 'Hello from DuoPlus!');`);
      console.log(`   await sms.sendBulkSMS(['+15551234567', '+15559876543'], 'Bulk message');`);
      console.log(`   await sms.getMessages({ limit: 10 });`);

      // Try to get account info (will fail with demo credentials)
      try {
        console.log('\n🔍 Attempting to get account info...');
        const accountInfo = await this.sms.getAccountInfo();
        console.log('📊 Account Balance:', accountInfo.balance, 'USD');
      } catch (error) {
        console.log('⚠️  Account info requires real Twilio credentials');
      }

    } catch (error: any) {
      console.log('⚠️  SMS demo error:', error.message);
    }

    console.log();
  }

  private async demoEmail(): Promise<void> {
    console.log('📧 EMAIL SERVICE DEMO');
    console.log('─'.repeat(30));

    try {
      console.log('📮 Supported providers: Gmail, Outlook, SMTP, SendGrid, Mailgun');

      console.log('\n📤 Email features available:');
      console.log('   ✅ Send emails with attachments');
      console.log('   ✅ HTML and text content');
      console.log('   ✅ CC/BCC support');
      console.log('   ✅ Inbox retrieval (Gmail/Outlook)');
      console.log('   ✅ Mark as read/unread');
      console.log('   ✅ Message management');

      console.log('\n📊 Example usage:');
      console.log(`   await email.sendEmail({`);
      console.log(`     to: 'recipient@example.com',`);
      console.log(`     subject: 'Hello from DuoPlus',`);
      console.log(`     html: '<h1>Hello!</h1>'`);
      console.log(`   });`);

      console.log(`   const emails = await email.getEmails({ maxResults: 10 });`);
      console.log(`   await email.markAsRead(emailId, true);`);

      // Try to send a test email (will fail with demo credentials)
      try {
        console.log('\n📨 Attempting to send test email...');
        const messageId = await this.email.sendEmail({
          to: 'test@example.com',
          subject: 'DuoPlus API Integration Test',
          text: 'This is a test email from the DuoPlus API integration demo.',
          html: '<h1>DuoPlus API Test</h1><p>This is a test email.</p>'
        });
        console.log('✅ Email sent with ID:', messageId);
      } catch (error) {
        console.log('⚠️  Email send requires real provider credentials');
      }

    } catch (error: any) {
      console.log('⚠️  Email demo error:', error.message);
    }

    console.log();
  }

  async showConfiguration(): Promise<void> {
    console.clear();
    console.log('🔧 API INTEGRATIONS CONFIGURATION');
    console.log('='.repeat(80));

    console.log('\n💳 CASHAPP CONFIGURATION:');
    console.log('   Environment variables needed:');
    console.log('   • CASHAPP_CLIENT_ID');
    console.log('   • CASHAPP_CLIENT_SECRET');
    console.log('   • CASHAPP_REDIRECT_URI (optional)');
    console.log('   📖 Setup: https://developers.cash.app/docs/api/oauth');

    console.log('\n📱 TWILIO SMS CONFIGURATION:');
    console.log('   Environment variables needed:');
    console.log('   • TWILIO_ACCOUNT_SID');
    console.log('   • TWILIO_AUTH_TOKEN');
    console.log('   • TWILIO_FROM_NUMBER');
    console.log('   📖 Setup: https://www.twilio.com/docs/sms');

    console.log('\n📧 EMAIL CONFIGURATION (Gmail Example):');
    console.log('   Environment variables needed:');
    console.log('   • GMAIL_CLIENT_ID');
    console.log('   • GMAIL_CLIENT_SECRET');
    console.log('   • GMAIL_REFRESH_TOKEN');
    console.log('   📖 Setup: https://developers.google.com/gmail/api');

    console.log('\n🔐 OAUTH SETUP STEPS:');
    console.log('   1. Create app in provider console');
    console.log('   2. Configure OAuth redirect URIs');
    console.log('   3. Obtain client credentials');
    console.log('   4. Complete OAuth flow to get refresh token');
    console.log('   5. Store credentials securely');

    console.log('\n🛡️ SECURITY NOTES:');
    console.log('   • Never commit API keys to version control');
    console.log('   • Use environment variables or secure vaults');
    console.log('   • Rotate credentials regularly');
    console.log('   • Implement rate limiting');
    console.log('   • Monitor API usage and costs');

    console.log('\n' + '='.repeat(80));
    process.exit(0);
  }
}

// Run the demo
if (import.meta.main) {
  const demo = new APIIntegrationsDemo();

  const args = process.argv.slice(2);

  if (args.includes('--config')) {
    demo.showConfiguration();
  } else {
    demo.runDemo();
  }
}