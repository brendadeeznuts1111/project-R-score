#!/usr/bin/env bun
import { stringWidth } from "bun";
import { type UploadProgress } from "./upload-engine.js";

export class UploadProgressUI {
  private lastOutput = "";
  private terminalWidth = process.stdout.columns || 80;
  private activeFeatures: Set<string>;

  constructor(activeFeatures: string[] = []) {
    this.activeFeatures = new Set(activeFeatures);
  }

  render(files: UploadProgress[], currentFile?: string) {
    const lines = [this.createHeader(), ""];

    // Add current file info if available
    if (currentFile && this.activeFeatures.has("DEBUG")) {
      lines.push(this.formatDebugInfo(currentFile));
      lines.push("");
    }

    // Render file progress
    for (const file of files.slice(0, 10)) {
      // Limit to 10 files for terminal space
      lines.push(this.renderFileProgress(file));
    }

    if (files.length > 10) {
      lines.push(`    ... and ${files.length - 10} more files`);
    }

    lines.push("", this.createFooter(files));

    this.clearAndPrint(lines.join("\n"));
  }

  private createHeader(): string {
    const title = "📁 DASHBOARD UPLOAD STATUS";
    const border = "═".repeat(this.terminalWidth);
    const centeredTitle = this.centerText(title, this.terminalWidth);

    return [border, centeredTitle, border].join("\n");
  }

  private renderFileProgress(file: UploadProgress): string {
    const name = this.truncate(file.name, 30);
    const bar = this.createProgressBar(file.progress);
    const status = this.colorizeStatus(file.status);
    const size = this.formatFileSize(file.size);
    const speed = file.speed ? `${(file.speed / 1024).toFixed(1)}KB/s` : "";
    const eta = file.eta ? `${Math.round(file.eta)}s` : "";

    // Using improved stringWidth for proper alignment
    const nameWidth = stringWidth(name);
    const padding = 32 - nameWidth;
    const alignedName = name + " ".repeat(padding > 0 ? padding : 0);

    let line = `${alignedName} ${bar} ${status} ${size}`;

    if (speed && this.activeFeatures.has("PREMIUM")) {
      line += ` ${speed}`;
    }

    if (eta && this.activeFeatures.has("PREMIUM")) {
      line += ` ${eta}`;
    }

    return line;
  }

  private createProgressBar(percent: number): string {
    const width = 20;
    const filled = Math.round(width * percent);
    const empty = width - filled;

    // Use different characters for different feature levels
    const fillChar = this.activeFeatures.has("PREMIUM") ? "█" : "═";
    const emptyChar = this.activeFeatures.has("PREMIUM") ? "░" : " ";

    return `[${fillChar.repeat(filled)}${emptyChar.repeat(empty)}] ${Math.round(percent * 100)}%`;
  }

  private centerText(text: string, width: number): string {
    const textWidth = stringWidth(text);
    const padding = Math.max(0, Math.floor((width - textWidth) / 2));
    return " ".repeat(padding) + text;
  }

  private truncate(text: string, maxLength: number): string {
    if (stringWidth(text) <= maxLength) return text;

    // Account for emoji width (2 chars) when truncating
    let truncated = "";
    let currentWidth = 0;

    for (const char of text) {
      const charWidth = stringWidth(char);
      if (currentWidth + charWidth > maxLength - 3) {
        truncated += "...";
        break;
      }
      truncated += char;
      currentWidth += charWidth;
    }

    return truncated;
  }

  private colorizeStatus(status: string): string {
    const colors = {
      uploading: "\x1b[36m", // Cyan
      complete: "\x1b[32m", // Green
      error: "\x1b[31m", // Red
      queued: "\x1b[33m", // Yellow
      paused: "\x1b[35m", // Magenta
    };
    const icons = {
      uploading: "⬆",
      complete: "✓",
      error: "✗",
      queued: "⏳",
      paused: "⏸",
    };

    const color = colors[status as keyof typeof colors] || "\x1b[37m";
    const icon = icons[status as keyof typeof icons] || "?";

    return `${color}${icon} ${status}\x1b[0m`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  private formatDebugInfo(currentFile: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const debugInfo = `Current: ${currentFile} | Time: ${timestamp}`;
    return `\x1b[90m${debugInfo}\x1b[0m`;
  }

  private createFooter(files: UploadProgress[]): string {
    const completed = files.filter((f) => f.status === "complete").length;
    const uploading = files.filter((f) => f.status === "uploading").length;
    const errors = files.filter((f) => f.status === "error").length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    let footer = "├─ ";

    if (this.activeFeatures.has("METRICS")) {
      footer += `Completed: ${completed} | Uploading: ${uploading} | Errors: ${errors} | Total: ${this.formatFileSize(totalSize)}`;
    } else {
      footer += `Files: ${files.length} | Completed: ${completed} | Errors: ${errors}`;
    }

    if (this.activeFeatures.has("PREMIUM")) {
      const avgSpeed =
        files
          .filter((f) => f.speed)
          .reduce((sum, f) => sum + (f.speed || 0), 0) /
        Math.max(1, files.filter((f) => f.speed).length);
      footer += ` | Avg Speed: ${(avgSpeed / 1024).toFixed(1)}KB/s`;
    }

    return footer;
  }

  private clearAndPrint(text: string) {
    // Clear previous output and print new content
    const linesToClear = this.lastOutput.split("\n").length;
    process.stdout.write(`\x1b[${linesToClear}A\x1b[2K`.repeat(linesToClear));
    process.stdout.write(text + "\n");
    this.lastOutput = text;
  }

  // Animated loading spinner for premium users
  showSpinner(message: string, duration: number = 2000) {
    if (!this.activeFeatures.has("PREMIUM")) {
      console.log(message);
      return;
    }

    const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let index = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(interval);
        console.log(`\x1b[2K\r✓ ${message}`);
        return;
      }

      const spinner = spinners[index % spinners.length];
      process.stdout.write(`\r${spinner} ${message}`);
      index++;
    }, 100);
  }

  // Premium feature: Show detailed file information
  showFileDetails(file: UploadProgress) {
    if (!this.activeFeatures.has("PREMIUM")) return;

    console.log(`\n📄 File Details: ${file.name}`);
    console.log(`   Size: ${this.formatFileSize(file.size)}`);
    console.log(`   Status: ${file.status}`);
    console.log(`   Progress: ${Math.round(file.progress * 100)}%`);
    if (file.speed)
      console.log(`   Speed: ${(file.speed / 1024).toFixed(1)}KB/s`);
    if (file.eta) console.log(`   ETA: ${Math.round(file.eta)}s`);
    console.log("");
  }
}

// Example usage and demonstration
export function demonstrateUI() {
  const ui = new UploadProgressUI(["PREMIUM", "DEBUG", "METRICS"]);

  // Sample files with emoji and Unicode
  const sampleFiles: UploadProgress[] = [
    {
      name: "quarterly-report.pdf",
      progress: 1.0,
      status: "complete",
      size: 1024 * 1024 * 2.5,
    },
    {
      name: "family-photo👨‍👩‍👧.jpg",
      progress: 1.0,
      status: "complete",
      size: 1024 * 1024 * 4.2,
    },
    {
      name: "presentation📊.pptx",
      progress: 0.3,
      status: "uploading",
      size: 1024 * 1024 * 8.7,
      speed: 1024 * 512,
      eta: 12,
    },
    {
      name: "database-export.sql",
      progress: 0.0,
      status: "queued",
      size: 1024 * 1024 * 15.3,
    },
    {
      name: "source-code🚀.tar.gz",
      progress: 0.7,
      status: "uploading",
      size: 1024 * 1024 * 3.1,
      speed: 1024 * 256,
      eta: 5,
    },
  ];

  ui.render(sampleFiles, "Uploading dashboard files...");

  // Show file details for first file
  ui.showFileDetails(sampleFiles[0]);

  // Show spinner
  ui.showSpinner("Preparing upload...", 2000);
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  demonstrateUI();
}
