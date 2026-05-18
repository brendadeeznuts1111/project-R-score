#!/usr/bin/env bun

// Enhanced interactive calculator with quantum visualization
import { colourKit, pad, rgbaLattice, sse } from "./quantum-toolkit-patch.ts";

class EnhancedCalculator {
  private history: number[] = [];
  private total: number = 0;
  private operations: { input: number; total: number; color: string }[] = [];

  constructor() {
    this.showHeader();
  }

  private showHeader(): void {
    console.clear();
    console.info(
      "\n" + colourKit(0.8).ansi + "🧮 Enhanced Quantum Calculator" + "\x1b[0m"
    );
    console.info(
      colourKit(0.3).ansi + " stdin + quantum toolkit demo" + "\x1b[0m\n"
    );
    console.info("Commands: numbers | clear | history | lattice | quit\n");
  }

  private renderDisplay(): void {
    const color = colourKit(Math.min(Math.abs(this.total) / 100, 1));
    const totalStr = this.total.toString();
    const padded = pad(totalStr, 12);

    console.write("\r" + color.ansi + padded + "\x1b[0m | ");

    if (this.history.length > 0) {
      const last = this.history[this.history.length - 1];
      const lastColor = colourKit(Math.min(Math.abs(last) / 50, 1));
      console.write("Last: " + lastColor.ansi + last + "\x1b[0m");
    }

    console.write(" | History: " + this.history.length + " items");
    console.write("\n> ");
  }

  private addToHistory(value: number): void {
    this.history.push(value);
    this.total += value;

    const color = colourKit(Math.min(Math.abs(value) / 50, 1));
    this.operations.push({
      input: value,
      total: this.total,
      color: color.ansi,
    });

    // Keep only last 10 operations
    if (this.operations.length > 10) {
      this.operations.shift();
    }
  }

  private showHistory(): void {
    console.info("\n📊 Calculation History:");
    console.info("┌─────┬─────┬──────────┐");
    console.info("│ #   │ Val │ Total    │");
    console.info("├─────┼─────┼──────────┤");

    this.operations.forEach((op, i) => {
      console.info(
        `│ ${pad((i + 1).toString(), 3)} │ ${pad(op.input.toString(), 3)} │ ${
          op.color
        }${pad(op.total.toString(), 8)}\x1b[0m │`
      );
    });

    console.info("└─────┴─────┴──────────┘\n");
  }

  private showLattice(): void {
    console.info("\n🎨 Quantum Lattice Visualization:");
    const tension = Math.min(Math.abs(this.total) / 200, 1);
    console.info(rgbaLattice(tension * 10));
    console.info(`Tension level: ${(tension * 100).toFixed(1)}%\n`);
  }

  private clear(): void {
    this.history = [];
    this.total = 0;
    this.operations = [];
    this.showHeader();
  }

  private generateSSE(): void {
    const event = sse("calculation", {
      total: this.total,
      count: this.history.length,
      average: this.history.length > 0 ? this.total / this.history.length : 0,
      timestamp: new Date().toISOString(),
    });
    console.info("\n📡 SSE Event Generated:");
    console.info(event);
  }

  public async start(): Promise<void> {
    this.renderDisplay();

    for await (const line of console) {
      const input = line.trim().toLowerCase();

      if (input === "quit" || input === "q" || input === "exit") {
        console.info("\n👋 Thanks for using Enhanced Quantum Calculator!");
        console.info(
          `Final total: ${this.total} from ${this.history.length} operations`
        );
        break;
      } else if (input === "clear" || input === "c") {
        this.clear();
      } else if (input === "history" || input === "h") {
        this.showHistory();
      } else if (input === "lattice" || input === "l") {
        this.showLattice();
      } else if (input === "sse") {
        this.generateSSE();
      } else if (input === "help") {
        console.info("\n📖 Commands:");
        console.info("  numbers - Add to total");
        console.info("  clear/c - Reset calculator");
        console.info("  history/h - Show calculation history");
        console.info("  lattice/l - Show quantum visualization");
        console.info("  sse - Generate Server-Sent Event");
        console.info("  help - Show this help");
        console.info("  quit/q - Exit program");
      } else if (input && !isNaN(Number(input))) {
        const value = Number(input);
        this.addToHistory(value);
      } else if (input) {
        console.info(
          `\n❌ Unknown command: ${input}. Type 'help' for commands.`
        );
      }

      this.renderDisplay();
    }
  }
}

// Start the enhanced calculator
const calc = new EnhancedCalculator();
calc.start().catch(console.error);
