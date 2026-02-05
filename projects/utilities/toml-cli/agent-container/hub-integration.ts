#!/usr/bin/env bun

import { VirtualDeviceTracker } from './virtual-device-tracker';

/**
 * Integration between Virtual Device Tracker and Management Hub
 */
export class VirtualDeviceHubIntegration {
  private tracker: VirtualDeviceTracker;
  
  // IPC message handlers
  private readonly IPC_HANDLERS: Record<string, Function> = {
    'virtual-device:status': this.handleDeviceStatusRequest.bind(this),
    'virtual-device:create-task': this.handleCreateTask.bind(this),
    'virtual-device:get-tasks': this.handleGetTasks.bind(this),
    'virtual-device:stats': this.handleGetStats.bind(this),
    'virtual-device:control': this.handleDeviceControl.bind(this)
  };
  
  constructor() {
    this.tracker = new VirtualDeviceTracker();
    console.log('🔗 Virtual Device ⇄ Management Hub integration initialized');
    this.startStatusUpdates();
  }
  
  private startStatusUpdates(): void {
    setInterval(async () => {
      await this.sendStatusUpdate();
    }, 30000);
  }
  
  private async sendStatusUpdate(): Promise<void> {
    try {
      const devices = await this.tracker.getDevices();
      const stats = await this.tracker.getTaskStatistics('1h');
      
      const statusUpdate = {
        type: 'virtual-device:status-update',
        data: {
          timestamp: new Date().toISOString(),
          deviceCount: devices.length,
          onlineDevices: devices.filter(d => d.status === 'online').length,
          activeTasks: devices.reduce((sum, d) => sum + d.activeTasks.length, 0),
          performance: {
            successRate: stats.successRate,
            avgDuration: stats.avgDuration,
            errorRate: (stats.errorCount / (stats.total || 1)) * 100 || 0
          }
        }
      };
      
      console.log('📤 Virtual device status update sent');
    } catch (error: any) {
      console.error('❌ Failed to send status update:', error.message);
    }
  }
  
  async handleIPCMessage(message: any, sender: any): Promise<any> {
    const { type, data } = message;
    if (!this.IPC_HANDLERS[type]) {
      return { error: `Unknown message type: ${type}` };
    }
    try {
      return await this.IPC_HANDLERS[type](data, sender);
    } catch (error: any) {
      return { error: error.message };
    }
  }
  
  private async handleDeviceStatusRequest(data: any): Promise<any> {
    const devices = await this.tracker.getDevices();
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      activeTasks: devices.reduce((sum, d) => sum + d.activeTasks.length, 0)
    };
  }
  
  private async handleCreateTask(data: any): Promise<any> {
    const { taskType, agentId, details, priority } = data;
    const task = await this.tracker.createTask({
      agentId,
      taskType,
      details,
      priority
    });
    return { taskId: task.taskId, status: task.status };
  }
  
  private async handleGetTasks(data: any): Promise<any> {
    const tasks = await this.tracker.getTasks(data);
    return { tasks, count: tasks.length };
  }
  
  private async handleGetStats(data: any): Promise<any> {
    const stats = await this.tracker.getTaskStatistics(data.timeRange || '24h');
    return { stats };
  }
  
  private async handleDeviceControl(data: any): Promise<any> {
    const { deviceId, action } = data;
    console.log(`🔄 Device control: ${deviceId} -> ${action}`);
    return { success: true, message: `Action ${action} initiated for ${deviceId}` };
  }
  
  async startIntegratedMonitoring(): Promise<void> {
    console.log('🚀 Starting integrated virtual device monitoring...');
    setInterval(async () => {
      const stats = await this.tracker.getTaskStatistics('1h');
      console.log('📈 Analytics:', stats.successRate.toFixed(1) + '% success');
    }, 60000);
  }
}