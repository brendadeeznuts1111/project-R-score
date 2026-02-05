/**
 * 🎨 Bun.Terminal TUI Widgets - Bun v1.3.5+ (macOS only)
 * 
 * Terminal User Interface components for visual deployment feedback.
 * Provides spinners, progress bars, and tables for Tier-1380 deployment UI.
 * 
 * @version 4.5
 * @requires Bun >= 1.3.5
 * @platform macOS only (Linux/Windows support coming)
 * @see https://bun.sh/docs/api/terminal
 */

/**
 * Check if Bun.Terminal TUI is supported
 * Currently only macOS has full support
 */
export function isTerminalUISupported(): boolean {
  // Bun.Terminal API currently only works on macOS
  return process.platform === 'darwin' && !!process.stdout.isTTY;
}

/**
 * Terminal UI interface
 */
interface TerminalUI {
  spinner: (text: string) => SpinnerWidget;
  progress: (options: ProgressOptions) => ProgressWidget;
  table: (rows: string[][]) => void;
}

interface SpinnerWidget {
  start(): void;
  update(text: string): void;
  success(text: string): void;
  error(text: string): void;
}

interface ProgressOptions {
  total: number;
  width?: number;
  title?: string;
}

interface ProgressWidget {
  update(value: number): void;
  stop(): void;
}

/**
 * Safe wrapper for Bun.Terminal API with fallback
 */
function getTerminal(): TerminalUI | null {
  try {
    // @ts-expect-error - Bun.Terminal is a runtime API (Bun v1.3.5+, macOS only)
    const Terminal = Bun.Terminal;
    if (!Terminal) return null;
    return Terminal as TerminalUI;
  } catch {
    return null;
  }
}

/**
 * Create a deployment spinner with fallback
 * 
 * @example
 * ```typescript
 * const spinner = createSpinner("Deploying snapshot...");
 * spinner.start();
 * 
 * try {
 *   await deploy();
 *   spinner.success("Deployment complete!");
 * } catch (err) {
 *   spinner.error(`Failed: ${err.message}`);
 * }
 * ```
 */
export function createSpinner(text: string): SpinnerWidget {
  const Terminal = getTerminal();
  
  if (Terminal && isTerminalUISupported()) {
    return Terminal.spinner(text);
  }
  
  // Fallback for non-macOS or non-TTY
  return {
    start() { console.log(`⏳ ${text}`); },
    update(newText: string) { console.log(`⏳ ${newText}`); },
    success(msg: string) { console.log(`✅ ${msg}`); },
    error(msg: string) { console.error(`❌ ${msg}`); }
  };
}

/**
 * Create a progress bar with fallback
 * 
 * @example
 * ```typescript
 * const progress = createProgress({
 *   total: 100,
 *   width: 40,
 *   title: "Uploading to R2"
 * });
 * 
 * for (let i = 0; i <= 100; i += 10) {
 *   progress.update(i);
 *   await Bun.sleep(100);
 * }
 * progress.stop();
 * ```
 */
export function createProgress(options: ProgressOptions): ProgressWidget {
  const Terminal = getTerminal();
  
  if (Terminal && isTerminalUISupported()) {
    return Terminal.progress({
      total: options.total,
      width: options.width || 40,
      title: options.title || "Progress"
    });
  }
  
  // Fallback progress bar
  const width = options.width || 40;
  const title = options.title || "Progress";
  
  return {
    update(value: number) {
      const percent = Math.min(100, Math.max(0, (value / options.total) * 100));
      const filled = Math.floor((percent / 100) * width);
      const empty = width - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      process.stdout.write(`\r${title}: [${bar}] ${percent.toFixed(1)}%`);
    },
    stop() {
      console.log(); // New line after progress
    }
  };
}

/**
 * Display a status table with fallback
 * 
 * @example
 * ```typescript
 * displayTable([
 *   ["Component", "Status", "Version"],
 *   ["scanner-cookies", "✅", "v4.5"],
 *   ["hardened-fetch", "✅", "v4.5"],
 *   ["R2 signed URLs", "✅", "v4.5"]
 * ]);
 * ```
 */
export function displayTable(rows: string[][]): void {
  const Terminal = getTerminal();
  
  if (Terminal && isTerminalUISupported()) {
    Terminal.table(rows);
    return;
  }
  
  // Fallback table display
  if (rows.length === 0) return;
  
  // Calculate column widths
  const colWidths: number[] = [];
  rows.forEach(row => {
    row.forEach((cell, i) => {
      colWidths[i] = Math.max(colWidths[i] || 0, cell.length);
    });
  });
  
  // Print table
  console.log();
  rows.forEach((row, rowIndex) => {
    const line = row.map((cell, i) => 
      cell.padEnd(colWidths[i] + 2)
    ).join('│');
    
    console.log(`│ ${line} │`);
    
    // Header separator
    if (rowIndex === 0) {
      const sep = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
      console.log(`├${sep}┤`);
    }
  });
  console.log();
}

/**
 * Deployment phase tracker with visual feedback
 */
export class DeploymentUI {
  private spinner: SpinnerWidget | null = null;
  private phases: { name: string; status: 'pending' | 'running' | 'done' | 'error'; duration?: number }[] = [];
  
  constructor(private snapshotId: string) {
    this.phases = [
      { name: 'Backup Creation', status: 'pending' },
      { name: 'R2 Upload', status: 'pending' },
      { name: 'Health Check', status: 'pending' }
    ];
  }
  
  startPhase(phaseName: string): void {
    const phase = this.phases.find(p => p.name === phaseName);
    if (phase) {
      phase.status = 'running';
      phase.duration = Date.now();
    }
    
    this.spinner = createSpinner(`${phaseName}...`);
    this.spinner.start();
  }
  
  updatePhase(phaseName: string, message: string): void {
    this.spinner?.update(`${phaseName}: ${message}`);
  }
  
  completePhase(phaseName: string): void {
    const phase = this.phases.find(p => p.name === phaseName);
    if (phase && phase.duration) {
      phase.status = 'done';
      phase.duration = Date.now() - phase.duration;
    }
    
    this.spinner?.success(`${phaseName} complete`);
    this.spinner = null;
  }
  
  failPhase(phaseName: string, error: Error): void {
    const phase = this.phases.find(p => p.name === phaseName);
    if (phase) {
      phase.status = 'error';
    }
    
    this.spinner?.error(`${phaseName} failed: ${error.message}`);
    this.spinner = null;
  }
  
  displaySummary(): void {
    const rows = [
      ['Deployment Phase', 'Status', 'Duration'],
      ...this.phases.map(p => [
        p.name,
        p.status === 'done' ? '✅' : p.status === 'error' ? '❌' : '⏳',
        p.duration ? `${(p.duration / 1000).toFixed(1)}s` : '-'
      ])
    ];
    
    const totalDuration = this.phases
      .filter(p => p.duration)
      .reduce((sum, p) => sum + (p.duration || 0), 0);
    
    rows.push(['TOTAL', '🚀', `${(totalDuration / 1000).toFixed(1)}s`]);
    
    displayTable(rows);
  }
  
  displayError(error: Error): void {
    displayTable([
      ['Error Type', 'Details'],
      ['Message', error.message],
      ['Snapshot ID', this.snapshotId],
      ['Timestamp', new Date().toISOString()]
    ]);
  }
}

/**
 * Smart deploy with automatic UI detection
 */
export async function smartDeploy<T>(
  snapshotId: string,
  deployFn: (ui: DeploymentUI) => Promise<T>
): Promise<T> {
  const ui = new DeploymentUI(snapshotId);
  
  if (isTerminalUISupported()) {
    console.log(`🚀 Tier-1380 Deployment with TUI (macOS)`);
  } else {
    console.log(`📋 Tier-1380 Deployment (console fallback)`);
    console.log(`   Platform: ${process.platform} | TTY: ${process.stdout.isTTY}`);
  }
  console.log(`   Snapshot: ${snapshotId}\n`);
  
  try {
    const result = await deployFn(ui);
    ui.displaySummary();
    return result;
  } catch (error) {
    ui.displayError(error as Error);
    throw error;
  }
}

// Entry guard for CLI demo
if (import.meta.main) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Bun.Terminal TUI Demo v4.5                               ║
║  Platform: ${process.platform.padEnd(22)} TTY: ${process.stdout.isTTY ? '✅' : '❌'}                  ║
║  TUI Support: ${isTerminalUISupported() ? '✅ macOS' : `❌ ${process.platform} (fallback)`}                         ║
╚═══════════════════════════════════════════════════════════╝
`);

  // Demo spinner
  const spinner = createSpinner("Testing spinner...");
  spinner.start();
  await Bun.sleep(1500);
  spinner.success("Spinner test complete!");

  // Demo progress bar
  const progress = createProgress({
    total: 100,
    width: 40,
    title: "Demo progress"
  });
  
  for (let i = 0; i <= 100; i += 20) {
    progress.update(i);
    await Bun.sleep(300);
  }
  progress.stop();

  // Demo table
  displayTable([
    ['Component', 'Status', 'Version'],
    ['TUI Widgets', isTerminalUISupported() ? '✅ native' : '✅ fallback', 'v4.5'],
    ['PTY Terminal', '✅', 'v1.3.5'],
    ['Spinner', '✅', 'v4.5'],
    ['Progress Bar', '✅', 'v4.5']
  ]);

  // Demo deployment UI
  const deployUI = new DeploymentUI('demo-snapshot');
  
  deployUI.startPhase('Backup Creation');
  await Bun.sleep(800);
  deployUI.completePhase('Backup Creation');
  
  deployUI.startPhase('R2 Upload');
  await Bun.sleep(1200);
  deployUI.completePhase('R2 Upload');
  
  deployUI.startPhase('Health Check');
  await Bun.sleep(400);
  deployUI.completePhase('Health Check');
  
  deployUI.displaySummary();
}
