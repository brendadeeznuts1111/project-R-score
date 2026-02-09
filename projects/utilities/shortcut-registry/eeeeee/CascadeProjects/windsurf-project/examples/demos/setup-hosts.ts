#!/usr/bin/env bun

// setup-hosts.ts - Configure local hosts for enterprise development
// Automatically configures /etc/hosts for custom hostnames

import { exec } from 'bun';

console.log("🔧 Configuring Enterprise Hostnames for Local Development");

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
            console.log("🍎/🐧 Detected Unix-like system");
            
            // Read current hosts file
            const hostsContent = await Bun.file('/etc/hosts').text();
            
            // Check if factory-wager entries already exist
            const hasFactoryWager = hostsContent.includes('factory-wager.com');
            
            if (hasFactoryWager) {
                console.log("✅ Factory-wager hostnames already configured");
                return;
            }
            
            // Backup current hosts file
            await exec('sudo cp /etc/hosts /etc/hosts.backup');
            console.log("💾 Created backup of /etc/hosts");
            
            // Add new entries
            const newEntries = HOSTS_CONFIG.join('\n') + '\n';
            await exec(`sudo sh -c 'echo "${newEntries}" >> /etc/hosts'`);
            
            console.log("✅ Added factory-wager hostnames to /etc/hosts");
            
        } else if (platform === 'win32') {
            console.log("🪟 Detected Windows system");
            
            // For Windows, we need to run as administrator
            console.log("⚠️  Please run this script as Administrator on Windows");
            console.log("📝 Manually add these entries to C:\\Windows\\System32\\drivers\\etc\\hosts:");
            HOSTS_CONFIG.forEach(entry => console.log(`   ${entry}`));
            
        } else {
            console.log("❌ Unsupported platform:", platform);
        }
        
    } catch (error) {
        console.error("❌ Failed to configure hosts:", error);
        console.log("📝 Please manually add these entries to your hosts file:");
        HOSTS_CONFIG.forEach(entry => console.log(`   ${entry}`));
    }
}

async function verifyHosts() {
    try {
        console.log("\n🔍 Verifying hostname configuration...");
        
        for (const hostname of ['api.factory-wager.com', 'docs.factory-wager.com']) {
            try {
                const result = await exec(`ping -c 1 ${hostname}`, { stdout: 'pipe' });
                if (result.exitCode === 0) {
                    console.log(`✅ ${hostname} - Resolves correctly`);
                } else {
                    console.log(`❌ ${hostname} - Not resolving`);
                }
            } catch (error) {
                console.log(`❌ ${hostname} - Not resolving`);
            }
        }
        
    } catch (error) {
        console.error("❌ Verification failed:", error);
    }
}

// Main execution
async function main() {
    console.log("🚀 Factory-Wager Enterprise Hostname Setup");
    console.log("=" .repeat(50));
    
    await setupHosts();
    await verifyHosts();
    
    console.log("\n🎯 Next Steps:");
    console.log("1. Start Shopping API: bun run shop:start");
    console.log("2. Open Dashboard: bun run shop:dashboard");
    console.log("3. Access API: http://api.factory-wager.com:3005");
    console.log("4. View Dashboard: http://api.factory-wager.com:3005/dashboard");
    
    console.log("\n💚 Enterprise hostname configuration complete!");
}

// Run if executed directly
if (import.meta.main) {
    main().catch(console.error);
}

export { setupHosts, verifyHosts };
