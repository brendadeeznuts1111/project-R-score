#!/usr/bin/env bun
// 💚 Cash App Priority API Server
// QR code generation, payment sessions, family sponsorship, business verification

import { serve } from "bun";
import { feature } from 'bun:bundle';

// In-memory storage for demo (replace with actual database in production)
const sponsorships = new Map<string, any>();
const businessAccounts = new Map<string, any>();
const paymentSessions = new Map<string, any>();

// Cash App Pay API endpoints
if (feature("PREMIUM")) {
  const PORT = process.env.CASH_APP_PORT ? parseInt(process.env.CASH_APP_PORT) : 3223;
  const HOST = process.env.HOST || 'localhost';

  // Cash App Priority API Server
  const server = serve({
    port: PORT,
    hostname: HOST,
    fetch(req: Request) {
      const url = new URL(req.url);
      
      if (url.pathname === '/api/cashapp/qr' && req.method === 'POST') {
        return handleCashAppQR(req);
      }
      
      if (url.pathname === '/api/cashapp/sessions' && req.method === 'POST') {
        return handleCashAppSession(req);
      }
      
      if (url.pathname.startsWith('/api/cashapp/sessions/') && req.method === 'GET') {
        const pathParts = url.pathname.split('/');
        const sessionId = pathParts[pathParts.length - 1];
        if (sessionId) {
          return handleCashAppVerify(sessionId);
        }
      }
      
      if (url.pathname === '/api/family/sponsor' && req.method === 'POST') {
        return handleFamilySponsorship(req);
      }
      
      if (url.pathname.startsWith('/api/family/sponsor/') && req.method === 'POST') {
        const pathParts = url.pathname.split('/');
        if (pathParts[5] === 'approve') {
          const sponsorshipId = pathParts[4];
          if (sponsorshipId) {
            return handleFamilyApproval(sponsorshipId);
          }
        }
      }
      
      if (url.pathname.startsWith('/api/family/sponsor/') && req.method === 'GET') {
        const pathParts = url.pathname.split('/');
        const sponsorshipId = pathParts[pathParts.length - 1];
        if (sponsorshipId) {
          return handleFamilyStatus(sponsorshipId);
        }
      }
      
      if (url.pathname === '/api/venmo/business/payment' && req.method === 'POST') {
        return handleVenmoPayment(req);
      }
      
      if (url.pathname === '/api/business/create' && req.method === 'POST') {
        return handleBusinessCreate(req);
      }
      
      if (url.pathname.startsWith('/api/business/') && req.method === 'POST') {
        const pathParts = url.pathname.split('/');
        if (pathParts[4] === 'verify') {
          const businessId = pathParts[3];
          if (businessId) {
            return handleBusinessVerify(businessId, req);
          }
        }
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });

  console.log(`🚀 Cash App Priority API Server running on port ${PORT}`);
  console.log('📊 Available endpoints:');
  console.log('  POST /api/cashapp/qr - Generate Cash App QR code');
  console.log('  POST /api/cashapp/sessions - Create Cash App payment session');
  console.log('  GET  /api/cashapp/sessions/:id - Verify Cash App payment');
  console.log('  POST /api/family/sponsor - Create family sponsorship');
  console.log('  GET  /api/family/sponsor/:id - Get sponsorship status');
  console.log('  POST /api/family/sponsor/:id/approve - Approve sponsorship');
  console.log('  POST /api/venmo/business/payment - Create Venmo payment');
  console.log('  POST /api/business/create - Create business account');
  console.log('  POST /api/business/:id/verify - Verify business account');
}

// Cash App QR Code Generation
async function handleCashAppQR(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    // Simulate QR code generation
    const sessionId = `cashapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const qrCodeUrl = `https://api.cash.app/qr/${sessionId}`;
    
    paymentSessions.set(sessionId, {
      id: sessionId,
      amount: body.amount,
      currency: body.currency,
      metadata: body.metadata,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    
    return Response.json({
      qrCodeUrl,
      sessionId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    return Response.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}

// Cash App Payment Session Creation
async function handleCashAppSession(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const sessionId = `cashapp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const redirectUrl = `https://cash.app/pay/${sessionId}`;
    
    paymentSessions.set(sessionId, {
      id: sessionId,
      amount: body.amount,
      currency: body.currency,
      redirectUrl: body.redirectUrl,
      cancelUrl: body.cancelUrl,
      metadata: body.metadata,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    
    return Response.json({
      redirectUrl,
      sessionId,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// Cash App Payment Verification
async function handleCashAppVerify(sessionId: string): Promise<Response> {
  try {
    const session = paymentSessions.get(sessionId);
    
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Simulate payment status check
    // In production, this would call Cash App's API
    const status = session.status; // 'pending' | 'completed' | 'failed' | 'cancelled'
    
    return Response.json({
      status,
      amount: session.amount,
      transactionId: status === 'completed' ? `txn_${Date.now()}` : undefined,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}

// Family Sponsorship Creation
async function handleFamilySponsorship(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const sponsorshipId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sponsorship = {
      id: sponsorshipId,
      teenId: body.teenId,
      guardianEmail: body.guardianEmail,
      teamSeats: body.teamSeats,
      spendLimit: body.spendLimit,
      allowanceEnabled: body.allowanceEnabled,
      status: 'pending_guardian_approval',
      source: body.source,
      createdAt: new Date().toISOString(),
      expiresAt: body.expiresAt,
    };
    
    sponsorships.set(sponsorshipId, sponsorship);
    
    // Simulate sending approval email to guardian
    console.log(`📧 Approval email sent to ${body.guardianEmail} for sponsorship ${sponsorshipId}`);
    
    return Response.json({
      sponsorshipId,
      status: sponsorship.status,
      approvalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/family/approve/${sponsorshipId}`,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to create sponsorship' }, { status: 500 });
  }
}

// Family Sponsorship Status
async function handleFamilyStatus(sponsorshipId: string): Promise<Response> {
  try {
    const sponsorship = sponsorships.get(sponsorshipId);
    
    if (!sponsorship) {
      return Response.json({ error: 'Sponsorship not found' }, { status: 404 });
    }
    
    return Response.json({
      status: sponsorship.status,
      teenId: sponsorship.teenId,
      guardianEmail: sponsorship.guardianEmail,
      teamSeats: sponsorship.teamSeats,
      spendLimit: sponsorship.spendLimit,
      createdAt: sponsorship.createdAt,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to get sponsorship status' }, { status: 500 });
  }
}

// Family Sponsorship Approval
async function handleFamilyApproval(sponsorshipId: string): Promise<Response> {
  try {
    const sponsorship = sponsorships.get(sponsorshipId);
    
    if (!sponsorship) {
      return Response.json({ error: 'Sponsorship not found' }, { status: 404 });
    }
    
    // Update sponsorship status
    (sponsorship as any).status = 'active';
    (sponsorship as any).approvedAt = new Date().toISOString();
    
    sponsorships.set(sponsorshipId, sponsorship);
    
    console.log(`✅ Family sponsorship ${sponsorshipId} approved by guardian`);
    
    return Response.json({
      status: 'active',
      message: 'Sponsorship approved successfully',
    });
  } catch (error) {
    return Response.json({ error: 'Failed to approve sponsorship' }, { status: 500 });
  }
}

// Venmo Business Payment Creation
async function handleVenmoPayment(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const requestId = `venmo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentUrl = `https://venmo.com/business/payment/${requestId}`;
    
    // Venmo fees: 1.9% + $0.10
    const fee = body.fee || (body.amount * 0.019 + 0.10);
    
    return Response.json({
      paymentUrl,
      requestId,
      fee,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to create Venmo payment' }, { status: 500 });
  }
}

// Business Account Creation
async function handleBusinessCreate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const businessAccount = {
      id: businessId,
      userId: body.userId,
      businessInfo: body.businessInfo,
      source: body.source,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      limits: {
        dailyLimit: 1000, // $1,000 daily limit for unverified
        monthlyLimit: 10000, // $10,000 monthly limit for unverified
      },
    };
    
    businessAccounts.set(businessId, businessAccount);
    
    // Simulate instant verification for demo
    // In production, this would involve actual verification processes
    if (body.businessInfo.ssnLast4 && body.businessInfo.businessName) {
      (businessAccount as any).status = 'verified';
      (businessAccount as any).limits = {
        dailyLimit: 50000, // $50,000 daily limit for verified
        monthlyLimit: 500000, // $500,000 monthly limit for verified
      };
      (businessAccount as any).verifiedAt = new Date().toISOString();
    }
    
    return Response.json({
      businessId,
      status: businessAccount.status,
      verificationUrl: businessAccount.status === 'pending_verification' 
        ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/business/verify/${businessId}`
        : undefined,
      limits: businessAccount.limits,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to create business account' }, { status: 500 });
  }
}

// Business Account Verification
async function handleBusinessVerify(businessId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const business = businessAccounts.get(businessId);
    
    if (!business) {
      return Response.json({ error: 'Business account not found' }, { status: 404 });
    }
    
    // Simulate verification process
    if (body.documents || body.additionalInfo) {
      (business as any).status = 'verified';
      (business as any).verifiedAt = new Date().toISOString();
      (business as any).limits = {
        dailyLimit: 50000,
        monthlyLimit: 500000,
      };
      
      businessAccounts.set(businessId, business);
    }
    
    return Response.json({
      status: business.status,
      limits: business.limits,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to verify business account' }, { status: 500 });
  }
}
