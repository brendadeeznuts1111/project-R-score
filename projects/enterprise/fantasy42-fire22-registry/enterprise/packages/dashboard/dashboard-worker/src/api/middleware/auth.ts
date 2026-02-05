/**
 * 🔐 Fire22 Dashboard - Authentication Middleware
 * Authentication and authorization middleware for API endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../../types';
import CONSTANTS from '../../config/constants.js';

// Extend Request interface to include auth data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        agentId: string;
        permissions: string[];
      };
      agentId?: string;
    }
  }
}

/**
 * Validate API key from request headers
 */
export function validateApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return false;
  }

  // In production, this would validate against a database or secure store
  // For now, we'll use environment variables or constants
  const validApiKeys = [
    process.env.API_KEY,
    process.env.MASTER_API_KEY,
    'test_key_123', // For testing
    CONSTANTS.API_CONFIG.DEFAULT_AGENT_ID, // Fallback
  ].filter(Boolean);

  return validApiKeys.includes(apiKey as string);
}

/**
 * Validate agent ID
 */
export function validateAgentId(agentId: string): boolean {
  if (!agentId || typeof agentId !== 'string') {
    return false;
  }

  // Basic validation - in production, this would check against database
  const validAgentIds = [
    CONSTANTS.API_CONFIG.DEFAULT_AGENT_ID,
    CONSTANTS.API_CONFIG.DEFAULT_MASTER_AGENT,
    'BLAKEPPH',
    'MASTER',
    'ADMIN',
  ];

  return validAgentIds.includes(agentId) || agentId.length >= 3;
}

/**
 * API Key authentication middleware
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  try {
    const isValid = validateApiKey(req);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    // Set default user context for valid API key
    req.user = {
      id: 'api-user',
      username: 'api-user',
      role: 'agent',
      agentId: CONSTANTS.API_CONFIG.DEFAULT_AGENT_ID,
      permissions: ['read', 'write'],
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Failed to authenticate request',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
}

/**
 * Agent authorization middleware
 */
export function authorizeAgent(req: Request, res: Response, next: NextFunction): void {
  try {
    const agentId = req.body.agentID || req.query.agentID || req.params.agentID;

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Agent ID is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const isValidAgent = validateAgentId(agentId as string);

    if (!isValidAgent) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid agent ID or insufficient permissions',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    // Set agent context
    req.agentId = agentId as string;
    if (req.user) {
      req.user.agentId = agentId as string;
    }

    next();
  } catch (error) {
    console.error('Agent authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization error',
      message: 'Failed to authorize agent',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
}

/**
 * Role-based authorization middleware
 */
export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Role '${userRole}' is not authorized for this operation`,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Failed to authorize role',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };
}

/**
 * Permission-based authorization middleware
 */
export function authorizePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userPermissions = req.user.permissions || [];

      if (!userPermissions.includes(requiredPermission) && !userPermissions.includes('admin')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Permission '${requiredPermission}' is required for this operation`,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      next();
    } catch (error) {
      console.error('Permission authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Failed to authorize permission',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [key, value] of requests.entries()) {
        if (value.resetTime < windowStart) {
          requests.delete(key);
        }
      }

      // Get or create client record
      let clientRecord = requests.get(clientId as string);
      if (!clientRecord || clientRecord.resetTime < windowStart) {
        clientRecord = { count: 0, resetTime: now + windowMs };
        requests.set(clientId as string, clientRecord);
      }

      // Check rate limit
      if (clientRecord.count >= maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      // Increment counter
      clientRecord.count++;

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - clientRecord.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
}

/**
 * Request logging middleware
 */
export function logRequest(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  // Add request ID to request object
  (req as any).requestId = requestId;

  // Log request
  console.log(`[${requestId}] ${req.method} ${req.path} - ${req.ip}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ${res.statusCode} - ${duration}ms`);
  });

  next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  next();
}

export default {
  validateApiKey,
  validateAgentId,
  authenticateApiKey,
  authorizeAgent,
  authorizeRole,
  authorizePermission,
  rateLimit,
  logRequest,
  securityHeaders,
};
