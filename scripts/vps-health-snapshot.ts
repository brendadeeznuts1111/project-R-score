#!/usr/bin/env bun
// VPS health snapshot — writes to public/registry/vps-health.json for portal display
// Called by: spine maintenance or cron
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const VPS = "root@100.64.250.26";
const OUTPUT = resolve(import.meta.dir, "../public/registry/vps-health.json");

interface VpsHealth {
  timestamp: string;
  hostname: string;
  uptime: string;
  disk: { used: string; free: string; percent: string };
  memory: { total: string; used: string; available: string };
  services: Record<string, string>;
  docker: Record<string, string>;
}

async function main() {
  const health: VpsHealth = {
    timestamp: new Date().toISOString(),
    hostname: "",
    uptime: "",
    disk: { used: "", free: "", percent: "" },
    memory: { total: "", used: "", available: "" },
    services: {},
    docker: {},
  };

  try {
    const ssh = (cmd: string) => execSync(
      `ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 ${VPS} "${cmd.replace(/"/g, '\\"')}"`,
      { timeout: 15000, encoding: "utf-8" }
    ).trim();

    health.hostname = ssh("hostname");
    health.uptime = ssh("uptime -p");

    const df = ssh("df -h / | tail -1").split(/\s+/);
    health.disk = { used: df[2] || "", free: df[3] || "", percent: df[4] || "" };

    const mem = ssh("free -h | grep Mem").split(/\s+/);
    health.memory = { total: mem[1] || "", used: mem[2] || "", available: mem[6] || "" };

    for (const s of ["bet-ticker-poller", "cascade-mover", "cascade-mover-mcp", "cascade-token"]) {
      health.services[s] = ssh(`systemctl is-active ${s}`);
    }

    const dockerPs = ssh("docker ps --format '{{.Names}} {{.Status}}'").split("\n");
    for (const line of dockerPs) {
      const [name, ...status] = line.split(" ");
      if (name) health.docker[name] = status.join(" ");
    }
  } catch (e) {
    console.error("[vps-health] SSH failed:", e.message);
  }

  writeFileSync(OUTPUT, JSON.stringify(health, null, 2));
  console.error(`[vps-health] Wrote ${OUTPUT} — ${health.hostname || "unreachable"}`);
}

main();
