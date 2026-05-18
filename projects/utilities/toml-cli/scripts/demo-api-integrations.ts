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
    console.info('🚀 API INTEGRATIONS DEMO - CashApp, SMS & Email');
    console.info('='.repeat(80));
    console.info('⚠️  Note: Using demo credentials - replace with real ones for production');
    console.info('='.repeat(80));
    console.info();

    try {
      // 1. CashApp Demo
      await this.demoCashApp();

      // 2. SMS Demo
      await this.demoSMS();

      // 3. Email Demo
      await this.demoEmail();

      console.info('\n' + '='.repeat(80));
      console.info('✅ ALL API DEMOS COMPLETED');
      console.info('💡 Next steps:');
      console.info('   • Set up real API credentials in environment variables');
      console.info('   • Configure webhooks for status callbacks');
      console.info('   • Implement error handling and retries');
      console.info('   • Add rate limiting and monitoring');
      process.exit(0);

    } catch (error: any) {
      console.error('❌ Demo failed:', error.message);
      console.info('\n🔧 To fix:');
      console.info('   1. Set environment variables with real API credentials');
      console.info('   2. Ensure API services are enabled and accessible');
      console.info('   3. Check network connectivity');
      process.exit(1);
    }
  }

  private async demoCashApp(): Promise<void> {
    console.info('💳 CASHAPP API DEMO');
    console.info('─'.repeat(30));

    try {
      // Show OAuth URL (would normally redirect user)
      const authUrl = this.cashApp.getAuthorizationUrl();
      console.info('🔗 OAuth URL:', authUrl);
      console.info('   (In production, redirect user to this URL)');
      console.info();

      // Simulate OAuth flow with demo token
      console.info('🔐 Simulating OAuth token exchange...');
      // Note: This would fail with demo credentials, but shows the flow

      console.info('💰 CashApp features available:');
      console.info('   ✅ Send payments');
      console.info('   ✅ Request payments');
      console.info('   ✅ Check balance');
      console.info('   ✅ Transaction history');
      console.info('   ✅ Profile management');

      console.info('\n📊 Example usage:');
      console.info(`   await cashApp.sendPayment(25.00, '$cashtag', 'Lunch payment');`);
      console.info(`   await cashApp.getBalance();`);
      console.info(`   await cashApp.getTransactions({ limit: 10 });`);

    } catch (error: any) {
      console.info('⚠️  CashApp demo skipped (requires real credentials):', error.message);
    }

    console.info();
  }

  private async demoSMS(): Promise<void> {
    console.info('📱 SMS GATEWAY DEMO (Twilio)');
    console.info('─'.repeat(30));

    try {
      // Validate phone number
      const testNumber = '+15551234567';
      const isValid = this.sms.validatePhoneNumber(testNumber);
      console.info(`📞 Phone validation: ${testNumber} → ${isValid ? '✅ Valid' : '❌ Invalid'}`);

      // Show SMS features
      console.info('\n📤 SMS features available:');
      console.info('   ✅ Send single SMS');
      console.info('   ✅ Send bulk SMS with rate limiting');
      console.info('   ✅ Message status tracking');
      console.info('   ✅ Delivery confirmations');
      console.info('   ✅ Message history');

      console.info('\n📊 Example usage:');
      console.info(`   await sms.sendSMS('+15551234567', 'Hello from DuoPlus!');`);
      console.info(`   await sms.sendBulkSMS(['+15551234567', '+15559876543'], 'Bulk message');`);
      console.info(`   await sms.getMessages({ limit: 10 });`);

      // Try to get account info (will fail with demo credentials)
      try {
        console.info('\n🔍 Attempting to get account info...');
        const accountInfo = await this.sms.getAccountInfo();
        console.info('📊 Account Balance:', accountInfo.balance, 'USD');
      } catch (error) {
        console.info('⚠️  Account info requires real Twilio credentials');
      }

    } catch (error: any) {
      console.info('⚠️  SMS demo error:', error.message);
    }

    console.info();
  }

  private async demoEmail(): Promise<void> {
    console.info('📧 EMAIL SERVICE DEMO');
    console.info('─'.repeat(30));

    try {
      console.info('📮 Supported providers: Gmail, Outlook, SMTP, SendGrid, Mailgun');

      console.info('\n📤 Email features available:');
      console.info('   ✅ Send emails with attachments');
      console.info('   ✅ HTML and text content');
      console.info('   ✅ CC/BCC support');
      console.info('   ✅ Inbox retrieval (Gmail/Outlook)');
      console.info('   ✅ Mark as read/unread');
      console.info('   ✅ Message management');

      console.info('\n📊 Example usage:');
      console.info(`   await email.sendEmail({`);
      console.info(`     to: 'recipient@example.com',`);
      console.info(`     subject: 'Hello from DuoPlus',`);
      console.info(`     html: '<h1>Hello!</h1>'`);
      console.info(`   });`);

      console.info(`   const emails = await email.getEmails({ maxResults: 10 });`);
      console.info(`   await email.markAsRead(emailId, true);`);

      // Try to send a test email (will fail with demo credentials)
      try {
        console.info('\n📨 Attempting to send test email...');
        const messageId = await this.email.sendEmail({
          to: 'test@example.com',
          subject: 'DuoPlus API Integration Test',
          text: 'This is a test email from the DuoPlus API integration demo.',
          html: '<h1>DuoPlus API Test</h1><p>This is a test email.</p>'
        });
        console.info('✅ Email sent with ID:', messageId);
      } catch (error) {
        console.info('⚠️  Email send requires real provider credentials');
      }

    } catch (error: any) {
      console.info('⚠️  Email demo error:', error.message);
    }

    console.info();
  }

  async showConfiguration(): Promise<void> {
    console.clear();
    console.info('🔧 API INTEGRATIONS CONFIGURATION');
    console.info('='.repeat(80));

    console.info('\n💳 CASHAPP CONFIGURATION:');
    console.info('   Environment variables needed:');
    console.info('   • CASHAPP_CLIENT_ID');
    console.info('   • CASHAPP_CLIENT_SECRET');
    console.info('   • CASHAPP_REDIRECT_URI (optional)');
    console.info('   📖 Setup: https://developers.cash.app/docs/api/oauth');

    console.info('\n📱 TWILIO SMS CONFIGURATION:');
    console.info('   Environment variables needed:');
    console.info('   • TWILIO_ACCOUNT_SID');
    console.info('   • TWILIO_AUTH_TOKEN');
    console.info('   • TWILIO_FROM_NUMBER');
    console.info('   📖 Setup: https://www.twilio.com/docs/sms');

    console.info('\n📧 EMAIL CONFIGURATION (Gmail Example):');
    console.info('   Environment variables needed:');
    console.info('   • GMAIL_CLIENT_ID');
    console.info('   • GMAIL_CLIENT_SECRET');
    console.info('   • GMAIL_REFRESH_TOKEN');
    console.info('   📖 Setup: https://developers.google.com/gmail/api');

    console.info('\n🔐 OAUTH SETUP STEPS:');
    console.info('   1. Create app in provider console');
    console.info('   2. Configure OAuth redirect URIs');
    console.info('   3. Obtain client credentials');
    console.info('   4. Complete OAuth flow to get refresh token');
    console.info('   5. Store credentials securely');

    console.info('\n🛡️ SECURITY NOTES:');
    console.info('   • Never commit API keys to version control');
    console.info('   • Use environment variables or secure vaults');
    console.info('   • Rotate credentials regularly');
    console.info('   • Implement rate limiting');
    console.info('   • Monitor API usage and costs');

    console.info('\n' + '='.repeat(80));
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