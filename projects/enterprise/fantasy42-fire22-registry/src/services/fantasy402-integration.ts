#!/usr/bin/env bun

/**
 * 🎯 Fantasy402 Integration Service
 *
 * Comprehensive integration with Fantasy402 platform at https://fantasy402.com/
 * - API client with authentication
 * - WebSocket real-time connections
 * - Data synchronization
 * - Error handling and retry logic
 * - Secrets management integration
 */

import { EventEmitter } from 'events';

interface Fantasy402Config {
  apiUrl: string;
  websocketUrl: string;
  username: string;
  password: string;
  apiKey?: string;
  agentId?: string;
  accessToken?: string;
  refreshToken?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface Fantasy402Response<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

interface Fantasy402User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

interface Fantasy402Event {
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
}

class Fantasy402Client extends EventEmitter {
  private config: Fantasy402Config;
  private websocket?: WebSocket;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private sessionStoragePath: string = '.fantasy402-session.json';

  constructor(config: Partial<Fantasy402Config> = {}) {
    super();

    // Load environment variables from .env.fantasy402 if available
    this.loadEnvironmentFile();

    this.config = {
      apiUrl: process.env.FANTASY402_API_URL || 'https://api.fantasy402.com/v2',
      websocketUrl: process.env.FANTASY402_WEBSOCKET_URL || 'wss://ws.fantasy402.com/v2',
      username: process.env.FANTASY402_USERNAME || '',
      password: process.env.FANTASY402_PASSWORD || '',
      apiKey: process.env.FANTASY402_API_KEY || 'demo-key',
      agentId: process.env.FANTASY402_AGENT_ID || 'crystal-clear-agent',
      accessToken: process.env.FANTASY402_ACCESS_TOKEN,
      refreshToken: process.env.FANTASY402_REFRESH_TOKEN,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    // Load persisted session if available
    this.loadPersistedSession();

    if (!this.config.username || !this.config.password) {
      console.warn('⚠️ Fantasy402 credentials not found. Running in demo mode.');
      console.log(
        '💡 To configure credentials, edit .env.fantasy402 with your Fantasy402 username/password'
      );

      // Use demo credentials for testing
      this.config.username = 'demo_user';
      this.config.password = 'demo_pass';
    }

    // Enable console logging for token refresh
    console.log('🔧 Fantasy402 Client initialized with session storage enabled');
    console.log('📍 Session storage path:', this.sessionStoragePath);
    console.log('🔑 Username configured:', this.config.username ? '✅' : '❌');
    console.log('🔐 Password configured:', this.config.password ? '✅' : '❌');
    console.log('🎫 Existing session:', this.config.accessToken ? '✅ Found' : '❌ None');
  }

  private loadEnvironmentFile(): void {
    try {
      const { readFileSync, existsSync } = require('fs');
      const envPath = '.env.fantasy402';

      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        const envVars = this.parseEnvFile(envContent);

        // Set environment variables if not already set
        Object.entries(envVars).forEach(([key, value]) => {
          if (!process.env[key] && value && !value.includes('your_') && !value.includes('_here')) {
            process.env[key] = value;
          }
        });
      }
    } catch (error) {
      // Silently fail if we can't load the env file
    }
  }

  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          envVars[key] = value;
        }
      }
    });

    return envVars;
  }

  // ============================================================================
  // SESSION STORAGE
  // ============================================================================

  private loadPersistedSession(): void {
    try {
      const { readFileSync, existsSync } = require('fs');

      if (existsSync(this.sessionStoragePath)) {
        const sessionData = JSON.parse(readFileSync(this.sessionStoragePath, 'utf-8'));

        // Check if session is still valid
        if (sessionData.expiresAt && Date.now() < sessionData.expiresAt) {
          this.config.accessToken = sessionData.accessToken;
          this.config.refreshToken = sessionData.refreshToken;
          this.tokenExpiryTime = sessionData.expiresAt;

          console.log('📂 Loaded persisted session');
          console.log('   🎫 Token expires:', new Date(sessionData.expiresAt).toISOString());

          // Schedule refresh if token expires soon
          const timeUntilExpiry = sessionData.expiresAt - Date.now();
          if (timeUntilExpiry > 0 && timeUntilExpiry < 300000) {
            // Less than 5 minutes
            console.log('⏰ Token expires soon, scheduling refresh');
            setTimeout(() => this.refreshAccessToken(), 1000);
          }
        } else {
          console.log('🗑️ Persisted session expired, will authenticate fresh');
          this.clearPersistedSession();
        }
      } else {
        console.log('📭 No persisted session found');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted session:', error.message);
      this.clearPersistedSession();
    }
  }

  private savePersistedSession(): void {
    try {
      const { writeFileSync } = require('fs');

      const sessionData = {
        accessToken: this.config.accessToken,
        refreshToken: this.config.refreshToken,
        expiresAt: this.tokenExpiryTime,
        savedAt: Date.now(),
        username: this.config.username, // For validation
      };

      writeFileSync(this.sessionStoragePath, JSON.stringify(sessionData, null, 2));
      console.log('💾 Session saved to disk');
      console.log(
        '   📅 Expires:',
        this.tokenExpiryTime ? new Date(this.tokenExpiryTime).toISOString() : 'Unknown'
      );
    } catch (error) {
      console.warn('⚠️ Failed to save session:', error.message);
    }
  }

  private clearPersistedSession(): void {
    try {
      const { unlinkSync, existsSync } = require('fs');

      if (existsSync(this.sessionStoragePath)) {
        unlinkSync(this.sessionStoragePath);
        console.log('🗑️ Cleared persisted session');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear session:', error.message);
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Authenticating with Fantasy402...');

      // In demo mode, simulate successful authentication
      if (this.config.username === 'demo_user') {
        console.log('🎭 Demo mode: Simulating authentication...');
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay

        this.config.accessToken = 'demo_access_token_' + Date.now();
        this.config.refreshToken = 'demo_refresh_token_' + Date.now();

        const expiresIn = 3600; // 1 hour
        const expiryTime = Date.now() + expiresIn * 1000;
        this.tokenExpiryTime = expiryTime;

        console.log('✅ Fantasy402 demo authentication successful');
        this.emit('authenticated', {
          access_token: this.config.accessToken,
          refresh_token: this.config.refreshToken,
          expires_in: expiresIn,
        });
        return true;
      }

      const response = await this.makeRequest<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
          agent_id: this.config.agentId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.success && response.data) {
        this.config.accessToken = response.data.access_token;
        this.config.refreshToken = response.data.refresh_token;

        // Store token expiry time
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        const expiryTime = Date.now() + expiresIn * 1000;
        this.tokenExpiryTime = expiryTime;

        // Save session to disk
        this.savePersistedSession();

        // Schedule automatic refresh
        this.scheduleTokenRefresh(expiresIn);

        console.log('✅ Fantasy402 authentication successful');
        console.log('   🎫 Token expires in:', expiresIn, 'seconds');
        console.log('   💾 Session saved to disk');

        this.emit('authenticated', response.data);
        return true;
      }

      throw new Error(response.error || 'Authentication failed');
    } catch (error) {
      console.error('❌ Fantasy402 authentication failed:', error);
      this.emit('authError', error);
      return false;
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.config.refreshToken) {
      console.log('🔄 No refresh token available, performing full authentication');
      return await this.authenticate();
    }

    try {
      console.log('🔄 Refreshing access token...');

      const response = await this.makeRequest<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
      }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`, // Include current token
        },
      });

      if (response.success && response.data) {
        const oldToken = this.config.accessToken;
        this.config.accessToken = response.data.access_token;
        this.config.refreshToken = response.data.refresh_token;

        // Store token expiry time
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        const expiryTime = Date.now() + expiresIn * 1000;
        this.tokenExpiryTime = expiryTime;

        console.log('✅ Token refreshed successfully');
        console.log(`   Expires in: ${expiresIn} seconds`);

        // Save updated session to disk
        this.savePersistedSession();

        // Schedule automatic refresh before expiry
        this.scheduleTokenRefresh(expiresIn);

        console.log('💾 Updated session saved to disk');

        this.emit('tokenRefreshed', {
          oldToken: oldToken?.substring(0, 10) + '...',
          newToken: this.config.accessToken?.substring(0, 10) + '...',
          expiresIn,
          expiryTime: new Date(expiryTime).toISOString(),
        });

        return true;
      }

      console.warn('⚠️ Token refresh failed, attempting full authentication');
      return await this.authenticate();
    } catch (error) {
      console.error('❌ Token refresh failed:', error);

      // If refresh fails with 401, the refresh token might be expired
      if (error.message?.includes('401')) {
        console.log('🔄 Refresh token expired, performing full authentication');
        this.config.refreshToken = undefined;
      }

      return await this.authenticate();
    }
  }

  private tokenExpiryTime?: number;
  private tokenRefreshTimer?: Timer;

  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      console.log('🔄 Cleared existing refresh timer');
    }

    // Schedule refresh at 80% of token lifetime (or 5 minutes before expiry, whichever is sooner)
    const refreshBuffer = Math.min(expiresIn * 0.2, 300); // 20% or 5 minutes
    const refreshIn = (expiresIn - refreshBuffer) * 1000;
    const refreshTime = new Date(Date.now() + refreshIn);

    console.log('🕐 Token Refresh Schedule:');
    console.log(`   ⏱️  Refresh in: ${Math.floor(refreshIn / 1000)} seconds`);
    console.log(`   📅 Refresh at: ${refreshTime.toISOString()}`);
    console.log(`   🛡️  Buffer: ${refreshBuffer} seconds before expiry`);

    this.tokenRefreshTimer = setTimeout(async () => {
      console.log('⏰ Automatic token refresh triggered');
      console.log('🔄 Attempting to refresh access token...');

      const refreshed = await this.refreshAccessToken();

      if (!refreshed) {
        console.error('❌ Automatic token refresh failed');
        console.log('🚨 Will attempt full re-authentication on next request');
        this.emit('tokenRefreshFailed', { automatic: true });
      } else {
        console.log('✅ Automatic token refresh successful');
      }
    }, refreshIn);
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpiryTime) {
      return false; // Unknown expiry, assume valid
    }

    // Consider token expired if it expires within the next 60 seconds
    return Date.now() >= this.tokenExpiryTime - 60000;
  }

  getTokenExpiryInfo(): { expiresAt?: string; expiresIn?: number; isExpired: boolean } {
    if (!this.tokenExpiryTime) {
      return { isExpired: false };
    }

    const now = Date.now();
    const expiresIn = Math.max(0, Math.floor((this.tokenExpiryTime - now) / 1000));

    return {
      expiresAt: new Date(this.tokenExpiryTime).toISOString(),
      expiresIn,
      isExpired: this.isTokenExpired(),
    };
  }

  // ============================================================================
  // API METHODS
  // ============================================================================

  async getUser(userId: string): Promise<Fantasy402User | null> {
    try {
      const response = await this.makeAuthenticatedRequest<Fantasy402User>(`/users/${userId}`);
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error(`❌ Failed to get user ${userId}:`, error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<Fantasy402User | null> {
    try {
      const response = await this.makeAuthenticatedRequest<Fantasy402User>(
        `/users/by-username/${username}`
      );
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error(`❌ Failed to get user by username ${username}:`, error);
      return null;
    }
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    metadata?: any;
  }): Promise<Fantasy402User | null> {
    try {
      const response = await this.makeAuthenticatedRequest<Fantasy402User>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.success && response.data) {
        this.emit('userCreated', response.data);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      return null;
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<Fantasy402User>
  ): Promise<Fantasy402User | null> {
    try {
      const response = await this.makeAuthenticatedRequest<Fantasy402User>(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.success && response.data) {
        this.emit('userUpdated', response.data);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to update user ${userId}:`, error);
      return null;
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest('/system/status');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get system status:', error);
      return null;
    }
  }

  async syncData(dataType: string, data: any): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest(`/sync/${dataType}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.success) {
        this.emit('dataSynced', { dataType, data: response.data });
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Failed to sync ${dataType}:`, error);
      return false;
    }
  }

  // ============================================================================
  // WEBSOCKET CONNECTION
  // ============================================================================

  async connectWebSocket(): Promise<boolean> {
    try {
      if (!this.config.accessToken) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          throw new Error('Authentication required for WebSocket connection');
        }
      }

      console.log('🔌 Connecting to Fantasy402 WebSocket...');

      this.websocket = new WebSocket(
        `${this.config.websocketUrl}?token=${this.config.accessToken}`
      );

      this.websocket.onopen = () => {
        console.log('✅ Fantasy402 WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.websocket.onmessage = event => {
        try {
          const data: Fantasy402Event = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = event => {
        console.log('🔌 Fantasy402 WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.websocket.onerror = error => {
        console.error('❌ Fantasy402 WebSocket error:', error);
        this.emit('error', error);
      };

      return true;
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      return false;
    }
  }

  private handleWebSocketMessage(event: Fantasy402Event): void {
    console.log(`📨 Fantasy402 event: ${event.type}`);

    switch (event.type) {
      case 'user_login':
        this.emit('userLogin', event.data);
        break;
      case 'user_logout':
        this.emit('userLogout', event.data);
        break;
      case 'data_update':
        this.emit('dataUpdate', event.data);
        break;
      case 'system_alert':
        this.emit('systemAlert', event.data);
        break;
      default:
        this.emit('message', event);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.config.retryDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `🔄 Scheduling WebSocket reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
    this.isConnected = false;
  }

  // ============================================================================
  // HTTP REQUEST HELPERS
  // ============================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Fantasy402Response<T>> {
    const url = `${this.config.apiUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'Fantasy42-Fire22-Registry/5.1.0',
        Accept: 'application/json',
        ...options.headers,
      },
      ...options,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          data: data.data || data,
          message: data.message,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Request attempt ${attempt}/${this.config.retryAttempts} failed:`, error);

        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
      timestamp: new Date().toISOString(),
    };
  }

  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Fantasy402Response<T>> {
    // Check if we have a token and if it's expired
    if (!this.config.accessToken || this.isTokenExpired()) {
      console.log('🔄 Token missing or expired, refreshing...');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        return {
          success: false,
          error: 'Authentication failed',
          timestamp: new Date().toISOString(),
        };
      }
    }

    const authenticatedOptions: RequestInit = {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'X-Client-Version': '5.1.0',
        'X-Request-ID': this.generateRequestId(),
        ...options.headers,
      },
    };

    let response = await this.makeRequest<T>(endpoint, authenticatedOptions);

    // Handle token expiration with retry
    if (
      !response.success &&
      (response.error?.includes('401') || response.error?.includes('Unauthorized'))
    ) {
      console.log('🔄 Received 401, attempting token refresh...');

      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Update authorization header with new token
        authenticatedOptions.headers = {
          Authorization: `Bearer ${this.config.accessToken}`,
          'X-Client-Version': '5.1.0',
          'X-Request-ID': this.generateRequestId(),
          ...options.headers,
        };

        // Retry the request with new token
        console.log('🔄 Retrying request with refreshed token...');
        response = await this.makeRequest<T>(endpoint, authenticatedOptions);

        if (response.success) {
          console.log('✅ Request succeeded after token refresh');
        } else {
          console.error('❌ Request still failed after token refresh');
        }
      } else {
        console.error('❌ Token refresh failed, request cannot be completed');
      }
    }

    return response;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  isAuthenticated(): boolean {
    return !!this.config.accessToken;
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  getConfig(): Readonly<Fantasy402Config> {
    return { ...this.config };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In demo mode, simulate a successful health check
      if (this.config.username === 'demo_user') {
        console.log('🎭 Demo mode: Simulating health check...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
        return true;
      }

      const response = await this.makeRequest('/health');
      return response.success;
    } catch (error) {
      // In demo mode, return true to allow testing
      if (this.config.apiKey === 'demo_api_key') {
        return true;
      }
      return false;
    }
  }
}

// ============================================================================
// FANTASY402 SERVICE MANAGER
// ============================================================================

class Fantasy402Service {
  private client: Fantasy402Client;
  private isInitialized: boolean = false;

  constructor() {
    this.client = new Fantasy402Client();
    this.setupEventHandlers();
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Fantasy402 service...');

      // Health check
      const isHealthy = await this.client.healthCheck();
      if (!isHealthy) {
        console.warn('⚠️ Fantasy402 health check failed, but continuing...');
      }

      // Authenticate
      const authenticated = await this.client.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with Fantasy402');
      }

      // Connect WebSocket
      const connected = await this.client.connectWebSocket();
      if (!connected) {
        console.warn('⚠️ WebSocket connection failed, but continuing...');
      }

      this.isInitialized = true;
      console.log('✅ Fantasy402 service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Fantasy402 service initialization failed:', error);
      return false;
    }
  }

  private setupEventHandlers(): void {
    this.client.on('authenticated', data => {
      console.log('🔐 Fantasy402 authenticated:', data);
    });

    this.client.on('connected', () => {
      console.log('🔌 Fantasy402 WebSocket connected');
    });

    this.client.on('disconnected', data => {
      console.log('🔌 Fantasy402 WebSocket disconnected:', data);
    });

    this.client.on('userLogin', user => {
      console.log('👤 User logged in:', user);
    });

    this.client.on('userLogout', user => {
      console.log('👤 User logged out:', user);
    });

    this.client.on('dataUpdate', data => {
      console.log('📊 Data update received:', data);
    });

    this.client.on('systemAlert', alert => {
      console.log('🚨 System alert:', alert);
    });

    this.client.on('error', error => {
      console.error('❌ Fantasy402 error:', error);
    });
  }

  getClient(): Fantasy402Client {
    return this.client;
  }

  isReady(): boolean {
    return this.isInitialized && this.client.isAuthenticated();
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Fantasy402 service...');
    this.client.disconnectWebSocket();
    this.client.removeAllListeners();
    this.isInitialized = false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const fantasy402Service = new Fantasy402Service();

export { Fantasy402Client, Fantasy402Service, fantasy402Service };
export type { Fantasy402Config, Fantasy402Response, Fantasy402User, Fantasy402Event };
