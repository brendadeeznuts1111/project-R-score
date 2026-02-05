#!/usr/bin/env bun

/**
 * Mobile Wallet Simulator CLI
 * Manages Android emulators for Lightning wallet testing
 * 
 * Usage:
 *   bun run cli/mobile-simulator.ts
 * 
 * Hotkeys:
 *   S - Start selected AVD
 *   K - Kill selected AVD
 *   I - Install APK
 *   L - Stream logcat
 *   T - Test payment simulation
 *   C - Compliance check
 *   R - Refresh AVD list
 *   Q - Quit
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import blessed from 'blessed';
import contrib from 'blessed-contrib';

interface AVD {
  name: string;
  status: 'offline' | 'running' | 'booting';
  apiLevel: number;
  deviceId?: string;
  arch: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'send' | 'receive';
  timestamp: Date;
  complianceChecked: boolean;
  notes: string;
}

class MobileWalletSimulator {
  private avdList: AVD[] = [];
  private transactions: Transaction[] = [];
  private screen: blessed.Widgets.Screen;
  private grid: contrib.grid;
  private selectedIndex = 0;
  private avdTable: contrib.Widgets.TableElement;
  private logcatPanel: blessed.Widgets.Log;
  private txTable: contrib.Widgets.TableElement;
  private statusBar: blessed.Widgets.BoxElement;
  private currentLogcat: ReturnType<typeof spawn> | null = null;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: '📱 Mobile Wallet Simulator',
      fullUnicode: true,
    });

    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });
    this.avdTable = this.setupAVDTable();
    this.logcatPanel = this.setupLogcatPanel();
    this.txTable = this.setupTxTable();
    this.statusBar = this.setupStatusBar();
    
    this.refreshAVDs();
    this.setupHotkeys();
    this.screen.render();
  }

  private setupAVDTable(): contrib.Widgets.TableElement {
    const table = this.grid.set(0, 0, 6, 8, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'black',
      selectedBg: 'cyan',
      interactive: true,
      label: ' 📱 Android Virtual Devices ',
      columnSpacing: 2,
      columnWidth: [22, 14, 10, 8],
    });

    table.on('select', (_, index: number) => {
      this.selectedIndex = index;
      const avd = this.avdList[index];
      if (avd) {
        this.updateStatus(`Selected: ${avd.name} (${avd.status})`);
      }
    });

    return table;
  }

  private setupLogcatPanel(): blessed.Widgets.Log {
    return this.grid.set(6, 0, 4, 12, blessed.log, {
      label: ' 📋 ADB Logcat (Lightning) ',
      scrollable: true,
      scrollback: 1000,
      mouse: true,
      keys: true,
      vi: true,
      border: { type: 'line' },
      style: { fg: 'cyan', border: { fg: 'blue' } },
    });
  }

  private setupTxTable(): contrib.Widgets.TableElement {
    return this.grid.set(0, 8, 6, 4, contrib.table, {
      label: ' 💰 Transactions ',
      columnSpacing: 1,
      columnWidth: [10, 10, 6],
      fg: 'green',
    });
  }

  private setupStatusBar(): blessed.Widgets.BoxElement {
    return this.grid.set(10, 0, 2, 12, blessed.box, {
      content: '{center}(S)tart | (K)ill | (I)nstall APK | (L)ogcat | (T)est Payment | (C)ompliance | (R)efresh | (Q)uit{/center}',
      tags: true,
      border: { type: 'line' },
      style: { fg: 'yellow', border: { fg: 'yellow' } },
    });
  }

  private updateStatus(message: string) {
    this.statusBar.setContent(`{center}📢 ${message}{/center}`);
    this.screen.render();
  }

  private log(message: string) {
    this.logcatPanel.log(message);
    this.screen.render();
  }

  private async refreshAVDs() {
    try {
      // Get AVD list from emulator command
      let avdNames: string[] = [];
      try {
        const output = execSync('emulator -list-avds 2>/dev/null', { encoding: 'utf-8' });
        avdNames = output.trim().split('\n').filter(name => name.length > 0);
      } catch {
        this.log('⚠️  No AVDs found or emulator not in PATH');
      }

      // Get running devices from adb
      const runningDevices = new Map<string, string>();
      try {
        const devicesOutput = execSync('adb devices -l 2>/dev/null', { encoding: 'utf-8' });
        const deviceLines = devicesOutput.trim().split('\n').slice(1);
        deviceLines.forEach(line => {
          const parts = line.split(/\s+/);
          if (parts.length >= 2 && parts[1] === 'device') {
            runningDevices.set(parts[0], parts[0]);
          }
        });
      } catch {
        this.log('⚠️  adb not available');
      }

      this.avdList = avdNames.map(name => ({
        name,
        status: this.isEmulatorRunning(name) ? 'running' : 'offline',
        apiLevel: this.extractApiLevel(name),
        arch: name.toLowerCase().includes('x86') ? 'x86_64' : 'arm64',
        deviceId: runningDevices.get(name),
      }));

      // Add any running emulators not in AVD list
      if (runningDevices.size > 0 && this.avdList.length === 0) {
        runningDevices.forEach((id, name) => {
          this.avdList.push({
            name: id,
            status: 'running',
            apiLevel: 33,
            arch: 'unknown',
            deviceId: id,
          });
        });
      }

      this.updateAVDTable();
      this.log(`✅ Found ${this.avdList.length} AVD(s), ${runningDevices.size} running`);
    } catch (error) {
      this.log(`❌ Error refreshing AVDs: ${error}`);
    }
  }

  private isEmulatorRunning(avdName: string): boolean {
    try {
      const output = execSync('adb devices 2>/dev/null', { encoding: 'utf-8' });
      return output.includes('emulator') || output.includes('device');
    } catch {
      return false;
    }
  }

  private extractApiLevel(name: string): number {
    const match = name.match(/API[_-]?(\d+)/i);
    return match ? parseInt(match[1]) : 33;
  }

  private updateAVDTable() {
    const rows = this.avdList.map(avd => [
      avd.name.substring(0, 20),
      avd.status === 'running' ? '✅ Running' : '⭕ Offline',
      `API ${avd.apiLevel}`,
      avd.arch,
    ]);

    this.avdTable.setData({
      headers: ['AVD Name', 'Status', 'API', 'Arch'],
      data: rows.length > 0 ? rows : [['No AVDs found', '', '', '']],
    });
    this.screen.render();
  }

  private getSelectedAVD(): AVD | null {
    return this.avdList[this.selectedIndex] || null;
  }

  private async startAVD() {
    const avd = this.getSelectedAVD();
    if (!avd) {
      this.log('❌ No AVD selected');
      return;
    }

    if (avd.status === 'running') {
      this.log(`⚠️  ${avd.name} is already running`);
      return;
    }

    this.log(`🚀 Starting ${avd.name}...`);
    this.updateStatus(`Starting ${avd.name}...`);

    try {
      const emulator = spawn('emulator', [
        `@${avd.name}`,
        '-no-snapshot-load',
        '-no-boot-anim',
        '-no-audio',
        '-gpu', 'swiftshader_indirect',
      ], { detached: true, stdio: 'ignore' });

      emulator.unref();
      this.log(`⏳ Emulator starting (takes ~30s)...`);

      // Wait and refresh
      setTimeout(() => this.refreshAVDs(), 30000);
    } catch (error) {
      this.log(`❌ Failed to start: ${error}`);
    }
  }

  private async killAVD() {
    const avd = this.getSelectedAVD();
    if (!avd) {
      this.log('❌ No AVD selected');
      return;
    }

    if (avd.status !== 'running') {
      this.log(`⚠️  ${avd.name} is not running`);
      return;
    }

    this.log(`🛑 Stopping ${avd.name}...`);

    try {
      execSync(`adb -s ${avd.deviceId || 'emulator-5554'} emu kill 2>/dev/null`, { stdio: 'ignore' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.refreshAVDs();
      this.log(`✅ ${avd.name} stopped`);
    } catch {
      try {
        execSync(`pkill -f "emulator.*${avd.name}"`, { stdio: 'ignore' });
        this.log(`✅ ${avd.name} force stopped`);
      } catch {
        this.log(`❌ Failed to stop ${avd.name}`);
      }
    }
  }

  private installAPK() {
    const avd = this.getSelectedAVD();
    if (!avd || avd.status !== 'running') {
      this.log('❌ No running AVD selected');
      return;
    }

    const sampleAPK = './sample-lightning-wallet.apk';
    if (!fs.existsSync(sampleAPK)) {
      this.log('⚠️  No APK found at ./sample-lightning-wallet.apk');
      this.log('   Download a Lightning wallet APK to test');
      return;
    }

    this.log(`📦 Installing APK to ${avd.name}...`);

    try {
      execSync(`adb -s ${avd.deviceId || 'emulator-5554'} install -r ${sampleAPK}`, { encoding: 'utf-8' });
      this.log('✅ APK installed successfully');
    } catch (error) {
      this.log(`❌ Install failed: ${error}`);
    }
  }

  private streamLogcat() {
    const avd = this.getSelectedAVD();
    if (!avd || avd.status !== 'running') {
      this.log('❌ No running AVD selected');
      return;
    }

    if (this.currentLogcat) {
      this.currentLogcat.kill();
      this.currentLogcat = null;
      this.log('⏹️  Logcat stopped');
      return;
    }

    this.log(`📋 Starting logcat for ${avd.name}...`);

    const deviceId = avd.deviceId || 'emulator-5554';
    this.currentLogcat = spawn('adb', ['-s', deviceId, 'logcat', '-v', 'time']);

    this.currentLogcat.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.match(/lightning|bitcoin|lnd|btc|satoshi|invoice|payment|channel/i)) {
          this.log(`⚡ ${line.substring(0, 100)}`);
        }
      });
    });

    this.currentLogcat.stderr.on('data', (data: Buffer) => {
      this.log(`❌ ${data.toString()}`);
    });

    this.currentLogcat.on('close', () => {
      this.log('📋 Logcat stream ended');
      this.currentLogcat = null;
    });
  }

  private simulatePayment() {
    const avd = this.getSelectedAVD();
    const amount = Math.floor(Math.random() * 50000) + 1000;
    const type: 'send' | 'receive' = Math.random() > 0.5 ? 'send' : 'receive';

    const tx: Transaction = {
      id: `ln_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      amount,
      type,
      timestamp: new Date(),
      complianceChecked: false,
      notes: `Simulated ${type} ${avd ? `to/from ${avd.name}` : ''}`,
    };

    this.transactions.unshift(tx);
    this.updateTxTable();

    const icon = type === 'send' ? '📤' : '📥';
    this.log(`${icon} Simulated ${type}: ${amount.toLocaleString()} sats`);
    this.log(`   TX ID: ${tx.id}`);
  }

  private runComplianceCheck() {
    this.log('🔍 Running compliance check...');

    let flagged = 0;
    this.transactions.forEach(tx => {
      if (!tx.complianceChecked) {
        tx.complianceChecked = true;
        if (tx.amount > 1000000) {
          tx.notes += ' | ⚠️ Large TX flagged';
          flagged++;
        } else {
          tx.notes += ' | ✅ Cleared';
        }
      }
    });

    this.updateTxTable();
    this.log(`✅ Compliance check complete: ${flagged} flagged, ${this.transactions.length - flagged} cleared`);
  }

  private updateTxTable() {
    const rows = this.transactions.slice(0, 8).map(tx => [
      tx.type === 'send' ? '📤 Send' : '📥 Recv',
      `${(tx.amount / 1000).toFixed(1)}k`,
      tx.complianceChecked ? '✅' : '⏳',
    ]);

    this.txTable.setData({
      headers: ['Type', 'Sats', 'Check'],
      data: rows.length > 0 ? rows : [['No transactions', '', '']],
    });
    this.screen.render();
  }

  private setupHotkeys() {
    this.screen.key(['s', 'S'], () => this.startAVD());
    this.screen.key(['k', 'K'], () => this.killAVD());
    this.screen.key(['i', 'I'], () => this.installAPK());
    this.screen.key(['l', 'L'], () => this.streamLogcat());
    this.screen.key(['t', 'T'], () => this.simulatePayment());
    this.screen.key(['c', 'C'], () => this.runComplianceCheck());
    this.screen.key(['r', 'R'], () => this.refreshAVDs());

    this.screen.key(['q', 'Q', 'C-c'], () => {
      if (this.currentLogcat) this.currentLogcat.kill();
      process.exit(0);
    });
  }
}

// Run if executed directly
if (import.meta.main) {
  console.log('📱 Mobile Wallet Simulator starting...');

  let hasEmulator = false;
  let hasAdb = false;

  try {
    execSync('which emulator 2>/dev/null', { stdio: 'ignore' });
    hasEmulator = true;
  } catch {}

  try {
    execSync('which adb 2>/dev/null', { stdio: 'ignore' });
    hasAdb = true;
  } catch {}

  if (!hasEmulator && !hasAdb) {
    console.error('⚠️  Android SDK tools not found in PATH');
    console.error('   Install Android Studio and add to PATH:');
    console.error('   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools');
    console.error('');
    console.error('   Continuing in demo mode...');
  }

  new MobileWalletSimulator();
}

export { MobileWalletSimulator, AVD, Transaction };
