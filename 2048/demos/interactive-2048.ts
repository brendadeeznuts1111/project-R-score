#!/usr/bin/env bun

// Interactive 2048 game with stdin controls
import { colourKit } from "./quantum-toolkit-patch.ts";

class InteractiveGame2048 {
  private grid: number[][];
  private score: number = 0;
  private size: number = 4;

  constructor() {
    this.grid = this.emptyGrid();
    this.addRandomTile();
    this.addRandomTile();
  }

  private emptyGrid(): number[][] {
    return Array(this.size)
      .fill(null)
      .map(() => Array(this.size).fill(0));
  }

  private addRandomTile(): void {
    const empty: [number, number][] = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.grid[i][j] === 0) {
          empty.push([i, j]);
        }
      }
    }

    if (empty.length > 0) {
      const [x, y] = empty[Math.floor(Math.random() * empty.length)];
      this.grid[x][y] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  private move(direction: "up" | "down" | "left" | "right"): boolean {
    const previous = this.grid.map((row) => [...row]);
    let moved = false;

    if (direction === "left") {
      for (let i = 0; i < this.size; i++) {
        const row = this.grid[i].filter((val) => val !== 0);
        const merged = this.mergeRow(row);
        this.grid[i] = merged.concat(Array(this.size - merged.length).fill(0));
      }
    } else if (direction === "right") {
      for (let i = 0; i < this.size; i++) {
        const row = this.grid[i].filter((val) => val !== 0);
        const merged = this.mergeRow(row.reverse()).reverse();
        this.grid[i] = Array(this.size - merged.length)
          .fill(0)
          .concat(merged);
      }
    } else if (direction === "up") {
      for (let j = 0; j < this.size; j++) {
        const column: number[] = [];
        for (let i = 0; i < this.size; i++) {
          if (this.grid[i][j] !== 0) {
            column.push(this.grid[i][j]);
          }
        }
        const merged = this.mergeRow(column);
        for (let i = 0; i < this.size; i++) {
          this.grid[i][j] = merged[i] || 0;
        }
      }
    } else if (direction === "down") {
      for (let j = 0; j < this.size; j++) {
        const column: number[] = [];
        for (let i = 0; i < this.size; i++) {
          if (this.grid[i][j] !== 0) {
            column.push(this.grid[i][j]);
          }
        }
        const merged = this.mergeRow(column.reverse()).reverse();
        for (let i = 0; i < this.size; i++) {
          this.grid[i][j] = merged[this.size - 1 - i] || 0;
        }
      }
    }

    // Check if grid changed
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (previous[i][j] !== this.grid[i][j]) {
          moved = true;
          break;
        }
      }
    }

    if (moved) {
      this.addRandomTile();
    }

    return moved;
  }

  private mergeRow(row: number[]): number[] {
    const merged: number[] = [];
    let i = 0;
    while (i < row.length) {
      if (i < row.length - 1 && row[i] === row[i + 1]) {
        merged.push(row[i] * 2);
        this.score += row[i] * 2;
        i += 2;
      } else {
        merged.push(row[i]);
        i++;
      }
    }
    return merged;
  }

  private render(): void {
    console.clear();
    console.log("\n🎮 2048 GAME - Interactive Mode");
    console.log(
      "Score: " +
        colourKit(Math.min(this.score / 10000, 1)).ansi +
        this.score +
        "\x1b[0m"
    );
    console.log(
      "\nControls: w(up) s(down) a(left) d(right) r(reset) q(quit)\n"
    );

    // Render grid with colors
    for (let i = 0; i < this.size; i++) {
      let line = "┌─────┬─────┬─────┬─────┐\n";
      line += "│";
      for (let j = 0; j < this.size; j++) {
        const value = this.grid[i][j];
        if (value === 0) {
          line += "     │";
        } else {
          const color = colourKit(Math.min(Math.log2(value) / 11, 1));
          const display = value.toString().padStart(4, " ");
          line += color.ansi + display + "\x1b[0m │";
        }
      }
      console.log(line);
      if (i === this.size - 1) {
        console.log("└─────┴─────┴─────┴─────┘");
      } else {
        console.log("├─────┼─────┼─────┼─────┤");
      }
    }

    if (this.checkWin()) {
      console.log("\n🎉 YOU WIN! 🎉");
    } else if (this.checkGameOver()) {
      console.log("\n💀 GAME OVER 💀");
    }

    console.write("\n> ");
  }

  private checkWin(): boolean {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.grid[i][j] === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  private checkGameOver(): boolean {
    // Check for empty cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.grid[i][j] === 0) {
          return false;
        }
      }
    }

    // Check for possible merges
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const current = this.grid[i][j];
        if (
          (i < this.size - 1 && current === this.grid[i + 1][j]) ||
          (j < this.size - 1 && current === this.grid[i][j + 1])
        ) {
          return false;
        }
      }
    }

    return true;
  }

  public async start(): Promise<void> {
    this.render();

    for await (const line of console) {
      const command = line.trim().toLowerCase();

      switch (command) {
        case "w":
        case "up":
          this.move("up");
          break;
        case "s":
        case "down":
          this.move("down");
          break;
        case "a":
        case "left":
          this.move("left");
          break;
        case "d":
        case "right":
          this.move("right");
          break;
        case "r":
        case "reset":
          this.grid = this.emptyGrid();
          this.score = 0;
          this.addRandomTile();
          this.addRandomTile();
          break;
        case "q":
        case "quit":
        case "exit":
          console.log("\n👋 Thanks for playing!");
          return;
        default:
          if (command) {
            console.log(`Unknown command: ${command}`);
          }
      }

      this.render();
    }
  }
}

// Start the game
const game = new InteractiveGame2048();
game.start().catch(console.error);
