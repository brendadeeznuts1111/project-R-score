/**
 * WebSocket Protocol Utilities
 *
 * Helpers for working with WebSocket protocol options in Bun
 *
 * Reference: https://bun.sh/reference/bun/WebSocketOptionsProtocolsOrProtocol
 */

/**
 * WebSocket protocol options type
 * Can be either:
 * - { protocol: string } - Single protocol
 * - { protocols: string | string[] } - Multiple protocols (array or string)
 */
export type WebSocketProtocolOptions =
  | { protocol: string }
  | { protocols: string | string[] };

/**
 * Protocol negotiation helper
 */
export class ProtocolNegotiator {
  private supportedProtocols: string[];

  constructor(supportedProtocols: string[]) {
    this.supportedProtocols = supportedProtocols;
  }

  /**
   * Negotiate protocol from client request headers
   */
  negotiate(requestedProtocols: string[]): string | null {
    // Find first matching protocol (respecting client preference order)
    for (const requested of requestedProtocols) {
      if (this.supportedProtocols.includes(requested)) {
        return requested;
      }
    }
    return null; // No match found
  }

  /**
   * Create upgrade options for server.upgrade()
   * Returns the appropriate protocol options based on negotiation
   */
  createUpgradeOptions(requestedProtocols: string[]): WebSocketProtocolOptions {
    const negotiated = this.negotiate(requestedProtocols);

    if (negotiated) {
      // Use single protocol if we found a match
      return { protocol: negotiated };
    }

    // Return all supported protocols for server to choose from
    return { protocols: this.supportedProtocols };
  }

  /**
   * Parse protocols from WebSocket request headers
   */
  static parseRequestProtocols(request: Request): string[] {
    const protocolHeader = request.headers.get('sec-websocket-protocol');
    if (!protocolHeader) {
      return [];
    }
    return protocolHeader.split(',').map(p => p.trim()).filter(Boolean);
  }
}

/**
 * Create protocol options helper functions
 */
export const ProtocolOptions = {
  /**
   * Create single protocol option
   */
  single(protocol: string): { protocol: string } {
    return { protocol };
  },

  /**
   * Create multiple protocols option (array)
   */
  multiple(protocols: string[]): { protocols: string[] } {
    return { protocols };
  },

  /**
   * Create multiple protocols option (string - treated as single)
   */
  fromString(protocol: string): { protocols: string } {
    return { protocols: protocol };
  },

  /**
   * Create from client request (auto-negotiate)
   */
  fromRequest(request: Request, supportedProtocols: string[]): WebSocketProtocolOptions {
    const requested = ProtocolNegotiator.parseRequestProtocols(request);
    const negotiator = new ProtocolNegotiator(supportedProtocols);
    return negotiator.createUpgradeOptions(requested);
  },
};

/**
 * Check if protocol options object is valid
 */
export function isValidProtocolOptions(
  options: any
): options is WebSocketProtocolOptions {
  if (typeof options !== 'object' || options === null) {
    return false;
  }

  // Check for { protocol: string }
  if ('protocol' in options && typeof options.protocol === 'string') {
    return true;
  }

  // Check for { protocols: string | string[] }
  if ('protocols' in options) {
    return (
      typeof options.protocols === 'string' ||
      (Array.isArray(options.protocols) &&
        options.protocols.every((p: any) => typeof p === 'string'))
    );
  }

  return false;
}

/**
 * Normalize protocol options to consistent format
 */
export function normalizeProtocolOptions(
  options: WebSocketProtocolOptions
): { protocols: string[] } {
  if ('protocol' in options) {
    return { protocols: [options.protocol] };
  }

  if (typeof options.protocols === 'string') {
    return { protocols: [options.protocols] };
  }

  return { protocols: options.protocols };
}


