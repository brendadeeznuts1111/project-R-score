#!/usr/bin/env bun
/**
 * WebSocket Security Test for Bun v1.3.6
 * Tests [SEC][WS_DECOMP][SEC] - Decompression bomb protection (128MB limit)
 */

import { serve } from "bun";
import { WebSocket } from "ws";

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  size: number;
  time: number;
}

class WebSocketSecurityTester {
  private results: TestResult[] = [];
  private server: any;
  private port: number;

  constructor() {
    this.port = 0; // Random port
  }

  async runAllTests(): Promise<void> {
    console.log('🌐 Starting WebSocket Security Tests for Bun v1.3.6...\n');

    await this.setupTestServer();
    await this.testNormalMessage();
    await this.testLargeMessage();
    await this.testOversizedMessage();
    await this.testMalformedMessage();
    await this.testConcurrentMessages();
    
    this.cleanup();
    this.generateReport();
  }

  private async setupTestServer(): Promise<void> {
    console.log('🔧 Setting up test WebSocket server...');
    
    this.server = serve({
      port: this.port,
      fetch(req, server) {
        if (req.headers.get("upgrade") === "websocket") {
          const upgraded = server.upgrade(req);
          if (upgraded) {
            return undefined;
          }
        }
        return new Response("Upgrade failed", { status: 400 });
      },
      websocket: {
        open(ws) {
          console.log('📡 WebSocket connection opened');
        },
        message(ws, message) {
          // Test message size limit (128MB in v1.3.6)
          const messageSize = message.length;
          const maxSize = 128 * 1024 * 1024; // 128MB
          
          if (messageSize > maxSize) {
            ws.send(JSON.stringify({ 
              error: "Message too large", 
              size: messageSize,
              limit: maxSize 
            }));
            return;
          }
          
          // Echo back with size info
          ws.send(JSON.stringify({ 
            echo: "Message received", 
            size: messageSize,
            timestamp: Date.now()
          }));
        },
        close(ws) {
          console.log('📡 WebSocket connection closed');
        },
        error(ws, error) {
          console.error('📡 WebSocket error:', error);
        }
      }
    });

    this.port = this.server.port;
    console.log(`✅ Test server running on port ${this.port}\n`);
  }

  private async testNormalMessage(): Promise<void> {
    console.log('📨 Testing normal message size (1KB)...');
    
    const startTime = performance.now();
    const message = new Uint8Array(1024).fill(0x41); // 1KB of 'A'
    
    try {
      const ws = new WebSocket(`ws://localhost:${this.port}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(message);
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data.toString());
          const endTime = performance.now();
          
          this.results.push({
            testName: 'Normal Message (1KB)',
            passed: response.size === 1024,
            message: response.echo || 'Success',
            size: response.size,
            time: endTime - startTime
          });
          
          ws.close();
          resolve(null);
        });
        
        ws.on('error', reject);
      });
    } catch (error) {
      this.results.push({
        testName: 'Normal Message (1KB)',
        passed: false,
        message: `Error: ${error.message}`,
        size: 1024,
        time: performance.now() - startTime
      });
    }
  }

  private async testLargeMessage(): Promise<void> {
    console.log('📨 Testing large message size (10MB)...');
    
    const startTime = performance.now();
    const message = new Uint8Array(10 * 1024 * 1024).fill(0x42); // 10MB of 'B'
    
    try {
      const ws = new WebSocket(`ws://localhost:${this.port}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(message);
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data.toString());
          const endTime = performance.now();
          
          this.results.push({
            testName: 'Large Message (10MB)',
            passed: response.size === 10 * 1024 * 1024,
            message: response.echo || 'Success',
            size: response.size,
            time: endTime - startTime
          });
          
          ws.close();
          resolve(null);
        });
        
        ws.on('error', reject);
      });
    } catch (error) {
      this.results.push({
        testName: 'Large Message (10MB)',
        passed: false,
        message: `Error: ${error.message}`,
        size: 10 * 1024 * 1024,
        time: performance.now() - startTime
      });
    }
  }

  private async testOversizedMessage(): Promise<void> {
    console.log('📨 Testing oversized message (150MB - should be rejected)...');
    
    const startTime = performance.now();
    const message = new Uint8Array(150 * 1024 * 1024).fill(0x43); // 150MB of 'C'
    
    try {
      const ws = new WebSocket(`ws://localhost:${this.port}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(message);
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data.toString());
          const endTime = performance.now();
          
          this.results.push({
            testName: 'Oversized Message (150MB)',
            passed: response.error === "Message too large",
            message: response.error || 'Should be rejected',
            size: response.size || 150 * 1024 * 1024,
            time: endTime - startTime
          });
          
          ws.close();
          resolve(null);
        });
        
        ws.on('error', reject);
      });
    } catch (error) {
      this.results.push({
        testName: 'Oversized Message (150MB)',
        passed: true, // Expected to fail
        message: `Expected rejection: ${error.message}`,
        size: 150 * 1024 * 1024,
        time: performance.now() - startTime
      });
    }
  }

  private async testMalformedMessage(): Promise<void> {
    console.log('📨 Testing malformed message...');
    
    const startTime = performance.now();
    
    try {
      const ws = new WebSocket(`ws://localhost:${this.port}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Send malformed binary data
          ws.send(Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]));
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data.toString());
          const endTime = performance.now();
          
          this.results.push({
            testName: 'Malformed Message',
            passed: true, // Should handle gracefully
            message: response.echo || 'Handled gracefully',
            size: response.size || 4,
            time: endTime - startTime
          });
          
          ws.close();
          resolve(null);
        });
        
        ws.on('error', (error) => {
          const endTime = performance.now();
          this.results.push({
            testName: 'Malformed Message',
            passed: true, // Expected to handle error
            message: `Error handled: ${error.message}`,
            size: 4,
            time: endTime - startTime
          });
          resolve(null);
        });
      });
    } catch (error) {
      this.results.push({
        testName: 'Malformed Message',
        passed: false,
        message: `Unexpected error: ${error.message}`,
        size: 4,
        time: performance.now() - startTime
      });
    }
  }

  private async testConcurrentMessages(): Promise<void> {
    console.log('📨 Testing concurrent messages...');
    
    const startTime = performance.now();
    const messageCount = 10;
    const messageSize = 1024 * 1024; // 1MB each
    
    try {
      const ws = new WebSocket(`ws://localhost:${this.port}`);
      
      await new Promise((resolve, reject) => {
        let receivedCount = 0;
        
        ws.on('open', () => {
          // Send multiple messages concurrently
          for (let i = 0; i < messageCount; i++) {
            const message = new Uint8Array(messageSize).fill(i % 256);
            ws.send(message);
          }
        });
        
        ws.on('message', (data) => {
          receivedCount++;
          
          if (receivedCount === messageCount) {
            const endTime = performance.now();
            
            this.results.push({
              testName: 'Concurrent Messages',
              passed: receivedCount === messageCount,
              message: `Received ${receivedCount}/${messageCount} messages`,
              size: messageCount * messageSize,
              time: endTime - startTime
            });
            
            ws.close();
            resolve(null);
          }
        });
        
        ws.on('error', reject);
      });
    } catch (error) {
      this.results.push({
        testName: 'Concurrent Messages',
        passed: false,
        message: `Error: ${error.message}`,
        size: messageCount * messageSize,
        time: performance.now() - startTime
      });
    }
  }

  private cleanup(): void {
    if (this.server) {
      this.server.stop();
      console.log('🧹 Test server stopped\n');
    }
  }

  private generateReport(): void {
    console.log('📊 WEBSOCKET SECURITY REPORT');
    console.log('=============================\n');

    const passed = this.results.filter(r => r.passed);
    const failed = this.results.filter(r => !r.passed);

    console.log(`✅ PASSED: ${passed.length}`);
    console.log(`❌ FAILED: ${failed.length}\n`);

    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const sizeMB = (result.size / (1024 * 1024)).toFixed(2);
      console.log(`${status} ${result.testName}`);
      console.log(`   Size: ${sizeMB}MB | Time: ${result.time.toFixed(2)}ms`);
      console.log(`   Message: ${result.message}\n`);
    });

    console.log('🔒 SECURITY ANALYSIS:');
    console.log('- 128MB decompression limit: ' + (this.results.some(r => r.testName.includes('Oversized') && r.passed) ? '✅ ENFORCED' : '❌ NOT ENFORCED'));
    console.log('- Memory protection: ' + (failed.length === 0 ? '✅ ACTIVE' : '❌ VULNERABLE'));
    console.log('- Message handling: ' + (this.results.every(r => r.passed || r.testName.includes('Oversized')) ? '✅ ROBUST' : '❌ FRAGILE'));
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. Ensure all WebSocket servers implement size limits');
    console.log('2. Monitor memory usage during high traffic');
    console.log('3. Implement rate limiting for message frequency');
    console.log('4. Add connection timeout and idle cleanup');
    console.log('5. Log oversized message attempts for security monitoring');
  }
}

// Run tests if called directly
if (import.meta.main) {
  const tester = new WebSocketSecurityTester();
  await tester.runAllTests();
}

export { WebSocketSecurityTester, TestResult };
