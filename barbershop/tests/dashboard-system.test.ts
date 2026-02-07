/**
 * Dashboard System Tests
 * 
 * Validates the dashboard v2 system components:
 * - Types and constants
 * - Dashboard builder
 * - Composition API
 * - Sync engine
 */

import { describe, test, expect } from 'bun:test';
import {
  // Types
  type DashboardConfig,
  type WidgetConfig,
  type DashboardLayout,
  
  // Constants
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_BREAKPOINTS,
  
  // Helpers
  createDashboardConfig,
  createWidgetConfig,
  isStale,
  calculateTrend,
} from '../src/dashboard/types';

import {
  DashboardBuilder,
  createDashboard,
  createAdminDashboard,
  createClientDashboard,
  createBarberDashboard,
  createAnalyticsDashboard,
} from '../src/dashboard/builder';

import {
  SyncEngine,
  createSyncEngine,
  DEFAULT_SYNC_CONFIG,
} from '../src/dashboard/sync';

describe('Dashboard System v2', () => {
  
  describe('Types & Constants', () => {
    test('DEFAULT_DASHBOARD_CONFIG has expected structure', () => {
      expect(DEFAULT_DASHBOARD_CONFIG.view).toBe('admin');
      expect(DEFAULT_DASHBOARD_CONFIG.mode).toBe('live');
      expect(DEFAULT_DASHBOARD_CONFIG.liveUpdates).toBe(true);
      expect(DEFAULT_DASHBOARD_CONFIG.refreshInterval).toBe(5000);
      expect(DEFAULT_DASHBOARD_CONFIG.features.websocket).toBe(true);
      expect(DEFAULT_DASHBOARD_CONFIG.features.telemetry).toBe(true);
    });

    test('DEFAULT_BREAKPOINTS has expected values', () => {
      expect(DEFAULT_BREAKPOINTS.sm).toBe(640);
      expect(DEFAULT_BREAKPOINTS.md).toBe(768);
      expect(DEFAULT_BREAKPOINTS.lg).toBe(1024);
      expect(DEFAULT_BREAKPOINTS.xl).toBe(1280);
    });

    test('createDashboardConfig merges overrides correctly', () => {
      const config = createDashboardConfig({ view: 'client', refreshInterval: 10000 });
      expect(config.view).toBe('client');
      expect(config.refreshInterval).toBe(10000);
      expect(config.mode).toBe('live'); // from defaults
      expect(config.features.websocket).toBe(true); // from defaults
    });

    test('createWidgetConfig creates valid widget', () => {
      const widget = createWidgetConfig('stats', 'Test Widget', {
        position: { x: 0, y: 0, w: 4, h: 2 },
      });
      expect(widget.type).toBe('stats');
      expect(widget.title).toBe('Test Widget');
      expect(widget.position.w).toBe(4);
      expect(widget.id).toBeDefined();
    });

    test('isStale correctly identifies stale timestamps', () => {
      const now = Date.now();
      expect(isStale(now - 1000, 500)).toBe(true);
      expect(isStale(now - 100, 500)).toBe(false);
    });

    test('calculateTrend computes correct values', () => {
      expect(calculateTrend(110, 100)).toEqual({ trend: 'up', change: 10 });
      expect(calculateTrend(90, 100)).toEqual({ trend: 'down', change: -10 });
      expect(calculateTrend(100, 100)).toEqual({ trend: 'stable', change: 0 });
      expect(calculateTrend(100, 0)).toEqual({ trend: 'up', change: 100 });
    });
  });

  describe('Dashboard Builder', () => {
    test('createDashboard creates builder instance', () => {
      const builder = createDashboard();
      expect(builder).toBeInstanceOf(DashboardBuilder);
    });

    test('buildAdminDashboard creates admin layout', () => {
      const builder = createAdminDashboard();
      const result = builder.build();
      expect(result.config.view).toBe('admin');
      expect(result.widgets.length).toBeGreaterThan(0);
      expect(result.widgets.some(w => w.type === 'stats')).toBe(true);
    });

    test('buildClientDashboard creates client layout', () => {
      const builder = createClientDashboard();
      const result = builder.build();
      expect(result.config.view).toBe('client');
      expect(result.widgets.length).toBeGreaterThan(0);
    });

    test('buildBarberDashboard creates barber layout', () => {
      const builder = createBarberDashboard();
      const result = builder.build();
      expect(result.config.view).toBe('barber');
      expect(result.widgets.length).toBeGreaterThan(0);
    });

    test('buildAnalyticsDashboard creates analytics layout', () => {
      const builder = createAnalyticsDashboard();
      const result = builder.build();
      expect(result.config.view).toBe('analytics');
      expect(result.widgets.length).toBeGreaterThan(0);
      expect(result.widgets.some(w => w.type === 'chart')).toBe(true);
    });

    test('builder methods chain correctly', () => {
      const builder = createDashboard()
        .setTheme('dark')
        .setRefreshInterval(10000)
        .enableLiveUpdates();
      
      const result = builder.build();
      expect(result.config.theme).toBe('dark');
      expect(result.config.refreshInterval).toBe(10000);
      expect(result.config.liveUpdates).toBe(true);
    });

    test('addWidget adds widget correctly', () => {
      const builder = createDashboard();
      builder.addWidget('stats', 'Test', { x: 0, y: 0, w: 4, h: 2 });
      
      const result = builder.build();
      expect(result.widgets.length).toBe(1);
      expect(result.widgets[0].type).toBe('stats');
      expect(result.widgets[0].title).toBe('Test');
    });

    test('removeWidget removes widget correctly', () => {
      const builder = createDashboard();
      builder.addWidget('stats', 'Test1', { x: 0, y: 0, w: 4, h: 2 });
      builder.addWidget('chart', 'Test2', { x: 4, y: 0, w: 4, h: 2 });
      
      const widgetId = builder.build().widgets[0].id;
      builder.removeWidget(widgetId);
      
      const result = builder.build();
      expect(result.widgets.length).toBe(1);
      expect(result.widgets[0].title).toBe('Test2');
    });

    test('export generates JSON correctly', () => {
      const builder = createAdminDashboard();
      const json = builder.export('json');
      const parsed = JSON.parse(json);
      expect(parsed.config).toBeDefined();
      expect(parsed.widgets).toBeArray();
    });

    test('export generates CSV correctly', () => {
      const builder = createDashboard()
        .addWidget('stats', 'Test', { x: 0, y: 0, w: 4, h: 2 });
      
      const csv = builder.export('csv');
      expect(csv).toContain('Widget ID,Type,Title');
      expect(csv).toContain('stats');
      expect(csv).toContain('Test');
    });

    test('export generates HTML correctly', () => {
      const builder = createDashboard()
        .addWidget('stats', 'Test', { x: 0, y: 0, w: 4, h: 2 });
      
      const html = builder.export('html');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('dashboard');
      expect(html).toContain('Test');
    });

    test('saveLayout and loadLayout work correctly', () => {
      const builder = createDashboard()
        .addWidget('stats', 'Test', { x: 0, y: 0, w: 4, h: 2 })
        .saveLayout('test-layout');
      
      builder.clearWidgets().addWidget('chart', 'Other', { x: 0, y: 0, w: 4, h: 2 });
      expect(builder.build().widgets[0].type).toBe('chart');
      
      builder.loadLayout('test-layout');
      expect(builder.build().widgets[0].type).toBe('stats');
    });
  });

  describe('Sync Engine', () => {
    test('createSyncEngine creates engine instance', () => {
      const engine = createSyncEngine({ autoConnect: false });
      expect(engine).toBeInstanceOf(SyncEngine);
      expect(engine.isConnected()).toBe(false);
    });

    test('DEFAULT_SYNC_CONFIG has expected values', () => {
      expect(DEFAULT_SYNC_CONFIG.autoConnect).toBe(true);
      expect(DEFAULT_SYNC_CONFIG.reconnect).toBe(true);
      expect(DEFAULT_SYNC_CONFIG.reconnectAttempts).toBe(5);
      expect(DEFAULT_SYNC_CONFIG.heartbeatInterval).toBe(30000);
      expect(DEFAULT_SYNC_CONFIG.syncStrategy).toBe('broadcast');
    });

    test('getState returns current state', () => {
      const engine = createSyncEngine({ autoConnect: false });
      const state = engine.getState();
      expect(state.status).toBe('disconnected');
      expect(state.connectionId).toBeNull();
      expect(state.errors).toBeArray();
    });

    test('event subscription works', () => {
      const engine = createSyncEngine({ autoConnect: false });
      let eventFired = false;
      
      const unsubscribe = engine.on('test', () => {
        eventFired = true;
      });
      
      // Note: We can't easily test event emission without mocking,
      // but we can verify the subscription mechanism exists
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
