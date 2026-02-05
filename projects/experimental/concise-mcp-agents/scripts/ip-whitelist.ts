#!/usr/bin/env bun

// [IP][WHITELIST][SECURITY][IP-WL-001][v2.11][ACTIVE]

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface IPWhitelist {
  allowedIPs: string[];
  blockedIPs: string[];
  vpnRequired: boolean;
  geoRestrictions?: {
    allowedCountries: string[];
    blockedCountries: string[];
  };
}

export class IPWhitelistSystem {
  private whitelist: IPWhitelist;
  private configFile = 'config/security.json';

  constructor() {
    this.whitelist = this.loadConfig();
  }

  private loadConfig(): IPWhitelist {
    const defaultConfig: IPWhitelist = {
      allowedIPs: ['127.0.0.1', 'localhost', '192.168.1.0/24'],
      blockedIPs: [],
      vpnRequired: false,
      geoRestrictions: {
        allowedCountries: [],
        blockedCountries: []
      }
    };

    if (existsSync(this.configFile)) {
      try {
        const data = JSON.parse(readFileSync(this.configFile, 'utf-8'));
        return { ...defaultConfig, ...data };
      } catch {
        // Use defaults if file is corrupted
      }
    }

    return defaultConfig;
  }

  private saveConfig(): void {
    writeFileSync(this.configFile, JSON.stringify(this.whitelist, null, 2));
  }

  async checkIP(ip: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check blocked IPs first
    if (this.whitelist.blockedIPs.includes(ip)) {
      return { allowed: false, reason: 'IP is blocked' };
    }

    // If whitelist is enabled, check if IP is allowed
    if (this.whitelist.allowedIPs.length > 0) {
      const isAllowed = this.whitelist.allowedIPs.some(allowedIP => {
        if (allowedIP.includes('/')) {
          // CIDR notation support
          return this.isIPInCIDR(ip, allowedIP);
        }
        return allowedIP === ip || allowedIP === 'localhost' && (ip === '127.0.0.1' || ip === '::1');
      });

      if (!isAllowed) {
        return { allowed: false, reason: 'IP not in whitelist' };
      }
    }

    // Check geo restrictions if configured
    if (this.whitelist.geoRestrictions) {
      const geoCheck = await this.checkGeoRestrictions(ip);
      if (!geoCheck.allowed) {
        return geoCheck;
      }
    }

    return { allowed: true };
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, prefix] = cidr.split('/');
      const prefixLength = parseInt(prefix);

      // Simple implementation - in production use a proper IP library
      const ipParts = ip.split('.').map(Number);
      const networkParts = network.split('.').map(Number);

      const mask = ~(0xFFFFFFFF >>> prefixLength);
      const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];

      return (ipNum & mask) === (networkNum & mask);
    } catch {
      return false;
    }
  }

  private async checkGeoRestrictions(ip: string): Promise<{ allowed: boolean; reason?: string }> {
    if (!this.whitelist.geoRestrictions) {
      return { allowed: true };
    }

    try {
      // Get country from IP (using a free API)
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();

      if (data.status !== 'success') {
        return { allowed: false, reason: 'Could not determine location' };
      }

      const country = data.countryCode;

      // Check blocked countries
      if (this.whitelist.geoRestrictions.blockedCountries.includes(country)) {
        return { allowed: false, reason: `Country ${country} is blocked` };
      }

      // Check allowed countries (if specified)
      if (this.whitelist.geoRestrictions.allowedCountries.length > 0) {
        if (!this.whitelist.geoRestrictions.allowedCountries.includes(country)) {
          return { allowed: false, reason: `Country ${country} not in allowed list` };
        }
      }

      return { allowed: true };
    } catch (error) {
      // Allow if geo check fails (fail open)
      console.warn(`Geo check failed for ${ip}: ${error.message}`);
      return { allowed: true };
    }
  }

  addAllowedIP(ip: string): void {
    if (!this.whitelist.allowedIPs.includes(ip)) {
      this.whitelist.allowedIPs.push(ip);
      this.saveConfig();
      console.log(`✅ Added ${ip} to whitelist`);
    } else {
      console.log(`ℹ️  ${ip} already in whitelist`);
    }
  }

  removeAllowedIP(ip: string): void {
    const index = this.whitelist.allowedIPs.indexOf(ip);
    if (index > -1) {
      this.whitelist.allowedIPs.splice(index, 1);
      this.saveConfig();
      console.log(`✅ Removed ${ip} from whitelist`);
    } else {
      console.log(`ℹ️  ${ip} not in whitelist`);
    }
  }

  addBlockedIP(ip: string): void {
    if (!this.whitelist.blockedIPs.includes(ip)) {
      this.whitelist.blockedIPs.push(ip);
      this.saveConfig();
      console.log(`🚫 Added ${ip} to blocklist`);
    } else {
      console.log(`ℹ️  ${ip} already blocked`);
    }
  }

  listIPs(): void {
    console.log(`📋 IP Whitelist Configuration:`);
    console.log(`   Allowed IPs: ${this.whitelist.allowedIPs.join(', ')}`);
    console.log(`   Blocked IPs: ${this.whitelist.blockedIPs.join(', ')}`);
    console.log(`   VPN Required: ${this.whitelist.vpnRequired ? 'Yes' : 'No'}`);
  }

  async testIP(ip: string): Promise<void> {
    const result = await this.checkIP(ip);
    if (result.allowed) {
      console.log(`✅ ${ip} is allowed`);
    } else {
      console.log(`❌ ${ip} is blocked: ${result.reason}`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const ipSystem = new IPWhitelistSystem();

  if (args.length === 0) {
    console.log(`🌐 IP Whitelist System v2.11

USAGE:
  bun ip:add <ip>         # Add IP to whitelist
  bun ip:remove <ip>      # Remove IP from whitelist
  bun ip:block <ip>       # Add IP to blocklist
  bun ip:list             # List all IPs
  bun ip:test <ip>        # Test if IP is allowed

EXAMPLES:
  bun ip:add 192.168.1.100    # Allow specific IP
  bun ip:add 10.0.0.0/8      # Allow CIDR range
  bun ip:remove 192.168.1.100 # Remove from whitelist
  bun ip:test 8.8.8.8         # Check Google DNS
`);
    ipSystem.listIPs();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'add':
        if (args.length < 2) {
          console.error('Usage: bun ip:add <ip>');
          process.exit(1);
        }
        ipSystem.addAllowedIP(args[1]);
        break;

      case 'remove':
        if (args.length < 2) {
          console.error('Usage: bun ip:remove <ip>');
          process.exit(1);
        }
        ipSystem.removeAllowedIP(args[1]);
        break;

      case 'block':
        if (args.length < 2) {
          console.error('Usage: bun ip:block <ip>');
          process.exit(1);
        }
        ipSystem.addBlockedIP(args[1]);
        break;

      case 'list':
        ipSystem.listIPs();
        break;

      case 'test':
        if (args.length < 2) {
          console.error('Usage: bun ip:test <ip>');
          process.exit(1);
        }
        await ipSystem.testIP(args[1]);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun ip --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
