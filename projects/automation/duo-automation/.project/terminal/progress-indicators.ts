// terminal/progress-indicators.ts
export class UnicodeProgress {
  /**
   * Create multi-bar progress display
   */
  static createMultiProgress(
    items: Array<{ label: string; value: number; max: number }>,
    width: number = 50
  ): string {
    let output = '\n';
    
    items.forEach(item => {
      const bar = this.createProgressBar(item.value, item.max, width);
      const percentage = ((item.value / item.max) * 100).toFixed(1);
      const labelWidth = 20;
      
      // Truncate label if too long
      const displayLabel = Bun.stringWidth(item.label) > labelWidth
        ? item.label.slice(0, labelWidth - 1) + '…'
        : item.label.padEnd(labelWidth);
      
      output += `${displayLabel} ${bar} ${percentage}%\n`;
    });
    
    return output;
  }

  /**
   * Create spinner with Unicode characters
   */
  static createSpinner(frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']): {
    start: () => void;
    stop: () => void;
    update: (text: string) => void;
  } {
    let interval: Timer | null = null;
    let frameIndex = 0;
    let currentText = '';
    
    const spinner = {
      start() {
        process.stdout.write('\x1b[?25l'); // Hide cursor
        interval = setInterval(() => {
          const frame = frames[frameIndex % frames.length];
          process.stdout.write(`\r${frame} ${currentText}`);
          frameIndex++;
        }, 80);
      },
      
      stop() {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        process.stdout.write('\r\x1b[K'); // Clear line
        process.stdout.write('\x1b[?25h'); // Show cursor
      },
      
      update(text: string) {
        currentText = text;
      }
    };
    
    return spinner;
  }

  /**
   * Create hierarchical progress tree
   */
  static createProgressTree(
    nodes: Array<{
      label: string;
      status: 'pending' | 'loading' | 'success' | 'error';
      children?: Array<{ label: string; status: string }>;
    }>
  ): string {
    let output = '\n';
    const statusIcons = {
      pending: '◯',
      loading: '⟳',
      success: '✅',
      error: '❌'
    };
    
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const icon = statusIcons[node.status];
      
      output += `${prefix}${icon} ${node.label}\n`;
      
      if (node.children) {
        const childPrefix = isLast ? '    ' : '│   ';
        
        node.children.forEach((child, childIndex) => {
          const isChildLast = childIndex === node.children!.length - 1;
          const childPrefixChar = isChildLast ? '└── ' : '├── ';
          const childIcon = statusIcons[child.status as keyof typeof statusIcons] || '◯';
          
          output += `${childPrefix}${childPrefixChar}${childIcon} ${child.label}\n`;
        });
      }
    });
    
    return output;
  }

  /**
   * Create gauge with Unicode characters
   */
  static createGauge(value: number, max: number = 100): string {
    const gaugeWidth = 20;
    const filled = Math.round((value / max) * gaugeWidth);
    const empty = gaugeWidth - filled;
    
    // Use different characters for better visual representation
    const gaugeChars = [
      ' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'
    ];
    
    let gauge = '[';
    
    // Full blocks
    gauge += '█'.repeat(Math.floor(filled));
    
    // Partial block if needed
    const remainder = (filled - Math.floor(filled)) * (gaugeChars.length - 1);
    if (remainder > 0) {
      gauge += gaugeChars[Math.round(remainder)];
    }
    
    // Empty space
    gauge += ' '.repeat(empty);
    gauge += ']';
    
    // Add value and percentage
    const percentage = ((value / max) * 100).toFixed(1);
    return `${gauge} ${value}/${max} (${percentage}%)`;
  }

  /**
   * Create progress bar with Unicode characters
   */
  static createProgressBar(
    value: number,
    max: number = 100,
    width: number = 30
  ): string {
    const percentage = (value / max) * 100;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    // Choose bar characters based on Unicode support
    const barChars = {
      filled: '█',
      empty: '░',
      leftCap: '▐',
      rightCap: '▌'
    };
    
    let bar = barChars.leftCap;
    
    // Gradient color based on percentage
    let colorCode = '\x1b[32m'; // Green
    if (percentage < 30) colorCode = '\x1b[31m'; // Red
    else if (percentage < 70) colorCode = '\x1b[33m'; // Yellow
    
    bar += colorCode + barChars.filled.repeat(filled) + '\x1b[0m';
    bar += barChars.empty.repeat(empty);
    bar += barChars.rightCap;
    
    return `${bar} ${percentage.toFixed(1)}%`;
  }
}
