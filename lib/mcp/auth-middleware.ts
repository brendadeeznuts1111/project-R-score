/**
 * 🔐 FactoryWager MCP Authentication Middleware
 *
 * Secure authentication layer for MCP servers using master tokens
 */

import { masterTokenManager, TokenValidation } from '../security/master-token';
import { styled, FW_COLORS } from '../theme/colors';

export interface AuthContext {
  tokenId: string;
  permissions: string[];
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

export interface AuthMiddlewareOptions {
  requiredPermissions?: string[];
  allowAnonymous?: boolean;
  logAttempts?: boolean;
}

export class MCPAuthMiddleware {
  private options: AuthMiddlewareOptions;

  constructor(options: AuthMiddlewareOptions = {}) {
    this.options = {
      requiredPermissions: [],
      allowAnonymous: false,
      logAttempts: true,
      ...options,
    };
  }

  /**
   * Authenticate a request using master token
   */
  async authenticate(
    token: string | undefined,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; authContext?: AuthContext; error?: string }> {
    // Allow anonymous access if configured
    if (this.options.allowAnonymous && !token) {
      return {
        success: true,
        authContext: {
          tokenId: 'anonymous',
          permissions: ['anonymous'],
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          ...context,
        },
      };
    }

    // Token is required if not allowing anonymous
    if (!token) {
      const error = 'Authentication token required';
      if (this.options.logAttempts) {
        console.log(styled('🔒 Authentication failed: No token provided', 'warning'));
      }
      return { success: false, error };
    }

    try {
      // Validate the token
      const validation: TokenValidation = await masterTokenManager.validateToken(token, context);

      if (!validation.valid) {
        if (this.options.logAttempts) {
          console.log(styled(`🔒 Authentication failed: ${validation.reason}`, 'error'));
        }
        return { success: false, error: validation.reason };
      }

      // Check required permissions
      if (this.options.requiredPermissions) {
        const hasAllPermissions = this.options.requiredPermissions.every(permission =>
          validation.permissions?.includes(permission)
        );

        if (!hasAllPermissions) {
          const missing = this.options.requiredPermissions.filter(
            perm => !validation.permissions?.includes(perm)
          );
          if (this.options.logAttempts) {
            console.log(
              styled(
                `🔒 Authentication failed: Missing permissions: ${missing.join(', ')}`,
                'error'
              )
            );
          }
          return { success: false, error: `Missing permissions: ${missing.join(', ')}` };
        }
      }

      const authContext: AuthContext = {
        tokenId: validation.tokenId!,
        permissions: validation.permissions!,
        expiresAt: validation.expiresAt!,
        ...context,
      };

      if (this.options.logAttempts) {
        console.log(
          styled(`✅ Authentication successful for token: ${validation.tokenId}`, 'success')
        );
      }

      return { success: true, authContext };
    } catch (error) {
      const errorMessage = `Authentication error: ${error.message}`;
      if (this.options.logAttempts) {
        console.log(styled(`🔒 ${errorMessage}`, 'error'));
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a permission is granted
   */
  hasPermission(authContext: AuthContext, permission: string): boolean {
    return authContext.permissions.includes(permission);
  }

  /**
   * Check if any of the permissions are granted
   */
  hasAnyPermission(authContext: AuthContext, permissions: string[]): boolean {
    return permissions.some(perm => authContext.permissions.includes(perm));
  }

  /**
   * Create a wrapper function for tool authentication
   */
  createAuthenticatedTool<T extends any[], R>(
    toolFunction: (args: T, authContext: AuthContext) => Promise<R>,
    options?: AuthMiddlewareOptions
  ) {
    const middleware = new MCPAuthMiddleware(options);

    return async (
      args: T,
      context?: { ip?: string; userAgent?: string; token?: string }
    ): Promise<R> => {
      const auth = await middleware.authenticate(context?.token, context);

      if (!auth.success) {
        throw new Error(`Authentication failed: ${auth.error}`);
      }

      return toolFunction(args, auth.authContext!);
    };
  }

  /**
   * Express-style middleware for HTTP endpoints
   */
  expressMiddleware() {
    return async (req: any, res: any, next: any) => {
      const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const auth = await this.authenticate(token, context);

      if (!auth.success) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: auth.error,
        });
      }

      req.authContext = auth.authContext;
      next();
    };
  }
}

// Pre-configured middleware for different MCP contexts
export const mcpAuthMiddleware = {
  // For read-only operations
  readOnly: new MCPAuthMiddleware({
    requiredPermissions: ['search:docs', 'read:metrics'],
    logAttempts: true,
  }),

  // For write operations
  readWrite: new MCPAuthMiddleware({
    requiredPermissions: ['search:docs', 'store:diagnosis', 'write:metrics'],
    logAttempts: true,
  }),

  // For administrative operations
  admin: new MCPAuthMiddleware({
    requiredPermissions: ['manage:tokens', 'read:audits', 'system:admin'],
    logAttempts: true,
  }),

  // For Claude Desktop
  claudeDesktop: new MCPAuthMiddleware({
    requiredPermissions: ['search:docs', 'store:diagnosis', 'audit:search', 'metrics:read'],
    logAttempts: true,
  }),

  // For CLI tools
  cliTools: new MCPAuthMiddleware({
    requiredPermissions: ['search:docs', 'generate:examples', 'validate:code'],
    logAttempts: true,
  }),

  // Allow anonymous for public endpoints
  public: new MCPAuthMiddleware({
    allowAnonymous: true,
    logAttempts: false,
  }),
};

// Helper function to extract token from various sources
export function extractTokenFromRequest(request: any): string | undefined {
  // Try Authorization header first
  const authHeader = request.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter
  if (request.query?.token) {
    return request.query.token;
  }

  // Try body parameter
  if (request.body?.token) {
    return request.body.token;
  }

  // Try environment variable (for development)
  if (process.env.MASTER_TOKEN) {
    return process.env.MASTER_TOKEN;
  }

  return undefined;
}

// Decorator for class methods
export function requireAuth(permissions?: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract token from last argument if it's a context object
      const lastArg = args[args.length - 1];
      const context = lastArg && typeof lastArg === 'object' ? lastArg : {};
      const token = context.token || extractTokenFromRequest(context);

      const middleware = new MCPAuthMiddleware({ requiredPermissions: permissions });
      const auth = await middleware.authenticate(token, context);

      if (!auth.success) {
        throw new Error(`Authentication failed: ${auth.error}`);
      }

      // Add auth context to arguments
      if (context) {
        context.authContext = auth.authContext;
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

// CLI interface for testing authentication
if (import.meta.main) {
  const command = Bun.argv[2];
  const token = Bun.argv[3];

  async function testAuth() {
    try {
      switch (command) {
        case 'test':
          if (!token) {
            console.error('❌ Token required');
            process.exit(1);
          }

          console.log('🔍 Testing authentication...');

          // Test different permission levels
          const tests = [
            { name: 'Read-only', middleware: mcpAuthMiddleware.readOnly },
            { name: 'Read-write', middleware: mcpAuthMiddleware.readWrite },
            { name: 'Admin', middleware: mcpAuthMiddleware.admin },
            { name: 'Claude Desktop', middleware: mcpAuthMiddleware.claudeDesktop },
            { name: 'CLI Tools', middleware: mcpAuthMiddleware.cliTools },
          ];

          for (const test of tests) {
            console.log(`\n📋 Testing ${test.name} access...`);
            const result = await test.middleware.authenticate(token);
            if (result.success) {
              console.log(`✅ ${test.name}: Access granted`);
              console.log(`   Permissions: ${result.authContext?.permissions.join(', ')}`);
            } else {
              console.log(`❌ ${test.name}: Access denied - ${result.error}`);
            }
          }
          break;

        case 'extract':
          // Test token extraction from mock request
          const mockRequest = {
            headers: { authorization: `Bearer ${token}` },
            query: {},
            body: {},
          };

          const extracted = extractTokenFromRequest(mockRequest);
          console.log(`🔍 Extracted token: ${extracted || 'None'}`);
          break;

        default:
          console.log('🔐 MCP Authentication Middleware Test');
          console.log('');
          console.log('Commands:');
          console.log('  test <token>    - Test token against different permission levels');
          console.log('  extract <token> - Test token extraction from request');
          console.log('');
          console.log('Usage:');
          console.log('  bun run lib/mcp/auth-middleware.ts test <your-token>');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  testAuth();
}
