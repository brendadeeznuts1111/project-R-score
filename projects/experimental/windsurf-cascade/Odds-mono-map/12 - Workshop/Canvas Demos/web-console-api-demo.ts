#!/usr/bin/env bun

/**
 * Comprehensive Web Console API Demonstration
 * 
 * Complete demonstration of the Web Console API as implemented in Bun,
 * including all standard methods and Bun-specific enhancements.
 * Based on MDN Web Console API documentation.
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// BASIC LOGGING METHODS
// =============================================================================

function demonstrateBasicLogging() {
    console.info('🔍 Basic Logging Methods');
    console.info('='.repeat(50));

    // Basic console.log examples
    console.info('📝 Simple log message');

    // Multiple arguments
    const car = 'Dodge Charger';
    const someObject = { str: 'Some text', id: 5 };
    console.info('My first car was a', car, '. The object is:', someObject);

    // String substitutions
    console.info('String substitutions: %s, %d, %f, %o', 'string', 42, 3.14, { key: 'value' });

    // Different log levels
    console.info('ℹ️ This is an info message (using console.log)');
    console.info('ℹ️ This is an info message (using console.info)');
    console.warn('⚠️ This is a warning message');
    console.error('❌ This is an error message');
    console.debug('🐛 This is a debug message');
}

// =============================================================================
// OBJECT INSPECTION METHODS
// =============================================================================

function demonstrateObjectInspection() {
    console.info('\n🔍 Object Inspection Methods');
    console.info('='.repeat(50));

    // Create test objects
    const simpleObject = { str: 'Some text', id: 5 };
    const complexObject = {
        user: {
            name: 'Alice',
            age: 30,
            address: {
                street: '123 Main St',
                city: 'Anytown',
                country: 'USA'
            }
        },
        scores: [95, 87, 92],
        active: true
    };

    // console.log with object
    console.info('📋 Simple object with console.log:');
    console.info(simpleObject);

    // console.dir for detailed inspection
    console.info('\n🔍 Detailed inspection with console.dir:');
    console.dir(complexObject, { depth: 3, colors: true });

    // console.dirxml for XML/HTML representation
    console.info('\n📄 XML/HTML representation with console.dirxml:');
    console.dirxml(complexObject);

    // Demonstrate object snapshotting
    console.info('\n📸 Object snapshotting demonstration:');
    const obj = {};
    console.info('Before mutation:', obj);
    obj.prop = 123;
    console.info('After mutation - logged object shows current state when expanded');

    // Deep clone to prevent lazy evaluation
    console.info('Deep cloned object:', JSON.parse(JSON.stringify(obj)));
}

// =============================================================================
// FORMATTING AND STYLING
// =============================================================================

function demonstrateFormattingAndStyling() {
    console.info('\n🎨 Formatting and Styling');
    console.info('='.repeat(50));

    // String formatting with substitutions
    const name = 'Alice';
    const age = 30;
    const score = 95.5;
    const user = { name: 'Alice', role: 'admin' };

    console.info('User: %s, Age: %d, Score: %f, Object: %o', name, age, score, user);
    console.info('Object with generic formatting: %O', user);

    // CSS styling
    console.info('%cThis is styled text', 'color: blue; font-size: 16px; font-weight: bold;');
    console.info('%cRed text %cGreen text %cBlue text', 'color: red;', 'color: green;', 'color: blue;');

    // Background colors
    console.info('%cBackground styling', 'background: #f0f0f0; color: #333; padding: 5px; border-radius: 3px;');

    // Complex styling
    console.info(
        '%c🎨 %cStyled %cConsole %cOutput',
        'font-size: 20px; color: #ff6b6b;',
        'font-size: 18px; color: #4ecdc4; font-weight: bold;',
        'font-size: 16px; color: #45b7d1; text-decoration: underline;',
        'font-size: 14px; color: #96ceb4; font-style: italic;'
    );
}

// =============================================================================
// ASSERTION AND VALIDATION
// =============================================================================

function demonstrateAssertions() {
    console.info('\n✅ Assertions and Validation');
    console.info('='.repeat(50));

    // Successful assertion (no output)
    console.assert(true, 'This will not be shown');
    console.assert(5 === 5, 'Math is working correctly');

    // Failed assertions
    console.assert(false, 'This assertion will fail');
    console.assert(2 + 2 === 5, 'Math is broken: 2 + 2 should equal 4, not 5');

    // Complex assertions
    const user = { name: 'Alice', age: 30 };
    console.assert(user.age >= 18, 'User must be 18 or older', user);
    console.assert(user.name === 'Bob', 'Expected user name to be Bob', user);
}

// =============================================================================
// COUNTING AND TIMING
// =============================================================================

function demonstrateCountingAndTiming() {
    console.info('\n🔢 Counting and Timing');
    console.info('='.repeat(50));

    // Console counting
    console.info('📊 Counter demonstrations:');
    console.count('default');
    console.count('default');
    console.count('custom');
    console.count('default');
    console.count('custom');
    console.count('custom');

    console.info('\n🔄 Resetting counters:');
    console.countReset('default');
    console.count('default');
    console.count('custom');

    // Console timing
    console.info('\n⏱️ Timer demonstrations:');

    console.time('operation-timer');

    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += i;
    }

    console.timeLog('operation-timer', 'Loop completed, sum =', sum);

    // More work
    for (let i = 0; i < 500000; i++) {
        sum += i;
    }

    console.timeEnd('operation-timer');

    // Multiple timers
    console.time('timer-1');
    console.time('timer-2');

    setTimeout(() => {
        console.timeEnd('timer-1');
    }, 100);

    setTimeout(() => {
        console.timeEnd('timer-2');
    }, 150);
}

// =============================================================================
// GROUPING AND ORGANIZATION
// =============================================================================

function demonstrateGrouping() {
    console.info('\n📁 Grouping and Organization');
    console.info('='.repeat(50));

    // Basic grouping
    console.group('User Management');
    console.info('Creating user...');
    console.info('Validating input...');
    console.info('Saving to database...');
    console.groupEnd();

    // Nested groups
    console.group('Application Startup');
    console.info('Initializing configuration...');

    console.group('Database Connection');
    console.info('Connecting to database...');
    console.info('Running migrations...');
    console.info('Creating indexes...');
    console.groupEnd();

    console.info('Starting web server...');
    console.info('Application ready!');
    console.groupEnd();

    // Collapsed groups
    console.groupCollapsed('Debug Information');
    console.info('This group starts collapsed');
    console.info('Click to expand and see details');
    console.info({ debug: true, verbose: false, level: 'info' });
    console.groupEnd();

    // Group with labels
    const groupName = 'Processing Results';
    console.group(groupName);
    console.info('Processing step 1...');
    console.info('Processing step 2...');
    console.info('Processing step 3...');
    console.groupEnd();
}

// =============================================================================
// TABLE DISPLAY
// =============================================================================

function demonstrateTableDisplay() {
    console.info('\n📊 Table Display');
    console.info('='.repeat(50));

    // Simple array of objects
    const users = [
        { id: 1, name: 'Alice', age: 30, active: true },
        { id: 2, name: 'Bob', age: 25, active: false },
        { id: 3, name: 'Charlie', age: 35, active: true },
        { id: 4, name: 'Diana', age: 28, active: true }
    ];

    console.info('👥 Users table:');
    console.table(users);

    // Table with specific columns
    console.info('👥 Users table (name and age only):');
    console.table(users, ['name', 'age']);

    // Array data
    const scores = [95, 87, 92, 78, 88, 91, 85];
    console.info('📈 Scores array as table:');
    console.table(scores);

    // Object data
    const config = {
        database: 'postgresql',
        port: 5432,
        host: 'localhost',
        ssl: true,
        maxConnections: 100
    };
    console.info('⚙️ Configuration object as table:');
    console.table(config);

    // Complex nested data
    const products = [
        {
            id: 1,
            name: 'Laptop',
            price: 999.99,
            category: { name: 'Electronics', department: 'Tech' },
            inStock: true
        },
        {
            id: 2,
            name: 'Book',
            price: 19.99,
            category: { name: 'Books', department: 'Media' },
            inStock: true
        },
        {
            id: 3,
            name: 'Coffee Mug',
            price: 12.50,
            category: { name: 'Kitchen', department: 'Home' },
            inStock: false
        }
    ];

    console.info('🛍️ Products table:');
    console.table(products, ['name', 'price', 'inStock']);
}

// =============================================================================
// STACK TRACES AND DEBUGGING
// =============================================================================

function demonstrateStackTraces() {
    console.info('\n🔍 Stack Traces and Debugging');
    console.info('='.repeat(50));

    function functionA() {
        functionB();
    }

    function functionB() {
        functionC();
    }

    function functionC() {
        console.trace('Trace from functionC');
    }

    console.info('📍 Stack trace demonstration:');
    functionA();

    // Error with stack trace
    function throwError() {
        try {
            throw new Error('This is a demonstration error');
        } catch (error) {
            console.error('Caught error:', error.message);
            console.error('Full error object:', error);
        }
    }

    console.info('\n❌ Error handling demonstration:');
    throwError();
}

// =============================================================================
// BUN-SPECIFIC ENHANCEMENTS
// =============================================================================

function demonstrateBunEnhancements() {
    console.info('\n🚀 Bun-Specific Enhancements');
    console.info('='.repeat(50));

    // Bun.inspect for enhanced object inspection
    const complexData = {
        users: [
            { id: 1, name: 'Alice', scores: [95, 87, 92] },
            { id: 2, name: 'Bob', scores: [78, 88, 91] }
        ],
        metadata: {
            total: 2,
            active: 2,
            lastUpdated: new Date()
        }
    };

    console.info('🔍 Bun.inspect with default options:');
    console.info(Bun.inspect(complexData));

    console.info('\n🎨 Bun.inspect with colors and custom depth:');
    console.info(Bun.inspect(complexData, {
        depth: 4,
        colors: true,
        compact: false,
        maxArrayLength: 10,
        maxStringLength: 50
    }));

    // Bun.serve for HTTP server (console logging in server context)
    console.info('\n🌐 Bun server context demonstration:');
    console.info('In a real Bun server, console methods work seamlessly:');
    console.info('console.info("Request received:", request.method, request.url);');
    console.info('console.error("Server error:", error);');

    // Performance measurement
    console.info('\n⚡ Performance measurement:');
    const start = performance.now();

    // Simulate work
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i);
    }

    const end = performance.now();
    console.info(`Performance test completed in ${(end - start).toFixed(2)}ms`);
    console.info(`Result: ${result.toFixed(2)}`);
}

// =============================================================================
// PRACTICAL EXAMPLES
// =============================================================================

function demonstratePracticalExamples() {
    console.info('\n💼 Practical Examples');
    console.info('='.repeat(50));

    // Debug logger utility
    class DebugLogger {
        constructor(private enabled: boolean = true) { }

        log(...args: any[]) {
            if (this.enabled) {
                console.info('[DEBUG]', ...args);
            }
        }

        warn(...args: any[]) {
            if (this.enabled) {
                console.warn('[DEBUG]', ...args);
            }
        }

        error(...args: any[]) {
            if (this.enabled) {
                console.error('[DEBUG]', ...args);
            }
        }

        group(label: string) {
            if (this.enabled) {
                console.group(`[DEBUG] ${label}`);
            }
        }

        groupEnd() {
            if (this.enabled) {
                console.groupEnd();
            }
        }
    }

    const logger = new DebugLogger(true);

    console.info('🔧 Custom logger demonstration:');
    logger.group('User Registration Flow');
    logger.log('Starting user registration');
    logger.log('Validating user data');
    logger.warn('User already exists, showing warning');
    logger.log('Creating user account');
    logger.groupEnd();

    // API request logging
    console.info('\n🌐 API request logging demonstration:');

    function logAPIRequest(method: string, url: string, data?: any) {
        console.group(`📡 ${method} ${url}`);
        console.info('Timestamp:', new Date().toISOString());

        if (data) {
            console.info('Request data:');
            console.dir(data, { depth: 2 });
        }

        console.info('Headers: { "Content-Type": "application/json" }');
        console.groupEnd();
    }

    logAPIRequest('POST', '/api/users', { name: 'Alice', email: 'alice@example.com' });
    logAPIRequest('GET', '/api/users/123');

    // Performance monitoring
    console.info('\n📊 Performance monitoring demonstration:');

    function measurePerformance<T>(fn: () => T, label: string): T {
        console.time(label);
        const result = fn();
        console.timeEnd(label);
        return result;
    }

    const result = measurePerformance(() => {
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
            sum += Math.random();
        }
        return sum;
    }, 'Random sum calculation');

    console.info(`Calculation result: ${result.toFixed(2)}`);
}

// =============================================================================
// ADVANCED FORMATTING TECHNIQUES
// =============================================================================

function demonstrateAdvancedFormatting() {
    console.info('\n🎨 Advanced Formatting Techniques');
    console.info('='.repeat(50));

    // Progress bar
    function showProgressBar(current: number, total: number, width: number = 30) {
        const percentage = Math.floor((current / total) * 100);
        const filled = Math.floor((current / total) * width);
        const empty = width - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);

        console.info(`📊 Progress: [${bar}] ${percentage}% (${current}/${total})`);
    }

    console.info('📈 Progress bar demonstration:');
    showProgressBar(0, 100);
    showProgressBar(25, 100);
    showProgressBar(50, 100);
    showProgressBar(75, 100);
    showProgressBar(100, 100);

    // Status indicators
    function showStatus(status: 'success' | 'warning' | 'error' | 'info', message: string) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };

        const colors = {
            success: 'color: green;',
            warning: 'color: orange;',
            error: 'color: red;',
            info: 'color: blue;'
        };

        console.info(`%c${icons[status]} ${message}`, colors[status]);
    }

    console.info('\n🎯 Status indicators:');
    showStatus('success', 'Operation completed successfully');
    showStatus('warning', 'Memory usage is high');
    showStatus('error', 'Failed to connect to database');
    showStatus('info', 'Processing 1000 records');

    // Data visualization
    console.info('\n📊 Data visualization in console:');

    function visualizeData(data: number[], label: string) {
        const max = Math.max(...data);
        const width = 50;

        console.info(`📈 ${label}:`);
        data.forEach((value, index) => {
            const barLength = Math.floor((value / max) * width);
            const bar = '█'.repeat(barLength);
            console.info(`  ${index}: ${bar} ${value}`);
        });
    }

    visualizeData([10, 25, 15, 30, 20, 35, 40], 'Weekly Sales');
}

// =============================================================================
// MAIN DEMONSTRATION
// =============================================================================

async function runCompleteDemo() {
    console.info('🎯 Complete Web Console API Demonstration');
    console.info('='.repeat(60));
    console.info('Based on MDN Web Console API documentation');
    console.info('Demonstrating all standard console methods and Bun enhancements');
    console.info('='.repeat(60));

    // Run all demonstrations
    demonstrateBasicLogging();
    demonstrateObjectInspection();
    demonstrateFormattingAndStyling();
    demonstrateAssertions();
    demonstrateCountingAndTiming();
    demonstrateGrouping();
    demonstrateTableDisplay();
    demonstrateStackTraces();
    demonstrateBunEnhancements();
    demonstratePracticalExamples();
    demonstrateAdvancedFormatting();

    console.info('\n🎉 Console API demonstration completed!');
    console.info('✅ All standard Web Console API methods demonstrated');
    console.info('🚀 Bun-specific enhancements shown');
    console.info('💡 Practical examples and advanced techniques included');
}

// Export functions for programmatic use
export {
    demonstrateBasicLogging,
    demonstrateObjectInspection,
    demonstrateFormattingAndStyling,
    demonstrateAssertions,
    demonstrateCountingAndTiming,
    demonstrateGrouping,
    demonstrateTableDisplay,
    demonstrateStackTraces,
    demonstrateBunEnhancements,
    demonstratePracticalExamples,
    demonstrateAdvancedFormatting,
    runCompleteDemo
};

// Run demo if executed directly
if (import.meta.main) {
    runCompleteDemo().catch(console.error);
}
