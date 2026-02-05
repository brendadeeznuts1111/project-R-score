/**
 * Pattern Examples Module
 * Comprehensive examples of pattern usage across different scenarios
 */

import type { PatternType } from '../core/pattern-types';
import { PatternUtils } from '../utilities/pattern-utilities';

export class PatternExamples {
  /**
   * Load and display data example
   */
  static async loadAndDisplay(filePath: string): Promise<any> {
    const pipeline = PatternUtils.pipeline('LOADER', 'TABULAR');
    return await pipeline.execute(filePath);
  }

  /**
   * Secure API call with timing
   */
  static async secureAPICall(endpoint: string): Promise<any> {
    const results = await PatternUtils.chain(
      { pattern: 'SECURE', context: { type: 'retrieve', service: 'api', name: 'token' } },
      { pattern: 'TIMING', context: () => fetch(endpoint) },
      { pattern: 'TABULAR', context: null }
    );
    return results;
  }

  /**
   * Build with versioning
   */
  static async buildWithVersion(config: any): Promise<any> {
    const results = await PatternUtils.parallel(
      {
        pattern: 'VERSIONER',
        context: { type: 'increment', version: config.version, release: 'patch' },
      },
      { pattern: 'BUILDER', context: config }
    );
    return results;
  }

  /**
   * Style processing pipeline
   */
  static async processStyles(cssFiles: string[]): Promise<any> {
    const results = [];
    for (const file of cssFiles) {
      const processed = await PatternUtils.chain(
        { pattern: 'LOADER', context: file },
        { pattern: 'STYLER', context: file }
      );
      results.push(processed);
    }
    return results;
  }

  /**
   * Shell command execution
   */
  static async executeShellCommands(): Promise<any> {
    const results = await PatternUtils.parallel(
      { pattern: 'SHELL', context: { type: 'command', command: 'git status' } },
      { pattern: 'SHELL', context: { type: 'command', command: 'bun --version' } },
      { pattern: 'BUNX', context: { package: 'prettier', args: ['--version'] } }
    );
    return results;
  }

  /**
   * Development workflow automation
   */
  static async developmentWorkflow(): Promise<any> {
    const pipeline = PatternUtils.pipeline('SHELL', 'BUNX', 'TIMING', 'TABULAR');
    return await pipeline.execute({
      type: 'pipeline',
      commands: ['bun install', 'bunx eslint . --fix', 'bun test'],
    });
  }

  /**
   * Deployment automation
   */
  static async deploymentAutomation(): Promise<any> {
    const results = await PatternUtils.chain(
      { pattern: 'SHELL', context: { type: 'command', command: 'git pull' } },
      { pattern: 'BUNX', context: { package: 'typescript', args: ['--noEmit'] } },
      { pattern: 'BUILDER', context: { entrypoints: ['src/index.ts'], outdir: 'dist' } },
      { pattern: 'SHELL', context: { type: 'command', command: 'bun run deploy' } }
    );
    return results;
  }

  /**
   * Interactive CLI session
   */
  static async interactiveCLI(): Promise<any> {
    const result = await this.simulateInteractiveSession();
    return result;
  }

  /**
   * Stream processing pipeline
   */
  static async streamProcessing(): Promise<any> {
    const result = await this.simulateStreamProcessing();
    return result;
  }

  /**
   * CLI + Stream combined workflow
   */
  static async cliStreamWorkflow(): Promise<any> {
    const results = await PatternUtils.parallel(
      {
        pattern: 'INTERACTIVE',
        context: {
          type: 'single',
          prompt: 'Enter command: ',
          handler: (input: string) => `Command received: ${input}`,
        },
      },
      {
        pattern: 'STREAM',
        context: {
          processor: (text: string) => ({ wordCount: text.split(/\s+/).length }),
        },
      }
    );
    return results;
  }

  /**
   * File system validation example
   */
  static async validateProjectFiles(): Promise<any> {
    const criticalFiles = ['package.json', 'src/index.ts', 'src/patterns/pattern-weaver.ts'];

    const result = await this.simulateFileValidation(criticalFiles);
    return result;
  }

  /**
   * File information retrieval
   */
  static async getFileDetails(filePath: string): Promise<any> {
    const results = await PatternUtils.chain(
      { pattern: 'FILESYSTEM', context: { operation: 'info', path: filePath } },
      { pattern: 'TABULAR', context: [] }
    );
    return results;
  }

  /**
   * Combined file validation workflow
   */
  static async fileSystemWorkflow(): Promise<any> {
    const results = await PatternUtils.parallel(
      {
        pattern: 'FILESYSTEM',
        context: {
          operation: 'exists',
          paths: ['package.json', 'bunfig.toml', 'src/'],
        },
      },
      {
        pattern: 'FILESYSTEM',
        context: {
          operation: 'validate',
          paths: ['src/index.ts', 'src/patterns/'],
        },
      }
    );

    return { results, table: this.createTableFromResults(results) };
  }

  /**
   * String processing with utilities
   */
  static async processText(text: string): Promise<any> {
    const results = await PatternUtils.parallel(
      {
        pattern: 'UTILITIES',
        context: {
          operation: 'stringWidth',
          input: text,
          options: { countAnsiEscapeCodes: false },
        },
      },
      {
        pattern: 'UTILITIES',
        context: { operation: 'stripANSI', input: text },
      },
      {
        pattern: 'UTILITIES',
        context: { operation: 'escapeHTML', input: text },
      }
    );

    return {
      original: text,
      width: results[0].data,
      stripped: results[1].data,
      escaped: results[2].data,
    };
  }

  /**
   * UUID generation and comparison
   */
  static async uuidWorkflow(): Promise<any> {
    const uuid1 = await this.simulateUUIDGeneration('hex');
    const uuid2 = await this.simulateUUIDGeneration('base64');

    const comparison = await this.simulateDeepEquals(uuid1, uuid2);

    return { uuid1, uuid2, areEqual: comparison };
  }

  /**
   * Compression workflow
   */
  static async compressionWorkflow(data: string): Promise<any> {
    const buffer = Buffer.from(data);

    const results = await PatternUtils.chain(
      { pattern: 'UTILITIES', context: { operation: 'gzip', input: buffer } },
      { pattern: 'UTILITIES', context: { operation: 'gunzip', input: null } }
    );

    return {
      originalSize: buffer.length,
      compressedSize: results[0].data.length,
      compressionRatio:
        (((buffer.length - results[0].data.length) / buffer.length) * 100).toFixed(2) + '%',
      decompressed: new TextDecoder().decode(results[1].data),
    };
  }

  /**
   * Development tools workflow
   */
  static async developmentUtilities(): Promise<any> {
    const results = await PatternUtils.parallel(
      { pattern: 'UTILITIES', context: { operation: 'version' } },
      { pattern: 'UTILITIES', context: { operation: 'which', input: 'bun' } },
      {
        pattern: 'UTILITIES',
        context: {
          operation: 'resolveSync',
          input: './package.json',
          options: { root: process.cwd() },
        },
      }
    );

    return {
      bunInfo: results[0].data,
      bunPath: results[1].data,
      packagePath: results[2].data,
    };
  }

  /**
   * Memory analysis workflow
   */
  static async memoryAnalysis(objects: any[]): Promise<any> {
    const memoryResults = [];

    for (const obj of objects) {
      const memory = await this.simulateMemoryEstimation(obj);

      memoryResults.push({
        object: obj.constructor?.name || typeof obj,
        ...memory,
      });
    }

    return {
      individual: memoryResults,
      table: this.createTableFromResults(memoryResults),
      totalBytes: memoryResults.reduce((sum, r) => sum + r.bytes, 0),
    };
  }

  /**
   * Advanced table formatting examples
   */
  static async tableFormattingShowcase(): Promise<any> {
    const sampleData = [
      { name: 'Alice', age: 30, city: 'New York', salary: 75000, department: 'Engineering' },
      { name: 'Bob', age: 25, city: 'San Francisco', salary: 85000, department: 'Engineering' },
      { name: 'Charlie', age: 35, city: 'Austin', salary: 65000, department: 'Marketing' },
      { name: 'Diana', age: 28, city: 'Seattle', salary: 90000, department: 'Engineering' },
      { name: 'Eve', age: 32, city: 'Boston', salary: 70000, department: 'Sales' },
    ];

    const results = {
      fullTable: this.createTableFromData(sampleData, { colors: true }),
      nameAndSalary: this.createTableFromData(sampleData, {
        properties: ['name', 'salary'],
        colors: true,
      }),
      engineeringOnly: this.createTableFromData(
        sampleData.filter(person => person.department === 'Engineering'),
        { properties: ['name', 'city', 'salary'], colors: true }
      ),
      departmentSummary: this.createTableFromData(this.calculateDepartmentSummary(sampleData), {
        properties: ['department', 'count', 'avgSalary'],
        colors: true,
      }),
    };

    return results;
  }

  /**
   * Performance metrics table
   */
  static async performanceMetricsTable(): Promise<any> {
    const metrics = [
      { operation: 'File Loading', time: '1.2ms', pattern: 'LOADER', status: '✅' },
      { operation: 'Shell Command', time: '45.8ms', pattern: 'SHELL', status: '✅' },
      { operation: 'Package Exec', time: '12.3ms', pattern: 'BUNX', status: '✅' },
      { operation: 'Data Table', time: '8.7ms', pattern: 'TABULAR', status: '✅' },
      { operation: 'Timing', time: '0.1ms', pattern: 'TIMING', status: '✅' },
    ];

    return this.createTableFromData(metrics, {
      properties: ['operation', 'time', 'pattern', 'status'],
      colors: true,
    });
  }

  // Private helper methods for simulating pattern behavior

  private static async simulateInteractiveSession(): Promise<any> {
    return {
      type: 'interactive',
      session: 'simulated',
      commands: ['status', 'help', 'exit'],
      responses: ['System status: OK', 'Available commands: status, help, exit', 'Goodbye!'],
    };
  }

  private static async simulateStreamProcessing(): Promise<any> {
    const chunks = [
      { lineCount: 15, hasJSON: true, size: 1024, processed: Date.now() },
      { lineCount: 23, hasJSON: false, size: 2048, processed: Date.now() },
      { lineCount: 8, hasJSON: true, size: 512, processed: Date.now() },
    ];

    return {
      chunks,
      totalLines: chunks.reduce((sum, c) => sum + c.lineCount, 0),
      jsonChunks: chunks.filter(c => c.hasJSON).length,
      totalSize: chunks.reduce((sum, c) => sum + c.size, 0),
    };
  }

  private static async simulateFileValidation(files: string[]): Promise<any> {
    const results = files.map(file => ({
      path: file,
      exists: Math.random() > 0.2, // 80% exist
      size: Math.floor(Math.random() * 10000) + 100,
      modified: new Date(Date.now() - Math.random() * 86400000),
    }));

    return {
      results,
      allExist: results.every(r => r.exists),
      totalSize: results.reduce((sum, r) => sum + r.size, 0),
    };
  }

  private static async simulateUUIDGeneration(encoding: string): Promise<string> {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    if (encoding === 'base64') {
      return Buffer.from(uuid).toString('base64');
    }
    return uuid;
  }

  private static async simulateDeepEquals(obj1: any, obj2: any): Promise<boolean> {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  private static async simulateMemoryEstimation(
    obj: any
  ): Promise<{ bytes: number; breakdown: any }> {
    const size = JSON.stringify(obj).length * 2; // Rough estimation
    return {
      bytes: size,
      breakdown: {
        string: typeof obj === 'string' ? size : 0,
        number: typeof obj === 'number' ? 8 : 0,
        object: typeof obj === 'object' ? size : 0,
      },
    };
  }

  private static createTableFromData(data: any[], options: any = {}): any {
    if (!Array.isArray(data) || data.length === 0) {
      return { headers: [], rows: [], formatted: 'No data' };
    }

    const properties = options.properties || Object.keys(data[0]);
    const headers = properties;
    const rows = data.map(item => properties.map(prop => item[prop]));

    return {
      headers,
      rows,
      formatted: this.formatTable(headers, rows, options.colors),
      summary: {
        totalRows: data.length,
        totalColumns: headers.length,
      },
    };
  }

  private static createTableFromResults(results: any[]): any {
    const headers = ['Pattern', 'Success', 'Execution Time', 'Data'];
    const rows = results.map(r => [
      r.pattern,
      r.success ? '✅' : '❌',
      `${r.executionTime}ms`,
      typeof r.data === 'object' ? JSON.stringify(r.data).slice(0, 50) + '...' : String(r.data),
    ]);

    return {
      headers,
      rows,
      formatted: this.formatTable(headers, rows, true),
    };
  }

  private static calculateDepartmentSummary(data: any[]): any[] {
    const departments = [...new Set(data.map(d => d.department))];

    return departments.map(dept => {
      const deptData = data.filter(d => d.department === dept);
      const avgSalary = Math.round(
        deptData.reduce((sum, d) => sum + d.salary, 0) / deptData.length
      );

      return {
        department: dept,
        count: deptData.length,
        avgSalary,
      };
    });
  }

  private static formatTable(headers: string[], rows: any[][], colors: boolean = false): string {
    if (rows.length === 0) return 'No data';

    const colWidths = headers.map((header, i) =>
      Math.max(header.length, ...rows.map(row => String(row[i] || '').length))
    );

    const separator = colWidths.map(w => '─'.repeat(w + 2)).join('─┼─');

    let table = '';

    // Header
    if (colors) table += '\x1b[1m'; // Bold
    table += headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('│');
    if (colors) table += '\x1b[0m'; // Reset
    table += '\n';

    // Separator
    table += `├${separator}┤\n`;

    // Rows
    rows.forEach((row, index) => {
      if (colors && index % 2 === 1) table += '\x1b[2m'; // Dim for alternate rows
      table += row.map((cell, i) => ` ${String(cell || '').padEnd(colWidths[i])} `).join('│');
      if (colors && index % 2 === 1) table += '\x1b[0m';
      table += '\n';
    });

    return table;
  }
}
