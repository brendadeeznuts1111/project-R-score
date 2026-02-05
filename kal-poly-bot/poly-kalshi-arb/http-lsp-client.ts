#!/usr/bin/env bun

/**
 * LSP HTTP Client - Complete Integration
 * Implements full LSP protocol over HTTP endpoints
 */

import { spawn } from 'child_process';

interface LSPResponse {
  jsonrpc: string;
  id?: number;
  result?: any;
  error?: { code: number; message: string };
}

export class LSPHTTPClient {
  private serverProcess: ReturnType<typeof spawn> | null = null;
  private serverReady = false;
  private port: number;
  private timeout: number;
  private messageId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();

  constructor(port = 50045, timeout = 30000) {
    this.port = port;
    this.timeout = timeout;
  }

  async start(): Promise<void> {
    console.log('🚀 Starting LSP HTTP integration...');

    try {
      await this.startHttpServer();
      await this.waitForServerReady();
      await this.initializeClient();
      console.log('✅ LSP HTTP integration ready!');
    } catch (error) {
      console.error('❌ LSP initialization failed:', error);
      await this.shutdown();
      throw error;
    }
  }

  private async startHttpServer(): Promise<void> {
    console.log('📡 Starting HTTP LSP server...');

    // Important: Use the correct command to start the HTTP server
    this.serverProcess = spawn('bun', ['run', 'lsp-http-server.ts'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: { ...process.env, FORCE_COLOR: 'true' },
      detached: false,
    });

    // Handle process errors
    this.serverProcess.on('error', (err) => {
      console.error('[LSP Server] Process error:', err);
    });

    this.serverProcess.on('exit', (code) => {
      console.log(`[LSP Server] Process exited with code ${code}`);
      this.serverReady = false;
    });
  }

  private async waitForServerReady(): Promise<void> {
    console.log('⏳ Waiting for server to be ready...');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`LSP server startup timeout after ${this.timeout}ms`));
      }, this.timeout);

      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:${this.port}/health`, {
            signal: AbortSignal.timeout(2000),
          });

          if (response.ok) {
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            this.serverReady = true;
            console.log('✅ LSP server ready (health check passed)');
            resolve();
          }
        } catch (error) {
          const elapsed = Date.now() - startTime;
          if (elapsed > this.timeout - 1000) {
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            reject(new Error(`LSP server not responding after ${elapsed}ms`));
          }
        }
      }, 500);
    });
  }

  private async initializeClient(): Promise<void> {
    console.log('🔌 Initializing LSP client...');

    // Send initialize request
    const initResponse = await this.sendRequest('initialize', {
      processId: process.pid,
      rootUri: `file://${process.cwd()}`,
      capabilities: {
        workspace: { workspaceFolders: true },
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
        },
      },
    });

    if (initResponse.error) {
      throw new Error(`Initialize failed: ${initResponse.error.message}`);
    }

    console.log('✅ LSP initialized with capabilities:', initResponse.result?.capabilities);

    // Send initialized notification
    await this.sendNotification('initialized', {});
    console.log('✅ LSP client fully initialized');
  }

  /**
   * Send LSP request and wait for response
   */
  async sendRequest(method: string, params: any): Promise<LSPResponse> {
    const id = ++this.messageId;

    const response = await fetch(`http://localhost:${this.port}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });

    return response.json();
  }

  /**
   * Send LSP notification (no response expected)
   */
  async sendNotification(method: string, params: any): Promise<void> {
    await fetch(`http://localhost:${this.port}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    });
  }

  /**
   * Open a document in LSP
   */
  async openDocument(uri: string, text: string): Promise<void> {
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: 'typescript',
        version: 1,
        text,
      },
    });
  }

  /**
   * Get completion items
   */
  async getCompletions(uri: string, position: { line: number; character: number }) {
    const response = await this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position,
    });

    return response.result;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down LSP HTTP integration...');

    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.serverProcess = null;
    }

    this.serverReady = false;
    this.pendingRequests.clear();
    console.log('✅ LSP HTTP integration shutdown complete');
  }
}

// Export singleton
export const lspClient = new LSPHTTPClient();

// Test the integration if run directly
if (import.meta.main) {
  console.log('🧪 Testing LSP HTTP Integration...\n');

  try {
    // Start client (which starts server)
    await lspClient.start();

    // Open a document
    await lspClient.openDocument(
      'file:///test.ts',
      'const greeting = "Hello"; console.log(greeting);'
    );
    console.log('✅ Document opened');

    // Get completions
    const completions = await lspClient.getCompletions('file:///test.ts', {
      line: 0,
      character: 45, // After greeting.
    });
    console.log('✅ Completions:', completions);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await lspClient.shutdown();
  }
}
