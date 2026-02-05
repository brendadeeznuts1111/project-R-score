#!/usr/bin/env bun

/**
 * Clean Bun Console Features Demonstration
 * 
 * Organized demonstration of Bun's enhanced console capabilities:
 * - Object inspection depth configuration
 * - Console as AsyncIterable for stdin reading  
 * - Interactive console applications
 * - Advanced console formatting and utilities
 * 
 * @author Odds Protocol Development Team
 * @version 2.0.0
 * @since 2025-11-18
 */

// =============================================================================
// IMPORTS AND DEPENDENCIES
// =============================================================================

import { CleanConsole } from './clean-console-integration';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface ConsoleDemoConfig {
    showColors: boolean;
    inspectionDepth: number;
    showAnimations: boolean;
}

interface TodoItem {
    id: number;
    task: string;
    completed: boolean;
    createdAt: Date;
}

interface ChatMessage {
    sender: string;
    message: string;
    timestamp: string;
}

interface MemoryUsage {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
}

// =============================================================================
// CONSOLE INSPECTION MODULE
// =============================================================================

class ConsoleInspectionModule {
    private config: ConsoleDemoConfig;

    constructor(config: ConsoleDemoConfig) {
        this.config = config;
    }

    demonstrateObjectInspection(): void {
        this.printHeader('Console Object Inspection Depth');

        const testData = this.createTestData();

        this.showDefaultInspection(testData);
        this.showDeepInspection(testData);
        this.showStyledInspection(testData);
        this.showCompactVsDetailed(testData);
    }

    private createTestData() {
        return {
            level1: {
                level2: {
                    level3: {
                        level4: {
                            level5: {
                                data: 'This is very deep data',
                                timestamp: new Date(),
                                metadata: { id: 12345, type: 'deep-object' }
                            }
                        }
                    }
                }
            },
            array: [1, 2, 3, { nested: { in: { array: true } } }],
            function: () => 'Hello from function',
            date: new Date(),
            regex: /test.*pattern/g,
            symbol: Symbol('test-symbol')
        };
    }

    private showDefaultInspection(data: any): void {
        console.log('\n📋 Default Inspection (Depth 2):');
        console.log('Current console depth configuration affects how deep objects are displayed');
        console.log(data);
    }

    private showDeepInspection(data: any): void {
        console.log('\n🔧 Manual Deep Inspection:');
        console.log('Using Bun.inspect() for deeper inspection:');
        console.log(Bun.inspect(data, { depth: 5, colors: this.config.showColors }));
    }

    private showStyledInspection(data: any): void {
        console.log('\n🎨 Custom Inspection with Colors:');
        console.log(Bun.inspect(data, {
            depth: 4,
            colors: this.config.showColors,
            compact: false,
            maxArrayLength: 10,
            maxStringLength: 50,
            stylize: this.createStylizer()
        }));
    }

    private showCompactVsDetailed(data: any): void {
        console.log('\n📊 Compact vs Detailed Inspection:');

        console.log('\nCompact Mode:');
        console.log(Bun.inspect(data, {
            depth: 3,
            compact: true,
            colors: this.config.showColors
        }));

        console.log('\nDetailed Mode:');
        console.log(Bun.inspect(data, {
            depth: 3,
            compact: false,
            colors: this.config.showColors,
            maxArrayLength: 5,
            maxStringLength: 30
        }));
    }

    private createStylizer() {
        return (text: string, styleType: string): string => {
            if (!this.config.showColors) return text;

            switch (styleType) {
                case 'string': return `\x1b[32m${text}\x1b[0m`;
                case 'number': return `\x1b[34m${text}\x1b[0m`;
                case 'boolean': return `\x1b[35m${text}\x1b[0m`;
                case 'date': return `\x1b[36m${text}\x1b[0m`;
                default: return text;
            }
        };
    }

    demonstrateInspectionUtilities(): void {
        this.printHeader('Console Inspection Utilities');

        const complexObject = this.createComplexObject();

        this.showStandardVsEnhanced(complexObject);
        this.showTruncatedArrays(complexObject);
    }

    private createComplexObject() {
        return {
            users: [
                { id: 1, name: 'Alice', active: true, roles: ['admin', 'user'] },
                { id: 2, name: 'Bob', active: false, roles: ['user'] },
                { id: 3, name: 'Charlie', active: true, roles: ['moderator', 'user'] }
            ],
            metadata: {
                total: 3,
                active: 2,
                lastUpdated: new Date(),
                version: '1.0.0'
            },
            config: {
                features: { authentication: true, logging: true, caching: false },
                limits: { maxUsers: 100, sessionTimeout: 3600 }
            }
        };
    }

    private showStandardVsEnhanced(data: any): void {
        console.log('\n📋 Standard Console.log:');
        console.log(data);

        console.log('\n🎨 Enhanced Bun.inspect with Colors:');
        console.log(Bun.inspect(data, {
            depth: 4,
            colors: this.config.showColors,
            compact: false
        }));
    }

    private showTruncatedArrays(data: any): void {
        console.log('\n📏 Truncated Arrays and Strings:');
        console.log(Bun.inspect(data, {
            depth: 3,
            colors: this.config.showColors,
            maxArrayLength: 2,
            maxStringLength: 15
        }));
    }

    private printHeader(title: string): void {
        console.log(`\n${title}`);
        console.log('='.repeat(title.length));
    }
}

// =============================================================================
// STDIN READING MODULE
// =============================================================================

class StdinReadingModule {
    private config: ConsoleDemoConfig;

    constructor(config: ConsoleDemoConfig) {
        this.config = config;
    }

    async demonstrateStdinReading(): Promise<void> {
        this.printHeader('Console Stdin Reading Demonstration');

        this.showStdinStructure();
        await this.simulateInteractiveExamples();
        this.showAdvancedFeatures();
    }

    private showStdinStructure(): void {
        console.log('\n🔄 Console as AsyncIterable (Structure):');
        console.log(`
for await (const line of console) {
  console.log(\`Received: \${line}\`);
}
    `);
    }

    private async simulateInteractiveExamples(): Promise<void> {
        console.log('\n📝 Interactive Examples (Simulated):');

        this.simulateCounter();
        this.simulateCalculator();
        this.simulateCommandProcessor();
    }

    private simulateCounter(): void {
        console.log('\n📊 Counter Example:');
        console.log('Let\'s count with user input!');
        console.write('Count: 0\n> ');

        const simulatedInputs = ['5', '3', '2'];
        let count = 0;

        console.log('(Simulating user inputs: 5, 3, 2)');
        for (const input of simulatedInputs) {
            count += Number(input);
            console.log(`Count: ${count} (after adding ${input})`);
        }
    }

    private simulateCalculator(): void {
        console.log('\n🧮 Addition Calculator:');
        console.log('Addition Calculator - Enter numbers to add:');
        console.write('Total: 0\n> ');

        const simulatedInputs = ['10', '15', '5'];
        let total = 0;

        console.log('(Simulating user inputs: 10, 15, 5)');
        for (const input of simulatedInputs) {
            const num = Number(input);
            if (!isNaN(num)) {
                total += num;
                console.log(`Total: ${total} (after adding ${num})`);
            } else {
                console.log(`Invalid number: ${input}`);
            }
        }

        console.log(`Final total: ${total}`);
    }

    private simulateCommandProcessor(): void {
        console.log('\n🎯 Command Processor:');
        console.log('Command Processor - Available commands: help, status, time, quit');

        const simulatedCommands = ['help', 'status', 'time', 'quit'];

        console.log('(Simulating commands: help, status, time, quit)');
        for (const cmd of simulatedCommands) {
            console.log(`> ${cmd}`);
            this.processCommand(cmd);
        }
    }

    private processCommand(command: string): void {
        switch (command.toLowerCase()) {
            case 'help':
                console.log('Available commands: help, status, time, quit');
                break;
            case 'status':
                console.log('Status: Running normally');
                console.log(`Memory: ${Math.round(Math.random() * 100)}MB`);
                console.log(`Uptime: ${Math.round(Math.random() * 3600)}s`);
                break;
            case 'time':
                console.log(`Current time: ${new Date().toLocaleString()}`);
                break;
            case 'quit':
                console.log('Goodbye!');
                break;
            default:
                console.log(`Unknown command: ${command}`);
        }
    }

    private showAdvancedFeatures(): void {
        console.log('\n🚀 Advanced Stdin Features:');

        this.showFeatureExample('Real-time Data Processing', `
// Process streaming data
for await (const line of console) {
  const data = JSON.parse(line);
  processData(data);
}
    `);

        this.showFeatureExample('Input Validation', `
// Validate input as it comes in
for await (const line of console) {
  if (line.trim() === '') continue;
  if (line.startsWith('#')) continue;
  processValidLine(line);
}
    `);

        this.showFeatureExample('Batch Processing', `
// Collect and process in batches
const batch = [];
for await (const line of console) {
  batch.push(line);
  if (batch.length >= 10) {
    await processBatch(batch);
    batch.length = 0;
  }
}
    `);
    }

    private showFeatureExample(title: string, code: string): void {
        console.log(`\n📡 ${title}:`);
        console.log(code);
    }

    private printHeader(title: string): void {
        console.log(`\n${title}`);
        console.log('='.repeat(title.length));
    }
}

// =============================================================================
// INTERACTIVE APPLICATIONS MODULE
// =============================================================================

class InteractiveAppsModule {
    private config: ConsoleDemoConfig;

    constructor(config: ConsoleDemoConfig) {
        this.config = config;
    }

    async demonstrateApplications(): Promise<void> {
        this.printHeader('Interactive Console Applications');

        await this.showTodoApp();
        await this.showChatInterface();
    }

    private async showTodoApp(): Promise<void> {
        console.log('\n📝 Todo Application Structure:');
        console.log(this.getTodoAppCode());
    }

    private getTodoAppCode(): string {
        return `
class TodoApp {
  private todos: TodoItem[] = [];
  private nextId = 1;

  async start() {
    console.log('📝 Welcome to Todo App!');
    console.log('Commands: add <task>, list, done <id>, quit');
    console.write('> ');

    for await (const line of console) {
      const [cmd, ...args] = line.trim().split(' ');
      
      switch (cmd.toLowerCase()) {
        case 'add': this.addTodo(args.join(' ')); break;
        case 'list': this.listTodos(); break;
        case 'done': this.completeTodo(parseInt(args[0])); break;
        case 'quit': return;
        default: console.log('Unknown command');
      }
      
      console.write('> ');
    }
  }

  private addTodo(task: string): void {
    this.todos.push({
      id: this.nextId++,
      task,
      completed: false,
      createdAt: new Date()
    });
    console.log(\`✅ Added: \${task}\`);
  }

  private listTodos(): void {
    if (this.todos.length === 0) {
      console.log('No todos yet!');
      return;
    }
    
    console.log('📋 Your Todos:');
    this.todos.forEach(todo => {
      const status = todo.completed ? '✅' : '⏳';
      console.log(\`  \${todo.id}. \${status} \${todo.task}\`);
    });
  }

  private completeTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = true;
      console.log(\`🎉 Completed: \${todo.task}\`);
    } else {
      console.log(\`❌ Todo not found: \${id}\`);
    }
  }
}
    `;
    }

    private async showChatInterface(): Promise<void> {
        console.log('\n💬 Chat Interface Structure:');
        console.log(this.getChatInterfaceCode());
    }

    private getChatInterfaceCode(): string {
        return `
class ChatInterface {
  private messages: ChatMessage[] = [];
  private username = 'User';

  async start() {
    console.log('💬 Welcome to Chat Interface!');
    console.log('Type your messages and press Enter to send.');
    console.log('Commands: /help, /clear, /quit');
    console.write('> ');

    for await (const line of console) {
      if (line.startsWith('/')) {
        this.handleCommand(line);
      } else if (line.trim()) {
        this.addMessage(this.username, line);
        this.simulateResponse(line);
      }
      
      console.write('> ');
    }
  }

  private handleCommand(command: string): void {
    switch (command.toLowerCase()) {
      case '/help':
        console.log('Available commands: /help, /clear, /quit');
        break;
      case '/clear':
        console.clear();
        console.log('Screen cleared!');
        break;
      case '/quit':
        console.log('Goodbye!');
        process.exit(0);
        break;
      default:
        console.log(\`Unknown command: \${command}\`);
    }
  }

  private addMessage(sender: string, message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.messages.push({ sender, message, timestamp });
    console.log(\`[\${timestamp}] \${sender}: \${message}\`);
  }

  private simulateResponse(userMessage: string): void {
    setTimeout(() => {
      const responses = [
        'That\'s interesting!', 'Tell me more.', 'I understand.',
        'How does that make you feel?', 'Fascinating!'
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage('Bot', response);
    }, 100);
  }
}
    `;
    }

    private printHeader(title: string): void {
        console.log(`\n${title}`);
        console.log('='.repeat(title.length));
    }
}

// =============================================================================
// CONSOLE UTILITIES MODULE
// =============================================================================

class ConsoleUtilitiesModule {
    private config: ConsoleDemoConfig;

    constructor(config: ConsoleDemoConfig) {
        this.config = config;
    }

    demonstrateUtilities(): void {
        this.printHeader('Console Utilities and Enhancements');

        this.showPerformanceTiming();
        this.showMemoryUsage();
        this.showEnvironmentInfo();
        this.showConsoleMethods();
        this.showAdvancedFormatting();
    }

    private showPerformanceTiming(): void {
        console.log('\n⏱️ Performance Timing:');

        const start = performance.now();

        // Simulate work
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += i;
        }

        const end = performance.now();
        console.log(`Calculation completed in ${(end - start).toFixed(2)}ms`);
        console.log(`Result: ${sum}`);
    }

    private showMemoryUsage(): void {
        console.log('\n💾 Memory Usage Information:');

        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            this.displayMemoryInfo(memUsage);
        } else {
            console.log('Memory usage information not available');
        }
    }

    private displayMemoryInfo(memUsage: MemoryUsage): void {
        console.log('Memory Usage:');
        console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
    }

    private showEnvironmentInfo(): void {
        console.log('\n🌍 Environment Information:');

        console.log(`Platform: ${process.platform}`);
        console.log(`Node Version: ${process.version}`);
        console.log(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'N/A'}`);
        console.log(`Architecture: ${process.arch}`);
        console.log(`PID: ${process.pid}`);
    }

    private showConsoleMethods(): void {
        console.log('\n📊 Console Methods Demonstration:');

        const testData = this.createTestData();

        this.showTableMethod(testData);
        this.showLogLevels();
        this.showDirMethod(testData);
        this.showGrouping();
        this.showCounting();
    }

    private createTestData() {
        return {
            strings: ['hello', 'world', 'test'],
            numbers: [1, 2, 3, 4, 5],
            mixed: [1, 'two', { three: 3 }, [4, 5]]
        };
    }

    private showTableMethod(data: any): void {
        console.log('\n📋 console.table():');
        console.table(data);
    }

    private showLogLevels(): void {
        console.log('\n⚠️ console.warn():');
        console.warn('This is a warning message');

        console.log('\n❌ console.error():');
        console.error('This is an error message');

        console.log('\nℹ️ console.info():');
        console.info('This is an informational message');
    }

    private showDirMethod(data: any): void {
        console.log('\n🔍 console.dir():');
        console.dir(data, { depth: 3, colors: this.config.showColors });
    }

    private showGrouping(): void {
        console.log('\n📁 Console Grouping:');

        console.group('First Level');
        console.log('Inside first group');

        console.group('Second Level');
        console.log('Inside second group');
        console.log('Nested information here');
        console.groupEnd();

        console.log('Back to first level');
        console.groupEnd();

        console.log('Back to root level');
    }

    private showCounting(): void {
        console.log('\n🔢 Console Counting:');

        console.count('Counter A');
        console.count('Counter A');
        console.count('Counter B');
        console.count('Counter A');
        console.count('Counter B');
        console.count('Counter B');

        console.log('\n📊 Reset counters:');
        console.countReset('Counter A');
        console.count('Counter A');
    }

    private showAdvancedFormatting(): void {
        if (!this.config.showAnimations) {
            console.log('\n🎨 Advanced Formatting (skipped - animations disabled)');
            return;
        }

        console.log('\n🎨 Advanced Console Formatting:');

        this.showAnsiColors();
        this.showProgressBars();
        this.showSpinners();
    }

    private showAnsiColors(): void {
        console.log('\n🌈 ANSI Color Codes:');

        const colors = [
            ['Red', '\x1b[31m'],
            ['Green', '\x1b[32m'],
            ['Yellow', '\x1b[33m'],
            ['Blue', '\x1b[34m'],
            ['Magenta', '\x1b[35m'],
            ['Cyan', '\x1b[36m'],
            ['White', '\x1b[37m']
        ];

        colors.forEach(([name, code]) => {
            console.log(`${code}${name} text\x1b[0m`);
        });

        console.log('\n🎨 Background Colors:');
        const bgColors = [
            ['Red', '\x1b[41m'],
            ['Green', '\x1b[42m'],
            ['Yellow', '\x1b[43m'],
            ['Blue', '\x1b[44m'],
            ['Magenta', '\x1b[45m']
        ];

        bgColors.forEach(([name, code]) => {
            console.log(`${code}${name} background\x1b[0m`);
        });

        console.log('\n✨ Text Styles:');
        const styles = [
            ['Bold', '\x1b[1m'],
            ['Dim', '\x1b[2m'],
            ['Italic', '\x1b[3m'],
            ['Underlined', '\x1b[4m']
        ];

        styles.forEach(([name, code]) => {
            console.log(`${code}${name} text\x1b[0m`);
        });
    }

    private showProgressBars(): void {
        console.log('\n📊 Progress Bar Simulation:');
        this.animateProgressBar();
    }

    private showSpinners(): void {
        console.log('\n🔄 Spinner Animation:');
        this.animateSpinner();
    }

    private animateProgressBar(): void {
        const width = 30;
        const total = 100;

        for (let i = 0; i <= total; i += 10) {
            const filled = Math.floor((i / total) * width);
            const empty = width - filled;
            const bar = '█'.repeat(filled) + '░'.repeat(empty);
            const percentage = (i / total * 100).toFixed(0);

            if (i < total) {
                process.stdout.write(`\r[${bar}] ${percentage}%`);
            } else {
                console.log(`\r[${bar}] ${percentage}% Complete!`);
            }

            Bun.sleepSync(50);
        }
    }

    private animateSpinner(): void {
        const spinners = ['|', '/', '-', '\\'];

        for (let i = 0; i < 10; i++) {
            const spinner = spinners[i % spinners.length];
            process.stdout.write(`\r${spinner} Processing...`);
            Bun.sleepSync(100);
        }

        console.log('\r✅ Processing complete!');
    }

    private printHeader(title: string): void {
        console.log(`\n${title}`);
        console.log('='.repeat(title.length));
    }
}

// =============================================================================
// MAIN DEMONSTRATION CLASS
// =============================================================================

class CleanConsoleDemo {
    private config: ConsoleDemoConfig;
    private modules: {
        inspection: ConsoleInspectionModule;
        stdin: StdinReadingModule;
        apps: InteractiveAppsModule;
        utilities: ConsoleUtilitiesModule;
    };

    constructor(config: Partial<ConsoleDemoConfig> = {}) {
        this.config = {
            showColors: true,
            inspectionDepth: 4,
            showAnimations: true,
            ...config
        };

        this.modules = {
            inspection: new ConsoleInspectionModule(this.config),
            stdin: new StdinReadingModule(this.config),
            apps: new InteractiveAppsModule(this.config),
            utilities: new ConsoleUtilitiesModule(this.config)
        };
    }

    async demonstrateAll(): Promise<void> {
        const cleanConsole = CleanConsole.getInstance();

        cleanConsole.section('🎯 Clean Bun Console Features Demonstration');

        cleanConsole.info('Organized Console Capabilities', [
            'Modular architecture with clear separation of concerns',
            'Configurable features (colors, animations, depth)',
            'Object inspection depth configuration',
            'Console as AsyncIterable for stdin reading',
            'Interactive console applications',
            'Advanced console formatting and utilities',
            'Performance timing and memory usage tracking',
            'ANSI color codes and text styling'
        ]);

        // Run all demonstrations
        this.modules.inspection.demonstrateObjectInspection();
        this.modules.inspection.demonstrateInspectionUtilities();

        await this.modules.stdin.demonstrateStdinReading();
        await this.modules.apps.demonstrateApplications();

        this.modules.utilities.demonstrateUtilities();

        cleanConsole.success('🎯 Clean console demonstration completed!', [
            'All console features demonstrated successfully',
            'Modular architecture implemented',
            'Object inspection depth configuration shown',
            'Stdin reading capabilities explained',
            'Interactive application structures provided',
            'Console utilities and formatting displayed',
            'Code organization and maintainability improved'
        ]);
    }

    // Public methods for individual demonstrations
    async demonstrateInspection(): Promise<void> {
        this.modules.inspection.demonstrateObjectInspection();
        this.modules.inspection.demonstrateInspectionUtilities();
    }

    async demonstrateStdin(): Promise<void> {
        await this.modules.stdin.demonstrateStdinReading();
    }

    async demonstrateApplications(): Promise<void> {
        await this.modules.apps.demonstrateApplications();
    }

    demonstrateUtilities(): void {
        this.modules.utilities.demonstrateUtilities();
    }

    // Configuration methods
    updateConfig(newConfig: Partial<ConsoleDemoConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Reinitialize modules with new config
        this.modules.inspection = new ConsoleInspectionModule(this.config);
        this.modules.stdin = new StdinReadingModule(this.config);
        this.modules.apps = new InteractiveAppsModule(this.config);
        this.modules.utilities = new ConsoleUtilitiesModule(this.config);
    }

    getConfig(): ConsoleDemoConfig {
        return { ...this.config };
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    // Create demo with default configuration
    const demo = new CleanConsoleDemo({
        showColors: true,
        inspectionDepth: 4,
        showAnimations: true
    });

    // Run full demonstration
    await demo.demonstrateAll();
}

// Export for programmatic use
export {
    CleanConsoleDemo,
    ConsoleInspectionModule,
    StdinReadingModule,
    InteractiveAppsModule,
    ConsoleUtilitiesModule,
    type ConsoleDemoConfig,
    type TodoItem,
    type ChatMessage,
    type MemoryUsage
};

// Run if executed directly
if (import.meta.main) {
    main().catch(console.error);
}
