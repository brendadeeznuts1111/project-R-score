#!/usr/bin/env bun
// DuoPlus RPA API Server - Complete Batch Control + Template System
// Part of DUOPLUS RPA AUTOMATION + GUARDIAN NETWORK FUSION

import { feature } from 'bun:bundle';
import { DuoPlusRPAEngine } from './duoplus-rpa-engine';
import { guardianNetwork } from './guardian-network-engine';
import { SuspensionRiskEngine } from './suspension-risk-engine';

// Initialize RPA Engine
const rpaEngine = feature("PREMIUM") ? new DuoPlusRPAEngine({
  apiKey: 'duoplus-rpa-api-key-20251231',
  baseUrl: 'https://openapi.duoplus.net',
  maxBatchSize: 20,
  qpsLimit: 1,
  defaultHeaders: {
    'DuoPlus-API-Key': 'duoplus-rpa-api-key-20251231',
    'Lang': 'en',
    'Content-Type': 'application/json'
  }
}) : null;

const guardianNetworkEngine = feature("PREMIUM") ? guardianNetwork : null;
const riskEngine = feature("PREMIUM") ? new SuspensionRiskEngine() : null;

// DuoPlus RPA API Server
if (feature("PREMIUM")) {
  Bun.serve({
    port: 3006,
    fetch(req) {
      const url = new URL(req.url);
      
      // Batch Operations Endpoints
      if (url.pathname === '/api/rpa/batch/update' && req.method === 'POST') {
        return handleBatchUpdate(req);
      }
      
      if (url.pathname === '/api/rpa/batch/status' && req.method === 'GET') {
        return handleBatchStatus(req);
      }
      
      // Template Management Endpoints
      if (url.pathname === '/api/rpa/templates' && req.method === 'GET') {
        return handleGetTemplates(req);
      }
      
      if (url.pathname === '/api/rpa/templates' && req.method === 'POST') {
        return handleCreateTemplate(req);
      }
      
      if (url.pathname.startsWith('/api/rpa/templates/') && req.method === 'GET') {
        return handleGetTemplate(req);
      }
      
      // Task Management Endpoints
      if (url.pathname === '/api/rpa/tasks' && req.method === 'POST') {
        return handleCreateTask(req);
      }
      
      if (url.pathname === '/api/rpa/tasks' && req.method === 'GET') {
        return handleGetTasks(req);
      }
      
      if (url.pathname.startsWith('/api/rpa/tasks/') && req.method === 'GET') {
        return handleGetTask(req);
      }
      
      if (url.pathname.startsWith('/api/rpa/tasks/') && req.method === 'DELETE') {
        return handleDeleteTask(req);
      }
      
      if (url.pathname.startsWith('/api/rpa/tasks/') && req.method === 'POST') {
        return handleControlTask(req);
      }
      
      // Guardian Network Integration Endpoints
      if (url.pathname === '/api/rpa/guardian/trigger-nomination' && req.method === 'POST') {
        return handleTriggerGuardianNomination(req);
      }
      
      if (url.pathname === '/api/rpa/guardian/recovery-approval' && req.method === 'POST') {
        return handleRecoveryApproval(req);
      }
      
      if (url.pathname === '/api/rpa/guardian/batch-sync' && req.method === 'POST') {
        return handleBatchSync(req);
      }
      
      // Google Verification Endpoints
      if (url.pathname === '/api/rpa/google/verify' && req.method === 'POST') {
        return handleGoogleVerification(req);
      }
      
      if (url.pathname === '/api/rpa/google/status' && req.method === 'GET') {
        return handleGoogleVerificationStatus(req);
      }
      
      // Performance and Metrics Endpoints
      if (url.pathname === '/api/rpa/metrics' && req.method === 'GET') {
        return handleGetMetrics(req);
      }
      
      if (url.pathname === '/api/rpa/performance' && req.method === 'GET') {
        return handleGetPerformance(req);
      }
      
      // Plugin Development Endpoints
      if (url.pathname === '/api/rpa/plugins' && req.method === 'GET') {
        return handleGetPlugins(req);
      }
      
      if (url.pathname === '/api/rpa/plugins' && req.method === 'POST') {
        return handleUploadPlugin(req);
      }
      
      // ADB Commands Endpoints
      if (url.pathname === '/api/rpa/adb/execute' && req.method === 'POST') {
        return handleADBCommand(req);
      }
      
      if (url.pathname === '/api/rpa/adb/devices' && req.method === 'GET') {
        return handleGetADBDevices(req);
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });
}

// Batch Update Endpoint
async function handleBatchUpdate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { images } = body;
    
    if (!images || !Array.isArray(images)) {
      return Response.json({ error: 'Images array is required' }, { status: 400 });
    }
    
    if (images.length > 20) {
      return Response.json({ error: 'Maximum 20 images per batch' }, { status: 400 });
    }
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const result = await rpaEngine.batchUpdateCloudPhones(images);
    
    return Response.json({
      success: true,
      result,
      message: 'Batch update completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Batch update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Batch Status Endpoint
async function handleBatchStatus(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    
    if (!batchId) {
      return Response.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    // Mock batch status - in real system would track batch operations
    const mockStatus = {
      batchId,
      status: 'completed',
      progress: 100,
      success: 18,
      failed: 2,
      startTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      endTime: new Date().toISOString(),
      errors: {
        'cloud-003': 'Network timeout',
        'cloud-007': 'Device offline'
      }
    };
    
    return Response.json({
      success: true,
      batchStatus: mockStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get batch status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Templates Endpoint
async function handleGetTemplates(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') as 'custom' | 'official' | undefined;
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const templates = rpaEngine.getTemplateList(type);
    
    return Response.json({
      success: true,
      templates,
      total: templates.length,
      type: type || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create Template Endpoint
async function handleCreateTemplate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { name, type, category, variables, steps } = body;
    
    if (!name || !type || !category || !steps) {
      return Response.json({ error: 'Name, type, category, and steps are required' }, { status: 400 });
    }
    
    // Mock template creation - in real system would store in database
    const newTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      category,
      variables: variables || {},
      steps,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return Response.json({
      success: true,
      template: newTemplate,
      message: 'Template created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to create template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Template Endpoint
async function handleGetTemplate(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const templateId = url.pathname.split('/')[4];
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const templates = rpaEngine.getTemplateList();
    const template = templates.find((t: any) => t.id === templateId);
    
    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      template,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create Task Endpoint
async function handleCreateTask(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { templateId, imageIds, variables, schedule } = body;
    
    if (!templateId || !imageIds || !Array.isArray(imageIds)) {
      return Response.json({ error: 'Template ID and image IDs array are required' }, { status: 400 });
    }
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    let taskId: string;
    
    if (schedule?.type === 'cron') {
      taskId = await rpaEngine.createScheduledTask(templateId, imageIds, variables || {}, schedule.pattern);
    } else if (schedule?.type === 'loop') {
      taskId = await rpaEngine.createLoopTask(templateId, imageIds, variables || {}, schedule.loopCount);
    } else {
      taskId = await rpaEngine.createRPATask(templateId, imageIds, variables || {});
    }
    
    return Response.json({
      success: true,
      taskId,
      message: 'RPA task created successfully',
      templateId,
      imageIds: imageIds.length,
      schedule: schedule?.type || 'immediate',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to create RPA task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Tasks Endpoint
async function handleGetTasks(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    let tasks = rpaEngine.getTaskList();
    
    if (status) {
      tasks = tasks.filter((t: any) => t.status === status);
    }
    
    tasks = tasks.slice(0, limit);
    
    return Response.json({
      success: true,
      tasks,
      total: tasks.length,
      status: status || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Task Endpoint
async function handleGetTask(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const taskId = url.pathname.split('/')[4];
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const tasks = rpaEngine.getTaskList();
    const task = tasks.find((t: any) => t.id === taskId);
    
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      task,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete Task Endpoint
async function handleDeleteTask(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const taskId = url.pathname.split('/')[4];
    
    // Mock task deletion - in real system would cancel and remove from queue
    console.log(`🗑️ Deleting RPA task: ${taskId}`);
    
    return Response.json({
      success: true,
      message: 'Task deleted successfully',
      taskId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to delete task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Control Task Endpoint (Pause/Resume/Cancel)
async function handleControlTask(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const taskId = url.pathname.split('/')[4];
    const body = await req.json() as any;
    const { action } = body; // pause, resume, cancel
    
    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Mock task control - in real system would control task execution
    console.log(`🎮 Controlling RPA task ${taskId}: ${action}`);
    
    return Response.json({
      success: true,
      message: `Task ${action}d successfully`,
      taskId,
      action,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to control task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Trigger Guardian Nomination Endpoint
async function handleTriggerGuardianNomination(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, riskScore } = body;
    
    if (!teenId || riskScore === undefined) {
      return Response.json({ error: 'Teen ID and risk score are required' }, { status: 400 });
    }
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const taskId = await rpaEngine.triggerGuardianNominationOnRisk(teenId, riskScore);
    
    return Response.json({
      success: true,
      taskId,
      message: 'Guardian nomination RPA triggered successfully',
      teenId,
      riskScore,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to trigger guardian nomination',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Recovery Approval Endpoint
async function handleRecoveryApproval(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { guardianId, recoveryId } = body;
    
    if (!guardianId || !recoveryId) {
      return Response.json({ error: 'Guardian ID and recovery ID are required' }, { status: 400 });
    }
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const taskId = await rpaEngine.triggerRecoveryApprovalFlow(guardianId, recoveryId);
    
    return Response.json({
      success: true,
      taskId,
      message: 'Recovery approval RPA triggered successfully',
      guardianId,
      recoveryId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to trigger recovery approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Batch Sync Endpoint
async function handleBatchSync(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { teenId, configData } = body;
    
    if (!teenId || !configData) {
      return Response.json({ error: 'Teen ID and config data are required' }, { status: 400 });
    }
    
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    await rpaEngine.batchSyncGuardianConfigs(teenId, configData);
    
    return Response.json({
      success: true,
      message: 'Batch config sync RPA triggered successfully',
      teenId,
      configSize: JSON.stringify(configData).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to trigger batch sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Google Verification Endpoint
async function handleGoogleVerification(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { imageIds, proxyId, verificationType } = body;
    
    if (!imageIds || !Array.isArray(imageIds)) {
      return Response.json({ error: 'Image IDs array is required' }, { status: 400 });
    }
    
    // Mock Google verification RPA task creation
    const taskId = `google-verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔍 Google Verification RPA triggered:`);
    console.log(`   📱 Target Devices: ${imageIds.length}`);
    console.log(`   🔒 Proxy ID: ${proxyId || 'default'}`);
    console.log(`   🎯 Verification Type: ${verificationType || 'standard'}`);
    
    return Response.json({
      success: true,
      taskId,
      message: 'Google verification RPA triggered successfully',
      imageIds: imageIds.length,
      proxyId: proxyId || 'default',
      verificationType: verificationType || 'standard',
      expectedSuccessRate: '85-92%',
      estimatedTime: '45s per device',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to trigger Google verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Google Verification Status Endpoint
async function handleGoogleVerificationStatus(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    
    // Mock Google verification status
    const mockStatus = {
      taskId: taskId || 'google-verify-mock',
      status: 'running',
      progress: 65,
      totalDevices: 5,
      completedDevices: 3,
      successfulDevices: 3,
      failedDevices: 0,
      averageTime: '42s',
      estimatedCompletion: new Date(Date.now() + 90000).toISOString(), // 90 seconds from now
      successRate: '100%',
      antiDetectionMeasures: [
        'Proxy rotation applied',
        'GPS simulation enabled',
        'Fingerprint randomized',
        'Human-like interaction timing'
      ]
    };
    
    return Response.json({
      success: true,
      verificationStatus: mockStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get verification status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Metrics Endpoint
async function handleGetMetrics(req: Request): Promise<Response> {
  try {
    if (!rpaEngine) {
      return Response.json({ error: 'RPA Engine not available' }, { status: 503 });
    }
    
    const metrics = rpaEngine.getPerformanceMetrics();
    
    return Response.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Performance Endpoint
async function handleGetPerformance(req: Request): Promise<Response> {
  try {
    // Mock detailed performance data
    const performance = {
      batchOperations: {
        totalBatches: 156,
        averageBatchSize: 12,
        averageExecutionTime: 1800, // ms
        successRate: 0.94,
        lastBatchTime: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
      },
      templatePerformance: {
        totalTemplates: 8,
        officialTemplates: 4,
        customTemplates: 4,
        mostUsedTemplate: 'guardian_nomination_auto_approve',
        averageStepsPerTemplate: 6.5
      },
      systemPerformance: {
        cpuUsage: 0.23,
        memoryUsage: 0.45,
        queueLength: 2,
        qpsUtilization: 0.15, // 15% of QPS limit
        uptime: '72h 34m'
      },
      googleVerification: {
        totalAttempts: 1247,
        successRate: 0.87,
        averageTime: 45000, // ms
        bypassTechniques: [
          'Proxy rotation',
          'GPS simulation',
          'Fingerprint randomization',
          'Human-like timing'
        ]
      }
    };
    
    return Response.json({
      success: true,
      performance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get performance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get Plugins Endpoint
async function handleGetPlugins(req: Request): Promise<Response> {
  try {
    // Mock plugin system
    const plugins = [
      {
        id: 'network-injector',
        name: 'Network Request Injector',
        version: '1.2.0',
        description: 'Inject custom network requests into RPA workflows',
        author: 'DuoPlus Team',
        enabled: true,
        category: 'Network'
      },
      {
        id: 'ocr-extractor',
        name: 'OCR Text Extractor',
        version: '2.1.0',
        description: 'Extract text from screenshots using OCR',
        author: 'Community',
        enabled: true,
        category: 'Data Extraction'
      },
      {
        id: 'crypto-helper',
        name: 'Cryptographic Helper',
        version: '1.0.5',
        description: 'Perform cryptographic operations in RPA steps',
        author: 'DuoPlus Team',
        enabled: false,
        category: 'Security'
      }
    ];
    
    return Response.json({
      success: true,
      plugins,
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get plugins',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Upload Plugin Endpoint
async function handleUploadPlugin(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { name, description, code, category } = body;
    
    if (!name || !code) {
      return Response.json({ error: 'Name and code are required' }, { status: 400 });
    }
    
    // Mock plugin upload
    const newPlugin = {
      id: `plugin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || '',
      version: '1.0.0',
      author: 'User',
      enabled: false,
      category: category || 'Custom',
      uploadedAt: new Date().toISOString()
    };
    
    return Response.json({
      success: true,
      plugin: newPlugin,
      message: 'Plugin uploaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to upload plugin',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Execute ADB Command Endpoint
async function handleADBCommand(req: Request): Promise<Response> {
  try {
    const body = await req.json() as any;
    const { deviceId, command, parameters } = body;
    
    if (!deviceId || !command) {
      return Response.json({ error: 'Device ID and command are required' }, { status: 400 });
    }
    
    // Mock ADB command execution
    const adbCommands = {
      'devices': 'List of connected devices',
      'tap': 'Simulated tap at coordinates',
      'input': 'Text input simulated',
      'install': 'APK installation completed',
      'shell': 'Shell command executed'
    };
    
    const result = {
      deviceId,
      command,
      parameters: parameters || [],
      output: adbCommands[command as keyof typeof adbCommands] || 'Command executed',
      exitCode: 0,
      executionTime: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
      timestamp: new Date().toISOString()
    };
    
    return Response.json({
      success: true,
      result,
      message: 'ADB command executed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to execute ADB command',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get ADB Devices Endpoint
async function handleGetADBDevices(req: Request): Promise<Response> {
  try {
    // Mock ADB device list
    const devices = [
      {
        deviceId: 'cloud-001',
        model: 'Samsung Galaxy S21',
        androidVersion: '12',
        status: 'online',
        lastSeen: new Date().toISOString(),
        properties: {
          'ro.product.model': 'SM-G991B',
          'ro.build.version.release': '12',
          'ro.product.manufacturer': 'Samsung'
        }
      },
      {
        deviceId: 'cloud-002',
        model: 'Google Pixel 6',
        androidVersion: '13',
        status: 'online',
        lastSeen: new Date(Date.now() - 30000).toISOString(),
        properties: {
          'ro.product.model': 'Pixel 6',
          'ro.build.version.release': '13',
          'ro.product.manufacturer': 'Google'
        }
      },
      {
        deviceId: 'cloud-003',
        model: 'OnePlus 9 Pro',
        androidVersion: '11',
        status: 'offline',
        lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        properties: {
          'ro.product.model': 'LE2123',
          'ro.build.version.release': '11',
          'ro.product.manufacturer': 'OnePlus'
        }
      }
    ];
    
    return Response.json({
      success: true,
      devices,
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get ADB devices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

console.log('🤖 DuoPlus RPA API Server running on port 3006');
console.log('🔧 Available endpoints:');
console.log('  POST /api/rpa/batch/update - Batch update cloud phone parameters');
console.log('  GET  /api/rpa/batch/status - Get batch operation status');
console.log('  GET  /api/rpa/templates - List RPA templates');
console.log('  POST /api/rpa/templates - Create new template');
console.log('  GET  /api/rpa/templates/:id - Get specific template');
console.log('  POST /api/rpa/tasks - Create RPA task');
console.log('  GET  /api/rpa/tasks - List RPA tasks');
console.log('  GET  /api/rpa/tasks/:id - Get specific task');
console.log('  DELETE /api/rpa/tasks/:id - Delete task');
console.log('  POST /api/rpa/tasks/:id - Control task (pause/resume/cancel)');
console.log('  POST /api/rpa/guardian/trigger-nomination - Trigger guardian nomination RPA');
console.log('  POST /api/rpa/guardian/recovery-approval - Trigger recovery approval RPA');
console.log('  POST /api/rpa/guardian/batch-sync - Batch sync guardian configs');
console.log('  POST /api/rpa/google/verify - Trigger Google verification RPA');
console.log('  GET  /api/rpa/google/status - Get verification status');
console.log('  GET  /api/rpa/metrics - Get RPA metrics');
console.log('  GET  /api/rpa/performance - Get detailed performance data');
console.log('  GET  /api/rpa/plugins - List available plugins');
console.log('  POST /api/rpa/plugins - Upload new plugin');
console.log('  POST /api/rpa/adb/execute - Execute ADB command');
console.log('  GET  /api/rpa/adb/devices - Get connected ADB devices');
