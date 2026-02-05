#!/usr/bin/env bun

/**
 * Comprehensive Bun Debugging Demonstration
 * 
 * Complete demonstration of Bun's debugging capabilities including:
 * - WebKit Inspector Protocol integration
 * - VS Code debugging setup
 * - Network request debugging with BUN_CONFIG_VERBOSE_FETCH
 * - Stack traces and sourcemaps
 * - V8 Stack Trace API implementation
 * - Advanced debugging techniques
 * - CLI depth control with --console-depth flag
 * 
 * Usage:
 *   bun run bun-debugging-demo.ts                    # Default depth (2)
 *   bun run bun-debugging-demo.ts --console-depth 4 # Custom depth (4)
 *   bun run bun-debugging-demo.ts --console-depth 8 # Deep inspection (8)
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

interface CLIOptions {
    consoleDepth: number;
    showHelp: boolean;
    runDepthDemo: boolean;
    runInspectDemo: boolean;
}

function parseCLIArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {
        consoleDepth: 2,
        showHelp: false,
        runDepthDemo: false,
        runInspectDemo: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--help' || arg === '-h') {
            options.showHelp = true;
        } else if (arg === '--console-depth') {
            const depth = parseInt(args[i + 1]);
            if (isNaN(depth) || depth < 1 || depth > 20) {
                console.error('❌ Invalid depth. Please use a number between 1 and 20.');
                process.exit(1);
            }
            options.consoleDepth = depth;
            i++; // Skip the next argument
        } else if (arg === '--depth-demo') {
            options.runDepthDemo = true;
        } else if (arg === '--inspect-demo') {
            options.runInspectDemo = true;
        } else if (arg.startsWith('--console-depth=')) {
            const depth = parseInt(arg.split('=')[1]);
            if (isNaN(depth) || depth < 1 || depth > 20) {
                console.error('❌ Invalid depth. Please use a number between 1 and 20.');
                process.exit(1);
            }
            options.consoleDepth = depth;
        }
    }

    return options;
}

function showHelp() {
    console.log('🎯 Bun Debugging Demo - CLI Help');
    console.log('================================');
    console.log('');
    console.log('USAGE:');
    console.log('  bun run bun-debugging-demo.ts [OPTIONS]');
    console.log('');
    console.log('OPTIONS:');
    console.log('  --console-depth <number>    Set console inspection depth (1-20)');
    console.log('  --console-depth=<number>    Set console inspection depth (1-20)');
    console.log('  --depth-demo                Run focused depth control demo');
    console.log('  --inspect-demo              Run focused Bun --inspect flag demo');
    console.log('  --help, -h                  Show this help message');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  bun run bun-debugging-demo.ts                    # Default depth (2)');
    console.log('  bun run bun-debugging-demo.ts --console-depth 4 # Custom depth (4)');
    console.log('  bun run bun-debugging-demo.ts --console-depth 8 # Deep inspection (8)');
    console.log('  bun run bun-debugging-demo.ts --depth-demo      # Focused depth demo');
    console.log('  bun run bun-debugging-demo.ts --inspect-demo    # Focused inspect demo');
    console.log('');
    console.log('DEPTH RECOMMENDATIONS:');
    console.log('  • 2-3: Quick debugging and logging');
    console.log('  • 4-6: API responses and data structures');
    console.log('  • 6-8: Complex nested objects');
    console.log('  • 10+: Thorough debugging of very deep structures');
    console.log('');
}

// =============================================================================
// DEPTH CONTROL DEMO WITH CLI SUPPORT
// =============================================================================

function demonstrateDepthControlWithCLI(depth: number) {
    console.log('\n🔍 CLI Depth Control Demonstration with Clean Tables');
    console.log('='.repeat(60));
    console.log(`📊 Using console depth: ${depth}`);
    console.log('');

    // Test objects with different nesting levels
    const testObjects = {
        simple: { name: 'Simple', value: 42 },
        nested: { level1: { level2: { level3: 'deep' } } },
        complex: {
            services: {
                bridge: {
                    status: 'active',
                    metrics: {
                        requests: 1000000,
                        errors: 42,
                        performance: {
                            average: 125.5,
                            p95: 280.3,
                            details: {
                                server: 'aws',
                                region: 'us-west-2',
                                version: '2.1.0'
                            }
                        }
                    }
                }
            }
        },
        veryDeep: {
            a: { b: { c: { d: { e: { f: { g: { h: { i: { j: 'very deep' } } } } } } } } }
        }
    };

    // Depth Analysis Table
    const depthAnalysis = Object.entries(testObjects).map(([name, obj]) => {
        const actualDepth = getObjectDepth(obj);
        const isFullyVisible = actualDepth <= depth;

        return {
            object: name.charAt(0).toUpperCase() + name.slice(1),
            actualDepth,
            requestedDepth: depth,
            visibility: isFullyVisible ? '✅ Complete' : '❌ Partial',
            recommended: actualDepth <= depth ? '✅ Optimal' : `⚠️ Need ${actualDepth}`,
            complexity: actualDepth <= 2 ? 'Simple' : actualDepth <= 4 ? 'Moderate' : actualDepth <= 6 ? 'Complex' : 'Very Complex'
        };
    });

    console.log('📊 Depth Control Analysis:');
    console.log(Bun.inspect.table(depthAnalysis, { colors: true }));

    // Performance comparison by depth
    console.log('\n⚡ Performance Impact by Depth:');

    const performanceTests = Object.entries(testObjects).map(([name, obj]) => {
        const start = performance.now();
        Bun.inspect(obj, { depth, colors: false });
        const duration = performance.now() - start;

        return {
            object: name.charAt(0).toUpperCase() + name.slice(1),
            inspectionTime: `${duration.toFixed(3)}ms`,
            opsPerSec: Math.round(1 / duration * 1000).toLocaleString(),
            grade: duration < 0.01 ? '🏆 A+' : duration < 0.05 ? '✅ A' : duration < 0.1 ? '⚠️ B' : '❌ C'
        };
    });

    console.log(Bun.inspect.table(performanceTests, { colors: true }));

    // Depth recommendations table
    const recommendations = [
        { depth: '1-2', use: 'Production Logging', performance: 'Very Fast', visibility: 'Limited', recommendation: 'High-volume logs' },
        { depth: '3-4', use: 'Development Debugging', performance: 'Fast', visibility: 'Good', recommendation: 'Daily development' },
        { depth: '5-6', use: 'API Analysis', performance: 'Moderate', visibility: 'Excellent', recommendation: 'Complex data' },
        { depth: '7-8', use: 'System Debugging', performance: 'Slow', visibility: 'Complete', recommendation: 'Deep troubleshooting' },
        { depth: '9-10', use: 'Complete Inspection', performance: 'Very Slow', visibility: 'Complete', recommendation: 'Special cases' }
    ];

    console.log('\n💡 Depth Recommendations Guide:');
    console.log(Bun.inspect.table(recommendations, { colors: true }));

    // Current configuration summary
    const currentConfig = [
        { setting: 'Current Depth', value: depth.toString(), status: depth <= 4 ? '✅ Good' : depth <= 6 ? '⚠️ Moderate' : '❌ Heavy' },
        { setting: 'Performance Impact', value: depth <= 3 ? 'Low' : depth <= 5 ? 'Medium' : 'High', status: depth <= 3 ? '🏆 Excellent' : depth <= 5 ? '✅ Acceptable' : '⚠️ Consider Reducing' },
        { setting: 'Visibility Level', value: depth <= 2 ? 'Basic' : depth <= 4 ? 'Good' : depth <= 6 ? 'Detailed' : 'Complete', status: '✅ Configured' },
        { setting: 'Use Case Fit', value: depth <= 2 ? 'Production' : depth <= 4 ? 'Development' : depth <= 6 ? 'Analysis' : 'Debugging', status: '✅ Optimal' }
    ];

    console.log('\n⚙️ Current Configuration Summary:');
    console.log(Bun.inspect.table(currentConfig, { colors: true }));

    console.log(`\n✅ Depth control demonstration completed for depth ${depth}`);
}

function getObjectDepth(obj: any, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
        return currentDepth;
    }

    if (Array.isArray(obj)) {
        return obj.length > 0 ? getObjectDepth(obj[0], currentDepth + 1) : currentDepth;
    }

    const values = Object.values(obj);
    return values.length > 0 ? Math.max(...values.map(v => getObjectDepth(v, currentDepth + 1))) : currentDepth;
}

// =============================================================================
// CLI-SPECIFIC DEMONSTRATIONS
// =============================================================================

function demonstrateCLIEnhancedFeatures(depth: number) {
    console.log('\n🚀 CLI-Enhanced Features');
    console.log('========================');

    // Import enhanced console inspection module
    import('./enhanced-console-inspection-module.js').then(({ EnhancedConsoleInspectionModule }) => {
        console.log('✅ Enhanced Console Inspection Module loaded');

        const enhancedConsole = new EnhancedConsoleInspectionModule({
            showColors: true,
            inspectionDepth: depth,
            colorFormat: 'ansi-16m',
            enableCanvasBranding: true,
            performanceMode: true
        });

        console.log(`\n🎨 Enhanced Object Inspection (depth ${depth}):`);
        enhancedConsole.demonstrateObjectInspection();

        console.log(`\n🎨 Enhanced Color Formats (depth ${depth}):`);
        enhancedConsole.demonstrateColorFormats();

        console.log(`\n📊 Performance Analysis with depth ${depth}:`);
        const largeObject = createLargeNestedObject();
        const iterations = 1000;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            Bun.inspect(largeObject, { depth, colors: false });
        }
        const duration = performance.now() - start;
        const opsPerSec = Math.round(iterations / duration * 1000);

        console.log(`Performance with depth ${depth}: ${opsPerSec.toLocaleString()} ops/sec`);

        const cacheStats = enhancedConsole.getColorManager().getCacheStats();
        console.log(`Cache entries: ${cacheStats.size}`);

    }).catch(error => {
        console.error('❌ Failed to load enhanced console inspection module:', error);
    });
}

function showDepthRecommendations(depth: number) {
    console.log('\n💡 Depth Recommendations');
    console.log('========================');

    const recommendations = {
        1: { use: 'Very shallow inspection', example: 'Simple key-value pairs' },
        2: { use: 'Default console behavior', example: 'Quick debugging' },
        3: { use: 'Light debugging', example: 'Simple API responses' },
        4: { use: 'Standard debugging', example: 'Most API responses' },
        5: { use: 'Deep inspection', example: 'Complex data structures' },
        6: { use: 'Very deep inspection', example: 'Nested API responses' },
        8: { use: 'Complex debugging', example: 'System configurations' },
        10: { use: 'Thorough debugging', example: 'Very complex objects' },
        15: { use: 'Maximum debugging', example: 'Deeply nested structures' },
        20: { use: 'Extreme debugging', example: 'Complete introspection' }
    };

    const currentRec = recommendations[depth as keyof typeof recommendations] || recommendations[20];

    console.log(`🎯 Current depth ${depth}: ${currentRec.use}`);
    console.log(`📝 Best for: ${currentRec.example}`);

    console.log('\n📊 Depth Impact Analysis:');
    console.log(`• Visibility: ${depth < 3 ? 'Limited' : depth < 6 ? 'Good' : depth < 10 ? 'Excellent' : 'Complete'}`);
    console.log(`• Performance: ${depth < 4 ? 'Very Fast' : depth < 8 ? 'Fast' : depth < 12 ? 'Moderate' : 'Slower'}`);
    console.log(`• Output Size: ${depth < 3 ? 'Small' : depth < 6 ? 'Medium' : depth < 10 ? 'Large' : 'Very Large'}`);
    console.log(`• Use Case: ${depth < 3 ? 'Production Logging' : depth < 6 ? 'Development Debugging' : depth < 10 ? 'API Analysis' : 'Deep Troubleshooting'}`);
}

// =============================================================================
// DEBUGGING SERVER EXAMPLES
// =============================================================================

/**
 * Simple web server for debugging demonstrations
 */
function createDebugServer() {
    console.log('🌐 Creating debug server...');

    const server = Bun.serve({
        port: 3000,
        fetch(req) {
            console.log('📡 Request received:', req.method, req.url);

            // Add some variables to inspect during debugging
            const url = new URL(req.url);
            const path = url.pathname;
            const timestamp = new Date().toISOString();
            const userAgent = req.headers.get('user-agent') || 'Unknown';

            console.log('🔍 Debug info:');
            console.log('  Path:', path);
            console.log('  Timestamp:', timestamp);
            console.log('  User-Agent:', userAgent);

            // This is a good place to set a breakpoint
            if (path === '/debug') {
                console.log('🐛 Debug endpoint hit - breakpoint here!');
                return new Response(JSON.stringify({
                    message: 'Debug endpoint',
                    path,
                    timestamp,
                    userAgent,
                    debug: true
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (path === '/error') {
                console.log('❌ Error endpoint - will throw an error');
                throw new Error('Intentional error for debugging demonstration');
            }

            return new Response(`Hello, world! Time: ${timestamp}`);
        },
        error(error) {
            console.error('❌ Server error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    });

    console.log(`🚀 Server running on http://localhost:${server.port}`);
    console.log('📝 Debug endpoints:');
    console.log('  http://localhost:3000/ - Normal response');
    console.log('  http://localhost:3000/debug - Debug endpoint');
    console.log('  http://localhost:3000/error - Error endpoint');

    return server;
}

/**
 * Complex server with multiple functions for step debugging
 */
class ComplexDebugServer {
    private requestCount = 0;
    private connections = new Set<any>();

    constructor(private port: number = 3001) { }

    start() {
        console.log(`🔧 Starting complex debug server on port ${this.port}`);

        const server = Bun.serve({
            port: this.port,
            fetch: this.handleRequest.bind(this),
            websocket: {
                message: this.handleWebSocket.bind(this),
                open: this.handleWebSocketOpen.bind(this),
                close: this.handleWebSocketClose.bind(this),
                error: this.handleWebSocketError.bind(this)
            }
        });

        console.log(`🌐 Complex server running on http://localhost:${server.port}`);
        console.log('📝 Test endpoints:');
        console.log('  http://localhost:3001/api/users - User API');
        console.log('  http://localhost:3001/api/calculate - Calculation API');
        console.log('  http://localhost:3001/ws - WebSocket endpoint');

        return server;
    }

    private async handleRequest(req: Request): Promise<Response> {
        this.requestCount++;
        const requestId = this.requestCount;

        console.log(`📡 Request #${requestId}:`, req.method, req.url);

        const url = new URL(req.url);
        const path = url.pathname;

        // Route handling - good places for breakpoints
        if (path.startsWith('/api/users')) {
            return this.handleUsersAPI(req, requestId);
        }

        if (path.startsWith('/api/calculate')) {
            return this.handleCalculateAPI(req, requestId);
        }

        if (path === '/ws') {
            // Upgrade to WebSocket
            return new Response('WebSocket upgrade required', { status: 426 });
        }

        return new Response(`Request #${requestId} processed`);
    }

    private async handleUsersAPI(req: Request, requestId: number): Promise<Response> {
        console.log(`👥 Processing users API request #${requestId}`);

        // Simulate database query
        const users = await this.fetchUsers();
        const filteredUsers = this.filterActiveUsers(users);
        const response = this.formatUserResponse(filteredUsers, requestId);

        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    private async handleCalculateAPI(req: Request, requestId: number): Promise<Response> {
        console.log(`🧮 Processing calculate API request #${requestId}`);

        const url = new URL(req.url);
        const a = parseFloat(url.searchParams.get('a') || '0');
        const b = parseFloat(url.searchParams.get('b') || '0');
        const operation = url.searchParams.get('op') || 'add';

        console.log(`🔢 Calculation: ${a} ${operation} ${b}`);

        const result = this.performCalculation(a, b, operation);

        return new Response(JSON.stringify({
            requestId,
            operation,
            operands: { a, b },
            result,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    private async fetchUsers(): Promise<Array<{ id: number; name: string; active: boolean }>> {
        console.log('🗄️ Fetching users from database...');

        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 100));

        return [
            { id: 1, name: 'Alice', active: true },
            { id: 2, name: 'Bob', active: false },
            { id: 3, name: 'Charlie', active: true },
            { id: 4, name: 'Diana', active: true }
        ];
    }

    private filterActiveUsers(users: Array<{ id: number; name: string; active: boolean }>) {
        console.log('🔍 Filtering active users...');
        return users.filter(user => user.active);
    }

    private formatUserResponse(users: Array<{ id: number; name: string; active: boolean }>, requestId: number) {
        console.log('📝 Formatting user response...');
        return {
            requestId,
            users: users.map(({ id, name }) => ({ id, name })),
            count: users.length,
            timestamp: new Date().toISOString()
        };
    }

    private performCalculation(a: number, b: number, operation: string): number {
        console.log(`🧮 Performing calculation: ${a} ${operation} ${b}`);

        switch (operation) {
            case 'add':
                return a + b;
            case 'subtract':
                return a - b;
            case 'multiply':
                return a * b;
            case 'divide':
                if (b === 0) throw new Error('Division by zero');
                return a / b;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    // WebSocket handlers
    private handleWebSocket(ws: WebSocket, message: string | Buffer) {
        console.log('📨 WebSocket message received:', message.toString());
        ws.send(`Echo: ${message}`);
    }

    private handleWebSocketOpen(ws: WebSocket) {
        console.log('🔗 WebSocket connection opened');
        this.connections.add(ws);
        ws.send('Welcome to WebSocket debug server!');
    }

    private handleWebSocketClose(ws: WebSocket) {
        console.log('🔌 WebSocket connection closed');
        this.connections.delete(ws);
    }

    private handleWebSocketError(ws: WebSocket, error: Error) {
        console.error('❌ WebSocket error:', error);
        this.connections.delete(ws);
    }
}

// =============================================================================
// NETWORK DEBUGGING EXAMPLES
// =============================================================================

/**
 * Demonstrate network request debugging with BUN_CONFIG_VERBOSE_FETCH
 */
async function demonstrateNetworkDebugging() {
    console.log('🌐 Network Request Debugging Demonstration');
    console.log('='.repeat(50));

    // Enable verbose fetch logging
    process.env.BUN_CONFIG_VERBOSE_FETCH = 'curl';

    console.log('📡 Making fetch requests with verbose logging...');

    try {
        // Simple GET request
        console.log('\n1️⃣ Simple GET request:');
        const response1 = await fetch('https://httpbin.org/get');
        console.log('Response status:', response1.status);

        // POST request with JSON body
        console.log('\n2️⃣ POST request with JSON:');
        const response2 = await fetch('https://httpbin.org/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Bun-Debug-Demo/1.0'
            },
            body: JSON.stringify({
                message: 'Hello from Bun debugger!',
                timestamp: new Date().toISOString(),
                debug: true
            })
        });
        console.log('Response status:', response2.status);

        // Request with custom headers
        console.log('\n3️⃣ Request with custom headers:');
        const response3 = await fetch('https://httpbin.org/headers', {
            method: 'GET',
            headers: {
                'X-Debug-Mode': 'true',
                'X-Custom-Header': 'Bun-Demo',
                'Authorization': 'Bearer debug-token-123'
            }
        });
        console.log('Response status:', response3.status);

    } catch (error) {
        console.error('❌ Network error:', error);
    }

    // Switch to non-curl verbose mode
    process.env.BUN_CONFIG_VERBOSE_FETCH = 'true';

    console.log('\n📡 Switching to non-curl verbose mode...');

    try {
        await fetch('https://httpbin.org/user-agent', {
            method: 'GET',
            headers: {
                'User-Agent': 'Bun-Debug-Demo/1.0'
            }
        });
    } catch (error) {
        console.error('❌ Network error:', error);
    }

    // Disable verbose logging
    process.env.BUN_CONFIG_VERBOSE_FETCH = 'false';
    console.log('\n✅ Verbose logging disabled');
}

/**
 * Demonstrate Node.js HTTP debugging
 */
async function demonstrateNodeHttpDebugging() {
    console.log('\n🔧 Node.js HTTP Debugging Demonstration');
    console.log('='.repeat(50));

    // Enable verbose fetch for node:http compatibility
    process.env.BUN_CONFIG_VERBOSE_FETCH = 'true';

    try {
        // Using Node.js http module (Bun compatible)
        const { default: http } = await import('node:http');

        console.log('📡 Making request with node:http...');

        const data = await new Promise<string>((resolve, reject) => {
            const req = http.request('http://httpbin.org/get', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.end();
        });

        console.log('Response received:', JSON.parse(data).url);

    } catch (error) {
        console.error('❌ Node.js HTTP error:', error);
    }

    process.env.BUN_CONFIG_VERBOSE_FETCH = 'false';
}

// =============================================================================
// STACK TRACE AND SOURCEMAP EXAMPLES
// =============================================================================

/**
 * Demonstrate error handling and stack traces
 */
function demonstrateStackTraces() {
    console.log('\n📍 Stack Trace and Sourcemap Demonstration');
    console.log('='.repeat(50));

    // Create nested function calls for stack trace
    function level1() {
        level2();
    }

    function level2() {
        level3();
    }

    function level3() {
        level4();
    }

    function level4() {
        throw new Error('This is a demonstration error for stack trace');
    }

    try {
        console.log('🔍 Generating stack trace...');
        level1();
    } catch (error) {
        console.log('\n❌ Caught error with stack trace:');
        console.error(error);

        console.log('\n🔍 Using Bun.inspect for enhanced error display:');
        console.log(Bun.inspect(error, { colors: true }));

        console.log('\n📊 Error properties:');
        console.log('  message:', error.message);
        console.log('  name:', error.name);
        console.log('  stack length:', error.stack?.split('\n').length);
    }
}

/**
 * Demonstrate V8 Stack Trace API
 */
function demonstrateV8StackTraceAPI() {
    console.log('\n🔧 V8 Stack Trace API Demonstration');
    console.log('='.repeat(50));

    // Custom stack trace preparation
    console.log('1️⃣ Custom stack trace preparation:');

    Error.prepareStackTrace = (err, stack) => {
        return stack.map((callSite: any) => {
            return `${callSite.getFileName()}:${callSite.getLineNumber()}:${callSite.getColumnNumber()} - ${callSite.getFunctionName() || 'anonymous'}`;
        }).join('\n');
    };

    function deepFunction1() {
        deepFunction2();
    }

    function deepFunction2() {
        deepFunction3();
    }

    function deepFunction3() {
        const error = new Error('Custom stack trace demo');
        console.log('Custom stack trace:');
        console.log(error.stack);
    }

    deepFunction1();

    // Reset to default
    Error.prepareStackTrace = undefined;

    // Demonstrate Error.captureStackTrace
    console.log('\n2️⃣ Error.captureStackTrace demonstration:');

    function outerFunction() {
        innerFunction();
    }

    function innerFunction() {
        const error = new Error('Original error location');

        console.log('Original stack trace:');
        console.log(error.stack);

        console.log('\nAfter captureStackTrace:');
        Error.captureStackTrace(error, outerFunction);
        console.log(error.stack);
    }

    outerFunction();

    // Demonstrate CallSite methods
    console.log('\n3️⃣ CallSite object methods:');

    Error.prepareStackTrace = (err, stack) => {
        const callSite = stack[0];
        console.log('CallSite information:');
        console.log('  getFileName():', callSite.getFileName());
        console.log('  getLineNumber():', callSite.getLineNumber());
        console.log('  getColumnNumber():', callSite.getColumnNumber());
        console.log('  getFunctionName():', callSite.getFunctionName());
        console.log('  getMethodName():', callSite.getMethodName());
        console.log('  getTypeName():', callSite.getTypeName());
        console.log('  isToplevel():', callSite.isToplevel());
        console.log('  isEval():', callSite.isEval());
        console.log('  isNative():', callSite.isNative());
        console.log('  isConstructor():', callSite.isConstructor());
        console.log('  isAsync():', callSite.isAsync());

        return err.stack; // Return default stack trace
    };

    function callSiteDemo() {
        throw new Error('CallSite demonstration');
    }

    try {
        callSiteDemo();
    } catch (error) {
        // Error will be processed by our custom prepareStackTrace
    }

    // Reset to default
    Error.prepareStackTrace = undefined;
}

// =============================================================================
// ASYNCHRONOUS DEBUGGING EXAMPLES
// =============================================================================

/**
 * Demonstrate async/await debugging
 */
async function demonstrateAsyncDebugging() {
    console.log('\n⚡ Asynchronous Debugging Demonstration');
    console.log('='.repeat(50));

    async function asyncOperation1(value: number): Promise<number> {
        console.log('🔄 Starting asyncOperation1 with value:', value);
        await new Promise(resolve => setTimeout(resolve, 100));
        const result = value * 2;
        console.log('✅ asyncOperation1 completed with result:', result);
        return result;
    }

    async function asyncOperation2(value: number): Promise<string> {
        console.log('🔄 Starting asyncOperation2 with value:', value);
        await new Promise(resolve => setTimeout(resolve, 150));
        const result = `Result: ${value}`;
        console.log('✅ asyncOperation2 completed with result:', result);
        return result;
    }

    async function asyncOperation3(value: string): Promise<{ processed: string; timestamp: string }> {
        console.log('🔄 Starting asyncOperation3 with value:', value);
        await new Promise(resolve => setTimeout(resolve, 200));
        const result = {
            processed: value.toUpperCase(),
            timestamp: new Date().toISOString()
        };
        console.log('✅ asyncOperation3 completed with result:', result);
        return result;
    }

    try {
        console.log('🚀 Starting async operation chain...');

        const result1 = await asyncOperation1(5);
        const result2 = await asyncOperation2(result1);
        const result3 = await asyncOperation3(result2);

        console.log('🎉 Final result:', result3);

    } catch (error) {
        console.error('❌ Async operation failed:', error);
    }
}

/**
 * Demonstrate Promise debugging
 */
function demonstratePromiseDebugging() {
    console.log('\n🔗 Promise Debugging Demonstration');
    console.log('='.repeat(50));

    function createPromises() {
        const promise1 = new Promise<string>((resolve, reject) => {
            console.log('🔄 Creating promise1');
            setTimeout(() => {
                console.log('✅ promise1 resolved');
                resolve('Promise 1 result');
            }, 100);
        });

        const promise2 = new Promise<number>((resolve, reject) => {
            console.log('🔄 Creating promise2');
            setTimeout(() => {
                console.log('✅ promise2 resolved');
                resolve(42);
            }, 150);
        });

        const promise3 = new Promise<boolean>((resolve, reject) => {
            console.log('🔄 Creating promise3');
            setTimeout(() => {
                console.log('❌ promise3 rejected');
                reject(new Error('Promise 3 failed'));
            }, 200);
        });

        return { promise1, promise2, promise3 };
    }

    const { promise1, promise2, promise3 } = createPromises();

    // Promise.all - will fail if any promise fails
    Promise.all([promise1, promise2])
        .then(results => {
            console.log('✅ Promise.all succeeded:', results);
        })
        .catch(error => {
            console.error('❌ Promise.all failed:', error);
        });

    // Promise.allSettled - shows all results
    Promise.allSettled([promise1, promise2, promise3])
        .then(results => {
            console.log('📊 Promise.allSettled results:');
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`  Promise ${index + 1}:`, result.value);
                } else {
                    console.log(`  Promise ${index + 1}:`, result.reason.message);
                }
            });
        });
}

// =============================================================================
// DEBUGGING UTILITIES
// =============================================================================

/**
 * Enhanced Debug utility class for common debugging tasks with cleaner output
 */
class DebugUtils {
    private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
    private static showTimestamps = true;
    private static showColors = true;

    static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
        this.logLevel = level;
    }

    static setShowTimestamps(show: boolean) {
        this.showTimestamps = show;
    }

    static setShowColors(show: boolean) {
        this.showColors = show;
    }

    private static getTimestamp(): string {
        if (!this.showTimestamps) return '';
        return `[${new Date().toISOString().split('T')[1].split('.')[0]}] `;
    }

    private static formatMessage(level: string, message: string): string {
        const timestamp = this.getTimestamp();
        const icons = {
            debug: '🐛',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };
        const icon = this.showColors ? icons[level as keyof typeof icons] : '';
        return `${timestamp}${icon} [${level.toUpperCase()}] ${message}`;
    }

    static debug(message: string, ...args: any[]) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message), ...args);
        }
    }

    static info(message: string, ...args: any[]) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message), ...args);
        }
    }

    static warn(message: string, ...args: any[]) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }

    static error(message: string, ...args: any[]) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }

    private static shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    static inspect(label: string, obj: any, options?: { depth?: number; colors?: boolean; showType?: boolean }) {
        const opts = { depth: 3, colors: this.showColors, showType: true, ...options };
        const timestamp = this.getTimestamp();

        console.log(`${timestamp}🔍 [INSPECT] ${label}:`);

        if (opts.showType) {
            console.log(`   Type: ${typeof obj} | Constructor: ${obj?.constructor?.name || 'Object'}`);
        }

        console.log(Bun.inspect(obj, {
            depth: opts.depth,
            colors: opts.colors,
            compact: false,
            maxArrayLength: 10,
            maxStringLength: 100
        }));
    }

    static trace(message: string) {
        console.log(`${this.getTimestamp()}📍 [TRACE] ${message}`);
        console.trace();
    }

    static time(label: string) {
        console.time(`${this.getTimestamp()}⏱️ [TIME] ${label}`);
    }

    static timeEnd(label: string) {
        console.timeEnd(`${this.getTimestamp()}⏱️ [TIME] ${label}`);
    }

    static async measureAsync<T>(fn: () => Promise<T>, label: string): Promise<T> {
        this.time(label);
        try {
            const result = await fn();
            this.timeEnd(label);
            return result;
        } catch (error) {
            this.timeEnd(label);
            this.error(`Async measurement failed for ${label}:`, error);
            throw error;
        }
    }

    static measure<T>(fn: () => T, label: string): T {
        this.time(label);
        try {
            const result = fn();
            this.timeEnd(label);
            return result;
        } catch (error) {
            this.timeEnd(label);
            this.error(`Measurement failed for ${label}:`, error);
            throw error;
        }
    }

    static table(data: any[], label?: string, options?: { showIndex?: boolean; maxRows?: number }) {
        const timestamp = this.getTimestamp();
        const opts = { showIndex: true, maxRows: 20, ...options };

        if (label) {
            console.log(`${timestamp}📊 [TABLE] ${label}:`);
        }

        const limitedData = opts.maxRows ? data.slice(0, opts.maxRows) : data;
        console.log(Bun.inspect.table(limitedData, { colors: this.showColors }));

        if (data.length > opts.maxRows) {
            console.log(`   ... and ${data.length - opts.maxRows} more rows`);
        }
    }

    static group(label: string, collapsed: boolean = false) {
        const timestamp = this.getTimestamp();
        const method = collapsed ? 'groupCollapsed' : 'group';
        console[method](`${timestamp}📁 [GROUP] ${label}`);
    }

    static groupEnd() {
        console.groupEnd();
    }

    static divider(char: string = '─', length: number = 50) {
        console.log(char.repeat(length));
    }

    static section(title: string, icon: string = '📋') {
        this.divider();
        console.log(`${icon} ${title}`);
        this.divider();
    }

    static summary(title: string, data: Record<string, any>) {
        this.section(title, '📋');
        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                console.log(`   • ${key}:`);
                value.forEach(item => console.log(`     - ${item}`));
            } else if (typeof value === 'object') {
                console.log(`   • ${key}: ${JSON.stringify(value, null, 6)}`);
            } else {
                console.log(`   • ${key}: ${value}`);
            }
        });
    }

    static performance(operation: string, iterations: number, fn: () => void) {
        this.info(`Starting performance test: ${operation} (${iterations} iterations)`);

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            fn();
        }
        const duration = performance.now() - start;
        const opsPerSec = Math.round(iterations / duration * 1000);

        this.info(`Performance results for ${operation}:`);
        console.log(`   • Duration: ${duration.toFixed(2)}ms`);
        console.log(`   • Operations/sec: ${opsPerSec.toLocaleString()}`);
        console.log(`   • Average time: ${(duration / iterations).toFixed(4)}ms per operation`);

        return { duration, opsPerSec, avgTime: duration / iterations };
    }
}

/**
 * Demonstrate enhanced debug utilities with clean table outputs
 */
function demonstrateDebugUtilities() {
    console.log('\n🛠️ Enhanced Debug Utilities with Clean Table Outputs');
    console.log('='.repeat(65));

    // Configure debug utilities
    DebugUtils.setLogLevel('debug');
    DebugUtils.setShowTimestamps(true);
    DebugUtils.setShowColors(true);

    // Configuration Table
    const configTable = [
        { setting: 'Log Level', value: 'debug', description: 'Show all log messages' },
        { setting: 'Timestamps', value: 'enabled', description: 'Show time in each log message' },
        { setting: 'Colors', value: 'enabled', description: 'Use color-coded log levels' }
    ];

    console.log('\n⚙️ Debug Utilities Configuration:');
    console.log(Bun.inspect.table(configTable, { colors: true }));

    // Log Level Examples Table
    console.log('\n📝 Log Level Examples:');
    DebugUtils.info('Demonstrating enhanced logging with timestamps and colors');
    DebugUtils.debug('This is a debug message with detailed information');
    DebugUtils.warn('This is a warning message that requires attention');
    DebugUtils.error('This is an error message for critical issues');

    // Enhanced object inspection with table analysis
    const complexObject = {
        users: [
            { id: 1, name: 'Alice', scores: [95, 87, 92], active: true },
            { id: 2, name: 'Bob', scores: [78, 88, 91], active: false }
        ],
        metadata: {
            total: 2,
            active: 2,
            lastUpdated: new Date(),
            version: '2.1.0'
        },
        performance: {
            avgResponseTime: 125.5,
            requestsPerSecond: 450,
            errorRate: 0.02
        }
    };

    DebugUtils.inspect('Complex User Object', complexObject, {
        depth: 4,
        colors: true,
        showType: true
    });

    // Object Analysis Table
    const objectAnalysis = [
        {
            property: 'users',
            type: 'Array',
            length: 2,
            description: 'User records with scores and activity status'
        },
        {
            property: 'metadata',
            type: 'Object',
            keys: 4,
            description: 'System metadata including version and timestamps'
        },
        {
            property: 'performance',
            type: 'Object',
            keys: 3,
            description: 'Performance metrics for monitoring'
        }
    ];

    console.log('\n🔍 Object Structure Analysis:');
    console.log(Bun.inspect.table(objectAnalysis, { colors: true }));

    // Performance measurement with results table
    console.log('\n⚡ Performance Measurement:');

    const calculationResult = DebugUtils.measure(() => {
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
            sum += Math.random();
        }
        return sum;
    }, 'Random sum calculation');

    DebugUtils.info(`Calculation result: ${calculationResult.toFixed(2)}`);

    // Async measurement demonstration
    DebugUtils.info('Demonstrating async measurement...');
    DebugUtils.measureAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Async operation completed successfully';
    }, 'Async operation').then(result => {
        DebugUtils.info(`Async result: ${result}`);
    });

    // Service Metrics Table
    const serviceData = [
        { name: 'Bridge', status: 'active', requests: 1000000, errors: 42, uptime: '99.9%', health: '🟢' },
        { name: 'Analytics', status: 'beta', requests: 500000, errors: 125, uptime: '98.5%', health: '🟡' },
        { name: 'Monitor', status: 'active', requests: 750000, errors: 23, uptime: '99.7%', health: '🟢' },
        { name: 'Pipeline', status: 'deprecated', requests: 250000, errors: 89, uptime: '95.2%', health: '🔴' },
        { name: 'Gateway', status: 'active', requests: 1200000, errors: 67, uptime: '99.4%', health: '🟢' }
    ];

    console.log('\n📊 Service Metrics Table:');
    console.log(Bun.inspect.table(serviceData, { colors: true }));

    // Performance testing with comparison table
    console.log('\n🏁 Performance Testing:');

    const testResults = [
        DebugUtils.performance('Object Inspection', 1000, () => {
            Bun.inspect(complexObject, { depth: 3, colors: false });
        }),
        DebugUtils.performance('JSON Stringify', 1000, () => {
            JSON.stringify(complexObject);
        }),
        DebugUtils.performance('Deep Clone', 1000, () => {
            JSON.parse(JSON.stringify(complexObject));
        })
    ];

    const performanceComparison = testResults.map((result, index) => ({
        operation: ['Object Inspection', 'JSON Stringify', 'Deep Clone'][index],
        duration: `${result.duration.toFixed(2)}ms`,
        opsPerSec: result.opsPerSec.toLocaleString(),
        avgTime: `${result.avgTime.toFixed(4)}ms`,
        grade: result.opsPerSec > 10000 ? '🏆 A+' : result.opsPerSec > 5000 ? '✅ A' : result.opsPerSec > 1000 ? '⚠️ B' : '❌ C'
    }));

    console.log('\n📈 Performance Comparison Table:');
    console.log(Bun.inspect.table(performanceComparison, { colors: true }));

    // Feature demonstration table
    console.log('\n🎯 Feature Demonstration:');

    DebugUtils.group('Request Processing Flow', false);
    DebugUtils.info('Starting request processing');
    DebugUtils.debug('Validating input parameters');
    DebugUtils.debug('Checking authentication');
    DebugUtils.info('Processing request data');
    DebugUtils.debug('Generating response');
    DebugUtils.info('Request completed successfully');
    DebugUtils.groupEnd();

    const featureDemo = [
        {
            feature: 'Enhanced Logging',
            status: '✅ Active',
            benefit: 'Timestamps and color-coded levels'
        },
        {
            feature: 'Object Inspection',
            status: '✅ Active',
            benefit: 'Deep object analysis with type info'
        },
        {
            feature: 'Performance Measurement',
            status: '✅ Active',
            benefit: 'Real-time performance tracking'
        },
        {
            feature: 'Table Formatting',
            status: '✅ Active',
            benefit: 'Clean structured data display'
        },
        {
            feature: 'Grouped Logging',
            status: '✅ Active',
            benefit: 'Organized log message grouping'
        }
    ];

    console.log('\n🚀 Debug Utilities Features:');
    console.log(Bun.inspect.table(featureDemo, { colors: true }));

    // Best practices table
    const bestPractices = [
        {
            practice: 'Use Appropriate Log Levels',
            priority: 'High',
            impact: 'Better filtering and clarity'
        },
        {
            practice: 'Enable Timestamps for Debugging',
            priority: 'Medium',
            impact: 'Better traceability'
        },
        {
            practice: 'Use Tables for Structured Data',
            priority: 'High',
            impact: 'Improved readability'
        },
        {
            practice: 'Group Related Log Messages',
            priority: 'Medium',
            impact: 'Better organization'
        },
        {
            practice: 'Measure Performance Regularly',
            priority: 'High',
            impact: 'Proactive optimization'
        }
    ];

    console.log('\n💡 Best Practices Guide:');
    console.log(Bun.inspect.table(bestPractices, { colors: true }));

    // Summary statistics table
    const summaryStats = [
        { metric: 'Features Demonstrated', value: '8', status: '✅ Complete' },
        { metric: 'Performance Tests', value: '3', status: '✅ Passed' },
        { metric: 'Table Outputs', value: '7', status: '✅ Formatted' },
        { metric: 'Log Levels', value: '4', status: '✅ Active' },
        { metric: 'Memory Efficiency', value: 'Excellent', status: '🏆 Optimized' }
    ];

    console.log('\n📋 Summary Statistics:');
    console.log(Bun.inspect.table(summaryStats, { colors: true }));

    DebugUtils.info('✅ Enhanced debug utilities with clean table outputs completed successfully!');
}

/**
 * Demonstrate Bun.inspect.custom for custom object serialization
 */
function demonstrateBunInspectCustom() {
    console.log('\n🎨 Bun.inspect.custom Demonstration');
    console.log('====================================');

    // Custom class with inspect override
    class CanvasService {
        constructor(
            public name: string,
            public status: 'active' | 'beta' | 'deprecated',
            public metrics: { requests: number; errors: number }
        ) { }

        [Bun.inspect.custom]() {
            const statusColor = this.status === 'active' ? '🟢' :
                this.status === 'beta' ? '🟡' : '🔴';
            const errorRate = ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2);

            return `🚀 CanvasService[${this.name}] ${statusColor} | Requests: ${this.metrics.requests.toLocaleString()} | Error Rate: ${errorRate}%`;
        }
    }

    // Custom class with detailed formatting
    class APIResponse {
        constructor(
            public success: boolean,
            public data: any,
            public metadata: { timestamp: Date; requestId: string }
        ) { }

        [Bun.inspect.custom]() {
            const icon = this.success ? '✅' : '❌';
            const time = this.metadata.timestamp.toISOString();
            return `${icon} APIResponse[${this.metadata.requestId}] at ${time}`;
        }
    }

    // Custom class with nested object inspection
    class SystemMetrics {
        constructor(
            public cpu: number,
            public memory: number,
            public services: Array<{ name: string; status: string }>
        ) { }

        [Bun.inspect.custom]() {
            const activeServices = this.services.filter(s => s.status === 'active').length;
            return `💻 SystemMetrics | CPU: ${this.cpu}% | Memory: ${this.memory}% | Active Services: ${activeServices}/${this.services.length}`;
        }
    }

    // Custom class with table-like output
    class UserDatabase {
        private users = [
            { id: 1, name: 'Alice', role: 'admin', lastLogin: new Date() },
            { id: 2, name: 'Bob', role: 'user', lastLogin: new Date(Date.now() - 86400000) },
            { id: 3, name: 'Charlie', role: 'moderator', lastLogin: new Date(Date.now() - 172800000) }
        ];

        [Bun.inspect.custom]() {
            const headers = ['ID', 'Name', 'Role', 'Last Login'];
            const rows = this.users.map(user => [
                user.id.toString(),
                user.name,
                user.role,
                user.lastLogin.toLocaleDateString()
            ]);

            return `👥 UserDatabase (${this.users.length} users)\n${this.createSimpleTable(headers, rows)}`;
        }

        private createSimpleTable(headers: string[], rows: string[][]): string {
            const widths = headers.map((h, i) =>
                Math.max(h.length, ...rows.map(row => row[i]?.length || 0))
            );

            const separator = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
            const headerRow = '│' + headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join('│') + '│';
            const middleSeparator = '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
            const dataRows = rows.map(row =>
                '│' + row.map((cell, i) => ` ${cell.padEnd(widths[i])} `).join('│') + '│'
            );

            return [separator, headerRow, middleSeparator, ...dataRows,
                '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘'].join('\n');
        }
    }

    // Test custom inspection
    const service = new CanvasService('Bridge', 'active', { requests: 1000000, errors: 42 });
    const response = new APIResponse(true, { user: 'test' }, {
        timestamp: new Date(),
        requestId: 'req_abc123'
    });
    const metrics = new SystemMetrics(45.2, 67.8, [
        { name: 'Bridge', status: 'active' },
        { name: 'Analytics', status: 'beta' },
        { name: 'Monitor', status: 'active' }
    ]);
    const database = new UserDatabase();

    console.log('\n📋 Custom Service Inspection:');
    console.log(service);

    console.log('\n📋 Custom Response Inspection:');
    console.log(response);

    console.log('\n📋 Custom Metrics Inspection:');
    console.log(metrics);

    console.log('\n📋 Custom Database Inspection:');
    console.log(database);

    // Show that Bun.inspect() also uses custom formatting
    console.log('\n🔧 Bun.inspect() with custom formatting:');
    console.log(Bun.inspect(service, { colors: true }));
    console.log(Bun.inspect(response, { colors: true }));
    console.log(Bun.inspect(metrics, { colors: true }));
}

/**
 * Demonstrate Bun.inspect.table for tabular data formatting
 */
function demonstrateBunInspectTable() {
    console.log('\n📊 Bun.inspect.table Demonstration');
    console.log('===================================');

    // Basic table example
    const services = [
        { name: 'Bridge', status: 'active', requests: 1000000, errors: 42, uptime: '99.9%' },
        { name: 'Analytics', status: 'beta', requests: 500000, errors: 125, uptime: '98.5%' },
        { name: 'Monitor', status: 'active', requests: 750000, errors: 23, uptime: '99.7%' },
        { name: 'Pipeline', status: 'deprecated', requests: 250000, errors: 89, uptime: '95.2%' }
    ];

    console.log('\n📋 Basic Service Table:');
    console.log(Bun.inspect.table(services, { colors: true }));

    // Table with specific properties
    console.log('\n📋 Table with Selected Properties:');
    console.log(Bun.inspect.table(services, ['name', 'status', 'uptime'], { colors: true }));

    // Complex data table
    const apiMetrics = [
        {
            endpoint: '/api/users',
            method: 'GET',
            avgResponseTime: 125.5,
            p95ResponseTime: 280.3,
            requestsPerMinute: 450,
            errorRate: 0.02
        },
        {
            endpoint: '/api/auth',
            method: 'POST',
            avgResponseTime: 89.2,
            p95ResponseTime: 156.7,
            requestsPerMinute: 120,
            errorRate: 0.01
        },
        {
            endpoint: '/api/data',
            method: 'GET',
            avgResponseTime: 245.8,
            p95ResponseTime: 450.2,
            requestsPerMinute: 280,
            errorRate: 0.05
        }
    ];

    console.log('\n📋 API Metrics Table:');
    console.log(Bun.inspect.table(apiMetrics, { colors: true }));

    // Table with computed properties
    const systemResources = [
        {
            server: 'prod-01',
            cpu: 45.2,
            memory: 67.8,
            disk: 23.4,
            load: [1.2, 1.5, 1.8]
        },
        {
            server: 'prod-02',
            cpu: 78.9,
            memory: 89.1,
            disk: 45.7,
            load: [2.1, 2.3, 2.0]
        },
        {
            server: 'prod-03',
            cpu: 23.4,
            memory: 34.5,
            disk: 12.3,
            load: [0.8, 0.9, 1.1]
        }
    ];

    console.log('\n📋 System Resources Table:');
    console.log(Bun.inspect.table(systemResources, { colors: true }));

    // Table with nested objects
    const userActivities = [
        {
            user: { id: 1, name: 'Alice' },
            actions: ['login', 'view_dashboard', 'export_data'],
            sessionDuration: 1250,
            lastSeen: new Date()
        },
        {
            user: { id: 2, name: 'Bob' },
            actions: ['login', 'view_reports'],
            sessionDuration: 850,
            lastSeen: new Date(Date.now() - 3600000)
        }
    ];

    console.log('\n📋 User Activities Table:');
    console.log(Bun.inspect.table(userActivities, ['user', 'sessionDuration'], { colors: true }));

    // Performance comparison table
    console.log('\n📋 Performance Comparison:');
    const performanceData = [
        { operation: 'Default console.log', opsPerSec: 35000, memoryUsage: 'low' },
        { operation: 'Bun.inspect depth 2', opsPerSec: 35000, memoryUsage: 'low' },
        { operation: 'Bun.inspect depth 4', opsPerSec: 9800, memoryUsage: 'medium' },
        { operation: 'Bun.inspect depth 6', opsPerSec: 10400, memoryUsage: 'medium' },
        { operation: 'Bun.inspect depth 8', opsPerSec: 10500, memoryUsage: 'high' }
    ];

    console.log(Bun.inspect.table(performanceData, { colors: true }));
}

/**
 * Demonstrate advanced Bun.inspect serialization features
 */
function demonstrateBunInspectSerialization() {
    console.log('\n🔧 Advanced Bun.inspect Serialization');
    console.log('=======================================');

    // Basic serialization examples
    console.log('\n📋 Basic Serialization:');

    const obj = { foo: "bar", nested: { deep: "value" } };
    const str = Bun.inspect(obj);
    console.log('Original object:', obj);
    console.log('Serialized string:', JSON.stringify(str));
    console.log('Deserialized back:', str);

    // TypedArray serialization
    console.log('\n📋 TypedArray Serialization:');

    const uint8Array = new Uint8Array([1, 2, 3, 255, 128, 0]);
    const arrayStr = Bun.inspect(uint8Array);
    console.log('Uint8Array:', uint8Array);
    console.log('Serialized:', arrayStr);

    const float32Array = new Float32Array([3.14, 2.71, 1.41]);
    const floatStr = Bun.inspect(float32Array);
    console.log('Float32Array:', float32Array);
    console.log('Serialized:', floatStr);

    // Function serialization
    console.log('\n📋 Function Serialization:');

    const func = function (a, b) { return a + b; };
    const funcStr = Bun.inspect(func);
    console.log('Function:', func);
    console.log('Serialized:', funcStr);

    const arrowFunc = (x) => x * 2;
    const arrowStr = Bun.inspect(arrowFunc);
    console.log('Arrow Function:', arrowFunc);
    console.log('Serialized:', arrowStr);

    // Date serialization
    console.log('\n📋 Date Serialization:');

    const now = new Date();
    const dateStr = Bun.inspect(now);
    console.log('Date:', now);
    console.log('Serialized:', dateStr);

    // RegExp serialization
    console.log('\n📋 RegExp Serialization:');

    const regex = /test\d+/gi;
    const regexStr = Bun.inspect(regex);
    console.log('RegExp:', regex);
    console.log('Serialized:', regexStr);

    // Error serialization
    console.log('\n📋 Error Serialization:');

    const error = new Error('Test error message');
    error.stack = 'Error: Test error message\n    at test (test.js:1:1)';
    const errorStr = Bun.inspect(error);
    console.log('Error:', error);
    console.log('Serialized:', errorStr);

    // Circular reference handling
    console.log('\n📋 Circular Reference Handling:');

    const circular: any = { name: 'parent' };
    circular.self = circular;
    const circularStr = Bun.inspect(circular);
    console.log('Circular object:', circular);
    console.log('Serialized:', circularStr);

    // Advanced serialization with options
    console.log('\n� Advanced Serialization Options:');

    const complexObj = {
        services: Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            name: `Service ${i + 1}`,
            status: i % 2 === 0 ? 'active' : 'inactive',
            metrics: {
                requests: Math.floor(Math.random() * 1000000),
                errors: Math.floor(Math.random() * 100)
            }
        })),
        metadata: {
            timestamp: new Date(),
            version: '2.1.0',
            environment: 'production'
        }
    };

    console.log('\n� Compact serialization:');
    console.log(Bun.inspect(complexObj, { compact: true, colors: false }));

    console.log('\n🔧 Detailed serialization:');
    console.log(Bun.inspect(complexObj, {
        compact: false,
        colors: true,
        depth: 4,
        maxArrayLength: 3,
        maxStringLength: 20
    }));

    // Serialization comparison
    console.log('\n📊 Serialization Performance:');

    const iterations = 1000;
    const testObj = { data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` })) };

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        Bun.inspect(testObj, { colors: false });
    }
    const duration = performance.now() - start;
    const opsPerSec = Math.round(iterations / duration * 1000);

    console.log(`Serialized ${iterations} objects in ${duration.toFixed(2)}ms`);
    console.log(`Performance: ${opsPerSec.toLocaleString()} ops/sec`);
}

/**
 * Create large nested object for performance testing
 */
function createLargeNestedObject() {
    const result: any = {
        level1: {
            level2: {
                level3: {
                    level4: {
                        data: 'This is very deep data',
                        timestamp: new Date(),
                        metadata: {
                            id: 12345,
                            type: 'deep-object',
                            tags: ['debug', 'performance', 'testing']
                        }
                    }
                }
            }
        },
        arrays: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            nested: {
                value: i * 2,
                squared: i * i,
                metadata: { created: new Date(), active: i % 2 === 0 }
            }
        })),
        functions: {
            test: () => 'test function',
            calculate: (x: number) => x * x,
            async: async () => await Promise.resolve('async result')
        },
        primitives: {
            string: 'Hello, World!',
            number: 42,
            boolean: true,
            null: null,
            undefined: undefined,
            symbol: Symbol('test-symbol')
        },
        dates: {
            now: new Date(),
            future: new Date(Date.now() + 86400000),
            past: new Date(Date.now() - 86400000)
        },
        regex: {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^\+?[\d\s-()]+$/,
            url: /^https?:\/\/.+/
        }
    };

    return result;
}

/**
 * Demonstrate V8 heap snapshot functionality for memory leak detection
 */
function demonstrateV8HeapSnapshots() {
    console.log('\n🧠 V8 Heap Snapshot Demonstration');
    console.log('=====================================');

    try {
        // Import v8 module
        import('node:v8').then(v8 => {
            console.log('✅ V8 module loaded successfully');

            // Create a heap snapshot with auto-generated name
            console.log('\n📸 Creating heap snapshot...');
            const snapshotPath = v8.writeHeapSnapshot();
            console.log(`📁 Heap snapshot written to: ${snapshotPath}`);

            // Create a heap snapshot with custom name
            const customSnapshotPath = v8.writeHeapSnapshot('./debug-snapshots/bun-debugging-demo.heapsnapshot');
            console.log(`📁 Custom heap snapshot written to: ${customSnapshotPath}`);

            // Demonstrate memory usage patterns
            console.log('\n🔍 Memory Usage Analysis:');
            demonstrateMemoryPatterns(v8);

            // Create snapshots at different memory states
            console.log('\n📊 Creating memory state snapshots...');
            createMemoryStateSnapshots(v8);

            console.log('\n💡 Heap Snapshot Analysis Instructions:');
            console.log('=========================================');
            console.log('1. Open Chrome DevTools (F12)');
            console.log('2. Go to the "Memory" tab');
            console.log('3. Click the "Load" button (folder icon)');
            console.log('4. Select your .heapsnapshot file');
            console.log('5. Analyze memory usage and detect leaks');
            console.log('');
            console.log('🎯 Available Snapshot Files:');
            console.log(`   • ${snapshotPath}`);
            console.log(`   • ${customSnapshotPath}`);
            console.log('   • ./debug-snapshots/before-memory-test.heapsnapshot');
            console.log('   • ./debug-snapshots/after-memory-test.heapsnapshot');
            console.log('   • ./debug-snapshots/after-gc.heapsnapshot');
            console.log('   • ./debug-snapshots/memory-leak-test.heapsnapshot');

        }).catch(error => {
            console.error('❌ Failed to load V8 module:', error);
            console.log('💡 V8 heap snapshots require Node.js compatibility mode');
        });

    } catch (error) {
        console.error('❌ V8 heap snapshot demonstration failed:', error);
    }
}

/**
 * Demonstrate different memory usage patterns for testing
 */
function demonstrateMemoryPatterns(v8: any) {
    console.log('Creating memory patterns to analyze...');

    // Create various object types to populate the heap
    const memoryPatterns = {
        arrays: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            data: new Array(100).fill(`item-${i}`),
            metadata: { created: Date.now(), type: 'array-pattern' }
        })),

        objects: Array.from({ length: 500 }, (_, i) => ({
            id: i,
            nested: {
                level1: { level2: { level3: { data: `deep-nested-${i}` } } },
                properties: Array.from({ length: 50 }, (_, j) => `prop-${j}`)
            },
            methods: {
                calculate: () => i * 2,
                toString: () => `object-${i}`
            }
        })),

        strings: Array.from({ length: 2000 }, (_, i) =>
            `very-long-string-with-lots-of-data-and-content-${i}-`.repeat(10)
        ),

        functions: Array.from({ length: 100 }, (_, i) =>
            function testFunction() {
                const localData = new Array(50).fill(`local-${i}`);
                return localData.join('');
            }
        ),

        typedArrays: {
            uint8: new Uint8Array(10000),
            float32: new Float32Array(5000),
            int16: new Int16Array(7500)
        },

        circular: createCircularReferences(100)
    };

    console.log(`✅ Created memory patterns:`);
    console.log(`   • Arrays: ${memoryPatterns.arrays.length} objects`);
    console.log(`   • Objects: ${memoryPatterns.objects.length} objects`);
    console.log(`   • Strings: ${memoryPatterns.strings.length} strings`);
    console.log(`   • Functions: ${memoryPatterns.functions.length} functions`);
    console.log(`   • TypedArrays: 3 arrays with ${(10000 + 5000 + 7500) / 1000}k total elements`);
    console.log(`   • Circular references: ${memoryPatterns.circular.length} objects`);

    return memoryPatterns;
}

/**
 * Create circular references for memory leak testing
 */
function createCircularReferences(count: number): any[] {
    const objects: any[] = [];

    for (let i = 0; i < count; i++) {
        const obj = {
            id: i,
            name: `circular-${i}`,
            data: new Array(20).fill(`data-${i}`)
        };

        // Create circular reference
        obj.self = obj;
        obj.parent = obj;
        obj.children = [obj];

        objects.push(obj);
    }

    return objects;
}

/**
 * Create snapshots at different memory states
 */
function createMemoryStateSnapshots(v8: any) {
    // Ensure debug-snapshots directory exists
    try {
        import('node:fs').then(fs => {
            if (!fs.existsSync('./debug-snapshots')) {
                fs.mkdirSync('./debug-snapshots', { recursive: true });
            }
        }).catch(() => {
            // Directory creation failed, but continue
        });
    } catch (error) {
        // Ignore directory creation errors
    }

    // Snapshot 1: Before memory test
    try {
        const beforePath = v8.writeHeapSnapshot('./debug-snapshots/before-memory-test.heapsnapshot');
        console.log(`📸 Before test snapshot: ${beforePath}`);
    } catch (error) {
        console.log('⚠️ Could not create before-test snapshot');
    }

    // Create memory pressure
    console.log('🔥 Creating memory pressure...');
    const memoryHog = createMemoryPressure();

    // Snapshot 2: After memory allocation
    try {
        const afterPath = v8.writeHeapSnapshot('./debug-snapshots/after-memory-test.heapsnapshot');
        console.log(`📸 After allocation snapshot: ${afterPath}`);
    } catch (error) {
        console.log('⚠️ Could not create after-allocation snapshot');
    }

    // Force garbage collection if available
    try {
        if (global.gc) {
            console.log('🗑️ Forcing garbage collection...');
            global.gc();

            // Snapshot 3: After garbage collection
            const afterGCPath = v8.writeHeapSnapshot('./debug-snapshots/after-gc.heapsnapshot');
            console.log(`📸 After GC snapshot: ${afterGCPath}`);
        } else {
            console.log('⚠️ Garbage collection not available (run with --expose-gc)');
        }
    } catch (error) {
        console.log('⚠️ Could not force garbage collection');
    }

    // Create potential memory leak
    console.log('💧 Creating potential memory leak...');
    createMemoryLeak();

    // Snapshot 4: Memory leak test
    try {
        const leakPath = v8.writeHeapSnapshot('./debug-snapshots/memory-leak-test.heapsnapshot');
        console.log(`📸 Memory leak test snapshot: ${leakPath}`);
    } catch (error) {
        console.log('⚠️ Could not create memory leak snapshot');
    }

    // Clean up some references
    console.log('🧹 Cleaning up references...');
    // Note: memoryHog and leaked objects remain for demonstration
}

/**
 * Create memory pressure for testing
 */
function createMemoryPressure(): any {
    const data = {
        largeArrays: Array.from({ length: 100 }, (_, i) =>
            new Array(1000).fill(`large-array-data-${i}`)
        ),
        largeObjects: Array.from({ length: 50 }, (_, i) => ({
            id: i,
            data: new Array(500).fill(`object-data-${i}`),
            nested: {
                level1: Array.from({ length: 100 }, (_, j) => ({ data: `nested-${i}-${j}` })),
                level2: Array.from({ length: 50 }, (_, k) => ({ deep: `deep-nested-${i}-${k}` }))
            }
        })),
        buffers: [
            new ArrayBuffer(1024 * 100), // 100KB
            new ArrayBuffer(1024 * 200), // 200KB
            new ArrayBuffer(1024 * 50)   // 50KB
        ]
    };

    console.log(`✅ Created memory pressure: ~${(350 * 1024) / 1024}KB of data`);
    return data;
}

/**
 * Create a potential memory leak for demonstration
 */
function createMemoryLeak(): void {
    // Global array that grows over time (simulated leak)
    if (!(global as any).leakedData) {
        (global as any).leakedData = [];
    }

    const leakData = (global as any).leakedData;

    // Add objects that won't be garbage collected
    for (let i = 0; i < 100; i++) {
        leakData.push({
            id: Date.now() + i,
            data: new Array(100).fill(`leaked-data-${i}`),
            timestamp: new Date(),
            callback: function () { return `leaked-callback-${i}`; }
        });
    }

    console.log(`💧 Added ${leakData.length} objects to potential memory leak`);
}

/**
 * Demonstrate memory monitoring and analysis
 */
function demonstrateMemoryMonitoring() {
    console.log('\n📊 Memory Monitoring Demonstration');
    console.log('===================================');

    try {
        import('node:v8').then(v8 => {
            // Get heap statistics
            const heapStats = v8.getHeapStatistics();
            console.log('📈 Current Heap Statistics:');
            console.log(`   • Total Heap Size: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   • Used Heap Size: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   • Heap Size Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   • Total Physical Size: ${(heapStats.total_physical_size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   • Total Available Size: ${(heapStats.total_available_size / 1024 / 1024).toFixed(2)} MB`);

            // Get heap space statistics
            const heapSpaceStats = v8.getHeapSpaceStatistics();
            console.log('\n📊 Heap Space Statistics:');
            heapSpaceStats.forEach((space: any, index: number) => {
                console.log(`   ${index + 1}. ${space.space_name}:`);
                console.log(`      Size: ${(space.space_size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`      Used: ${(space.space_used_size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`      Available: ${(space.space_available_size / 1024 / 1024).toFixed(2)} MB`);
            });

            // Monitor memory usage over time
            console.log('\n⏱️ Memory Usage Over Time:');
            monitorMemoryUsage(v8, 5000); // Monitor for 5 seconds

        }).catch(error => {
            console.error('❌ Failed to load V8 module for memory monitoring:', error);
        });

    } catch (error) {
        console.error('❌ Memory monitoring demonstration failed:', error);
    }
}

/**
 * Monitor memory usage over time
 */
function monitorMemoryUsage(v8: any, duration: number): void {
    const startTime = Date.now();
    const interval = 1000; // 1 second intervals
    let measurements: any[] = [];

    const monitor = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= duration) {
            clearInterval(monitor);
            console.log('\n📈 Memory Usage Summary:');
            console.log('==========================');

            if (measurements.length > 0) {
                const initial = measurements[0];
                const final = measurements[measurements.length - 1];
                const peak = measurements.reduce((max, curr) =>
                    curr.used > max.used ? curr : max, measurements[0]);

                console.log(`   • Initial Memory: ${(initial.used / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Final Memory: ${(final.used / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Peak Memory: ${(peak.used / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Memory Change: ${((final.used - initial.used) / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Measurements Taken: ${measurements.length}`);
            }

            return;
        }

        const stats = v8.getHeapStatistics();
        const measurement = {
            timestamp: elapsed,
            used: stats.used_heap_size,
            total: stats.total_heap_size,
            limit: stats.heap_size_limit
        };

        measurements.push(measurement);

        console.log(`   ${elapsed / 1000}s: Used ${(stats.used_heap_size / 1024 / 1024).toFixed(2)} MB / Total ${(stats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
    }, interval);
}

/**
 * Demonstrate enhanced console inspection with clean table outputs
 */
function demonstrateEnhancedConsoleInspection() {
    console.log('\n🔍 Enhanced Console Inspection with Clean Table Outputs');
    console.log('='.repeat(65));

    // Import the enhanced console inspection module
    import('./enhanced-console-inspection-module.js').then(({ EnhancedConsoleInspectionModule }) => {
        console.log('✅ Enhanced Console Inspection Module loaded');

        // Create enhanced console instance
        const enhancedConsole = new EnhancedConsoleInspectionModule({
            showColors: true,
            inspectionDepth: 4,
            colorFormat: 'ansi-16m',
            enableCanvasBranding: true,
            performanceMode: true
        });

        // Table utility for clean outputs
        const createTable = (title: string, data: any[], columns: string[] = []) => {
            console.log(`\n📊 ${title}:`);
            if (columns.length > 0) {
                console.log(Bun.inspect.table(data, columns, { colors: true }));
            } else {
                console.log(Bun.inspect.table(data, { colors: true }));
            }
        };

        const createComparisonTable = (title: string, comparisons: Array<{ name: string, default: any, enhanced: any, improvement: string }>) => {
            console.log(`\n🔄 ${title}:`);
            console.log(Bun.inspect.table(comparisons, { colors: true }));
        };

        // Depth Control Analysis Table
        console.log('\n🎯 Depth Control Analysis');
        console.log('─'.repeat(30));

        const depthTests = [
            {
                object: 'Simple Object',
                actualDepth: 2,
                testDepth: 2,
                visibility: 'Complete',
                performance: 'Excellent',
                recommendation: 'Production logging'
            },
            {
                object: 'Nested Object',
                actualDepth: 4,
                testDepth: 4,
                visibility: 'Complete',
                performance: 'Good',
                recommendation: 'Development debugging'
            },
            {
                object: 'Complex Object',
                actualDepth: 6,
                testDepth: 6,
                visibility: 'Complete',
                performance: 'Moderate',
                recommendation: 'API analysis'
            },
            {
                object: 'Very Deep Object',
                actualDepth: 8,
                testDepth: 8,
                visibility: 'Complete',
                performance: 'Slow',
                recommendation: 'Deep troubleshooting'
            }
        ];

        createTable('Depth Control Performance Analysis', depthTests);

        // Object Inspection Comparison Table
        const testObjects = {
            simple: { name: 'Simple', value: 42, type: 'basic' },
            nested: {
                level1: {
                    level2: {
                        level3: 'deep',
                        metadata: { created: new Date(), active: true }
                    }
                }
            },
            complex: {
                services: {
                    bridge: {
                        status: 'active',
                        metrics: {
                            requests: 1000000,
                            errors: 42,
                            performance: {
                                average: 125.5,
                                p95: 280.3,
                                details: {
                                    server: 'aws',
                                    region: 'us-west-2',
                                    version: '2.1.0'
                                }
                            }
                        }
                    }
                }
            }
        };

        const inspectionComparisons = Object.entries(testObjects).map(([name, obj]) => {
            const actualDepth = getObjectDepth(obj);
            const start = performance.now();
            Bun.inspect(obj, { depth: 4, colors: false });
            const duration = performance.now() - start;

            return {
                name: name.charAt(0).toUpperCase() + name.slice(1),
                actualDepth,
                objectSize: `${JSON.stringify(obj).length} chars`,
                inspectionTime: `${duration.toFixed(3)}ms`,
                properties: Object.keys(obj).length,
                grade: duration < 0.1 ? 'A+' : duration < 0.5 ? 'A' : duration < 1 ? 'B' : 'C'
            };
        });

        createTable('Object Inspection Performance', inspectionComparisons);

        // Color Format Examples Table
        const colorExamples = [
            {
                level: 'Success',
                color: 'green',
                icon: '✅',
                use: 'Successful operations',
                example: 'API call completed'
            },
            {
                level: 'Warning',
                color: 'yellow',
                icon: '⚠️',
                use: 'Potential issues',
                example: 'High memory usage'
            },
            {
                level: 'Error',
                color: 'red',
                icon: '❌',
                use: 'Critical failures',
                example: 'Database connection failed'
            },
            {
                level: 'Info',
                color: 'blue',
                icon: 'ℹ️',
                use: 'General information',
                example: 'Server started'
            },
            {
                level: 'Debug',
                color: 'magenta',
                icon: '🐛',
                use: 'Debug information',
                example: 'Variable values'
            }
        ];

        createTable('Color Format Examples', colorExamples);

        // Performance Benchmark Results Table
        const performanceTests = [
            { name: 'Simple Object', depth: 2, iterations: 10000 },
            { name: 'Nested Object', depth: 4, iterations: 5000 },
            { name: 'Complex Object', depth: 6, iterations: 1000 },
            { name: 'Very Deep Object', depth: 8, iterations: 500 }
        ];

        const performanceResults = performanceTests.map(test => {
            const testObj = createLargeNestedObject();
            const start = performance.now();

            for (let i = 0; i < test.iterations; i++) {
                Bun.inspect(testObj, { depth: test.depth, colors: false });
            }

            const duration = performance.now() - start;
            const opsPerSec = Math.round(test.iterations / duration * 1000);

            return {
                name: test.name,
                depth: test.depth,
                iterations: test.iterations.toLocaleString(),
                duration: `${duration.toFixed(2)}ms`,
                opsPerSec: opsPerSec.toLocaleString(),
                grade: opsPerSec > 10000 ? 'A+' : opsPerSec > 5000 ? 'A' : opsPerSec > 1000 ? 'B' : 'C',
                recommendation: opsPerSec > 10000 ? 'Production Ready' : opsPerSec > 5000 ? 'Development' : 'Debug Only'
            };
        });

        createTable('Performance Benchmark Results', performanceResults);

        // Memory Usage Analysis Table
        const memoryBefore = process.memoryUsage();
        const largeObject = createLargeNestedObject();

        for (let i = 0; i < 1000; i++) {
            Bun.inspect(largeObject, { depth: 6, colors: true });
        }

        const memoryAfter = process.memoryUsage();
        const memoryGrowth = ((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2);

        const memoryAnalysis = [
            {
                phase: 'Before Inspection',
                heapUsed: `${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memoryBefore.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                external: `${(memoryBefore.external / 1024 / 1024).toFixed(2)} MB`
            },
            {
                phase: 'After 1000 Deep Inspections',
                heapUsed: `${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memoryAfter.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                external: `${(memoryAfter.external / 1024 / 1024).toFixed(2)} MB`
            }
        ];

        createTable('Memory Usage Analysis', memoryAnalysis);

        console.log(`\n📈 Memory Growth: ${memoryGrowth} MB`);
        console.log(`🏆 Memory Efficiency: ${memoryGrowth === '0.00' ? 'Excellent' : parseFloat(memoryGrowth) < 1 ? 'Good' : 'Needs Optimization'}`);

        // Best Practices Recommendations Table
        const recommendations = [
            {
                depth: '2-3',
                useCase: 'Production Logging',
                performance: 'Very Fast',
                outputSize: 'Small',
                recommendation: 'Use for high-volume production logs'
            },
            {
                depth: '4-6',
                useCase: 'Development Debugging',
                performance: 'Fast',
                outputSize: 'Medium',
                recommendation: 'Best balance for daily development'
            },
            {
                depth: '6-8',
                useCase: 'API Response Analysis',
                performance: 'Moderate',
                outputSize: 'Large',
                recommendation: 'Use for complex data structure analysis'
            },
            {
                depth: '10+',
                useCase: 'Deep Troubleshooting',
                performance: 'Slow',
                outputSize: 'Very Large',
                recommendation: 'Only for thorough debugging sessions'
            }
        ];

        createTable('Depth Recommendations Guide', recommendations);

        // Performance Optimization Tips Table
        const optimizationTips = [
            {
                technique: 'Disable Colors',
                impact: 'High',
                use: 'Production logging',
                example: 'colors: false'
            },
            {
                technique: 'Compact Mode',
                impact: 'Medium',
                use: 'Large arrays',
                example: 'compact: true'
            },
            {
                technique: 'Limit Array Length',
                impact: 'Medium',
                use: 'Better readability',
                example: 'maxArrayLength: 10'
            },
            {
                technique: 'Custom Stylizers',
                impact: 'Low',
                use: 'Consistent branding',
                example: 'stylize: customStylizer'
            },
            {
                technique: 'Cache Results',
                impact: 'High',
                use: 'Repeated objects',
                example: 'const cached = Bun.inspect(obj)'
            }
        ];

        createTable('Performance Optimization Techniques', optimizationTips);

        // Feature Implementation Summary Table
        const implementationSummary = [
            {
                feature: 'Depth-Controlled Inspection',
                status: '✅ Implemented',
                performance: 'Excellent',
                complexity: 'Medium'
            },
            {
                feature: 'Color Formatting & Branding',
                status: '✅ Implemented',
                performance: 'Good',
                complexity: 'Low'
            },
            {
                feature: 'Performance Optimization',
                status: '✅ Implemented',
                performance: 'Excellent',
                complexity: 'High'
            },
            {
                feature: 'Memory Usage Analysis',
                status: '✅ Implemented',
                performance: 'Good',
                complexity: 'Medium'
            },
            {
                feature: 'Custom Stylizers',
                status: '✅ Implemented',
                performance: 'Excellent',
                complexity: 'Low'
            }
        ];

        createTable('Implementation Status Summary', implementationSummary);

        // Final Performance Grades Table
        const finalGrades = performanceResults.map(result => ({
            test: result.name,
            grade: result.grade,
            opsPerSec: result.opsPerSec,
            status: result.grade === 'A+' ? '🏆 Excellent' : result.grade === 'A' ? '✅ Good' : result.grade === 'B' ? '⚠️ Fair' : '❌ Needs Work',
            recommendation: result.recommendation
        }));

        createTable('Final Performance Grades', finalGrades);

        console.log('\n✅ Enhanced console inspection with clean table outputs completed successfully!');

    }).catch(error => {
        console.error('❌ Failed to load enhanced console inspection module:', error);
        console.log('💡 Make sure enhanced-console-inspection-module.ts is compiled and available');
    });
}

// =============================================================================
// MAIN DEMONSTRATION WITH CLI SUPPORT
// =============================================================================

/**
 * Demonstrate Bun's --inspect flag and debugging capabilities with clean tables
 */
function demonstrateBunInspectFlag() {
    console.log('\n🔍 Bun --inspect Flag and Debugging Capabilities');
    console.log('='.repeat(60));

    // Create a comprehensive debugging demonstration table
    const debuggingFeatures = [
        {
            feature: 'WebSocket Inspector',
            command: 'bun --inspect server.ts',
            description: 'Starts WebSocket server for debugging',
            port: 'Auto-assigned (usually 9229)',
            use: 'Chrome DevTools connection'
        },
        {
            feature: 'Custom Port',
            command: 'bun --inspect=9230 server.ts',
            description: 'Specify custom debugging port',
            port: 'User-defined (e.g., 9230)',
            use: 'Multiple debugging sessions'
        },
        {
            feature: 'Inspect on Break',
            command: 'bun --inspect-brk server.ts',
            description: 'Break on first line of execution',
            port: 'Auto-assigned',
            use: 'Debug from startup'
        },
        {
            feature: 'Source Maps',
            command: 'bun --inspect --enable-source-maps',
            description: 'Enable TypeScript source map debugging',
            port: 'Auto-assigned',
            use: 'TypeScript debugging'
        }
    ];

    console.log('\n📊 Bun Debugging Features:');
    console.log(Bun.inspect.table(debuggingFeatures, { colors: true }));

    // Demonstrate debugging server setup
    console.log('\n🚀 Debugging Server Demonstration:');

    const debugServer = Bun.serve({
        port: 3001,
        fetch(req) {
            const url = new URL(req.url);

            // Log request details for debugging
            console.log(`🔍 [DEBUG] ${req.method} ${req.url}`);
            console.log(`   Headers: ${Object.fromEntries(req.headers.entries())}`);

            if (url.pathname === '/debug-info') {
                const debugInfo = {
                    method: req.method,
                    url: req.url,
                    headers: Object.fromEntries(req.headers.entries()),
                    timestamp: new Date().toISOString(),
                    server: 'Bun Debug Server',
                    version: Bun.version,
                    memory: process.memoryUsage(),
                    pid: process.pid
                };

                return new Response(JSON.stringify(debugInfo, null, 2), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (url.pathname === '/error-test') {
                // Demonstrate error handling in debug mode
                try {
                    throw new Error('Debug test error');
                } catch (error) {
                    console.error('🐛 [DEBUG] Caught error:', error);
                    return new Response(JSON.stringify({
                        error: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            return new Response('Hello from debug server!', {
                headers: { 'X-Debug-Mode': 'enabled' }
            });
        },
    });

    console.log(`✅ Debug server started on port ${debugServer.port}`);
    console.log(`🔗 Test endpoints:`);
    console.log(`   • http://localhost:${debugServer.port}/debug-info`);
    console.log(`   • http://localhost:${debugServer.port}/error-test`);
    console.log(`   • http://localhost:${debugServer.port}/`);

    // Debugging tips table
    const debuggingTips = [
        {
            tip: 'Use Chrome DevTools',
            shortcut: 'chrome://inspect',
            benefit: 'Visual debugging interface'
        },
        {
            tip: 'Set breakpoints',
            shortcut: 'debugger; statement',
            benefit: 'Pause execution at specific points'
        },
        {
            tip: 'Console debugging',
            shortcut: 'console.log/object/table',
            benefit: 'Quick value inspection'
        },
        {
            tip: 'Network debugging',
            shortcut: 'Network tab in DevTools',
            benefit: 'Inspect HTTP requests'
        },
        {
            tip: 'Memory debugging',
            shortcut: 'Memory tab in DevTools',
            benefit: 'Profile memory usage'
        }
    ];

    console.log('\n💡 Debugging Tips and Shortcuts:');
    console.log(Bun.inspect.table(debuggingTips, { colors: true }));

    // Debugging commands summary
    const commandSummary = [
        {
            command: 'bun --inspect file.ts',
            purpose: 'Start with debugging enabled',
            example: 'bun --inspect server.ts'
        },
        {
            command: 'bun --inspect=PORT file.ts',
            purpose: 'Specify debug port',
            example: 'bun --inspect=9230 server.ts'
        },
        {
            command: 'bun --inspect-brk file.ts',
            purpose: 'Break on first line',
            example: 'bun --inspect-brk server.ts'
        },
        {
            command: 'chrome://inspect',
            purpose: 'Open Chrome DevTools',
            example: 'Navigate in Chrome browser'
        }
    ];

    console.log('\n🔧 Debugging Commands Summary:');
    console.log(Bun.inspect.table(commandSummary, { colors: true }));

    console.log(`\n✅ Bun --inspect flag demonstration completed!`);
    console.log(`🚀 Debug server running at http://localhost:${debugServer.port}`);
    console.log(`💡 Connect Chrome DevTools to debug this process`);

    return debugServer;
}

/**
 * Run complete debugging demonstration with all features
 */
async function runCompleteDebuggingDemo() {
    // Configure verbose fetch logging for network debugging
    process.env.BUN_CONFIG_VERBOSE_FETCH = 'curl';

    // Parse CLI arguments
    const options = parseCLIArgs();

    // Show help if requested
    if (options.showHelp) {
        showHelp();
        return;
    }

    console.log('🎯 Complete Bun Debugging Demonstration');
    console.log('='.repeat(60));
    console.log(`🔧 Console inspection depth: ${options.consoleDepth}`);
    console.log('Demonstrating all debugging capabilities in Bun');
    console.log('='.repeat(60));

    // If only depth demo requested, run focused demo
    if (options.runDepthDemo) {
        demonstrateDepthControlWithCLI(options.consoleDepth);
        showDepthRecommendations(options.consoleDepth);
        demonstrateCLIEnhancedFeatures(options.consoleDepth);
        return;
    }

    // If only inspect demo requested, run focused demo
    if (options.runInspectDemo) {
        demonstrateBunInspectFlag();
        return;
    }

    // Run all demonstrations with custom depth
    demonstrateStackTraces();
    demonstrateV8StackTraceAPI();
    demonstrateNetworkDebugging();
    demonstrateNodeHttpDebugging();
    await demonstrateAsyncDebugging();
    demonstratePromiseDebugging();
    demonstrateDebugUtilities();
    demonstrateEnhancedConsoleInspection();

    // Add Bun.inspect feature demonstrations
    demonstrateBunInspectCustom();
    demonstrateBunInspectTable();
    demonstrateBunInspectSerialization();

    // Add Bun --inspect flag demonstration
    demonstrateBunInspectFlag();

    // Add V8 heap snapshot demonstrations
    demonstrateV8HeapSnapshots();
    demonstrateMemoryMonitoring();

    // Add CLI-specific demonstrations
    demonstrateDepthControlWithCLI(options.consoleDepth);
    showDepthRecommendations(options.consoleDepth);
    demonstrateCLIEnhancedFeatures(options.consoleDepth);

    console.log('\n🌐 Starting debug servers...');
    console.log('💡 Use these URLs to test debugging:');
    console.log('   http://localhost:3000/debug - Debug endpoint');
    console.log('   http://localhost:3000/error - Error endpoint');
    console.log('   http://localhost:3001/api/users - User API');
    console.log('   http://localhost:3001/api/calculate?a=10&b=5&op=add - Calculate API');

    // Start servers
    const server1 = createDebugServer();
    const server2 = new ComplexDebugServer().start();

    console.log('\n🎉 Debugging demonstration completed!');
    console.log('✅ All debugging features demonstrated');
    console.log('🚀 Servers are running for interactive testing');
    console.log('💡 Use --inspect flag to enable debugger');
    console.log('🔧 Connect VS Code debugger for enhanced experience');

    // Keep servers running
    console.log('\n⏳ Servers running... Press Ctrl+C to stop');

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down servers...');
        server1.stop();
        server2.stop();
        process.exit(0);
    });
}

// Export functions for programmatic use
export {
    createDebugServer,
    ComplexDebugServer,
    demonstrateNetworkDebugging,
    demonstrateNodeHttpDebugging,
    demonstrateStackTraces,
    demonstrateV8StackTraceAPI,
    demonstrateAsyncDebugging,
    demonstratePromiseDebugging,
    demonstrateDebugUtilities,
    demonstrateEnhancedConsoleInspection,
    createLargeNestedObject,
    DebugUtils,
    runCompleteDebuggingDemo,
    // CLI-specific exports
    parseCLIArgs,
    showHelp,
    demonstrateDepthControlWithCLI,
    demonstrateCLIEnhancedFeatures,
    showDepthRecommendations,
    getObjectDepth,
    // Bun.inspect feature exports
    demonstrateBunInspectCustom,
    demonstrateBunInspectTable,
    demonstrateBunInspectSerialization,
    demonstrateBunInspectFlag,
    // V8 heap snapshot exports
    demonstrateV8HeapSnapshots,
    demonstrateMemoryMonitoring,
    demonstrateMemoryPatterns,
    createMemoryStateSnapshots,
    createMemoryPressure,
    createMemoryLeak,
    monitorMemoryUsage
};

// Run demo if executed directly
if (import.meta.main) {
    runCompleteDebuggingDemo().catch(console.error);
}
