#!/usr/bin/env bun
/**
 * FactoryWager Cloudflare DNS Setup v1.3.8
 * Configure DNS for registry.factory-wager.co using Cloudflare API
 */

import { execSync } from 'child_process';

interface DNSConfig {
  domain: string;
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

class CloudflareDNSManager {
  private apiToken?: string;
  private email?: string;
  private zoneId?: string;
  private domain = 'factory-wager.com';

  async setupCredentials(): Promise<void> {
    console.log("🔧 Setting up Cloudflare credentials...");

    // Check if credentials are already stored
    try {
      this.apiToken = await Bun.secrets.get({ name: "API_TOKEN", service: "cloudflare" });
      this.email = await Bun.secrets.get({ name: "EMAIL", service: "cloudflare" });

      if (this.apiToken && this.email) {
        console.log("✅ Cloudflare credentials found");
        return;
      }
    } catch {
      // Credentials not found, prompt for setup
    }

    // Prompt for credentials
    console.log("⚠️ Cloudflare credentials not found in secrets");
    console.log("Please provide your Cloudflare API credentials:");

    // In a real scenario, you'd prompt the user
    // For now, we'll use environment variables or ask for manual setup
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const email = process.env.CLOUDFLARE_EMAIL;

    if (apiToken && email) {
      // Store in secrets
      await Bun.secrets.set({ name: "API_TOKEN", service: "cloudflare", value: apiToken });
      await Bun.secrets.set({ name: "EMAIL", service: "cloudflare", value: email });

      this.apiToken = apiToken;
      this.email = email;

      console.log("✅ Cloudflare credentials stored in secrets");
    } else {
      console.log("❌ Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_EMAIL environment variables");
      throw new Error("Missing Cloudflare credentials");
    }
  }

  async getZoneId(): Promise<string> {
    if (!this.apiToken) {
      throw new Error("Cloudflare API token not configured");
    }

    console.log(`🔍 Looking up zone ID for ${this.domain}...`);

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${this.domain}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.result.length > 0) {
        this.zoneId = data.result[0].id || undefined;
        console.log(`✅ Zone ID found: ${this.zoneId}`);
        return this.zoneId!;
      } else {
        throw new Error(`Zone not found for ${this.domain}`);
      }
    } catch (error) {
      console.error("❌ Error getting zone ID:", (error as Error).message);
      throw error;
    }
  }

  async createDNSRecord(config: DNSConfig): Promise<void> {
    if (!this.apiToken || !this.zoneId) {
      throw new Error("Cloudflare API token or zone ID not configured");
    }

    console.log(`🔧 Creating DNS record: ${config.name} ${config.type} ${config.content}`);

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: config.type,
          name: config.name,
          content: config.content,
          ttl: config.ttl || 3600,
          proxied: config.proxied || false
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ DNS record created: ${data.result.id}`);
      } else {
        console.error("❌ Error creating DNS record:", data.errors);
        throw new Error(`DNS record creation failed: ${JSON.stringify(data.errors)}`);
      }
    } catch (error) {
      console.error("❌ Error creating DNS record:", (error as Error).message);
      throw error;
    }
  }

  async listDNSRecords(): Promise<any[]> {
    if (!this.apiToken || !this.zoneId) {
      throw new Error("Cloudflare API token or zone ID not configured");
    }

    console.log("📋 Listing current DNS records...");

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Found ${data.result.length} DNS records`);
        return data.result;
      } else {
        throw new Error(`Failed to list DNS records: ${JSON.stringify(data.errors)}`);
      }
    } catch (error) {
      console.error("❌ Error listing DNS records:", (error as Error).message);
      throw error;
    }
  }

  async setupRegistryDNS(): Promise<void> {
    console.log("🚀 Setting up DNS for registry.factory-wager.co...");

    // Setup credentials
    await this.setupCredentials();

    // Get zone ID
    await this.getZoneId();

    // Check existing records
    const existingRecords = await this.listDNSRecords();
    const registryRecord = existingRecords.find(r => r.name === 'registry.factory-wager.co');

    if (registryRecord) {
      console.log(`⚠️ Registry DNS record already exists: ${registryRecord.content}`);
      console.log("Updating existing record...");

      // Delete existing record first
      await this.deleteDNSRecord(registryRecord.id);
    }

    // Create A record for registry (pointing to a placeholder IP for now)
    // In production, this should point to your load balancer IP
    const registryConfig: DNSConfig = {
      domain: this.domain,
      type: 'A',
      name: 'registry.factory-wager.co',
      content: '1.2.3.4', // Placeholder IP - replace with actual load balancer IP
      ttl: 3600,
      proxied: true // Enable Cloudflare proxy
    };

    await this.createDNSRecord(registryConfig);

    console.log("✅ Registry DNS setup complete!");
    console.log("⏳ DNS propagation may take up to 24 hours");
  }

  private async deleteDNSRecord(recordId: string): Promise<void> {
    if (!this.apiToken || !this.zoneId) {
      throw new Error("Cloudflare API token or zone ID not configured");
    }

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Deleted DNS record: ${recordId}`);
      } else {
        throw new Error(`Failed to delete DNS record: ${JSON.stringify(data.errors)}`);
      }
    } catch (error) {
      console.error("❌ Error deleting DNS record:", (error as Error).message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  console.log("🌐 FactoryWager Cloudflare DNS Setup");
  console.log("=====================================");

  try {
    const dnsManager = new CloudflareDNSManager();
    await dnsManager.setupRegistryDNS();

    console.log("\n✅ DNS setup completed successfully!");
    console.log("🔍 Test DNS resolution with: dig registry.factory-wager.co");
    console.log("⏳ Wait for propagation, then test registry connectivity");

  } catch (error) {
    console.error("\n❌ DNS setup failed:", (error as Error).message);
    console.log("\n🔧 Manual setup required:");
    console.log("1. Login to Cloudflare dashboard");
    console.log("2. Go to DNS settings for factory-wager.com");
    console.log("3. Create A record: registry -> 1.2.3.4 (proxy enabled)");
    console.log("4. Wait for DNS propagation");

    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
