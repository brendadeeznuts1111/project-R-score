#!/usr/bin/env bun
/**
 * Themed Cloudflare Domain Management CLI
 *
 * Theme-aware version of the domain CLI using FactoryWager theme system.
 * Integrates TOML configuration with styled console output.
 *
 * Usage:
 *   bun run scripts/domain/cf-themed-cli.ts [theme] [command] [options]
 *
 * Themes: light, dark, professional (default)
 */

import { themes, domainConfig, type ThemeName, type ThemeConfig } from '../../themes/config';
import { ThemedConsole, getDomainTheme, themedSeparator } from '../../themes/config/domain-theme';
import { CloudflareClient, createClient } from '../../lib/cloudflare';
import { FACTORY_WAGER_DOMAIN, FACTORY_WAGER_BRAND } from '../../src/config/domain';
import { printTable, type TableColumn } from '../../src/utils/cli-table';
import type { CFZone, CFDNSRecord } from '../../lib/cloudflare';

// Parse theme from args
const args = process.argv.slice(2);
const themeArg = args[0] as ThemeName;
const hasThemeArg = themeArg in themes;
const activeTheme: ThemeName = hasThemeArg ? themeArg : 'professional';
const commandArgs = hasThemeArg ? args.slice(1) : args;

// Initialize themed console
const t = new ThemedConsole(activeTheme);
const theme = getDomainTheme(activeTheme);
const config = domainConfig;

// Brand header with theme
function printHeader(): void {
  const { icon, name } = FACTORY_WAGER_BRAND;
  const separator = themedSeparator(activeTheme, 50);

  t.log();
  t.log(separator);
  t.log(`${icon} ${name} Domain Manager`);
  t.log(`   Theme: ${activeTheme} | ${config.meta.description}`);
  t.log(separator);
  t.log();
}

// Themed status display
function printZoneStatus(zone: CFZone): void {
  const status =
    zone.status === 'active'
      ? t.zoneStatus('active')
      : zone.status === 'paused'
        ? t.zoneStatus('paused')
        : t.zoneStatus(zone.status);

  t.log(`  ${theme.icons.zone} ${zone.name}`);
  t.log(`     Status: ${status}`);
  t.log(`     Plan: ${zone.plan.name}`);
  t.log(`     Nameservers: ${zone.name_servers.join(', ')}`);
}

// Themed DNS display
function printDNSRecord(record: CFDNSRecord): void {
  const type = t.dnsType(record.type);
  const proxied = t.proxiedStatus(record.proxied);

  t.log(`  ${type} ${record.name}`);
  t.log(`     → ${record.content}`);
  t.log(`     TTL: ${record.ttl === 1 ? 'Auto' : record.ttl}s | Proxied: ${proxied}`);
}

// Themed SSL display
function printSSLStatus(mode: string, status: string): void {
  const sslMode = t.sslMode(mode);
  t.log(`  ${theme.icons.ssl} SSL Mode: ${sslMode}`);
  t.log(`     Certificate: ${status}`);
}

// ==================== Commands ====================

async function cmdStatus(): Promise<void> {
  t.header('🔍 Cloudflare API Status');
  t.log();

  try {
    const client = await createClient();
    const zones = await client.listZones();

    t.success(`Connected | ${zones.length} zones`);
    t.info(`API: ${config.api.base_url}`);
    t.info(`Rate limit: ${config.api.rate_limit} req/sec`);
    t.log();

    // Check FactoryWager domain
    const fwDomain = config.defaults.primary_domain;
    const fwZone = zones.find(z => z.name === fwDomain);

    if (fwZone) {
      t.success(`${fwDomain} configured`);
      printZoneStatus(fwZone);
    } else {
      t.warning(`${fwDomain} not found`);
    }
  } catch (error) {
    t.error(`Connection failed: ${(error as Error).message}`);
    t.info('Run: bun run cf:secrets:setup <token>');
  }
}

async function cmdZones(): Promise<void> {
  t.header(`${theme.icons.zone} Zones`);
  t.log();

  try {
    const client = await createClient();
    const zones = await client.listZones();

    if (zones.length === 0) {
      t.warning('No zones found');
      return;
    }

    zones.forEach(zone => {
      printZoneStatus(zone);
      t.log();
    });

    t.success(`${zones.length} zone(s) total`);
  } catch (error) {
    t.error(`Failed to list zones: ${(error as Error).message}`);
  }
}

async function cmdDNS(domain?: string): Promise<void> {
  const targetDomain = domain || config.defaults.primary_domain;
  t.header(`${theme.icons.dns} DNS Records: ${targetDomain}`);
  t.log();

  try {
    const client = await createClient();
    const zoneId = await client.getZoneId(targetDomain);
    const records = await client.listDNSRecords(zoneId);

    if (records.length === 0) {
      t.warning('No DNS records found');
      return;
    }

    // Group by type
    const byType = records.reduce(
      (acc, r) => {
        acc[r.type] = acc[r.type] || [];
        acc[r.type].push(r);
        return acc;
      },
      {} as Record<string, CFDNSRecord[]>
    );

    Object.entries(byType).forEach(([type, recs]) => {
      t.log(`${t.dnsType(type)} (${recs.length})`);
      recs.forEach(r => {
        t.log(`  ${r.name} → ${r.content.substring(0, 40)}`);
      });
      t.log();
    });

    t.success(`${records.length} record(s) total`);
  } catch (error) {
    t.error(`Failed to list DNS: ${(error as Error).message}`);
  }
}

async function cmdSSL(domain?: string): Promise<void> {
  const targetDomain = domain || config.defaults.primary_domain;
  t.header(`${theme.icons.ssl} SSL Status: ${targetDomain}`);
  t.log();

  try {
    const client = await createClient();
    const zoneId = await client.getZoneId(targetDomain);
    const settings = await client.getSSLSettings(zoneId);

    printSSLStatus(settings.value, 'active');
    t.log();
    t.info(`Default mode: ${config.defaults.ssl_mode}`);
  } catch (error) {
    t.error(`Failed to get SSL status: ${(error as Error).message}`);
  }
}

async function cmdSetup(): Promise<void> {
  const env = (commandArgs[1] as string) || config.defaults.environment;
  const domain =
    config.environments[env as keyof typeof config.environments]?.primary_domain ||
    config.defaults.primary_domain;

  t.header(`${theme.icons.zone} Setup: ${domain}`);
  t.log();

  const subs = config.subdomains;
  t.info(`Creating ${Object.keys(subs).length} subdomains...`);
  t.log();

  Object.entries(subs).forEach(([key, sub]) => {
    const fullName = `${sub.name}.${domain}`;
    const proxied = sub.proxied ? t.proxiedStatus(true) : t.proxiedStatus(false);
    t.log(`  ${fullName} ${proxied}`);
    t.log(`     ${sub.description}`);
  });

  t.log();
  t.info('SSL: strict | Proxy: enabled | TTL: Auto');
  t.warning('Run with --apply to execute changes');
}

async function cmdHelp(): Promise<void> {
  printHeader();

  t.header('Usage:');
  t.log('  bun run cf-themed.ts [theme] <command> [options]');
  t.log();

  t.header('Themes:');
  Object.entries(themes).forEach(([key, themeObj]) => {
    const marker = key === activeTheme ? '→' : ' ';
    t.log(`  ${marker} ${key.padEnd(12)} ${themeObj.meta.icon} ${themeObj.meta.name}`);
  });
  t.log();

  t.header('Commands:');
  t.log('  status              Check API connection');
  t.log('  zones               List all zones');
  t.log('  dns [domain]        List DNS records');
  t.log('  ssl [domain]        Check SSL status');
  t.log('  setup [env]         Show setup plan');
  t.log('  help                Show this help');
  t.log();

  t.header('Examples:');
  t.log('  bun run cf-themed.ts status');
  t.log('  bun run cf-themed.ts dark zones');
  t.log('  bun run cf-themed.ts professional dns factory-wager.com');
  t.log();

  t.header('Configuration:');
  t.log(`  Domain: ${config.defaults.primary_domain}`);
  t.log(`  Environment: ${config.defaults.environment}`);
  t.log(`  SSL Mode: ${config.defaults.ssl_mode}`);
  t.log();
}

// ==================== Main ====================

async function main() {
  const command = commandArgs[0] || 'help';

  if (!hasThemeArg && !['help', '--help', '-h'].includes(command)) {
    printHeader();
  }

  switch (command) {
    case 'status':
      await cmdStatus();
      break;
    case 'zones':
      await cmdZones();
      break;
    case 'dns':
      await cmdDNS(commandArgs[1]);
      break;
    case 'ssl':
      await cmdSSL(commandArgs[1]);
      break;
    case 'setup':
      await cmdSetup();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      await cmdHelp();
      break;
  }
}

main().catch(t.error);
