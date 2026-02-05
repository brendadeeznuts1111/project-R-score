// Simplified Dashboard Routes - System Status Only
import { Elysia, t } from 'elysia';

export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
  .get('/status', () => {
    return {
      success: true,
      data: {
        system: 'HEALTHY',
        message: 'DuoPlus System Status API',
        version: '1.2.4-beta.0',
        timestamp: Date.now()
      }
    };
  })
  .get('/health', () => {
    return {
      success: true,
      data: {
        status: 'HEALTHY',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };
  });
