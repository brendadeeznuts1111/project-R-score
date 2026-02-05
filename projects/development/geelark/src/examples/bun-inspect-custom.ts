#!/usr/bin/env bun

/**
 * Bun.inspect.custom Examples
 *
 * Demonstrates how to use Bun.inspect.custom to create custom object representations
 *
 * Reference: https://bun.com/docs/runtime/utils#bun-inspect-custom
 */

import { inspect } from "bun";

// Example 1: Basic custom inspect
class BasicCustom {
  private name: string;
  private value: number;

  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }

  [Bun.inspect.custom]() {
    return `CustomObject(name="${this.name}", value=${this.value})`;
  }
}

// Example 2: Custom inspect with colors (using ANSI codes)
class ColoredCustom {
  private status: 'active' | 'inactive' | 'pending';
  private count: number;

  constructor(status: 'active' | 'inactive' | 'pending', count: number) {
    this.status = status;
    this.count = count;
  }

  [Bun.inspect.custom]() {
    const colorMap = {
      active: '\x1b[32m', // green
      inactive: '\x1b[31m', // red
      pending: '\x1b[33m', // yellow
    };
    const reset = '\x1b[0m';
    const color = colorMap[this.status];
    return `${color}Status(${this.status})${reset} - Count: ${this.count}`;
  }
}

// Example 3: Custom inspect for complex objects
class CodebaseInsights {
  private files: number;
  private lines: number;
  private healthScore: number;

  constructor(files: number, lines: number, healthScore: number) {
    this.files = files;
    this.lines = lines;
    this.healthScore = healthScore;
  }

  [Bun.inspect.custom]() {
    const scoreEmoji = this.healthScore >= 70 ? '✅' : this.healthScore >= 50 ? '⚠️' : '❌';
    return `
📊 Codebase Insights
  Files: ${this.files.toLocaleString()}
  Lines: ${this.lines.toLocaleString()}
  Health: ${scoreEmoji} ${this.healthScore}%
`;
  }
}

// Example 4: Custom inspect with table-like formatting
class Metrics {
  private metrics: Map<string, number>;

  constructor() {
    this.metrics = new Map();
  }

  set(key: string, value: number) {
    this.metrics.set(key, value);
  }

  [Bun.inspect.custom]() {
    if (this.metrics.size === 0) {
      return 'Metrics(empty)';
    }

    const lines = ['📈 Metrics:'];
    for (const [key, value] of this.metrics.entries()) {
      lines.push(`  ${key.padEnd(20)}: ${value.toLocaleString()}`);
    }
    return lines.join('\n');
  }
}

// Example 5: Custom inspect that shows internal state
class ProcessManager {
  private processes: Map<number, { name: string; status: string }>;

  constructor() {
    this.processes = new Map();
  }

  addProcess(pid: number, name: string, status: string) {
    this.processes.set(pid, { name, status });
  }

  [Bun.inspect.custom]() {
    if (this.processes.size === 0) {
      return 'ProcessManager(no processes)';
    }

    const lines = ['🔧 ProcessManager:'];
    for (const [pid, { name, status }] of this.processes.entries()) {
      const statusIcon = status === 'running' ? '▶️' : status === 'stopped' ? '⏹️' : '⏸️';
      lines.push(`  ${statusIcon} PID ${pid}: ${name} (${status})`);
    }
    return lines.join('\n');
  }
}

// Example 6: Custom inspect with depth control
class NestedData {
  private data: any;
  private maxDepth: number;

  constructor(data: any, maxDepth: number = 3) {
    this.data = data;
    this.maxDepth = maxDepth;
  }

  [Bun.inspect.custom](depth: number, options: any) {
    // Use Bun.inspect with depth limit
    const inspected = inspect(this.data, {
      depth: Math.min(depth + 1, this.maxDepth),
      ...options,
    });
    return `NestedData(${inspected})`;
  }
}

// Example 7: Custom inspect that formats JSON nicely
class JSONWrapper {
  private json: any;

  constructor(json: any) {
    this.json = json;
  }

  [Bun.inspect.custom]() {
    return JSON.stringify(this.json, null, 2);
  }
}

// Example 8: Custom inspect for arrays/collections
class ItemCollection {
  private items: Array<{ id: number; name: string }>;

  constructor() {
    this.items = [];
  }

  add(id: number, name: string) {
    this.items.push({ id, name });
  }

  [Bun.inspect.custom]() {
    if (this.items.length === 0) {
      return 'ItemCollection(empty)';
    }

    const lines = [`ItemCollection(${this.items.length} items):`];
    for (const item of this.items.slice(0, 10)) {
      lines.push(`  [${item.id}] ${item.name}`);
    }
    if (this.items.length > 10) {
      lines.push(`  ... and ${this.items.length - 10} more`);
    }
    return lines.join('\n');
  }
}

// Run examples
console.log('=== Example 1: Basic Custom Inspect ===');
const basic = new BasicCustom('test', 42);
console.log(basic);
console.log(inspect(basic));

console.log('\n=== Example 2: Colored Custom Inspect ===');
const colored1 = new ColoredCustom('active', 10);
const colored2 = new ColoredCustom('inactive', 5);
const colored3 = new ColoredCustom('pending', 3);
console.log(colored1);
console.log(colored2);
console.log(colored3);

console.log('\n=== Example 3: Codebase Insights ===');
const insights = new CodebaseInsights(293, 157748, 70);
console.log(insights);

console.log('\n=== Example 4: Metrics Table ===');
const metrics = new Metrics();
metrics.set('requests', 1234);
metrics.set('errors', 5);
metrics.set('avg_response', 45);
console.log(metrics);

console.log('\n=== Example 5: Process Manager ===');
const processManager = new ProcessManager();
processManager.addProcess(12345, 'server', 'running');
processManager.addProcess(12346, 'worker', 'stopped');
processManager.addProcess(12347, 'monitor', 'paused');
console.log(processManager);

console.log('\n=== Example 6: Nested Data ===');
const nested = new NestedData({
  level1: {
    level2: {
      level3: {
        level4: { value: 'deep' }
      }
    }
  }
}, 2);
console.log(nested);

console.log('\n=== Example 7: JSON Wrapper ===');
const jsonWrapper = new JSONWrapper({
  name: 'test',
  value: 42,
  nested: { a: 1, b: 2 }
});
console.log(jsonWrapper);

console.log('\n=== Example 8: Item Collection ===');
const collection = new ItemCollection();
for (let i = 1; i <= 15; i++) {
  collection.add(i, `Item ${i}`);
}
console.log(collection);

console.log('\n✅ All Bun.inspect.custom examples completed!');

