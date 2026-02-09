/**
 * Payment API Handler Module
 * Modular API handling with proper separation of concerns
 */

import {
  createPaymentRoute,
  getPaymentRoute,
  getActiveRoutes,
  updatePaymentRoute,
  deletePaymentRoute,
  createFallbackPlan,
  getFallbackPlan,
  getAllFallbackPlans,
  createRoutingConfig,
  getRoutingConfig,
  getActiveRoutingConfig,
  setActiveRoutingConfig,
  createPaymentSplit,
  getPaymentSplit,
  getPendingSplits,
  updatePaymentSplitStatus,
} from '../core/payment-routing';

import config from './config';
import logger from './logger';
import redisManager from './redis-manager';
import validator, { ValidationError } from './validator';
import { ipRateLimiter } from './rate-limiter';
import {
  AppError,
  NotFoundError,
  ValidationError as AppValidationError,
  ServiceUnavailableError,
  handleError,
} from './errors';

// CORS headers
function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': config.corsOrigins.join(', '),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Response helpers
function jsonResponse(data: unknown, status: number = 200, extraHeaders?: Record<string, string>): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(),
    ...extraHeaders,
  };
  
  return new Response(JSON.stringify(data), { status, headers });
}

// Authentication check
function checkAuth(req: Request): boolean {
  if (!config.apiKey) return true; // No auth required if no API key set
  
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  
  const [, token] = authHeader.split(' ');
  return token === config.apiKey;
}

// Parse request body
async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json() as Record<string, unknown>;
  } catch {
    throw new AppValidationError('Invalid JSON body');
  }
}

// Route handlers
export const paymentHandlers = {
  // Health check
  async health(req: Request): Promise<Response> {
    const redisHealthy = redisManager.isHealthy();
    
    const health = {
      status: redisHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: redisHealthy,
      },
    };
    
    return jsonResponse(health, redisHealthy ? 200 : 503);
  },

  // Detailed health check
  async healthDetailed(req: Request): Promise<Response> {
    const redisStats = redisManager.getStats();
    const redisHealthy = redisManager.isHealthy();
    
    const health = {
      status: redisHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        redis: {
          status: redisHealthy ? 'connected' : 'disconnected',
          stats: redisStats,
        },
      },
    };
    
    return jsonResponse(health, redisHealthy ? 200 : 503);
  },

  // List all routes
  async listRoutes(req: Request): Promise<Response> {
    const routes = await getActiveRoutes();
    return jsonResponse({ success: true, routes });
  },

  // Create route
  async createRoute(req: Request): Promise<Response> {
    const body = await parseBody(req);
    const validated = validator.paymentRoute(body);
    
    const route = await createPaymentRoute(
      validated.name,
      validated.barberId,
      validated
    );
    
    logger.info('Payment route created', { routeId: route.id });
    return jsonResponse({ success: true, route }, 201);
  },

  // Get route
  async getRoute(req: Request, id: string): Promise<Response> {
    const route = await getPaymentRoute(id);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    return jsonResponse(route);
  },

  // Update route
  async updateRoute(req: Request, id: string): Promise<Response> {
    const body = await parseBody(req);
    const route = await updatePaymentRoute(id, body);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    
    logger.info('Payment route updated', { routeId: id });
    return jsonResponse({ success: true, route });
  },

  // Delete route
  async deleteRoute(req: Request, id: string): Promise<Response> {
    const deleted = await deletePaymentRoute(id);
    if (!deleted) {
      throw new NotFoundError('Route not found');
    }
    
    logger.info('Payment route deleted', { routeId: id });
    return jsonResponse({ success: true });
  },

  // Reorder route
  async reorderRoute(req: Request): Promise<Response> {
    const body = await parseBody(req);
    const { route_id, new_priority } = validator.reorder(body);
    
    const route = await updatePaymentRoute(route_id, { priority: new_priority });
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    
    logger.info('Payment route reordered', { routeId: route_id, newPriority: new_priority });
    return jsonResponse({ success: true, route });
  },

  // List fallbacks
  async listFallbacks(req: Request): Promise<Response> {
    const fallbacks = await getAllFallbackPlans();
    return jsonResponse({ success: true, fallbacks });
  },

  // Create fallback
  async createFallback(req: Request): Promise<Response> {
    const body = await parseBody(req);
    const validated = validator.fallbackPlan(body);
    
    const fallback = await createFallbackPlan(
      validated.name,
      validated.primaryRouteId,
      validated
    );
    
    logger.info('Fallback plan created', { fallbackId: fallback.id });
    return jsonResponse({ success: true, fallback }, 201);
  },

  // Get fallback
  async getFallback(req: Request, id: string): Promise<Response> {
    const fallback = await getFallbackPlan(id);
    if (!fallback) {
      throw new NotFoundError('Fallback plan not found');
    }
    return jsonResponse(fallback);
  },

  // Get config
  async getConfig(req: Request): Promise<Response> {
    const config = await getActiveRoutingConfig();
    if (!config) {
      return jsonResponse({
        id: 'default',
        enableAutoRouting: true,
        enableFallbacks: true,
        splitThreshold: 100,
        defaultSplitType: 'percentage',
        maxSplitRecipients: 5,
        routingStrategy: 'priority',
      });
    }
    return jsonResponse(config);
  },

  // Update config
  async updateConfig(req: Request): Promise<Response> {
    const body = await parseBody(req);
    const validated = validator.routingConfig(body);
    
    let config = await getActiveRoutingConfig();
    if (!config) {
      config = await createRoutingConfig('Default Config', validated);
      await setActiveRoutingConfig(config.id);
    } else {
      config = await createRoutingConfig(config.name, { ...config, ...validated });
      await setActiveRoutingConfig(config.id);
    }
    
    logger.info('Routing config updated', { configId: config.id });
    return jsonResponse({ success: true, config });
  },

  // List pending splits
  async listPendingSplits(req: Request): Promise<Response> {
    const splits = await getPendingSplits();
    return jsonResponse({ success: true, splits });
  },

  // Get split
  async getSplit(req: Request, id: string): Promise<Response> {
    const split = await getPaymentSplit(id);
    if (!split) {
      throw new NotFoundError('Split not found');
    }
    return jsonResponse(split);
  },

  // Update split
  async updateSplit(req: Request, id: string): Promise<Response> {
    const body = await parseBody(req);
    const split = await getPaymentSplit(id);
    if (!split) {
      throw new NotFoundError('Split not found');
    }
    
    const recipients = body.recipients 
      ? validator.array(body.recipients, 'recipients', (r) => validator.splitRecipient(r as Record<string, unknown>))
      : [];
    
    const newSplit = await createPaymentSplit(split.ticketId, split.totalAmount, recipients);
    
    logger.info('Payment split updated', { splitId: id });
    return jsonResponse({ success: true, split: newSplit });
  },

  // Process split
  async processSplit(req: Request, id: string): Promise<Response> {
    const split = await getPaymentSplit(id);
    if (!split) {
      throw new NotFoundError('Split not found');
    }
    
    await updatePaymentSplitStatus(id, 'processing');
    
    // Simulate async processing
    setTimeout(async () => {
      try {
        await updatePaymentSplitStatus(id, 'completed');
        logger.info('Payment split processed', { splitId: id });
      } catch (err) {
        logger.error('Payment split processing failed', err as Error, { splitId: id });
        await updatePaymentSplitStatus(id, 'failed', (err as Error).message);
      }
    }, 1000);
    
    return jsonResponse({ success: true, message: 'Processing started' });
  },

  // List barbers (for UI)
  async listBarbers(req: Request): Promise<Response> {
    // This would typically come from the database
    // For now, return mock data or integrate with eliteDb
    return jsonResponse({ barbers: [] });
  },
};

// Main request router
export async function routeRequest(req: Request): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;
  
  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
  }
  
  // Rate limiting
  const rateLimitResult = await ipRateLimiter.checkRequest(req);
  if (!rateLimitResult.allowed) {
    return jsonResponse(
      { error: 'Too Many Requests', retryAfter: rateLimitResult.retryAfter },
      429,
      ipRateLimiter.getHeaders(rateLimitResult)
    );
  }
  
  // Authentication check (for non-health endpoints)
  if (!path.startsWith('/health') && !checkAuth(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  
  try {
    let response: Response;
    
    // Route matching
    switch (true) {
      // Health checks
      case path === '/health' && method === 'GET':
        response = await paymentHandlers.health(req);
        break;
      case path === '/health/detailed' && method === 'GET':
        response = await paymentHandlers.healthDetailed(req);
        break;
        
      // Routes
      case path === '/payment/routes' && method === 'GET':
        response = await paymentHandlers.listRoutes(req);
        break;
      case path === '/payment/routes' && method === 'POST':
        response = await paymentHandlers.createRoute(req);
        break;
      case path === '/payment/routes/reorder' && method === 'PUT':
        response = await paymentHandlers.reorderRoute(req);
        break;
      case path.match(/^\/payment\/routes\/[^\/]+$/) && method === 'GET':
        response = await paymentHandlers.getRoute(req, path.replace('/payment/routes/', ''));
        break;
      case path.match(/^\/payment\/routes\/[^\/]+$/) && method === 'PUT':
        response = await paymentHandlers.updateRoute(req, path.replace('/payment/routes/', ''));
        break;
      case path.match(/^\/payment\/routes\/[^\/]+$/) && method === 'DELETE':
        response = await paymentHandlers.deleteRoute(req, path.replace('/payment/routes/', ''));
        break;
        
      // Fallbacks
      case path === '/payment/fallbacks' && method === 'GET':
        response = await paymentHandlers.listFallbacks(req);
        break;
      case path === '/payment/fallbacks' && method === 'POST':
        response = await paymentHandlers.createFallback(req);
        break;
      case path.match(/^\/payment\/fallbacks\/[^\/]+$/) && method === 'GET':
        response = await paymentHandlers.getFallback(req, path.replace('/payment/fallbacks/', ''));
        break;
        
      // Config
      case path === '/payment/config' && method === 'GET':
        response = await paymentHandlers.getConfig(req);
        break;
      case path === '/payment/config' && method === 'PUT':
        response = await paymentHandlers.updateConfig(req);
        break;
        
      // Splits
      case path === '/payment/splits/pending' && method === 'GET':
        response = await paymentHandlers.listPendingSplits(req);
        break;
      case path.match(/^\/payment\/splits\/[^\/]+$/) && method === 'GET':
        response = await paymentHandlers.getSplit(req, path.replace('/payment/splits/', ''));
        break;
      case path.match(/^\/payment\/splits\/[^\/]+$/) && method === 'PUT':
        response = await paymentHandlers.updateSplit(req, path.replace('/payment/splits/', ''));
        break;
      case path.match(/^\/payment\/splits\/[^\/]+\/process$/) && method === 'POST':
        response = await paymentHandlers.processSplit(
          req, 
          path.replace('/payment/splits/', '').replace('/process', '')
        );
        break;
        
      // Barbers
      case path === '/barbers' && method === 'GET':
        response = await paymentHandlers.listBarbers(req);
        break;
        
      // 404
      default:
        response = jsonResponse({ error: 'Not Found' }, 404);
    }
    
    // Add rate limit headers to successful responses
    const headers = ipRateLimiter.getHeaders(rateLimitResult);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    
    // Log request
    const duration = Date.now() - startTime;
    logger.logRequest(method, path, response.status, duration);
    
    return response;
    
  } catch (error) {
    // Log error
    logger.error('Request failed', error as Error, { path, method });
    
    // Add rate limit headers even to error responses
    const errorResponse = handleError(error as Error);
    const headers = ipRateLimiter.getHeaders(rateLimitResult);
    for (const [key, value] of Object.entries(headers)) {
      errorResponse.headers.set(key, value);
    }
    
    return errorResponse;
  }
}

export default routeRequest;
