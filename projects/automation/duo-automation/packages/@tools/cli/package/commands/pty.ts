/**
 * §Bun:132 - PTY Specialized Shell Commands
 * @pattern CLI:132
 * @perf <10ms startup
 */

import { Command } from 'commander';
import { TerminalBridge } from '../../src/utils/terminal-bridge';
import { AuthManager } from '../../src/rbac/auth-context';
import { PERMISSIONS } from '../../src/rbac/permissions';

export function registerPtyCommands(program: Command) {
  const pty = program.command('pty')
    .description('Interactive PTY shell manager');

  pty.command('sniff')
    .description('Launch interactive live proxy sniffer (PTY)')
    .action(async () => {
      await launchShell('sniff');
    });

  pty.command('health')
    .description('Launch live subsystem health tracer')
    .action(async () => {
      await launchShell('health');
    });

  pty.command('trace')
    .description('Launch interactive trace logger')
    .action(async () => {
      await launchShell('trace');
    });

  pty.command('audit')
    .description('Run §Storage:132 compliance audit')
    .action(async () => {
      await launchShell('audit');
    });
}

async function launchShell(type: 'sniff' | 'health' | 'trace' | 'audit') {
  if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
    console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.METRICS}`);
    process.exit(1);
  }

  const bridge = TerminalBridge.getInstance();
  console.log(`🚀 Spawning Specialized Shell [${type.toUpperCase()}]...`);
  
  const result = await bridge.spawnSpecializedShell(type);
  const { terminalId, pid } = result.result;
  
  console.log(`📡 PTY Session [ID: ${terminalId}, PID: ${pid}] active.\n`);
  
  bridge.streamOutput(terminalId, (data) => {
    process.stdout.write(data);
  });

  // Handle termination
  process.on('SIGINT', () => {
    console.log(`\nStopping ${type} session...`);
    process.exit(0);
  });
}

// Fallback for legacy registration
const ptyCommand = new Command('sniff')
  .description('Launch interactive live proxy sniffer (PTY)')
  .action(async () => {
    await launchShell('sniff');
  });

export { ptyCommand };
