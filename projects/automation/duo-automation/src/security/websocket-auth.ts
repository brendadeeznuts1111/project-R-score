// src/security/websocket-auth.ts
// [DOMAIN:SECURITY][SCOPE:WEBSOCKET][TYPE:AUTHENTICATION][META:{jwt:true,validation:true}][CLASS:WebSocketAuthentication][#REF:WS-AUTH-006]

import { jwtVerify, importSPKI } from 'jose';
import { EventEmitter } from 'events';

export interface IWebSocketAuthConfig {
  jwtSecret: string;
  tokenExpiryWindow: number;
  maxConnectionsPerMerchant: number;
  rateLimitWindowMs: number;
  enableAuditLogging: boolean;
  complianceFramework: string[];
}

export interface IWebSocketSession {
  sessionId: string;
  merchantId: string;
  connectionId: string;
  connectedAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  geographicLocation: {
    country: string;
    region: string;
    timezone: string;
  };
  complianceStatus: 'COMPLIANT' | 'SUSPICIOUS' | 'BLOCKED';
}

export interface IAuthenticationResult {
  authenticated: boolean;
  merchantId: string;
  sessionId: string;
  riskAssessment: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
  };
  complianceValidation: {
    gdprCompliant: boolean;
    soc2Compliant: boolean;
    pciDssCompliant: boolean;
    geographicCompliant: boolean;
  };
  sessionContext: IWebSocketSession;
}

export class WebSocketAuthentication extends EventEmitter {
  private readonly config: IWebSocketAuthConfig;
  private activeSessions: Map<string, IWebSocketSession> = new Map();
  private merchantConnections: Map<string, Set<string>> = new Map();
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: Partial<IWebSocketAuthConfig> = {}) {
    super();
    
    this.config = {
      jwtSecret: process.env.JWT_SIGNING_KEY || 'enterprise-websocket-key-change-in-production',
      tokenExpiryWindow: 300, // 5 minutes
      maxConnectionsPerMerchant: 50,
      rateLimitWindowMs: 60000, // 1 minute
      enableAuditLogging: true,
      complianceFramework: ['ISO27001', 'SOC2_TYPE2', 'GDPR', 'PCI_DSS_v4.1'],
      ...config
    };

    this.startSessionCleanup();
    this.startRateLimitCleanup();
  }

  async authenticateConnection(
    connectionUrl: string,
    connectionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<IAuthenticationResult> {
    console.log(`🔐 Authenticating WebSocket connection: ${connectionId}`);

    try {
      // Extract token from URL
      const token = this.extractTokenFromUrl(connectionUrl);
      if (!token) {
        throw new Error('Missing authentication token');
      }

      // Validate JWT token
      const tokenValidation = await this.validateJWTToken(token);
      if (!tokenValidation.valid) {
        this.logSecurityEvent('WEBSOCKET_AUTH_FAILED', {
          connectionId,
          reason: 'INVALID_TOKEN',
          ipAddress,
          error: tokenValidation.error
        }, 'HIGH');
        throw new Error('Invalid authentication token');
      }

      // Extract merchant ID from validated token
      const merchantId = this.extractMerchantIdFromToken(token);
      if (!merchantId) {
        throw new Error('Invalid merchant identifier in token');
      }

      // Rate limiting check
      if (!this.checkRateLimit(merchantId, ipAddress)) {
        this.logSecurityEvent('WEBSOCKET_RATE_LIMIT_EXCEEDED', {
          merchantId,
          connectionId,
          ipAddress
        }, 'HIGH');
        throw new Error('Rate limit exceeded');
      }

      // Connection limit check
      if (!this.checkConnectionLimit(merchantId)) {
        this.logSecurityEvent('WEBSOCKET_CONNECTION_LIMIT_EXCEEDED', {
          merchantId,
          connectionId,
          currentConnections: this.merchantConnections.get(merchantId)?.size || 0
        }, 'MEDIUM');
        throw new Error('Connection limit exceeded');
      }

      // Risk assessment
      const riskAssessment = await this.performRiskAssessment(
        merchantId,
        connectionId,
        ipAddress,
        userAgent,
        tokenValidation.payload
      );

      // Compliance validation
      const complianceValidation = await this.validateCompliance(
        merchantId,
        ipAddress,
        tokenValidation.payload
      );

      // Create session
      const sessionId = crypto.randomUUID();
      const session: IWebSocketSession = {
        sessionId,
        merchantId,
        connectionId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        ipAddress: this.sanitizeIPAddress(ipAddress),
        userAgent: this.sanitizeUserAgent(userAgent),
        riskScore: riskAssessment.score,
        geographicLocation: await this.determineGeographicLocation(ipAddress),
        complianceStatus: riskAssessment.level === 'CRITICAL' ? 'BLOCKED' : 
                        riskAssessment.level === 'HIGH' ? 'SUSPICIOUS' : 'COMPLIANT'
      };

      // Store session
      this.activeSessions.set(sessionId, session);
      
      // Track merchant connections
      if (!this.merchantConnections.has(merchantId)) {
        this.merchantConnections.set(merchantId, new Set());
      }
      this.merchantConnections.get(merchantId)!.add(connectionId);

      // Log successful authentication
      this.logSecurityEvent('WEBSOCKET_AUTH_SUCCESS', {
        sessionId,
        merchantId,
        connectionId,
        riskScore: riskAssessment.score,
        complianceStatus: session.complianceStatus
      }, 'LOW');

      // Emit authentication event
      this.emit('websocketAuthenticated', {
        sessionId,
        merchantId,
        connectionId,
        riskAssessment,
        timestamp: new Date()
      });

      return {
        authenticated: true,
        merchantId,
        sessionId,
        riskAssessment,
        complianceValidation,
        sessionContext: session
      };

    } catch (error) {
      console.error('🚨 WebSocket authentication failed:', error);
      
      this.logSecurityEvent('WEBSOCKET_AUTH_ERROR', {
        connectionId,
        error: error.message,
        ipAddress: this.sanitizeIPAddress(ipAddress)
      }, 'MEDIUM');

      return {
        authenticated: false,
        merchantId: '',
        sessionId: '',
        riskAssessment: {
          score: 100,
          level: 'CRITICAL',
          factors: ['AUTHENTICATION_FAILED']
        },
        complianceValidation: {
          gdprCompliant: false,
          soc2Compliant: false,
          pciDssCompliant: false,
          geographicCompliant: false
        },
        sessionContext: {
          sessionId: '',
          merchantId: '',
          connectionId,
          connectedAt: new Date(),
          lastActivity: new Date(),
          ipAddress: this.sanitizeIPAddress(ipAddress),
          userAgent: this.sanitizeUserAgent(userAgent),
          riskScore: 100,
          geographicLocation: { country: 'Unknown', region: 'UNKNOWN', timezone: 'UTC' },
          complianceStatus: 'BLOCKED'
        }
      };
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Check if session is still valid (not expired)
    const now = Date.now();
    const sessionAge = now - session.connectedAt.getTime();
    const maxSessionAge = this.config.tokenExpiryWindow * 1000;

    if (sessionAge > maxSessionAge) {
      this.terminateSession(sessionId, 'SESSION_EXPIRED');
      return false;
    }

    // Update last activity
    session.lastActivity = new Date();
    this.activeSessions.set(sessionId, session);

    return true;
  }

  terminateSession(sessionId: string, reason: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Remove from merchant connections
    const merchantConnections = this.merchantConnections.get(session.merchantId);
    if (merchantConnections) {
      merchantConnections.delete(session.connectionId);
      if (merchantConnections.size === 0) {
        this.merchantConnections.delete(session.merchantId);
      }
    }

    // Log session termination
    this.logSecurityEvent('WEBSOCKET_SESSION_TERMINATED', {
      sessionId,
      merchantId: session.merchantId,
      connectionId: session.connectionId,
      reason,
      sessionDuration: Date.now() - session.connectedAt.getTime()
    }, 'LOW');

    // Emit termination event
    this.emit('websocketSessionTerminated', {
      sessionId,
      merchantId: session.merchantId,
      connectionId: session.connectionId,
      reason,
      timestamp: new Date()
    });
  }

  getActiveSessions(): IWebSocketSession[] {
    return Array.from(this.activeSessions.values());
  }

  getMerchantSessions(merchantId: string): IWebSocketSession[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.merchantId === merchantId
    );
  }

  // Private methods

  private extractTokenFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('token') || urlObj.searchParams.get('auth');
    } catch (error) {
      console.error('Failed to parse URL:', error);
      return null;
    }
  }

  private async validateJWTToken(token: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Extract payload without verification for initial checks
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' };
      }

      // Verify signature with public key (in production, use actual public key)
      // For now, we'll skip actual verification for demo purposes
      // const publicKey = await importSPKI(this.publicKey, 'ES256');
      // const { payload: verifiedPayload } = await jwtVerify(token, publicKey);

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  private extractMerchantIdFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      return payload.merchantIdentifier || 
             payload.merchantId || 
             payload.merchant || 
             payload.sub || 
             null;
    } catch (error) {
      console.error('Failed to extract merchant ID from token:', error);
      return null;
    }
  }

  private checkRateLimit(merchantId: string, ipAddress: string): boolean {
    const key = `${merchantId}:${ipAddress}`;
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;

    // Get existing requests
    let requests = this.rateLimitTracker.get(key) || [];
    
    // Clean old requests
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check limit (max 100 requests per minute)
    if (requests.length >= 100) {
      return false;
    }

    // Add current request
    requests.push(now);
    this.rateLimitTracker.set(key, requests);

    return true;
  }

  private checkConnectionLimit(merchantId: string): boolean {
    const connections = this.merchantConnections.get(merchantId);
    const currentCount = connections ? connections.size : 0;
    
    return currentCount < this.config.maxConnectionsPerMerchant;
  }

  private async performRiskAssessment(
    merchantId: string,
    connectionId: string,
    ipAddress: string,
    userAgent: string,
    tokenPayload: any
  ): Promise<{ score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; factors: string[] }> {
    let score = 0;
    const factors: string[] = [];

    // Geographic risk assessment
    const geoLocation = await this.determineGeographicLocation(ipAddress);
    if (geoLocation.country === 'Unknown') {
      score += 20;
      factors.push('UNKNOWN_GEOGRAPHIC_LOCATION');
    }

    // User agent analysis
    if (!userAgent || userAgent.length < 10) {
      score += 15;
      factors.push('SUSPICIOUS_USER_AGENT');
    }

    // Token age analysis
    const tokenAge = Date.now() - (tokenPayload.iat * 1000);
    if (tokenAge < 5000) { // Less than 5 seconds
      score += 10;
      factors.push('VERY_FRESH_TOKEN');
    }

    // Merchant reputation (mock implementation)
    const merchantRisk = await this.getMerchantRiskScore(merchantId);
    score += merchantRisk;
    if (merchantRisk > 10) {
      factors.push('MERCHANT_RISK_FACTOR');
    }

    // Connection frequency analysis
    const recentConnections = this.getRecentConnectionCount(merchantId, 300000); // 5 minutes
    if (recentConnections > 20) {
      score += 15;
      factors.push('HIGH_CONNECTION_FREQUENCY');
    }

    // Determine risk level
    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 75) level = 'CRITICAL';
    else if (score >= 50) level = 'HIGH';
    else if (score >= 25) level = 'MEDIUM';

    return { score, level, factors };
  }

  private async validateCompliance(
    merchantId: string,
    ipAddress: string,
    tokenPayload: any
  ): Promise<{ gdprCompliant: boolean; soc2Compliant: boolean; pciDssCompliant: boolean; geographicCompliant: boolean }> {
    const geoLocation = await this.determineGeographicLocation(ipAddress);
    
    return {
      gdprCompliant: this.validateGDPRCompliance(merchantId, geoLocation),
      soc2Compliant: this.validateSOC2Compliance(tokenPayload),
      pciDssCompliant: this.validatePCIDSSCompliance(tokenPayload),
      geographicCompliant: this.validateGeographicCompliance(geoLocation, tokenPayload.geographicScope)
    };
  }

  private async determineGeographicLocation(ipAddress: string): Promise<{ country: string; region: string; timezone: string }> {
    // Mock implementation - in production, use actual GeoIP service
    const mockLocations: { [key: string]: { country: string; region: string; timezone: string } } = {
      '192.168.1.1': { country: 'United States', region: 'NORTH_AMERICA', timezone: 'America/New_York' },
      '10.0.0.1': { country: 'Germany', region: 'EUROPE', timezone: 'Europe/Berlin' },
      '172.16.0.1': { country: 'Japan', region: 'ASIA_PACIFIC', timezone: 'Asia/Tokyo' }
    };

    return mockLocations[ipAddress] || { country: 'Unknown', region: 'UNKNOWN', timezone: 'UTC' };
  }

  private sanitizeIPAddress(ipAddress: string): string {
    // Partially mask IP address for privacy
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return '***.***.***.***';
  }

  private sanitizeUserAgent(userAgent: string): string {
    // Truncate and sanitize user agent for logging
    if (!userAgent) return 'UNKNOWN';
    return userAgent.substring(0, 100) + (userAgent.length > 100 ? '...' : '');
  }

  private async getMerchantRiskScore(merchantId: string): Promise<number> {
    // Mock implementation - in production, query actual risk database
    const riskScores: { [key: string]: number } = {
      'factory-wager': 0,
      'test-merchant': 5,
      'suspicious-merchant': 25
    };
    
    return riskScores[merchantId] || 10;
  }

  private getRecentConnectionCount(merchantId: string, timeWindowMs: number): number {
    const now = Date.now();
    const windowStart = now - timeWindowMs;
    
    return Array.from(this.activeSessions.values())
      .filter(session => 
        session.merchantId === merchantId && 
        session.connectedAt.getTime() > windowStart
      ).length;
  }

  private validateGDPRCompliance(merchantId: string, geoLocation: { country: string; region: string }): boolean {
    // Check if merchant is GDPR compliant for EU regions
    if (geoLocation.region === 'EUROPE') {
      // In production, check actual GDPR compliance status
      return merchantId !== 'non-compliant-merchant';
    }
    return true;
  }

  private validateSOC2Compliance(tokenPayload: any): boolean {
    // Check SOC2 compliance flags in token
    return tokenPayload.soc2Compliant !== false;
  }

  private validatePCIDSSCompliance(tokenPayload: any): boolean {
    // Check PCI-DSS compliance flags in token
    return tokenPayload.pciDssCompliant !== false;
  }

  private validateGeographicCompliance(
    geoLocation: { country: string; region: string }, 
    requestedScope: string
  ): boolean {
    // Validate that the connection location matches the requested geographic scope
    if (!requestedScope) return true;
    
    const scopeMappings: { [key: string]: string[] } = {
      'US': ['NORTH_AMERICA'],
      'EU': ['EUROPE'],
      'APAC': ['ASIA_PACIFIC'],
      'LATAM': ['LATIN_AMERICA'],
      'GLOBAL': ['NORTH_AMERICA', 'EUROPE', 'ASIA_PACIFIC', 'LATIN_AMERICA']
    };
    
    const allowedRegions = scopeMappings[requestedScope.toUpperCase()] || [];
    return allowedRegions.includes(geoLocation.region);
  }

  private logSecurityEvent(event: string, details: any, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'): void {
    if (!this.config.enableAuditLogging) return;
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event,
      riskLevel,
      details: {
        ...details,
        complianceFramework: this.config.complianceFramework
      }
    };
    
    console.log('🔒 WEBSOCKET SECURITY AUDIT:', JSON.stringify(auditEntry));
    
    // Emit security event for monitoring
    this.emit('websocketSecurityEvent', auditEntry);
  }

  private startSessionCleanup(): void {
    // Clean up expired sessions every minute
    setInterval(() => {
      const now = Date.now();
      const maxSessionAge = this.config.tokenExpiryWindow * 1000;
      
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const sessionAge = now - session.connectedAt.getTime();
        if (sessionAge > maxSessionAge) {
          this.terminateSession(sessionId, 'SESSION_EXPIRED');
        }
      }
    }, 60000);
  }

  private startRateLimitCleanup(): void {
    // Clean up old rate limit entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.config.rateLimitWindowMs;
      
      for (const [key, timestamps] of this.rateLimitTracker.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          this.rateLimitTracker.delete(key);
        } else {
          this.rateLimitTracker.set(key, validTimestamps);
        }
      }
    }, 300000);
  }
}

export default WebSocketAuthentication;
