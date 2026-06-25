
import { NumberQualifier } from './number-intelligence.js';

export type MonitorEvent = 'REACHABILITY_CHANGE' | 'CARRIER_CHANGE' | 'SPAM_SCORE_CHANGE';

export interface NumberStatus {
  timestamp: Date;
  reachable: boolean;
  carrier: string;
  spamScore: number;
  ported: boolean;
  disconnected: boolean;
}

export interface StatusChange {
  type: MonitorEvent;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  old: any;
  new: any;
  timestamp: Date;
}

export interface Watcher {
  id: string;
  phone: string;
  events: MonitorEvent[];
  lastStatus: NumberStatus;
  startedAt: Date;
  interval?: Timer;
}

export class NumberMonitor {
  private watchers = new Map<string, Watcher>();
  private qualifier: NumberQualifier;

  constructor(qualifier?: NumberQualifier) {
    this.qualifier = qualifier || new NumberQualifier();
  }

  async watch(phone: string, events: MonitorEvent[], callback: (changes: StatusChange[]) => void): Promise<Watcher> {
    const intel = await this.qualifier.qualify(phone);
    const watcherId = `watcher:${intel.e164}:${Date.now()}`;
    
    const initialStatus = await this.getCurrentStatus(intel.e164);
    
    const watcher: Watcher = {
      id: watcherId,
      phone: intel.e164,
      events,
      lastStatus: initialStatus,
      startedAt: new Date()
    };
    
    this.watchers.set(watcherId, watcher);
    this.startMonitoring(watcher, callback);
    
    return watcher;
  }

  public stopWatching(watcherId: string) {
    const watcher = this.watchers.get(watcherId);
    if (watcher?.interval) {
      clearInterval(watcher.interval);
    }
    this.watchers.delete(watcherId);
  }

  private startMonitoring(watcher: Watcher, callback: (changes: StatusChange[]) => void) {
    // Poll for changes (Using Bun.setInterval for performance)
    watcher.interval = setInterval(async () => {
      const currentStatus = await this.getCurrentStatus(watcher.phone);
      const changes = this.detectChanges(watcher.lastStatus, currentStatus);
      
      const filteredChanges = changes.filter(c => watcher.events.includes(c.type));
      
      if (filteredChanges.length > 0) {
        callback(filteredChanges);
        watcher.lastStatus = currentStatus;
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async getCurrentStatus(e164: string): Promise<NumberStatus> {
    // In a real implementation, this would call multiple APIs (Twilio Lookup, HLR, IPQS)
    const intel = await this.qualifier.qualify(e164);
    
    return {
      timestamp: new Date(),
      reachable: intel.isValid, // Basic proxy
      carrier: intel.carrier || 'UNKNOWN',
      spamScore: intel.fraudScore || 0,
      ported: false,
      disconnected: !intel.isValid
    };
  }

  private detectChanges(old: NumberStatus, current: NumberStatus): StatusChange[] {
    const changes: StatusChange[] = [];
    
    if (old.reachable !== current.reachable) {
      changes.push({
        type: 'REACHABILITY_CHANGE',
        severity: 'HIGH',
        old: old.reachable,
        new: current.reachable,
        timestamp: new Date()
      });
    }
    
    if (old.carrier !== current.carrier) {
      changes.push({
        type: 'CARRIER_CHANGE',
        severity: 'MEDIUM',
        old: old.carrier,
        new: current.carrier,
        timestamp: new Date()
      });
    }
    
    if (Math.abs(old.spamScore - current.spamScore) > 20) {
      changes.push({
        type: 'SPAM_SCORE_CHANGE',
        severity: 'LOW',
        old: old.spamScore,
        new: current.spamScore,
        timestamp: new Date()
      });
    }
    
    return changes;
  }
}
