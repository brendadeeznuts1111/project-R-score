import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { config } from '../config/api-config';
import { WorkflowManager } from '../../modules/workflow-manager';

export class SocketManager {
  private io: SocketServer;
  private workflowManager: WorkflowManager;

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(','),
        credentials: true
      },
      path: '/socket.io/'
    });

    this.workflowManager = new WorkflowManager();
    this.setupSocketHandlers();
    this.setupWorkflowListeners();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      // Join user-specific room
      socket.on('authenticate', (token: string) => {
        try {
          // Validate JWT token and get user info
          const decoded = jwt.verify(token, config.jwtSecret) as any;
          socket.join(`user:${decoded.userId}`);
          socket.emit('authenticated', { userId: decoded.userId });
        } catch (error) {
          socket.emit('authentication_error', { message: 'Invalid token' });
        }
      });

      // Join workflow-specific room
      socket.on('subscribe_workflow', (workflowId: string) => {
        socket.join(`workflow:${workflowId}`);
        socket.emit('subscribed', { workflowId });
      });

      // Leave workflow room
      socket.on('unsubscribe_workflow', (workflowId: string) => {
        socket.leave(`workflow:${workflowId}`);
        socket.emit('unsubscribed', { workflowId });
      });

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });
  }

  private setupWorkflowListeners(): void {
    // Listen for workflow events and broadcast to subscribers
    this.workflowManager.on('workflow.created', (workflow: any) => {
      this.io.to(`user:${workflow.createdBy}`).emit('workflow.created', workflow);
    });

    this.workflowManager.on('workflow.status_changed', (workflow: any) => {
      this.io.to(`workflow:${workflow.id}`).emit('workflow.updated', workflow);
      this.io.to(`user:${workflow.createdBy}`).emit('workflow.updated', workflow);
    });

    this.workflowManager.on('workflow.approved', (approval: any) => {
      this.io.to(`workflow:${approval.workflowId}`).emit('workflow.approved', approval);
    });
  }

  // Broadcast workflow updates
  broadcastWorkflowUpdate(workflowId: string, event: string, data: any): void {
    this.io.to(`workflow:${workflowId}`).emit(event, data);
  }

  // Send notification to specific user
  notifyUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Get connection stats
  getStats(): { totalConnections: number; rooms: string[] } {
    return {
      totalConnections: this.io.sockets.sockets.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys())
    };
  }
}
