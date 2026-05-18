// demo/working-pty-demo.ts
import { feature } from "bun:bundle";

console.info(`
🖥️ **WORKING PTY DEMONSTRATION WITH BUN v1.3.5**
═══════════════════════════════════════════════════════════════════

This demo showcases the power of Bun's new Terminal API for PTY support
with working examples and all v1.3.5 features!

Features demonstrated:
✅ Interactive PTY sessions with bash
✅ Reusable terminals across multiple processes
✅ Feature-gated functionality
✅ Unicode-aware terminal handling
✅ Real-time input/output forwarding
✅ Terminal resize handling
✅ Process lifecycle management
`);

// ============================================================================
// 🖥️ BASIC PTY DEMONSTRATION
// ============================================================================

const demonstrateBasicPTY = async () => {
  console.info("🚀 Starting basic PTY demonstration...");
  
  const commands = [
    "echo '🎉 Hello from Bun PTY!'",
    "echo '📁 Current directory:' && pwd",
    "echo '🕐 Current time:' && date",
    "echo '🌍 Unicode test: 🇺🇸 👋🏽 👨‍👩‍👧'",
    "echo '🎨 Colors: \\033[31mRed\\033[32m Green\\033[34m Blue\\033[0m'",
    "exit"
  ];
  
  let commandIndex = 0;
  
  const proc = Bun.spawn(["bash"], {
    terminal: {
      cols: 80,
      rows: 24,
      data: (terminal: any, data: string) => {
        process.stdout.write(data);
        
        // Wait for prompt and send next command
        if (data.includes("$") && commandIndex < commands.length) {
          setTimeout(() => {
            terminal.write(commands[commandIndex] + "\n");
            commandIndex++;
          }, 500);
        }
      },
    },
  });
  
  await proc.exited;
  proc.terminal.close();
  
  console.info("✅ Basic PTY demonstration completed!\n");
};

// ============================================================================
// 🔄 REUSABLE TERMINAL DEMONSTRATION
// ============================================================================

const demonstrateReusableTerminal = async () => {
  console.info("🔄 Demonstrating reusable terminal...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  try {
    // First process
    console.info("📝 Running first process...");
    const proc1 = Bun.spawn(["echo", "🥇 First process completed"], { terminal });
    await proc1.exited;
    
    // Second process
    console.info("📝 Running second process...");
    const proc2 = Bun.spawn(["echo", "🥈 Second process completed"], { terminal });
    await proc2.exited;
    
    // Third process with Unicode
    console.info("📝 Running Unicode process...");
    const proc3 = Bun.spawn(["echo", "🌍 Unicode test: 🇺🇸 👋🏽 🎉"], { terminal });
    await proc3.exited;
    
  } finally {
    terminal.close();
    console.info("✅ Reusable terminal demonstration completed!\n");
  }
};

// ============================================================================
// 🎮 INTERACTIVE PROGRAM DEMONSTRATION
// ============================================================================

const demonstrateInteractivePrograms = async () => {
  console.info("🎮 Demonstrating interactive program support...");
  
  // Use built-in commands instead of script
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  try {
    console.info("🎮 Running interactive program with colors and Unicode...");
    
    const proc = Bun.spawn(["bash"], {
      terminal,
      env: {
        ...process.env,
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8",
        TERM: "xterm-256color"
      }
    });
    
    // Send interactive commands
    setTimeout(() => {
      terminal.write('echo -e "\\033[1;32m🎮 Interactive Program Demo\\033[0m"\n');
    }, 500);
    
    setTimeout(() => {
      terminal.write('echo -e "\\033[1;36mChoose an option:\\033[0m"\n');
    }, 1000);
    
    setTimeout(() => {
      terminal.write('echo "1) Show system info"\n');
    }, 1500);
    
    setTimeout(() => {
      terminal.write('echo "2) Test Unicode"\n');
    }, 2000);
    
    setTimeout(() => {
      terminal.write('echo "3) Show colors"\n');
    }, 2500);
    
    setTimeout(() => {
      terminal.write('echo -e "\\033[1;33mAuto-selecting option 2...\\033[0m"\n');
    }, 3000);
    
    setTimeout(() => {
      terminal.write('echo "🌍 Unicode: 🇺🇸 👋🏽 👨‍👩‍👧 🎉"\n');
    }, 3500);
    
    setTimeout(() => {
      terminal.write('echo -e "\\033[31mRed\\033[32m Green\\033[34m Blue\\033[0m"\n');
    }, 4000);
    
    setTimeout(() => {
      terminal.write('exit\n');
    }, 4500);
    
    await proc.exited;
    
  } finally {
    terminal.close();
    console.info("✅ Interactive program demonstration completed!\n");
  }
};

// ============================================================================
// 🚩 FEATURE-GATED PTY DEMONSTRATION
// ============================================================================

const demonstrateFeatureGatedPTY = async () => {
  console.info("🚩 Demonstrating feature-gated PTY functionality...");
  
  class EnhancedPTY {
    private debugMode: boolean;
    private advancedFeatures: boolean;
    private unicodeSupport: boolean;
    
    constructor() {
      // Use feature flags in conditional statements
      if (feature("DEBUG_MODE")) {
        this.debugMode = true;
      } else {
        this.debugMode = false;
      }
      
      if (feature("ADVANCED_PTY")) {
        this.advancedFeatures = true;
      } else {
        this.advancedFeatures = false;
      }
      
      if (feature("UNICODE_ENHANCED")) {
        this.unicodeSupport = true;
      } else {
        this.unicodeSupport = false;
      }
    }
    
    async startSession() {
      console.info(`🔧 Debug mode: ${this.debugMode ? "✅" : "❌"}`);
      console.info(`🚀 Advanced features: ${this.advancedFeatures ? "✅" : "❌"}`);
      console.info(`🌍 Unicode enhanced: ${this.unicodeSupport ? "✅" : "❌"}`);
      
      const terminal = new Bun.Terminal({
        cols: 80,
        rows: 24,
        data: (term: any, data: string) => {
          if (this.debugMode) {
            console.info(`🐛 PTY data: ${data.replace(/\n/g, '\\n')}`);
          }
          process.stdout.write(data);
        },
      });
      
      if (this.advancedFeatures) {
        console.info("🚀 Advanced PTY features enabled...");
      }
      
      if (this.unicodeSupport) {
        console.info("🌍 Unicode enhancements active...");
      }
      
      return terminal;
    }
  }
  
  const enhancedPTY = new EnhancedPTY();
  const terminal = await enhancedPTY.startSession();
  
  try {
    // Run a command that showcases the features
    const proc = Bun.spawn(["bash"], {
      terminal,
      env: {
        ...process.env,
        FEATURE_DEMO: "true"
      }
    });
    
    // Send commands that demonstrate the features
    setTimeout(() => {
      terminal.write('echo "🎉 Feature-gated PTY demo!"\n');
    }, 500);
    
    setTimeout(() => {
      terminal.write('echo "🌍 Unicode: 🇺🇸 👋🏽 👨‍👩‍👧"\n');
    }, 1500);
    
    setTimeout(() => {
      terminal.write('exit\n');
    }, 2500);
    
    await proc.exited;
    
  } finally {
    terminal.close();
    console.info("✅ Feature-gated PTY demonstration completed!\n");
  }
};

// ============================================================================
// 📏 UNICODE-AWARE TERMINAL DEMONSTRATION
// ============================================================================

const demonstrateUnicodeTerminal = async () => {
  console.info("📏 Demonstrating Unicode-aware terminal handling...");
  
  // Test Unicode string width
  const testStrings = [
    { str: "🇺🇸 Flag emoji", expected: 2 },
    { str: "👋🏽 Wave + skin tone", expected: 2 },
    { str: "👨‍👩‍👧 Family", expected: 2 },
    { str: "\u2060 Word joiner", expected: 0 },
    { str: "Normal text", expected: 11 }
  ];
  
  console.info("📏 Unicode width tests:");
  testStrings.forEach(({ str, expected }) => {
    const actual = Bun.stringWidth(str);
    const status = actual === expected ? "✅" : "❌";
    console.info(`  ${status} "${str}" → ${actual} (expected: ${expected})`);
  });
  
  // Create Unicode-aware box
  const createUnicodeBox = (title: string, content: string) => {
    const titleWidth = Bun.stringWidth(title);
    const contentWidth = Bun.stringWidth(content);
    const maxwidth = Math.max(titleWidth, contentWidth) + 4;
    
    const border = "─".repeat(maxwidth);
    const paddedTitle = title.padStart((maxwidth + titleWidth) / 2).padEnd(maxwidth);
    const paddedContent = content.padStart((maxwidth + contentWidth) / 2).padEnd(maxwidth);
    
    return `┌─${paddedTitle}─┐\n│ ${paddedContent} │\n└─${border}─┘`;
  };
  
  const unicodeBox = createUnicodeBox(
    "🌍 Unicode Demo",
    "🇺🇸 👋🏽 👨‍👩‍👧 🎉"
  );
  
  console.info("\n📦 Unicode-aware box:");
  console.info(unicodeBox);
  
  // Test with PTY
  console.info("🖥️ Testing Unicode in PTY...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  try {
    const proc = Bun.spawn(["bash"], {
      terminal,
      env: {
        ...process.env,
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8"
      }
    });
    
    // Send Unicode commands
    setTimeout(() => {
      terminal.write('echo "🌍 Unicode PTY test: 🇺🇸 👋🏽 👨‍👩‍👧"\n');
    }, 500);
    
    setTimeout(() => {
      terminal.write('echo "🎨 Colors: \\033[31mRed\\033[32m Green\\033[34m Blue\\033[0m"\n');
    }, 1500);
    
    setTimeout(() => {
      terminal.write('exit\n');
    }, 2500);
    
    await proc.exited;
    
  } finally {
    terminal.close();
    console.info("✅ Unicode-aware terminal demonstration completed!\n");
  }
};

// ============================================================================
// 🔧 ADVANCED PTY FEATURES DEMONSTRATION
// ============================================================================

const demonstrateAdvancedPTY = async () => {
  console.info("🔧 Demonstrating advanced PTY features...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  // Show terminal info
  console.info(`📐 Terminal dimensions: ${terminal.cols}x${terminal.rows}`);
  console.info(`🖥️ Process terminal: ${process.stdout.columns}x${process.stdout.rows}`);
  
  try {
    // Demonstrate environment variables
    const proc = Bun.spawn(["bash"], {
      terminal,
      env: {
        ...process.env,
        PTY_DEMO: "advanced",
        CUSTOM_VAR: "from_pty_demo",
        UNICODE_SUPPORT: "enabled"
      }
    });
    
    // Send commands to demonstrate advanced features
    setTimeout(() => {
      terminal.write('echo "🔧 Advanced PTY Demo"\n');
    }, 500);
    
    setTimeout(() => {
      terminal.write('echo "📋 Environment:"\n');
    }, 1000);
    
    setTimeout(() => {
      terminal.write('env | grep PTY\n');
    }, 1500);
    
    setTimeout(() => {
      terminal.write('echo "🌍 Unicode support: $UNICODE_SUPPORT"\n');
    }, 2000);
    
    setTimeout(() => {
      terminal.write('echo "📏 Terminal width: $COLUMNS"\n');
    }, 2500);
    
    setTimeout(() => {
      terminal.write('echo "🎨 Colors: \\033[1;32mGreen\\033[1;34mBlue\\033[1;31mRed\\033[0m"\n');
    }, 3000);
    
    setTimeout(() => {
      terminal.write('exit\n');
    }, 3500);
    
    await proc.exited;
    
  } finally {
    terminal.close();
    console.info("✅ Advanced PTY features demonstration completed!\n");
  }
};

// ============================================================================
// 🎯 VIM-LIKE EDITOR DEMONSTRATION
// ============================================================================

const demonstrateVimLikeEditor = async () => {
  console.info("🎯 Demonstrating vim-like editor simulation...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  try {
    // Create a simple file editing simulation
    const proc = Bun.spawn(["bash"], {
      terminal,
      env: {
        ...process.env,
        EDITOR_DEMO: "true"
      }
    });
    
    // Simulate vim-like editing experience
    setTimeout(() => {
      terminal.write('echo "🎯 Vim-like Editor Simulation"\n');
    }, 500);
    
    setTimeout(() => {
      terminal.write('echo "Creating temporary file..."\n');
    }, 1000);
    
    setTimeout(() => {
      terminal.write('echo "🌍 Content: 🇺🇸 👋🏽 🎉" > temp.txt\n');
    }, 1500);
    
    setTimeout(() => {
      terminal.write('echo "📁 File created: temp.txt"\n');
    }, 2000);
    
    setTimeout(() => {
      terminal.write('echo "📖 Displaying content..."\n');
    }, 2500);
    
    setTimeout(() => {
      terminal.write('cat temp.txt\n');
    }, 3000);
    
    setTimeout(() => {
      terminal.write('echo "🗑️ Cleaning up..."\n');
    }, 3500);
    
    setTimeout(() => {
      terminal.write('rm temp.txt\n');
    }, 4000);
    
    setTimeout(() => {
      terminal.write('echo "✅ Editor simulation completed!"\n');
    }, 4500);
    
    setTimeout(() => {
      terminal.write('exit\n');
    }, 5000);
    
    await proc.exited;
    
  } finally {
    terminal.close();
    console.info("✅ Vim-like editor demonstration completed!\n");
  }
};

// ============================================================================
// 🚀 MAIN DEMONSTRATION RUNNER
// ============================================================================

const runAllDemonstrations = async () => {
  console.info("🚀 Starting comprehensive PTY demonstration...\n");
  
  try {
    // Check if PTY is supported
    if (process.platform === 'win32') {
      console.info("⚠️ PTY support is not available on Windows (POSIX only)");
      return;
    }
    
    // Run all demonstrations
    await demonstrateBasicPTY();
    await demonstrateReusableTerminal();
    await demonstrateInteractivePrograms();
    await demonstrateFeatureGatedPTY();
    await demonstrateUnicodeTerminal();
    await demonstrateAdvancedPTY();
    await demonstrateVimLikeEditor();
    
    console.info("🎉 All PTY demonstrations completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during demonstration:", error);
  }
};

// ============================================================================
// 📚 USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

console.info(`
📚 **USAGE EXAMPLES AND BEST PRACTICES**
═══════════════════════════════════════════════════════════════════

// Best Practice 1: Always close terminals
const terminal = new Bun.Terminal({...});
try {
  const proc = Bun.spawn(["bash"], { terminal });
  await proc.exited;
} finally {
  terminal.close();
}

// Best Practice 2: Use await using for automatic cleanup
await using terminal = new Bun.Terminal({...});
const proc = Bun.spawn(["bash"], { terminal });
await proc.exited;
// Terminal closed automatically

// Best Practice 3: Handle terminal resize
process.stdout.on("resize", () => {
  if (proc?.terminal) {
    proc.terminal.resize(process.stdout.columns, process.stdout.rows);
  }
});

// Best Practice 4: Feature-gated functionality
class PTYManager {
  constructor() {
    this.debugMode = feature("DEBUG");
    this.unicodeMode = feature("UNICODE");
  }
  
  createTerminal() {
    return new Bun.Terminal({
      data: (term, data) => {
        if (this.debugMode) console.info(data);
        process.stdout.write(data);
      }
    });
  }
}

// Best Practice 5: Environment setup
const createPTYEnvironment = (sessionId: string) => ({
  ...process.env,
  PTY_SESSION: sessionId,
  LANG: "en_US.UTF-8",
  LC_ALL: "en_US.UTF-8",
  TERM: "xterm-256color"
});

// CLI Usage Examples:
// bun run --feature=DEBUG_MODE demo/working-pty-demo.ts
// bun build --feature=ADVANCED_PTY demo/working-pty-demo.ts --outdir ./dist
`);

// Export for use in other modules
export {
  demonstrateBasicPTY,
  demonstrateReusableTerminal,
  demonstrateInteractivePrograms,
  demonstrateFeatureGatedPTY,
  demonstrateUnicodeTerminal,
  demonstrateAdvancedPTY,
  demonstrateVimLikeEditor,
  runAllDemonstrations
};

// Auto-run if this is the main module
if (import.meta.main) {
  runAllDemonstrations();
}
