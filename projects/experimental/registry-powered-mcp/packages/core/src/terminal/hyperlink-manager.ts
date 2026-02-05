/**
 * Hyperlink Manager
 * OSC 8 terminal hyperlink generation with security validation
 *
 * Implements OSC 8 escape sequence for terminal hyperlinks:
 * \x1b]8;params;uri\x07text\x1b]8;;\x07
 *
 * @module terminal/hyperlink-manager
 */

/**
 * Hyperlink configuration
 */
export interface HyperlinkOptions {
  /** Unique identifier for the hyperlink (auto-generated if not provided) */
  readonly id?: string;
  /** Additional OSC 8 parameters */
  readonly params?: Record<string, string>;
}

/**
 * Registered hyperlink information
 */
export interface RegisteredHyperlink {
  /** Unique identifier */
  readonly id: string;
  /** Target URL */
  readonly url: string;
  /** Display text */
  readonly text: string;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Full OSC 8 sequence */
  readonly sequence: string;
  /** Whether URL passed security validation */
  readonly isSecure: boolean;
}

/**
 * URL security validation result
 */
export interface URLSecurityResult {
  /** Whether the URL is considered safe */
  readonly valid: boolean;
  /** Detected issues */
  readonly issues: string[];
  /** Sanitized URL (or original if valid) */
  readonly sanitizedUrl: string;
}

/**
 * Allowed URL protocols for hyperlinks
 */
const ALLOWED_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'file:',
  'tel:',
]);

/**
 * OSC 8 escape sequence constants
 */
const OSC8 = {
  /** Start of hyperlink: \x1b]8; */
  START: '\x1b]8;',
  /** Bell terminator */
  BELL: '\x07',
  /** String terminator (alternative) */
  ST: '\x1b\\',
  /** Empty hyperlink (closes link) */
  END: '\x1b]8;;\x07',
} as const;

/**
 * HyperlinkManager
 * Manages OSC 8 terminal hyperlinks with security validation
 *
 * Features:
 * - Generates proper OSC 8 sequences
 * - URL security validation (protocol, injection)
 * - Hyperlink registry for tracking/cleanup
 * - Supports custom parameters (id, quantum signature)
 */
export class HyperlinkManager {
  private static instance: HyperlinkManager | null = null;
  private readonly registry = new Map<string, RegisteredHyperlink>();
  private linkCounter = 0;

  /**
   * Get singleton instance
   */
  static getInstance(): HyperlinkManager {
    if (!HyperlinkManager.instance) {
      HyperlinkManager.instance = new HyperlinkManager();
    }
    return HyperlinkManager.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    HyperlinkManager.instance = null;
  }

  /**
   * Create an OSC 8 hyperlink
   * Returns the full escape sequence wrapping the text
   */
  create(url: string, text: string, options: HyperlinkOptions = {}): string {
    // Validate and sanitize URL
    const security = this.validateURL(url);
    const safeUrl = security.sanitizedUrl;

    // Generate unique ID
    const id = options.id ?? this.generateId();

    // Build parameters string
    const params = this.buildParams(id, options.params);

    // Build full sequence
    const sequence = `${OSC8.START}${params};${safeUrl}${OSC8.BELL}${text}${OSC8.END}`;

    // Register hyperlink
    this.registry.set(id, {
      id,
      url: safeUrl,
      text,
      createdAt: Date.now(),
      sequence,
      isSecure: security.valid,
    });

    return sequence;
  }

  /**
   * Create hyperlink with quantum signature (for secure contexts)
   */
  createSigned(
    url: string,
    text: string,
    signature: string,
    options: HyperlinkOptions = {}
  ): string {
    return this.create(url, text, {
      ...options,
      params: {
        ...options.params,
        sig: signature,
      },
    });
  }

  /**
   * Create a file:// hyperlink for local files
   */
  createFileLink(path: string, text?: string): string {
    // Ensure absolute path
    const absolutePath = path.startsWith('/') ? path : `${process.cwd()}/${path}`;
    const fileUrl = `file://${absolutePath}`;
    return this.create(fileUrl, text ?? path);
  }

  /**
   * Create a mailto: hyperlink
   */
  createMailtoLink(email: string, subject?: string): string {
    let url = `mailto:${email}`;
    if (subject) {
      url += `?subject=${encodeURIComponent(subject)}`;
    }
    return this.create(url, email);
  }

  /**
   * Validate URL security
   */
  validateURL(url: string): URLSecurityResult {
    const issues: string[] = [];
    let sanitizedUrl = url;

    try {
      const parsed = new URL(url);

      // Check protocol
      if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        issues.push(`Disallowed protocol: ${parsed.protocol}`);
        // Force to https
        parsed.protocol = 'https:';
        sanitizedUrl = parsed.toString();
      }

      // Check for JavaScript injection
      if (url.toLowerCase().includes('javascript:')) {
        issues.push('JavaScript protocol injection detected');
        sanitizedUrl = 'about:blank';
      }

      // Check for data: URI (potential XSS)
      if (parsed.protocol === 'data:') {
        issues.push('Data URI not allowed');
        sanitizedUrl = 'about:blank';
      }

      // Check for embedded credentials
      if (parsed.username || parsed.password) {
        issues.push('Embedded credentials detected');
        parsed.username = '';
        parsed.password = '';
        sanitizedUrl = parsed.toString();
      }

      // Check for unusual port numbers
      const port = parseInt(parsed.port, 10);
      if (port && (port < 1 || port > 65535)) {
        issues.push(`Invalid port: ${port}`);
      }

      // Check for null bytes
      if (url.includes('\x00')) {
        issues.push('Null byte injection detected');
        sanitizedUrl = url.replace(/\x00/g, '');
      }

      // Check for newlines (HTTP header injection)
      if (/[\r\n]/.test(url)) {
        issues.push('Newline injection detected');
        sanitizedUrl = url.replace(/[\r\n]/g, '');
      }

    } catch (error) {
      issues.push(`Invalid URL: ${(error as Error).message}`);
      sanitizedUrl = 'about:blank';
    }

    return {
      valid: issues.length === 0,
      issues,
      sanitizedUrl,
    };
  }

  /**
   * Get a registered hyperlink by ID
   */
  get(id: string): RegisteredHyperlink | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all registered hyperlinks
   */
  getAll(): ReadonlyMap<string, RegisteredHyperlink> {
    return this.registry;
  }

  /**
   * Remove a hyperlink from registry
   */
  remove(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered hyperlinks
   */
  clear(): void {
    this.registry.clear();
    this.linkCounter = 0;
  }

  /**
   * Get hyperlink statistics
   */
  getStats(): {
    total: number;
    secure: number;
    insecure: number;
    byProtocol: Record<string, number>;
  } {
    let secure = 0;
    let insecure = 0;
    const byProtocol: Record<string, number> = {};

    for (const link of this.registry.values()) {
      if (link.isSecure) {
        secure++;
      } else {
        insecure++;
      }

      try {
        const protocol = new URL(link.url).protocol;
        byProtocol[protocol] = (byProtocol[protocol] ?? 0) + 1;
      } catch {
        byProtocol['invalid:'] = (byProtocol['invalid:'] ?? 0) + 1;
      }
    }

    return {
      total: this.registry.size,
      secure,
      insecure,
      byProtocol,
    };
  }

  /**
   * Check if terminal supports OSC 8 hyperlinks
   * Returns true for known supporting terminals
   */
  static isSupported(): boolean {
    const term = process.env.TERM ?? '';
    const termProgram = process.env.TERM_PROGRAM ?? '';
    const colorterm = process.env.COLORTERM ?? '';

    // Known supporting terminals
    const supportingTerminals = [
      'iTerm.app',
      'WezTerm',
      'kitty',
      'Hyper',
      'alacritty',
      'foot',
    ];

    if (supportingTerminals.some(t => termProgram.includes(t))) {
      return true;
    }

    // Check for truecolor support (common in modern terminals)
    if (colorterm === 'truecolor' || colorterm === '24bit') {
      return true;
    }

    // VTE-based terminals (GNOME Terminal, etc.)
    if (process.env.VTE_VERSION) {
      const vteVersion = parseInt(process.env.VTE_VERSION, 10);
      if (vteVersion >= 5000) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create link with fallback for unsupported terminals
   * Returns plain text if OSC 8 not supported
   */
  createWithFallback(url: string, text: string, options?: HyperlinkOptions): string {
    if (HyperlinkManager.isSupported()) {
      return this.create(url, text, options);
    }
    // Fallback: plain text with URL in parentheses
    return `${text} (${url})`;
  }

  /**
   * Parse an OSC 8 hyperlink sequence and extract components
   */
  static parse(sequence: string): {
    url: string;
    text: string;
    params: Record<string, string>;
  } | null {
    // Match OSC 8 pattern: \x1b]8;params;url\x07text\x1b]8;;\x07
    const pattern = /\x1b\]8;([^;]*);([^\x07\x1b]*?)(?:\x07|\x1b\\)(.+?)\x1b\]8;;(?:\x07|\x1b\\)/;
    const match = sequence.match(pattern);

    if (!match) return null;

    const [, paramsStr, url, text] = match;

    // Parse parameters
    const params: Record<string, string> = {};
    if (paramsStr) {
      for (const param of paramsStr.split(':')) {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = value;
        }
      }
    }

    return { url, text, params };
  }

  /**
   * Generate unique hyperlink ID
   */
  private generateId(): string {
    return `link-${++this.linkCounter}-${Date.now().toString(36)}`;
  }

  /**
   * Build OSC 8 parameters string
   */
  private buildParams(id: string, extra?: Record<string, string>): string {
    const params: string[] = [`id=${id}`];

    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        // Sanitize key/value
        const safeKey = key.replace(/[;:=\x00-\x1f]/g, '');
        const safeValue = value.replace(/[;:=\x00-\x1f]/g, '');
        params.push(`${safeKey}=${safeValue}`);
      }
    }

    return params.join(':');
  }
}

/**
 * Convenience function to create a hyperlink
 */
export function hyperlink(url: string, text: string, options?: HyperlinkOptions): string {
  return HyperlinkManager.getInstance().create(url, text, options);
}

/**
 * Create hyperlink with fallback for unsupported terminals
 */
export function hyperlinkSafe(url: string, text: string, options?: HyperlinkOptions): string {
  return HyperlinkManager.getInstance().createWithFallback(url, text, options);
}
