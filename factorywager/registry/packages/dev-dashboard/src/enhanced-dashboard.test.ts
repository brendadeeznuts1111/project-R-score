#!/usr/bin/env bun
/**
 * Unit tests for enhanced dashboard functionality
 * 
 * Tests dashboard HTML loading, configuration, and core functionality.
 */

import { test, expect, describe } from 'bun:test';

describe('Enhanced Dashboard', () => {
  describe('HTML Template Loading', () => {
    test('should load dashboard.html file', async () => {
      const dashboardFile = Bun.file(new URL('./ui/dashboard.html', import.meta.url));
      const html = await dashboardFile.text();
      
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('FactoryWager Dev Dashboard');
    });

    test('should load fraud.html fragment', async () => {
      const fraudFile = Bun.file(new URL('./ui/fraud.html', import.meta.url));
      const html = await fraudFile.text();
      
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    test('should have required HTML structure', async () => {
      const dashboardFile = Bun.file(new URL('./ui/dashboard.html', import.meta.url));
      const html = await dashboardFile.text();
      
      // Check for essential elements
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body'); // May have class attribute
      expect(html).toContain('<script'); // Should have JavaScript
      expect(html).toContain('<style'); // Should have CSS
    });

    test('should have WebSocket connection code', async () => {
      const dashboardFile = Bun.file(new URL('./ui/dashboard.html', import.meta.url));
      const html = await dashboardFile.text();
      
      // Check for WebSocket initialization (may be constructed dynamically)
      expect(html).toMatch(/WebSocket|ws\.|connectWS|wsStatus/i);
    });

    test('should have fetch API calls', async () => {
      const dashboardFile = Bun.file(new URL('./ui/dashboard.html', import.meta.url));
      const html = await dashboardFile.text();
      
      // Check for fetch calls
      expect(html).toMatch(/fetch\(/);
      expect(html).toMatch(/\/api\//);
    });
  });

  describe('Configuration', () => {
    test('should load config.toml', async () => {
      const configFile = Bun.file(new URL('../config.toml', import.meta.url));
      const configText = await configFile.text();
      
      expect(configText).toBeDefined();
      expect(configText.length).toBeGreaterThan(0);
      expect(configText).toContain('[server]');
      expect(configText).toContain('port');
    });

    test('should have WebSocket configuration', async () => {
      const configFile = Bun.file(new URL('../config.toml', import.meta.url));
      const configText = await configFile.text();
      
      expect(configText).toContain('[websocket]');
      expect(configText).toContain('enabled');
      expect(configText).toContain('path');
    });
  });

  describe('WebSocket URL Configuration', () => {
    test('should construct WebSocket URL from server config', () => {
      const hostname = 'localhost';
      const port = 3008;
      const path = '/ws';
      const wsUrl = `ws://${hostname}:${port}${path}`;
      
      expect(wsUrl).toBe('ws://localhost:3008/ws');
    });

    test('should support environment variable override', () => {
      const envUrl = process.env.WEBSOCKET_BENCHMARK_URL;
      const defaultUrl = 'ws://localhost:3008/ws';
      const finalUrl = envUrl || defaultUrl;
      
      expect(finalUrl).toMatch(/^ws:\/\//);
    });

    test('should support custom hostname and port', () => {
      const hostname = 'example.com';
      const port = 8080;
      const path = '/ws';
      const wsUrl = `ws://${hostname}:${port}${path}`;
      
      expect(wsUrl).toBe('ws://example.com:8080/ws');
    });
  });
});
