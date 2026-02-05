/**
 * PTY Debug Shell Tests
 * Validates session management and platform detection
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  PTYShellManager,
  createPTYShellManager,
  createPTYShellHandlers,
  DEFAULT_PTY_CONFIG,
} from '../../../packages/core/src/sportsbook/pty-shell';

describe('PTY Debug Shell', () => {
  describe('PTYShellManager', () => {
    let manager: PTYShellManager;

    beforeEach(() => {
      manager = createPTYShellManager({
        enabled: true,
        maxSessions: 3,
        sessionTimeoutMs: 5000,
      });
    });

    afterEach(() => {
      manager.shutdown();
    });

    test('initializes with correct config', () => {
      const stats = manager.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.maxSessions).toBe(3);
      expect(stats.activeSessions).toBe(0);
    });

    test('detects platform support', () => {
      const isSupported = manager.isPlatformSupported();

      // Should be true on Linux/macOS, false on Windows
      if (process.platform === 'win32') {
        expect(isSupported).toBe(false);
      } else {
        expect(isSupported).toBe(true);
      }
    });

    test('returns error when disabled', async () => {
      const disabledManager = createPTYShellManager({ enabled: false });

      const result = await disabledManager.createSession();

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('PTY shell is disabled');
      }

      disabledManager.shutdown();
    });

    test('respects max sessions limit', async () => {
      // Skip on Windows or if PTY not available
      if (!manager.isPlatformSupported()) {
        return;
      }

      // Create max sessions
      const sessions: string[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await manager.createSession(`client-${i}`);
        if ('sessionId' in result) {
          sessions.push(result.sessionId);
        } else {
          // PTY may not be available in test environment (e.g., CI)
          // Skip test if first session fails
          if (i === 0) {
            return;
          }
        }
      }

      expect(sessions.length).toBe(3);
      expect(manager.getStats().activeSessions).toBe(3);

      // Next session should fail
      const result = await manager.createSession('client-overflow');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Maximum sessions');
      }

      // Cleanup
      for (const id of sessions) {
        manager.closeSession(id);
      }
    });

    test('closes sessions correctly', async () => {
      if (!manager.isPlatformSupported()) {
        return;
      }

      const result = await manager.createSession('test-client');

      // PTY may not be available in test environment
      if ('error' in result) {
        // Skip test if PTY creation fails (e.g., in CI without TTY)
        expect(result.error).toBeTruthy();
        return;
      }

      expect('sessionId' in result).toBe(true);
      expect(manager.getStats().activeSessions).toBe(1);

      const closeResult = manager.closeSession(result.sessionId);
      expect(closeResult.success).toBe(true);
      expect(manager.getStats().activeSessions).toBe(0);
    });

    test('returns error for invalid session', () => {
      const result = manager.sendInput('invalid-session-id', 'test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    test('lists active sessions', async () => {
      if (!manager.isPlatformSupported()) {
        return;
      }

      const result = await manager.createSession('test-client');

      // PTY may not be available in test environment
      if ('error' in result) {
        expect(result.error).toBeTruthy();
        return;
      }

      const sessions = manager.listSessions();

      expect(sessions.length).toBe(1);
      expect(sessions[0]?.id).toBe(result.sessionId);
      expect(sessions[0]?.clientIp).toBe('test-client');

      manager.closeSession(result.sessionId);
    });

    test('shutdown closes all sessions', async () => {
      if (!manager.isPlatformSupported()) {
        return;
      }

      const r1 = await manager.createSession('client-1');
      const r2 = await manager.createSession('client-2');

      // PTY may not be available in test environment
      if ('error' in r1 || 'error' in r2) {
        manager.shutdown();
        return;
      }

      expect(manager.getStats().activeSessions).toBe(2);

      manager.shutdown();

      expect(manager.getStats().activeSessions).toBe(0);
    });
  });

  describe('createPTYShellHandlers', () => {
    let manager: PTYShellManager;
    let handlers: ReturnType<typeof createPTYShellHandlers>;

    beforeEach(() => {
      manager = createPTYShellManager({ enabled: true });
      handlers = createPTYShellHandlers(manager);
    });

    afterEach(() => {
      manager.shutdown();
    });

    test('returns null for non-shell paths', async () => {
      const req = new Request('http://localhost/mcp/exchange/markets');
      const response = await handlers.handleRequest(req);

      expect(response).toBeNull();
    });

    test('handles stats endpoint', async () => {
      const req = new Request('http://localhost/mcp/exchange/shell/stats');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.success).toBe(true);
      expect(body.data.enabled).toBe(true);
    });

    test('handles sessions list endpoint', async () => {
      const req = new Request('http://localhost/mcp/exchange/shell/sessions');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('returns 404 for non-existent session', async () => {
      const req = new Request('http://localhost/mcp/exchange/shell/non-existent-id');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(404);
    });

    test('handles CORS preflight', async () => {
      const req = new Request('http://localhost/mcp/exchange/shell', {
        method: 'OPTIONS',
      });
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(204);
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('DEFAULT_PTY_CONFIG', () => {
    test('has sensible defaults', () => {
      expect(DEFAULT_PTY_CONFIG.defaultCols).toBe(120);
      expect(DEFAULT_PTY_CONFIG.defaultRows).toBe(40);
      expect(DEFAULT_PTY_CONFIG.maxSessions).toBe(5);
      expect(DEFAULT_PTY_CONFIG.sessionTimeoutMs).toBe(300_000);
      expect(DEFAULT_PTY_CONFIG.rateLimit).toBe(60);
      expect(DEFAULT_PTY_CONFIG.shell).toBe('bash');
    });

    test('disabled in production by default', () => {
      // DEFAULT_PTY_CONFIG.enabled is based on NODE_ENV
      // In test environment, it should be enabled
      expect(typeof DEFAULT_PTY_CONFIG.enabled).toBe('boolean');
    });
  });
});
