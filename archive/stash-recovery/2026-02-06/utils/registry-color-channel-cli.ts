#!/usr/bin/env bun
// registry-color-channel-cli.ts — Tier-1380 Color Channel Risk Filter
// Usage: bun run registry-color-channel-cli.ts [options]

import { nanoseconds } from "bun";
import { stat } from "fs/promises";
import { PROJECT_PALETTE, getProjectStatusColor, renderProjectHeader } from "./project-colors";
import { logger } from "../lib/utils/logger.ts";

// ═══════════════════════════════════════════════════════════════
// TYPES — 20 Column Schema Alignment
// ═══════════════════════════════════════════════════════════════

interface ChannelRegistry {
  channel_id: string;
  hex_red_value: string;
  red_channel: number;
  green_channel: number;
  blue_channel: number;
  alpha_channel: number;
  red_byte_hex: string;
  green_byte_hex: string;
  blue_byte_hex: string;
  alpha_byte_hex: string;
  coverage_pct: number;
  owner_code: string;
  tier_level: number;
  api_version: number;
  encoding_type: string;
  is_synced: boolean;
  byte_position: number;
  channel_mode: string;
  engine_type: string;
  source_type: string;
  // Calculated fields
  r_score?: number;
  risk_level?: "high" | "medium" | "low";
}

interface ThroughputLedger {
  operation_code: string;
  latency_p99: string;
  efficiency_pct: number;
  red_hex: string;
  green_hex: string;
  blue_hex: string;
  red_val: number;
  green_val: number;
  blue_val: number;
  alpha_val: number;
  alpha_hex: string;
  jit_enabled: boolean;
  memory_used: string;
  cpu_percent: number;
  ref_count: number;
  throughput_mbs: string;
  luminosity: string;
  hue_angle: string;
  latency_ms: number;
  avx_accel: boolean;
  // Calculated fields
  r_score?: number;
  risk_level?: "high" | "medium" | "low";
}

interface FilteredOutput {
  meta: {
    source_file: string;
    filter_applied: string;
    timestamp: string;
    total_channels: number;
    filtered_channels: number;
    total_throughput: number;
    filtered_throughput: number;
    bun_version: string;
    processing_latency_ns?: number;
  };
  channels: ChannelRegistry[];
  throughput: ThroughputLedger[];
}

interface ParsedTomlObject {
  [key: string]: string | number | boolean;
}

// ═══════════════════════════════════════════════════════════════
// R-SCORE CALCULATION (Bun.nanoseconds precision)
// ═══════════════════════════════════════════════════════════════

const calculateChannelR = (ch: ChannelRegistry): number => {
  const C = ch.byte_position + (ch.is_synced ? 0 : 5);
  const E = Math.floor((100 - ch.coverage_pct) / 5);
  const S = ch.tier_level * 100 + ch.api_version * 10;
  const V = (ch.encoding_type === "U" ? 0 : 50) + (ch.engine_type === "Z" ? 0 : 100);
  return Number((C + E * 1e-3 + S * 1e-6 + V * 1e-9).toFixed(9));
};

const calculateThroughputR = (tp: ThroughputLedger): number => {
  const C = tp.ref_count + (tp.jit_enabled ? 0 : 2);
  const E = 10 - tp.efficiency_pct;
  const memUnit = tp.memory_used.slice(-1);
  const memVal = parseInt(tp.memory_used) || 0;
  const S = memUnit === "M" ? memVal * 1000 : memUnit === "K" ? memVal : memVal * 1000000;
  const V = (tp.avx_accel ? 0 : 100) + (tp.latency_p99.endsWith("m") ? 500 : 0);
  return Number((C + E * 1e-3 + S * 1e-6 + V * 1e-9).toFixed(9));
};

const determineRiskLevel = (r: number, type: "channel" | "throughput"): "high" | "medium" | "low" => {
  const thresholds = type === "channel" 
    ? { high: 5.0, medium: 2.0 }
    : { high: 1.5, medium: 1.01 };
  
  if (r >= thresholds.high) return "high";
  if (r >= thresholds.medium) return "medium";
  return "low";
};

// ═══════════════════════════════════════════════════════════════
// TOML PARSER — Native Bun TOML Support (v1.3.8+)
// ═══════════════════════════════════════════════════════════════

const parseTomlFast = async (
  path: string,
  opts: { nativeToml: boolean; streamingFilter?: string }
): Promise<{ channels: ChannelRegistry[]; throughput: ThroughputLedger[]; total_channels: number; total_throughput: number }> => {
  const { nativeToml, streamingFilter } = opts;

  if (nativeToml) {
    try {
      const content = await import(path, { with: { type: "toml" } });
      const channels = content.channel_registry || [];
      const throughput = content.throughput_ledger || [];
      return {
        channels,
        throughput,
        total_channels: channels.length,
        total_throughput: throughput.length,
      };
    } catch {
      // fall through to manual parser
    }
  }

  const content = await Bun.file(path).text();
  const cleanContent = content.replace(/#.*/g, '');

  const parseArray = <T>(tag: string, kind: "channel" | "throughput"): { list: T[]; total: number } => {
    const regex = new RegExp(`\\[\\[${tag}\\]\\]([\\s\\S]*?)(?=\\[\\[|$)`, 'g');
    const matches = [...cleanContent.matchAll(regex)];
    const list: T[] = [];
    for (const m of matches) {
      const obj: ParsedTomlObject = {};
      m[1].trim().split('\\n').forEach(line => {
        const [k, v] = line.split('=').map(s => s.trim());
        if (!k || !v) return;
        if (v === 'true') obj[k] = true;
        else if (v === 'false') obj[k] = false;
        else if (!isNaN(Number(v))) obj[k] = Number(v);
        else obj[k] = v.replace(/\"/g, '');
      });

      if (streamingFilter) {
        const r = kind === "channel" ? calculateChannelR(obj) : calculateThroughputR(obj);
        const level = determineRiskLevel(r, kind);
        obj.r_score = r;
        obj.risk_level = level;
        if (streamingFilter !== "all" && level !== streamingFilter) return;
      }

      list.push(obj as T);
    }
    return { list, total: matches.length };
  };

  const channels = parseArray<ChannelRegistry>('channel_registry', "channel");
  const throughput = parseArray<ThroughputLedger>('throughput_ledger', "throughput");

  return {
    channels: channels.list,
    throughput: throughput.list,
    total_channels: channels.total,
    total_throughput: throughput.total,
  };
};

// ═══════════════════════════════════════════════════════════════
// FILTER LOGIC
// ═══════════════════════════════════════════════════════════════

const filterData = (
  data: { channels: ChannelRegistry[]; throughput: ThroughputLedger[] },
  filterLevel: string
): FilteredOutput => {
  const start = nanoseconds();
  
  // Enrich with R-scores
  const enrichedChannels = data.channels.map(ch => {
    const r = ch.r_score ?? calculateChannelR(ch);
    const level = ch.risk_level ?? determineRiskLevel(r, "channel");
    return { ...ch, r_score: r, risk_level: level };
  });
  
  const enrichedThroughput = data.throughput.map(tp => {
    const r = tp.r_score ?? calculateThroughputR(tp);
    const level = tp.risk_level ?? determineRiskLevel(r, "throughput");
    return { ...tp, r_score: r, risk_level: level };
  });
  
  // Apply filter
  const shouldInclude = (item: {risk_level?: string}): boolean => {
    if (filterLevel === "all") return true;
    return item.risk_level === filterLevel;
  };
  
  const filtered: FilteredOutput = {
    meta: {
      source_file: "",
      filter_applied: filterLevel,
      timestamp: new Date().toISOString(),
      total_channels: enrichedChannels.length,
      filtered_channels: 0,
      total_throughput: enrichedThroughput.length,
      filtered_throughput: 0,
      bun_version: Bun.version
    },
    channels: enrichedChannels.filter(shouldInclude),
    throughput: enrichedThroughput.filter(shouldInclude)
  };
  
  filtered.meta.filtered_channels = filtered.channels.length;
  filtered.meta.filtered_throughput = filtered.throughput.length;
  filtered.meta.processing_latency_ns = nanoseconds() - start;
  
  return filtered;
};

// ═══════════════════════════════════════════════════════════════
// OUTPUT FORMATTERS — 20 Column Matrix
// ═══════════════════════════════════════════════════════════════

const formatTable = (data: FilteredOutput, project: string): string => {
  const p = PROJECT_PALETTE[project] || PROJECT_PALETTE["legacy.cli"];
  const colorFor = (risk?: string): string => {
    if (risk === "high") return getProjectStatusColor(project, "critical");
    if (risk === "medium") return getProjectStatusColor(project, "warning");
    if (risk === "low") return getProjectStatusColor(project, "success");
    return getProjectStatusColor(project, "info");
  };
  const reset = "\x1b[0m";
  const rows = [
    ...data.channels.map(ch => ({
      Project: `${p.glyph}`,
      Type: "CH",
      ID: ch.channel_id,
      Hex: ch.hex_red_value,
      Coverage: `${ch.coverage_pct}%`,
      R: ch.r_score?.toFixed(3),
      C: ch.byte_position,
      E: Math.floor((100 - ch.coverage_pct) / 5),
      Sync: ch.is_synced ? "✓" : "✗",
      Owner: ch.owner_code,
      Engine: ch.engine_type,
      Risk: `${colorFor(ch.risk_level)}${ch.risk_level?.toUpperCase()}${reset}`
    })),
    ...data.throughput.map(tp => ({
      Project: `${p.glyph}`,
      Type: "TP",
      ID: tp.operation_code,
      Latency: tp.latency_p99,
      Eff: `${tp.efficiency_pct}/10`,
      R: tp.r_score?.toFixed(3),
      Mem: tp.memory_used,
      CPU: `${tp.cpu_percent}%`,
      JIT: tp.jit_enabled ? "✓" : "✗",
      AVX: tp.avx_accel ? "✓" : "✗",
      Risk: `${colorFor(tp.risk_level)}${tp.risk_level?.toUpperCase()}${reset}`
    }))
  ];
  
  const header = renderProjectHeader(project);
  return `${header}\n${Bun.inspect.table(rows, undefined, { colors: true })}`;
};

const formatToml = (data: FilteredOutput): string => {
  let out = `# Filtered Registry Color Channel\n`;
  out += `# Filter: ${data.meta.filter_applied}\n`;
  out += `# Timestamp: ${data.meta.timestamp}\n`;
  out += `# Source: ${data.meta.source_file}\n\n`;
  
  data.channels.forEach(ch => {
    out += `[[channel_registry]]\n`;
    out += `channel_id = "${ch.channel_id}"\n`;
    out += `hex_red_value = "${ch.hex_red_value}"\n`;
    out += `coverage_pct = ${ch.coverage_pct}\n`;
    out += `is_synced = ${ch.is_synced}\n`;
    out += `byte_position = ${ch.byte_position}\n`;
    out += `tier_level = ${ch.tier_level}\n`;
    out += `# R-Score: ${ch.r_score} (${ch.risk_level})\n\n`;
  });
  
  data.throughput.forEach(tp => {
    out += `[[throughput_ledger]]\n`;
    out += `operation_code = "${tp.operation_code}"\n`;
    out += `latency_p99 = "${tp.latency_p99}"\n`;
    out += `efficiency_pct = ${tp.efficiency_pct}\n`;
    out += `jit_enabled = ${tp.jit_enabled}\n`;
    out += `avx_accel = ${tp.avx_accel}\n`;
    out += `# R-Score: ${tp.r_score} (${tp.risk_level})\n\n`;
  });
  
  return out;
};

// ═══════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════

const printHelp = (): void => {
  logger.info(`
registry-color-channel-cli.ts — Tier-1380 Color Channel Risk Filter

Usage:
  bun run registry-color-channel-cli.ts [file] [options]

Options:
  --filter=<level>    Filter by risk: high | medium | low | all (default: all)
  --format=<type>     Output format: toml | json | table (default: table)
  --output=<path>     Write to file instead of stdout
  --project=<name>    Project palette key (default: com.tier1380.registry)
  --native-toml       Force native TOML import (fast path)
  --cache=<path>      Cache parsed TOML JSON to speed up subsequent runs
  --streaming-filter=<level>  Filter during parse (high|medium|low|all)
  --help              Show this help

Examples:
  # Show high-risk entries only
  bun run registry-color-channel-cli.ts registry-color-channel.toml --filter=high
  
  # Export high-risk to TOML for audit
  bun run registry-color-channel-cli.ts registry-color-channel.toml --filter=high --format=toml --output=high-risk-audit.toml
  
  # Pipe to jq for further processing
  bun run registry-color-channel-cli.ts registry-color-channel.toml --filter=medium --format=json | jq '.channels[] | select(.coverage_pct < 50)'
  
  # Quick check in CI
  bun run registry-color-channel-cli.ts registry-color-channel.toml --filter=high --format=json | grep -q "channels" && echo "High risk detected" || echo "OK"
`);
};

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  
  const getFlag = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.split("=")[1];
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const filePath = args.find(a => !a.startsWith("--")) || "registry-color-channel.toml";
  const filterArg = getFlag("filter") || "all";
  const formatArg = getFlag("format") || "table";
  const outputArg = getFlag("output");
  const projectArg = getFlag("project") || "com.tier1380.registry";
  const cachePath = getFlag("cache");
  const streamingFilter = getFlag("streaming-filter");
  const nativeToml = hasFlag("native-toml");
  const effectiveFilter = streamingFilter || filterArg;
  const projectArg = args.find(a => a.startsWith("--project="))?.split("=")[1] || "com.tier1380.registry";
  
  if (!["high", "medium", "low", "all"].includes(effectiveFilter)) {
    logger.error(`Error: Invalid filter "${effectiveFilter}". Use: high, medium, low, all`);
    process.exit(1);
  }
  
  const start = nanoseconds();
  
  try {
    let raw: { channels: ChannelRegistry[]; throughput: ThroughputLedger[]; total_channels: number; total_throughput: number };
    if (cachePath) {
      try {
        const cacheFile = Bun.file(cachePath);
        const cacheExists = await cacheFile.exists();
        if (cacheExists) {
          const [srcStat, cacheStat] = await Promise.all([stat(filePath), stat(cachePath)]);
          if (cacheStat.mtimeMs >= srcStat.mtimeMs) {
            raw = JSON.parse(await cacheFile.text());
          } else {
            raw = await parseTomlFast(filePath, { nativeToml, streamingFilter });
            await Bun.write(cachePath, JSON.stringify(raw));
          }
        } else {
          raw = await parseTomlFast(filePath, { nativeToml, streamingFilter });
          await Bun.write(cachePath, JSON.stringify(raw));
        }
      } catch {
        raw = await parseTomlFast(filePath, { nativeToml, streamingFilter });
      }
    } else {
      raw = await parseTomlFast(filePath, { nativeToml, streamingFilter });
    }

    const filtered = filterData({ channels: raw.channels, throughput: raw.throughput }, effectiveFilter);
    filtered.meta.source_file = filePath;
    filtered.meta.total_channels = raw.total_channels ?? filtered.meta.total_channels;
    filtered.meta.total_throughput = raw.total_throughput ?? filtered.meta.total_throughput;
    
    let output: string;
    switch(formatArg) {
      case "json":
        output = JSON.stringify(filtered, null, 2);
        break;
      case "toml":
        output = formatToml(filtered);
        break;
      case "table":
      default:
        output = formatTable(filtered, projectArg);
        output += `\n[Filtered: ${filtered.meta.filtered_channels}ch/${filtered.meta.filtered_throughput}tp from ${filtered.meta.total_channels}ch/${filtered.meta.total_throughput}tp]`;
    }
    
    if (outputArg) {
      await Bun.write(outputArg, output);
      logger.info(`Written to: ${outputArg}`);
    } else {
      // Keep console.log for actual output to stdout
      console.log(output);
    }
    
    const totalLat = nanoseconds() - start;
    logger.debug(`\x1b[90m[${totalLat}ns|${filtered.meta.filtered_channels + filtered.meta.filtered_throughput}items|R:${effectiveFilter}]\x1b[0m`);
    
    // Exit code based on risk detection (useful for CI)
    if (effectiveFilter !== "all" && (filtered.meta.filtered_channels > 0 || filtered.meta.filtered_throughput > 0)) {
      process.exit(0); // Found items matching filter
    } else if (effectiveFilter !== "all") {
      process.exit(1); // No items found for filter
    }
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    logger.error(`\x1b[31mError: ${errorMessage}\x1b[0m`);
    process.exit(2);
  }
}
