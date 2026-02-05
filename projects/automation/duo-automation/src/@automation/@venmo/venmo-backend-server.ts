/**
 * 🚀 Venmo Family Account Backend Server
 * Complete REST API for family account management and QR payments
 */

import { serve } from 'bun';
import { VenmoFamilyAccountSystem, FamilyAccount, VenmoTransaction, FamilyMember } from './family-account-system';

/**
 * 🌐 Bun Backend Server Class
 */
export class VenmoBackendServer {
  private familySystem: VenmoFamilyAccountSystem;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    // In production, use real Venmo Business token
    this.familySystem = new VenmoFamilyAccountSystem(process.env.VENMO_BUSINESS_TOKEN || 'mock-token');
  }

  /**
   * 🚀 Start the server
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Venmo Family Account Backend Server...');
    console.log(`📡 Server will run on port ${this.port}`);

    const server = serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
      error(error: Error) {
        console.error('❌ Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    console.log(`✅ Venmo Backend Server started successfully!`);
    console.log(`🌐 API available at: http://localhost:${this.port}`);
    console.log(`📚 API Documentation:`);
    console.log(`   POST /api/family/create - Create family account`);
    console.log(`   GET  /api/family/:familyId - Get family account`);
    console.log(`   GET  /api/family/:familyId/members - Get family members`);
    console.log(`   POST /api/family/:familyId/join - Join family account`);
    console.log(`   GET  /api/qr/generate - Generate payment QR code`);
    console.log(`   POST /api/payments/send - Send payment`);
    console.log(`   POST /api/payments/split - Create split payment`);
    console.log(`   POST /api/payments/approve - Approve transaction`);
    console.log(`   GET  /api/transactions/:familyId - Get family transactions`);
    console.log(`   GET  /api/stats - Get system statistics`);

    return server;
  }

  /**
   * 🌐 Handle incoming requests
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    console.log(`📡 ${method} ${path}`);

    try {
      // Enable CORS for all requests
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

      // Route handling
      let response: Response;

      // Family Account Routes
      if (path === '/api/family/create' && method === 'POST') {
        response = await this.handleCreateFamilyAccount(req);
      } else if (path.startsWith('/api/family/') && path.endsWith('/members') && method === 'GET') {
        const familyId = path.split('/')[3];
        response = await this.handleGetFamilyMembers(familyId);
      } else if (path.startsWith('/api/family/') && method === 'GET') {
        const familyId = path.split('/')[3];
        response = await this.handleGetFamilyAccount(familyId);
      } else if (path.startsWith('/api/family/') && path.endsWith('/join') && method === 'POST') {
        const familyId = path.split('/')[3];
        response = await this.handleJoinFamily(familyId, req);
      }
      
      // QR Code Routes
      else if (path === '/api/qr/generate' && method === 'GET') {
        response = await this.handleGenerateQRCode(url);
      } else if (path === '/api/qr/process' && method === 'POST') {
        response = await this.handleProcessQRPayment(req);
      }
      
      // Payment Routes
      else if (path === '/api/payments/send' && method === 'POST') {
        response = await this.handleSendPayment(req);
      } else if (path === '/api/payments/split' && method === 'POST') {
        response = await this.handleCreateSplitPayment(req);
      } else if (path === '/api/payments/approve' && method === 'POST') {
        response = await this.handleApprovePayment(req);
      }
      
      // Transaction Routes
      else if (path.startsWith('/api/transactions/') && method === 'GET') {
        const familyId = path.split('/')[3];
        response = await this.handleGetTransactions(familyId);
      }
      
      // Stats Route
      else if (path === '/api/stats' && method === 'GET') {
        response = await this.handleGetStats();
      }
      
      // Health Check
      else if (path === '/health' && method === 'GET') {
        response = new Response(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      // API Documentation
      else if (path === '/' && method === 'GET') {
        response = new Response(this.getAPIDocumentation(), {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      }
      
      else {
        response = new Response(JSON.stringify({ error: 'Endpoint not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      console.error(`❌ Error handling ${method} ${path}:`, error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  /**
   * 🏠 Handle Create Family Account
   */
  private async handleCreateFamilyAccount(req: Request): Promise<Response> {
    try {
      const { parentEmail, parentName, children, settings } = await req.json();

      if (!parentEmail || !parentName || !children || !Array.isArray(children)) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const familyAccount = await this.familySystem.createFamilyAccount(
        parentEmail,
        parentName,
        children,
        settings
      );

      return new Response(JSON.stringify({ 
        success: true, 
        familyId: familyAccount.familyId,
        family: familyAccount 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create family account',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 👤 Handle Get Family Account
   */
  private async handleGetFamilyAccount(familyId: string): Promise<Response> {
    try {
      const familyAccount = await this.familySystem.getFamilyAccount(familyId);
      
      return new Response(JSON.stringify({ family: familyAccount }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Family not found',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 👥 Handle Get Family Members
   */
  private async handleGetFamilyMembers(familyId: string): Promise<Response> {
    try {
      const members = await this.familySystem.getFamilyMembers(familyId);
      
      return new Response(JSON.stringify({ members }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get family members',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 🎉 Handle Join Family
   */
  private async handleJoinFamily(familyId: string, req: Request): Promise<Response> {
    try {
      const { memberEmail, memberName } = await req.json();

      if (!memberEmail || !memberName) {
        return new Response(JSON.stringify({ error: 'Missing member information' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // In a real implementation, this would update the family member status
      // For now, we'll simulate the join process
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Join request sent to parent for approval'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to join family',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 📱 Handle Generate QR Code
   */
  private async handleGenerateQRCode(url: URL): Promise<Response> {
    try {
      const familyId = url.searchParams.get('familyId');
      const amount = url.searchParams.get('amount');
      const recipient = url.searchParams.get('recipient');
      const description = url.searchParams.get('description');
      const expiresIn = url.searchParams.get('expiresIn');

      if (!familyId || !amount || !recipient) {
        return new Response(JSON.stringify({ 
          error: 'Missing required parameters: familyId, amount, recipient' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const qrResult = await this.familySystem.generatePaymentQRCode(
        familyId,
        parseFloat(amount),
        recipient,
        description || undefined,
        expiresIn ? parseInt(expiresIn) : undefined
      );

      return new Response(JSON.stringify(qrResult), {
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
   * 💳 Handle Process QR Payment
   */
  private async handleProcessQRPayment(req: Request): Promise<Response> {
    try {
      const { qrData, senderEmail, senderName } = await req.json();

      if (!qrData || !senderEmail || !senderName) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: qrData, senderEmail, senderName' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const transaction = await this.familySystem.processQRPayment(
        qrData,
        senderEmail,
        senderName
      );

      return new Response(JSON.stringify({ 
        success: true, 
        transaction 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to process QR payment',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 💰 Handle Send Payment
   */
  private async handleSendPayment(req: Request): Promise<Response> {
    try {
      const { familyId, fromMemberId, toMemberId, amount, note } = await req.json();

      if (!familyId || !fromMemberId || !toMemberId || !amount) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: familyId, fromMemberId, toMemberId, amount' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const transaction = await this.familySystem.sendPayment(
        familyId,
        fromMemberId,
        toMemberId,
        parseFloat(amount),
        note
      );

      return new Response(JSON.stringify({ 
        success: true, 
        transaction 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to send payment',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 🔄 Handle Create Split Payment
   */
  private async handleCreateSplitPayment(req: Request): Promise<Response> {
    try {
      const { familyId, totalAmount, participantIds, description, initiatedBy } = await req.json();

      if (!familyId || !totalAmount || !participantIds || !Array.isArray(participantIds)) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: familyId, totalAmount, participantIds' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const splitResult = await this.familySystem.createSplitPayment(
        familyId,
        parseFloat(totalAmount),
        participantIds,
        description || 'Split payment',
        initiatedBy
      );

      return new Response(JSON.stringify({ 
        success: true, 
        ...splitResult 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create split payment',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * ✅ Handle Approve Payment
   */
  private async handleApprovePayment(req: Request): Promise<Response> {
    try {
      const { transactionId, approvedBy } = await req.json();

      if (!transactionId || !approvedBy) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: transactionId, approvedBy' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const transaction = await this.familySystem.approveTransaction(
        transactionId,
        approvedBy
      );

      return new Response(JSON.stringify({ 
        success: true, 
        transaction 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to approve payment',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 📊 Handle Get Transactions
   */
  private async handleGetTransactions(familyId: string): Promise<Response> {
    try {
      const transactions = await this.familySystem.getFamilyTransactions(familyId);
      
      return new Response(JSON.stringify({ transactions }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get transactions',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 📈 Handle Get Stats
   */
  private async handleGetStats(): Promise<Response> {
    try {
      const stats = this.familySystem.getSystemStats();
      
      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get system stats',
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 📚 Get API Documentation
   */
  private getAPIDocumentation(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Venmo Family Account API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .endpoint { background: #3b82f6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { font-weight: bold; color: #3b82f6; }
        .description { color: #666; margin: 5px 0; }
        pre { background: #3b82f6; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🏠 Venmo Family Account API</h1>
    <p>Complete REST API for family account management and QR payments</p>
    
    <h2>🏠 Family Account Management</h2>
    
    <div class="endpoint">
        <div class="method">POST /api/family/create</div>
        <div class="description">Create a new family account with parent and children</div>
        <pre>{
  "parentEmail": "parent@example.com",
  "parentName": "John Doe",
  "children": [
    { "email": "child1@example.com", "name": "Jane Doe" },
    { "email": "child2@example.com", "name": "Jimmy Doe" }
  ],
  "settings": {
    "requireParentApproval": true,
    "approvalThreshold": 25
  }
}</pre>
    </div>
    
    <div class="endpoint">
        <div class="method">GET /api/family/:familyId</div>
        <div class="description">Get family account details</div>
    </div>
    
    <div class="endpoint">
        <div class="method">GET /api/family/:familyId/members</div>
        <div class="description">Get all family members</div>
    </div>
    
    <h2>📱 QR Code Payments</h2>
    
    <div class="endpoint">
        <div class="method">GET /api/qr/generate?familyId=123&amount=25.50&recipient=child1@example.com</div>
        <div class="description">Generate payment QR code</div>
    </div>
    
    <div class="endpoint">
        <div class="method">POST /api/qr/process</div>
        <div class="description">Process QR code payment</div>
        <pre>{
  "qrData": "factory-wager://pay/family-123/25.50/child1@example.com/Coffee",
  "senderEmail": "sender@example.com",
  "senderName": "Sender Name"
}</pre>
    </div>
    
    <h2>💳 Payment Management</h2>
    
    <div class="endpoint">
        <div class="method">POST /api/payments/send</div>
        <div class="description">Send payment to family member</div>
        <pre>{
  "familyId": "family-123",
  "fromMemberId": "member-456",
  "toMemberId": "member-789",
  "amount": 25.00,
  "note": "Lunch money"
}</pre>
    </div>
    
    <div class="endpoint">
        <div class="method">POST /api/payments/split</div>
        <div class="description">Create split payment</div>
        <pre>{
  "familyId": "family-123",
  "totalAmount": 100.00,
  "participantIds": ["member-456", "member-789"],
  "description": "Restaurant bill",
  "initiatedBy": "member-456"
}</pre>
    </div>
    
    <div class="endpoint">
        <div class="method">POST /api/payments/approve</div>
        <div class="description">Approve pending payment</div>
        <pre>{
  "transactionId": "txn-123",
  "approvedBy": "parent@example.com"
}</pre>
    </div>
    
    <h2>📊 Analytics</h2>
    
    <div class="endpoint">
        <div class="method">GET /api/transactions/:familyId</div>
        <div class="description">Get family transaction history</div>
    </div>
    
    <div class="endpoint">
        <div class="method">GET /api/stats</div>
        <div class="description">Get system statistics</div>
    </div>
    
    <h2>🔧 Health Check</h2>
    
    <div class="endpoint">
        <div class="method">GET /health</div>
        <div class="description">Check API health status</div>
    </div>
    
    <p><strong>🚀 Built with Bun for high performance!</strong></p>
</body>
</html>
    `;
  }
}

/**
 * 🚀 Start Venmo Backend Server
 */
export async function startVenmoBackendServer(port: number = 3000): Promise<void> {
  const server = new VenmoBackendServer(port);
  await server.start();
}

export default VenmoBackendServer;
