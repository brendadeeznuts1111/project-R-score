#!/usr/bin/env bun

/**
 * 🌐 Fantasy402 API Endpoints
 *
 * RESTful API endpoints for Fantasy402 integration
 * - User management endpoints
 * - Data synchronization endpoints
 * - WebSocket event handlers
 * - Health and status endpoints
 */

import { fantasy402Service } from '../services/fantasy402-integration';

// ============================================================================
// TYPES
// ============================================================================

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

interface RequestContext {
  method: string;
  url: string;
  headers: Headers;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createResponse<T>(data?: T, message?: string, status: number = 200): Response {
  const response: ApiResponse<T> = {
    success: status < 400,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  if (status >= 400) {
    response.error = message || 'Request failed';
    delete response.data;
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function createErrorResponse(message: string, status: number = 500): Response {
  return createResponse(undefined, message, status);
}

async function parseRequestBody(request: Request): Promise<any> {
  try {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await request.json();
    }
    return null;
  } catch (error) {
    return null;
  }
}

function extractParams(url: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlParts = url.split('/');
  const patternParts = pattern.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = urlParts[i] || '';
    }
  }

  return params;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

async function requireFantasy402Service(context: RequestContext): Promise<Response | null> {
  if (!fantasy402Service.isReady()) {
    return createErrorResponse('Fantasy402 service not available', 503);
  }
  return null;
}

async function validateApiKey(context: RequestContext): Promise<Response | null> {
  const apiKey = context.headers.get('x-api-key');
  const expectedApiKey = process.env.FANTASY42_API_KEY;

  if (!expectedApiKey) {
    return createErrorResponse('API key validation not configured', 500);
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return createErrorResponse('Invalid API key', 401);
  }

  return null;
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

// Health and Status Endpoints
export async function handleHealthCheck(context: RequestContext): Promise<Response> {
  try {
    const client = fantasy402Service.getClient();
    const isHealthy = await client.healthCheck();
    const isAuthenticated = client.isAuthenticated();
    const isWebSocketConnected = client.isWebSocketConnected();

    return createResponse(
      {
        status: 'healthy',
        fantasy402: {
          api: isHealthy,
          authenticated: isAuthenticated,
          websocket: isWebSocketConnected,
        },
        timestamp: new Date().toISOString(),
        version: '5.1.0',
      },
      'Fantasy402 integration is healthy'
    );
  } catch (error) {
    return createErrorResponse(`Health check failed: ${error}`, 500);
  }
}

export async function handleSystemStatus(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  try {
    const client = fantasy402Service.getClient();
    const systemStatus = await client.getSystemStatus();

    return createResponse(systemStatus, 'System status retrieved successfully');
  } catch (error) {
    return createErrorResponse(`Failed to get system status: ${error}`, 500);
  }
}

// User Management Endpoints
export async function handleGetUser(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  const apiKeyCheck = await validateApiKey(context);
  if (apiKeyCheck) return apiKeyCheck;

  try {
    const params = extractParams(context.url, '/api/fantasy402/users/:userId');
    const userId = params.userId;

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    const client = fantasy402Service.getClient();
    const user = await client.getUser(userId);

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    return createResponse(user, 'User retrieved successfully');
  } catch (error) {
    return createErrorResponse(`Failed to get user: ${error}`, 500);
  }
}

export async function handleGetUserByUsername(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  const apiKeyCheck = await validateApiKey(context);
  if (apiKeyCheck) return apiKeyCheck;

  try {
    const params = extractParams(context.url, '/api/fantasy402/users/username/:username');
    const username = params.username;

    if (!username) {
      return createErrorResponse('Username is required', 400);
    }

    const client = fantasy402Service.getClient();
    const user = await client.getUserByUsername(username);

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    return createResponse(user, 'User retrieved successfully');
  } catch (error) {
    return createErrorResponse(`Failed to get user: ${error}`, 500);
  }
}

export async function handleCreateUser(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  const apiKeyCheck = await validateApiKey(context);
  if (apiKeyCheck) return apiKeyCheck;

  try {
    const body = context.body;

    if (!body || !body.username || !body.email || !body.password) {
      return createErrorResponse('Username, email, and password are required', 400);
    }

    const client = fantasy402Service.getClient();
    const user = await client.createUser({
      username: body.username,
      email: body.email,
      password: body.password,
      metadata: body.metadata,
    });

    if (!user) {
      return createErrorResponse('Failed to create user', 500);
    }

    return createResponse(user, 'User created successfully', 201);
  } catch (error) {
    return createErrorResponse(`Failed to create user: ${error}`, 500);
  }
}

export async function handleUpdateUser(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  const apiKeyCheck = await validateApiKey(context);
  if (apiKeyCheck) return apiKeyCheck;

  try {
    const params = extractParams(context.url, '/api/fantasy402/users/:userId');
    const userId = params.userId;
    const body = context.body;

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    if (!body) {
      return createErrorResponse('Update data is required', 400);
    }

    const client = fantasy402Service.getClient();
    const user = await client.updateUser(userId, body);

    if (!user) {
      return createErrorResponse('Failed to update user', 500);
    }

    return createResponse(user, 'User updated successfully');
  } catch (error) {
    return createErrorResponse(`Failed to update user: ${error}`, 500);
  }
}

// Data Synchronization Endpoints
export async function handleSyncData(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  const apiKeyCheck = await validateApiKey(context);
  if (apiKeyCheck) return apiKeyCheck;

  try {
    const params = extractParams(context.url, '/api/fantasy402/sync/:dataType');
    const dataType = params.dataType;
    const body = context.body;

    if (!dataType) {
      return createErrorResponse('Data type is required', 400);
    }

    if (!body) {
      return createErrorResponse('Sync data is required', 400);
    }

    const client = fantasy402Service.getClient();
    const success = await client.syncData(dataType, body);

    if (!success) {
      return createErrorResponse('Data synchronization failed', 500);
    }

    return createResponse({ synced: true }, 'Data synchronized successfully');
  } catch (error) {
    return createErrorResponse(`Failed to sync data: ${error}`, 500);
  }
}

// WebSocket Connection Endpoint
export async function handleWebSocketConnect(context: RequestContext): Promise<Response> {
  const serviceCheck = await requireFantasy402Service(context);
  if (serviceCheck) return serviceCheck;

  try {
    const client = fantasy402Service.getClient();

    if (client.isWebSocketConnected()) {
      return createResponse({ connected: true }, 'WebSocket already connected');
    }

    const connected = await client.connectWebSocket();

    if (!connected) {
      return createErrorResponse('Failed to connect WebSocket', 500);
    }

    return createResponse({ connected: true }, 'WebSocket connected successfully');
  } catch (error) {
    return createErrorResponse(`Failed to connect WebSocket: ${error}`, 500);
  }
}

export async function handleWebSocketDisconnect(context: RequestContext): Promise<Response> {
  try {
    const client = fantasy402Service.getClient();
    client.disconnectWebSocket();

    return createResponse({ disconnected: true }, 'WebSocket disconnected successfully');
  } catch (error) {
    return createErrorResponse(`Failed to disconnect WebSocket: ${error}`, 500);
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export async function handleFantasy402Request(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // Parse request body
  const body = await parseRequestBody(request);

  // Create request context
  const context: RequestContext = {
    method,
    url: pathname,
    headers: request.headers,
    body,
    query: Object.fromEntries(url.searchParams.entries()),
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      },
    });
  }

  // Route requests
  try {
    // Health and status endpoints
    if (pathname === '/api/fantasy402/health' && method === 'GET') {
      return await handleHealthCheck(context);
    }

    if (pathname === '/api/fantasy402/status' && method === 'GET') {
      return await handleSystemStatus(context);
    }

    // User management endpoints
    if (pathname.match(/^\/api\/fantasy402\/users\/[^\/]+$/) && method === 'GET') {
      return await handleGetUser(context);
    }

    if (pathname.match(/^\/api\/fantasy402\/users\/username\/[^\/]+$/) && method === 'GET') {
      return await handleGetUserByUsername(context);
    }

    if (pathname === '/api/fantasy402/users' && method === 'POST') {
      return await handleCreateUser(context);
    }

    if (pathname.match(/^\/api\/fantasy402\/users\/[^\/]+$/) && method === 'PUT') {
      return await handleUpdateUser(context);
    }

    // Data synchronization endpoints
    if (pathname.match(/^\/api\/fantasy402\/sync\/[^\/]+$/) && method === 'POST') {
      return await handleSyncData(context);
    }

    // WebSocket endpoints
    if (pathname === '/api/fantasy402/websocket/connect' && method === 'POST') {
      return await handleWebSocketConnect(context);
    }

    if (pathname === '/api/fantasy402/websocket/disconnect' && method === 'POST') {
      return await handleWebSocketDisconnect(context);
    }

    // 404 for unknown endpoints
    return createErrorResponse('Endpoint not found', 404);
  } catch (error) {
    console.error('❌ Fantasy402 API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// ============================================================================
// EXPORT DEFAULT HANDLER
// ============================================================================

export default {
  async fetch(request: Request): Promise<Response> {
    return await handleFantasy402Request(request);
  },
};
