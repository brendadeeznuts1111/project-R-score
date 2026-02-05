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
    console.log('📖 Basic Echo - Type lines and press Enter (Ctrl+C to exit):');
    console.write('> ');

    for await (const line of console) {
        if (line.trim() === 'exit') {
            console.log('👋 Goodbye!');
            break;
        }

        console.log(`📝 You typed: ${line}`);
        console.write('> ');
    }
}

/**
 * Simple addition calculator that reads numbers from stdin
 */
async function additionCalculator() {
    console.log('🧮 Addition Calculator');
    console.log('Enter numbers to add them to the running total');
    console.log('Type "reset" to clear total, "exit" to quit');
    console.write('Total: 0\n> ');

    let total = 0;

    for await (const line of console) {
        const input = line.trim().toLowerCase();

        if (input === 'exit') {
            console.log(`👋 Final total: ${total}`);
            break;
        }

        if (input === 'reset') {
            total = 0;
            console.log('🔄 Total reset to 0');
            console.write('Total: 0\n> ');
            continue;
        }

        const number = parseFloat(line);
        if (!isNaN(number)) {
            total += number;
            console.log(`➕ Added ${number}. New total: ${total}`);
        } else {
            console.log(`❌ Invalid number: "${line}"`);
        }

        console.write(`Total: ${total}\n> `);
    }
}

/**
 * Word counter that analyzes text input
 */
async function wordCounter() {
    console.log('📊 Word Counter');
    console.log('Type or paste text to count words, characters, and lines');
    console.log('Type "stats" to show statistics, "clear" to reset, "exit" to quit');
    console.write('> ');

    let totalWords = 0;
    let totalChars = 0;
    let totalLines = 0;
    let lineCount = 0;

    for await (const line of console) {
        const input = line.trim();

        if (input.toLowerCase() === 'exit') {
            console.log('\n📊 Final Statistics:');
            console.log(`  Lines: ${totalLines}`);
            console.log(`  Words: ${totalWords}`);
            console.log(`  Characters: ${totalChars}`);
            console.log(`  Average words per line: ${totalLines > 0 ? (totalWords / totalLines).toFixed(2) : 0}`);
            break;
        }

        if (input.toLowerCase() === 'stats') {
            console.log('\n📊 Current Statistics:');
            console.log(`  Lines processed: ${lineCount}`);
            console.log(`  Total words: ${totalWords}`);
            console.log(`  Total characters: ${totalChars}`);
            console.log(`  Average words per line: ${lineCount > 0 ? (totalWords / lineCount).toFixed(2) : 0}`);
            console.write('> ');
            continue;
        }

        if (input.toLowerCase() === 'clear') {
            totalWords = 0;
            totalChars = 0;
            totalLines = 0;
            lineCount = 0;
            console.log('🔄 Statistics cleared');
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

        console.log(`📝 Line ${totalLines}: ${words.length} words, ${chars} characters`);
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
        console.log('📝 Interactive Todo Manager');
        console.log('Commands:');
        console.log('  add <task>     - Add a new todo item');
        console.log('  list           - List all todos');
        console.log('  done <id>      - Mark todo as completed');
        console.log('  delete <id>    - Delete a todo');
        console.log('  clear          - Clear all todos');
        console.log('  exit           - Exit the application');
        console.write('> ');

        for await (const line of console) {
            const trimmed = line.trim();

            if (trimmed.toLowerCase() === 'exit') {
                console.log('👋 Goodbye!');
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
                console.log(`❌ Unknown command: ${command}`);
                this.showHelp();
        }
    }

    private addTodo(task: string) {
        if (!task.trim()) {
            console.log('❌ Please provide a task description');
            return;
        }

        this.todos.push({
            id: this.nextId++,
            task: task.trim(),
            completed: false,
            createdAt: new Date()
        });

        console.log(`✅ Added: ${task}`);
    }

    private listTodos() {
        if (this.todos.length === 0) {
            console.log('📋 No todos yet!');
            return;
        }

        console.log('\n📋 Your Todos:');
        this.todos.forEach(todo => {
            const status = todo.completed ? '✅' : '⏳';
            const created = todo.createdAt.toLocaleTimeString();
            console.log(`  ${todo.id}. ${status} ${todo.task} (${created})`);
        });
        console.log();
    }

    private completeTodo(id: number) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = true;
            console.log(`🎉 Completed: ${todo.task}`);
        } else {
            console.log(`❌ Todo not found: ${id}`);
        }
    }

    private deleteTodo(id: number) {
        const index = this.todos.findIndex(t => t.id === id);
        if (index !== -1) {
            const deleted = this.todos.splice(index, 1)[0];
            console.log(`🗑️ Deleted: ${deleted.task}`);
        } else {
            console.log(`❌ Todo not found: ${id}`);
        }
    }

    private clearTodos() {
        this.todos = [];
        console.log('🗑️ All todos cleared');
    }

    private showHelp() {
        console.log('Available commands: add, list, done, delete, clear, exit');
    }
}

/**
 * JSON data processor for structured input
 */
async function jsonProcessor() {
    console.log('📊 JSON Data Processor');
    console.log('Enter JSON objects to process them');
    console.log('Supported operations: count, sum, average, min, max');
    console.log('Type "help" for examples, "exit" to quit');
    console.write('> ');

    const data: any[] = [];

    for await (const line of console) {
        const input = line.trim();

        if (input.toLowerCase() === 'exit') {
            console.log(`👋 Processed ${data.length} JSON objects`);
            break;
        }

        if (input.toLowerCase() === 'help') {
            console.log('\n📚 JSON Examples:');
            console.log('  {"name": "Alice", "age": 30, "score": 95}');
            console.log('  {"name": "Bob", "age": 25, "score": 87}');
            console.log('  {"name": "Charlie", "age": 35, "score": 92}');
            console.log('Commands: help, stats, clear, exit');
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
            console.log('🔄 Data cleared');
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
            console.log(`✅ Parsed object ${data.length}: ${JSON.stringify(obj)}`);
        } catch (error) {
            console.log(`❌ Invalid JSON: ${error.message}`);
        }

        console.write('> ');
    }
}

function showDataStats(data: any[]) {
    if (data.length === 0) {
        console.log('📊 No data to analyze');
        return;
    }

    console.log('\n📊 Data Statistics:');
    console.log(`  Total objects: ${data.length}`);

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

            console.log(`  ${field}:`);
            console.log(`    Count: ${values.length}`);
            console.log(`    Sum: ${sum.toFixed(2)}`);
            console.log(`    Average: ${avg.toFixed(2)}`);
            console.log(`    Min: ${min}`);
            console.log(`    Max: ${max}`);
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
    console.log('📋 Log File Processor');
    console.log('Enter log lines to process them in real-time');
    console.log('Supported formats: Apache, Nginx, Custom');
    console.log('Type "stats" for analysis, "exit" to quit');
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
            console.log(`👋 Processed ${logs.length} log entries`);
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
            console.log(`📝 [${parsed.level}] ${parsed.message}`);
        } else {
            console.log(`❌ Could not parse log line: ${input}`);
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
        console.log('📊 No logs to analyze');
        return;
    }

    console.log('\n📊 Log Statistics:');
    console.log(`  Total entries: ${logs.length}`);

    // Count by level
    const levelCounts: Record<string, number> = {};
    logs.forEach(log => {
        levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
    });

    console.log('  By level:');
    Object.entries(levelCounts).forEach(([level, count]) => {
        const percentage = ((count / logs.length) * 100).toFixed(1);
        console.log(`    ${level}: ${count} (${percentage}%)`);
    });

    // Time range
    const timestamps = logs.map(log => log.timestamp).filter(t => t instanceof Date && !isNaN(t.getTime()));
    if (timestamps.length > 0) {
        const minTime = new Date(Math.min(...timestamps.map(t => t.getTime())));
        const maxTime = new Date(Math.max(...timestamps.map(t => t.getTime())));
        console.log(`  Time range: ${minTime.toLocaleString()} to ${maxTime.toLocaleString()}`);
    }
}

// =============================================================================
// BATCH PROCESSING EXAMPLES
// =============================================================================

/**
 * Batch data collector that processes input in batches
 */
async function batchProcessor() {
    console.log('📦 Batch Data Processor');
    console.log('Collects input and processes in batches of 5 lines');
    console.log('Type "process" to process current batch, "exit" to quit');
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
            console.log(`👋 Processed ${batchCount} batches total`);
            break;
        }

        if (input.toLowerCase() === 'process') {
            if (batch.length > 0) {
                await processBatch(batch, ++batchCount);
                batch.length = 0;
            } else {
                console.log('📦 No items in batch to process');
            }
            console.write('> ');
            continue;
        }

        if (input === '') {
            console.write('> ');
            continue;
        }

        batch.push(input);
        console.log(`📦 Added to batch: ${input} (${batch.length}/${batchSize})`);

        if (batch.length >= batchSize) {
            await processBatch(batch, ++batchCount);
            batch.length = 0;
        }

        console.write('> ');
    }
}

async function processBatch(batch: string[], batchNumber: number) {
    console.log(`\n🔄 Processing Batch #${batchNumber} (${batch.length} items):`);

    // Analyze batch
    const totalChars = batch.reduce((sum, line) => sum + line.length, 0);
    const totalWords = batch.reduce((sum, line) =>
        sum + line.trim().split(/\s+/).filter(word => word.length > 0).length, 0
    );

    console.log(`  Total characters: ${totalChars}`);
    console.log(`  Total words: ${totalWords}`);
    console.log(`  Average length: ${(totalChars / batch.length).toFixed(2)} characters`);
    console.log(`  Average words: ${(totalWords / batch.length).toFixed(2)} words`);

    // Find longest and shortest lines
    const longest = batch.reduce((max, line) => line.length > max.length ? line : max, '');
    const shortest = batch.reduce((min, line) => line.length < min.length ? line : min, '');

    console.log(`  Longest line: "${longest}" (${longest.length} chars)`);
    console.log(`  Shortest line: "${shortest}" (${shortest.length} chars)`);

    console.log('✅ Batch processed successfully\n');
}

// =============================================================================
// INTERACTIVE CHAT INTERFACE
// =============================================================================

/**
 * Simple chat interface that responds to user input
 */
async function chatInterface() {
    console.log('💬 Simple Chat Interface');
    console.log('Type messages and I\'ll respond!');
    console.log('Commands: /help, /clear, /quit');
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
        console.log(`🤖 Bot: ${response}`);
        console.write('> ');
    }
}

async function handleChatCommand(command: string) {
    switch (command.toLowerCase()) {
        case '/help':
            console.log('Available commands: /help, /clear, /quit');
            break;
        case '/clear':
            console.clear();
            console.log('💬 Simple Chat Interface (screen cleared)');
            console.log('Type messages and I\'ll respond!');
            console.log('Commands: /help, /clear, /quit');
            break;
        case '/quit':
            console.log('👋 Goodbye! It was nice chatting with you!');
            process.exit(0);
            break;
        default:
            console.log(`❌ Unknown command: ${command}`);
    }
}

// =============================================================================
// MAIN MENU AND EXECUTION
// =============================================================================

async function showMenu() {
    console.log('🎯 Bun Console Stdin Reading Examples');
    console.log('='.repeat(50));
    console.log('Choose an example to run:');
    console.log('');
    console.log('1. Basic Echo');
    console.log('2. Addition Calculator');
    console.log('3. Word Counter');
    console.log('4. Todo Manager');
    console.log('5. JSON Processor');
    console.log('6. Log Processor');
    console.log('7. Batch Processor');
    console.log('8. Chat Interface');
    console.log('9. Run All Examples (Sequential)');
    console.log('0. Exit');
    console.log('');
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
                console.log('👋 Goodbye!');
                return;
            default:
                console.log('❌ Invalid choice. Please enter 0-9.');
                console.write('Enter your choice (0-9): ');
                continue;
        }

        // Show menu again after example completes
        console.log('\n' + '='.repeat(50));
        console.log('Choose another example or exit:');
        console.write('Enter your choice (0-9): ');
    }
}

async function runAllExamples() {
    console.log('🚀 Running All Examples (with delays):');
    console.log('');

    const examples = [
        { name: 'Basic Echo', fn: basicEcho, delay: 2000 },
        { name: 'Addition Calculator', fn: additionCalculator, delay: 3000 },
        { name: 'Word Counter', fn: wordCounter, delay: 2000 },
        { name: 'JSON Processor', fn: jsonProcessor, delay: 2000 },
        { name: 'Batch Processor', fn: batchProcessor, delay: 2000 }
    ];

    for (const example of examples) {
        console.log(`\n📋 Starting: ${example.name}`);
        console.log('(This example will run for a few seconds with simulated input)');

        // Simulate running the example with timeout
        const timeout = new Promise(resolve => setTimeout(resolve, example.delay));
        const exampleRun = example.fn();

        await Promise.race([timeout, exampleRun]);

        console.log(`✅ Completed: ${example.name}`);

        if (example !== examples[examples.length - 1]) {
            console.log('⏳ Moving to next example in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('\n🎉 All examples completed!');
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
