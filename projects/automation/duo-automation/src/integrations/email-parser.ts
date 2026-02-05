/**
 * 📧 Email Parser Integration - FactoryWager Venmo Family System
 * Parses payment emails, receipts, and notifications
 */

import { createParser } from 'mailparser';
import { VenmoFamilyAccountSystem } from '../venmo/family-account-system';

/**
 * 📧 Email Parser Class
 */
export class EmailParser {
  private familySystem: VenmoFamilyAccountSystem;

  constructor() {
    this.familySystem = new VenmoFamilyAccountSystem('email-parser-token');
  }

  /**
   * 📧 Parse incoming email for payment information
   */
  async parsePaymentEmail(emailRaw: string): Promise<{
    success: boolean;
    payment?: {
      amount: number;
      recipient: string;
      description: string;
      transactionId: string;
      timestamp: Date;
    };
    error?: string;
  }> {
    try {
      // Parse email
      const parsed = await createParser().parse(emailRaw);
      
      // Extract payment information
      const payment = await this.extractPaymentInfo(parsed);
      
      if (payment) {
        return { success: true, payment };
      } else {
        return { success: false, error: 'No payment information found' };
      }
    } catch (error) {
      console.error('Email parsing error:', error);
      return { success: false, error: 'Failed to parse email' };
    }
  }

  /**
   * 💰 Extract payment information from parsed email
   */
  private async extractPaymentInfo(parsed: any): Promise<{
    amount: number;
    recipient: string;
    description: string;
    transactionId: string;
    timestamp: Date;
  } | null> {
    const subject = parsed.subject || '';
    const text = parsed.text || '';
    const html = parsed.html || '';
    const from = parsed.from?.value?.[0]?.address || '';
    
    // Venmo payment email patterns
    const venmoPatterns = {
      // "You paid $25.50 to John Doe"
      paid: /You paid \$(\d+\.?\d*) to ([^\n]+)/i,
      // "John Doe paid you $25.50"
      received: /([^\n]+) paid you \$(\d+\.?\d*)/i,
      // Transaction ID in email
      transactionId: /Transaction ID: ([A-Z0-9]+)/i,
      // Amount in subject
      amountInSubject: /\$(\d+\.?\d*)/i
    };

    let amount = 0;
    let recipient = '';
    let description = '';
    let transactionId = '';
    
    // Check if it's a payment email
    const content = text || html || '';
    
    // Try to find payment patterns
    const paidMatch = content.match(venmoPatterns.paid);
    const receivedMatch = content.match(venmoPatterns.received);
    
    if (paidMatch) {
      amount = parseFloat(paidMatch[1]);
      recipient = paidMatch[2].trim();
      description = 'Payment sent';
    } else if (receivedMatch) {
      amount = parseFloat(receivedMatch[2]);
      recipient = receivedMatch[1].trim();
      description = 'Payment received';
    } else {
      // Try to extract from subject
      const subjectMatch = subject.match(venmoPatterns.amountInSubject);
      if (subjectMatch) {
        amount = parseFloat(subjectMatch[1]);
        recipient = from;
        description = subject;
      }
    }
    
    // Extract transaction ID
    const transactionMatch = content.match(venmoPatterns.transactionId);
    if (transactionMatch) {
      transactionId = transactionMatch[1];
    }
    
    // Validate extracted data
    if (amount > 0 && recipient) {
      return {
        amount,
        recipient,
        description,
        transactionId,
        timestamp: new Date(parsed.date || Date.now())
      };
    }
    
    return null;
  }

  /**
   * 🏠 Process payment email and update family account
   */
  async processPaymentEmail(emailRaw: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    const parsed = await this.parsePaymentEmail(emailRaw);
    
    if (!parsed.success || !parsed.payment) {
      return { success: false, error: parsed.error };
    }
    
    try {
      // Find family account by email
      const families = await this.findFamiliesByEmail(parsed.payment.recipient);
      
      if (families.length === 0) {
        return { success: false, error: 'No family account found for recipient' };
      }
      
      // Update first matching family
      const family = families[0];
      
      // Create transaction record
      const transaction = {
        id: parsed.payment.transactionId || `email-${Date.now()}`,
        type: 'email_payment',
        amount: parsed.payment.amount,
        status: 'completed',
        description: parsed.payment.description,
        timestamp: parsed.payment.timestamp.toISOString(),
        recipient: parsed.payment.recipient
      };
      
      // Store transaction (you would implement this in your database)
      console.log('💰 Email payment processed:', transaction);
      
      return { success: true, transactionId: transaction.id };
      
    } catch (error) {
      console.error('Error processing payment email:', error);
      return { success: false, error: 'Failed to process payment' };
    }
  }

  /**
   * 🔍 Find family accounts by email
   */
  private async findFamiliesByEmail(email: string): Promise<any[]> {
    // This would query your database for family accounts
    // For demo purposes, return mock data
    const mockFamilies = [
      {
        familyId: 'demo-family-123',
        parentEmail: 'john.doe@factory-wager.com',
        parentName: 'John Doe'
      }
    ];
    
    return mockFamilies.filter(family => 
      family.parentEmail === email || 
      email.includes(family.parentName.toLowerCase().replace(' ', '.'))
    );
  }

  /**
   * 📧 Parse Venmo notification emails
   */
  async parseVenmoNotification(emailRaw: string): Promise<{
    type: 'payment_sent' | 'payment_received' | 'request_sent' | 'request_received';
    amount: number;
    otherParty: string;
    note: string;
    transactionId: string;
  } | null> {
    const parsed = await this.parsePaymentEmail(emailRaw);
    
    if (!parsed.success || !parsed.payment) {
      return null;
    }
    
    const content = parsed.payment.description.toLowerCase();
    let type: 'payment_sent' | 'payment_received' | 'request_sent' | 'request_received' = 'payment_sent';
    
    if (content.includes('paid you')) {
      type = 'payment_received';
    } else if (content.includes('request')) {
      type = content.includes('from') ? 'request_received' : 'request_sent';
    }
    
    return {
      type,
      amount: parsed.payment.amount,
      otherParty: parsed.payment.recipient,
      note: parsed.payment.description,
      transactionId: parsed.payment.transactionId
    };
  }
}

/**
 * 📧 Email Webhook Handler
 */
export class EmailWebhookHandler {
  private emailParser: EmailParser;

  constructor() {
    this.emailParser = new EmailParser();
  }

  /**
   * 🪝 Handle incoming email webhook
   */
  async handleEmailWebhook(req: Request): Promise<Response> {
    try {
      const emailData = await req.json();
      
      // Extract email content
      const emailRaw = emailData.email || emailData.content || emailData.raw;
      
      if (!emailRaw) {
        return new Response(JSON.stringify({ error: 'No email content' }), { status: 400 });
      }
      
      // Process the email
      const result = await this.emailParser.processPaymentEmail(emailRaw);
      
      if (result.success) {
        return new Response(JSON.stringify({ 
          success: true, 
          transactionId: result.transactionId 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ 
          error: result.error 
        }), { status: 400 });
      }
      
    } catch (error) {
      console.error('Email webhook error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
  }
}

/**
 * 📧 Email Integration Examples
 */

// Example usage:
/*
const emailParser = new EmailParser();

// Parse a Venmo payment email
const venmoEmail = `
From: venmo@venmo.com
Subject: You paid $25.50 to John Doe
Date: Thu, 15 Jan 2026 10:30:00 EST

You paid $25.50 to John Doe for "Coffee"
Transaction ID: ABC123XYZ789
`;

const result = await emailParser.parsePaymentEmail(venmoEmail);
console.log('Parsed payment:', result);
*/
