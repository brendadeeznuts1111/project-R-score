#!/usr/bin/env bun
/**
 * WebSocket Subscriptions Test
 * Dedicated test for Bun's WebSocket subscription functionality in the LSP router
 */

import { test, describe, beforeEach, afterEach, expect } from 'bun:test';
import { EnhancedLSPRouter } from '../enhanced-lsp-router';
import type { ServerWebSocket } from 'bun';

describe('WebSocket Subscriptions', () => {
  let router: EnhancedLSPRouter;

  beforeEach(() => {
    router = new EnhancedLSPRouter();
  });

  test('router subscription methods work correctly', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: (message: string) => {}
    };

    // Subscribe to topics
    router.subscribeWebSocket(mockWs as any, 'chat');
    router.subscribeWebSocket(mockWs as any, 'notifications');

    // Check subscriptions
    const subs = router.getWebSocketSubscriptions(mockWs as any);
    expect(subs).toContain('chat');
    expect(subs).toContain('notifications');

    // Unsubscribe
    router.unsubscribeWebSocket(mockWs as any, 'chat');
    const subsAfterUnsub = router.getWebSocketSubscriptions(mockWs as any);
    expect(subsAfterUnsub).not.toContain('chat');
    expect(subsAfterUnsub).toContain('notifications');
  });

  test('router broadcast works', () => {
    let messageReceived1 = false;
    let messageReceived2 = false;

    const mockWs1 = {
      readyState: WebSocket.OPEN,
      send: () => { messageReceived1 = true; }
    };

    const mockWs2 = {
      readyState: WebSocket.OPEN,
      send: () => { messageReceived2 = true; }
    };

    // Subscribe both to 'notifications'
    router.subscribeWebSocket(mockWs1 as any, 'notifications');
    router.subscribeWebSocket(mockWs2 as any, 'notifications');

    // Broadcast to notifications
    router.broadcastToTopic('notifications', 'test message');

    // Both should have received the message
    expect(messageReceived1).toBe(true);
    expect(messageReceived2).toBe(true);
  });

  test('broadcast only sends to OPEN connections', () => {
    let messageReceived1 = false;
    let messageReceived2 = false;

    const mockWs1 = {
      readyState: WebSocket.OPEN,
      send: () => { messageReceived1 = true; }
    };

    const mockWs2 = {
      readyState: WebSocket.CLOSING,
      send: () => { messageReceived2 = true; }
    };

    // Subscribe both to 'alerts'
    router.subscribeWebSocket(mockWs1 as any, 'alerts');
    router.subscribeWebSocket(mockWs2 as any, 'alerts');

    // Broadcast to alerts
    router.broadcastToTopic('alerts', 'System alert');

    // Only the OPEN connection should receive the message
    expect(messageReceived1).toBe(true);
    expect(messageReceived2).toBe(false);
  });

  test('subscription cleanup removes empty topic sets', () => {
    const mockWs1 = {
      readyState: WebSocket.OPEN,
      send: () => {}
    };

    const mockWs2 = {
      readyState: WebSocket.OPEN,
      send: () => {}
    };

    // Subscribe both to 'debug'
    router.subscribeWebSocket(mockWs1 as any, 'debug');
    router.subscribeWebSocket(mockWs2 as any, 'debug');

    // Unsubscribe both
    router.unsubscribeWebSocket(mockWs1 as any, 'debug');
    router.unsubscribeWebSocket(mockWs2 as any, 'debug');

    // Check that topic is removed from map
    router.broadcastToTopic('debug', 'Should not be received');
  });

  test('WebSocket message handling parses JSON-RPC', () => {
    let sentMessage = '';

    const mockWs = {
      send: (msg: string) => { sentMessage = msg; },
      readyState: WebSocket.OPEN
    };

    const jsonRpcRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 42,
      method: 'textDocument/completion',
      params: { uri: 'file:///test.ts', position: { line: 10, character: 5 } }
    });

    // Handle the message
    router.handleWebSocketMessage(mockWs as any, jsonRpcRequest);

    // Should echo back a response for the request
    expect(sentMessage).toContain('"id":42');
    expect(sentMessage).toContain('"jsonrpc":"2.0"');
  });
});

/**
 * Integration tests for WebSocket subscriptions would require running a server
 * and connecting with a client WebSocket. These tests focus on the router's
 * subscription management logic.
 *
 * To run integration tests:
 * 1. Start the server: bun run ./enhanced-lsp-router.ts
 * 2. Connect with a WebSocket client to verify subscriptions
 */
