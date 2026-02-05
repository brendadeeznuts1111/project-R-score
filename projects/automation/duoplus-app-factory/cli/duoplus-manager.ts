#!/usr/bin/env bun

/**
 * DuoPlus Cloud Phone Manager CLI
 * Interactive TUI for managing DuoPlus cloud phone fleet
 *
 * API Documentation: https://help.duoplus.net/docs/api-reference
 *
 * Usage:
 *   DUOPLUS_API_KEY=your_key bun cli/duoplus-manager.ts
 *
 * Hotkeys:
 *   P - Power On/Off toggle
 *   R - Restart device
 *   A - Toggle ADB
 *   E - Execute ADB command
 *   L - Stream logcat
 *   I - Show device info
 *   F - Refresh
 *   Q - Quit
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { DuoPlusAPI, Device } from './lib/duo-plus-api';

// Validate API key
const API_KEY = process.env.DUOPLUS_API_KEY;
if (!API_KEY) {
  console.error('❌ Error: DUOPLUS_API_KEY environment variable required');
  console.error('Get your API key from: https://my.duoplus.net/api');
  process.exit(1);
}

const api = new DuoPlusAPI(API_KEY);
let devices: Device[] = [];
let selectedIndex = 0;
let logcatCleanup: (() => void) | null = null;

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: '🎮 DuoPlus Device Manager',
  mouse: true,
  border: 'line',
});

// Grid layout (12 rows, 12 cols)
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// Device table
const deviceTable = grid.set(0, 0, 7, 12, contrib.table, {
  keys: true,
  fg: 'white',
  selectedFg: 'black',
  selectedBg: 'cyan',
  interactive: true,
  label: ' 📱 Devices ',
  width: '100%',
  height: '100%',
  columnSpacing: 2,
  columnWidth: [8, 20, 12, 15, 12, 10],
});

// Logcat panel
const logcatPanel = grid.set(7, 0, 4, 12, blessed.log, {
  label: ' 📋 Logcat ',
  scrollable: true,
  scrollback: 500,
  mouse: true,
  keys: true,
  vi: true,
});

// Status bar
const statusBar = grid.set(11, 0, 1, 12, blessed.box, {
  content: '{center}(P)ower | (R)estart | (A)DB | (E)xec | (L)ogcat | (I)nfo | (F)Refresh | (Q)uit{/center}',
  style: {
    fg: 'white',
    bg: 'blue',
  },
});

// Helper: Get selected device
function getSelectedDevice(): Device | null {
  return devices[selectedIndex] || null;
}

// Status label helper
function getStatusLabel(status: Device['status']): string {
  const labels: Record<Device['status'], string> = {
    running: '🟢 On',
    stopped: '🔴 Off',
    provisioning: '🟡 Starting',
    error: '❌ Error',
    expired: '⏰ Expired',
  };
  return labels[status] || status;
}

// Helper: Update device table
function updateDeviceTable() {
  const rows = devices.map((d) => [
    d.image_id?.slice(0, 8) || d.id?.slice(0, 8) || 'N/A',
    d.name || 'Unnamed',
    getStatusLabel(d.status),
    d.ip_address || d.ip || 'N/A',
    d.adb_status === 1 ? '✅' : '❌',
    d.expired_at ? new Date(d.expired_at).toLocaleDateString() : 'N/A',
  ]);

  deviceTable.setData({
    headers: ['ID', 'Name', 'Status', 'IP', 'ADB', 'Expires'],
    data: rows,
  });

  screen.render();
}

// Helper: Show message
function showMessage(msg: string, type: 'info' | 'error' | 'success' = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  logcatPanel.log(`${prefix} ${msg}`);
  screen.render();
}

// Refresh devices
async function refreshDevices() {
  try {
    showMessage('Refreshing devices...');
    devices = await api.listDevices();
    updateDeviceTable();
    showMessage(`Loaded ${devices.length} device(s)`, 'success');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    showMessage(`Failed to load devices: ${msg}`, 'error');
  }
}

// Get device ID (image_id is the primary identifier in DuoPlus API)
function getDeviceId(device: Device): string {
  return device.image_id || device.id;
}

// Power toggle (on/off)
async function togglePower() {
  const device = getSelectedDevice();
  if (!device) {
    showMessage('No device selected', 'error');
    return;
  }

  const deviceId = getDeviceId(device);
  try {
    if (device.status === 'running') {
      showMessage(`Powering off ${device.name}...`);
      await api.stopDevice(deviceId);
      showMessage(`✅ Power off initiated: ${device.name}`, 'success');
    } else {
      showMessage(`Powering on ${device.name}...`);
      await api.startDevice(deviceId);
      showMessage(`✅ Power on initiated: ${device.name}`, 'success');
    }
    await refreshDevices();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    showMessage(`Power toggle failed: ${msg}`, 'error');
  }
}

// Restart device
async function restartDevice() {
  const device = getSelectedDevice();
  if (!device) {
    showMessage('No device selected', 'error');
    return;
  }

  const deviceId = getDeviceId(device);
  try {
    showMessage(`Restarting ${device.name}...`);
    await api.rebootDevice(deviceId);
    showMessage(`✅ Restart initiated: ${device.name}`, 'success');
    await refreshDevices();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    showMessage(`Restart failed: ${msg}`, 'error');
  }
}

// Toggle ADB
async function toggleAdb() {
  const device = getSelectedDevice();
  if (!device) {
    showMessage('No device selected', 'error');
    return;
  }

  const deviceId = getDeviceId(device);
  try {
    if (device.adb_status === 1) {
      showMessage(`Disabling ADB on ${device.name}...`);
      await api.batchDisableAdb([deviceId]);
      showMessage(`✅ ADB disabled: ${device.name}`, 'success');
    } else {
      showMessage(`Enabling ADB on ${device.name}...`);
      await api.batchEnableAdb([deviceId]);
      showMessage(`✅ ADB enabled: ${device.name}`, 'success');
    }
    await refreshDevices();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    showMessage(`ADB toggle failed: ${msg}`, 'error');
  }
}

// Execute ADB command
async function executeAdb() {
  const device = getSelectedDevice();
  if (!device) {
    showMessage('No device selected', 'error');
    return;
  }

  const deviceId = getDeviceId(device);
  // Simple command prompt using blessed
  const prompt = blessed.prompt({
    parent: screen,
    border: 'line',
    height: 'shrink',
    width: 'half',
    top: 'center',
    left: 'center',
    label: ' ADB Command ',
    tags: true,
    keys: true,
    vi: true,
  });

  prompt.input('Enter ADB command:', '', async (err, value) => {
    if (err || !value) {
      prompt.destroy();
      screen.render();
      return;
    }

    try {
      showMessage(`Executing: ${value}...`);
      const output = await api.executeAdbCommand(deviceId, value);
      logcatPanel.log(`$ ${value}`);
      output.split('\n').forEach((line) => logcatPanel.log(line));
      screen.render();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      showMessage(`ADB command failed: ${msg}`, 'error');
    }

    prompt.destroy();
    screen.render();
  });
}

// Show device info
async function showDeviceInfo() {
  const device = getSelectedDevice();
  if (!device) {
    showMessage('No device selected', 'error');
    return;
  }

  const deviceId = getDeviceId(device);
  try {
    showMessage(`Loading info for ${device.name}...`);
    const details = await api.getDeviceDetails(deviceId);
    logcatPanel.log('─'.repeat(40));
    logcatPanel.log(`Device: ${details.name}`);
    logcatPanel.log(`ID: ${deviceId}`);
    logcatPanel.log(`Status: ${getStatusLabel(details.status)}`);
    logcatPanel.log(`IP: ${details.ip_address || 'N/A'}`);
    logcatPanel.log(`ADB: ${details.adb_status === 1 ? 'Enabled' : 'Disabled'}`);
    logcatPanel.log(`Expires: ${details.expired_at || 'N/A'}`);
    logcatPanel.log('─'.repeat(40));
    screen.render();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    showMessage(`Info failed: ${msg}`, 'error');
  }
}

// Stream logcat
async function streamLogcat() {
  const device = getSelectedDevice();
  if (!device) {
    showMessage('No device selected', 'error');
    return;
  }

  const deviceId = getDeviceId(device);
  try {
    if (logcatCleanup) {
      logcatCleanup();
      logcatCleanup = null;
      showMessage('Logcat stream stopped');
      return;
    }

    showMessage(`Connecting to logcat for ${device.name}...`);
    logcatCleanup = await api.streamLogcat(
      deviceId,
      (log) => {
        logcatPanel.log(log);
        screen.render();
      },
      (error) => {
        showMessage(`Logcat error: ${error.message}`, 'error');
        logcatCleanup = null;
      }
    );
    showMessage(`✅ Logcat streaming from ${device.name}`, 'success');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    showMessage(`Logcat failed: ${msg}`, 'error');
    logcatCleanup = null;
  }
}

// Hotkeys
screen.key(['p', 'P'], togglePower);
screen.key(['r', 'R'], restartDevice);
screen.key(['a', 'A'], toggleAdb);
screen.key(['e', 'E'], executeAdb);
screen.key(['l', 'L'], streamLogcat);
screen.key(['i', 'I'], showDeviceInfo);
screen.key(['f', 'F'], refreshDevices);
screen.key(['q', 'Q', 'C-c'], () => {
  if (logcatCleanup) logcatCleanup();
  process.exit(0);
});

// Track selected row
deviceTable.on('select', (item, index) => {
  selectedIndex = index;
});

// Initial load
showMessage('🚀 DuoPlus Cloud Phone Manager started');
showMessage('📡 Connecting to https://openapi.duoplus.net...');
refreshDevices();
screen.render();
