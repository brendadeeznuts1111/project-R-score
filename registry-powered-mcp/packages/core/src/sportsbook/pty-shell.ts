/**
 * PTY Debug Shell Manager
 * Provides interactive terminal sessions for exchange debugging
 *
 * Endpoints:
 * - GET  /mcp/exchange/shell          - Spawn new PTY session (SSE stream)
 * - POST /mcp/exchange/shell/:id/input - Send input to session
 * - POST /mcp/exchange/shell/:id/resize - Resize terminal
 * - DELETE /mcp/exchange/shell/:id    - Close session
 * - GET  /mcp/exchange/shell/sessions - List active sessions
 *
 * Features:
 * - Bun.Terminal API (v1.3.5+) for true PTY support
 * - SSE streaming for real-time output
 * - Session management with auto-cleanup
 * - Rate limiting and security controls
 *
 * SYSCALL: PTY_DEBUG_SHELL
 */

// Quiet mode for tests
const QUIET_MODE = process.env.NODE_ENV === 'test' || process.env.LATTICE_QUIET === 'true';
const log = QUIET_MODE ? (() => {}) : console.log.bind(console);

/**
 * PTY session state
 */
interface PTYSession {
  readonly id: string;
  readonly proc: ReturnType<typeof Bun.spawn>;
  readonly createdAt: number;
  readonly clientIp: string;
  cols: number;
  rows: number;
  outputBuffer: string[];
  listeners: Set<(data: string) => void>;
  lastActivity: number;
  commandCount: number;
}

/**
 * PTY shell configuration
 */
export interface PTYShellConfig {
  /** Enable PTY shell (default: true in dev, false in prod) */
  readonly enabled?: boolean;
  /** Default terminal columns (default: 120) */
  readonly defaultCols?: number;
  /** Default terminal rows (default: 40) */
  readonly defaultRows?: number;
  /** Session timeout in ms (default: 300000 = 5 minutes) */
  readonly sessionTimeoutMs?: number;
  /** Max concurrent sessions (default: 5) */
  readonly maxSessions?: number;
  /** Max output buffer lines per session (default: 1000) */
  readonly maxBufferLines?: number;
  /** Shell command (default: bash) */
  readonly shell?: string;
  /** Allowed commands prefix for security (default: empty = all allowed) */
  readonly allowedCommandPrefixes?: string[];
  /** Rate limit: max commands per minute (default: 60) */
  readonly rateLimit?: number;
}

/**
 * Load PTY config from environment variables
 */
function loadPTYConfigFromEnv(): Required<PTYShellConfig> {
  const env = process.env;

  // Parse allowed prefixes from comma-separated string
  const allowedPrefixes = env.PTY_ALLOWED_PREFIXES
    ? env.PTY_ALLOWED_PREFIXES.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    enabled: env.PTY_ENABLED !== undefined
      ? env.PTY_ENABLED === 'true' || env.PTY_ENABLED === '1'
      : env.NODE_ENV !== 'production',
    defaultCols: env.PTY_DEFAULT_COLS ? parseInt(env.PTY_DEFAULT_COLS, 10) : 120,
    defaultRows: env.PTY_DEFAULT_ROWS ? parseInt(env.PTY_DEFAULT_ROWS, 10) : 40,
    sessionTimeoutMs: env.PTY_SESSION_TIMEOUT_MS
      ? parseInt(env.PTY_SESSION_TIMEOUT_MS, 10)
      : 300_000,
    maxSessions: env.PTY_MAX_SESSIONS ? parseInt(env.PTY_MAX_SESSIONS, 10) : 5,
    maxBufferLines: env.PTY_MAX_BUFFER_LINES
      ? parseInt(env.PTY_MAX_BUFFER_LINES, 10)
      : 1000,
    shell: env.PTY_SHELL || 'bash',
    allowedCommandPrefixes: allowedPrefixes,
    rateLimit: env.PTY_RATE_LIMIT ? parseInt(env.PTY_RATE_LIMIT, 10) : 60,
  };
}

/**
 * Default configuration (loaded from environment)
 */
export const DEFAULT_PTY_CONFIG: Required<PTYShellConfig> = loadPTYConfigFromEnv();

/**
 * Load PTY configuration from environment (call to refresh)
 */
export function loadPTYConfig(): Required<PTYShellConfig> {
  return loadPTYConfigFromEnv();
}

/**
 * Get PTY config summary for logging
 */
export function getPTYConfigSummary(): string {
  const config = loadPTYConfigFromEnv();
  return [
    `PTY Shell: ${config.enabled ? 'ENABLED' : 'DISABLED'}`,
    `Sessions: max=${config.maxSessions}, timeout=${config.sessionTimeoutMs}ms`,
    `Terminal: ${config.defaultCols}x${config.defaultRows}`,
    `Shell: ${config.shell}`,
    `Rate limit: ${config.rateLimit}/min`,
    config.allowedCommandPrefixes.length > 0
      ? `Allowed prefixes: ${config.allowedCommandPrefixes.join(', ')}`
      : 'All commands allowed',
  ].join(' | ');
}

/**
 * PTY Shell Manager
 * Manages interactive debug shell sessions
 */
export class PTYShellManager {
  private readonly config: Required<PTYShellConfig>;
  private readonly sessions: Map<string, PTYSession> = new Map();
  private cleanupTimer: Timer | null = null;

  constructor(config: Partial<PTYShellConfig> = {}) {
    this.config = { ...DEFAULT_PTY_CONFIG, ...config };

    // Start cleanup timer
    if (this.config.enabled) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredSessions();
      }, 30_000); // Check every 30 seconds
    }
  }

  /**
   * Check if PTY shell is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check platform support (POSIX only)
   */
  isPlatformSupported(): boolean {
    return process.platform !== 'win32';
  }

  /**
   * Create a new PTY session
   */
  async createSession(clientIp: string = 'unknown'): Promise<{
    sessionId: string;
    stream: ReadableStream<Uint8Array>;
  } | { error: string }> {
    if (!this.config.enabled) {
      return { error: 'PTY shell is disabled' };
    }

    if (!this.isPlatformSupported()) {
      return { error: 'PTY shell requires POSIX platform (Linux/macOS)' };
    }

    if (this.sessions.size >= this.config.maxSessions) {
      return { error: `Maximum sessions reached (${this.config.maxSessions})` };
    }

    const sessionId = crypto.randomUUID();
    const encoder = new TextEncoder();

    // Create SSE stream
    let streamController: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
      cancel: () => {
        this.closeSession(sessionId);
      },
    });

    // Helper to send SSE event
    const sendEvent = (event: string, data: unknown) => {
      try {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        streamController.enqueue(encoder.encode(payload));
      } catch {
        // Stream closed
      }
    };

    // Spawn PTY process
    try {
      const proc = Bun.spawn([this.config.shell], {
        stdin: 'pipe',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          COLUMNS: String(this.config.defaultCols),
          LINES: String(this.config.defaultRows),
        },
        terminal: {
          cols: this.config.defaultCols,
          rows: this.config.defaultRows,
          data: (terminal, data) => {
            const output = new TextDecoder().decode(data);
            const session = this.sessions.get(sessionId);

            if (session) {
              // Update activity timestamp
              session.lastActivity = Date.now();

              // Buffer output
              session.outputBuffer.push(output);
              if (session.outputBuffer.length > this.config.maxBufferLines) {
                session.outputBuffer.shift();
              }

              // Notify listeners
              for (const listener of session.listeners) {
                listener(output);
              }

              // Send SSE event
              sendEvent('output', { sessionId, output });
            }
          },
        },
      });

      // Create session
      const session: PTYSession = {
        id: sessionId,
        proc,
        createdAt: Date.now(),
        clientIp,
        cols: this.config.defaultCols,
        rows: this.config.defaultRows,
        outputBuffer: [],
        listeners: new Set(),
        lastActivity: Date.now(),
        commandCount: 0,
      };

      this.sessions.set(sessionId, session);

      // Send welcome message
      sendEvent('connected', {
        sessionId,
        message: 'PTY Debug Shell connected',
        cols: session.cols,
        rows: session.rows,
      });

      // Send initial prompt command
      proc.stdin.write('echo "🔧 Exchange Debug Shell (Bun PTY v1.3.5+)"\n');
      proc.stdin.write('echo "Session: ' + sessionId.slice(0, 8) + '..."\n');
      proc.stdin.write('echo "Type commands to debug the exchange. Use Ctrl+D or DELETE endpoint to exit."\n');

      // Handle process exit
      proc.exited.then((code) => {
        sendEvent('closed', { sessionId, code });
        try {
          streamController.close();
        } catch {
          // Already closed
        }
        this.sessions.delete(sessionId);
        log(`🐚 PTY session ${sessionId.slice(0, 8)} exited with code ${code}`);
      });

      log(`🐚 PTY session created: ${sessionId.slice(0, 8)} from ${clientIp}`);

      return { sessionId, stream };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create PTY session',
      };
    }
  }

  /**
   * Send input to a session
   */
  sendInput(sessionId: string, input: string): { success: boolean; error?: string } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Rate limiting
    const now = Date.now();
    const windowStart = now - 60_000; // 1 minute window
    if (session.lastActivity > windowStart) {
      session.commandCount++;
      if (session.commandCount > this.config.rateLimit) {
        return { success: false, error: 'Rate limit exceeded' };
      }
    } else {
      session.commandCount = 1;
    }

    // Security: Check allowed command prefixes
    if (this.config.allowedCommandPrefixes.length > 0) {
      const trimmedInput = input.trim();
      const isAllowed = this.config.allowedCommandPrefixes.some((prefix) =>
        trimmedInput.startsWith(prefix)
      );
      if (!isAllowed && trimmedInput.length > 0 && !trimmedInput.startsWith('#')) {
        return {
          success: false,
          error: `Command not allowed. Allowed prefixes: ${this.config.allowedCommandPrefixes.join(', ')}`,
        };
      }
    }

    try {
      session.proc.stdin.write(input);
      session.lastActivity = now;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send input',
      };
    }
  }

  /**
   * Resize a session's terminal
   */
  resizeSession(
    sessionId: string,
    cols: number,
    rows: number
  ): { success: boolean; error?: string } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      session.proc.terminal?.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      session.lastActivity = Date.now();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resize',
      };
    }
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): { success: boolean; error?: string } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      session.proc.kill();
      session.proc.terminal?.close();
      this.sessions.delete(sessionId);
      log(`🐚 PTY session closed: ${sessionId.slice(0, 8)}`);
      return { success: true };
    } catch (error) {
      this.sessions.delete(sessionId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close',
      };
    }
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): {
    id: string;
    createdAt: number;
    clientIp: string;
    cols: number;
    rows: number;
    lastActivity: number;
    commandCount: number;
    bufferSize: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      createdAt: session.createdAt,
      clientIp: session.clientIp,
      cols: session.cols,
      rows: session.rows,
      lastActivity: session.lastActivity,
      commandCount: session.commandCount,
      bufferSize: session.outputBuffer.length,
    };
  }

  /**
   * List all active sessions
   */
  listSessions(): Array<ReturnType<PTYShellManager['getSession']>> {
    const sessions: Array<ReturnType<PTYShellManager['getSession']>> = [];
    for (const sessionId of this.sessions.keys()) {
      const info = this.getSession(sessionId);
      if (info) sessions.push(info);
    }
    return sessions;
  }

  /**
   * Get session output buffer
   */
  getOutputBuffer(sessionId: string): string[] | null {
    const session = this.sessions.get(sessionId);
    return session ? [...session.outputBuffer] : null;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = this.config.sessionTimeoutMs;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        log(`🐚 PTY session ${sessionId.slice(0, 8)} timed out`);
        this.closeSession(sessionId);
      }
    }
  }

  /**
   * Shutdown manager and close all sessions
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    log('🐚 PTY Shell Manager shutdown');
  }

  /**
   * Get manager stats
   */
  getStats(): {
    enabled: boolean;
    platformSupported: boolean;
    activeSessions: number;
    maxSessions: number;
    config: Omit<Required<PTYShellConfig>, 'allowedCommandPrefixes'> & {
      allowedCommandPrefixes: number;
    };
  } {
    return {
      enabled: this.config.enabled,
      platformSupported: this.isPlatformSupported(),
      activeSessions: this.sessions.size,
      maxSessions: this.config.maxSessions,
      config: {
        ...this.config,
        allowedCommandPrefixes: this.config.allowedCommandPrefixes.length,
      },
    };
  }
}

/**
 * Create REST handlers for PTY shell endpoints
 */
export function createPTYShellHandlers(manager: PTYShellManager): {
  handleRequest: (req: Request) => Promise<Response | null>;
} {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  return {
    async handleRequest(req: Request): Promise<Response | null> {
      const url = new URL(req.url);
      const path = url.pathname;

      // Only handle /mcp/exchange/shell paths
      if (!path.startsWith('/mcp/exchange/shell')) {
        return null;
      }

      // CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Check if enabled
      if (!manager.isEnabled()) {
        return Response.json(
          { success: false, error: 'PTY shell is disabled in production' },
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check platform support
      if (!manager.isPlatformSupported()) {
        return Response.json(
          { success: false, error: 'PTY shell requires POSIX platform' },
          { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // GET /mcp/exchange/shell - Create new session (SSE)
        if (path === '/mcp/exchange/shell' && req.method === 'GET') {
          const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
          const result = await manager.createSession(clientIp);

          if ('error' in result) {
            return Response.json(
              { success: false, error: result.error },
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(result.stream, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Session-Id': result.sessionId,
            },
          });
        }

        // GET /mcp/exchange/shell/sessions - List sessions
        if (path === '/mcp/exchange/shell/sessions' && req.method === 'GET') {
          return Response.json(
            { success: true, data: manager.listSessions() },
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // GET /mcp/exchange/shell/stats - Get manager stats
        if (path === '/mcp/exchange/shell/stats' && req.method === 'GET') {
          return Response.json(
            { success: true, data: manager.getStats() },
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Parse session ID from path
        const sessionMatch = path.match(/^\/mcp\/exchange\/shell\/([a-f0-9-]+)(\/.*)?$/);
        if (!sessionMatch) {
          return Response.json(
            { success: false, error: 'Invalid path' },
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const sessionId = sessionMatch[1];
        const subPath = sessionMatch[2] || '';

        // POST /mcp/exchange/shell/:id/input - Send input
        if (subPath === '/input' && req.method === 'POST') {
          const body = await req.json();
          const input = body.input ?? body.command ?? '';

          const result = manager.sendInput(sessionId, input + '\n');
          return Response.json(
            { success: result.success, error: result.error },
            {
              status: result.success ? 200 : 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // POST /mcp/exchange/shell/:id/resize - Resize terminal
        if (subPath === '/resize' && req.method === 'POST') {
          const body = await req.json();
          const cols = body.cols ?? 120;
          const rows = body.rows ?? 40;

          const result = manager.resizeSession(sessionId, cols, rows);
          return Response.json(
            { success: result.success, error: result.error },
            {
              status: result.success ? 200 : 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // GET /mcp/exchange/shell/:id - Get session info
        if (subPath === '' && req.method === 'GET') {
          const info = manager.getSession(sessionId);
          if (!info) {
            return Response.json(
              { success: false, error: 'Session not found' },
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          return Response.json(
            { success: true, data: info },
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // GET /mcp/exchange/shell/:id/buffer - Get output buffer
        if (subPath === '/buffer' && req.method === 'GET') {
          const buffer = manager.getOutputBuffer(sessionId);
          if (!buffer) {
            return Response.json(
              { success: false, error: 'Session not found' },
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          return Response.json(
            { success: true, data: buffer },
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // DELETE /mcp/exchange/shell/:id - Close session
        if (subPath === '' && req.method === 'DELETE') {
          const result = manager.closeSession(sessionId);
          return Response.json(
            { success: result.success, error: result.error },
            {
              status: result.success ? 200 : 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return Response.json(
          { success: false, error: 'Method not allowed' },
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Internal error',
          },
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    },
  };
}

/**
 * Create a configured PTY shell manager
 */
export function createPTYShellManager(config?: Partial<PTYShellConfig>): PTYShellManager {
  return new PTYShellManager(config);
}
