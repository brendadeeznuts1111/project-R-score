#!/usr/bin/env bun
// Family Sponsorship Controls - Guardian-Powered Teen Onboarding
// Part of FAMILY SPONSORSHIP CONTROLS EXPANDED detonation

import { feature } from 'bun:bundle';
import * as React from 'react';

// Types for Family Controls
interface SpendLimits {
  daily: number;
  weekly: number;
  monthly: number;
  perTransaction: number;
}

interface TeenProfile {
  id: string;
  email: string;
  age: number;
  name: string;
  teamSeats: number;
  currentSpend: number;
  allowanceEnabled: boolean;
  allowanceAmount: number;
  allowanceFrequency: 'daily' | 'weekly' | 'monthly';
}

interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  amount?: number;
  status: 'completed' | 'pending' | 'declined';
  guardianNotified: boolean;
}

interface ApprovalRequest {
  id: string;
  teenId: string;
  teenName: string;
  requestType: 'team_seat' | 'spend_increase' | 'feature_upgrade';
  amount: number;
  description: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'declined';
}

// Family Controls Manager
export class FamilyControlsManager {
  private static instance: FamilyControlsManager;
  
  static getInstance(): FamilyControlsManager {
    if (!FamilyControlsManager.instance) {
      FamilyControlsManager.instance = new FamilyControlsManager();
    }
    return FamilyControlsManager.instance;
  }

  // Update spend limits for teen
  async updateSpendLimits(teenId: string, limits: SpendLimits): Promise<{
    success: boolean;
    previousLimits?: SpendLimits;
    newLimits: SpendLimits;
  }> {
    const response = await fetch('/api/family/limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teenId, limits }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update spend limits: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Get teen profile with current limits
  async getTeenProfile(teenId: string): Promise<TeenProfile> {
    const response = await fetch(`/api/family/teen/${teenId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get teen profile: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Get real-time activity logs
  async getActivityLogs(teenId: string, limit: number = 50): Promise<ActivityLog[]> {
    const response = await fetch(`/api/family/logs/${teenId}?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get activity logs: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Get pending approval requests
  async getPendingApprovals(guardianEmail: string): Promise<ApprovalRequest[]> {
    const response = await fetch(`/api/family/approvals/pending?guardian=${guardianEmail}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get pending approvals: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Approve or decline request
  async processApproval(requestId: string, action: 'approve' | 'decline', limits?: SpendLimits): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`/api/family/approvals/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, limits }),
    });

    if (!response.ok) {
      throw new Error(`Failed to process approval: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Setup auto-allowance
  async setupAutoAllowance(teenId: string, amount: number, frequency: 'daily' | 'weekly' | 'monthly'): Promise<{
    success: boolean;
    allowanceId: string;
    nextTransfer: string;
  }> {
    const response = await fetch('/api/family/allowance/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teenId, amount, frequency }),
    });

    if (!response.ok) {
      throw new Error(`Failed to setup auto-allowance: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Pause/resume teen access
  async toggleTeenAccess(teenId: string, paused: boolean): Promise<{
    success: boolean;
    status: 'active' | 'paused';
  }> {
    const response = await fetch(`/api/family/access/${teenId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle teen access: ${response.statusText}`);
    }

    return response.json() as any;
  }
}

// WebSocket Notification Manager
export class FamilyNotificationManager {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, (data: any) => void> = new Map();

  connect(guardianEmail: string): void {
    const protocol = typeof globalThis !== 'undefined' && (globalThis as any).location && (globalThis as any).location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof globalThis !== 'undefined' && (globalThis as any).location ? (globalThis as any).location.host : 'localhost:3001';
    const wsUrl = `${protocol}//${host}/ws/family-alerts?guardian=${guardianEmail}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('🔔 Family notifications connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const callback = this.callbacks.get(data.type);
      if (callback) {
        callback(data);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed, attempting reconnect...');
      setTimeout(() => this.connect(guardianEmail), 5000);
    };
  }

  subscribe(eventType: string, callback: (data: any) => void): void {
    this.callbacks.set(eventType, callback);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export managers if PREMIUM feature is enabled
export const familyControlsManager = feature("PREMIUM") ? FamilyControlsManager.getInstance() : null;
export const notificationManager = feature("PREMIUM") ? new FamilyNotificationManager() : null;
