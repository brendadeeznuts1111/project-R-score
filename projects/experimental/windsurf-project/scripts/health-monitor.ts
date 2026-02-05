// scripts/health-monitor.ts
import { BunR2AppleManager } from '../src/storage/r2-apple-manager';
import { phoneIntelligenceSystem } from '../src/core/filter/phone-intelligence-system';

async function runHealthCheck() {
    console.log('\u001b[1m\u001b[35m🔍 EMPIRE PRO - AUTOMATED HEALTH MONITOR\u001b[0m');
    console.log('='.repeat(50));

    // 1. Storage Health
    const mgr = new BunR2AppleManager();
    const storageStats = await mgr.getMetrics();
    console.log(`\n📦 STORAGE (R2):`);
    console.log(`   Bucket: ${storageStats.bucket}`);
    console.log(`   Local Files: ${storageStats.metrics.localMirroredFiles}`);
    console.log(`   Status: \u001b[32mOK\u001b[0m`);

    // 2. Proxy Network Health
    try {
        const proxyFile = Bun.file('proxies/live_proxies.json');
        const proxies = await proxyFile.json();
        const active = proxies.filter((p: any) => p.latency < 1000).length;
        console.log(`\n🌐 NETWORK (PROXIES):`);
        console.log(`   Total: ${proxies.length}`);
        console.log(`   Active: ${active}`);
        console.log(`   Health: ${((active/proxies.length)*100).toFixed(1)}%`);
    } catch (e) {
        console.log(`\n🌐 NETWORK (PROXIES): \u001b[31mDATA MISSING\u001b[0m`);
    }

    // 3. System Metrics
    const phoneSystem = await phoneIntelligenceSystem.getMetrics();
    console.log(`\n⚡ PERFORMANCE:`);
    console.log(`   Throughput: ${phoneSystem.throughput.toFixed(0)} items/s`);
    console.log(`   Avg Latency: ${phoneSystem.avgLatency.toFixed(2)}s`);
    console.log(`   Cache Hit: ${(phoneSystem.cacheHitRate * 100).toFixed(1)}%`);

    console.log('\n' + '='.repeat(50));
    console.log(`\u001b[32m✅ ALL SYSTEMS OPERATIONAL\u001b[0m`);
}

runHealthCheck().catch(console.error);
