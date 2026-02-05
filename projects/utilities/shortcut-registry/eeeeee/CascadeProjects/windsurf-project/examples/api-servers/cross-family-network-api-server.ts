#!/usr/bin/env bun
// 🕸️ Cross-Family Guardian Networks API Server
// Graph-based sponsorship webs, distributed failover, collective oversight

import { serve } from "bun";
import { feature } from 'bun:bundle';
import { guardianNetwork } from './guardian-network-engine';

// In-memory storage for demo (replace with actual database in production)
const teenNetworks = new Map<string, any>();
const networkSessions = new Map<string, any>();

// Cross-Family Guardian Networks API Server
if (feature("PREMIUM")) {
  const PORT = process.env.CROSS_FAMILY_PORT ? parseInt(process.env.CROSS_FAMILY_PORT) : 3226;
  const HOST = process.env.HOST || 'localhost';

  const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch(req: Request) {
      const url = new URL(req.url);
      
      // Network Management Endpoints
      if (url.pathname.startsWith('/api/family/network/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetNetwork(teenId);
        }
      }
      
      if (url.pathname === '/api/family/network/initialize' && req.method === 'POST') {
        return handleInitializeNetwork(req);
      }
      
      if (url.pathname === '/api/family/cross-link' && req.method === 'POST') {
        return handleAddCrossFamilyLink(req);
      }
      
      if (url.pathname === '/api/family/failover' && req.method === 'POST') {
        return handleActivateFailover(req);
      }
      
      // Dashboard and Visualization Endpoints
      if (url.pathname.startsWith('/api/family/dashboard/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetSharedDashboard(teenId);
        }
      }
      
      if (url.pathname.startsWith('/api/family/analytics/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetNetworkAnalytics(teenId);
        }
      }
      
      if (url.pathname.startsWith('/api/family/visualization/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetNetworkVisualization(teenId);
        }
      }
      
      // Guardian Management Endpoints
      if (url.pathname === '/api/family/guardians' && req.method === 'POST') {
        return handleAddGuardian(req);
      }
      
      if (url.pathname.startsWith('/api/family/guardians/') && req.method === 'PUT') {
        const guardianId = url.pathname.split('/')[4];
        if (guardianId) {
          return handleUpdateGuardian(guardianId, req);
        }
      }
      
      if (url.pathname.startsWith('/api/family/guardians/') && req.method === 'DELETE') {
        const guardianId = url.pathname.split('/')[4];
        if (guardianId) {
          return handleRemoveGuardian(guardianId, req);
        }
      }
      
      // Network Settings Endpoints
      if (url.pathname.startsWith('/api/family/settings/') && req.method === 'PUT') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleUpdateNetworkSettings(teenId, req);
        }
      }
      
      // Activity and Alerts Endpoints
      if (url.pathname.startsWith('/api/family/activity/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetNetworkActivity(teenId, req);
        }
      }
      
      if (url.pathname.startsWith('/api/family/alerts/') && req.method === 'GET') {
        const teenId = url.pathname.split('/')[4];
        if (teenId) {
          return handleGetNetworkAlerts(teenId, req);
        }
      }
      
      // Batch Operations Endpoints
      if (url.pathname === '/api/family/batch/links' && req.method === 'POST') {
        return handleBatchAddLinks(req);
      }
      
      if (url.pathname === '/api/family/broadcast' && req.method === 'POST') {
        return handleBroadcastNetworkAlert(req);
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });

  console.log(`🕸️ Cross-Family Guardian Networks API Server running on port ${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log('  POST /api/family/network/initialize - Initialize teen network');
  console.log('  GET  /api/family/network/:id - Get network data');
  console.log('  POST /api/family/cross-link - Add cross-family link');
  console.log('  POST /api/family/failover - Activate distributed failover');
  console.log('  GET  /api/family/dashboard/:id - Get shared dashboard');
  console.log('  GET  /api/family/analytics/:id - Get network analytics');
  console.log('  GET  /api/family/visualization/:id - Get network visualization');
  console.log('  POST /api/family/guardians - Add guardian');
  console.log('  PUT  /api/family/guardians/:id - Update guardian');
  console.log('  DELETE /api/family/guardians/:id - Remove guardian');
  console.log('  POST /api/family/broadcast - Broadcast network alert');
}

// Initialize Teen Network
async function handleInitializeNetwork(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, primaryGuardian } = body;
    
    if (!teenId || !primaryGuardian) {
      return Response.json({ error: 'Teen ID and primary guardian are required' }, { status: 400 });
    }
    
    const network = await guardianNetwork.initializeTeenNetwork(teenId, primaryGuardian);
    teenNetworks.set(teenId, network);
    
    return Response.json({
      success: true,
      network,
      message: 'Teen network initialized successfully'
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to initialize network',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Network Data
async function handleGetNetwork(teenId: string): Promise<Response> {
  try {
    const networkData = guardianNetwork.getNetworkVisualization(teenId);
    
    return Response.json({
      success: true,
      teenId,
      network: networkData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get network data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add Cross-Family Link
async function handleAddCrossFamilyLink(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, newGuardian, approverId, edgeType } = body;
    
    if (!teenId || !newGuardian || !approverId) {
      return Response.json({ error: 'Teen ID, new guardian, and approver ID are required' }, { status: 400 });
    }
    
    await guardianNetwork.addCrossFamilyLink(teenId, newGuardian, approverId, edgeType);
    
    return Response.json({
      success: true,
      message: 'Cross-family link added successfully',
      teenId,
      newGuardianId: newGuardian.id,
      edgeType
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to add cross-family link',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Activate Distributed Failover
async function handleActivateFailover(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, failedGuardianId } = body;
    
    if (!teenId || !failedGuardianId) {
      return Response.json({ error: 'Teen ID and failed guardian ID are required' }, { status: 400 });
    }
    
    const backupGuardians = await guardianNetwork.activateDistributedFailover(teenId, failedGuardianId);
    
    return Response.json({
      success: true,
      message: 'Distributed failover activated successfully',
      teenId,
      failedGuardianId,
      backupGuardians,
      backupCount: backupGuardians.length
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to activate failover',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Shared Dashboard
async function handleGetSharedDashboard(teenId: string): Promise<Response> {
  try {
    const dashboardData = guardianNetwork.getSharedDashboard(teenId);
    
    return Response.json({
      success: true,
      teenId,
      dashboard: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get shared dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Network Analytics
async function handleGetNetworkAnalytics(teenId: string): Promise<Response> {
  try {
    const analytics = guardianNetwork.getNetworkAnalytics(teenId);
    
    return Response.json({
      success: true,
      teenId,
      analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get network analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Network Visualization
async function handleGetNetworkVisualization(teenId: string): Promise<Response> {
  try {
    const networkData = guardianNetwork.getNetworkVisualization(teenId);
    const graphConfig = {
      nodes: networkData.nodes.map((node: any) => ({
        id: node.id,
        label: node.name,
        color: node.color,
        size: node.role === 'PRIMARY' ? 30 : 20,
        shape: node.role === 'PRIMARY' ? 'star' : 'dot',
        title: `${node.name}\n${node.household}\n${node.role}`
      })),
      edges: networkData.edges.map((edge: any) => ({
        from: edge.from,
        to: edge.to,
        color: edge.householdLink ? '#8b5cf6' : '#3b82f6',
        width: edge.strength * 5,
        dashes: edge.type === 'SHARED_VISIBILITY',
        title: `${edge.type}${edge.householdLink ? ' (Cross-Household)' : ''}`
      }))
    };
    
    return Response.json({
      success: true,
      teenId,
      visualization: graphConfig,
      networkTension: networkData.tension,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get network visualization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add Guardian
async function handleAddGuardian(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, guardianData, approverId } = body;
    
    if (!teenId || !guardianData || !approverId) {
      return Response.json({ error: 'Teen ID, guardian data, and approver ID are required' }, { status: 400 });
    }
    
    await guardianNetwork.addCrossFamilyLink(teenId, guardianData, approverId);
    
    return Response.json({
      success: true,
      message: 'Guardian added successfully',
      teenId,
      guardianId: guardianData.id
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to add guardian',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update Guardian
async function handleUpdateGuardian(guardianId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, updates } = body;
    
    if (!teenId || !updates) {
      return Response.json({ error: 'Teen ID and updates are required' }, { status: 400 });
    }
    
    // Mock update - in production would update actual guardian
    console.log(`Updating guardian ${guardianId} in network ${teenId}:`, updates);
    
    return Response.json({
      success: true,
      message: 'Guardian updated successfully',
      guardianId,
      updates
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to update guardian',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Remove Guardian
async function handleRemoveGuardian(guardianId: string, req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const teenId = url.searchParams.get('teenId');
    
    if (!teenId) {
      return Response.json({ error: 'Teen ID is required' }, { status: 400 });
    }
    
    // Mock removal - in production would remove actual guardian
    console.log(`Removing guardian ${guardianId} from network ${teenId}`);
    
    return Response.json({
      success: true,
      message: 'Guardian removed successfully',
      guardianId,
      teenId
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to remove guardian',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update Network Settings
async function handleUpdateNetworkSettings(teenId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { settings } = body;
    
    if (!settings) {
      return Response.json({ error: 'Settings are required' }, { status: 400 });
    }
    
    // Mock settings update - in production would update actual network settings
    console.log(`Updating network settings for ${teenId}:`, settings);
    
    return Response.json({
      success: true,
      message: 'Network settings updated successfully',
      teenId,
      settings
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to update network settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Network Activity
async function handleGetNetworkActivity(teenId: string, req: Request): Promise<Response> {
  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '50');
    
    // Mock activity data
    const activity = [
      {
        id: '1',
        type: 'GUARDIAN_ADDED',
        guardian: 'Mom',
        message: 'Added Grandma as extended family guardian',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        type: 'FAILOVER_ACTIVATED',
        guardian: 'System',
        message: 'Distributed failover activated for Dad',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '3',
        type: 'SETTINGS_UPDATED',
        guardian: 'Grandma',
        message: 'Updated shared visibility settings',
        timestamp: new Date(Date.now() - 10800000).toISOString()
      }
    ];
    
    return Response.json({
      success: true,
      teenId,
      activity: activity.slice(0, limit),
      totalActivity: activity.length
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get network activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Network Alerts
async function handleGetNetworkAlerts(teenId: string, req: Request): Promise<Response> {
  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '20');
    
    // Mock alerts data
    const alerts = [
      {
        id: '1',
        type: 'NETWORK_RISK',
        message: 'High network tension detected: 85%',
        severity: 'high',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        actionRequired: true
      },
      {
        id: '2',
        type: 'CROSS_LINK_ADDED',
        message: 'New guardian added: Aunt Jane',
        severity: 'medium',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        actionRequired: false
      }
    ];
    
    return Response.json({
      success: true,
      teenId,
      alerts: alerts.slice(0, limit),
      totalAlerts: alerts.length
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get network alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Batch Add Links
async function handleBatchAddLinks(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, links, approverId } = body;
    
    if (!teenId || !Array.isArray(links) || !approverId) {
      return Response.json({ error: 'Teen ID, links array, and approver ID are required' }, { status: 400 });
    }
    
    const results = await Promise.allSettled(
      links.map((link: any) => 
        guardianNetwork.addCrossFamilyLink(teenId, link.guardian, approverId, link.edgeType)
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return Response.json({
      success: true,
      message: `Batch operation completed: ${successful} successful, ${failed} failed`,
      teenId,
      totalLinks: links.length,
      successful,
      failed
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to process batch links',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Broadcast Network Alert
async function handleBroadcastNetworkAlert(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, alertData } = body;
    
    if (!teenId || !alertData) {
      return Response.json({ error: 'Teen ID and alert data are required' }, { status: 400 });
    }
    
    // Mock broadcast - in production would send WebSocket notifications
    console.log(`Broadcasting network alert for ${teenId}:`, alertData);
    
    return Response.json({
      success: true,
      message: 'Network alert broadcasted successfully',
      teenId,
      alertId: `alert-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to broadcast network alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
