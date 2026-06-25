#!/usr/bin/env bun

/**
 * Bun Console Stdin Reading Demonstration
 * 
 * Focused demonstration of Bun's enhanced console capability to read
 * from process.stdin using AsyncIterable interface.
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// BASIC STDIN READING EXAMPLES
// =============================================================================

/**
 * Basic stdin reading - echoes each line back to the user
 */
async function basicEcho() {
    console.info('📖 Basic Echo - Type lines and press Enter (Ctrl+C to exit):');
    console.write('> ');

    for await (const line of console) {
        if (line.trim() === 'exit') {
            console.info('👋 Goodbye!');
            break;
        }

        console.info(`📝 You typed: ${line}`);
        console.write('> ');
    }
}

/**
 * Simple addition calculator that reads numbers from stdin
 */
async function additionCalculator() {
    console.info('🧮 Addition Calculator');
    console.info('Enter numbers to add them to the running total');
    console.info('Type "reset" to clear total, "exit" to quit');
    console.write('Total: 0\n> ');

    let total = 0;

    for await (const line of console) {
        const input = line.trim().toLowerCase();

        if (input === 'exit') {
            console.info(`👋 Final total: ${total}`);
            break;
        }

        if (input === 'reset') {
            total = 0;
            console.info('🔄 Total reset to 0');
            console.write('Total: 0\n> ');
            continue;
        }

        const number = parseFloat(line);
        if (!isNaN(number)) {
            total += number;
            console.info(`➕ Added ${number}. New total: ${total}`);
        } else {
            console.info(`❌ Invalid number: "${line}"`);
        }

        console.write(`Total: ${total}\n> `);
    }
}

/**
 * Word counter that analyzes text input
 */
async function wordCounter() {
    console.info('📊 Word Counter');
    console.info('Type or paste text to count words, characters, and lines');
    console.info('Type "stats" to show statistics, "clear" to reset, "exit" to quit');
    console.write('> ');

    let totalWords = 0;
    let totalChars = 0;
    let totalLines = 0;
    let lineCount = 0;

    for await (const line of console) {
        const input = line.trim();

        if (input.toLowerCase() === 'exit') {
            console.info('\n📊 Final Statistics:');
            console.info(`  Lines: ${totalLines}`);
            console.info(`  Words: ${totalWords}`);
            console.info(`  Characters: ${totalChars}`);
            console.info(`  Average words per line: ${totalLines > 0 ? (totalWords / totalLines).toFixed(2) : 0}`);
            break;
        }

        if (input.toLowerCase() === 'stats') {
            console.info('\n📊 Current Statistics:');
            console.info(`  Lines processed: ${lineCount}`);
            console.info(`  Total words: ${totalWords}`);
            console.info(`  Total characters: ${totalChars}`);
            console.info(`  Average words per line: ${lineCount > 0 ? (totalWords / lineCount).toFixed(2) : 0}`);
            console.write('> ');
            continue;
        }

        if (input.toLowerCase() === 'clear') {
            totalWords = 0;
            totalChars = 0;
            totalLines = 0;
            lineCount = 0;
            console.info('🔄 Statistics cleared');
            console.write('> ');
            continue;
        }

        // Process the line
        const words = line.trim().split(/\s+/).filter(word => word.length > 0);
        const chars = line.length;

        totalWords += words.length;
        totalChars += chars;
        totalLines++;
        lineCount++;

        console.info(`📝 Line ${totalLines}: ${words.length} words, ${chars} characters`);
        console.write('> ');
    }
}

// =============================================================================
// ADVANCED STDIN APPLICATIONS
// =============================================================================

/**
 * Interactive todo list manager
 */
class TodoManager {
    private todos: Array<{ id: number; task: string; completed: boolean; createdAt: Date }> = [];
    private nextId = 1;

    async start() {
        console.info('📝 Interactive Todo Manager');
        console.info('Commands:');
        console.info('  add <task>     - Add a new todo item');
        console.info('  list           - List all todos');
        console.info('  done <id>      - Mark todo as completed');
        console.info('  delete <id>    - Delete a todo');
        console.info('  clear          - Clear all todos');
        console.info('  exit           - Exit the application');
        console.write('> ');

        for await (const line of console) {
            const trimmed = line.trim();

            if (trimmed.toLowerCase() === 'exit') {
                console.info('👋 Goodbye!');
                break;
            }

            if (trimmed === '') {
                console.write('> ');
                continue;
            }

            this.processCommand(trimmed);
            console.write('> ');
        }
    }

    private processCommand(input: string) {
        const [command, ...args] = input.split(' ');
        const cmd = command.toLowerCase();

        switch (cmd) {
            case 'add':
                this.addTodo(args.join(' '));
                break;
            case 'list':
                this.listTodos();
                break;
            case 'done':
                this.completeTodo(parseInt(args[0]));
                break;
            case 'delete':
                this.deleteTodo(parseInt(args[0]));
                break;
            case 'clear':
                this.clearTodos();
                break;
            default:
                console.info(`❌ Unknown command: ${command}`);
                this.showHelp();
        }
    }

    private addTodo(task: string) {
        if (!task.trim()) {
            console.info('❌ Please provide a task description');
            return;
        }

        this.todos.push({
            id: this.nextId++,
            task: task.trim(),
            completed: false,
            createdAt: new Date()
        });

        console.info(`✅ Added: ${task}`);
    }

    private listTodos() {
        if (this.todos.length === 0) {
            console.info('📋 No todos yet!');
            return;
        }

        console.info('\n📋 Your Todos:');
        this.todos.forEach(todo => {
            const status = todo.completed ? '✅' : '⏳';
            const created = todo.createdAt.toLocaleTimeString();
            console.info(`  ${todo.id}. ${status} ${todo.task} (${created})`);
        });
        console.info();
    }

    private completeTodo(id: number) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = true;
            console.info(`🎉 Completed: ${todo.task}`);
        } else {
            console.info(`❌ Todo not found: ${id}`);
        }
    }

    private deleteTodo(id: number) {
        const index = this.todos.findIndex(t => t.id === id);
        if (index !== -1) {
            const deleted = this.todos.splice(index, 1)[0];
            console.info(`🗑️ Deleted: ${deleted.task}`);
        } else {
            console.info(`❌ Todo not found: ${id}`);
        }
    }

    private clearTodos() {
        this.todos = [];
        console.info('🗑️ All todos cleared');
    }

    private showHelp() {
        console.info('Available commands: add, list, done, delete, clear, exit');
    }
}

/**
 * JSON data processor for structured input
 */
async function jsonProcessor() {
    console.info('📊 JSON Data Processor');
    console.info('Enter JSON objects to process them');
    console.info('Supported operations: count, sum, average, min, max');
    console.info('Type "help" for examples, "exit" to quit');
    console.write('> ');

    const data: any[] = [];

    for await (const line of console) {
        const input = line.trim();

        if (input.toLowerCase() === 'exit') {
            console.info(`👋 Processed ${data.length} JSON objects`);
            break;
        }

        if (input.toLowerCase() === 'help') {
            console.info('\n📚 JSON Examples:');
            console.info('  {"name": "Alice", "age": 30, "score": 95}');
            console.info('  {"name": "Bob", "age": 25, "score": 87}');
            console.info('  {"name": "Charlie", "age": 35, "score": 92}');
            console.info('Commands: help, stats, clear, exit');
            console.write('> ');
            continue;
        }

        if (input.toLowerCase() === 'stats') {
            this.showDataStats(data);
            console.write('> ');
            continue;
        }

        if (input.toLowerCase() === 'clear') {
            data.length = 0;
            console.info('🔄 Data cleared');
            console.write('> ');
            continue;
        }

        if (input === '') {
            console.write('> ');
            continue;
        }

        try {
            const obj = JSON.parse(input);
            data.push(obj);
            console.info(`✅ Parsed object ${data.length}: ${JSON.stringify(obj)}`);
        } catch (error) {
            console.info(`❌ Invalid JSON: ${error.message}`);
        }

        console.write('> ');
    }
}

function showDataStats(data: any[]) {
    if (data.length === 0) {
        console.info('📊 No data to analyze');
        return;
    }

    console.info('\n📊 Data Statistics:');
    console.info(`  Total objects: ${data.length}`);

    // Analyze numeric fields
    const numericFields = new Set<string>();
    data.forEach(obj => {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'number') {
                numericFields.add(key);
            }
        });
    });

    numericFields.forEach(field => {
        const values = data.map(obj => obj[field]).filter(val => typeof val === 'number');
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            console.info(`  ${field}:`);
            console.info(`    Count: ${values.length}`);
            console.info(`    Sum: ${sum.toFixed(2)}`);
            console.info(`    Average: ${avg.toFixed(2)}`);
            console.info(`    Min: ${min}`);
            console.info(`    Max: ${max}`);
        }
    });
}

// =============================================================================
// REAL-TIME DATA PROCESSING
// =============================================================================

/**
 * Log file processor that processes log entries in real-time
 */
async function logProcessor() {
    console.info('📋 Log File Processor');
    console.info('Enter log lines to process them in real-time');
    console.info('Supported formats: Apache, Nginx, Custom');
    console.info('Type "stats" for analysis, "exit" to quit');
    console.write('> ');

    const logs: Array<{
        timestamp: Date;
        level: string;
        message: string;
        source?: string;
    }> = [];

    for await (const line of console) {
        const input = line.trim();

        if (input.toLowerCase() === 'exit') {
            console.info(`👋 Processed ${logs.length} log entries`);
            break;
        }

        if (input.toLowerCase() === 'stats') {
            this.showLogStats(logs);
            console.write('> ');
            continue;
        }

        if (input === '') {
            console.write('> ');
            continue;
        }

        // Parse log line
        const parsed = this.parseLogLine(input);
        if (parsed) {
            logs.push(parsed);
            console.info(`📝 [${parsed.level}] ${parsed.message}`);
        } else {
            console.info(`❌ Could not parse log line: ${input}`);
        }

        console.write('> ');
    }
}

function parseLogLine(line: string): any {
    // Try to parse common log formats

    // Format: [TIMESTAMP] LEVEL: MESSAGE
    const match1 = line.match(/^\[([^\]]+)\]\s*(\w+):\s*(.+)$/);
    if (match1) {
        return {
            timestamp: new Date(match1[1]),
            level: match1[2].toUpperCase(),
            message: match1[3]
        };
    }

    // Format: LEVEL - MESSAGE
    const match2 = line.match(/^(\w+)\s*-\s*(.+)$/);
    if (match2) {
        return {
            timestamp: new Date(),
            level: match2[1].toUpperCase(),
            message: match2[2]
        };
    }

    // Default: treat entire line as message with INFO level
    return {
        timestamp: new Date(),
        level: 'INFO',
        message: line
    };
}

function showLogStats(logs: any[]) {
    if (logs.length === 0) {
        console.info('📊 No logs to analyze');
        return;
    }

    console.info('\n📊 Log Statistics:');
    console.info(`  Total entries: ${logs.length}`);

    // Count by level
    const levelCounts: Record<string, number> = {};
    logs.forEach(log => {
        levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
    });

    console.info('  By level:');
    Object.entries(levelCounts).forEach(([level, count]) => {
        const percentage = ((count / logs.length) * 100).toFixed(1);
        console.info(`    ${level}: ${count} (${percentage}%)`);
    });

    // Time range
    const timestamps = logs.map(log => log.timestamp).filter(t => t instanceof Date && !isNaN(t.getTime()));
    if (timestamps.length > 0) {
        const minTime = new Date(Math.min(...timestamps.map(t => t.getTime())));
        const maxTime = new Date(Math.max(...timestamps.map(t => t.getTime())));
        console.info(`  Time range: ${minTime.toLocaleString()} to ${maxTime.toLocaleString()}`);
    }
}

// =============================================================================
// BATCH PROCESSING EXAMPLES
// =============================================================================

/**
 * Batch data collector that processes input in batches
 */
async function batchProcessor() {
    console.info('📦 Batch Data Processor');
    console.info('Collects input and processes in batches of 5 lines');
    console.info('Type "process" to process current batch, "exit" to quit');
    console.write('> ');

    const batch: string[] = [];
    const batchSize = 5;
    let batchCount = 0;

    for await (const line of console) {
        const input = line.trim();

        if (input.toLowerCase() === 'exit') {
            if (batch.length > 0) {
                await processBatch(batch, ++batchCount);
            }
            console.info(`👋 Processed ${batchCount} batches total`);
            break;
        }

        if (input.toLowerCase() === 'process') {
            if (batch.length > 0) {
                await processBatch(batch, ++batchCount);
                batch.length = 0;
            } else {
                console.info('📦 No items in batch to process');
            }
            console.write('> ');
            continue;
        }

        if (input === '') {
            console.write('> ');
            continue;
        }

        batch.push(input);
        console.info(`📦 Added to batch: ${input} (${batch.length}/${batchSize})`);

        if (batch.length >= batchSize) {
            await processBatch(batch, ++batchCount);
            batch.length = 0;
        }

        console.write('> ');
    }
}

async function processBatch(batch: string[], batchNumber: number) {
    console.info(`\n🔄 Processing Batch #${batchNumber} (${batch.length} items):`);

    // Analyze batch
    const totalChars = batch.reduce((sum, line) => sum + line.length, 0);
    const totalWords = batch.reduce((sum, line) =>
        sum + line.trim().split(/\s+/).filter(word => word.length > 0).length, 0
    );

    console.info(`  Total characters: ${totalChars}`);
    console.info(`  Total words: ${totalWords}`);
    console.info(`  Average length: ${(totalChars / batch.length).toFixed(2)} characters`);
    console.info(`  Average words: ${(totalWords / batch.length).toFixed(2)} words`);

    // Find longest and shortest lines
    const longest = batch.reduce((max, line) => line.length > max.length ? line : max, '');
    const shortest = batch.reduce((min, line) => line.length < min.length ? line : min, '');

    console.info(`  Longest line: "${longest}" (${longest.length} chars)`);
    console.info(`  Shortest line: "${shortest}" (${shortest.length} chars)`);

    console.info('✅ Batch processed successfully\n');
}

// =============================================================================
// INTERACTIVE CHAT INTERFACE
// =============================================================================

/**
 * Simple chat interface that responds to user input
 */
async function chatInterface() {
    console.info('💬 Simple Chat Interface');
    console.info('Type messages and I\'ll respond!');
    console.info('Commands: /help, /clear, /quit');
    console.write('> ');

    const responses = [
        'That\'s interesting!',
        'Tell me more about that.',
        'I understand what you mean.',
        'How does that make you feel?',
        'Fascinating! Please continue.',
        'I\'m here to listen.',
        'That\'s a great point!',
        'What do you think about that?',
        'I never thought of it that way.',
        'Could you elaborate on that?'
    ];

    for await (const line of console) {
        const input = line.trim();

        if (input.startsWith('/')) {
            await handleChatCommand(input);
            console.write('> ');
            continue;
        }

        if (input === '') {
            console.write('> ');
            continue;
        }

        // Simulate thinking
        process.stdout.write('🤔 Thinking...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.stdout.write('\r                 \r');

        // Generate response
        const response = responses[Math.floor(Math.random() * responses.length)];
        console.info(`🤖 Bot: ${response}`);
        console.write('> ');
    }
}

async function handleChatCommand(command: string) {
    switch (command.toLowerCase()) {
        case '/help':
            console.info('Available commands: /help, /clear, /quit');
            break;
        case '/clear':
            console.clear();
            console.info('💬 Simple Chat Interface (screen cleared)');
            console.info('Type messages and I\'ll respond!');
            console.info('Commands: /help, /clear, /quit');
            break;
        case '/quit':
            console.info('👋 Goodbye! It was nice chatting with you!');
            process.exit(0);
            break;
        default:
            console.info(`❌ Unknown command: ${command}`);
    }
}

// =============================================================================
// MAIN MENU AND EXECUTION
// =============================================================================

async function showMenu() {
    console.info('🎯 Bun Console Stdin Reading Examples');
    console.info('='.repeat(50));
    console.info('Choose an example to run:');
    console.info('');
    console.info('1. Basic Echo');
    console.info('2. Addition Calculator');
    console.info('3. Word Counter');
    console.info('4. Todo Manager');
    console.info('5. JSON Processor');
    console.info('6. Log Processor');
    console.info('7. Batch Processor');
    console.info('8. Chat Interface');
    console.info('9. Run All Examples (Sequential)');
    console.info('0. Exit');
    console.info('');
    console.write('Enter your choice (0-9): ');

    for await (const line of console) {
        const choice = line.trim();

        switch (choice) {
            case '1':
                await basicEcho();
                break;
            case '2':
                await additionCalculator();
                break;
            case '3':
                await wordCounter();
                break;
            case '4':
                const todoManager = new TodoManager();
                await todoManager.start();
                break;
            case '5':
                await jsonProcessor();
                break;
            case '6':
                await logProcessor();
                break;
            case '7':
                await batchProcessor();
                break;
            case '8':
                await chatInterface();
                break;
            case '9':
                await runAllExamples();
                break;
            case '0':
                console.info('👋 Goodbye!');
                return;
            default:
                console.info('❌ Invalid choice. Please enter 0-9.');
                console.write('Enter your choice (0-9): ');
                continue;
        }

        // Show menu again after example completes
        console.info('\n' + '='.repeat(50));
        console.info('Choose another example or exit:');
        console.write('Enter your choice (0-9): ');
    }
}

async function runAllExamples() {
    console.info('🚀 Running All Examples (with delays):');
    console.info('');

    const examples = [
        { name: 'Basic Echo', fn: basicEcho, delay: 2000 },
        { name: 'Addition Calculator', fn: additionCalculator, delay: 3000 },
        { name: 'Word Counter', fn: wordCounter, delay: 2000 },
        { name: 'JSON Processor', fn: jsonProcessor, delay: 2000 },
        { name: 'Batch Processor', fn: batchProcessor, delay: 2000 }
    ];

    for (const example of examples) {
        console.info(`\n📋 Starting: ${example.name}`);
        console.info('(This example will run for a few seconds with simulated input)');

        // Simulate running the example with timeout
        const timeout = new Promise(resolve => setTimeout(resolve, example.delay));
        const exampleRun = example.fn();

        await Promise.race([timeout, exampleRun]);

        console.info(`✅ Completed: ${example.name}`);

        if (example !== examples[examples.length - 1]) {
            console.info('⏳ Moving to next example in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.info('\n🎉 All examples completed!');
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Export functions for programmatic use
export {
    basicEcho,
    additionCalculator,
    wordCounter,
    TodoManager,
    jsonProcessor,
    logProcessor,
    batchProcessor,
    chatInterface,
    showMenu
};

// Run menu if executed directly
if (import.meta.main) {
    showMenu().catch(console.error);
}
