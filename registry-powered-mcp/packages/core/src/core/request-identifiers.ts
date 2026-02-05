/**
 * Request Identifier System v2.5 - Agent-UUID-v7
 *
 * Implements UUID v7 with timestamp sorting for causal ordering
 * of concurrent PTY events in the edge lattice.
 *
 * Key Features:
 * - Timestamp-based UUID generation (RFC 9562)
 * - Causal ordering for distributed systems
 * - Edge lattice request sequencing
 * - PTY event causal consistency
 */

// UUID v7 implementation with causal ordering
export class RequestIdentifier {
  private static lastTimestamp = 0;

  /**
   * Generate a UUID v7 with timestamp for causal ordering
   * Format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
   */
  static generate(): string {
    const timestamp = Date.now();
    const timeBytes = new ArrayBuffer(8);
    const timeView = new DataView(timeBytes);

    // Ensure monotonic timestamp (handle clock skew)
    const monotonicTimestamp = timestamp > this.lastTimestamp ? timestamp : this.lastTimestamp + 1;
    this.lastTimestamp = monotonicTimestamp;

    timeView.setBigUint64(0, BigInt(monotonicTimestamp), false);

    // Extract time components (milliseconds since Unix epoch)
    const timeHigh = Math.floor(monotonicTimestamp / 65536);
    const timeLow = monotonicTimestamp % 65536;

    // Generate random components
    const randomBytes = crypto.getRandomValues(new Uint8Array(10));

    // Build UUID v7 (RFC 9562 format)
    const uuid = new Uint8Array(16);

    // Time-based components (48 bits)
    uuid[0] = (timeHigh >>> 24) & 0xFF;
    uuid[1] = (timeHigh >>> 16) & 0xFF;
    uuid[2] = (timeHigh >>> 8) & 0xFF;
    uuid[3] = timeHigh & 0xFF;

    uuid[4] = (timeLow >>> 8) & 0xFF;
    uuid[5] = timeLow & 0xFF;

    // Version 7 (4 bits) + random (12 bits)
    uuid[6] = 0x70 | ((randomBytes[0] || 0) >>> 4); // Version 7 in high 4 bits
    uuid[7] = (((randomBytes[0] || 0) & 0x0F) << 4) | ((randomBytes[1] || 0) >>> 4);

    // Variant 2 (2 bits) + random (62 bits)
    uuid[8] = 0x80 | ((randomBytes[1] || 0) & 0x3F); // Variant 2 in high 2 bits

    // Remaining random bytes (7 bytes needed for indices 9-15)
    uuid.set(randomBytes.slice(2, 9), 9);

    // Format as UUID string
    return this.formatUUID(uuid);
  }

  /**
   * Compare two UUID v7 strings for causal ordering
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  static compare(a: string, b: string): number {
    // Parse UUIDs to extract timestamps
    const timeA = this.extractTimestamp(a);
    const timeB = this.extractTimestamp(b);

    if (timeA !== timeB) {
      return timeA < timeB ? -1 : 1;
    }

    // If timestamps are equal, compare full UUID lexicographically
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  /**
   * Extract timestamp from UUID v7 string
   */
  private static extractTimestamp(uuid: string): number {
    const parts = uuid.split('-');
    if (parts.length !== 5 || !parts[0] || !parts[1]) return 0;

    // Reconstruct timestamp from first two parts
    const timeHigh = parseInt(parts[0], 16);
    const timeLow = parseInt(parts[1].substring(0, 4), 16);

    return (timeHigh * 65536) + timeLow;
  }

  /**
   * Format Uint8Array as UUID string
   */
  private static formatUUID(bytes: Uint8Array): string {
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  /**
   * Generate multiple UUIDs with guaranteed ordering
   */
  static generateBatch(count: number): string[] {
    const uuids: string[] = [];
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      uuids.push(RequestIdentifier.generate());
    }

    // Verify ordering
    for (let i = 1; i < uuids.length; i++) {
      const prevUuid = uuids[i-1];
      const currUuid = uuids[i];
      if (prevUuid && currUuid && RequestIdentifier.compare(prevUuid, currUuid) >= 0) {
        console.warn(`[RequestIdentifier] Ordering violation detected in batch generation`);
      }
    }

    const duration = performance.now() - startTime;
    console.log(`[RequestIdentifier] Generated ${count} UUIDs in ${duration.toFixed(3)}ms`);

    return uuids;
  }

  /**
   * Validate UUID v7 format and ordering
   */
  static validate(uuid: string): boolean {
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * PTY Event Sequencer - Causal ordering for terminal events
 */
export class PTYEventSequencer {
  private eventQueues: Map<string, PTYEvent[]> = new Map();

  /**
   * Add PTY event with causal ordering
   */
  addEvent(sessionId: string, event: PTYEvent): void {
    if (!this.eventQueues.has(sessionId)) {
      this.eventQueues.set(sessionId, []);
    }

    const events = this.eventQueues.get(sessionId);
    if (!events) return;

    // Find insertion point using causal ordering
    const insertIndex = this.findInsertPosition(events, event);
    events.splice(insertIndex, 0, event);

    console.log(`[PTYSequencer] Added event ${event.id} to session ${sessionId} at position ${insertIndex}`);
  }

  /**
   * Get ordered events for a session
   */
  getOrderedEvents(sessionId: string): PTYEvent[] {
    return this.eventQueues.get(sessionId) || [];
  }

  /**
   * Process next event in causal order
   */
  processNextEvent(sessionId: string): PTYEvent | null {
    const events = this.eventQueues.get(sessionId);
    if (!events || events.length === 0) {
      return null;
    }

    // Events are already ordered, return first one
    const event = events.shift()!;
    console.log(`[PTYSequencer] Processing event ${event.id} for session ${sessionId}`);
    return event;
  }

  /**
   * Binary search for insertion position
   */
  private findInsertPosition(events: PTYEvent[], newEvent: PTYEvent): number {
    let left = 0;
    let right = events.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midEvent = events[mid];
      if (midEvent && midEvent.id && RequestIdentifier.compare(midEvent.id, newEvent.id) < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  /**
   * Get sequencing statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalSessions: this.eventQueues.size,
      sessions: {}
    };

    for (const [sessionId, events] of this.eventQueues.entries()) {
      if (events && events.length > 0) {
        stats.sessions[sessionId] = {
          queuedEvents: events.length,
          oldestEvent: events[0]?.timestamp || null,
          newestEvent: events[events.length - 1]?.timestamp || null
        };
      } else {
        stats.sessions[sessionId] = {
          queuedEvents: 0,
          oldestEvent: null,
          newestEvent: null
        };
      }
    }

    return stats;
  }
}

/**
 * PTY Event interface
 */
export interface PTYEvent {
  id: string;
  sessionId: string;
  type: 'input' | 'output' | 'resize' | 'close';
  data: any;
  timestamp: number;
  sequence: number;
}

/**
 * Edge Lattice Request Manager
 */
export class EdgeLatticeRequestManager {
  private sequencer = new PTYEventSequencer();
  private activeRequests = new Map<string, any>();

  /**
   * Create ordered request for edge lattice
   */
  createOrderedRequest(sessionId: string, data: any): string {
    const requestId = RequestIdentifier.generate();

    const event: PTYEvent = {
      id: requestId,
      sessionId: sessionId || 'default',
      type: 'input',
      data,
      timestamp: Date.now(),
      sequence: this.activeRequests.size
    };

    this.sequencer.addEvent(sessionId || 'default', event);
    this.activeRequests.set(requestId, event);

    return requestId;
  }

  /**
   * Process next request in causal order
   */
  processNextRequest(sessionId: string): any | null {
    const event = this.sequencer.processNextEvent(sessionId || 'default');
    if (event && event.id) {
      this.activeRequests.delete(event.id);
      return event.data;
    }
    return null;
  }

  /**
   * Get lattice statistics
   */
  getLatticeStats() {
    return {
      activeRequests: this.activeRequests.size,
      sequencingStats: this.sequencer.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Global instances
export const ptySequencer = new PTYEventSequencer();
export const latticeManager = new EdgeLatticeRequestManager();