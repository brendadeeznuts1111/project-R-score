import { TomlSecretsEditor } from './toml-editor';
import { TomlOptimizer } from '../optimizers/toml-optimizer';
import { validateSecretSyntax, ValidationResult } from '../validators/secrets-syntax';

declare global {
  const Bun: {
    file(path: string): { text(): Promise<string>; write(content: string): Promise<void> };
    stdout: { write(data: string): void; };
    argv: string[];
    glob(pattern: string): Promise<string[]>;
  };

  const process: {
    env: Record<string, string | undefined>;
    stdout: {
      columns: number;
      rows: number;
      write(data: string): void;
    };
  };
}

interface TerminalOptions {
  cols: number;
  rows: number;
  data: (term: PTYTomlEditor, data: string) => void;
}

interface Terminal {
  cols: number;
  rows: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
}

export class PTYTomlEditor {
  private editor: TomlSecretsEditor;
  private terminal: Terminal | null = null;
  private originalContent: string = '';
  private currentContent: string = '';

  constructor(configPath: string) {
    this.editor = new TomlSecretsEditor(configPath);
  }

  async startInteractiveSession(): Promise<void> {
    if (!this.isInteractiveEnabled()) {
      throw new Error('Interactive mode requires --feature INTERACTIVE');
    }

    const content = await Bun.file(this.editor['configPath'] as string).text();
    this.originalContent = content;
    this.currentContent = content;

    this.terminal = this.createTerminal();

    this.terminal.write(this.renderHeader());
    this.terminal.write(this.renderContent(content));
    this.terminal.write(this.renderHelp());
  }

  private isInteractiveEnabled(): boolean {
    return process.env.FEATURE_INTERACTIVE === 'true' ||
           Bun.argv.includes('--feature') && Bun.argv.includes('INTERACTIVE');
  }

  private createTerminal(): Terminal {
    const cols = typeof process !== 'undefined' && process.stdout
      ? process.stdout.columns || 80
      : 80;
    const rows = typeof process !== 'undefined' && process.stdout
      ? process.stdout.rows || 24
      : 24;

    return {
      cols,
      rows,
      write: (data: string) => {
        Bun.stdout.write(data);
      },
      resize: (cols: number, rows: number) => {
        this.terminal!.cols = cols;
        this.terminal!.rows = rows;
      },
      close: () => {
        Bun.stdout.write('\n\x1b[0mSession closed.\n');
      }
    };
  }

  private renderHeader(): string {
    return `\x1b[1;36mTOML Secrets Editor\x1b[0m
\x1b[90m${'─'.repeat(this.terminal?.cols || 80)}\x1b[0m

`;
  }

  private renderContent(content: string): string {
    const lines = content.split('\n');
    const displayLines = lines.slice(0, this.terminal?.rows ? this.terminal.rows - 10 : 14);

    return displayLines.map((line, i) => `\x1b[33m${String(i + 1).padStart(3, '0')}\x1b[0m ${line}`).join('\n') + '\n\n';
  }

  private renderHelp(): string {
    return `\x1b[33mCommands:\x1b[0m
  :validate    - Run security validation
  :optimize    - Optimize and minify
  :diff        - Show changes from original
  :save        - Write changes to disk
  :quit        - Exit without saving
  :help        - Show this help

> `;
  }

  async handleInput(data: string): Promise<void> {
    const command = data.trim();

    if (!command) return;

    if (command.startsWith(':')) {
      await this.executeCommand(command);
    } else {
      await this.applyEdit(command);
    }

    if (this.terminal) {
      this.terminal.write('\n> ');
    }
  }

  private async executeCommand(command: string): Promise<void> {
    switch (command.toLowerCase()) {
      case ':validate':
        await this.runValidation();
        break;

      case ':optimize':
        await this.runOptimization();
        break;

      case ':diff':
        await this.showDiff();
        break;

      case ':save':
        await this.saveChanges();
        break;

      case ':quit':
        this.quit();
        break;

      case ':help':
        this.terminal?.write(this.renderHelp());
        break;

      default:
        this.terminal?.write(`\x1b[31mUnknown command: ${command}\x1b[0m\n`);
    }
  }

  private async runValidation(): Promise<void> {
    const result = validateSecretSyntax(this.currentContent);
    const formatted = this.formatValidationResult(result);
    this.terminal?.write(formatted);
  }

  private async runOptimization(): Promise<void> {
    const optimizer = new TomlOptimizer();
    const result = await optimizer.optimize(this.currentContent);

    const sizeDiff = this.currentContent.length - result.optimized.length;
    this.terminal?.write(`\x1b[32mOptimized: -${sizeDiff} bytes\x1b[0m\n`);
    this.terminal?.write(`Compression: ${(result.compressionRatio * 100).toFixed(1)}%\n`);

    this.currentContent = result.optimized;
  }

  private async showDiff(): Promise<void> {
    const diff = this.computeDiff(this.originalContent, this.currentContent);

    this.terminal?.write(`\x1b[33mChanges from original:\x1b[0m\n`);
    this.terminal?.write(`  Added: ${diff.added} lines\n`);
    this.terminal?.write(`  Removed: ${diff.removed} lines\n`);
    this.terminal?.write(`  Total changes: ${diff.changes}\n`);
  }

  private async saveChanges(): Promise<void> {
    const configPath = this.editor['configPath'] as string;
    await Bun.file(configPath).write(this.currentContent);

    this.terminal?.write(`\x1b[32m✓ Saved to ${configPath}\x1b[0m\n`);
    this.originalContent = this.currentContent;
  }

  private quit(): void {
    this.terminal?.close();
    this.terminal = null;
  }

  private async applyEdit(edit: string): Promise<void> {
    const match = edit.match(/^(\d+)\s*[cs]\s*(.+)$/);
    if (match) {
      const [, lineNum, text] = match;
      const lineIndex = parseInt(lineNum, 10) - 1;
      const lines = this.currentContent.split('\n');

      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = text;
        this.currentContent = lines.join('\n');
        this.terminal?.write(`Line ${lineNum} updated.\n`);
      } else {
        this.terminal?.write(`\x1b[31mLine ${lineNum} out of range\x1b[0m\n`);
      }
    } else {
      this.terminal?.write(`\x1b[31mInvalid edit format. Use: <line>c<text> or <line>s<text>\x1b[0m\n`);
    }
  }

  private formatValidationResult(result: ValidationResult): string {
    if (result.valid && result.errors.length === 0) {
      return `\x1b[32m✓ All ${result.variables.length} secrets valid\x1b[0m\n`;
    }

    let output = '';
    output += `Secrets found: ${result.variables.length}\n`;
    output += `Errors: ${result.errors.length}\n`;

    for (const error of result.errors) {
      output += `\x1b[31m✗ ${error.message}\x1b[0m\n`;
    }

    if (result.variables.length > 0) {
      output += '\x1b[33mVariables:\x1b[0m\n';
      for (const v of result.variables) {
        const icon = v.isDangerous ? '⚠' : '✓';
        const color = v.isDangerous ? '\x1b[31m' : '\x1b[32m';
        output += `${icon} ${v.name} (${v.classification})\n`;
      }
    }

    return output;
  }

  private computeDiff(original: string, modified: string): { added: number; removed: number; changes: number } {
    const lines1 = original.split('\n');
    const lines2 = modified.split('\n');

    const added = lines2.filter(l => !lines1.includes(l)).length;
    const removed = lines1.filter(l => !lines2.includes(l)).length;

    return { added, removed, changes: added + removed };
  }

  getEditor(): TomlSecretsEditor {
    return this.editor;
  }

  getCurrentContent(): string {
    return this.currentContent;
  }
}
