#!/usr/bin/env bun
// start-dashboard.ts - Start dashboard servers with verification

const { spawn } = require('child_process');
const http = require('http');

console.info("🚀 Starting Tier-1380 OMEGA Dashboard...");
console.info("=" .repeat(50));

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
        console.info("🔧 Starting API server...");
        spawn('bun', ['api-server.ts'], {
            cwd: process.cwd(),
            stdio: 'inherit',
            detached: true
        });

        // Wait for API to start
        console.info("⏳ Waiting for API server...");
        await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
        console.info("✅ API server already running on port 3333");
    }

    // Check if dashboard server is running
    const dashboardRunning = await checkPort(3001, 'Dashboard');
    if (!dashboardRunning) {
        console.info("🔧 Starting dashboard server...");
        spawn('python3', ['-m', 'http.server', '3001'], {
            cwd: process.cwd(),
            stdio: 'inherit',
            detached: true
        });

        // Wait for dashboard to start
        console.info("⏳ Waiting for dashboard server...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
        console.info("✅ Dashboard server already running on port 3001");
    }

    // Verify both servers are running
    const apiOk = await checkPort(3333, 'API');
    const dashboardOk = await checkPort(3001, 'Dashboard');

    if (apiOk && dashboardOk) {
        console.info("\n🎉 SUCCESS: All servers running!");
        console.info("📊 API Server: http://localhost:3333");
        console.info("🌐 Dashboard: http://localhost:3001/multi-tenant-dashboard.html");
        console.info("🧪 Test Page: http://localhost:3001/dashboard-test.html");
        console.info("\n✨ Enhanced Features:");
        console.info("   • Multi-tenant filtering");
        console.info("   • Enhanced spinners and loading states");
        console.info("   • Data export (CSV/JSON)");
        console.info("   • Auto-refresh capabilities");
        console.info("   • Quick filters and date ranges");
        console.info("\n🚀 Dashboard is ready for use!");
    } else {
        console.info("\n❌ ERROR: Failed to start servers");
        console.info(`API Server: ${apiOk ? '✅' : '❌'}`);
        console.info(`Dashboard: ${dashboardOk ? '✅' : '❌'}`);
    }
}

startServers().catch(console.error);
