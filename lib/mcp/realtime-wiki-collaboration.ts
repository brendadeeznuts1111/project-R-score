// @see https://bun.com/docs/runtime/http/websockets — Bun.serve WebSocket / ServerWebSocket
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// lib/mcp/realtime-wiki-collaboration.ts — Real-time collaboration via Bun-native WebSockets

import { EventEmitter } from 'events';
import { WikiTemplate, WikiGenerationResult } from './wiki-generator-mcp';
import { AdvancedCacheManager } from '../utils/advanced-cache-manager';
import { type DocumentId, type UserId, asUserId } from '../types/branded.ts';

/** Per-socket context attached in server.upgrade({ data }) */
type CollabSocketData = {
  user?: User;
  token?: string | null;
};

type CollabWS = ServerWebSocket<CollabSocketData>;

const WS_OPEN = 1; // WebSocket.OPEN

export interface CollaborationConfig {
  port: number;
  enableAuthentication: boolean;
  maxConnections: number;
  heartbeatInterval: number;
  enablePresence: boolean;
  enableCursors: boolean;
  enableComments: boolean;
  enableVersionControl: boolean;
  conflictResolution: 'last-write-wins' | 'operational-transform' | 'crdt';
}

export interface User {
  id: string; // brand-ok — opaque entity primary key
  name: string;
  email?: string;
  avatar?: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: string[];
  joinedAt: number;
  lastSeen: number;
  cursor?: CursorPosition;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface CursorPosition {
  documentId: DocumentId;
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  userId: UserId;
  timestamp: number;
  id: string; // brand-ok — opaque entity primary key
}

export interface Comment {
  id: string; // brand-ok — opaque entity primary key
  documentId: DocumentId;
  userId: UserId;
  content: string;
  position: {
    line: number;
    column: number;
    selection?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  };
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  replies: Comment[];
  reactions: Array<{ userId: string; emoji: string; createdAt: number }>;
}

export interface DocumentState {
  id: string; // brand-ok — opaque entity primary key
  content: string;
  version: number;
  lastModified: number;
  modifiedBy: string;
  activeUsers: string[];
  operations: DocumentOperation[];
  comments: Comment[];
  locks: Array<{ userId: string; section: string; lockedAt: number }>;
}

export interface PresenceUpdate {
  userId: UserId;
  documentId: DocumentId;
  cursor?: CursorPosition;
  selection?: CursorPosition['selection'];
  status: User['status'];
  timestamp: number;
}

export interface CollaborationEvent {
  type:
    | 'user-joined'
    | 'user-left'
    | 'cursor-update'
    | 'document-changed'
    | 'comment-added'
    | 'comment-resolved'
    | 'section-locked'
    | 'section-unlocked'
    | 'presence-update';
  userId: UserId;
  documentId?: DocumentId;
  data: any;
  timestamp: number;
}

/**
 * Real-time Wiki Collaboration System with WebSocket support
 */
export class RealtimeWikiCollaboration extends EventEmitter {
  private config: CollaborationConfig;
  private server?: ReturnType<typeof Bun.serve>;
  private users = new Map<string, User>();
  private documents = new Map<string, DocumentState>();
  private connections = new Map<CollabWS, string>(); // socket -> userId
  private userConnections = new Map<string, CollabWS[]>(); // userId -> sockets
  private cache: AdvancedCacheManager;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private operationHistory = new Map<string, DocumentOperation[]>();
  private conflictResolver: ConflictResolver;

  constructor(config: Partial<CollaborationConfig> = {}) {
    super();

    this.config = {
      port: 8080,
      enableAuthentication: true,
      maxConnections: 100,
      heartbeatInterval: 30000, // 30 seconds
      enablePresence: true,
      enableCursors: true,
      enableComments: true,
      enableVersionControl: true,
      conflictResolution: 'operational-transform',
      ...config,
    };

    this.cache = new AdvancedCacheManager({
      maxSize: 500,
      ttl: 60 * 60 * 1000, // 1 hour
      enableLRU: true,
      enableMetrics: true,
    });

    this.conflictResolver = new ConflictResolver(this.config.conflictResolution);
  }

  /**
   * Start the collaboration server (Bun.serve + websocket upgrade)
   */
  public async start(): Promise<void> {
    try {
      const self = this;
      this.server = Bun.serve({
        port: this.config.port,
        fetch(req, server) {
          if (self.connections.size >= self.config.maxConnections) {
            return new Response('Server overloaded', { status: 503 });
          }
          const token = self.extractAuthToken(req);
          const upgraded = server.upgrade(req, {
            data: { token } satisfies CollabSocketData,
          });
          if (!upgraded) {
            return new Response('WebSocket upgrade failed', { status: 400 });
          }
          // Successful upgrade: no Response body (Bun protocol)
          return undefined as unknown as Response;
        },
        websocket: {
          maxPayloadLength: 1024 * 1024,
          idleTimeout: 120,
          data: {} as CollabSocketData,
          open(ws) {
            void self.onSocketOpen(ws as CollabWS);
          },
          message(ws, message) {
            const user = (ws as CollabWS).data.user;
            if (!user) return;
            const buf =
              typeof message === 'string'
                ? Buffer.from(message)
                : Buffer.from(message as ArrayBuffer);
            void self.handleMessage(ws as CollabWS, user, buf);
          },
          close(ws, code, reason) {
            const user = (ws as CollabWS).data.user;
            if (user) {
              self.handleDisconnection(ws as CollabWS, user, code, Buffer.from(reason ?? ''));
            }
          },
          error(ws, error) {
            const user = (ws as CollabWS).data.user;
            console.error(`WebSocket error for user ${user?.id ?? 'unknown'}:`, error);
          },
        },
      });

      this.startHeartbeat();

      console.info(`Collaboration server started on port ${this.config.port}`);
      this.emit('started');
    } catch (error) {
      console.error('Failed to start collaboration server:', error);
      throw error;
    }
  }

  /**
   * Stop the collaboration server
   */
  public async stop(): Promise<void> {
    try {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      }

      for (const [ws, userId] of this.connections.entries()) {
        ws.close();
        this.handleUserDisconnect(userId);
      }

      this.connections.clear();
      this.userConnections.clear();

      this.server?.stop(true);
      this.server = undefined;

      await this.cache.destroy();

      console.info('Collaboration server stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('Error stopping collaboration server:', error);
      throw error;
    }
  }

  /**
   * After upgrade: authenticate and register socket (Bun websocket.open)
   */
  private async onSocketOpen(ws: CollabWS): Promise<void> {
    try {
      let user: User | null = null;
      const token = ws.data.token ?? null;

      if (this.config.enableAuthentication) {
        user = await this.authenticateUser(token);
        if (!user) {
          ws.close(4001, 'Authentication failed');
          return;
        }
      } else {
        user = {
          id: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: 'Anonymous User',
          role: 'editor',
          permissions: ['read', 'write'],
          joinedAt: Date.now(),
          lastSeen: Date.now(),
          status: 'online',
        };
      }

      ws.data.user = user;
      this.connections.set(ws, user.id);

      if (!this.userConnections.has(user.id)) {
        this.userConnections.set(user.id, []);
      }
      this.userConnections.get(user.id)!.push(ws);

      user.lastSeen = Date.now();
      user.status = 'online';
      this.users.set(user.id, user);

      await this.sendInitialState(ws, user);

      this.broadcastEvent(
        {
          type: 'user-joined',
          userId: asUserId(user.id),
          data: {
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          },
          timestamp: Date.now(),
        },
        user.id
      );

      this.emit('user-joined', user);
    } catch (error) {
      console.error('Error handling connection:', error);
      ws.close(4000, 'Internal server error');
    }
  }

  /**
   * Handle WebSocket messages
   */
  private async handleMessage(ws: CollabWS, user: User, data: Buffer): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      user.lastSeen = Date.now();

      switch (message.type) {
        case 'cursor-update':
          if (this.config.enableCursors) {
            await this.handleCursorUpdate(user, message.data);
          }
          break;

        case 'document-operation':
          await this.handleDocumentOperation(user, message.data);
          break;

        case 'comment-add':
          if (this.config.enableComments) {
            await this.handleCommentAdd(user, message.data);
          }
          break;

        case 'comment-resolve':
          if (this.config.enableComments) {
            await this.handleCommentResolve(user, message.data);
          }
          break;

        case 'section-lock':
          await this.handleSectionLock(user, message.data);
          break;

        case 'section-unlock':
          await this.handleSectionUnlock(user, message.data);
          break;

        case 'presence-update':
          if (this.config.enablePresence) {
            await this.handlePresenceUpdate(user, message.data);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from user ${user.id}:`, error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          timestamp: Date.now(),
        })
      );
    }
  }

  /**
   * Handle cursor position updates
   */
  private async handleCursorUpdate(user: User, data: CursorPosition): Promise<void> {
    user.cursor = data;

    // Update document state
    const document = this.documents.get(data.documentId);
    if (document) {
      // Broadcast cursor update to other users in the same document
      this.broadcastToDocument(
        data.documentId,
        {
          type: 'cursor-update',
          userId: asUserId(user.id),
          data,
          timestamp: Date.now(),
        },
        asUserId(user.id)
      );
    }

    this.emit('cursor-update', user, data);
  }

  /**
   * Handle document operations (insert, delete, format)
   */
  private async handleDocumentOperation(user: User, data: DocumentOperation): Promise<void> {
    const document = this.documents.get(data.documentId);
    if (!document) {
      return;
    }

    // Apply conflict resolution
    const resolvedOperation = await this.conflictResolver.resolve(
      data,
      document.operations,
      document.content
    );

    // Apply operation to document
    const newContent = this.applyOperation(document.content, resolvedOperation);

    // Update document state
    document.content = newContent;
    document.version++;
    document.lastModified = Date.now();
    document.modifiedBy = user.id;
    document.operations.push(resolvedOperation);

    // Keep operation history manageable
    if (document.operations.length > 1000) {
      document.operations = document.operations.slice(-500);
    }

    // Cache updated document
    await this.cache.set(`doc:${data.documentId}`, document);

    // Broadcast to other users
    this.broadcastToDocument(
      data.documentId,
      {
        type: 'document-changed',
        userId: asUserId(user.id),
        data: {
          operation: resolvedOperation,
          version: document.version,
          content: newContent,
        },
        timestamp: Date.now(),
      },
      asUserId(user.id)
    );

    this.emit('document-changed', user, data.documentId, resolvedOperation);
  }

  /**
   * Handle comment addition
   */
  private async handleCommentAdd(user: User, data: Partial<Comment>): Promise<void> {
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId: data.documentId!,
      userId: asUserId(user.id),
      content: data.content!,
      position: data.position!,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolved: false,
      replies: [],
      reactions: [],
    };

    const document = this.documents.get(data.documentId!);
    if (document) {
      document.comments.push(comment);
      await this.cache.set(`doc:${data.documentId!}`, document);

      // Broadcast comment addition
      this.broadcastToDocument(data.documentId!, {
        type: 'comment-added',
        userId: asUserId(user.id),
        data: comment,
        timestamp: Date.now(),
      });

      this.emit('comment-added', user, comment);
    }
  }

  /**
   * Handle comment resolution
   */
  private async handleCommentResolve(
    user: User,
    data: { commentId: string; documentId: DocumentId }
  ): Promise<void> {
    const document = this.documents.get(data.documentId);
    if (!document) return;

    const comment = document.comments.find(c => c.id === data.commentId);
    if (comment) {
      comment.resolved = true;
      comment.updatedAt = Date.now();

      await this.cache.set(`doc:${data.documentId}`, document);

      // Broadcast comment resolution
      this.broadcastToDocument(data.documentId, {
        type: 'comment-resolved',
        userId: asUserId(user.id),
        data: { commentId: data.commentId },
        timestamp: Date.now(),
      });

      this.emit('comment-resolved', user, comment);
    }
  }

  /**
   * Handle section locking
   */
  private async handleSectionLock(
    user: User,
    data: { documentId: DocumentId; section: string }
  ): Promise<void> {
    const document = this.documents.get(data.documentId);
    if (!document) return;

    // Check if section is already locked
    const existingLock = document.locks.find(lock => lock.section === data.section);
    if (existingLock && existingLock.userId !== user.id) {
      // Section is locked by another user
      this.sendToUser(user.id, {
        type: 'section-lock-denied',
        data: { section: data.section, lockedBy: existingLock.userId },
        timestamp: Date.now(),
      });
      return;
    }

    // Add or update lock
    document.locks.push({
      userId: user.id,
      section: data.section,
      lockedAt: Date.now(),
    });

    await this.cache.set(`doc:${data.documentId}`, document);

    // Broadcast lock
    this.broadcastToDocument(data.documentId, {
      type: 'section-locked',
      userId: asUserId(user.id),
      data: { section: data.section },
      timestamp: Date.now(),
    });

    this.emit('section-locked', user, data.documentId, data.section);
  }

  /**
   * Handle section unlocking
   */
  private async handleSectionUnlock(
    user: User,
    data: { documentId: DocumentId; section: string }
  ): Promise<void> {
    const document = this.documents.get(data.documentId);
    if (!document) return;

    // Remove lock
    document.locks = document.locks.filter(
      lock => !(lock.section === data.section && lock.userId === user.id)
    );

    await this.cache.set(`doc:${data.documentId}`, document);

    // Broadcast unlock
    this.broadcastToDocument(data.documentId, {
      type: 'section-unlocked',
      userId: asUserId(user.id),
      data: { section: data.section },
      timestamp: Date.now(),
    });

    this.emit('section-unlocked', user, data.documentId, data.section);
  }

  /**
   * Handle presence updates
   */
  private async handlePresenceUpdate(user: User, data: Partial<PresenceUpdate>): Promise<void> {
    if (data.status) {
      user.status = data.status;
    }

    // Broadcast presence update
    this.broadcastEvent({
      type: 'presence-update',
      userId: asUserId(user.id),
      data: {
        status: user.status,
        documentId: data.documentId,
      },
      timestamp: Date.now(),
    });

    this.emit('presence-update', user, data);
  }

  /**
   * Apply operation to document content
   */
  private applyOperation(content: string, operation: DocumentOperation): string {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position)
        );

      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + (operation.length || 0))
        );

      case 'retain':
        // Retain operations don't change content
        return content;

      default:
        return content;
    }
  }

  /**
   * Broadcast event to all connected users
   */
  private broadcastEvent(event: CollaborationEvent, excludeUserId?: string): void {
    const message = JSON.stringify(event);

    for (const [ws, userId] of this.connections.entries()) {
      if (userId !== excludeUserId && ws.readyState === WS_OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Broadcast event to users in a specific document
   */
  private broadcastToDocument(
    documentId: DocumentId,
    event: CollaborationEvent,
    excludeUserId?: UserId
  ): void {
    const message = JSON.stringify(event);

    for (const [ws, userId] of this.connections.entries()) {
      if (
        userId !== excludeUserId &&
        ws.readyState === WS_OPEN &&
        this.isUserInDocument(userId, documentId)
      ) {
        ws.send(message);
      }
    }
  }

  /**
   * Send message to specific user
   */
  private sendToUser(userId: string, message: any): void {
    const connections = this.userConnections.get(userId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WS_OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  /**
   * Send initial state to newly connected user
   */
  private async sendInitialState(ws: CollabWS, user: User): Promise<void> {
    const state = {
      user,
      activeUsers: Array.from(this.users.values()),
      documents: Array.from(this.documents.values()).map(doc => ({
        id: doc.id,
        version: doc.version,
        activeUsers: doc.activeUsers,
        comments: doc.comments,
        locks: doc.locks,
      })),
    };

    ws.send(
      JSON.stringify({
        type: 'initial-state',
        data: state,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Handle user disconnection
   */
  private handleDisconnection(ws: CollabWS, user: User, code: number, reason: Buffer): void {
    // Remove connection
    this.connections.delete(ws);

    const userConnections = this.userConnections.get(user.id);
    if (userConnections) {
      const index = userConnections.indexOf(ws);
      if (index > -1) {
        userConnections.splice(index, 1);
      }

      // If user has no more connections, mark as offline
      if (userConnections.length === 0) {
        this.handleUserDisconnect(user.id);
      }
    }
  }

  /**
   * Handle complete user disconnect
   */
  private handleUserDisconnect(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    user.status = 'offline';
    user.lastSeen = Date.now();

    // Remove user from all documents
    for (const document of this.documents.values()) {
      const index = document.activeUsers.indexOf(userId);
      if (index > -1) {
        document.activeUsers.splice(index, 1);
      }

      // Remove user's locks
      document.locks = document.locks.filter(lock => lock.userId !== userId);
    }

    // Broadcast user left event
    this.broadcastEvent({
      type: 'user-left',
      userId: asUserId(userId),
      data: {
        name: user.name,
      },
      timestamp: Date.now(),
    });

    this.emit('user-left', user);
  }

  /**
   * Check if user is in a document
   */
  private isUserInDocument(userId: string, documentId: string): boolean {
    const document = this.documents.get(documentId);
    return document ? document.activeUsers.includes(userId) : false;
  }

  /**
   * Extract authentication token from request
   */
  private extractAuthToken(request: Request): string | null {
    // Try query parameter first
    const url = new URL(request.url || '', `http://localhost:${this.config.port}`);
    const token = url.searchParams.get('token');

    if (token) return token;

    // Try Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Authenticate user with token
   */
  private async authenticateUser(token: string | null): Promise<User | null> {
    if (!token) return null;

    try {
      // This would integrate with your authentication system
      // For now, return a mock user for demonstration
      return {
        id: `user_${token.substring(0, 8)}`,
        name: 'Authenticated User',
        email: 'user@example.com',
        role: 'editor',
        permissions: ['read', 'write'],
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'online',
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Start heartbeat timer for connection health
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      for (const [ws, userId] of this.connections.entries()) {
        const user = this.users.get(userId);

        // Check if user connection is stale
        if (user && now - user.lastSeen > this.config.heartbeatInterval * 2) {
          ws.close(1000, 'stale');
          this.handleUserDisconnect(userId);
          continue;
        }

        // Send ping
        if (ws.readyState === WS_OPEN) {
          ws.send(
            JSON.stringify({
              type: 'ping',
              timestamp: now,
            })
          );
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Get collaboration statistics
   */
  public getStats() {
    return {
      activeUsers: this.users.size,
      activeConnections: this.connections.size,
      activeDocuments: this.documents.size,
      cacheStats: this.cache.getStats(),
    };
  }
}

/**
 * Conflict Resolver for different strategies
 */
class ConflictResolver {
  private strategy: CollaborationConfig['conflictResolution'];

  constructor(strategy: CollaborationConfig['conflictResolution']) {
    this.strategy = strategy;
  }

  async resolve(
    operation: DocumentOperation,
    history: DocumentOperation[],
    currentContent: string
  ): Promise<DocumentOperation> {
    switch (this.strategy) {
      case 'last-write-wins':
        return operation; // Simplest strategy

      case 'operational-transform':
        return this.transformOperation(operation, history, currentContent);

      case 'crdt':
        return this.resolveWithCRDT(operation, history, currentContent);

      default:
        return operation;
    }
  }

  private transformOperation(
    operation: DocumentOperation,
    history: DocumentOperation[],
    currentContent: string
  ): DocumentOperation {
    // Simplified operational transform
    // In a real implementation, this would be more sophisticated
    let transformedOp = { ...operation };

    for (const historicalOp of history) {
      if (historicalOp.timestamp > operation.timestamp) {
        // Transform against this historical operation
        if (historicalOp.type === 'insert' && historicalOp.position <= transformedOp.position) {
          transformedOp.position += historicalOp.content?.length || 0;
        } else if (
          historicalOp.type === 'delete' &&
          historicalOp.position < transformedOp.position
        ) {
          transformedOp.position -= historicalOp.length || 0;
        }
      }
    }

    return transformedOp;
  }

  private resolveWithCRDT(
    operation: DocumentOperation,
    history: DocumentOperation[],
    currentContent: string
  ): DocumentOperation {
    // Simplified CRDT resolution
    // In a real implementation, this would use proper CRDT algorithms
    return operation;
  }
}

export default RealtimeWikiCollaboration;
