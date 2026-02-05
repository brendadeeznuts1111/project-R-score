// SecureMessageChannel — Tier-1380 Zero-trust Inter-Context Communication
// Implements comprehensive MessageEvent.source validation

export interface SecurityIncident {
  type: string;
  source: MessageEventSource | null;
  data: any;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class CSRFProtector {
  private tokens: Map<string, string> = new Map();
  private tokenExpiry: number = 300000; // 5 minutes

  generateToken(context: string): string {
    const token = Bun.hash.crc32(`${context}${Date.now()}${Math.random()}`).toString(36);
    this.tokens.set(context, token);

    // Auto-expire tokens
    setTimeout(() => {
      this.tokens.delete(context);
    }, this.tokenExpiry);

    return token;
  }

  verifyToken(token: string): boolean {
    for (const [context, stored] of this.tokens) {
      if (stored === token) {
        // One-time use token
        this.tokens.delete(context);
        return true;
      }
    }
    return false;
  }
}

export class ThreatIntelligence {
  private incidents: SecurityIncident[] = [];
  private lockdownThreshold: number = 3;
  private lockdownDuration: number = 600000; // 10 minutes
  private lockedSources: WeakSet<MessageEventSource> = new WeakSet();

  report(incident: SecurityIncident): void {
    this.incidents.push(incident);
    console.warn('🚨 Security Incident:', incident);

    // Check for repeated incidents from same source
    const recentIncidents = this.incidents.filter(
      i => i.type === incident.type &&
      i.source === incident.source &&
      Date.now() - i.timestamp < 300000 // 5 minutes
    );

    if (recentIncidents.length >= this.lockdownThreshold) {
      this.triggerLockdown(incident.source!);
    }
  }

  private triggerLockdown(source: MessageEventSource): void {
    console.error('🔒 SECURITY LOCKDOWN TRIGGERED');
    this.lockedSources.add(source);

    // Auto-release after lockdown duration
    setTimeout(() => {
      this.lockedSources.delete(source);
      console.log('🔓 Lockdown released');
    }, this.lockdownDuration);
  }

  isLocked(source: MessageEventSource): boolean {
    return this.lockedSources.has(source);
  }

  getIncidentReport(): SecurityIncident[] {
    return [...this.incidents];
  }
}

export class SecureWorkerPool {
  private static ports: WeakSet<MessagePort> = new WeakSet();
  private static workers: WeakSet<Worker> = new WeakSet();

  static registerPort(port: MessagePort): void {
    this.ports.add(port);
  }

  static registerWorker(worker: Worker): void {
    this.workers.add(worker);
  }

  static hasPort(port: MessagePort): boolean {
    return this.ports.has(port);
  }

  static validateWorker(source: any): boolean {
    return source && this.workers.has(source);
  }
}

export class SecureMessageChannel {
  private csrfProtector: CSRFProtector;
  private allowedOrigins: Set<string>;
  private threatIntelligence: ThreatIntelligence;
  private messageHandlers: Map<string, Function> = new Map();
  private lockdownDuration: number = 600000; // 10 minutes

  constructor(allowedOrigins?: string[]) {
    this.csrfProtector = new CSRFProtector();
    this.allowedOrigins = new Set(allowedOrigins || [
      'https://tier-1380.local',
      'https://secure-worker.internal',
      'http://localhost:3002',
      'https://localhost:3002',
      'http://localhost:3000',
      'https://localhost:3000'
    ]);
    this.threatIntelligence = new ThreatIntelligence();
  }

  handleMessage(event: MessageEvent): boolean {
    // Check if source is locked down
    if (event.source && this.threatIntelligence.isLocked(event.source)) {
      console.warn('🔒 Message from locked source rejected');
      return false;
    }

    // Critical: Validate event.source === expected port/window
    if (!this.validateSource(event.source)) {
      this.threatIntelligence.report({
        type: 'message_origin_spoof',
        source: event.source,
        data: event.data,
        timestamp: Date.now(),
        severity: 'critical'
      });
      return false;
    }

    // Validate data integrity after source verification
    if (!this.validateMessageData(event.data)) {
      this.threatIntelligence.report({
        type: 'invalid_message_data',
        source: event.source,
        data: event.data,
        timestamp: Date.now(),
        severity: 'high'
      });
      return false;
    }

    // Process secure message
    this.processSecureData(event);
    return true;
  }

  private validateSource(source: MessageEventSource | null): boolean {
    // Null source indicates cross-origin restrictions or closed context
    if (source === null) {
      return false; // Reject messages from unknown/disconnected sources
    }

    // For WindowProxy (iframes): check origin
    if (typeof window !== 'undefined' && source instanceof Window) {
      try {
        return this.allowedOrigins.has(source.location.origin);
      } catch {
        // Cross-origin WindowProxy throws on location access
        return false;
      }
    }

    // For MessagePort (Workers): verify port authenticity
    if (source instanceof MessagePort) {
      // Validate this is the expected port from our SecureWorker pool
      return SecureWorkerPool.hasPort(source);
    }

    // For Worker: verify worker authenticity
    if (source instanceof Worker) {
      return SecureWorkerPool.validateWorker(source);
    }

    // For ServiceWorker: verify registration
    if (source && typeof source === 'object' && 'scope' in source) {
      return this.validateServiceWorker(source as any);
    }

    return false;
  }

  private validateServiceWorker(worker: any): boolean {
    // ServiceWorker validation logic
    if (!worker.scope) return false;

    try {
      const origin = new URL(worker.scope).origin;
      return this.allowedOrigins.has(origin);
    } catch {
      return false;
    }
  }

  private validateMessageData(data: any): boolean {
    // Basic data validation
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for required CSRF token
    if (!this.csrfProtector.verifyToken(data._csrf)) {
      console.warn('Invalid or missing CSRF token');
      return false;
    }

    // Validate message type
    if (!data.type || typeof data.type !== 'string') {
      return false;
    }

    return true;
  }

  private processSecureData(event: MessageEvent): void {
    const { data } = event;
    const handler = this.messageHandlers.get(data.type);

    if (handler) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error processing secure message:', error);
        this.threatIntelligence.report({
          type: 'message_processing_error',
          source: event.source,
          data: { error: error instanceof Error ? error.message : String(error), originalData: data },
          timestamp: Date.now(),
          severity: 'medium'
        });
      }
    } else {
      console.log('🔒 Processing secure message:', data.type);
    }
  }

  // Register message handlers
  on(messageType: string, handler: Function): void {
    this.messageHandlers.set(messageType, handler);
  }

  // Generate CSRF token for outgoing messages
  generateCSRFToken(context: string = 'default'): string {
    return this.csrfProtector.generateToken(context);
  }

  // Add allowed origin
  addAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }

  // Remove allowed origin
  removeAllowedOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }

  // Get security statistics
  getSecurityStats(): {
    incidents: SecurityIncident[];
    lockedSourcesCount: number;
    allowedOrigins: string[];
  } {
    // Note: WeakSet doesn't have size property, so we track count differently
    const allIncidents = this.threatIntelligence.getIncidentReport();
    const lockedCount = allIncidents.filter((i: SecurityIncident) =>
      i.type === 'message_origin_spoof' &&
      Date.now() - i.timestamp < this.lockdownDuration
    ).length;

    return {
      incidents: allIncidents,
      lockedSourcesCount: lockedCount,
      allowedOrigins: Array.from(this.allowedOrigins)
    };
  }

  // Create secure message payload
  createSecureMessage(type: string, data: any, context?: string): any {
    return {
      type,
      data,
      _csrf: this.generateCSRFToken(context),
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const secureMessageChannel = new SecureMessageChannel();
