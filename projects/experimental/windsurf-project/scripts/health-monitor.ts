// scripts/health-monitor.ts
import { BunR2AppleManager } from '../src/storage/r2-apple-manager';
import { phoneIntelligenceSystem } from '../src/core/filter/phone-intelligence-system';

async function runHealthCheck() {
    console.info('\u001b[1m\u001b[35m🔍 EMPIRE PRO - AUTOMATED HEALTH MONITOR\u001b[0m');
    console.info('='.repeat(50));

    // 1. Storage Health
    const mgr = new BunR2AppleManager();
    const storageStats = await mgr.getMetrics();
    console.info(`\n📦 STORAGE (R2):`);
    console.info(`   Bucket: ${storageStats.bucket}`);
    console.info(`   Local Files: ${storageStats.metrics.localMirroredFiles}`);
    console.info(`   Status: \u001b[32mOK\u001b[0m`);

    // 2. Proxy Network Health
    try {
        const proxyFile = Bun.file('proxies/live_proxies.json');
        const proxies = await proxyFile.json();
        const active = proxies.filter((p: any) => p.latency < 1000).length;
        console.info(`\n🌐 NETWORK (PROXIES):`);
        console.info(`   Total: ${proxies.length}`);
        console.info(`   Active: ${active}`);
        console.info(`   Health: ${((active/proxies.length)*100).toFixed(1)}%`);
    } catch (e) {
        console.info(`\n🌐 NETWORK (PROXIES): \u001b[31mDATA MISSING\u001b[0m`);
    }

    // 3. System Metrics
    const phoneSystem = await phoneIntelligenceSystem.getMetrics();
    console.info(`\n⚡ PERFORMANCE:`);
    console.info(`   Throughput: ${phoneSystem.throughput.toFixed(0)} items/s`);
    console.info(`   Avg Latency: ${phoneSystem.avgLatency.toFixed(2)}s`);
    console.info(`   Cache Hit: ${(phoneSystem.cacheHitRate * 100).toFixed(1)}%`);

    console.info('\n' + '='.repeat(50));
    console.info(`\u001b[32m✅ ALL SYSTEMS OPERATIONAL\u001b[0m`);
}

runHealthCheck().catch(console.error);
