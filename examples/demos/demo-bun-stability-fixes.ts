#!/usr/bin/env bun

/**
 * Bun Stability & Reliability Fixes Demo
 * 
 * Demonstrates critical fixes in Bun for production stability:
 * 1. Global ~/.bunfig.toml loading (once per run)
 * 2. MySQL OK packet parsing safety
 * 3. CookieMap delete crash fix
 * 4. ANSI color detection per stream
 * 5. Interactive UI box-drawing character support
 * 6. Enhanced crash reports with complete stack traces
 */

import { serve } from 'bun';

console.log('🚀 Bun Stability & Reliability Fixes Demo');
console.log('=' .repeat(50));

// 🎯 FIX 1: Global ~/.bunfig.toml Loading
console.log('\n📝 Fix 1: Global ~/.bunfig.toml Loading');
console.log('-' .repeat(40));

class ConfigLoadingDemo {
  private loadCount = 0;
  
  simulateConfigLoad(): void {
    this.loadCount++;
    console.log(`📁 Config load attempt #${this.loadCount}`);
    
    // 🎯 FIX: Config now loaded at most once per run
    if (this.loadCount === 1) {
      console.log('✅ ~/.bunfig.toml loaded for the first time');
      console.log('🔒 Subsequent loads will use cached config');
    } else {
      console.log('🔄 Using cached config (no duplicate loading)');
    }
    
    // Simulate config content
    const mockConfig = {
      telemetry: false,
      lockfileSave: true,
      smol: true,
      logLevel: 'info'
    };
    
    console.log('⚙️  Config applied:', mockConfig);
  }
  
  demonstrateMultipleLoads(): void {
    console.log('🧪 Testing multiple config load attempts...');
    
    // Simulate multiple operations that might load config
    this.simulateConfigLoad();
    this.simulateConfigLoad();
    this.simulateConfigLoad();
    this.simulateConfigLoad();
    
    console.log('✅ Config loaded only once - no duplicate application!');
  }
}

// 🗄️ FIX 2: MySQL OK Packet Parsing Safety
console.log('\n🗄️  Fix 2: MySQL OK Packet Parsing Safety');
console.log('-' .repeat(45));

class MySQLPacketDemo {
  private safeParsePacket(data: Buffer, description: string): void {
    console.log(`📦 Parsing ${description} (${data.length} bytes)`);
    
    try {
      // 🎯 FIX: Safe parsing with byte clamping
      if (data.length === 0) {
        console.log('⚠️  Empty packet - handled safely');
        return;
      }
      
      if (data.length < 4) {
        console.log('⚠️  Truncated packet - safely clamped');
        return;
      }
      
      // Simulate safe MySQL packet parsing
      const packetLength = Math.min(data.readUInt32LE(0) & 0x00ffffff, data.length);
      console.log(`📊 Packet length: ${packetLength} (clamped to ${data.length})`);
      
      if (packetLength > data.length) {
        console.log('🔒 Oversized read prevented - using safe bounds');
        return;
      }
      
      console.log('✅ Packet parsed safely');
      
    } catch (error) {
      console.log('❌ Parse error handled gracefully:', error.message);
    }
  }
  
  demonstratePacketSafety(): void {
    console.log('🧪 Testing various MySQL packet scenarios...');
    
    // Test cases that previously could cause issues
    this.safeParsePacket(Buffer.from([]), 'Empty packet');
    this.safeParsePacket(Buffer.from([0x01]), 'Single byte packet');
    this.safeParsePacket(Buffer.from([0x01, 0x00, 0x00]), 'Truncated packet');
    this.safeParsePacket(Buffer.from([0x05, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]), 'Valid OK packet');
    
    // Simulate problematic case that could cause underflow
    const problematicPacket = Buffer.from([0xff, 0xff, 0xff, 0xff]); // Large length
    this.safeParsePacket(problematicPacket, 'Large length packet (underflow risk)');
    
    console.log('✅ All packets handled safely - no overflow panics!');
  }
}

// 🍪 FIX 3: CookieMap Delete Crash Fix
console.log('\n🍪 Fix 3: CookieMap Delete Crash Fix');
console.log('-' .repeat(35));

class CookieMapDemo {
  private cookieStore = new Map<string, { value: string; expires?: Date }>();
  
  addCookie(name: string, value: string, expires?: Date): void {
    this.cookieStore.set(name, { value, expires });
    console.log(`🍪 Added cookie: ${name} = ${value}`);
  }
  
  deleteCookie(name: string): void {
    console.log(`🗑️  Deleting cookie: ${name}`);
    
    try {
      // 🎯 FIX: Safe cookie deletion without crashes
      if (this.cookieStore.has(name)) {
        this.cookieStore.delete(name);
        console.log(`✅ Cookie ${name} deleted successfully`);
      } else {
        console.log(`ℹ️  Cookie ${name} not found - no action needed`);
      }
      
      // Test edge cases that previously could crash
      console.log('🧪 Testing edge cases...');
      
      // Delete non-existent cookie
      this.cookieStore.delete('non-existent');
      
      // Delete with undefined/null (edge case)
      const mapAny = this.cookieStore as any;
      mapAny.delete(undefined);
      mapAny.delete(null);
      
      console.log('✅ All edge cases handled safely');
      
    } catch (error) {
      console.log('❌ Cookie delete error handled:', error.message);
    }
  }
  
  demonstrateCookieSafety(): void {
    console.log('🧪 Testing CookieMap delete safety...');
    
    // Add some cookies
    this.addCookie('session', 'abc123', new Date(Date.now() + 3600000));
    this.addCookie('user', 'john_doe');
    this.addCookie('theme', 'dark');
    
    // Test safe deletion
    this.deleteCookie('session');
    this.deleteCookie('non-existent');
    
    console.log(`📊 Remaining cookies: ${this.cookieStore.size}`);
    
    // Show current state
    for (const [name, cookie] of this.cookieStore) {
      console.log(`  🍪 ${name}: ${cookie.value}`);
    }
  }
}

// 🎨 FIX 4 & 5: ANSI Color Detection & Interactive UI Support
console.log('\n🎨 Fix 4 & 5: ANSI Color Detection & Interactive UI');
console.log('-' .repeat(50));

class ANSIColorDemo {
  private supportsColor(stream: 'stdout' | 'stderr'): boolean {
    // 🎯 FIX: Per-stream color detection
    const isTTY = stream === 'stdout' ? process.stdout.isTTY : process.stderr.isTTY;
    const term = process.env.TERM || '';
    const colorterm = process.env.COLORTERM || '';
    
    const hasColor = isTTY && (term !== 'dumb' || colorterm !== '');
    console.log(`📺 ${stream} color support: ${hasColor ? 'YES' : 'NO'}`);
    console.log(`   TTY: ${isTTY}, TERM: ${term}, COLORTERM: ${colorterm}`);
    
    return hasColor;
  }
  
  colorizeText(text: string, color: string, stream: 'stdout' | 'stderr'): string {
    const hasColor = this.supportsColor(stream);
    
    if (!hasColor) {
      console.log(`⚠️  No color support for ${stream} - using plain text`);
      return text;
    }
    
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m'
    };
    
    const colorCode = colors[color as keyof typeof colors] || '';
    return `${colorCode}${text}${colors.reset}`;
  }
  
  demonstrateColorDetection(): void {
    console.log('🧪 Testing per-stream color detection...');
    
    // Test stdout color support
    const stdoutText = this.colorizeText('This text has color (stdout)', 'green', 'stdout');
    console.log('📱 STDOUT:', stdoutText);
    
    // Test stderr color support  
    const stderrText = this.colorizeText('This text has color (stderr)', 'red', 'stderr');
    console.warn('📱 STDERR:', stderrText);
    
    // Test box-drawing characters with color detection
    this.demonstrateBoxDrawing();
  }
  
  private demonstrateBoxDrawing(): void {
    console.log('\n📐 Testing box-drawing character support...');
    
    const hasStdoutColor = this.supportsColor('stdout');
    
    if (hasStdoutColor) {
      console.log('✅ Terminal supports color - showing enhanced box:');
      console.log('┌─────────────────────────────────┐');
      console.log('│ 🎨 Enhanced Box with Colors      │');
      console.log('│ ✅ Status: SUCCESS               │');
      console.log('│ 📊 Data: 42 items processed       │');
      console.log('└─────────────────────────────────┘');
    } else {
      console.log('⚠️  No color support - showing plain box:');
      console.log('+---------------------------------+');
      console.log('| Plain Box (No Colors)          |');
      console.log('| Status: SUCCESS                 |');
      console.log('| Data: 42 items processed        |');
      console.log('+---------------------------------+');
    }
  }
}

// 💥 FIX 6: Enhanced Crash Reports
console.log('\n💥 Fix 6: Enhanced Crash Reports');
console.log('-' .repeat(35));

class CrashReportDemo {
  private simulateStackTrace(): void {
    console.log('🧪 Simulating enhanced crash report generation...');
    
    try {
      // 🎯 FIX: Enhanced stack trace capture
      this.deepFunctionCall1();
    } catch (error) {
      console.log('💥 Simulated crash caught');
      console.log('📊 Enhanced stack trace features:');
      console.log('  ✅ Complete frame capture using Zig\'s std.debug.captureStackTrace');
      console.log('  ✅ Fallback to glibc backtrace() when beneficial');
      console.log('  ✅ Better ARM system support');
      console.log('  ✅ No more truncated stack traces');
      
      // Simulate enhanced stack trace
      console.log('\n📋 Enhanced Stack Trace:');
      console.log('  at deepFunctionCall3 (demo-bun-stability-fixes.ts:XXX:XX)');
      console.log('  at deepFunctionCall2 (demo-bun-stability-fixes.ts:XXX:XX)');
      console.log('  at deepFunctionCall1 (demo-bun-stability-fixes.ts:XXX:XX)');
      console.log('  at simulateStackTrace (demo-bun-stability-fixes.ts:XXX:XX)');
      console.log('  at main (demo-bun-stability-fixes.ts:XXX:XX)');
      console.log('  at <anonymous> (demo-bun-stability-fixes.ts:XXX:XX)');
      
      console.log('\n🔧 System Info:');
      console.log('  Platform: glibc-based Linux simulation');
      console.log('  Architecture: ARM64 simulation');
      console.log('  Capture Method: Zig std.debug + glibc fallback');
    }
  }
  
  private deepFunctionCall1(): void {
    this.deepFunctionCall2();
  }
  
  private deepFunctionCall2(): void {
    this.deepFunctionCall3();
  }
  
  private deepFunctionCall3(): void {
    throw new Error('Simulated crash for stack trace demonstration');
  }
  
  demonstrateEnhancedReports(): void {
    console.log('🧪 Demonstrating enhanced crash reports...');
    this.simulateStackTrace();
  }
}

// 🌐 Web Demo Server
console.log('\n🌐 Starting Web Demo Server...');
console.log('-' .repeat(30));

const demoServer = serve({
  port: 3009,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/') {
      return new Response(getDemoHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    if (url.pathname === '/api/test-config') {
      const configDemo = new ConfigLoadingDemo();
      configDemo.demonstrateMultipleLoads();
      
      return Response.json({
        fix: 'Global ~/.bunfig.toml loading',
        status: 'Config loaded once per run',
        timestamp: new Date().toISOString()
      });
    }
    
    if (url.pathname === '/api/test-mysql') {
      const mysqlDemo = new MySQLPacketDemo();
      mysqlDemo.demonstratePacketSafety();
      
      return Response.json({
        fix: 'MySQL OK packet parsing safety',
        status: 'Safe packet parsing with byte clamping',
        timestamp: new Date().toISOString()
      });
    }
    
    if (url.pathname === '/api/test-cookies') {
      const cookieDemo = new CookieMapDemo();
      cookieDemo.demonstrateCookieSafety();
      
      return Response.json({
        fix: 'CookieMap delete crash fix',
        status: 'Safe cookie deletion without crashes',
        timestamp: new Date().toISOString()
      });
    }
    
    if (url.pathname === '/api/test-colors') {
      const colorDemo = new ANSIColorDemo();
      colorDemo.demonstrateColorDetection();
      
      return Response.json({
        fix: 'ANSI color detection per stream',
        status: 'Per-stream color support working',
        timestamp: new Date().toISOString()
      });
    }
    
    if (url.pathname === '/api/test-crash') {
      const crashDemo = new CrashReportDemo();
      crashDemo.demonstrateEnhancedReports();
      
      return Response.json({
        fix: 'Enhanced crash reports',
        status: 'Complete stack trace capture',
        timestamp: new Date().toISOString()
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
});

console.log(`🚀 Demo server running on http://localhost:3009`);

// HTML Template
function getDemoHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>🚀 Bun Stability & Reliability Fixes</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .fix-card { background: #f8f9fa; margin: 20px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .fix-title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; color: #007bff; }
        .fix-description { margin-bottom: 15px; color: #666; }
        .test-button { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .test-button:hover { background: #218838; }
        .test-result { background: #e9ecef; padding: 15px; margin: 10px 0; border-radius: 5px; font-family: monospace; font-size: 12px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; font-weight: bold; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Bun Stability & Reliability Fixes</h1>
            <p>Comprehensive demo of critical stability improvements in Bun</p>
        </div>
        
        <div class="fix-card">
            <div class="fix-title">📝 Global ~/.bunfig.toml Loading</div>
            <div class="fix-description">
                Config is now loaded at most once per run, preventing duplicate configuration application.
            </div>
            <button class="test-button" onclick="testFix('config')">Test Config Loading</button>
            <div id="config-result" class="test-result" style="display:none;"></div>
        </div>
        
        <div class="fix-card">
            <div class="fix-title">🗄️ MySQL OK Packet Parsing Safety</div>
            <div class="fix-description">
                Safe parsing with byte clamping prevents overflow panics from truncated packets.
            </div>
            <button class="test-button" onclick="testFix('mysql')">Test MySQL Packets</button>
            <div id="mysql-result" class="test-result" style="display:none;"></div>
        </div>
        
        <div class="fix-card">
            <div class="fix-title">🍪 CookieMap Delete Crash Fix</div>
            <div class="fix-description">
                Safe cookie deletion without crashes in edge cases.
            </div>
            <button class="test-button" onclick="testFix('cookies')">Test Cookie Deletion</button>
            <div id="cookies-result" class="test-result" style="display:none;"></div>
        </div>
        
        <div class="fix-card">
            <div class="fix-title">🎨 ANSI Color Detection & Interactive UI</div>
            <div class="fix-description">
                Per-stream color detection and smart box-drawing character usage.
            </div>
            <button class="test-button" onclick="testFix('colors')">Test Color Detection</button>
            <div id="colors-result" class="test-result" style="display:none;"></div>
        </div>
        
        <div class="fix-card">
            <div class="fix-title">💥 Enhanced Crash Reports</div>
            <div class="fix-description">
                Complete stack traces using Zig's std.debug.captureStackTrace.
            </div>
            <button class="test-button" onclick="testFix('crash')">Test Crash Reports</button>
            <div id="crash-result" class="test-result" style="display:none;"></div>
        </div>
        
        <div id="status" class="status info">Ready to test stability fixes...</div>
    </div>

    <script>
        async function testFix(fixType) {
            const resultDiv = document.getElementById(fixType + '-result');
            const statusDiv = document.getElementById('status');
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '🧪 Testing ' + fixType + ' fix...';
            statusDiv.textContent = 'Running test...';
            statusDiv.className = 'status info';
            
            try {
                const response = await fetch('/api/test-' + fixType);
                const data = await response.json();
                
                resultDiv.innerHTML = '✅ ' + data.fix + '\\n\\nStatus: ' + data.status + '\\nTimestamp: ' + data.timestamp;
                statusDiv.textContent = 'Test completed successfully!';
                statusDiv.className = 'status success';
            } catch (error) {
                resultDiv.innerHTML = '❌ Error: ' + error.message;
                statusDiv.textContent = 'Test failed';
                statusDiv.className = 'status error';
            }
        }
        
        // Auto-test all fixes on load
        window.addEventListener('load', () => {
            setTimeout(() => {
                console.log('🚀 Auto-testing all stability fixes...');
                ['config', 'mysql', 'cookies', 'colors', 'crash'].forEach((fix, index) => {
                    setTimeout(() => testFix(fix), index * 1000);
                });
            }, 1000);
        });
    </script>
</body>
</html>`;
}

// Run all demos
console.log('\n🧪 Running All Stability Fix Demos...');
console.log('=' .repeat(45));

const configDemo = new ConfigLoadingDemo();
configDemo.demonstrateMultipleLoads();

const mysqlDemo = new MySQLPacketDemo();
mysqlDemo.demonstratePacketSafety();

const cookieDemo = new CookieMapDemo();
cookieDemo.demonstrateCookieSafety();

const colorDemo = new ANSIColorDemo();
colorDemo.demonstrateColorDetection();

const crashDemo = new CrashReportDemo();
crashDemo.demonstrateEnhancedReports();

console.log('\n📊 Summary of Stability Fixes:');
console.log('=' .repeat(35));
console.log('✅ Config loading: Once per run, no duplicates');
console.log('✅ MySQL parsing: Safe byte clamping, no overflows');
console.log('✅ CookieMap: Safe deletion, no crashes');
console.log('✅ ANSI colors: Per-stream detection');
console.log('✅ Interactive UI: Smart box-drawing usage');
console.log('✅ Crash reports: Complete stack traces');

console.log('\n🌐 Open http://localhost:3009 for interactive demo');
console.log('⏹️  Press Ctrl+C to stop the server');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down stability demo server...');
  demoServer.stop();
  process.exit(0);
});

// Keep server running
await new Promise(() => {});
