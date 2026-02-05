// LSP Dashboard Tests - Simplified without Jest dependencies

import { LSPDashboard } from './LSPDashboard';
import { LSPClient } from './LSPClient';
import { Dashboard } from './Dashboard';
import { Diagnostic, CompletionItem, LSPPerformance, ThemeConfig } from './types';

// Mock implementations
class MockDashboard extends Dashboard {
  public renderCallCount = 0;
  private content = '';
  private _isInitialized = false;

  constructor(config: any) {
    super(config);
  }

  override async initialize(containerId: string): Promise<void> {
    // Mock implementation
    this._isInitialized = true;
  }

  override render(content: string): void {
    this.renderCallCount++;
    this.content = content;
  }

  getLastRenderedContent(): string {
    return this.content;
  }

  override isReady(): boolean {
    return this._isInitialized;
  }
}

class MockLSPClient extends LSPClient {
  public connected = false;
  public diagnostics: Diagnostic[] = [];
  public completions: CompletionItem[] = [];
  public performance: LSPPerformance = {
    responseTime: 15,
    memoryUsage: 50 * 1024 * 1024,
    cpuUsage: 10,
    requestCount: 100,
    errorCount: 2
  };

  constructor(config: any) {
    super(config);
  }

  override async initialize(): Promise<void> {
    this.connected = true;
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  override isConnected(): boolean {
    return this.connected;
  }

  override openFile(filename: string): void {
    // Mock file opening
    setTimeout(() => {
      this.diagnostics = [
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
          severity: 'error',
          code: 'test-error',
          source: 'Test',
          message: 'Test error message'
        }
      ];
    }, 500);
  }

  override async getCompletions(): Promise<CompletionItem[]> {
    return this.completions;
  }

  override async applyQuickFix(code: string): Promise<void> {
    // Mock applying quick fix
    console.log(`Applied quick fix: ${code}`);
  }

  override getAverageResponseTime(): number {
    return this.performance.responseTime;
  }

  override getMemoryUsage(): number {
    return this.performance.memoryUsage;
  }

  override getCpuUsage(): number {
    return this.performance.cpuUsage;
  }

  override getRequestCount(): number {
    return this.performance.requestCount;
  }

  override getErrorCount(): number {
    return this.performance.errorCount;
  }
}

// Export mock classes for testing
export { MockDashboard, MockLSPClient };
