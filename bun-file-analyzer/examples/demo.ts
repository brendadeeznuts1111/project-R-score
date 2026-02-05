#!/usr/bin/env bun

/**
 * Enhanced Examples Demo
 * Quick demonstration of all monitoring and analysis tools
 */

import { spawn } from "bun";
import { existsSync, mkdirSync } from "fs";

interface DemoStep {
  name: string;
  description: string;
  command: string;
  expectedOutput?: string;
  skipOnError?: boolean;
}

class ExamplesDemo {
  private steps: DemoStep[] = [
    {
      name: "Create Sample Build",
      description: "Generate sample build data for testing",
      command: "bun run test-realtime-monitoring.ts",
      expectedOutput: "Sample build created"
    },
    {
      name: "List Examples",
      description: "Show all available examples",
      command: "bun run index.ts list",
      expectedOutput: "Available Examples"
    },
    {
      name: "Bundle Analysis",
      description: "Analyze the sample bundle",
      command: "bun run bundle-analyzer.ts --dir=./dist",
      expectedOutput: "Bundle Analysis Results"
    },
    {
      name: "Performance Benchmarks",
      description: "Run performance tests",
      command: "bun run performance-benchmark.ts --type=bun",
      expectedOutput: "Performance Results"
    },
    {
      name: "Start Real-time Monitoring",
      description: "Launch the real-time monitoring server",
      command: "echo 'Monitoring server would start on http://localhost:3003'",
      expectedOutput: "localhost:3003"
    }
  ];

  async runDemo(): Promise<void> {
    console.log("🚀 Enhanced Examples Demo");
    console.log("=".repeat(50));
    console.log("This demo showcases the monitoring and analysis tools");
    console.log("available in the examples directory.\n");

    // Ensure we have a build directory
    this.ensureBuildDirectory();

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      
      console.log(`\n📋 Step ${i + 1}/${this.steps.length}: ${step.name}`);
      console.log(`📝 ${step.description}`);
      console.log("─".repeat(40));

      try {
        const result = await this.executeStep(step);
        
        if (result.success) {
          console.log("✅ Success");
          if (result.output) {
            console.log("📄 Output:", result.output.slice(0, 200) + (result.output.length > 200 ? "..." : ""));
          }
          successCount++;
        } else {
          console.log("❌ Failed");
          if (result.error) {
            console.log("🚨 Error:", result.error);
          }
          failureCount++;
          
          if (step.skipOnError) {
            console.log("⏭️ Skipping remaining steps...");
            break;
          }
        }
      } catch (error) {
        console.log("❌ Error:", (error as Error).message);
        failureCount++;
      }

      // Add a small delay between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Demo Results:");
    console.log(`✅ Successful: ${successCount}/${this.steps.length}`);
    console.log(`❌ Failed: ${failureCount}/${this.steps.length}`);

    if (successCount === this.steps.length) {
      console.log("\n🎉 All examples working perfectly!");
      this.showNextSteps();
    } else {
      console.log("\n⚠️ Some examples failed. Check the errors above.");
      this.showTroubleshooting();
    }
  }

  private async executeStep(step: DemoStep): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const process = spawn(["bun", ...step.command.split(" ").slice(1)], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe"
      });

      const [stdout, stderr] = await Promise.all([
        new Response(process.stdout).text(),
        new Response(process.stderr).text()
      ]);

      const exitCode = await process.exited;

      if (exitCode === 0) {
        const output = stdout.trim();
        const success = !step.expectedOutput || output.includes(step.expectedOutput);
        
        return {
          success,
          output: success ? output : `Expected "${step.expectedOutput}" but got different output`
        };
      } else {
        return {
          success: false,
          error: stderr.trim() || `Process exited with code ${exitCode}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private ensureBuildDirectory(): void {
    if (!existsSync("./dist")) {
      console.log("📁 Creating sample build directory...");
      mkdirSync("./dist", { recursive: true });
    }
  }

  private showNextSteps(): void {
    console.log("\n🎯 Next Steps:");
    console.log("1. Run individual examples:");
    console.log("   bun run examples:monitoring    # Real-time monitoring");
    console.log("   bun run examples:analyzer     # Bundle analysis");
    console.log("   bun run examples:benchmark    # Performance tests");
    console.log("   bun run examples:compare      # Build comparison");
    console.log("");
    console.log("2. View detailed documentation:");
    console.log("   cat examples/README.md");
    console.log("   cat examples/README-Realtime-Monitoring.md");
    console.log("");
    console.log("3. Integrate into your workflow:");
    console.log("   - Add to CI/CD pipeline");
    console.log("   - Set up monitoring dashboard");
    console.log("   - Configure performance alerts");
  }

  private showTroubleshooting(): void {
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check dependencies:");
    console.log("   bun run examples:check");
    console.log("");
    console.log("2. Create sample data:");
    console.log("   bun run examples:test");
    console.log("");
    console.log("3. Check file permissions:");
    console.log("   chmod +x examples/*.ts");
    console.log("");
    console.log("4. Verify Bun installation:");
    console.log("   bun --version");
  }

  async quickShowcase(): Promise<void> {
    console.log("⚡ Quick Showcase - Running Key Examples\n");

    const showcaseSteps = [
      {
        name: "Real-time Monitoring",
        command: "timeout 5s bun run realtime-monitoring.ts || true",
        description: "Start monitoring server (5 second demo)"
      },
      {
        name: "Bundle Analysis",
        command: "bun run bundle-analyzer.ts --dir=./dist --format=json | head -20",
        description: "Analyze bundle structure"
      },
      {
        name: "Performance Test",
        command: "bun run performance-benchmark.ts --type=bun | head -15",
        description: "Run performance benchmarks"
      }
    ];

    for (const step of showcaseSteps) {
      console.log(`🎯 ${step.name}`);
      console.log(`📝 ${step.description}`);
      console.log("─".repeat(30));

      try {
        const process = spawn(step.command, {
          shell: true,
          stdout: "inherit",
          stderr: "inherit"
        });

        await process.exited;
      } catch (error) {
        console.log("⚠️ Demo step failed, continuing...");
      }

      console.log("");
    }

    console.log("🎉 Quick showcase complete!");
    console.log("Run 'bun run demo.ts' for the full demo.");
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  const demo = new ExamplesDemo();

  switch (command) {
    case 'full':
      await demo.runDemo();
      break;
    case 'quick':
      await demo.quickShowcase();
      break;
    case 'help':
    default:
      console.log(`
🚀 Enhanced Examples Demo

Usage:
  bun run demo.ts [command]

Commands:
  full     Run complete demo with all examples
  quick    Quick showcase of key features
  help     Show this help

Examples:
  bun run demo.ts full     # Complete demo
  bun run demo.ts quick    # Quick showcase
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { ExamplesDemo };
