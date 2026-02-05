---
type: documentation
title: Enhanced Progress Bar System
section: Development
category: technical-documentation
priority: high
status: published
tags: [progress, bar, dynamic, visual, feedback, bun]
created: 2025-11-18T18:25:00Z
modified: 2025-11-18T18:25:00Z
author: Odds Protocol Development Team
teamMember: UI/UX Specialist
version: 1.0.0
---

# 🎨 Enhanced Progress Bar System

## **Dynamic Visual Feedback with Width Integration**

---

## **🎯 Overview**

The Enhanced Progress Bar System provides sophisticated visual feedback for long-running operations, featuring dynamic width calculation, smooth animations, and comprehensive status reporting.

---

## **🏗️ Core Components**

### **ProgressBar Class**

```typescript
export class ProgressBar {
  private current: number = 0;
  private total: number = 100;
  private width: number = 50;
  private startTime: number = Date.now();
  private lastUpdate: number = 0;

  constructor(options: ProgressBarOptions = {}) {
    this.total = options.total || 100;
    this.width = options.width || this.calculateTerminalWidth();
    this.startTime = Date.now();
  }

  // Update progress
  update(current: number, message?: string): void {
    this.current = Math.min(current, this.total);
    this.render(message);
    this.lastUpdate = Date.now();
  }

  // Increment by step
  increment(step: number = 1, message?: string): void {
    this.update(this.current + step, message);
  }

  // Complete the progress bar
  complete(message?: string): void {
    this.update(this.total, message || "Complete!");
    console.log(); // New line after completion
  }

  // Render the progress bar
  private render(message?: string): void {
    const percentage = this.current / this.total;
    const filled = Math.floor(percentage * this.width);
    const empty = this.width - filled;
    
    // Calculate ETA
    const elapsed = Date.now() - this.startTime;
    const eta = this.current > 0 ? 
      (elapsed / this.current) * (this.total - this.current) : 0;
    
    // Build progress bar
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const percent = (percentage * 100).toFixed(1);
    const etaStr = this.formatTime(eta);
    
    // Clear line and render
    process.stdout.write("\r" + " ".repeat(process.stdout.columns || 80));
    process.stdout.write(`\r[${bar}] ${percent}% | ETA: ${etaStr}`);
    
    if (message) {
      process.stdout.write(` | ${message}`);
    }
  }

  private calculateTerminalWidth(): number {
    const columns = process.stdout.columns || 80;
    return Math.max(20, Math.floor(columns * 0.6));
  }

  private formatTime(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
```

### **Advanced Progress Bar with Stages**

```typescript
export class StagedProgressBar extends ProgressBar {
  private stages: ProgressStage[] = [];
  private currentStage: number = 0;

  constructor(stages: ProgressStage[], options: ProgressBarOptions = {}) {
    super(options);
    this.stages = stages;
  }

  // Advance to next stage
  nextStage(message?: string): void {
    if (this.currentStage < this.stages.length) {
      const stage = this.stages[this.currentStage];
      this.update(stage.progress, message || stage.name);
      this.currentStage++;
    }
  }

  // Set specific stage
  setStage(stageIndex: number, message?: string): void {
    if (stageIndex >= 0 && stageIndex < this.stages.length) {
      this.currentStage = stageIndex;
      const stage = this.stages[stageIndex];
      this.update(stage.progress, message || stage.name);
    }
  }

  // Get stage info
  getCurrentStage(): ProgressStage | null {
    return this.stages[this.currentStage] || null;
  }
}
```

---

## **🎨 Visual Styles**

### **Style Types**

```typescript
export enum ProgressStyle {
  CLASSIC = "classic",           // [=====>    ] 50%
  DETAILED = "detailed",         // [████████░░] 80% | ETA: 2s | 100/125
  MINIMAL = "minimal",           // ▰▰▰▰▰▱▱ 60%
  PERCENTAGE = "percentage",     // 75% complete
  TIME_BASED = "time",           // [████░░] 2s / 8s
  CUSTOM = "custom"              // Custom formatting
}
```

### **Style Implementations**

```typescript
export class StyledProgressBar {
  private style: ProgressStyle;
  private colors: ProgressColors;

  constructor(
    style: ProgressStyle = ProgressStyle.CLASSIC,
    colors: ProgressColors = {}
  ) {
    this.style = style;
    this.colors = {
      filled: colors.filled || "█",
      empty: colors.empty || "░",
      start: colors.start || "[",
      end: colors.end || "]",
      ...colors
    };
  }

  renderStyled(percentage: number, message?: string): string {
    switch (this.style) {
      case ProgressStyle.CLASSIC:
        return this.renderClassic(percentage, message);
      case ProgressStyle.DETAILED:
        return this.renderDetailed(percentage, message);
      case ProgressStyle.MINIMAL:
        return this.renderMinimal(percentage, message);
      case ProgressStyle.PERCENTAGE:
        return this.renderPercentage(percentage, message);
      case ProgressStyle.TIME_BASED:
        return this.renderTimeBased(percentage, message);
      default:
        return this.renderClassic(percentage, message);
    }
  }

  private renderClassic(percentage: number, message?: string): string {
    const width = 20;
    const filled = Math.floor(percentage * width);
    const bar = this.colors.filled.repeat(filled) + 
                this.colors.empty.repeat(width - filled);
    const percent = (percentage * 100).toFixed(0);
    
    return `${this.colors.start}${bar}${this.colors.end} ${percent}%`;
  }

  private renderDetailed(percentage: number, message?: string): string {
    const width = 25;
    const filled = Math.floor(percentage * width);
    const bar = this.colors.filled.repeat(filled) + 
                this.colors.empty.repeat(width - filled);
    const percent = (percentage * 100).toFixed(1);
    
    let result = `${this.colors.start}${bar}${this.colors.end} ${percent}%`;
    
    if (message) {
      result += ` | ${message}`;
    }
    
    return result;
  }

  private renderMinimal(percentage: number, message?: string): string {
    const width = 10;
    const filled = Math.floor(percentage * width);
    const bar = "▰".repeat(filled) + "▱".repeat(width - filled);
    const percent = (percentage * 100).toFixed(0);
    
    return `${bar} ${percent}%`;
  }

  private renderPercentage(percentage: number, message?: string): string {
    const percent = (percentage * 100).toFixed(1);
    const bar = this.createSpinner();
    
    let result = `${bar} ${percent}% complete`;
    
    if (message) {
      result += ` - ${message}`;
    }
    
    return result;
  }

  private renderTimeBased(percentage: number, message?: string): string {
    const width = 15;
    const filled = Math.floor(percentage * width);
    const bar = this.colors.filled.repeat(filled) + 
                this.colors.empty.repeat(width - filled);
    
    // Extract time from message if available
    const timeInfo = message?.match(/(\d+)s?\/(\d+)s?/);
    const timeStr = timeInfo ? `${timeInfo[1]}s / ${timeInfo[2]}s` : "";
    
    return `${this.colors.start}${bar}${this.colors.end} ${timeStr}`;
  }

  private createSpinner(): string {
    const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    return spinners[Math.floor(Date.now() / 100) % spinners.length];
  }
}
```

---

## **📊 Usage Examples**

### **Basic File Processing**

```typescript
import { ProgressBar } from "./progress-bar";

async function processFiles(files: string[]) {
  const progressBar = new ProgressBar({
    total: files.length,
    width: 40
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Process file
    await processFile(file);
    
    // Update progress
    progressBar.update(i + 1, `Processing ${file}`);
  }

  progressBar.complete("All files processed!");
}
```

### **Multi-Stage Operations**

```typescript
import { StagedProgressBar } from "./staged-progress-bar";

async function deployApplication() {
  const stages = [
    { name: "Building", progress: 0.2 },
    { name: "Testing", progress: 0.4 },
    { name: "Packaging", progress: 0.6 },
    { name: "Uploading", progress: 0.8 },
    { name: "Deploying", progress: 1.0 }
  ];

  const progressBar = new StagedProgressBar(stages);

  // Building
  await buildApplication();
  progressBar.nextStage("Build complete");

  // Testing
  await runTests();
  progressBar.nextStage("Tests passed");

  // Packaging
  await packageApplication();
  progressBar.nextStage("Packaged");

  // Uploading
  await uploadToServer();
  progressBar.nextStage("Uploaded");

  // Deploying
  await deployToProduction();
  progressBar.nextStage("Deployed successfully!");

  progressBar.complete();
}
```

### **Data Processing Pipeline**

```typescript
import { StyledProgressBar, ProgressStyle } from "./styled-progress-bar";

async function processDataPipeline(data: any[]) {
  const styledBar = new StyledProgressBar(
    ProgressStyle.DETAILED,
    {
      filled: "━",
      empty: "─",
      start: "┃",
      end: "┃"
    }
  );

  const totalSteps = data.length;
  let currentStep = 0;

  for (const item of data) {
    // Process data item
    await processItem(item);
    currentStep++;

    // Render styled progress
    const percentage = currentStep / totalSteps;
    const message = `Processed ${currentStep}/${totalSteps} items`;
    
    process.stdout.write("\r" + styledBar.renderStyled(percentage, message));
  }

  console.log("\n✅ Data processing complete!");
}
```

---

## **🔧 Advanced Features**

### **Multi-Progress Display**

```typescript
export class MultiProgressBar {
  private bars: Map<string, ProgressBar> = new Map();
  private activeBar: string | null = null;

  addBar(id: string, options: ProgressBarOptions): void {
    this.bars.set(id, new ProgressBar(options));
  }

  updateBar(id: string, current: number, message?: string): void {
    const bar = this.bars.get(id);
    if (bar) {
      bar.update(current, message);
      this.activeBar = id;
      this.renderMulti();
    }
  }

  private renderMulti(): void {
    const lines: string[] = [];
    
    for (const [id, bar] of this.bars) {
      const isActive = id === this.activeBar;
      const prefix = isActive ? "▶ " : "  ";
      lines.push(`${prefix}${id}: ${bar.getCurrentDisplay()}`);
    }

    // Move cursor up and render all bars
    process.stdout.write(`\x1b[${this.bars.size - 1}A`);
    process.stdout.write(lines.join("\n") + "\n");
  }
}
```

### **Progress with Cancellation**

```typescript
export class CancellableProgressBar extends ProgressBar {
  private cancelled: boolean = false;

  cancel(): void {
    this.cancelled = true;
    this.render("Cancelled");
    console.log();
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  update(current: number, message?: string): void {
    if (this.cancelled) return;
    super.update(current, message);
  }
}
```

---

## **🎯 Performance Considerations**

### **Optimization Tips**

1. **Update Frequency**: Limit updates to avoid console flickering
2. **Terminal Width**: Calculate once and cache for performance
3. **Memory Usage**: Use object pooling for frequent progress bars
4. **Async Operations**: Ensure non-blocking updates

### **Benchmarking**

```typescript
// Performance test for progress bar rendering
function benchmarkProgressBar() {
  const iterations = 10000;
  const progressBar = new ProgressBar({ total: iterations });

  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    progressBar.update(i);
  }

  const endTime = performance.now();
  console.log(`Rendered ${iterations} updates in ${endTime - startTime}ms`);
}
```

---

## **📚 Integration Examples**

### **With CLI Tools**

```typescript
#!/usr/bin/env bun
import { ProgressBar } from "./progress-bar";

// CLI progress for file operations
const files = process.argv.slice(2);
if (files.length > 0) {
  const progressBar = new ProgressBar({ total: files.length });
  
  for (const file of files) {
    await processFile(file);
    progressBar.increment();
  }
  
  progressBar.complete("All files processed!");
}
```

### **With Build Systems**

```typescript
// Build progress integration
class BuildProgressTracker {
  private progressBar: ProgressBar;

  constructor(totalTasks: number) {
    this.progressBar = new ProgressBar({
      total: totalTasks,
      width: 50
    });
  }

  taskComplete(taskName: string): void {
    this.progressBar.increment(`Completed: ${taskName}`);
  }

  buildComplete(): void {
    this.progressBar.complete("Build successful!");
  }
}
```

---

## **🔗 Related Documentation**

- **[[src/types/tick-processor-types.ts]]** - Type definitions
- **[[scripts/enhanced-progress-bar.ts]]** - Implementation
- **[[04 - Development/Type System/type-validation-patterns.md]]** - Validation patterns

---

**🏆 This enhanced progress bar system provides professional visual feedback for any long-running operation.**
