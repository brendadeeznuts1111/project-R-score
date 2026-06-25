#!/usr/bin/env bun

// setup-hosts.ts - Configure local hosts for enterprise development
// Automatically configures /etc/hosts for custom hostnames

import { exec } from 'bun';

console.info("🔧 Configuring Enterprise Hostnames for Local Development");

const HOSTS_CONFIG = [
    '127.0.0.1 api.factory-wager.com',
    '127.0.0.1 docs.factory-wager.com',
    '127.0.0.1 admin.factory-wager.com',
    '127.0.0.1 fraud.factory-wager.com',
    '127.0.0.1 shop.factory-wager.com',
    '127.0.0.1 commerce.factory-wager.com',
    '127.0.0.1 retail.factory-wager.com',
    '127.0.0.1 ai.factory-wager.com',
    '127.0.0.1 analytics.factory-wager.com',
    '127.0.0.1 monitoring.factory-wager.com',
    '127.0.0.1 security.factory-wager.com',
    '127.0.0.1 auth.factory-wager.com',
    '127.0.0.1 rbac.factory-wager.com'
];

async function setupHosts() {
    try {
        // Check if running on macOS or Linux
        const platform = process.platform;
        
        if (platform === 'darwin' || platform === 'linux') {
            console.info("🍎/🐧 Detected Unix-like system");
            
            // Read current hosts file
            const hostsContent = await Bun.file('/etc/hosts').text();
            
            // Check if factory-wager entries already exist
            const hasFactoryWager = hostsContent.includes('factory-wager.com');
            
            if (hasFactoryWager) {
                console.info("✅ Factory-wager hostnames already configured");
                return;
            }
            
            // Backup current hosts file
            await exec('sudo cp /etc/hosts /etc/hosts.backup');
            console.info("💾 Created backup of /etc/hosts");
            
            // Add new entries
            const newEntries = HOSTS_CONFIG.join('\n') + '\n';
            await exec(`sudo sh -c 'echo "${newEntries}" >> /etc/hosts'`);
            
            console.info("✅ Added factory-wager hostnames to /etc/hosts");
            
        } else if (platform === 'win32') {
            console.info("🪟 Detected Windows system");
            
            // For Windows, we need to run as administrator
            console.info("⚠️  Please run this script as Administrator on Windows");
            console.info("📝 Manually add these entries to C:\\Windows\\System32\\drivers\\etc\\hosts:");
            HOSTS_CONFIG.forEach(entry => console.info(`   ${entry}`));
            
        } else {
            console.info("❌ Unsupported platform:", platform);
        }
        
    } catch (error) {
        console.error("❌ Failed to configure hosts:", error);
        console.info("📝 Please manually add these entries to your hosts file:");
        HOSTS_CONFIG.forEach(entry => console.info(`   ${entry}`));
    }
}

async function verifyHosts() {
    try {
        console.info("\n🔍 Verifying hostname configuration...");
        
        for (const hostname of ['api.factory-wager.com', 'docs.factory-wager.com']) {
            try {
                const result = await exec(`ping -c 1 ${hostname}`, { stdout: 'pipe' });
                if (result.exitCode === 0) {
                    console.info(`✅ ${hostname} - Resolves correctly`);
                } else {
                    console.info(`❌ ${hostname} - Not resolving`);
                }
            } catch (error) {
                console.info(`❌ ${hostname} - Not resolving`);
            }
        }
        
    } catch (error) {
        console.error("❌ Verification failed:", error);
    }
}

// Main execution
async function main() {
    console.info("🚀 Factory-Wager Enterprise Hostname Setup");
    console.info("=" .repeat(50));
    
    await setupHosts();
    await verifyHosts();
    
    console.info("\n🎯 Next Steps:");
    console.info("1. Start Shopping API: bun run shop:start");
    console.info("2. Open Dashboard: bun run shop:dashboard");
    console.info("3. Access API: http://api.factory-wager.com:3005");
    console.info("4. View Dashboard: http://api.factory-wager.com:3005/dashboard");
    
    console.info("\n💚 Enterprise hostname configuration complete!");
}

// Run if executed directly
if (import.meta.main) {
    main().catch(console.error);
}

export { setupHosts, verifyHosts };
