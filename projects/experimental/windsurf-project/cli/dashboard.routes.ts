// api/dashboard.routes.ts
/**
 * §CLI:140 - Dashboard API Backend
 * @pattern CLI:140
 * @perf <2ms response
 * @roi 500x
 * @section §API
 */

import { Elysia, t } from 'elysia';
import { AuthManager, DEFAULT_CLI_ADMIN } from '../src/rbac/auth-context';
import { PatternMatrix } from '../utils/pattern-matrix';
import { PERMISSIONS } from '../src/rbac/permissions';
import { TerminalBridge } from '../src/utils/terminal-bridge';
import { telemetry } from '../src/core/telemetry/telemetry-engine';

// Simple in-memory rate limiter for now to avoid external dependency issues
const rateLimits = new Map<string, { count: number, reset: number }>();
const MAX_REQUESTS = 100;
const WINDOW_MS = 60000;

export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
  .onBeforeHandle(({ set, headers }) => {
    const ip = headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const limit = rateLimits.get(ip);

    if (limit && now < limit.reset) {
      if (limit.count >= MAX_REQUESTS) {
        set.status = 429;
        return 'Rate limit exceeded';
      }
      limit.count++;
    } else {
      rateLimits.set(ip, { count: 1, reset: now + WINDOW_MS });
    }
  })
  .derive(({ headers }) => {
    const host = headers['host'] || 'localhost';
    const scope = AuthManager.deriveScope(host);
    const userId = headers['x-user-id'] || 'admin-001';
    const user = { ...DEFAULT_CLI_ADMIN, scope };
    AuthManager.setUser(user);
    return { user, scope };
  })
  .get('/status', ({ scope, user }: any) => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      return { success: false, error: 'Unauthorized' };
    }
    return {
      success: true,
      data: {
        system: 'HEALTHY',
        scope,
        user: {
          name: user.name,
          role: user.scope === 'ENTERPRISE' ? 'Global Admin' : 'Dev Operator'
        },
        timestamp: Date.now(),
        patterns: PatternMatrix.getInstance().getRows().length
      }
    };
  })
  .get('/patterns', () => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      return { success: false, error: 'Unauthorized' };
    }
    return {
      success: true,
      data: PatternMatrix.getInstance().getRows()
    };
  })
  .get('/config', async () => {
    // Bun native TOML import
    const config = await import('../dashboards/main/dashboard-config.toml', {
      with: { type: 'toml' }
    });
    return {
      success: true,
      data: config.default
    };
  })
  .post('/terminal/spawn', async ({ body }: any) => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      return { success: false, error: 'Unauthorized' };
    }
    const terminal = TerminalBridge.getInstance();
    const result = await terminal.exec((body as any).command);
    return {
      success: true,
      data: result.result
    };
  }, {
    body: t.Object({
      command: t.Array(t.String())
    })
  })
  .ws('/terminal/stream/:id', {
    open(ws: any) {
      const { id } = ws.data.params;
      const terminal = TerminalBridge.getInstance();
      terminal.streamOutput(id, (data) => {
        ws.send(data);
      });
    }
  })
  .ws('/telemetry/mesh', {
    open(ws: any) {
      if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      // Initial system health capture
      telemetry.captureSystemHealth();

      const unsubscribe1 = telemetry.subscribe('workflow:stage', (data) => ws.send(data));
      const unsubscribe2 = telemetry.subscribe('workflow:complete', (data) => ws.send(data));
      const unsubscribe3 = telemetry.subscribe('system:health', (data) => ws.send(data));

      (ws as any)._telemetry_unsubscribes = [unsubscribe1, unsubscribe2, unsubscribe3];
      
      // Periodically broadcast health
      const healthInterval = setInterval(() => {
        telemetry.captureSystemHealth();
      }, 5000);
      (ws as any)._healthInterval = healthInterval;
    },
    close(ws: any) {
      if ((ws as any)._telemetry_unsubscribes) {
        (ws as any)._telemetry_unsubscribes.forEach((unsub: any) => unsub());
      }
      if ((ws as any)._healthInterval) {
        clearInterval((ws as any)._healthInterval);
      }
    }
  })
  .get('/user/preferences', () => {
    const user = AuthManager.getUser();
    return {
      success: true,
      data: user?.preferences || DEFAULT_CLI_ADMIN.preferences
    };
  })
  .put('/user/preferences', async ({ body }: any) => {
    await AuthManager.updatePreferences(body as any);
    return {
      success: true,
      message: 'Preferences updated'
    };
  }, {
    body: t.Object({
      pinnedMetrics: t.Optional(t.Array(t.String())),
      theme: t.Optional(t.String()),
      lang: t.Optional(t.String())
    })
  });
