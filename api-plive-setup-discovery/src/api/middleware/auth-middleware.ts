import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/api-config';
import { ApiKeyService } from '../services/api-key-service';
import { RateLimiterService } from '../services/rate-limiter-service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header required'
      });
    }

    // Handle Bearer token (JWT)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        req.user = {
          id: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          permissions: decoded.permissions
        };

        // Check rate limit for user
        const rateLimitOK = await RateLimiterService.checkUserLimit(decoded.userId);
        if (!rateLimitOK) {
          return res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: 'Too many requests for this user'
          });
        }

      } catch (error) {
        return res.status(401).json({
          error: 'Invalid Token',
          message: 'Token is invalid or expired'
        });
      }
    }

    // Handle API Key
    else if (authHeader.startsWith('ApiKey ')) {
      const apiKey = authHeader.substring(7);

      const keyValidation = await ApiKeyService.validateApiKey(apiKey);
      if (!keyValidation.isValid) {
        return res.status(401).json({
          error: 'Invalid API Key',
          message: 'API key is invalid or expired'
        });
      }

      req.apiKey = keyValidation.apiKey;

      // Check rate limit for API key
      const rateLimitOK = await RateLimiterService.checkApiKeyLimit(keyValidation.apiKey!.id);
      if (!rateLimitOK) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests for this API key'
        });
      }
    }

    else {
      return res.status(401).json({
        error: 'Invalid Authorization',
        message: 'Authorization header must be Bearer token or ApiKey'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service unavailable'
    });
  }
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient Privileges',
        message: `Role ${req.user.role} is not authorized for this operation`
      });
    }

    next();
  };
}

// Permission-based authorization middleware
export function requirePermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];

    const hasPermission = permissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient Permissions',
        message: `Missing required permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
}
