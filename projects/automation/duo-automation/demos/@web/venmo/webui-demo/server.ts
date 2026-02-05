#!/usr/bin/env bun

/**
 * 🚀 Venmo Family System - Web UI Demo Server
 * Backend server for the interactive web demo
 */

import { serve } from 'bun';
import { VenmoFamilyAccountSystem } from '../../../src/venmo/family-account-system';

/**
 * 🌐 Demo Server Class
 */
class VenmoDemoServer {
  private familySystem: VenmoFamilyAccountSystem;
  private port: number;

  constructor(port: number = 3003) {
    this.port = port;
    this.familySystem = new VenmoFamilyAccountSystem('demo-token');
  }

  /**
   * 🚀 Start the demo server
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Venmo Family Web UI Demo Server...');
    
    const server = serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
      error(error: Error) {
        console.error('❌ Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    console.log(`✅ Demo server started successfully!`);
    console.log(`🌐 Web UI available at: http://localhost:${this.port}`);
    console.log(`📱 Interactive demo ready!`);
    
    return server;
  }

  /**
   * 🌐 Handle incoming requests
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Serve static files
      if (path === '/' || path === '/index.html') {
        const file = Bun.file('/Users/nolarose/tmp/clones/duo/duo-automation/demos/venmo/webui-demo/index.html');
        return new Response(file, {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      }

      // API Routes
      if (path.startsWith('/api/')) {
        const response = await this.handleAPIRequest(path, method, req);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // 404 for other routes
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error(`❌ Error handling ${method} ${path}:`, error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  /**
   * 🔧 Handle API requests
   */
  private async handleAPIRequest(path: string, method: string, req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Family Management
    if (path === '/api/family/create' && method === 'POST') {
      return await this.handleCreateFamily(req);
    }

    if (path === '/api/family/demo' && method === 'GET') {
      return await this.handleGetDemoFamily();
    }

    // QR Code Generation
    if (path === '/api/qr/generate' && method === 'POST') {
      return await this.handleGenerateQR(req);
    }

    // Transactions
    if (path === '/api/transactions' && method === 'GET') {
      return await this.handleGetTransactions();
    }

    if (path === '/api/transactions' && method === 'POST') {
      return await this.handleCreateTransaction(req);
    }

    // Android Integration
    if (path === '/api/android/test' && method === 'POST') {
      return await this.handleTestAndroid();
    }

    if (path === '/api/android/launch-scanner' && method === 'POST') {
      return await this.handleLaunchScanner();
    }

    if (path === '/api/android/notify' && method === 'POST') {
      return await this.handleSendNotification(req);
    }

    // Stats
    if (path === '/api/stats' && method === 'GET') {
      return await this.handleGetStats();
    }

    // Email Integration
    if (path === '/api/email/parse' && method === 'POST') {
      return await this.handleParseEmail(req);
    }

    // SMS Integration
    if (path === '/api/sms/process' && method === 'POST') {
      return await this.handleProcessSMS(req);
    }

    // Venmo Cookie Integration
    if (path === '/api/venmo/cookies' && method === 'POST') {
      return await this.handleStoreCookies(req);
    }

    if (path === '/api/venmo/cookies' && method === 'GET') {
      return await this.handleGetCookies(req);
    }

    if (path === '/api/venmo/test' && method === 'POST') {
      return await this.handleTestVenmoAPI(req);
    }

    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 🏠 Handle create family
   */
  private async handleCreateFamily(req: Request): Promise<Response> {
    try {
      const { parentName, parentEmail, children } = await req.json();

      if (!parentName || !parentEmail || !children) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const familyAccount = await this.familySystem.createFamilyAccount(
        parentEmail,
        parentName,
        children.map((name: string, index: number) => ({
          email: `${name.toLowerCase().replace(' ', '.')}@demo.com`,
          name
        }))
      );

      return new Response(JSON.stringify({ 
        success: true, 
        family: familyAccount 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create family',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 👨‍👩‍👧‍👦 Handle get demo family
   */
  private async handleGetDemoFamily(): Promise<Response> {
    const demoFamily = {
      familyId: 'demo-family-123',
      parentName: 'John Doe',
      parentEmail: 'john.doe@duoplus.com',
      children: [
        { name: 'Jimmy Doe', role: 'child', status: 'active', spendingLimit: 50 },
        { name: 'Sarah Doe', role: 'child', status: 'active', spendingLimit: 30 }
      ],
      balance: 1247.50,
      createdAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(demoFamily), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 📱 Handle generate QR code
   */
  private async handleGenerateQR(req: Request): Promise<Response> {
    try {
      const { amount, recipient, note } = await req.json();

      if (!amount || !recipient) {
        return new Response(JSON.stringify({ error: 'Missing amount or recipient' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const qrResult = await this.familySystem.generatePaymentQRCode(
        'demo-family-123',
        parseFloat(amount),
        recipient,
        note,
        30
      );

      return new Response(JSON.stringify({ 
        success: true, 
        qr: qrResult 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to generate QR code',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 💳 Handle get transactions
   */
  private async handleGetTransactions(): Promise<Response> {
    const demoTransactions = [
      {
        id: 'txn-001',
        type: 'payment',
        amount: 25.00,
        status: 'completed',
        description: 'Weekly allowance',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'txn-002',
        type: 'qr_scan',
        amount: 15.50,
        status: 'completed',
        description: 'Coffee shop',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'txn-003',
        type: 'split',
        amount: 45.00,
        status: 'completed',
        description: 'Family dinner',
        timestamp: new Date(Date.now() - 10800000).toISOString()
      }
    ];

    return new Response(JSON.stringify(demoTransactions), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 💳 Handle create transaction
   */
  private async handleCreateTransaction(req: Request): Promise<Response> {
    try {
      const { type, amount, description } = await req.json();

      const transaction = {
        id: `txn-${Date.now()}`,
        type,
        amount: parseFloat(amount),
        status: 'completed',
        description,
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify({ 
        success: true, 
        transaction 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 🤖 Handle test Android connection
   */
  private async handleTestAndroid(): Promise<Response> {
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));

    return new Response(JSON.stringify({ 
      success: true, 
      connected: true,
      deviceInfo: {
        type: 'android_virtual',
        version: '3.7.0',
        latency: 45
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 📷 Handle launch QR scanner
   */
  private async handleLaunchScanner(): Promise<Response> {
    // Simulate launching scanner
    await new Promise(resolve => setTimeout(resolve, 500));

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'QR scanner launched on Android device'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 🔔 Handle send notification
   */
  private async handleSendNotification(req: Request): Promise<Response> {
    try {
      const { title, message } = await req.json();

      // Simulate sending notification
      await new Promise(resolve => setTimeout(resolve, 300));

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 📊 Handle get stats
   */
  private async handleGetStats(): Promise<Response> {
    const stats = {
      totalFamilies: 1247,
      totalMembers: 5234,
      monthlyVolume: 2847650,
      qrPayments: 8934,
      activeDevices: 156,
      uptime: '99.9%'
    };

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 📧 Handle email parsing
   */
  private async handleParseEmail(req: Request): Promise<Response> {
    try {
      const { emailContent } = await req.json();

      if (!emailContent) {
        return new Response(JSON.stringify({ error: 'Email content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate email parsing
      const parsed = {
        amount: '$25.50',
        recipient: 'John Doe',
        description: 'Coffee',
        transactionId: 'ABC123XYZ789',
        timestamp: new Date().toISOString(),
        success: true
      };

      return new Response(JSON.stringify(parsed), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to parse email',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 💬 Handle SMS processing
   */
  private async handleProcessSMS(req: Request): Promise<Response> {
    try {
      const { phoneNumber, command } = await req.json();

      if (!phoneNumber || !command) {
        return new Response(JSON.stringify({ error: 'Phone number and command are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate SMS processing
      let response = '';
      const upperCommand = command.toUpperCase();

      if (upperCommand.includes('PAY')) {
        const match = command.match(/PAY\s+\$(\d+\.?\d*)\s+TO\s+(\w+)/i);
        if (match) {
          response = `✅ Payment of $${match[1]} sent to ${match[2]}. Transaction ID: SMS${Date.now()}`;
        } else {
          response = '❌ Invalid PAY format. Use: PAY $25.50 TO JOHN';
        }
      } else if (upperCommand.includes('BALANCE')) {
        response = `💰 Balance: $1,247.50\n📋 Pending: 2 transactions`;
      } else if (upperCommand.includes('HISTORY')) {
        response = '📊 Recent Transactions:\n1. $25.50 - Coffee\n2. $15.00 - Lunch\n3. $50.00 - Groceries';
      } else if (upperCommand.includes('QR')) {
        const match = command.match(/QR\s+\$(\d+\.?\d*)/i);
        if (match) {
          response = `📱 QR code generated for $${match[1]}!\nScan or share: duoplus://pay/FAM123/${match[1]}/SMS`;
        } else {
          response = '❌ Invalid QR format. Use: QR $25';
        }
      } else if (upperCommand.includes('HELP')) {
        response = `🏠 DuoPlus SMS Commands:\n💳 PAY $25.50 TO JOHN\n📊 BALANCE\n📋 HISTORY\n📱 QR $25\n❓ HELP`;
      } else {
        response = '❌ Unknown command. Text HELP for available commands.';
      }

      return new Response(JSON.stringify({ 
        success: true, 
        response,
        phoneNumber,
        command
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to process SMS',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 🍪 Handle storing Venmo cookies
   */
  private async handleStoreCookies(req: Request): Promise<Response> {
    try {
      const { userId, cookies } = await req.json();

      if (!userId || !cookies) {
        return new Response(JSON.stringify({ error: 'User ID and cookies are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate secure cookie storage
      const storedCookies = {
        userId,
        ...cookies,
        sessionId: 'sess_' + Date.now(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stored: true
      };

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Cookies stored securely',
        cookies: storedCookies
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to store cookies',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 🍪 Handle retrieving Venmo cookies
   */
  private async handleGetCookies(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate cookie retrieval
      const cookies = {
        userId,
        venmo_access_token: 'demo-token-abc123',
        session_id: 'sess_' + Date.now(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      };

      return new Response(JSON.stringify(cookies), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to retrieve cookies',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 🧪 Handle Venmo API test
   */
  private async handleTestVenmoAPI(req: Request): Promise<Response> {
    try {
      const { userId } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate Venmo API test
      const apiResult = {
        success: true,
        authenticated: true,
        user: {
          email: 'john.doe@duoplus.com',
          name: 'John Doe',
          balance: 1247.50,
          verified: true
        },
        token: {
          valid: true,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      return new Response(JSON.stringify(apiResult), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Venmo API test failed',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

/**
 * 🚀 Start Demo Server
 */
async function startDemoServer(): Promise<void> {
  const server = new VenmoDemoServer(3003);
  await server.start();
}

// Run if called directly
if (import.meta.main) {
  startDemoServer().catch(console.error);
}

export { VenmoDemoServer };
