#!/usr/bin/env bun
// Suspension Risk API Server - ML Risk Scoring Endpoints
// Part of AI SUSPENSION RISK PREDICTION detonation

import { serve } from "bun";
import { feature } from 'bun:bundle';
import { riskEngine, riskMonitoring } from './suspension-risk-engine';

// In-memory storage for demo (replace with actual database in production)
const guardianRiskProfiles = new Map<string, any>();
const riskAlerts = new Map<string, any[]>();
const preventiveActions = new Map<string, any[]>();

// Suspension Risk API Server
if (feature("PREMIUM")) {
  const PORT = process.env.SUSPENSION_RISK_PORT ? parseInt(process.env.SUSPENSION_RISK_PORT) : 3225;
  const HOST = process.env.HOST || 'localhost';

  const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch(req: Request) {
      const url = new URL(req.url);
      
      // Risk Prediction Endpoints
      if (url.pathname.startsWith('/api/family/risk/') && req.method === 'GET') {
        const guardianId = url.pathname.split('/')[4];
        if (guardianId) {
          return handleGetGuardianRisk(guardianId);
        }
      }
      
      if (url.pathname === '/api/family/risk/predict' && req.method === 'POST') {
        return handlePredictRisk(req);
      }
      
      if (url.pathname === '/api/family/risk/batch' && req.method === 'POST') {
        return handleBatchRiskPrediction(req);
      }
      
      // Preventive Action Endpoints
      if (url.pathname === '/api/family/preventive' && req.method === 'POST') {
        return handleTriggerPreventiveAction(req);
      }
      
      if (url.pathname.startsWith('/api/family/preventive/') && req.method === 'GET') {
        const guardianId = url.pathname.split('/')[4];
        if (guardianId) {
          return handleGetPreventiveActions(guardianId);
        }
      }
      
      // Monitoring Endpoints
      if (url.pathname === '/api/family/monitoring/start' && req.method === 'POST') {
        return handleStartMonitoring(req);
      }
      
      if (url.pathname === '/api/family/monitoring/stop' && req.method === 'POST') {
        return handleStopMonitoring(req);
      }
      
      // Alerts Endpoints
      if (url.pathname.startsWith('/api/family/alerts/') && req.method === 'GET') {
        const guardianId = url.pathname.split('/')[4];
        if (guardianId) {
          return handleGetRiskAlerts(guardianId, req);
        }
      }
      
      // Analytics Endpoints
      if (url.pathname === '/api/family/analytics/risk-trends' && req.method === 'GET') {
        return handleGetRiskTrends();
      }
      
      if (url.pathname === '/api/family/analytics/model-performance' && req.method === 'GET') {
        return handleGetModelPerformance();
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });

  console.log(`🧠 Suspension Risk API Server running on port ${PORT}`);
  console.log('📊 Available endpoints:');
  console.log('  GET  /api/family/risk/:id - Get guardian risk profile');
  console.log('  POST /api/family/risk/predict - Predict guardian risk');
  console.log('  POST /api/family/risk/batch - Batch risk prediction');
  console.log('  POST /api/family/preventive - Trigger preventive action');
  console.log('  GET  /api/family/preventive/:id - Get preventive actions');
  console.log('  POST /api/family/monitoring/start - Start monitoring');
  console.log('  POST /api/family/monitoring/stop - Stop monitoring');
  console.log('  GET  /api/family/alerts/:id - Get risk alerts');
  console.log('  GET  /api/family/analytics/risk-trends - Get risk trends');
  console.log('  GET  /api/family/analytics/model-performance - Get model performance');
}

// Get Guardian Risk Profile
async function handleGetGuardianRisk(guardianId: string): Promise<Response> {
  try {
    let riskProfile = guardianRiskProfiles.get(guardianId);
    
    if (!riskProfile) {
      // Generate real-time risk prediction
      riskProfile = await riskEngine.predictGuardianRisk(guardianId);
      guardianRiskProfiles.set(guardianId, riskProfile);
      
      // Add to monitoring
      riskMonitoring.addGuardianToMonitoring(guardianId);
    }
    
    return Response.json({
      success: true,
      riskProfile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get guardian risk profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Predict Risk for Guardian
async function handlePredictRisk(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { guardianId, forceRefresh = false } = body;
    
    if (!guardianId) {
      return Response.json({ error: 'Guardian ID is required' }, { status: 400 });
    }
    
    let riskProfile;
    if (forceRefresh || !guardianRiskProfiles.has(guardianId)) {
      riskProfile = await riskEngine.predictGuardianRisk(guardianId);
      guardianRiskProfiles.set(guardianId, riskProfile);
    } else {
      riskProfile = guardianRiskProfiles.get(guardianId);
    }
    
    return Response.json({
      success: true,
      riskProfile,
      predictions: riskProfile.predictions,
      recommendations: riskProfile.preventiveActions.recommended
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to predict risk',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Batch Risk Prediction
async function handleBatchRiskPrediction(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { guardianIds } = body;
    
    if (!Array.isArray(guardianIds) || guardianIds.length === 0) {
      return Response.json({ error: 'Guardian IDs array is required' }, { status: 400 });
    }
    
    const predictions = await Promise.allSettled(
      guardianIds.map(async (guardianId: string) => {
        const riskProfile = await riskEngine.predictGuardianRisk(guardianId);
        return { guardianId, riskProfile };
      })
    );
    
    const results = predictions.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          guardianId: guardianIds[index],
          error: result.reason instanceof Error ? result.reason.message : 'Prediction failed'
        };
      }
    });
    
    return Response.json({
      success: true,
      predictions: results,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to process batch prediction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Trigger Preventive Action
async function handleTriggerPreventiveAction(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { guardianId, action, priority = 'medium' } = body;
    
    if (!guardianId || !action) {
      return Response.json({ error: 'Guardian ID and action are required' }, { status: 400 });
    }
    
    // Validate action
    const validActions = ['secondary_sponsor', 'buffer_seats', 'admin_review', 'temporary_pause'];
    if (!validActions.includes(action)) {
      return Response.json({ error: 'Invalid preventive action' }, { status: 400 });
    }
    
    // Get current risk profile
    const riskProfile = await riskEngine.predictGuardianRisk(guardianId);
    
    // Execute preventive action
    const actionResult = {
      guardianId,
      action,
      priority,
      triggeredAt: new Date().toISOString(),
      riskScore: riskProfile.riskScore,
      riskLevel: riskProfile.riskLevel,
      status: 'triggered'
    };
    
    // Store action
    if (!preventiveActions.has(guardianId)) {
      preventiveActions.set(guardianId, []);
    }
    preventiveActions.get(guardianId)!.push(actionResult);
    
    // Log action
    console.log(`🛡️ Preventive action triggered: ${action} for guardian ${guardianId} (risk: ${(riskProfile.riskScore * 100).toFixed(1)}%)`);
    
    return Response.json({
      success: true,
      actionResult,
      message: `Preventive action ${action} triggered successfully`
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to trigger preventive action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Preventive Actions
async function handleGetPreventiveActions(guardianId: string): Promise<Response> {
  try {
    const actions = preventiveActions.get(guardianId) || [];
    
    return Response.json({
      success: true,
      guardianId,
      actions,
      totalActions: actions.length
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get preventive actions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Start Monitoring
async function handleStartMonitoring(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { guardianIds } = body;
    
    if (!Array.isArray(guardianIds)) {
      return Response.json({ error: 'Guardian IDs array is required' }, { status: 400 });
    }
    
    // Start monitoring service if not already running
    await riskMonitoring.startMonitoring();
    
    // Add guardians to monitoring
    guardianIds.forEach(guardianId => {
      riskMonitoring.addGuardianToMonitoring(guardianId);
    });
    
    return Response.json({
      success: true,
      monitoringActive: true,
      guardiansUnderMonitoring: guardianIds,
      startedAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to start monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Stop Monitoring
async function handleStopMonitoring(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { guardianIds } = body;
    
    if (Array.isArray(guardianIds)) {
      // Remove specific guardians from monitoring
      guardianIds.forEach(guardianId => {
        riskMonitoring.removeGuardianFromMonitoring(guardianId);
      });
    } else {
      // Stop all monitoring
      riskMonitoring.stopMonitoring();
    }
    
    return Response.json({
      success: true,
      monitoringActive: !Array.isArray(guardianIds),
      stoppedAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to stop monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Risk Alerts
async function handleGetRiskAlerts(guardianId: string, req: Request): Promise<Response> {
  try {
    const alerts = riskAlerts.get(guardianId) || [];
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '50');
    
    return Response.json({
      success: true,
      guardianId,
      alerts: alerts.slice(0, limit),
      totalAlerts: alerts.length
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get risk alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Risk Trends
async function handleGetRiskTrends(): Promise<Response> {
  try {
    // Mock risk trends data
    const trends = {
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avgRiskScore: 0.3 + Math.random() * 0.4,
        highRiskCount: Math.floor(Math.random() * 10),
        preventiveActionsTriggered: Math.floor(Math.random() * 20)
      })),
      weekly: Array.from({ length: 12 }, (_, i) => ({
        week: `W${i + 1}`,
        avgRiskScore: 0.25 + Math.random() * 0.45,
        criticalCases: Math.floor(Math.random() * 5),
        cascadesPrevented: Math.floor(Math.random() * 8)
      })),
      monthly: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
        avgRiskScore: 0.2 + Math.random() * 0.5,
        totalGuardians: 1000 + Math.floor(Math.random() * 500),
        retentionRate: 0.85 + Math.random() * 0.1
      }))
    };
    
    return Response.json({
      success: true,
      trends,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get risk trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Model Performance
async function handleGetModelPerformance(): Promise<Response> {
  try {
    // Mock model performance metrics
    const performance = {
      accuracy: {
        overall: 0.94,
        lowRisk: 0.96,
        mediumRisk: 0.92,
        highRisk: 0.89,
        critical: 0.91
      },
      precision: {
        overall: 0.91,
        lowRisk: 0.95,
        mediumRisk: 0.88,
        highRisk: 0.85,
        critical: 0.87
      },
      recall: {
        overall: 0.89,
        lowRisk: 0.93,
        mediumRisk: 0.86,
        highRisk: 0.82,
        critical: 0.84
      },
      latency: {
        average: 45, // milliseconds
        p95: 78,
        p99: 120
      },
      predictions: {
        total: 125000,
        correct: 117500,
        falsePositives: 6250,
        falseNegatives: 1250
      },
      impact: {
        cascadesPrevented: 847,
        guardiansProtected: 1250,
        retentionImprovement: 0.42,
        revenueProtected: 2847500 // dollars
      }
    };
    
    return Response.json({
      success: true,
      performance,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get model performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
