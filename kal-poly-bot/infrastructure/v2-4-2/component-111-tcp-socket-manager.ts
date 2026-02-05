#!/usr/bin/env bun
/**
 * Component #111: TCP-Socket-Manager
 * Primary API: Bun.connect() (client)
 * Secondary API: Bun.listen() (server)
 * Performance SLA: 1ms connection
 * Parity Lock: 1u2v...3w4x
 * Status: OPTIMIZED
 */

import { feature } from "bun:bundle";

interface TCPConfig {
  hostname: string;
  port: number;
}

export class TCPSocketManager {
  private static instance: TCPSocketManager;

  private constructor() {}

  static getInstance(): TCPSocketManager {
    if (!this.instance) {
      this.instance = new TCPSocketManager();
    }
    return this.instance;
  }

  async connect(config: TCPConfig): Promise<any> {
    if (!feature("TCP_SOCKET_MANAGER")) {
      return Bun.connect({
        hostname: config.hostname,
        port: config.port,
      });
    }

    const startTime = performance.now();
    
    const socket = await Bun.connect({
      hostname: config.hostname,
      port: config.port,
    });

    const duration = performance.now() - startTime;
    if (duration > 1) {
      console.warn(`⚠️  TCP connection SLA breach: ${duration.toFixed(2)}ms > 1ms`);
    }

    return socket;
  }

  listen(config: TCPConfig & { handler: (socket: any) => void }): any {
    return Bun.listen({
      hostname: config.hostname,
      port: config.port,
      socket: {
        open: config.handler,
      },
    });
  }
}

export const tcpSocketManager = feature("TCP_SOCKET_MANAGER")
  ? TCPSocketManager.getInstance()
  : {
      connect: async (config: TCPConfig) => Bun.connect(config),
      listen: (config: any) => Bun.listen(config),
    };

export default tcpSocketManager;
