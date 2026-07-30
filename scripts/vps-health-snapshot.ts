#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// VPS health snapshot — writes to public/registry/vps-health.json for portal display
// Called by: spine maintenance or cron

const VPS = 'root@100.64.250.26';
const OUTPUT = `${import.meta.dir}/../public/registry/vps-health.json`;

interface VpsHealth {
  timestamp: string;
  hostname: string;
  uptime: string;
  disk: { used: string; free: string; percent: string };
  memory: { total: string; used: string; available: string };
  services: Record<string, string>;
  docker: Record<string, string>;
}

function ssh(cmd: string): string {
  const remote = cmd.replace(/"/g, '\\"');
  const result = Bun.spawnSync(
    ['ssh', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=5', VPS, remote],
    { timeout: 15_000, stdout: 'pipe', stderr: 'pipe' }
  );
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim() || `ssh exit ${result.exitCode}`);
  }
  return result.stdout.toString().trim();
}

async function main(): Promise<void> {
  const health: VpsHealth = {
    timestamp: new Date().toISOString(),
    hostname: '',
    uptime: '',
    disk: { used: '', free: '', percent: '' },
    memory: { total: '', used: '', available: '' },
    services: {},
    docker: {},
  };

  try {
    health.hostname = ssh('hostname');
    health.uptime = ssh('uptime -p');

    const df = ssh('df -h / | tail -1').split(/\s+/);
    health.disk = { used: df[2] || '', free: df[3] || '', percent: df[4] || '' };

    const mem = ssh('free -h | grep Mem').split(/\s+/);
    health.memory = { total: mem[1] || '', used: mem[2] || '', available: mem[6] || '' };

    for (const s of ['bet-ticker-poller', 'cascade-mover', 'cascade-mover-mcp', 'cascade-token']) {
      health.services[s] = ssh(`systemctl is-active ${s}`);
    }

    const dockerPs = ssh("docker ps --format '{{.Names}} {{.Status}}'").split('\n');
    for (const line of dockerPs) {
      const [name, ...status] = line.split(' ');
      if (name) health.docker[name] = status.join(' ');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[vps-health] SSH failed:', msg);
  }

  await Bun.write(OUTPUT, JSON.stringify(health, null, 2));
  console.error(`[vps-health] Wrote ${OUTPUT} — ${health.hostname || 'unreachable'}`);
}

if (import.meta.main) {
  await main();
}
