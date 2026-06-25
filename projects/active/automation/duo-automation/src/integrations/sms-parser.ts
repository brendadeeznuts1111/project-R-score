/**
 * 📱 SMS Parser Integration - FactoryWager Venmo Family System
 * Parses text messages for payment commands and notifications
 */

import { VenmoFamilyAccountSystem } from '../venmo/family-account-system';

/**
 * 📱 SMS Parser Class
 */
export class SMSParser {
  private familySystem: VenmoFamilyAccountSystem;
  private commandPatterns: Map<string, RegExp>;

  constructor() {
    this.familySystem = new VenmoFamilyAccountSystem('sms-parser-token');
    this.initializeCommandPatterns();
  }

  /**
   * 🔧 Initialize SMS command patterns
   */
  private initializeCommandPatterns(): void {
    this.commandPatterns = new Map([
      // Payment commands
      ['PAY', /PAY\s+(\d+\.?\d*)\s+TO\s+([A-Z0-9]+)/i],
      ['SEND', /SEND\s+\$(\d+\.?\d*)\s+TO\s+(\w+)/i],
      ['REQUEST', /REQUEST\s+\$(\d+\.?\d*)\s+FROM\s+(\w+)/i],
      
      // Family commands
      ['BALANCE', /BALANCE/i],
      ['HISTORY', /HISTORY|TRANSACTIONS/i],
      ['LIMIT', /LIMIT\s+(\d+\.?\d*)/i],
      
      // Parental controls
      ['APPROVE', /APPROVE\s+([A-Z0-9]+)/i],
      ['DECLINE', /DECLINE\s+([A-Z0-9]+)/i],
      ['ALLOWANCE', /ALLOWANCE\s+\$(\d+\.?\d*)/i],
      
      // QR commands
      ['QR', /QR\s+(\d+\.?\d*)/i],
      ['SCAN', /SCAN/i],
      
      // Help
      ['HELP', /HELP|\?/i]
    ]);
  }

  /**
   * 📱 Parse incoming SMS message
   */
  async parseSMS(fromNumber: string, message: string): Promise<{
    success: boolean;
    command?: string;
    response?: string;
    error?: string;
  }> {
    try {
      // Clean and normalize message
      const cleanMessage = message.trim().toUpperCase();
      
      // Find matching command
      for (const [command, pattern] of this.commandPatterns) {
        const match = cleanMessage.match(pattern);
        if (match) {
          const result = await this.executeCommand(command, fromNumber, match, message);
          return result;
        }
      }
      
      // No command found
      return {
        success: false,
        error: 'Unknown command. Text HELP for available commands.'
      };
      
    } catch (error) {
      console.error('SMS parsing error:', error);
      return {
        success: false,
        error: 'Failed to process message'
      };
    }
  }

  /**
   * ⚡ Execute parsed command
   */
  private async executeCommand(
    command: string, 
    fromNumber: string, 
    match: RegExpMatchArray, 
    originalMessage: string
  ): Promise<{
    success: boolean;
    command: string;
    response?: string;
    error?: string;
  }> {
    
    // Get user from phone number
    const user = await this.getUserByPhone(fromNumber);
    if (!user) {
      return {
        success: false,
        command,
        error: 'Phone number not registered. Please register your account first.'
      };
    }

    switch (command) {
      case 'PAY':
      case 'SEND':
        return await this.handlePayment(user, match, originalMessage);
      
      case 'REQUEST':
        return await this.handleRequest(user, match, originalMessage);
      
      case 'BALANCE':
        return await this.handleBalance(user);
      
      case 'HISTORY':
        return await this.handleHistory(user);
      
      case 'LIMIT':
        return await this.handleSetLimit(user, match);
      
      case 'APPROVE':
        return await this.handleApprove(user, match);
      
      case 'DECLINE':
        return await this.handleDecline(user, match);
      
      case 'ALLOWANCE':
        return await this.handleAllowance(user, match);
      
      case 'QR':
        return await this.handleQRGeneration(user, match);
      
      case 'SCAN':
        return await this.handleQRScan(user);
      
      case 'HELP':
        return await this.handleHelp();
      
      default:
        return {
          success: false,
          command,
          error: 'Command not implemented'
        };
    }
  }

  /**
   * 💰 Handle payment command
   */
  private async handlePayment(user: any, match: RegExpMatchArray, originalMessage: string): Promise<any> {
    const amount = parseFloat(match[1]);
    const recipient = match[2];
    
    if (amount <= 0 || amount > 999.99) {
      return {
        success: false,
        command: 'PAY',
        error: 'Invalid amount. Must be between $0.01 and $999.99'
      };
    }
    
    try {
      // Process payment through Venmo
      const result = await this.familySystem.processPayment({
        fromUserId: user.id,
        toUserOrBusiness: recipient,
        amount,
        note: `SMS Payment: ${originalMessage}`
      });
      
      if (result.success) {
        return {
          success: true,
          command: 'PAY',
          response: `✅ Payment of $${amount.toFixed(2)} sent to ${recipient}. Transaction ID: ${result.transactionId}`
        };
      } else {
        return {
          success: false,
          command: 'PAY',
          error: result.error || 'Payment failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        command: 'PAY',
        error: 'Payment processing failed'
      };
    }
  }

  /**
   * 📋 Handle balance inquiry
   */
  private async handleBalance(user: any): Promise<any> {
    try {
      const balance = await this.familySystem.getAccountBalance(user.familyId);
      const pending = await this.familySystem.getPendingTransactions(user.id);
      
      return {
        success: true,
        command: 'BALANCE',
        response: `💰 Balance: $${balance.toFixed(2)}\n📋 Pending: ${pending.length} transactions`
      };
    } catch (error) {
      return {
        success: false,
        command: 'BALANCE',
        error: 'Failed to retrieve balance'
      };
    }
  }

  /**
   * 📊 Handle transaction history
   */
  private async handleHistory(user: any): Promise<any> {
    try {
      const transactions = await this.familySystem.getTransactionHistory(user.familyId, 5);
      
      if (transactions.length === 0) {
        return {
          success: true,
          command: 'HISTORY',
          response: '📊 No recent transactions'
        };
      }
      
      let response = '📊 Recent Transactions:\n';
      transactions.forEach((tx: any, index: number) => {
        response += `${index + 1}. $${tx.amount} - ${tx.description}\n`;
      });
      
      return {
        success: true,
        command: 'HISTORY',
        response
      };
    } catch (error) {
      return {
        success: false,
        command: 'HISTORY',
        error: 'Failed to retrieve history'
      };
    }
  }

  /**
   * 🎯 Handle QR code generation
   */
  private async handleQRGeneration(user: any, match: RegExpMatchArray): Promise<any> {
    const amount = parseFloat(match[1]);
    
    try {
      const qrResult = await this.familySystem.generatePaymentQRCode(
        user.familyId,
        amount,
        user.email,
        'SMS Generated QR',
        30
      );
      
      if (qrResult.success) {
        return {
          success: true,
          command: 'QR',
          response: `📱 QR code generated for $${amount.toFixed(2)}!\nScan or share: ${qrResult.qrCodeData}`
        };
      } else {
        return {
          success: false,
          command: 'QR',
          error: 'Failed to generate QR code'
        };
      }
    } catch (error) {
      return {
        success: false,
        command: 'QR',
        error: 'QR generation failed'
      };
    }
  }

  /**
   * 📖 Handle help command
   */
  private async handleHelp(): Promise<any> {
    const helpText = `
🏠 FactoryWager Family Banking - SMS Commands

💳 PAYMENTS:
• PAY $25.50 TO JOHN
• SEND $10 TO MOM

📊 ACCOUNT:
• BALANCE - Check balance
• HISTORY - Recent transactions

👨‍👩‍👧‍👦 FAMILY:
• REQUEST $20 FROM DAD
• LIMIT $50 - Set spending limit
• ALLOWANCE $25 - Set weekly allowance

📱 QR CODES:
• QR $25 - Generate payment QR
• SCAN - Simulate QR scan

🔒 PARENTAL:
• APPROVE TX123 - Approve transaction
• DECLINE TX123 - Decline transaction

❓ HELP - Show this message
    `.trim();
    
    return {
      success: true,
      command: 'HELP',
      response: helpText
    };
  }

  /**
   * 🔍 Get user by phone number
   */
  private async getUserByPhone(phoneNumber: string): Promise<any> {
    // This would query your database
    // For demo purposes, return mock user
    const mockUsers = [
      {
        id: 'user-123',
        phone: '+1234567890',
        email: 'john.doe@factory-wager.com',
        familyId: 'family-123',
        role: 'parent'
      }
    ];
    
    return mockUsers.find(user => user.phone === phoneNumber) || null;
  }

  /**
   * 📋 Handle request command
   */
  private async handleRequest(user: any, match: RegExpMatchArray, originalMessage: string): Promise<any> {
    const amount = parseFloat(match[1]);
    const fromPerson = match[2];
    
    try {
      const result = await this.familySystem.requestPayment({
        fromUserId: user.id,
        fromUserOrBusiness: fromPerson,
        amount,
        note: `SMS Request: ${originalMessage}`
      });
      
      if (result.success) {
        return {
          success: true,
          command: 'REQUEST',
          response: `📋 Requested $${amount.toFixed(2)} from ${fromPerson}. Request ID: ${result.requestId}`
        };
      } else {
        return {
          success: false,
          command: 'REQUEST',
          error: result.error || 'Request failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        command: 'REQUEST',
        error: 'Request processing failed'
      };
    }
  }

  /**
   * 🎯 Handle set limit command
   */
  private async handleSetLimit(user: any, match: RegExpMatchArray): Promise<any> {
    if (user.role !== 'parent') {
      return {
        success: false,
        command: 'LIMIT',
        error: 'Only parents can set spending limits'
      };
    }
    
    const limit = parseFloat(match[1]);
    
    try {
      await this.familySystem.setSpendingLimit(user.familyId, limit);
      
      return {
        success: true,
        command: 'LIMIT',
        response: `✅ Spending limit set to $${limit.toFixed(2)} for family account`
      };
    } catch (error) {
      return {
        success: false,
        command: 'LIMIT',
        error: 'Failed to set spending limit'
      };
    }
  }

  /**
   * ✅ Handle approve command
   */
  private async handleApprove(user: any, match: RegExpMatchArray): Promise<any> {
    if (user.role !== 'parent') {
      return {
        success: false,
        command: 'APPROVE',
        error: 'Only parents can approve transactions'
      };
    }
    
    const transactionId = match[1];
    
    try {
      await this.familySystem.approveTransaction(transactionId, user.id);
      
      return {
        success: true,
        command: 'APPROVE',
        response: `✅ Transaction ${transactionId} approved`
      };
    } catch (error) {
      return {
        success: false,
        command: 'APPROVE',
        error: 'Failed to approve transaction'
      };
    }
  }

  /**
   * ❌ Handle decline command
   */
  private async handleDecline(user: any, match: RegExpMatchArray): Promise<any> {
    if (user.role !== 'parent') {
      return {
        success: false,
        command: 'DECLINE',
        error: 'Only parents can decline transactions'
      };
    }
    
    const transactionId = match[1];
    
    try {
      await this.familySystem.declineTransaction(transactionId, user.id);
      
      return {
        success: true,
        command: 'DECLINE',
        response: `❌ Transaction ${transactionId} declined`
      };
    } catch (error) {
      return {
        success: false,
        command: 'DECLINE',
        error: 'Failed to decline transaction'
      };
    }
  }

  /**
   * 💰 Handle allowance command
   */
  private async handleAllowance(user: any, match: RegExpMatchArray): Promise<any> {
    if (user.role !== 'parent') {
      return {
        success: false,
        command: 'ALLOWANCE',
        error: 'Only parents can set allowance'
      };
    }
    
    const amount = parseFloat(match[1]);
    
    try {
      await this.familySystem.setWeeklyAllowance(user.familyId, amount);
      
      return {
        success: true,
        command: 'ALLOWANCE',
        response: `✅ Weekly allowance set to $${amount.toFixed(2)}`
      };
    } catch (error) {
      return {
        success: false,
        command: 'ALLOWANCE',
        error: 'Failed to set allowance'
      };
    }
  }

  /**
   * 📷 Handle QR scan command
   */
  private async handleQRScan(user: any): Promise<any> {
    return {
      success: true,
      command: 'SCAN',
      response: '📷 QR scanner launched. Point camera at QR code to pay.'
    };
  }
}

/**
 * 📱 SMS Webhook Handler
 */
export class SMSWebhookHandler {
  private smsParser: SMSParser;

  constructor() {
    this.smsParser = new SMSParser();
  }

  /**
   * 🪝 Handle incoming SMS webhook
   */
  async handleSMSWebhook(req: Request): Promise<Response> {
    try {
      const smsData = await req.json();
      
      const fromNumber = smsData.from || smsData.phone_number;
      const message = smsData.message || smsData.text || smsData.content;
      
      if (!fromNumber || !message) {
        return new Response(JSON.stringify({ error: 'Missing phone number or message' }), { status: 400 });
      }
      
      // Parse and process the SMS
      const result = await this.smsParser.parseSMS(fromNumber, message);
      
      // Send response back via SMS (you would integrate with Twilio, etc.)
      if (result.response) {
        await this.sendSMSResponse(fromNumber, result.response);
      }
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('SMS webhook error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
  }

  /**
   * 📤 Send SMS response
   */
  private async sendSMSResponse(toNumber: string, message: string): Promise<void> {
    // This would integrate with Twilio, AWS SNS, or other SMS service
    console.info(`📤 Sending SMS to ${toNumber}: ${message}`);
    
    // Example with Twilio:
    /*
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });
    */
  }
}

/**
 * 📱 SMS Integration Examples
 */

// Example usage:
/*
const smsParser = new SMSParser();

// Parse a payment SMS
const result = await smsParser.parseSMS('+1234567890', 'PAY $25.50 TO JOHN');
console.info('SMS result:', result);

// Parse balance inquiry
const balanceResult = await smsParser.parseSMS('+1234567890', 'BALANCE');
console.info('Balance result:', balanceResult);
*/
