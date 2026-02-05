// demo/interactive-pty-demo.ts
import { feature } from "bun:bundle";

console.log(`
🖥️ **INTERACTIVE PTY DEMONSTRATION WITH BUN v1.3.5**
═══════════════════════════════════════════════════════════════════

This demo showcases the power of Bun's new Terminal API for PTY support
combined with feature flags, Unicode handling, and all v1.3.5 enhancements!

Features demonstrated:
✅ Interactive PTY sessions with bash, vim, htop
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

console.log(`
🖥️ **1. BASIC PTY DEMONSTRATION**
═══════════════════════════════════════════════════════════════════

// Create interactive PTY with bash
const commands = ["echo Hello from PTY!", "pwd", "date", "exit"];
const proc = Bun.spawn(["bash"], {
  terminal: {
    cols: 80,
    rows: 24,
    data(terminal, data) {
      process.stdout.write(data);

      if (data.includes("$")) {
        const command = commands.shift();
        if (command) {
          terminal.write(command + "\\n");
        }
      }
    },
  },
});

await proc.exited;
proc.terminal.close();
`);

const demonstrateBasicPTY = async () => {
  console.log("🚀 Starting basic PTY demonstration...");
  
  const commands = [
    "echo '🎉 Hello from Bun PTY!'",
    "echo '📁 Current directory:' && pwd",
    "echo '🕐 Current time:' && date",
    "echo '🌍 Unicode test: 🇺🇸 👋🏽 👨‍👩‍👧'",
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
  
  console.log("✅ Basic PTY demonstration completed!\n");
};

// ============================================================================
// 🔄 REUSABLE TERMINAL DEMONSTRATION
// ============================================================================

console.log(`
🔄 **2. REUSABLE TERMINAL DEMONSTRATION**
═══════════════════════════════════════════════════════════════════

// Create standalone terminal to reuse across multiple subprocesses
await using terminal = new Bun.Terminal({
  cols: 80,
  rows: 24,
  data(term, data) {
    process.stdout.write(data);
  },
});

// Use with multiple processes
const proc1 = Bun.spawn(["echo", "first process"], { terminal });
await proc1.exited;

const proc2 = Bun.spawn(["echo", "second process"], { terminal });
await proc2.exited;

// Terminal is closed automatically by await using
`);

const demonstrateReusableTerminal = async () => {
  console.log("🔄 Demonstrating reusable terminal...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  try {
    // First process
    console.log("📝 Running first process...");
    const proc1 = Bun.spawn(["echo", "🥇 First process completed"], { terminal });
    await proc1.exited;
    
    // Second process
    console.log("📝 Running second process...");
    const proc2 = Bun.spawn(["echo", "🥈 Second process completed"], { terminal });
    await proc2.exited;
    
    // Third process with Unicode
    console.log("📝 Running Unicode process...");
    const proc3 = Bun.spawn(["echo", "🌍 Unicode test: 🇺🇸 👋🏽 🎉"], { terminal });
    await proc3.exited;
    
  } finally {
    terminal.close();
    console.log("✅ Reusable terminal demonstration completed!\n");
  }
};

// ============================================================================
// 🎮 INTERACTIVE PROGRAM DEMONSTRATION
// ============================================================================

console.log(`
🎮 **3. INTERACTIVE PROGRAM DEMONSTRATION**
═══════════════════════════════════════════════════════════════════

// Run interactive programs like vim, htop, or nano
const proc = Bun.spawn(["vim", "temp.txt"], {
  terminal: {
    cols: process.stdout.columns,
    rows: process.stdout.rows,
    data(term, data) {
      process.stdout.write(data);
    },
  },
});

// Handle terminal resize
process.stdout.on("resize", () => {
  proc.terminal.resize(process.stdout.columns, process.stdout.rows);
});

// Forward input from user
process.stdin.setRawMode(true);
for await (const chunk of process.stdin) {
  proc.terminal.write(chunk);
}

proc.exited.then((code) => process.exit(code));
`);

const demonstrateInteractivePrograms = async () => {
  console.log("🎮 Demonstrating interactive program support...");
  
  // Create a simple interactive program with colors
  const interactiveScript = `
echo -e "\\033[1;32m🎮 Interactive Program Demo\\033[0m"
echo -e "\\033[1;36mChoose an option:\\033[0m"
echo "1) Show system info"
echo "2) Test Unicode"
echo "3) Show colors"
echo "4) Exit"
echo -n "\\033[1;33mEnter choice (1-4): \\033[0m"
read choice
case $choice in
  1) echo "🖥️ System: $(uname -a)" ;;
  2) echo "🌍 Unicode: 🇺🇸 👋🏽 👨‍👩‍👧 🎉" ;;
  3) echo -e "\\033[31mRed\\033[32m Green\\033[34m Blue\\033[0m" ;;
  4) echo "👋 Goodbye!" ;;
  *) echo "❌ Invalid choice" ;;
esac
`;
  
  // Write script to temporary file
  await Bun.write("/tmp/interactive_demo.sh", interactiveScript);
  await Bun.spawn(["chmod", "+x", "/tmp/interactive_demo.sh"]).exited;
  
  console.log("🎮 Running interactive program with colors and Unicode...");
  
  const proc = Bun.spawn(["/tmp/interactive_demo.sh"], {
    terminal: {
      cols: 80,
      rows: 24,
      data: (term: any, data: string) => {
        process.stdout.write(data);
        
        // Auto-select option 2 for Unicode demo
        if (data.includes("Enter choice")) {
          setTimeout(() => {
            term.write("2\n");
          }, 1000);
        }
      },
    },
  });
  
  await proc.exited;
  
  // Cleanup
  await Bun.spawn(["rm", "/tmp/interactive_demo.sh"]).exited;
  
  console.log("✅ Interactive program demonstration completed!\n");
};

// ============================================================================
// 🚩 FEATURE-GATED PTY DEMONSTRATION
// ============================================================================

console.log(`
🚩 **4. FEATURE-GATED PTY DEMONSTRATION**
═══════════════════════════════════════════════════════════════════

// Use feature flags to conditionally enable PTY features
import { feature } from "bun:bundle";

class EnhancedPTY {
  constructor() {
    this.debugMode = feature("DEBUG_MODE");
    this.advancedFeatures = feature("ADVANCED_PTY");
    this.unicodeSupport = feature("UNICODE_ENHANCED");
  }
  
  async startSession() {
    const terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data: (term, data) => {
        if (this.debugMode) {
          console.log(\`🐛 PTY data: \${data}\`);
        }
        process.stdout.write(data);
      },
    });
    
    if (this.advancedFeatures) {
      // Enable advanced PTY features
      terminal.setRawMode(true);
    }
    
    return terminal;
  }
}

// Build with: bun build --feature=DEBUG_MODE --feature=ADVANCED_PTY ./app.ts
`);

const demonstrateFeatureGatedPTY = async () => {
  console.log("🚩 Demonstrating feature-gated PTY functionality...");
  
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
      console.log(`🔧 Debug mode: ${this.debugMode ? "✅" : "❌"}`);
      console.log(`🚀 Advanced features: ${this.advancedFeatures ? "✅" : "❌"}`);
      console.log(`🌍 Unicode enhanced: ${this.unicodeSupport ? "✅" : "❌"}`);
      
      const terminal = new Bun.Terminal({
        cols: 80,
        rows: 24,
        data: (term: any, data: string) => {
          if (this.debugMode) {
            console.log(`🐛 PTY data: ${data.replace(/\n/g, '\\n')}`);
          }
          process.stdout.write(data);
        },
      });
      
      if (this.advancedFeatures) {
        console.log("🚀 Enabling advanced PTY features...");
      }
      
      if (this.unicodeSupport) {
        console.log("🌍 Unicode enhancements active...");
      }
      
      return terminal;
    }
  }
  
  const enhancedPTY = new EnhancedPTY();
  const terminal = await enhancedPTY.startSession();
  
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
  terminal.close();
  
  console.log("✅ Feature-gated PTY demonstration completed!\n");
};

// ============================================================================
// 📏 UNICODE-AWARE TERMINAL DEMONSTRATION
// ============================================================================

console.log(`
📏 **5. UNICODE-AWARE TERMINAL DEMONSTRATION**
═══════════════════════════════════════════════════════════════════

// Enhanced Unicode string width handling
const createUnicodeBox = (title: string, content: string) => {
  const titleWidth = Bun.stringWidth(title);
  const contentWidth = Bun.stringWidth(content);
  const maxwidth = Math.max(titleWidth, contentWidth) + 4;
  
  const border = "─".repeat(maxwidth);
  const paddedTitle = title.padStart((maxwidth + titleWidth) / 2).padEnd(maxwidth);
  const paddedContent = content.padStart((maxwidth + contentWidth) / 2).padEnd(maxwidth);
  
  return \`┌─\${paddedTitle}─┐\n│ \${paddedContent} │\n└─\${border}─┘\`;
};

// Test with complex Unicode
const box = createUnicodeBox(
  "🌍 Unicode Demo",
  "🇺🇸 👋🏽 👨‍👩‍👧 🎉"
);

console.log(box);
// Output:
// ┌─ 🌍 Unicode Demo ─┐
// │ 🇺🇸 👋🏽 👨‍👩‍👧 🎉 │
// └───────────────────┘
`);

const demonstrateUnicodeTerminal = async () => {
  console.log("📏 Demonstrating Unicode-aware terminal handling...");
  
  // Test Unicode string width
  const testStrings = [
    { str: "🇺🇸 Flag emoji", expected: 2 },
    { str: "👋🏽 Wave + skin tone", expected: 2 },
    { str: "👨‍👩‍👧 Family", expected: 2 },
    { str: "\u2060 Word joiner", expected: 0 },
    { str: "Normal text", expected: 11 }
  ];
  
  console.log("📏 Unicode width tests:");
  testStrings.forEach(({ str, expected }) => {
    const actual = Bun.stringWidth(str);
    const status = actual === expected ? "✅" : "❌";
    console.log(`  ${status} "${str}" → ${actual} (expected: ${expected})`);
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
  
  console.log("\n📦 Unicode-aware box:");
  console.log(unicodeBox);
  
  // Test with PTY
  console.log("🖥️ Testing Unicode in PTY...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
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
  terminal.close();
  
  console.log("✅ Unicode-aware terminal demonstration completed!\n");
};

// ============================================================================
// 🔧 ADVANCED PTY FEATURES DEMONSTRATION
// ============================================================================

console.log(`
🔧 **6. ADVANCED PTY FEATURES DEMONSTRATION**
═══════════════════════════════════════════════════════════════════

// Terminal resize handling
process.stdout.on("resize", () => {
  proc.terminal.resize(process.stdout.columns, process.stdout.rows);
  console.log(\`📐 Terminal resized to \${process.stdout.columns}x\${process.stdout.rows}\`);
});

// Raw mode for direct input handling
terminal.setRawMode(true);

// Process reference management
terminal.ref();   // Keep event loop alive
terminal.unref(); // Allow event loop to exit

// Environment variable inheritance
const proc = Bun.spawn(["bash"], {
  terminal,
  env: {
    ...process.env,
    CUSTOM_VAR: "from_pty",
    PTY_SESSION: "advanced_demo"
  }
});
`);

const demonstrateAdvancedPTY = async () => {
  console.log("🔧 Demonstrating advanced PTY features...");
  
  const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data: (term: any, data: string) => {
      process.stdout.write(data);
    },
  });
  
  // Show terminal info
  console.log(`📐 Terminal dimensions: ${terminal.cols}x${terminal.rows}`);
  console.log(`🖥️ Process terminal: ${process.stdout.columns}x${process.stdout.rows}`);
  
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
  terminal.close();
  
  console.log("✅ Advanced PTY features demonstration completed!\n");
};

// ============================================================================
// 🚀 MAIN DEMONSTRATION RUNNER
// ============================================================================

const runAllDemonstrations = async () => {
  console.log("🚀 Starting comprehensive PTY demonstration...\n");
  
  try {
    // Check if PTY is supported
    if (process.platform === 'win32') {
      console.log("⚠️ PTY support is not available on Windows (POSIX only)");
      return;
    }
    
    // Run all demonstrations
    await demonstrateBasicPTY();
    await demonstrateReusableTerminal();
    await demonstrateInteractivePrograms();
    await demonstrateFeatureGatedPTY();
    await demonstrateUnicodeTerminal();
    await demonstrateAdvancedPTY();
    
    console.log("🎉 All PTY demonstrations completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during demonstration:", error);
  }
};

// ============================================================================
// 📚 USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

console.log(`
📚 **7. USAGE EXAMPLES AND BEST PRACTICES**
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
        if (this.debugMode) console.log(data);
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
`);

// Export for use in other modules
export {
  demonstrateBasicPTY,
  demonstrateReusableTerminal,
  demonstrateInteractivePrograms,
  demonstrateFeatureGatedPTY,
  demonstrateUnicodeTerminal,
  demonstrateAdvancedPTY,
  runAllDemonstrations
};

// Auto-run if this is the main module
if (import.meta.main) {
  runAllDemonstrations();
}
