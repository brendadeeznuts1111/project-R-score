#!/usr/bin/env bun
// 🛡️ Family Controls API Server
// Guardian oversight, spend limits, approval workflows, COPPA compliance

import { serve } from "bun";
import { feature } from 'bun:bundle';

// In-memory storage for demo (replace with actual database in production)
const teenProfiles = new Map<string, any>();
const spendLimits = new Map<string, any>();
const activityLogs = new Map<string, any[]>();
const approvalRequests = new Map<string, any>();
const coppaConsents = new Map<string, any>();
const autoAllowances = new Map<string, any>();
const familyNotifications = new Map<string, any[]>();

// Family Controls API Server
if (feature("PREMIUM")) {
  const PORT = process.env.FAMILY_CONTROLS_PORT ? parseInt(process.env.FAMILY_CONTROLS_PORT) : 3224;
  const HOST = process.env.HOST || 'localhost';

  const server = serve({
    port: PORT,
    hostname: HOST,
    fetch(req: Request) {
      const url = new URL(req.url);
      
      // Family Controls Endpoints
      if (url.pathname === '/api/family/limits' && req.method === 'POST') {
        return handleUpdateSpendLimits(req);
      }
      
      if (url.pathname.startsWith('/api/family/teen/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetTeenProfile(teenId);
        }
      }
      
      if (url.pathname.startsWith('/api/family/logs/') && req.method === 'GET') {
        const pathParts = url.pathname.split('/');
        const teenId = pathParts[pathParts.length - 1];
        const limit = parseInt(url.searchParams.get('limit') || '50');
        if (teenId) {
          return handleGetActivityLogs(teenId, limit);
        }
      }
      
      if (url.pathname === '/api/family/approvals/pending' && req.method === 'GET') {
        const guardianEmail = url.searchParams.get('guardian');
        if (guardianEmail) {
          return handleGetPendingApprovals(guardianEmail);
        }
      }
      
      if (url.pathname.startsWith('/api/family/approvals/') && req.method === 'POST') {
        const pathParts = url.pathname.split('/');
        const requestId = pathParts[pathParts.length - 1];
        if (requestId) {
          return handleProcessApproval(requestId, req);
        }
      }
      
      if (url.pathname === '/api/family/allowance/setup' && req.method === 'POST') {
        return handleSetupAutoAllowance(req);
      }
      
      if (url.pathname.startsWith('/api/family/access/') && req.method === 'POST') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleToggleTeenAccess(teenId, req);
        }
      }
      
      // Approval Workflow Endpoints
      if (url.pathname === '/api/family/approvals/create' && req.method === 'POST') {
        return handleCreateApprovalRequest(req);
      }
      
      if (url.pathname.startsWith('/api/family/approvals/') && req.method === 'GET') {
        const requestId = url.pathname.split('/')[4];
        if (requestId) {
          return handleGetApprovalRequest(requestId);
        }
      }
      
      if (url.pathname.startsWith('/api/family/approvals/') && url.pathname.endsWith('/process') && req.method === 'POST') {
        const pathParts = url.pathname.split('/');
        const requestId = pathParts[pathParts.length - 2];
        if (requestId) {
          return handleProcessApprovalWithCompliance(requestId, req);
        }
      }
      
      // COPPA Compliance Endpoints
      if (url.pathname === '/api/family/coppa/consent/generate' && req.method === 'POST') {
        return handleGenerateCOPPAConsent(req);
      }
      
      if (url.pathname.startsWith('/api/family/coppa/compliance/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[5];
        if (teenId) {
          return handleCheckCOPPACompliance(teenId);
        }
      }
      
      // Age Verification Endpoints
      if (url.pathname === '/api/family/age-verification/submit' && req.method === 'POST') {
        return handleSubmitAgeVerification(req);
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });

  console.log(`🛡️ Family Controls API Server running on port ${PORT}`);
  console.log('📊 Available endpoints:');
  console.log('  POST /api/family/limits - Update spend limits');
  console.log('  GET  /api/family/teen/:id - Get teen profile');
  console.log('  GET  /api/family/logs/:id - Get activity logs');
  console.log('  GET  /api/family/approvals/pending - Get pending approvals');
  console.log('  POST /api/family/approvals/:id - Process approval');
  console.log('  POST /api/family/allowance/setup - Setup auto-allowance');
  console.log('  POST /api/family/access/:id - Toggle teen access');
  console.log('  POST /api/family/approvals/create - Create approval request');
  console.log('  POST /api/family/coppa/consent/generate - Generate COPPA consent');
  console.log('  POST /api/family/coppa/consent/submit - Submit COPPA consent');
  console.log('  POST /api/family/age-verification/submit - Submit age verification');
}

// Update Spend Limits
async function handleUpdateSpendLimits(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const previousLimits = spendLimits.get(body.teenId) || {
      daily: 20,
      weekly: 100,
      monthly: 300,
      perTransaction: 50
    };
    
    const newLimits = {
      daily: body.limits.daily,
      weekly: body.limits.weekly,
      monthly: body.limits.monthly,
      perTransaction: body.limits.perTransaction,
      updatedAt: new Date().toISOString(),
      updatedBy: 'guardian@example.com'
    };
    
    spendLimits.set(body.teenId, newLimits);
    
    // Log the change
    logActivity(body.teenId, 'limits_updated', `Spend limits updated: $${newLimits.daily}/day, $${newLimits.weekly}/week, $${newLimits.monthly}/month`);
    
    return Response.json({
      success: true,
      previousLimits,
      newLimits
    });
  } catch (error) {
    return Response.json({ error: 'Failed to update spend limits' }, { status: 500 });
  }
}

// Get Teen Profile
async function handleGetTeenProfile(teenId: string): Promise<Response> {
  try {
    let profile = teenProfiles.get(teenId);
    
    if (!profile) {
      // Create mock profile
      profile = {
        id: teenId,
        email: `${teenId}@example.com`,
        age: 15,
        name: 'Teen User',
        teamSeats: 2,
        currentSpend: 45.50,
        allowanceEnabled: true,
        allowanceAmount: 20,
        allowanceFrequency: 'weekly',
        status: 'active',
        spendLimits: spendLimits.get(teenId) || {
          daily: 20,
          weekly: 100,
          monthly: 300,
          perTransaction: 50
        },
        createdAt: new Date().toISOString()
      };
      teenProfiles.set(teenId, profile);
    }
    
    return Response.json(profile);
  } catch (error) {
    return Response.json({ error: 'Failed to get teen profile' }, { status: 500 });
  }
}

// Get Activity Logs
async function handleGetActivityLogs(teenId: string, limit: number): Promise<Response> {
  try {
    let logs = activityLogs.get(teenId) || [];
    
    if (logs.length === 0) {
      // Generate mock activity logs
      logs = [
        {
          id: 'log_001',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          action: 'Dashboard Login',
          amount: null,
          status: 'completed',
          guardianNotified: false
        },
        {
          id: 'log_002',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          action: 'Team Seat Purchase',
          amount: 10.00,
          status: 'completed',
          guardianNotified: true
        },
        {
          id: 'log_003',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          action: 'Feature Upgrade Request',
          amount: 5.00,
          status: 'pending',
          guardianNotified: true
        }
      ];
      activityLogs.set(teenId, logs);
    }
    
    return Response.json(logs.slice(0, limit));
  } catch (error) {
    return Response.json({ error: 'Failed to get activity logs' }, { status: 500 });
  }
}

// Get Pending Approvals
async function handleGetPendingApprovals(guardianEmail: string): Promise<Response> {
  try {
    const pendingApprovals = Array.from(approvalRequests.values())
      .filter(req => req.guardianEmail === guardianEmail && req.status === 'pending');
    
    if (pendingApprovals.length === 0) {
      // Generate mock pending approvals
      const mockApprovals = [
        {
          id: 'approval_001',
          teenId: 'teen-001',
          teenName: 'Alex',
          teenAge: 15,
          guardianEmail: guardianEmail,
          requestType: 'team_seat',
          requestDetails: {
            description: 'Pro Dashboard Access',
            amount: 10,
            duration: 'monthly',
            justification: 'School project collaboration'
          },
          coppaRequired: true,
          riskLevel: 'low',
          autoApprove: false,
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        },
        {
          id: 'approval_002',
          teenId: 'teen-002',
          teenName: 'Jordan',
          teenAge: 16,
          guardianEmail: guardianEmail,
          requestType: 'spend_increase',
          requestDetails: {
            description: 'Weekly spend limit increase',
            amount: 50,
            justification: 'Additional team tools needed'
          },
          coppaRequired: false,
          riskLevel: 'medium',
          autoApprove: false,
          requestedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      ];
      
      mockApprovals.forEach(approval => {
        approvalRequests.set(approval.id, approval);
      });
      
      return Response.json(mockApprovals);
    }
    
    return Response.json(pendingApprovals);
  } catch (error) {
    return Response.json({ error: 'Failed to get pending approvals' }, { status: 500 });
  }
}

// Process Approval
async function handleProcessApproval(requestId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const approval = approvalRequests.get(requestId);
    
    if (!approval) {
      return Response.json({ error: 'Approval request not found' }, { status: 404 });
    }
    
    approval.status = body.action === 'approve' ? 'approved' : 'declined';
    approval.reviewedAt = new Date().toISOString();
    approval.reviewedBy = 'guardian@example.com';
    approval.reviewNotes = body.notes || '';
    
    if (body.limits) {
      spendLimits.set(approval.teenId, body.limits);
    }
    
    approvalRequests.set(requestId, approval);
    
    // Log the approval
    logActivity(approval.teenId, 'approval_processed', `${approval.requestType} ${approval.status}: ${approval.requestDetails.description}`);
    
    return Response.json({
      success: true,
      message: `Request ${approval.status} successfully`
    });
  } catch (error) {
    return Response.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}

// Setup Auto-Allowance
async function handleSetupAutoAllowance(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const allowanceId = `allowance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nextTransfer = new Date();
    
    // Calculate next transfer date based on frequency
    switch (body.frequency) {
      case 'daily':
        nextTransfer.setDate(nextTransfer.getDate() + 1);
        break;
      case 'weekly':
        nextTransfer.setDate(nextTransfer.getDate() + 7);
        break;
      case 'monthly':
        nextTransfer.setMonth(nextTransfer.getMonth() + 1);
        break;
    }
    
    const allowance = {
      id: allowanceId,
      teenId: body.teenId,
      amount: body.amount,
      frequency: body.frequency,
      nextTransfer: nextTransfer.toISOString(),
      active: true,
      createdAt: new Date().toISOString(),
      paymentMethod: 'cash_app'
    };
    
    autoAllowances.set(body.teenId, allowance);
    
    // Update teen profile
    const profile = teenProfiles.get(body.teenId);
    if (profile) {
      profile.allowanceEnabled = true;
      profile.allowanceAmount = body.amount;
      profile.allowanceFrequency = body.frequency;
      teenProfiles.set(body.teenId, profile);
    }
    
    // Log the setup
    logActivity(body.teenId, 'allowance_setup', `Auto-allowance setup: $${body.amount}/${body.frequency}`);
    
    return Response.json({
      success: true,
      allowanceId,
      nextTransfer: nextTransfer.toISOString()
    });
  } catch (error) {
    return Response.json({ error: 'Failed to setup auto-allowance' }, { status: 500 });
  }
}

// Toggle Teen Access
async function handleToggleTeenAccess(teenId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const profile = teenProfiles.get(teenId);
    
    if (!profile) {
      return Response.json({ error: 'Teen profile not found' }, { status: 404 });
    }
    
    profile.status = body.paused ? 'paused' : 'active';
    teenProfiles.set(teenId, profile);
    
    // Log the change
    logActivity(teenId, 'access_toggled', `Access ${body.paused ? 'paused' : 'resumed'} by guardian`);
    
    return Response.json({
      success: true,
      status: profile.status
    });
  } catch (error) {
    return Response.json({ error: 'Failed to toggle teen access' }, { status: 500 });
  }
}

// Create Approval Request
async function handleCreateApprovalRequest(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const requestId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const approval = {
      id: requestId,
      ...body,
      coppaRequired: body.teenAge < 13,
      riskLevel: body.requestType === 'team_seat' ? 'low' : 'medium',
      autoApprove: body.teenAge >= 18 && body.riskLevel === 'low'
    };
    
    approvalRequests.set(requestId, approval);
    
    // Log the request
    logActivity(body.teenId, 'approval_requested', `${body.requestType}: ${body.requestDetails.description}`);
    
    return Response.json({
      requestId,
      coppaConsentRequired: approval.coppaRequired,
      consentFormUrl: approval.coppaRequired ? `/consent/${requestId}` : undefined,
      autoApproved: approval.autoApprove
    });
  } catch (error) {
    return Response.json({ error: 'Failed to create approval request' }, { status: 500 });
  }
}

// Get Approval Request
async function handleGetApprovalRequest(requestId: string): Promise<Response> {
  try {
    const approval = approvalRequests.get(requestId);
    
    if (!approval) {
      return Response.json({ error: 'Approval request not found' }, { status: 404 });
    }
    
    return Response.json(approval);
  } catch (error) {
    return Response.json({ error: 'Failed to get approval request' }, { status: 500 });
  }
}

// Process Approval with Compliance
async function handleProcessApprovalWithCompliance(requestId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const approval = approvalRequests.get(requestId);
    
    if (!approval) {
      return Response.json({ error: 'Approval request not found' }, { status: 404 });
    }
    
    // Check COPPA compliance
    const coppaCompliant = !approval.coppaRequired || coppaConsents.has(approval.teenId);
    
    if (!coppaCompliant && body.action === 'approve') {
      return Response.json({ 
        error: 'COPPA consent required before approval',
        complianceChecked: true,
        coppaCompliant: false 
      }, { status: 400 });
    }
    
    approval.status = body.action === 'approve' ? 'approved' : 'declined';
    approval.reviewedAt = new Date().toISOString();
    approval.reviewedBy = 'guardian@example.com';
    
    if (body.options?.customLimits) {
      spendLimits.set(approval.teenId, body.options.customLimits);
    }
    
    approvalRequests.set(requestId, approval);
    
    return Response.json({
      success: true,
      complianceChecked: true,
      coppaCompliant: true,
      approvalId: requestId,
      message: `Approval ${approval.status} with compliance verification`
    });
  } catch (error) {
    return Response.json({ error: 'Failed to process approval with compliance' }, { status: 500 });
  }
}

// Generate COPPA Consent
async function handleGenerateCOPPAConsent(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    
    const consentFormId = `coppa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const consentForm = {
      id: consentFormId,
      teenId: body.teenId,
      guardianEmail: body.guardianEmail,
      guardianName: 'Parent Guardian',
      teenName: 'Teen User',
      teenAge: 12,
      consentType: body.consentType,
      generatedAt: body.generatedAt,
      expiresAt: body.expiresAt,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Demo)',
      digitalSignature: `demo_signature_${Date.now()}`
    };
    
    coppaConsents.set(consentFormId, consentForm);
    
    return Response.json({
      consentFormId,
      formUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/consent/${consentFormId}`,
      expiresAt: body.expiresAt
    });
  } catch (error) {
    return Response.json({ error: 'Failed to generate COPPA consent form' }, { status: 500 });
  }
}

// Check COPPA Compliance
async function handleCheckCOPPACompliance(teenId: string): Promise<Response> {
  try {
    const profile = teenProfiles.get(teenId);
    const consent = Array.from(coppaConsents.values()).find(c => c.teenId === teenId);
    
    const compliant = profile?.age >= 13 || (consent && new Date(consent.expiresAt) > new Date());
    const consentRequired = profile?.age < 13;
    const consentValid = consent && new Date(consent.expiresAt) > new Date();
    const ageVerified = profile?.ageVerified || false;
    
    const restrictions = [];
    if (!compliant) restrictions.push('limited_features');
    if (!consentValid) restrictions.push('consent_expired');
    if (!ageVerified) restrictions.push('age_verification_required');
    
    const nextAction = !compliant ? 'require_consent' : !ageVerified ? 'verify_age' : 'fully_compliant';
    
    return Response.json({
      compliant,
      consentRequired,
      consentValid,
      ageVerified,
      restrictions,
      nextAction
    });
  } catch (error) {
    return Response.json({ error: 'Failed to check COPPA compliance' }, { status: 500 });
  }
}

// Submit Age Verification
async function handleSubmitAgeVerification(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    const teenId = formData.get('teenId') as string;
    const documentType = formData.get('documentType') as string;
    const documentFile = formData.get('documentFile') as File;
    
    const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock AI processing
    const aiConfidence = 92 + Math.random() * 8; // 92-100%
    const manualReviewRequired = aiConfidence < 95;
    
    const verification = {
      id: verificationId,
      teenId,
      documentType,
      documentUrl: `/documents/${verificationId}`,
      verificationStatus: manualReviewRequired ? 'pending' : 'verified',
      verifiedAt: manualReviewRequired ? null : new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      aiConfidence,
      manualReviewRequired
    };
    
    // Log the verification
    logActivity(teenId, 'age_verification_submitted', `Age verification submitted: ${documentType}`);
    
    return Response.json({
      verificationId,
      estimatedProcessingTime: manualReviewRequired ? '24-48 hours' : '5-10 minutes',
      aiConfidence,
      manualReviewRequired
    });
  } catch (error) {
    return Response.json({ error: 'Failed to submit age verification' }, { status: 500 });
  }
}

// Helper function to log activity
function logActivity(teenId: string, action: string, description: string) {
  const logs = activityLogs.get(teenId) || [];
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    description,
    amount: null,
    status: 'completed',
    guardianNotified: action.includes('approval') || action.includes('spend')
  };
  
  logs.unshift(newLog);
  activityLogs.set(teenId, logs.slice(0, 100)); // Keep last 100 logs
}
