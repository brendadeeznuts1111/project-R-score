#!/usr/bin/env bun
/**
 * Enhanced LSP Router with URLPattern API
 * Demonstrates Bun's new URLPattern feature for declarative routing
 */

import { EnhancedLSPLogger } from './enhanced-lsp-logger';
import type { ServerWebSocket } from 'bun';

interface RouteHandler {
  (request: Request, params: Record<string, string>): Promise<Response>;
}

interface WebSocketHandler {
  (ws: ServerWebSocket, params: Record<string, string>): void;
}

interface WebSocketRouteConfig {
  pattern: URLPattern;
  handler: WebSocketHandler;
  middleware?: WebSocketMiddlewareFunction[];
}

interface RouteConfig {
  pattern: URLPattern;
  handler: RouteHandler;
  methods?: string[];
  middleware?: MiddlewareFunction[];
}

type MiddlewareFunction = (request: Request, params: Record<string, string>) => Promise<Request | Response>;
type WebSocketMiddlewareFunction = (ws: ServerWebSocket, params: Record<string, string>) => void;

export class EnhancedLSPRouter {
  private routes: RouteConfig[] = [];
  private wsRoutes: WebSocketRouteConfig[] = [];
  private wsMiddleware: WebSocketMiddlewareFunction[] = [];
  private subscriptions: Map<string, Set<ServerWebSocket>> = new Map();
  private dictionary: Map<string, { definition: string; synonyms: string[] }> = new Map();
  private logger: EnhancedLSPLogger;
  private middleware: MiddlewareFunction[] = [];

  constructor() {
    this.logger = new EnhancedLSPLogger('EnhancedLSPRouter');
    this.setupDefaultRoutes();
    this.initializeDictionary();
  }

  /**
   * Setup default LSP routes using URLPattern
   */
  private setupDefaultRoutes(): void {
    // WebSocket LSP route
    this.addWebSocketRoute(
      new URLPattern({ pathname: '/lsp/ws' }),
      this.handleWebSocketLSPConnection.bind(this)
    );

    // Text Document routes
    this.addRoute(
      new URLPattern({ pathname: '/lsp/textDocument/completion' }),
      this.handleTextDocumentCompletion.bind(this),
      ['POST']
    );

    this.addRoute(
      new URLPattern({ pathname: '/lsp/textDocument/hover' }),
      this.handleTextDocumentHover.bind(this),
      ['POST']
    );

    this.addRoute(
      new URLPattern({ pathname: '/lsp/textDocument/definition' }),
      this.handleTextDocumentDefinition.bind(this),
      ['POST']
    );

    this.addRoute(
      new URLPattern({ pathname: '/lsp/textDocument/formatting' }),
      this.handleTextDocumentFormatting.bind(this),
      ['POST']
    );

    // Workspace routes
    this.addRoute(
      new URLPattern({ pathname: '/lsp/workspace/symbol' }),
      this.handleWorkspaceSymbol.bind(this),
      ['POST']
    );

    this.addRoute(
      new URLPattern({ pathname: '/lsp/workspace/executeCommand' }),
      this.handleWorkspaceExecuteCommand.bind(this),
      ['POST']
    );

    // Diagnostic routes
    this.addRoute(
      new URLPattern({ pathname: '/lsp/diagnostics', search: 'file=*' }),
      this.handleDiagnostics.bind(this),
      ['GET']
    );

    // Health check endpoint
    this.addRoute(
      new URLPattern({ pathname: '/health' }),
      this.handleHealthCheck.bind(this),
      ['GET']
    );

    // Session management routes
    this.addRoute(
      new URLPattern({ pathname: '/lsp/session/:sessionId' }),
      this.handleSessionManagement.bind(this),
      ['GET', 'POST', 'DELETE']
    );

    // Metrics endpoint
    this.addRoute(
      new URLPattern({ pathname: '/metrics' }),
      this.handleMetrics.bind(this),
      ['GET']
    );
  }

  /**
   * Add a new route with pattern matching
   */
  addRoute(pattern: URLPattern, handler: RouteHandler, methods: string[] = ['GET'], middleware: MiddlewareFunction[] = []): void {
    this.routes.push({
      pattern,
      handler,
      methods: methods.map(m => m.toUpperCase()),
      middleware
    });

    this.logger.info('Added route', {
      pathname: pattern.pathname,
      methods,
      hasMiddleware: middleware.length > 0
    });
  }

  /**
   * Add a new WebSocket route
   */
  addWebSocketRoute(pattern: URLPattern, handler: WebSocketHandler, middleware: WebSocketMiddlewareFunction[] = []): void {
    this.wsRoutes.push({
      pattern,
      handler,
      middleware
    });

    this.logger.info('Added WebSocket route', {
      pathname: pattern.pathname,
      hasMiddleware: middleware.length > 0
    });
  }

  /**
   * Add global WebSocket middleware
   */
  addWebSocketMiddleware(middleware: WebSocketMiddlewareFunction): void {
    this.wsMiddleware.push(middleware);
  }

  /**
   * Add global middleware
   */
  addMiddleware(middleware: MiddlewareFunction): void {
    this.middleware.push(middleware);
  }

  /**
   * Route incoming requests using URLPattern matching
   */
  async route(request: Request): Promise<Response | undefined | unknown> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    this.logger.info('Routing request', {
      method,
      url: request.url,
      pathname: url.pathname
    });

    // Check for WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      for (const wsRoute of this.wsRoutes) {
        const match = wsRoute.pattern.exec(url);
        if (match) {
          const params: Record<string, string> = {};
          Object.entries(match.pathname.groups).forEach(([key, value]) => {
            if (value !== undefined) params[key] = value;
          });
          Object.entries(match.search.groups).forEach(([key, value]) => {
            if (value !== undefined) params[key] = value;
          });

          this.logger.info('WebSocket route matched', {
            pattern: wsRoute.pattern.pathname,
            params
          });

          // Apply global WS middleware and prepare data
          // Return route data to set ws.data
          return { params, route: wsRoute };
        }
      }

      this.logger.warn('No matching WebSocket route found', {
        url: request.url,
        pathname: url.pathname
      });

      return new Response(JSON.stringify({
        error: 'WebSocket Upgrade Not Allowed',
        message: `No WebSocket route found for ${url.pathname}`
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find matching HTTP route
    for (const route of this.routes) {
      if (!route.methods?.includes(method)) continue;

      const match = route.pattern.exec(url);
      if (match) {
        const params: Record<string, string> = {};
        Object.entries(match.pathname.groups).forEach(([key, value]) => {
          if (value !== undefined) params[key] = value;
        });
        Object.entries(match.search.groups).forEach(([key, value]) => {
          if (value !== undefined) params[key] = value;
        });

        this.logger.info('Route matched', {
          pattern: route.pattern.pathname,
          params,
          method
        });

        try {
          // Apply global middleware
          let processedRequest = request;
          for (const middleware of this.middleware) {
            const result = await middleware(processedRequest, params);
            if (result instanceof Response) {
              return result; // Middleware returned a response
            }
            processedRequest = result;
          }

          // Apply route-specific middleware
          if (route.middleware) {
            for (const middleware of route.middleware) {
              const result = await middleware(processedRequest, params);
              if (result instanceof Response) {
                return result;
              }
              processedRequest = result;
            }
          }

          // Call the route handler
          const response = await route.handler(processedRequest, params);
          
          this.logger.info('Route handler completed', {
            pattern: route.pattern.pathname,
            status: response.status,
            method
          });

          return response;

        } catch (error) {
          this.logger.error('Route handler error', {
            pattern: route.pattern.pathname,
            error: error instanceof Error ? error.message : String(error),
            method
          });

          return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // No matching route found
    this.logger.warn('No matching route found', {
      method,
      url: request.url,
      pathname: url.pathname
    });

    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `No route found for ${method} ${url.pathname}`
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Text Document Completion Handler
   */
  private async handleTextDocumentCompletion(request: Request, params: Record<string, string>): Promise<Response> {
    const body = await request.json();
    const { textDocument, position } = body;

    this.logger.info('Processing textDocument/completion', {
      uri: textDocument?.uri,
      position
    });

    const completionItems: Array<{ label: string; kind: number; detail: string; documentation: string }> = [
      {
        label: 'console',
        kind: 9, // Module
        detail: 'Console object for logging',
        documentation: 'The console module provides a simple debugging console'
      },
      {
        label: 'process',
        kind: 9, // Module
        detail: 'Process object',
        documentation: 'The process object provides information about the current Node.js process'
      },
      {
        label: 'Bun',
        kind: 9, // Module
        detail: 'Bun runtime object',
        documentation: 'Bun is a fast all-in-one JavaScript runtime'
      }
    ];

    // Check for dictionary suggestions based on completion context
    // This is a simplified implementation - in a real LSP, you'd have access to the actual document content
    const lineContext = position.line?.toString() || ''; // Simplified: assuming we can get some context
    const character = position.character || 0;

    // Extract word prefix being completed (simplified analysis)
    const wordMatch = lineContext.match(/(\w+)$/);
    const wordPrefix = wordMatch ? wordMatch[1] : '';

    if (wordPrefix.length > 2) { // Only suggest for longer words to avoid noise
      const dictionarySuggestions = this.getDictionarySuggestions(wordPrefix);
      completionItems.push(...dictionarySuggestions);
    }

    return new Response(JSON.stringify({
      items: completionItems,
      isIncomplete: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Text Document Hover Handler
   */
  private async handleTextDocumentHover(request: Request, params: Record<string, string>): Promise<Response> {
    const body = await request.json();
    const { textDocument, position } = body;

    this.logger.info('Processing textDocument/hover', {
      uri: textDocument?.uri,
      position
    });

    const hoverInfo = {
      contents: {
        kind: 'markdown',
        value: '```typescript\nconst console: Console\n```\n\nThe console module provides a simple debugging console.'
      },
      range: {
        start: { line: position.line, character: position.character },
        end: { line: position.line, character: position.character + 7 }
      }
    };

    return new Response(JSON.stringify(hoverInfo), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Text Document Definition Handler
   */
  private async handleTextDocumentDefinition(request: Request, params: Record<string, string>): Promise<Response> {
    const body = await request.json();
    const { textDocument, position } = body;

    this.logger.info('Processing textDocument/definition', {
      uri: textDocument?.uri,
      position
    });

    const definition = {
      uri: textDocument?.uri,
      range: {
        start: { line: 10, character: 0 },
        end: { line: 15, character: 0 }
      }
    };

    return new Response(JSON.stringify([definition]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Text Document Formatting Handler
   */
  private async handleTextDocumentFormatting(request: Request, params: Record<string, string>): Promise<Response> {
    const body = await request.json();
    const { textDocument, options } = body;

    this.logger.info('Processing textDocument/formatting', {
      uri: textDocument?.uri,
      options
    });

    // Simulate formatting edits
    const edits = [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 1, character: 0 }
        },
        newText: 'Formatted content\n'
      }
    ];

    return new Response(JSON.stringify(edits), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Workspace Symbol Handler
   */
  private async handleWorkspaceSymbol(request: Request, params: Record<string, string>): Promise<Response> {
    const body = await request.json();
    const { query } = body;

    this.logger.info('Processing workspace/symbol', { query });

    const symbols = [
      {
        name: 'EnhancedLSPRouter',
        kind: 5, // Class
        location: {
          uri: 'file:///path/to/enhanced-lsp-router.ts',
          range: {
            start: { line: 10, character: 0 },
            end: { line: 50, character: 0 }
          }
        }
      }
    ];

    return new Response(JSON.stringify(symbols), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Workspace Execute Command Handler
   */
  private async handleWorkspaceExecuteCommand(request: Request, params: Record<string, string>): Promise<Response> {
    const body = await request.json();
    const { command, arguments: args } = body;

    this.logger.info('Processing workspace/executeCommand', {
      command,
      arguments: args
    });

    // Simulate command execution
    const result = {
      success: true,
      message: `Command "${command}" executed successfully`
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Diagnostics Handler with query parameters
   */
  private async handleDiagnostics(request: Request, params: Record<string, string>): Promise<Response> {
    const url = new URL(request.url);
    const file = url.searchParams.get('file');

    if (!file) {
      return new Response(JSON.stringify({
        error: 'Missing file parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    this.logger.info('Processing diagnostics', { file });

    const diagnostics = [
      {
        range: {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 }
        },
        severity: 1, // Error
        message: 'Consider using const instead of let',
        source: 'bun-lsp',
        code: 'prefer-const'
      },
      {
        range: {
          start: { line: 20, character: 8 },
          end: { line: 20, character: 12 }
        },
        severity: 2, // Warning
        message: 'Unused variable',
        source: 'bun-lsp',
        code: 'unused-var'
      }
    ];

    return new Response(JSON.stringify({ items: diagnostics }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Health Check Handler
   */
  private async handleHealthCheck(request: Request, params: Record<string, string>): Promise<Response> {
    this.logger.debug('Processing health check');

    // Gather comprehensive health data
    const memoryUsage = process.memoryUsage();
    const healthData = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: process.uptime(),
        human: new Date(process.uptime() * 1000).toISOString().substr(11, 8) // HH:MM:SS format
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid
      },
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        heapUsedPercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        external: memoryUsage.external,
        arrayBuffers: (memoryUsage as any).arrayBuffers || 0
      },
      router: {
        httpRoutes: this.routes.length,
        wsRoutes: this.wsRoutes.length,
        activeSubscriptions: this.subscriptions.size,
        totalWebSocketConnections: Array.from(this.subscriptions.values()).reduce((sum, connSet) => sum + connSet.size, 0),
        dictionarySize: this.dictionary.size
      },
      version: '1.0.0',
      capabilities: {
        websocket: true,
        pubsub: true,
        dictionary: true,
        middleware: true,
        logging: true
      }
    };

    // Check for potential issues
    const warningConditions = [
      memoryUsage.heapUsed > memoryUsage.heapTotal * 0.9, // Over 90% heap usage
      process.uptime() > 24 * 60 * 60, // Uptime > 24 hours
    ];

    if (warningConditions.some(condition => condition)) {
      healthData.status = 'degraded';
      this.logger.warn('Health check shows degraded system state');
    }

    // Check for recovery
    const criticalConditions = [
      memoryUsage.heapUsed > memoryUsage.heapTotal * 0.98, // Over 98% heap usage
      !process.connected, // Process disconnected from parent
    ];

    if (criticalConditions.some(condition => condition)) {
      healthData.status = 'unhealthy';
      this.logger.error('Health check shows critical system state');
    }

    return new Response(JSON.stringify(healthData, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Session Management Handler with path parameters
   */
  private async handleSessionManagement(request: Request, params: Record<string, string>): Promise<Response> {
    const { sessionId } = params;
    const method = request.method.toUpperCase();

    this.logger.info('Processing session management', {
      sessionId,
      method
    });

    switch (method) {
      case 'GET':
        return new Response(JSON.stringify({
          sessionId,
          status: 'active',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      case 'POST':
        const body = await request.json();
        return new Response(JSON.stringify({
          sessionId,
          action: 'created',
          clientInfo: body.clientInfo
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      case 'DELETE':
        return new Response(JSON.stringify({
          sessionId,
          action: 'closed'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({
          error: 'Method not allowed'
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  }

  /**
   * Metrics Handler
   */
  private async handleMetrics(request: Request, params: Record<string, string>): Promise<Response> {
    this.logger.debug('Processing metrics request');

    const metrics = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeRoutes: this.routes.length,
      requests: {
        total: 100,
        successful: 95,
        failed: 5
      }
    };

    return new Response(JSON.stringify(metrics), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get route statistics
   */
  getRouteStats(): RouteStats[] {
    return this.routes.map(route => ({
      pattern: route.pattern.pathname,
      methods: route.methods || [],
      hasMiddleware: (route.middleware && route.middleware.length > 0) || false
    }));
  }

  /**
   * WebSocket LSP connection handler
   */
  private handleWebSocketLSPConnection(ws: ServerWebSocket, params: Record<string, string>): void {
    this.logger.info('WebSocket LSP connection established', params);
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '1.0.0',
        capabilities: {
          textDocumentSync: 1
        }
      }
    }));
  }

  /**
   * Handle WebSocket open event
   */
  public handleWebSocketOpen(data: any, ws: ServerWebSocket): void {
    this.logger.info('WebSocket connection opened');
    const typedData = data as { params: Record<string, string>; route: WebSocketRouteConfig };
    if (typedData) {
      this.logger.info('WS route handler executing', typedData.params);
      typedData.route.handler(ws, typedData.params);
    }
  }

  /**
   * Handle WebSocket message event
   */
  public handleWebSocketMessage(ws: ServerWebSocket, message: unknown): void {
    this.logger.info('WebSocket message received', { length: typeof message === 'string' ? message.length : 'binary' });
    // Handle LSP JSON-RPC messages here
    if (typeof message === 'string') {
      try {
        const jsonMessage = JSON.parse(message);
        this.logger.info('LSP message', jsonMessage);
        // Echo back for demo
        if (jsonMessage.id) {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: jsonMessage.id, result: 'echo' }));
        }
      } catch (error) {
        this.logger.error('Invalid JSON message', error);
      }
    }
  }

  /**
   * Handle WebSocket close event
   */
  public handleWebSocketClose(ws: ServerWebSocket, code: number, reason: string): void {
    this.logger.info('WebSocket connection closed', { code, reason });
    // Note: Bun automatically cleans up ws.subscriptions on close
  }

  /**
   * Subscribe WebSocket to a topic
   */
  public subscribeWebSocket(ws: ServerWebSocket, topic: string): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(ws);
    this.logger.debug('WebSocket subscribed to topic', { topic, subscriptions: Array.from(this.subscriptions.get(topic)!).length });
  }

  /**
   * Unsubscribe WebSocket from a topic
   */
  public unsubscribeWebSocket(ws: ServerWebSocket, topic: string): void {
    const topicSet = this.subscriptions.get(topic);
    if (topicSet) {
      topicSet.delete(ws);
      if (topicSet.size === 0) {
        this.subscriptions.delete(topic);
      }
      this.logger.debug('WebSocket unsubscribed from topic', { topic });
    }
  }

  /**
   * Broadcast message to all subscribers of a topic
   */
  public broadcastToTopic(topic: string, message: string): void {
    const clients = this.subscriptions.get(topic);
    if (clients) {
      let broadcastCount = 0;
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          broadcastCount++;
        }
      }
      this.logger.debug('Broadcasted to topic', { topic, clients: broadcastCount });
    }
  }

  /**
   * Get subscriptions for a WebSocket connection
   */
  public getWebSocketSubscriptions(ws: ServerWebSocket): string[] {
    const topics: string[] = [];
    for (const [topic, clients] of this.subscriptions) {
      if (clients.has(ws)) {
        topics.push(topic);
      }
    }
    return topics;
  }

  /**
   * Initialize dictionary with common words for completion suggestions
   */
  private initializeDictionary(): void {
    // Common programming-related words and concepts
    this.dictionary.set('function', {
      definition: 'A reusable block of code that performs a specific task',
      synonyms: ['method', 'procedure', 'routine', 'subroutine']
    });

    this.dictionary.set('variable', {
      definition: 'A named storage location that holds a value',
      synonyms: ['var', 'identifier', 'symbol', 'constant']
    });

    this.dictionary.set('class', {
      definition: 'A blueprint for creating objects with properties and methods',
      synonyms: ['type', 'structure', 'blueprint', 'template']
    });

    this.dictionary.set('interface', {
      definition: 'A contract that defines methods and properties that implementing classes must provide',
      synonyms: ['contract', 'protocol', 'specification', 'API']
    });

    this.dictionary.set('async', {
      definition: 'Operations that run asynchronously without blocking the execution thread',
      synonyms: ['asynchronous', 'non-blocking', 'concurrent', 'parallel']
    });

    this.dictionary.set('promise', {
      definition: 'An object representing the eventual completion or failure of an asynchronous operation',
      synonyms: ['future', 'deferred', 'pending', 'resolution']
    });

    this.dictionary.set('array', {
      definition: 'A data structure that stores a collection of elements accessible by index',
      synonyms: ['list', 'collection', 'vector', 'sequence']
    });

    this.dictionary.set('object', {
      definition: 'A collection of key-value pairs representing a structured data entity',
      synonyms: ['entity', 'record', 'struct', 'instance']
    });

    this.dictionary.set('string', {
      definition: 'A sequence of characters representing text data',
      synonyms: ['text', 'char', 'literal', 'string literal']
    });

    this.dictionary.set('boolean', {
      definition: 'A data type that can have one of two values: true or false',
      synonyms: ['bool', 'flag', 'truth value', 'logical value']
    });

    this.dictionary.set('null', {
      definition: 'A value representing the intentional absence of any object value',
      synonyms: ['empty', 'void', 'nil', 'none']
    });

    this.dictionary.set('undefined', {
      definition: 'A value representing a variable that has been declared but not assigned a value',
      synonyms: ['unassigned', 'unset', 'not defined', 'uninitialized']
    });

    this.logger.info('Dictionary initialized with common programming terms');
  }

  /**
   * Get dictionary suggestions for unknown words
   */
  private getDictionarySuggestions(word: string): Array<{ label: string; kind: number; detail: string; documentation: string }> {
    const suggestions: Array<{ label: string; kind: number; detail: string; documentation: string }> = [];

    // Check for exact match
    const exactMatch = this.dictionary.get(word.toLowerCase());
    if (exactMatch) {
      suggestions.push({
        label: word,
        kind: 18, // Value - represents a dictionary entry
        detail: `Dictionary: ${exactMatch.definition}`,
        documentation: exactMatch.definition
      });
    }

    // Check for similar words (simple fuzzy matching)
    const similarWords = Array.from(this.dictionary.entries())
      .filter(([key]) => key.includes(word.toLowerCase()) || word.toLowerCase().includes(key))
      .slice(0, 3); // Limit to 3 suggestions

    similarWords.forEach(([key, entry]) => {
      if (key !== word.toLowerCase()) { // Avoid duplicates
        suggestions.push({
          label: key,
          kind: 18,
          detail: `Did you mean: ${entry.definition}`,
          documentation: `Synonyms: ${entry.synonyms.join(', ')}`
        });
      }
    });

    return suggestions;
  }
}

// Interfaces
interface RouteStats {
  pattern: string;
  methods: string[];
  hasMiddleware: boolean;
}

// Example middleware functions
export async function loggingMiddleware(request: Request, params: Record<string, string>): Promise<Request> {
  console.log(`[Middleware] ${request.method} ${request.url} - Params:`, params);
  return request;
}

export async function authMiddleware(request: Request, params: Record<string, string>): Promise<Request | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return request;
}

export async function rateLimitMiddleware(request: Request, params: Record<string, string>): Promise<Request | Response> {
  // Simple rate limiting logic
  const clientIP = request.headers.get('X-Forwarded-For') || 'unknown';
  console.log(`[RateLimit] Request from ${clientIP}`);
  return request;
}

// Usage example
if (import.meta.main) {
  const router = new EnhancedLSPRouter();

  // Add middleware
  router.addMiddleware(loggingMiddleware);
  router.addMiddleware(rateLimitMiddleware);

  console.log('🚀 Starting Enhanced LSP Router with URLPattern API...');

  Bun.serve({
    port: 50045,
    async fetch(request, server) {
      // Try WebSocket upgrade first
      if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        // Attempt WebSocket upgrade
        if (server.upgrade(request)) {
          return; // WebSocket upgrade successful
        } else {
          return new Response('WebSocket upgrade failed', { status: 400 });
        }
      }

      // Handle HTTP requests
      return await (router.route(request) as any);
    },
    websocket: {
      open(ws) {
        router.handleWebSocketOpen(ws.data, ws);
      },
      message(ws, message) {
        router.handleWebSocketMessage(ws, message);
      },
      close(ws, code, reason) {
        router.handleWebSocketClose(ws, code, reason);
      }
    }
  });

  console.log('✅ Enhanced LSP Router started on port 50045');
  console.log('📊 Route patterns:', router.getRouteStats());
}
