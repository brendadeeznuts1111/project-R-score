import { stringWidth } from "bun";

export interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "complete" | "error" | "queued";
}

export class UploadProgressUI {
  private lastOutput = "";
  private terminalWidth = process.stdout.columns || 80;

  render(files: UploadProgress[]) {
    const lines = [
      this.centerText("📁 FILE UPLOAD STATUS", this.terminalWidth),
      "",
    ];

    for (const file of files) {
      const name = this.truncate(file.name, 30);
      const bar = this.createProgressBar(file.progress);
      const status = this.colorizeStatus(file.status);
      
      // Using improved stringWidth for proper alignment
      const nameWidth = stringWidth(name);
      const padding = 32 - nameWidth;
      const alignedName = name + " ".repeat(padding > 0 ? padding : 0);
      
      lines.push(`${alignedName} ${bar} ${status}`);
    }

    lines.push("", this.createFooter(files));
    
    this.clearAndPrint(lines.join("\n"));
  }

  private createProgressBar(percent: number) {
    const width = 20;
    const filled = Math.round(width * percent);
    const empty = width - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${Math.round(percent * 100)}%`;
  }

  private centerText(text: string, width: number) {
    const textWidth = stringWidth(text);
    const padding = Math.max(0, Math.floor((width - textWidth) / 2));
    return " ".repeat(padding) + text;
  }

  private truncate(text: string, maxLength: number) {
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

  private colorizeStatus(status: string) {
    const colors = {
      uploading: "\x1b[36m", // Cyan
      complete: "\x1b[32m",  // Green
      error: "\x1b[31m",     // Red
      queued: "\x1b[33m",    // Yellow
    };
    return `${colors[status] || "\x1b[37m"}${status}\x1b[0m`;
  }

  private createFooter(files: UploadProgress[]) {
    const complete = files.filter(f => f.status === "complete").length;
    return `Total: ${files.length} | Completed: ${complete} | Remaining: ${files.length - complete}`;
  }

  private clearAndPrint(text: string) {
    if (this.lastOutput) {
      // Move cursor up to overwrite previous output
      process.stdout.write("\x1b[1A\x1b[2K".repeat(this.lastOutput.split("\n").length));
    }
    process.stdout.write(text + "\n");
    this.lastOutput = text + "\n";
  }
}
