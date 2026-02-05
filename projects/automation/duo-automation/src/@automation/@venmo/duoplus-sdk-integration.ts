/**
 * 📱 FactoryWager SDK Integration for Venmo Family System
 * Connects web dashboard to Android virtual device through FactoryWager SDK
 */

import { VirtualDeviceTracker } from '../../agents/virtual-device-tracker';

/**
 * 📱 FactoryWager SDK Client Interface
 */
export interface FactoryWagerSDKClient {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sendCommand(command: FactoryWagerCommand): Promise<FactoryWagerResponse>;
  subscribeToEvents(callback: (event: FactoryWagerEvent) => void): void;
  getConnectionStatus(): FactoryWagerConnectionStatus;
}

/**
 * 📡 FactoryWager Command Interface
 */
export interface FactoryWagerCommand {
  id: string;
  type: 'payment' | 'qr_scan' | 'family_sync' | 'notification' | 'app_launch';
  payload: Record<string, any>;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * 📥 FactoryWager Response Interface
 */
export interface FactoryWagerResponse {
  commandId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  processingTime: number;
}

/**
 * 📢 FactoryWager Event Interface
 */
export interface FactoryWagerEvent {
  id: string;
  type: 'payment_received' | 'qr_scanned' | 'family_updated' | 'app_launched' | 'error';
  source: 'android_device' | 'web_dashboard' | 'backend_server';
  data: Record<string, any>;
  timestamp: string;
}

/**
 * 🔌 Connection Status
 */
export interface FactoryWagerConnectionStatus {
  connected: boolean;
  deviceType: 'android_virtual' | 'android_physical' | 'ios' | 'web';
  deviceId: string;
  sdkVersion: string;
  lastPing: string;
  latency: number;
  uptime: number;
}

/**
 * 🏠 Family Sync Data
 */
export interface FamilySyncData {
  familyId: string;
  members: FamilyMemberSync[];
  transactions: TransactionSync[];
  settings: FamilySettingsSync;
  lastSync: string;
}

/**
 * 👤 Family Member Sync Data
 */
export interface FamilyMemberSync {
  memberId: string;
  name: string;
  email: string;
  role: 'parent' | 'child';
  status: 'active' | 'pending' | 'suspended';
  permissions: {
    canSendPayments: boolean;
    canReceivePayments: boolean;
    requiresApproval: boolean;
    maxTransactionAmount: number;
  };
  deviceInfo?: {
    platform: string;
    appVersion: string;
    lastActive: string;
  };
}

/**
 * 💳 Transaction Sync Data
 */
export interface TransactionSync {
  transactionId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  note: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  type: 'payment' | 'request' | 'allowance' | 'split';
  createdAt: string;
  completedAt?: string;
  deviceSource?: string;
}

/**
 * ⚙️ Family Settings Sync
 */
export interface FamilySettingsSync {
  allowUnlimitedChildPayments: boolean;
  requireParentApproval: boolean;
  approvalThreshold: number;
  notificationSettings: {
    paymentSent: boolean;
    paymentReceived: boolean;
    allowanceRequested: boolean;
    lowBalance: boolean;
  };
  autoAllowance: {
    enabled: boolean;
    amount: number;
    frequency: 'weekly' | 'monthly';
    nextAllowanceDate: string;
  };
}

/**
 * 🚀 FactoryWager SDK Implementation
 */
export class FactoryWagerSDK implements FactoryWagerSDKClient {
  private ws: WebSocket | null = null;
  private eventCallbacks: ((event: FactoryWagerEvent) => void)[] = [];
  private connectionStatus: FactoryWagerConnectionStatus = {
    connected: false,
    deviceType: 'android_virtual',
    deviceId: '',
    sdkVersion: '3.7.0',
    lastPing: '',
    latency: 0,
    uptime: 0
  };
  private commandQueue: FactoryWagerCommand[] = [];
  private pendingCommands: Map<string, {
    resolve: (response: FactoryWagerResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private heartbeatInterval: Timer | null = null;
  private virtualDeviceTracker: VirtualDeviceTracker;

  constructor(private config: {
    wsUrl: string;
    apiKey: string;
    familyId: string;
    enableRealTimeSync: boolean;
  }) {
    this.virtualDeviceTracker = new VirtualDeviceTracker();
  }

  /**
   * 🔌 Connect to FactoryWager SDK
   */
  async connect(): Promise<boolean> {
    try {
      console.log('🔌 Connecting to FactoryWager SDK...');
      
      // Initialize WebSocket connection
      this.ws = new WebSocket(`${this.config.wsUrl}?apiKey=${this.config.apiKey}&familyId=${this.config.familyId}`);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ Connected to FactoryWager SDK');
          
          this.connectionStatus.connected = true;
          this.connectionStatus.deviceId = this.generateDeviceId();
          this.connectionStatus.lastPing = new Date().toISOString();
          this.connectionStatus.uptime = Date.now();
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Process queued commands
          this.processCommandQueue();
          
          // Send initial sync command
          this.sendSyncCommand();
          
          resolve(true);
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws!.onclose = () => {
          clearTimeout(timeout);
          console.log('❌ Disconnected from FactoryWager SDK');
          this.connectionStatus.connected = false;
          this.stopHeartbeat();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ FactoryWager SDK connection error:', error);
          reject(new Error('Connection failed'));
        };
      });

    } catch (error) {
      console.error('❌ Failed to connect to FactoryWager SDK:', error);
      throw error;
    }
  }

  /**
   * 🔌 Disconnect from FactoryWager SDK
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting from FactoryWager SDK...');
      
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.stopHeartbeat();
      this.connectionStatus.connected = false;
      
      // Reject all pending commands
      this.pendingCommands.forEach(({ reject }) => {
        reject(new Error('Connection closed'));
      });
      this.pendingCommands.clear();
      
      console.log('✅ Disconnected from FactoryWager SDK');
      
    } catch (error) {
      console.error('❌ Error disconnecting from FactoryWager SDK:', error);
      throw error;
    }
  }

  /**
   * 📤 Send command to Android device
   */
  async sendCommand(command: FactoryWagerCommand): Promise<FactoryWagerResponse> {
    if (!this.connectionStatus.connected) {
      throw new Error('Not connected to FactoryWager SDK');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(command.id);
        reject(new Error('Command timeout'));
      }, 30000);

      this.pendingCommands.set(command.id, {
        resolve,
        reject,
        timeout
      });

      const message = JSON.stringify(command);
      this.ws!.send(message);
      
      console.log(`📤 Sent command: ${command.type} (${command.id})`);
    });
  }

  /**
   * 📢 Subscribe to events from Android device
   */
  subscribeToEvents(callback: (event: FactoryWagerEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * 📊 Get connection status
   */
  getConnectionStatus(): FactoryWagerConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * 📱 Send payment command to Android device
   */
  async sendPaymentCommand(paymentData: {
    toMemberId: string;
    amount: number;
    note?: string;
  }): Promise<FactoryWagerResponse> {
    const command: FactoryWagerCommand = {
      id: this.generateCommandId(),
      type: 'payment',
      payload: paymentData,
      timestamp: new Date().toISOString(),
      priority: 'high'
    };

    return this.sendCommand(command);
  }

  /**
   * 📷 Send QR scan command to Android device
   */
  async sendQRScanCommand(): Promise<FactoryWagerResponse> {
    const command: FactoryWagerCommand = {
      id: this.generateCommandId(),
      type: 'qr_scan',
      payload: { action: 'start_scanner' },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    return this.sendCommand(command);
  }

  /**
   * 🔄 Send family sync command
   */
  async sendSyncCommand(): Promise<FactoryWagerResponse> {
    const command: FactoryWagerCommand = {
      id: this.generateCommandId(),
      type: 'family_sync',
      payload: { 
        action: 'sync_family_data',
        familyId: this.config.familyId 
      },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    return this.sendCommand(command);
  }

  /**
   * 🔔 Send notification command to Android device
   */
  async sendNotificationCommand(notification: {
    title: string;
    message: string;
    type: 'payment' | 'allowance' | 'approval' | 'general';
  }): Promise<FactoryWagerResponse> {
    const command: FactoryWagerCommand = {
      id: this.generateCommandId(),
      type: 'notification',
      payload: notification,
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    return this.sendCommand(command);
  }

  /**
   * 🚀 Send app launch command to Android device
   */
  async sendAppLaunchCommand(appInfo: {
    packageName: string;
    activity?: string;
    extras?: Record<string, any>;
  }): Promise<FactoryWagerResponse> {
    const command: FactoryWagerCommand = {
      id: this.generateCommandId(),
      type: 'app_launch',
      payload: appInfo,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    return this.sendCommand(command);
  }

  /**
   * 📊 Get family data from Android device
   */
  async getFamilyData(): Promise<FamilySyncData> {
    const response = await this.sendSyncCommand();
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to sync family data');
    }

    return response.data as FamilySyncData;
  }

  /**
   * 📱 Handle incoming messages from WebSocket
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'response') {
        this.handleResponse(message);
      } else if (message.type === 'event') {
        this.handleEvent(message);
      } else if (message.type === 'heartbeat') {
        this.handleHeartbeat(message);
      } else {
        console.warn('⚠️ Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }

  /**
   * 📥 Handle command response
   */
  private handleResponse(response: any): void {
    const pending = this.pendingCommands.get(response.commandId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(response.commandId);
      
      const duoPlusResponse: FactoryWagerResponse = {
        commandId: response.commandId,
        success: response.success,
        data: response.data,
        error: response.error,
        timestamp: response.timestamp,
        processingTime: response.processingTime || 0
      };
      
      if (response.success) {
        pending.resolve(duoPlusResponse);
      } else {
        pending.reject(new Error(response.error || 'Command failed'));
      }
    }
  }

  /**
   * 📢 Handle event from Android device
   */
  private handleEvent(eventData: any): void {
    const event: FactoryWagerEvent = {
      id: eventData.id,
      type: eventData.type,
      source: eventData.source,
      data: eventData.data,
      timestamp: eventData.timestamp
    };
    
    console.log(`📢 Received event: ${event.type} from ${event.source}`);
    
    // Notify all subscribers
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error in event callback:', error);
      }
    });
    
    // Handle specific events
    this.handleSpecificEvent(event);
  }

  /**
   * 💓 Handle heartbeat message
   */
  private handleHeartbeat(heartbeat: any): void {
    this.connectionStatus.lastPing = heartbeat.timestamp;
    this.connectionStatus.latency = heartbeat.latency || 0;
    this.connectionStatus.uptime = heartbeat.uptime || this.connectionStatus.uptime;
  }

  /**
   * 📱 Handle specific events
   */
  private handleSpecificEvent(event: FactoryWagerEvent): void {
    switch (event.type) {
      case 'payment_received':
        console.log('💰 Payment received on Android device');
        break;
      case 'qr_scanned':
        console.log('📷 QR code scanned on Android device');
        this.handleQRScannedEvent(event.data);
        break;
      case 'family_updated':
        console.log('👨‍👩‍👧‍👦 Family data updated on Android device');
        break;
      case 'app_launched':
        console.log('🚀 App launched on Android device');
        break;
      case 'error':
        console.error('❌ Error from Android device:', event.data);
        break;
    }
  }

  /**
   * 📷 Handle QR code scanned event
   */
  private handleQRScannedEvent(data: any): void {
    console.log('📷 QR Code scanned:', data);
    
    // Process the QR code data
    if (data.qrData && data.qrData.startsWith('factory-wager://pay/')) {
      // This would trigger payment processing
      console.log('💰 Processing payment from QR code:', data.qrData);
    }
  }

  /**
   * 💓 Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * 💓 Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 📤 Process queued commands
   */
  private processCommandQueue(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) {
        this.sendCommand(command).catch(error => {
          console.error('❌ Failed to send queued command:', error);
        });
      }
    }
  }

  /**
   * 🆔 Generate command ID
   */
  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * 📱 Generate device ID
   */
  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

/**
 * 🏭 FactoryWager SDK Factory
 */
export class FactoryWagerSDKFactory {
  /**
   * 🚀 Create FactoryWager SDK instance
   */
  static create(config: {
    wsUrl?: string;
    apiKey?: string;
    familyId?: string;
    enableRealTimeSync?: boolean;
  }): FactoryWagerSDK {
    const defaultConfig = {
      wsUrl: config.wsUrl || 'wss://api.factory-wager.com/v1/sdk',
      apiKey: config.apiKey || process.env.FACTORY_WAGER_API_KEY || 'demo-api-key',
      familyId: config.familyId || 'demo-family-id',
      enableRealTimeSync: config.enableRealTimeSync ?? true
    };

    return new FactoryWagerSDK(defaultConfig);
  }

  /**
   * 🧪 Create demo SDK instance for testing
   */
  static createDemo(): FactoryWagerSDK {
    return new FactoryWagerSDK({
      wsUrl: 'ws://localhost:8080/demo-sdk',
      apiKey: 'demo-key',
      familyId: 'demo-family',
      enableRealTimeSync: true
    });
  }
}

/**
 * 📱 FactoryWager Web SDK Integration
 * Browser-compatible wrapper for the FactoryWager SDK
 */
export class FactoryWagerWebSDK {
  private sdk: FactoryWagerSDK;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: {
    apiKey: string;
    familyId: string;
    environment?: 'production' | 'development' | 'demo';
  }) {
    const wsUrl = config.environment === 'production' 
      ? 'wss://api.factory-wager.com/v1/sdk'
      : config.environment === 'development'
      ? 'ws://localhost:3000/sdk'
      : 'ws://localhost:8080/demo-sdk';

    this.sdk = FactoryWagerSDKFactory.create({
      wsUrl,
      apiKey: config.apiKey,
      familyId: config.familyId,
      enableRealTimeSync: true
    });

    this.setupEventForwarding();
  }

  /**
   * 🚀 Initialize the SDK
   */
  async initialize(): Promise<boolean> {
    try {
      const connected = await this.sdk.connect();
      
      if (connected) {
        this.emit('connected', this.sdk.getConnectionStatus());
      }
      
      return connected;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 📱 Send payment to family member
   */
  async sendPayment(toMemberId: string, amount: number, note?: string): Promise<any> {
    try {
      const response = await this.sdk.sendPaymentCommand({
        toMemberId,
        amount,
        note
      });
      
      this.emit('paymentSent', response);
      return response;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 📷 Start QR code scanner
   */
  async startQRScanner(): Promise<any> {
    try {
      const response = await this.sdk.sendQRScanCommand();
      this.emit('qrScannerStarted', response);
      return response;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 👨‍👩‍👧‍👦 Get family data
   */
  async getFamilyData(): Promise<FamilySyncData> {
    try {
      const data = await this.sdk.getFamilyData();
      this.emit('familyDataUpdated', data);
      return data;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 🔔 Send notification to Android device
   */
  async sendNotification(title: string, message: string, type: 'payment' | 'allowance' | 'approval' | 'general' = 'general'): Promise<any> {
    try {
      const response = await this.sdk.sendNotificationCommand({
        title,
        message,
        type
      });
      
      this.emit('notificationSent', response);
      return response;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 📊 Get connection status
   */
  getConnectionStatus(): FactoryWagerConnectionStatus {
    return this.sdk.getConnectionStatus();
  }

  /**
   * 📢 Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 📢 Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 📢 Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in event listener:', error);
        }
      });
    }
  }

  /**
   * 📱 Setup event forwarding from SDK to web listeners
   */
  private setupEventForwarding(): void {
    this.sdk.subscribeToEvents((event) => {
      this.emit(event.type, event);
    });
  }

  /**
   * 🔌 Disconnect from SDK
   */
  async disconnect(): Promise<void> {
    try {
      await this.sdk.disconnect();
      this.emit('disconnected', null);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}

// Export for global use in browser
if (typeof window !== 'undefined') {
  (window as any).FactoryWagerWebSDK = FactoryWagerWebSDK;
}

export default FactoryWagerSDK;
