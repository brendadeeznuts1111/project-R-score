#!/usr/bin/env bun
/**
 * [ENFORCEMENT][TUTORIAL][INTERACTIVE][META:{DURATION:15min}][#REF:tutorial]{BUN-API}
 * Interactive CLI tutorial for table enforcement adoption
 */

import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

class TableTutorial {
  private currentStep = 0;
  private score = 0;

  private steps = [
    {
      title: "Welcome to Table Enforcement Tutorial",
      content:
        "Learn how to create compliant tables with 6+ meaningful columns",
      question: "Ready to start? (yes/no)",
      validate: (userInput: string) => userInput.toLowerCase().trim() === "yes",
      hint: 'Type "yes" to begin',
    },
    {
      title: "Understanding Meaningful Columns",
      content:
        "Meaningful columns provide business value. Generic columns like 'id', 'timestamp', 'createdAt' don't count toward the minimum.",
      example: `
// ❌ Non-compliant (only 2 meaningful)
table(users, { properties: ['id', 'name', 'email'] })

// ✅ Compliant (6 meaningful)
table(users, { 
  properties: ['name', 'email', 'role', 'department', 'status', 'lastLogin'] 
})`,
      question:
        "How many meaningful columns are in: ['id', 'name', 'createdAt', 'email', 'role']?",
      validate: (userInput: string) => userInput.trim() === "3",
      hint: "Count: id (generic), name (✓), createdAt (generic), email (✓), role (✓) = 3",
    },
    {
      title: "Using VS Code Snippets",
      content:
        'Type "bun-table-enterprise" and press Tab to auto-generate compliant tables',
      question: "Try the snippet in your VS Code editor. Did it work? (yes/no)",
      validate: (userInput: string) => userInput.toLowerCase().trim() === "yes",
      hint: "Make sure VS Code extension is installed",
    },
    {
      title: "Running Table Doctor",
      content: "Use 'bun table-doctor' to analyze your codebase",
      practice: true,
      question:
        "Run 'bun table-doctor --analyze' in your project. How many issues did it find?",
      validate: (userInput: string) => !isNaN(parseInt(userInput.trim())),
      hint: "The output will show non-compliant tables",
    },
    {
      title: "Understanding Suggestions",
      content:
        "The suggestion engine provides intelligent column recommendations based on your domain and data patterns.",
      example: `
// User management domain suggestions:
['name', 'email', 'role', 'department', 'status', 'lastLogin']

// E-commerce domain suggestions:
['productName', 'category', 'price', 'stock', 'supplier', 'status']
`,
      question:
        "Which domain would suggest: ['company', 'contact', 'email', 'stage', 'value', 'priority']?",
      validate: (userInput: string) =>
        userInput.toLowerCase().includes("crm") ||
        userInput.toLowerCase().includes("customer"),
      hint: "Think about customer relationship management...",
    },
    {
      title: "Quick Fix: ESLint Auto-fix",
      content: "Use 'bun eslint . --fix' to automatically fix table violations",
      question: "Have you tried the auto-fix feature? (yes/no/skip)",
      validate: (userInput: string) =>
        userInput.toLowerCase().trim() === "yes" ||
        userInput.toLowerCase().trim() === "no" ||
        userInput.toLowerCase().trim() === "skip",
      hint: 'Type "skip" to move on',
    },
    {
      title: "Congratulations! 🎉",
      content: `You've completed the table enforcement tutorial!

Summary of what you learned:
• Meaningful vs generic columns
• Using VS Code snippets for quick compliance
• Running table-doctor for analysis
• Understanding intelligent suggestions
• ESLint auto-fix capabilities

Next steps:
1. Run table-doctor on your project
2. Fix any non-compliant tables
3. Use snippets for new tables
4. Share feedback with the team`,
      question: "Ready to start enforcing compliance? (yes)",
      validate: (userInput: string) => userInput.toLowerCase().trim() === "yes",
      onComplete: () => {
        console.log("\n🎓 Thank you for completing the tutorial!");
        console.log("📚 Resources:");
        console.log("  • Docs: docs/TABLE_ENFORCEMENT.md");
        console.log("  • Slack: #table-enforcement");
        console.log("  • Issues: Report via /reportbug");
      },
    },
  ];

  async start(): Promise<void> {
    console.clear();
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║     🎓 Bun Table Enforcement Tutorial                    ║");
    console.log("║        Master table compliance in 5 minutes              ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");

    await this.runStep();
  }

  private async runStep(): Promise<void> {
    if (this.currentStep >= this.steps.length) {
      await this.complete();
      return;
    }

    const step = this.steps[this.currentStep];

    console.log(
      `\n📚 Step ${this.currentStep + 1}/${this.steps.length}: ${step.title}`
    );
    console.log("═".repeat(50));
    console.log(step.content);

    if (step.example) {
      console.log("\n💡 Example:");
      console.log(step.example);
    }

    if (step.practice) {
      console.log("\n🎯 Practice: Complete the exercise above");
    }

    const userAnswer = await this.askQuestion(`\n${step.question} `);

    if (step.validate(userAnswer)) {
      console.log("✅ Correct!");
      this.score++;

      if (step.onComplete) {
        step.onComplete();
      }

      this.currentStep++;
      await this.runStep();
    } else {
      console.log("❌ Not quite right.");
      console.log(`💡 Hint: ${step.hint}`);

      const retryAnswer = await this.askQuestion("Try again? (yes/no) ");
      if (retryAnswer.toLowerCase().trim() !== "yes") {
        console.log("Moving to next step...");
        this.currentStep++;
        await this.runStep();
      }
    }
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  private async complete(): Promise<void> {
    console.log("\n" + "🎉".repeat(20));
    console.log(`\n📊 Tutorial Complete!`);
    console.log(`   Score: ${this.score}/${this.steps.length - 1}`);
    console.log("   Status: 🎓 Certified Table Enforcer");

    rl.close();
  }
}

// Run tutorial
const tutorial = new TableTutorial();
tutorial.start().catch(console.error);
