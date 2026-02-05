import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

interface WorkflowUpdate {
  id: string;
  status: string;
  currentStep: string;
  updatedAt: string;
}

interface ApprovalUpdate {
  workflowId: string;
  stepId: string;
  approver: string;
  comments?: string;
  approvedAt: string;
}

class BettingWorkflowWebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(
    private serverUrl: string = 'http://localhost:3000',
    private jwtSecret?: string
  ) {}

  /**
   * Connect to the WebSocket server with authentication
   */
  async connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Generate token if secret provided
      const authToken = token || (this.jwtSecret ? this.generateToken() : undefined);

      this.socket = io(this.serverUrl, {
        auth: authToken ? { token: authToken } : undefined,
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('🔌 Connected to WebSocket server');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from WebSocket server:', reason);

        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        this.handleReconnect();
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
        }
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to workflow-specific updates
   */
  subscribeToWorkflow(workflowId: string): void {
    if (!this.socket) {
      throw new Error('Not connected to WebSocket server');
    }

    this.socket.emit('subscribe_workflow', workflowId);
    console.log(`📡 Subscribed to workflow: ${workflowId}`);
  }

  /**
   * Unsubscribe from workflow-specific updates
   */
  unsubscribeFromWorkflow(workflowId: string): void {
    if (!this.socket) {
      throw new Error('Not connected to WebSocket server');
    }

    this.socket.emit('unsubscribe_workflow', workflowId);
    console.log(`🚫 Unsubscribed from workflow: ${workflowId}`);
  }

  /**
   * Authenticate with JWT token (alternative to constructor auth)
   */
  authenticate(token: string): void {
    if (!this.socket) {
      throw new Error('Not connected to WebSocket server');
    }

    this.socket.emit('authenticate', token);
  }

  /**
   * Set up event listeners for workflow updates
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Authentication events
    this.socket.on('authenticated', (data: { userId: string }) => {
      console.log('✅ WebSocket authenticated for user:', data.userId);
      this.emit('authenticated', data);
    });

    this.socket.on('authentication_error', (data: { message: string }) => {
      console.error('❌ WebSocket authentication failed:', data.message);
      this.emit('authentication_error', data);
    });

    // Subscription events
    this.socket.on('subscribed', (data: { workflowId: string }) => {
      console.log('✅ Subscribed to workflow:', data.workflowId);
      this.emit('subscribed', data);
    });

    this.socket.on('unsubscribed', (data: { workflowId: string }) => {
      console.log('🚫 Unsubscribed from workflow:', data.workflowId);
      this.emit('unsubscribed', data);
    });

    // Workflow events
    this.socket.on('workflow.created', (workflow: WorkflowUpdate) => {
      console.log('🆕 Workflow created:', workflow.id);
      this.emit('workflow.created', workflow);
    });

    this.socket.on('workflow.updated', (workflow: WorkflowUpdate) => {
      console.log('📝 Workflow updated:', workflow.id, workflow.status);
      this.emit('workflow.updated', workflow);
    });

    this.socket.on('workflow.approved', (approval: ApprovalUpdate) => {
      console.log('✅ Workflow step approved:', approval.workflowId, approval.stepId);
      this.emit('workflow.approved', approval);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('🔌 WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  /**
   * Generate a JWT token for testing (only if secret provided)
   */
  private generateToken(): string {
    if (!this.jwtSecret) {
      throw new Error('JWT secret not provided');
    }

    return jwt.sign(
      {
        userId: 'test-user',
        username: 'test@example.com',
        role: 'user',
        permissions: ['workflows:read', 'workflows:create'],
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  // Event emitter functionality
  private eventListeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(l => l !== listener);
    }
  }

  private emit(event: string, ...args: any[]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Getters
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get connectionId(): string | undefined {
    return this.socket?.id;
  }
}

// ===== USAGE EXAMPLES =====

async function basicWebSocketExample() {
  console.log('🚀 Starting basic WebSocket client example...\n');

  const client = new BettingWorkflowWebSocketClient();

  try {
    // Connect to server
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Set up event listeners
    client.on('workflow.created', (workflow: WorkflowUpdate) => {
      console.log('🎉 New workflow created:', {
        id: workflow.id,
        status: workflow.status,
        step: workflow.currentStep
      });
    });

    client.on('workflow.updated', (workflow: WorkflowUpdate) => {
      console.log('📈 Workflow updated:', {
        id: workflow.id,
        status: workflow.status,
        lastUpdate: workflow.updatedAt
      });
    });

    client.on('workflow.approved', (approval: ApprovalUpdate) => {
      console.log('👍 Workflow approved:', {
        workflowId: approval.workflowId,
        stepId: approval.stepId,
        approver: approval.approver,
        comments: approval.comments
      });
    });

    // Subscribe to a specific workflow (replace with actual workflow ID)
    const testWorkflowId = 'test-workflow-id';
    client.subscribeToWorkflow(testWorkflowId);

    console.log('🎧 Listening for workflow updates...');
    console.log('💡 Create or update workflows via the REST API to see real-time updates\n');

    // Keep the connection alive for demonstration
    setTimeout(() => {
      console.log('⏰ Demo timeout reached, disconnecting...');
      client.disconnect();
    }, 30000); // 30 seconds

  } catch (error) {
    console.error('❌ WebSocket example failed:', error);
  }
}

async function authenticatedWebSocketExample() {
  console.log('🔐 Starting authenticated WebSocket client example...\n');

  // For production, use your actual JWT token
  const jwtToken = process.env.JWT_TOKEN || 'your-jwt-token-here';

  const client = new BettingWorkflowWebSocketClient();

  try {
    // Connect with authentication
    await client.connect(jwtToken);
    console.log('✅ Connected and authenticated successfully\n');

    // The server will automatically join user-specific rooms based on JWT
    console.log('👤 User-specific notifications enabled');

    // Subscribe to multiple workflows
    const workflowIds = ['workflow-1', 'workflow-2', 'workflow-3'];

    workflowIds.forEach(id => {
      client.subscribeToWorkflow(id);
    });

    console.log('🎧 Listening for updates on multiple workflows...\n');

    // Handle authentication events
    client.on('authenticated', (data) => {
      console.log('🔑 Authentication confirmed for user:', data.userId);
    });

    client.on('authentication_error', (error) => {
      console.error('🚫 Authentication failed:', error.message);
    });

    // Keep alive for demo
    setTimeout(() => {
      client.disconnect();
    }, 60000); // 1 minute

  } catch (error) {
    console.error('❌ Authenticated WebSocket example failed:', error);
  }
}

async function errorHandlingExample() {
  console.log('🛡️ Starting error handling WebSocket client example...\n');

  const client = new BettingWorkflowWebSocketClient('http://invalid-server:9999');

  client.on('max_reconnect_attempts_reached', () => {
    console.log('🔄 Max reconnection attempts reached, giving up');
  });

  client.on('error', (error) => {
    console.error('🚨 WebSocket error occurred:', error);
  });

  try {
    await client.connect();
  } catch (error) {
    console.log('💡 As expected, connection failed. Demonstrating error handling:');
    console.log('   - Automatic reconnection attempts');
    console.log('   - Exponential backoff');
    console.log('   - Event emission for error handling');
    console.log('   - Graceful failure after max attempts\n');

    // In a real app, you might show a user-friendly message or retry with user input
  }
}

// ===== REACT HOOK EXAMPLE =====

/*
import { useEffect, useState, useCallback } from 'react';
import { BettingWorkflowWebSocketClient } from './websocket-client';

interface UseWorkflowWebSocketOptions {
  serverUrl?: string;
  jwtToken?: string;
  autoConnect?: boolean;
}

interface UseWorkflowWebSocketReturn {
  client: BettingWorkflowWebSocketClient | null;
  isConnected: boolean;
  workflows: WorkflowUpdate[];
  approvals: ApprovalUpdate[];
  subscribeToWorkflow: (workflowId: string) => void;
  unsubscribeFromWorkflow: (workflowId: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWorkflowWebSocket(options: UseWorkflowWebSocketOptions = {}): UseWorkflowWebSocketReturn {
  const [client, setClient] = useState<BettingWorkflowWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowUpdate[]>([]);
  const [approvals, setApprovals] = useState<ApprovalUpdate[]>([]);

  const {
    serverUrl = 'http://localhost:3000',
    jwtToken,
    autoConnect = true
  } = options;

  const connect = useCallback(async () => {
    const wsClient = new BettingWorkflowWebSocketClient(serverUrl);

    // Set up event handlers
    wsClient.on('authenticated', () => setIsConnected(true));
    wsClient.on('workflow.created', (workflow) => {
      setWorkflows(prev => [...prev, workflow]);
    });
    wsClient.on('workflow.updated', (workflow) => {
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? workflow : w));
    });
    wsClient.on('workflow.approved', (approval) => {
      setApprovals(prev => [...prev, approval]);
    });

    try {
      await wsClient.connect(jwtToken);
      setClient(wsClient);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [serverUrl, jwtToken]);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
      setClient(null);
      setIsConnected(false);
    }
  }, [client]);

  const subscribeToWorkflow = useCallback((workflowId: string) => {
    if (client && isConnected) {
      client.subscribeToWorkflow(workflowId);
    }
  }, [client, isConnected]);

  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    if (client && isConnected) {
      client.unsubscribeFromWorkflow(workflowId);
    }
  }, [client, isConnected]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    client,
    isConnected,
    workflows,
    approvals,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    connect,
    disconnect
  };
}

// Usage in React component:
/*
function WorkflowDashboard() {
  const {
    isConnected,
    workflows,
    approvals,
    subscribeToWorkflow,
    unsubscribeFromWorkflow
  } = useWorkflowWebSocket({
    jwtToken: userToken,
    autoConnect: true
  });

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>

      <div>
        <h3>Recent Workflows</h3>
        {workflows.map(workflow => (
          <div key={workflow.id}>
            {workflow.id} - {workflow.status}
          </div>
        ))}
      </div>

      <div>
        <h3>Recent Approvals</h3>
        {approvals.map(approval => (
          <div key={`${approval.workflowId}-${approval.stepId}`}>
            {approval.workflowId} approved by {approval.approver}
          </div>
        ))}
      </div>
    </div>
  );
}
*/
*/

// ===== RUN EXAMPLES =====

// Uncomment to run examples
// basicWebSocketExample();
// authenticatedWebSocketExample();
// errorHandlingExample();

export { BettingWorkflowWebSocketClient };
