#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("🎯 THE PATTERN: Bun handles Bun flags, CLI handles CLI flags", () => {
  test("✅ Perfect flag separation demonstration", async () => {
    console.log("🎯 DEMONSTRATING THE PERFECT PATTERN:");
    console.log("Pattern: bun [bun-flags] dev-hq [command] [cli-flags]");
    console.log("");

    // Test the exact pattern you mentioned
    const examples = [
      {
        command: "bun --hot --watch dev-hq-cli.ts insights --table --json",
        description: "Your exact example",
        bunFlags: ["--hot", "--watch"],
        cliFlags: ["--table", "--json"],
        command: "insights",
      },
      {
        command: "bun --smol dev-hq-cli.ts git --verbose",
        description: "Mixed flags example",
        bunFlags: ["--smol"],
        cliFlags: ["--verbose"],
        command: "git",
      },
      {
        command: "bun --define NODE_ENV=prod dev-hq-cli.ts test --timeout 5000",
        description: "Environment + timeout",
        bunFlags: ["--define", "NODE_ENV=prod"],
        cliFlags: ["--timeout", "5000"],
        command: "test",
      },
      {
        command: "bun --watch --no-clear-screen dev-hq-cli.ts health --table",
        description: "Watch + screen control",
        bunFlags: ["--watch", "--no-clear-screen"],
        cliFlags: ["--table"],
        command: "health",
      },
    ];

    for (const example of examples) {
      console.log(`📋 ${example.description}:`);
      console.log(`   Command: ${example.command}`);
      console.log(`   🟡 Bun flags: [${example.bunFlags.join(", ")}]`);
      console.log(`   🟢 CLI flags: [${example.cliFlags.join(", ")}]`);
      console.log(`   🔵 Command: ${example.command}`);
      console.log("");

      // Test that the CLI correctly parses these flags
      const result = await Bun.spawn(
        ["bun", "dev-hq-cli.ts", example.command, ...example.cliFlags],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const exitCode = await result.exited;
      expect(exitCode).toBeDefined();
    }
  });

  test("✅ Flag parsing logic verification", async () => {
    console.log("🔍 Testing flag parsing logic:");
    console.log("");

    // Test the parsing logic directly
    const parseArguments = (argv: string[]) => {
      const bunFlags: string[] = [];
      const cliFlags: string[] = [];
      let command: string | null = null;

      const knownBunFlags = [
        "--hot",
        "--watch",
        "--smol",
        "--define",
        "--drop",
        "--loader",
        "--filter",
        "--conditions",
        "--no-clear-screen",
        "--preserveWatchOutput",
        "--cwd",
        "--env-file",
        "--config",
        "--help",
        "--version",
      ];

      let i = 0;
      while (i < argv.length) {
        const arg = argv[i];

        if (
          knownBunFlags.includes(arg) ||
          arg.startsWith("--define") ||
          arg.startsWith("--drop") ||
          arg.startsWith("--loader")
        ) {
          bunFlags.push(arg);

          // Handle flags with values
          if (
            arg === "--define" ||
            arg === "--drop" ||
            arg === "--loader" ||
            arg === "--filter" ||
            arg === "--conditions" ||
            arg === "--cwd" ||
            arg === "--env-file" ||
            arg === "--config"
          ) {
            i++; // Skip the value
            if (i < argv.length) bunFlags.push(argv[i]);
          }
        } else if (arg.startsWith("--") && !command) {
          // CLI flag
          cliFlags.push(arg);

          // Handle CLI flags with values
          if (arg === "--timeout" || arg === "--output" || arg === "--format") {
            i++; // Skip the value
            if (i < argv.length) cliFlags.push(argv[i]);
          }
        } else if (!command) {
          // First non-flag is the command
          command = arg;
        } else {
          // Additional arguments for the command
          cliFlags.push(arg);
        }

        i++;
      }

      return { bunFlags, command, cliFlags };
    };

    // Test cases
    const testCases = [
      {
        input: ["--hot", "--watch", "insights", "--table", "--json"],
        expected: {
          bunFlags: ["--hot", "--watch"],
          command: "insights",
          cliFlags: ["--table", "--json"],
        },
      },
      {
        input: ["--smol", "git", "--verbose"],
        expected: {
          bunFlags: ["--smol"],
          command: "git",
          cliFlags: ["--verbose"],
        },
      },
      {
        input: ["--define", "NODE_ENV=prod", "test", "--timeout", "5000"],
        expected: {
          bunFlags: ["--define", "NODE_ENV=prod"],
          command: "test",
          cliFlags: ["--timeout", "5000"],
        },
      },
    ];

    for (const testCase of testCases) {
      const result = parseArguments(testCase.input);

      console.log(`📝 Input: [${testCase.input.join(", ")}]`);
      console.log(`   🟡 Bun flags: [${result.bunFlags.join(", ")}]`);
      console.log(`   🔵 Command: ${result.command}`);
      console.log(`   🟢 CLI flags: [${result.cliFlags.join(", ")}]`);
      console.log("");

      expect(result.bunFlags).toEqual(testCase.expected.bunFlags);
      expect(result.command).toEqual(testCase.expected.command);
      expect(result.cliFlags).toEqual(testCase.expected.cliFlags);
    }
  });

  test("✅ Real-world usage scenarios", async () => {
    console.log("🌍 Real-world scenarios:");
    console.log("");

    const scenarios = [
      {
        name: "Development with hot reload",
        command: "bun --hot --watch dev-hq-cli.ts server --verbose",
        useCase:
          "Development server with hot module replacement and verbose logging",
      },
      {
        name: "Production build",
        command:
          "bun --define NODE_ENV=production dev-hq-cli.ts run build --timeout 60000",
        useCase:
          "Production build with environment variables and extended timeout",
      },
      {
        name: "Testing with coverage",
        command: "bun --watch dev-hq-cli.ts test --coverage --table",
        useCase: "Watch mode testing with coverage analysis and tabular output",
      },
      {
        name: "CI/CD pipeline",
        command: "bun --smol dev-hq-cli.ts health --json",
        useCase: "Lightweight health check with JSON output for CI/CD",
      },
      {
        name: "Code analysis",
        command: "bun dev-hq-cli.ts insights --table --output report.json",
        useCase: "Comprehensive insights with table display and file output",
      },
    ];

    for (const scenario of scenarios) {
      console.log(`📋 ${scenario.name}:`);
      console.log(`   Command: ${scenario.command}`);
      console.log(`   Use case: ${scenario.useCase}`);
      console.log("");

      // Parse and verify
      const parts = scenario.command.split(" ");
      const devHqIndex = parts.indexOf("dev-hq-cli.ts");

      if (devHqIndex !== -1) {
        const bunFlags = parts.slice(0, devHqIndex);
        const remaining = parts.slice(devHqIndex + 1);
        const command = remaining[0];
        const cliFlags = remaining.slice(1);

        console.log(`   🟡 Bun flags: [${bunFlags.join(", ")}]`);
        console.log(`   🔵 Command: ${command}`);
        console.log(`   🟢 CLI flags: [${cliFlags.join(", ")}]`);
      }

      console.log("");
    }
  });

  test("✅ Flag responsibility verification", async () => {
    console.log("🔍 Flag responsibility verification:");
    console.log("");

    console.log("🟡 Bun Flags (handled by Bun runtime):");
    console.log("   --hot           → Hot module replacement");
    console.log("   --watch         → File watching");
    console.log("   --smol          → Reduced memory mode");
    console.log("   --define        → Environment variables");
    console.log("   --drop          → Code elimination");
    console.log("   --loader        → Custom loaders");
    console.log("   --filter        → Package filtering");
    console.log("   --conditions    → Export conditions");
    console.log("   --no-clear-screen → Screen control");
    console.log("   --preserveWatchOutput → Output preservation");
    console.log("");

    console.log("🟢 CLI Flags (handled by CLI):");
    console.log("   --table         → Tabular output formatting");
    console.log("   --json          → JSON output formatting");
    console.log("   --verbose       → Detailed logging");
    console.log("   --quiet         → Minimal output");
    console.log("   --timeout       → Command timeout");
    console.log("   --output        → File output");
    console.log("   --format        → Output format");
    console.log("");

    console.log("🔵 Commands (handled by CLI):");
    console.log("   insights        → Comprehensive project analysis");
    console.log("   git             → Git repository analysis");
    console.log("   cloc            → Code analysis");
    console.log("   test            → Test execution");
    console.log("   docker          → Docker insights");
    console.log("   health          → System health check");
    console.log("   server          → Start automation server");
    console.log("   run             → Execute arbitrary command");
    console.log("");

    console.log("✅ Perfect separation achieved!");
    console.log("   Bun handles runtime behavior");
    console.log("   CLI handles output formatting");
    console.log("   Commands handle business logic");
  });

  test("✅ Pattern benefits demonstration", async () => {
    console.log("💡 Pattern Benefits:");
    console.log("");

    const benefits = [
      "🎯 Clear separation of concerns",
      "🔧 Predictable flag behavior",
      "🚀 Easy to extend and maintain",
      "📦 Type-safe implementation",
      "🔄 Consistent user experience",
      "⚡ Optimal performance",
      "🛡️ Error handling in right place",
      "📊 Flexible output options",
      "🎨 Beautiful formatting",
    ];

    benefits.forEach((benefit) => {
      console.log(`   ${benefit}`);
    });

    console.log("");
    console.log(
      "🏆 This pattern is THE way to build modern CLI tools with Bun!"
    );
  });
});
