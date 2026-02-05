/**
 * Core type definitions for Fire22 Dashboard
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
  status: 'active' | 'inactive' | 'suspended';
}

export interface Agent {
  id: string;
  name: string;
  code: string;
  level: number;
  parentId?: string;
  commission: number;
  status: 'active' | 'inactive';
}

export interface Wager {
  id: string;
  customerId: string;
  agentId: string;
  amount: number;
  risk: number;
  toWin: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  placedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'wager' | 'payout';
  amount: number;
  customerId: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
