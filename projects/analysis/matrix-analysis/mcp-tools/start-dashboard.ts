#!/usr/bin/env bun
// start-dashboard.ts - Start dashboard servers with verification

const { spawn } = require('child_process');
const http = require('http');

console.log("🚀 Starting Tier-1380 OMEGA Dashboard...");
console.log("=" .repeat(50));

async function checkPort(port: number, name: string): Promise<boolean> {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 2000
        }, (res: any) => {
            resolve(true);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

async function startServers() {
    // Check if API server is running
    const apiRunning = await checkPort(3333, 'API');
    if (!apiRunning) {
        console.log("🔧 Starting API server...");
        spawn('bun', ['api-server.ts'], {
            cwd: process.cwd(),
            stdio: 'inherit',
            detached: true
        });

        // Wait for API to start
        console.log("⏳ Waiting for API server...");
        await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
        console.log("✅ API server already running on port 3333");
    }

    // Check if dashboard server is running
    const dashboardRunning = await checkPort(3001, 'Dashboard');
    if (!dashboardRunning) {
        console.log("🔧 Starting dashboard server...");
        spawn('python3', ['-m', 'http.server', '3001'], {
            cwd: process.cwd(),
            stdio: 'inherit',
            detached: true
        });

        // Wait for dashboard to start
        console.log("⏳ Waiting for dashboard server...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
        console.log("✅ Dashboard server already running on port 3001");
    }

    // Verify both servers are running
    const apiOk = await checkPort(3333, 'API');
    const dashboardOk = await checkPort(3001, 'Dashboard');

    if (apiOk && dashboardOk) {
        console.log("\n🎉 SUCCESS: All servers running!");
        console.log("📊 API Server: http://localhost:3333");
        console.log("🌐 Dashboard: http://localhost:3001/multi-tenant-dashboard.html");
        console.log("🧪 Test Page: http://localhost:3001/dashboard-test.html");
        console.log("\n✨ Enhanced Features:");
        console.log("   • Multi-tenant filtering");
        console.log("   • Enhanced spinners and loading states");
        console.log("   • Data export (CSV/JSON)");
        console.log("   • Auto-refresh capabilities");
        console.log("   • Quick filters and date ranges");
        console.log("\n🚀 Dashboard is ready for use!");
    } else {
        console.log("\n❌ ERROR: Failed to start servers");
        console.log(`API Server: ${apiOk ? '✅' : '❌'}`);
        console.log(`Dashboard: ${dashboardOk ? '✅' : '❌'}`);
    }
}

startServers().catch(console.error);
