/**
 * Server Core Module
 * Handles HTTP server setup, configuration, and basic request processing
 */

import type {
  ServerConfig,
  HTTPRequest,
  HTTPResponse,
  RouteHandler,
  ServerStats,
  ServerError,
  ServerMode,
} from '../../../core/types/dev-server';

export class ServerCore {
  private config: ServerConfig;
  private routes: Map<string, RouteHandler> = new Map();
  private stats: ServerStats;
  private server?: any; // HTTP server instance
  private startTime: Date;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      mode: 'development',
      watchPaths: ['./src', './public'],
      ignoredPaths: ['node_modules', '.git', 'dist'],
      hmrEnabled: true,
      liveReloadEnabled: true,
      corsEnabled: true,
      compressionEnabled: true,
      cacheEnabled: true,
      logLevel: 'info',
      maxConnections: 100,
      timeout: 30000,
      ...config,
    };

    this.startTime = new Date();
    this.initializeStats();
    this.registerDefaultRoutes();
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    try {
      // In a real implementation, this would start an actual HTTP server
      // For now, we'll simulate the server startup

      console.log(`🚀 Starting ${this.config.mode} server...`);
      console.log(`📡 Server listening on ${this.config.host}:${this.config.port}`);
      console.log(`🔧 HMR: ${this.config.hmrEnabled ? 'enabled' : 'disabled'}`);
      console.log(`🔄 Live Reload: ${this.config.liveReloadEnabled ? 'enabled' : 'disabled'}`);

      this.server = {
        port: this.config.port,
        host: this.config.host,
        started: true,
      };

      this.log('info', 'Server started successfully', {
        port: this.config.port,
        host: this.config.host,
        mode: this.config.mode,
      });
    } catch (error) {
      this.log('error', 'Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    try {
      if (this.server) {
        console.log('🛑 Stopping server...');

        // In a real implementation, this would gracefully stop the server
        this.server = undefined;

        this.log('info', 'Server stopped successfully');
      }
    } catch (error) {
      this.log('error', 'Failed to stop server', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Register a route handler
   */
  registerRoute(route: Omit<RouteHandler, 'pattern'>): void {
    const pattern = this.pathToRegex(route.path);
    const routeHandler: RouteHandler = {
      ...route,
      pattern,
    };

    const key = `${route.method}:${route.path}`;
    this.routes.set(key, routeHandler);

    this.log('debug', `Route registered: ${route.method} ${route.path}`);
  }

  /**
   * Handle HTTP request
   */
  async handleRequest(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);

    try {
      // Find matching route
      const route = this.findRoute(request.method as any, url.pathname);
      if (!route) {
        return this.createErrorResponse('Route not found', 404);
      }

      // Create enhanced request object
      const enhancedRequest: HTTPRequest = {
        ...request,
        clientId: this.generateClientId(),
        sessionId: this.generateSessionId(),
        startTime: new Date(startTime),
      };

      // Apply middleware
      let response: HTTPResponse;
      if (route.middleware && route.middleware.length > 0) {
        response = await this.applyMiddleware(enhancedRequest, route.middleware, route.handler);
      } else {
        response = await route.handler(enhancedRequest);
      }

      // Add processing time
      const processingTime = Date.now() - startTime;
      response.processingTime = processingTime;

      // Update stats
      this.updateRequestStats(processingTime, response.status === 200);

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateRequestStats(processingTime, false);

      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      ...this.stats,
      uptime,
    };
  }

  /**
   * Get server configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Update server configuration
   */
  updateConfig(updates: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.log('info', 'Server configuration updated', updates);
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<Response> {
    const stats = this.getStats();
    const health = {
      status: 'healthy',
      uptime: stats.uptime,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      config: {
        mode: this.config.mode,
        hmrEnabled: this.config.hmrEnabled,
        liveReloadEnabled: this.config.liveReloadEnabled,
      },
    };

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Private methods

  private initializeStats(): void {
    this.stats = {
      uptime: 0,
      totalRequests: 0,
      activeConnections: 0,
      websocketClients: 0,
      memoryUsage: {
        used: 0,
        total: 100 * 1024 * 1024, // 100MB
        percentage: 0,
      },
      fileChanges: 0,
      hmrMessages: 0,
      errors: 0,
      averageResponseTime: 0,
    };
  }

  private registerDefaultRoutes(): void {
    // Health check route
    this.registerRoute({
      method: 'GET',
      path: '/health',
      handler: this.healthCheck.bind(this),
    });

    // Status route
    this.registerRoute({
      method: 'GET',
      path: '/status',
      handler: async () => {
        const stats = this.getStats();
        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    this.log('info', 'Default routes registered');
  }

  private findRoute(method: string, path: string): RouteHandler | undefined {
    const key = `${method}:${path}`;
    const exactMatch = this.routes.get(key);

    if (exactMatch) {
      return exactMatch;
    }

    // Check pattern matches
    for (const route of this.routes.values()) {
      if (route.method === method && route.pattern.test(path)) {
        return route;
      }
    }

    return undefined;
  }

  private async applyMiddleware(
    request: HTTPRequest,
    middleware: any[],
    handler: (req: HTTPRequest) => Promise<HTTPResponse>
  ): Promise<HTTPResponse> {
    let index = 0;

    const next = async (): Promise<HTTPResponse> => {
      if (index < middleware.length) {
        const middlewareFn = middleware[index++];
        return middlewareFn.handler(request, next);
      } else {
        return handler(request);
      }
    };

    return next();
  }

  private pathToRegex(path: string): RegExp {
    // Convert path with parameters to regex
    // e.g., /users/:id -> /^\/users\/([^\/]+)$/
    const regexPattern = path
      .replace(/:([^\/]+)/g, '([^/]+)') // Replace :param with capture group
      .replace(/\*/g, '.*'); // Replace * with .*

    return new RegExp(`^${regexPattern}$`);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateRequestStats(processingTime: number, success: boolean): void {
    this.stats.totalRequests++;

    if (!success) {
      this.stats.errors++;
    }

    // Update average response time
    const currentAvg = this.stats.averageResponseTime;
    const newAvg =
      (currentAvg * (this.stats.totalRequests - 1) + processingTime) / this.stats.totalRequests;
    this.stats.averageResponseTime = Math.round(newAvg);
  }

  private createErrorResponse(message: string, statusCode: number): Response {
    const error: ServerError = new Error(message) as ServerError;
    error.code = 'SERVER_ERROR';
    error.statusCode = statusCode;

    return new Response(
      JSON.stringify({
        error: message,
        code: error.code,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private log(level: string, message: string, data?: any): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      if (data) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }

  // Getters for external access

  getRoutes(): Map<string, RouteHandler> {
    return new Map(this.routes);
  }

  getServerInstance(): any {
    return this.server;
  }

  isRunning(): boolean {
    return this.server?.started || false;
  }
}

// Custom error class
class ServerError extends Error {
  constructor(
    message: string,
    public code: string = 'SERVER_ERROR',
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServerError';
  }
}
