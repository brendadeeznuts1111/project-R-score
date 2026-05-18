#!/usr/bin/env bun

/**
 * Comprehensive Bun Console Features Demonstration
 * 
 * Showcasing Bun's enhanced console capabilities including:
 * - Object inspection depth configuration
 * - Console as AsyncIterable for stdin reading
 * - Interactive console applications
 * - Advanced console formatting and utilities
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { CleanConsole } from './clean-console-integration';

// =============================================================================
// CONSOLE INSPECTION DEPTH DEMONSTRATION
// =============================================================================

class ConsoleInspectionDemo {
    static demonstrateObjectInspection() {
        console.info('\n🔍 Console Object Inspection Depth Demonstration');
        console.info('='.repeat(60));

        // Create deeply nested objects for demonstration
        const deeplyNested = {
            level1: {
                level2: {
                    level3: {
                        level4: {
                            level5: {
                                data: 'This is very deep data',
                                timestamp: new Date(),
                                metadata: {
                                    id: 12345,
                                    type: 'deep-object'
                                }
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

        console.info('\n📋 Default Inspection (Depth 2):');
        console.info('Current console depth configuration affects how deep objects are displayed');
        console.info(deeplyNested);

        console.info('\n🔧 Manual Deep Inspection:');
        console.info('Using Bun.inspect() for deeper inspection:');
        console.info(Bun.inspect(deeplyNested, { depth: 5 }));

        console.info('\n🎨 Custom Inspection with Colors:');
        console.info(Bun.inspect(deeplyNested, {
            depth: 4,
            colors: true,
            compact: false,
            maxArrayLength: 10,
            maxStringLength: 50
        }));

        // Demonstrate different inspection options
        console.info('\n📊 Compact vs Detailed Inspection:');

        console.info('\nCompact Mode:');
        console.info(Bun.inspect(deeplyNested, {
            depth: 3,
            compact: true,
            colors: true
        }));

        console.info('\nDetailed Mode:');
        console.info(Bun.inspect(deeplyNested, {
            depth: 3,
            compact: false,
            colors: true,
            maxArrayLength: 5,
            maxStringLength: 30
        }));
    }

    static demonstrateInspectionUtilities() {
        console.info('\n🛠️ Console Inspection Utilities');
        console.info('='.repeat(50));

        // Demonstrate Bun.inspect with various options
        const complexObject = {
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
                features: {
                    authentication: true,
                    logging: true,
                    caching: false
                },
                limits: {
                    maxUsers: 100,
                    sessionTimeout: 3600
                }
            }
        };

        console.info('\n📋 Standard Console.log:');
        console.info(complexObject);

        console.info('\n🎨 Enhanced Bun.inspect with Colors:');
        console.info(Bun.inspect(complexObject, {
            depth: 4,
            colors: true,
            compact: false
        }));

        console.info('\n📏 Truncated Arrays and Strings:');
        console.info(Bun.inspect(complexObject, {
            depth: 3,
            colors: true,
            maxArrayLength: 2,
            maxStringLength: 15
        }));

        // Demonstrate custom inspection
        console.info('\n🔧 Custom Inspection Function:');
        const customInspection = Bun.inspect(complexObject, {
            depth: 2,
            colors: true,
            stylize: (text, styleType) => {
                switch (styleType) {
                    case 'string': return `\x1b[32m${text}\x1b[0m`; // Green strings
                    case 'number': return `\x1b[34m${text}\x1b[0m`; // Blue numbers
                    case 'boolean': return `\x1b[35m${text}\x1b[0m`; // Magenta booleans
                    case 'date': return `\x1b[36m${text}\x1b[0m`; // Cyan dates
                    default: return text;
                }
            }
        });
        console.info(customInspection);
    }
}

// =============================================================================
// CONSOLE STDIN READING DEMONSTRATION
// =============================================================================

class ConsoleStdinDemo {
    static async demonstrateStdinReading() {
        console.info('\n📖 Console Stdin Reading Demonstration');
        console.info('='.repeat(55));

        // Note: This would normally wait for user input
        // For demonstration, we'll show the structure and capabilities
        console.info('\n🔄 Console as AsyncIterable (Structure):');
        console.info(`
for await (const line of console) {
  console.info(\`Received: \${line}\`);
}
    `);

        console.info('\n📝 Example: Interactive Counter');
        console.info('(This would normally wait for user input)');

        // Simulate the interactive counter without actually waiting for input
        console.info('\n📊 Counter Example (Simulated):');
        this.simulateInteractiveCounter();

        console.info('\n🧮 Example: Addition Calculator');
        console.info('(This would normally wait for user input)');
        this.simulateAdditionCalculator();

        console.info('\n🎯 Example: Command Processor');
        console.info('(This would normally wait for user input)');
        this.simulateCommandProcessor();
    }

    static simulateInteractiveCounter() {
        console.info('Let\'s count with user input!');
        console.write('Count: 0\n> ');

        // Simulate some inputs
        const simulatedInputs = ['5', '3', '2'];
        let count = 0;

        console.info('(Simulating user inputs: 5, 3, 2)');
        for (const input of simulatedInputs) {
            count += Number(input);
            console.info(`Count: ${count} (after adding ${input})`);
        }
    }

    static simulateAdditionCalculator() {
        console.info('Addition Calculator - Enter numbers to add:');
        console.write('Total: 0\n> ');

        const simulatedInputs = ['10', '15', '5'];
        let total = 0;

        console.info('(Simulating user inputs: 10, 15, 5)');
        for (const input of simulatedInputs) {
            const num = Number(input);
            if (!isNaN(num)) {
                total += num;
                console.info(`Total: ${total} (after adding ${num})`);
            } else {
                console.info(`Invalid number: ${input}`);
            }
        }

        console.info(`Final total: ${total}`);
    }

    static simulateCommandProcessor() {
        console.info('Command Processor - Available commands: help, status, time, quit');

        const simulatedCommands = ['help', 'status', 'time', 'quit'];

        console.info('(Simulating commands: help, status, time, quit)');
        for (const cmd of simulatedCommands) {
            console.info(`> ${cmd}`);

            switch (cmd.toLowerCase()) {
                case 'help':
                    console.info('Available commands: help, status, time, quit');
                    break;
                case 'status':
                    console.info('Status: Running normally');
                    console.info(`Memory: ${Math.round(Math.random() * 100)}MB`);
                    console.info(`Uptime: ${Math.round(Math.random() * 3600)}s`);
                    break;
                case 'time':
                    console.info(`Current time: ${new Date().toLocaleString()}`);
                    break;
                case 'quit':
                    console.info('Goodbye!');
                    break;
                default:
                    console.info(`Unknown command: ${cmd}`);
            }
        }
    }

    static demonstrateAdvancedStdinFeatures() {
        console.info('\n🚀 Advanced Stdin Features');
        console.info('='.repeat(40));

        console.info('\n📡 Real-time Data Processing:');
        console.info(`
// Process streaming data
for await (const line of console) {
  const data = JSON.parse(line);
  processData(data);
}
    `);

        console.info('\n🔍 Input Validation and Filtering:');
        console.info(`
// Validate input as it comes in
for await (const line of console) {
  if (line.trim() === '') continue;
  if (line.startsWith('#')) continue; // Skip comments
  processValidLine(line);
}
    `);

        console.info('\n⚡ Batch Processing:');
        console.info(`
// Collect and process in batches
const batch = [];
for await (const line of console) {
  batch.push(line);
  if (batch.length >= 10) {
    await processBatch(batch);
    batch.length = 0; // Clear batch
  }
}
    `);
    }
}

// =============================================================================
// INTERACTIVE CONSOLE APPLICATIONS
// =============================================================================

class InteractiveConsoleApps {
    static async createTodoApp() {
        console.info('\n📝 Interactive Todo App (Structure)');
        console.info('='.repeat(45));

        const todoAppCode = `
// Interactive Todo Application
class TodoApp {
  constructor() {
    this.todos = [];
    this.nextId = 1;
  }

  async start() {
    console.info('📝 Welcome to Todo App!');
    console.info('Commands: add <task>, list, done <id>, quit');
    console.write('> ');

    for await (const line of console) {
      const [cmd, ...args] = line.trim().split(' ');
      
      switch (cmd.toLowerCase()) {
        case 'add':
          this.addTodo(args.join(' '));
          break;
        case 'list':
          this.listTodos();
          break;
        case 'done':
          this.completeTodo(parseInt(args[0]));
          break;
        case 'quit':
          console.info('Goodbye!');
          return;
        default:
          console.info('Unknown command');
      }
      
      console.write('> ');
    }
  }

  addTodo(task) {
    this.todos.push({
      id: this.nextId++,
      task: task,
      completed: false,
      createdAt: new Date()
    });
    console.info(\`✅ Added: \${task}\`);
  }

  listTodos() {
    if (this.todos.length === 0) {
      console.info('No todos yet!');
      return;
    }
    
    console.info('📋 Your Todos:');
    this.todos.forEach(todo => {
      const status = todo.completed ? '✅' : '⏳';
      console.info(\`  \${todo.id}. \${status} \${todo.task}\`);
    });
  }

  completeTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = true;
      console.info(\`🎉 Completed: \${todo.task}\`);
    } else {
      console.info(\`❌ Todo not found: \${id}\`);
    }
  }
}

// Start the app
const app = new TodoApp();
app.start();
    `;

        console.info(todoAppCode);
    }

    static async createChatInterface() {
        console.info('\n💬 Interactive Chat Interface (Structure)');
        console.info('='.repeat(50));

        const chatInterfaceCode = `
// Interactive Chat Interface
class ChatInterface {
  constructor() {
    this.messages = [];
    this.username = 'User';
  }

  async start() {
    console.info('💬 Welcome to Chat Interface!');
    console.info('Type your messages and press Enter to send.');
    console.info('Commands: /help, /clear, /quit');
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

  handleCommand(command) {
    switch (command.toLowerCase()) {
      case '/help':
        console.info('Available commands: /help, /clear, /quit');
        break;
      case '/clear':
        console.clear();
        console.info('Screen cleared!');
        break;
      case '/quit':
        console.info('Goodbye!');
        process.exit(0);
        break;
      default:
        console.info(\`Unknown command: \${command}\`);
    }
  }

  addMessage(sender, message) {
    const timestamp = new Date().toLocaleTimeString();
    this.messages.push({ sender, message, timestamp });
    console.info(\`[\${timestamp}] \${sender}: \${message}\`);
  }

  simulateResponse(userMessage) {
    // Simple response simulation
    setTimeout(() => {
      const responses = [
        'That\'s interesting!',
        'Tell me more.',
        'I understand.',
        'How does that make you feel?',
        'Fascinating!'
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage('Bot', response);
    }, 100);
  }
}

// Start the chat
const chat = new ChatInterface();
chat.start();
    `;

        console.info(chatInterfaceCode);
    }
}

// =============================================================================
// CONSOLE UTILITIES AND ENHANCEMENTS
// =============================================================================

class ConsoleUtilities {
    static demonstrateConsoleUtilities() {
        console.info('\n🛠️ Console Utilities and Enhancements');
        console.info('='.repeat(55));

        // Performance timing
        console.info('\n⏱️ Performance Timing:');
        const start = performance.now();

        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += i;
        }

        const end = performance.now();
        console.info(`Calculation completed in ${(end - start).toFixed(2)}ms`);
        console.info(`Result: ${sum}`);

        // Memory usage
        console.info('\n💾 Memory Usage Information:');
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            console.info('Memory Usage:');
            console.info(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
            console.info(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.info(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
            console.info(`  External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
        }

        // Environment information
        console.info('\n🌍 Environment Information:');
        console.info(`Platform: ${process.platform}`);
        console.info(`Node Version: ${process.version}`);
        console.info(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'N/A'}`);
        console.info(`Architecture: ${process.arch}`);
        console.info(`PID: ${process.pid}`);

        // Console methods demonstration
        console.info('\n📊 Console Methods Demonstration:');

        const testData = {
            strings: ['hello', 'world', 'test'],
            numbers: [1, 2, 3, 4, 5],
            mixed: [1, 'two', { three: 3 }, [4, 5]]
        };

        console.info('\n📋 console.table():');
        console.table(testData);

        console.info('\n⚠️ console.warn():');
        console.warn('This is a warning message');

        console.info('\n❌ console.error():');
        console.error('This is an error message');

        console.info('\nℹ️ console.info():');
        console.info('This is an informational message');

        console.info('\n🔍 console.dir():');
        console.dir(testData, { depth: 3, colors: true });

        // Grouping
        console.info('\n📁 Console Grouping:');
        console.group('First Level');
        console.info('Inside first group');

        console.group('Second Level');
        console.info('Inside second group');
        console.info('Nested information here');
        console.groupEnd();

        console.info('Back to first level');
        console.groupEnd();
        console.info('Back to root level');

        // Counting
        console.info('\n🔢 Console Counting:');
        console.count('Counter A');
        console.count('Counter A');
        console.count('Counter B');
        console.count('Counter A');
        console.count('Counter B');
        console.count('Counter B');

        console.info('\n📊 Reset counters:');
        console.countReset('Counter A');
        console.count('Counter A');
    }

    static demonstrateAdvancedFormatting() {
        console.info('\n🎨 Advanced Console Formatting');
        console.info('='.repeat(45));

        // ANSI color codes
        console.info('\n🌈 ANSI Color Codes:');
        console.info('\x1b[31mRed text\x1b[0m');
        console.info('\x1b[32mGreen text\x1b[0m');
        console.info('\x1b[33mYellow text\x1b[0m');
        console.info('\x1b[34mBlue text\x1b[0m');
        console.info('\x1b[35mMagenta text\x1b[0m');
        console.info('\x1b[36mCyan text\x1b[0m');
        console.info('\x1b[37mWhite text\x1b[0m');

        // Background colors
        console.info('\n🎨 Background Colors:');
        console.info('\x1b[41mRed background\x1b[0m');
        console.info('\x1b[42mGreen background\x1b[0m');
        console.info('\x1b[43mYellow background\x1b[0m');
        console.info('\x1b[44mBlue background\x1b[0m');
        console.info('\x1b[45mMagenta background\x1b[0m');

        // Text styles
        console.info('\n✨ Text Styles:');
        console.info('\x1b[1mBold text\x1b[0m');
        console.info('\x1b[2mDim text\x1b[0m');
        console.info('\x1b[3mItalic text\x1b[0m');
        console.info('\x1b[4mUnderlined text\x1b[0m');

        // Progress bar simulation
        console.info('\n📊 Progress Bar Simulation:');
        this.simulateProgressBar();

        // Spinner animation
        console.info('\n🔄 Spinner Animation:');
        this.simulateSpinner();
    }

    static simulateProgressBar() {
        const width = 30;
        const total = 100;

        for (let i = 0; i <= total; i += 10) {
            const filled = Math.floor((i / total) * width);
            const empty = width - filled;
            const bar = '█'.repeat(filled) + '░'.repeat(empty);
            const percentage = (i / total * 100).toFixed(0);

            // Use carriage return to overwrite the same line
            if (i < total) {
                process.stdout.write(`\r[${bar}] ${percentage}%`);
            } else {
                console.info(`\r[${bar}] ${percentage}% Complete!`);
            }

            // Simulate work
            Bun.sleepSync(100);
        }
    }

    static simulateSpinner() {
        const spinners = ['|', '/', '-', '\\'];

        for (let i = 0; i < 10; i++) {
            const spinner = spinners[i % spinners.length];
            process.stdout.write(`\r${spinner} Processing...`);
            Bun.sleepSync(100);
        }

        console.info('\r✅ Processing complete!');
    }
}

// =============================================================================
// MAIN DEMONSTRATION
// =============================================================================

async function main() {
    const console = CleanConsole.getInstance();
    console.section('🎯 Comprehensive Bun Console Features Demonstration');

    console.info('Bun Console Capabilities', [
        'Object inspection depth configuration',
        'Console as AsyncIterable for stdin reading',
        'Interactive console applications',
        'Advanced console formatting and utilities',
        'Performance timing and memory usage tracking',
        'ANSI color codes and text styling'
    ]);

    // Demonstrate all console features
    ConsoleInspectionDemo.demonstrateObjectInspection();
    ConsoleInspectionDemo.demonstrateInspectionUtilities();

    await ConsoleStdinDemo.demonstrateStdinReading();
    ConsoleStdinDemo.demonstrateAdvancedStdinFeatures();

    await InteractiveConsoleApps.createTodoApp();
    await InteractiveConsoleApps.createChatInterface();

    ConsoleUtilities.demonstrateConsoleUtilities();
    ConsoleUtilities.demonstrateAdvancedFormatting();

    console.success('🎯 Comprehensive Bun console demonstration completed!', [
        'All console features demonstrated successfully',
        'Object inspection depth configuration shown',
        'Stdin reading capabilities explained',
        'Interactive application structures provided',
        'Console utilities and formatting displayed'
    ]);
}

// Run the demonstration
if (import.meta.main) {
    main().catch(console.error);
}

export {
    ConsoleInspectionDemo,
    ConsoleStdinDemo,
    InteractiveConsoleApps,
    ConsoleUtilities
};
