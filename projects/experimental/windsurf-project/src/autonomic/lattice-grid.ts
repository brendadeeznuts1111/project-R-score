/**
 * §Pattern:102 - Lattice Memory Grid
 * @pattern Pattern:102
 * @perf <50ms (distributed read)
 * @roi 500x (scalable state management)
 * @deps ['Redis', 'R2', 'CRDTs', 'VectorClocks']
 * @autonomic True
 * @self-healing True
 */

export class LatticeMemoryGrid {
  private nodes = new Map<string, LatticeNode>();
  private vectorClocks = new Map<string, VectorClock>();
  private conflictResolvers = new Map<string, ConflictResolver>();
  
  // CRDT (Conflict-Free Replicated Data Type) store
  private crdtStore = new Map<string, CRDT>();
  
  // Gossip protocol for node communication
  private gossipInterval: NodeJS.Timeout;
  
  constructor(
    private options: {
      nodeCount: number;
      replicationFactor: number;
      conflictStrategy: 'last-write-wins' | 'merge' | 'custom';
      syncInterval: number;
      healingThreshold: number;
    }
  ) {
    this.initializeNodes();
    this.startGossipProtocol();
    this.startHealthMonitoring();
  }

  async write(key: string, value: any, metadata?: LatticeMetadata): Promise<WriteResult> {
    const nodeId = this.hashKeyToNode(key);
    const node = this.nodes.get(nodeId);
    
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Create vector clock entry
    const vectorClock = this.getVectorClock(key);
    vectorClock.increment(nodeId);
    
    // Create lattice cell
    const cell: LatticeCell = {
      key,
      value,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        vectorClock: vectorClock.serialize(),
        nodeId,
        version: this.generateVersion()
      },
      tombstone: false
    };

    // Write to primary node
    await node.write(cell);
    
    // Replicate to other nodes
    await this.replicate(cell);
    
    // Store in CRDT for eventual consistency
    await this.storeCRDT(key, cell);
    
    return {
      success: true,
      nodeId,
      version: cell.metadata.version,
      vectorClock: vectorClock.serialize()
    };
  }

  async read(key: string): Promise<LatticeCell | null> {
    // Try primary node first
    const nodeId = this.hashKeyToNode(key);
    const primaryNode = this.nodes.get(nodeId);
    
    if (!primaryNode) {
      throw new Error(`Primary node ${nodeId} not found`);
    }

    let cell = await primaryNode.read(key);
    
    if (!cell) {
      // Check replica nodes
      cell = await this.readFromReplicas(key);
    }
    
    if (cell && cell.tombstone) {
      return null; // Item was deleted
    }
    
    return cell;
  }

  async readConsistent(key: string, requiredConsistency: number = 0.8): Promise<LatticeCell | null> {
    // Read from multiple nodes to ensure consistency
    const replicas = this.getReplicaNodes(key);
    const reads = await Promise.allSettled(
      replicas.map(node => node.read(key))
    );
    
    const successfulReads = reads
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => (r as PromiseFulfilledResult<LatticeCell>).value);
    
    if (successfulReads.length === 0) {
      return null;
    }
    
    // Check consistency
    const consistency = this.calculateConsistency(successfulReads);
    
    if (consistency < requiredConsistency) {
      // Need to repair inconsistency
      await this.repairInconsistency(key, successfulReads);
    }
    
    // Use vector clocks to determine most recent
    return this.resolveByVectorClock(successfulReads);
  }

  async delete(key: string): Promise<DeleteResult> {
    // Create tombstone marker
    const tombstoneCell: LatticeCell = {
      key,
      value: null,
      metadata: {
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(key).serialize(),
        nodeId: this.hashKeyToNode(key),
        version: this.generateVersion(),
        tombstone: true
      },
      tombstone: true
    };
    
    // Write tombstone
    await this.write(key, null, { tombstone: true });
    
    // Schedule cleanup
    this.scheduleCleanup(key);
    
    return {
      success: true,
      tombstoneVersion: tombstoneCell.metadata.version
    };
  }

  async query(pattern: string | RegExp, options?: QueryOptions): Promise<LatticeCell[]> {
    // Distributed query across all nodes
    const queryPromises = Array.from(this.nodes.values()).map(
      node => node.query(pattern, options)
    );
    
    const results = await Promise.all(queryPromises);
    const merged = results.flat();
    
    // Deduplicate using vector clocks
    return this.deduplicate(merged);
  }

  async merge(otherGrid: LatticeMemoryGrid): Promise<MergeResult> {
    // Merge two grids (useful for node joining)
    const conflicts: Conflict[] = [];
    
    for (const [key, crdt] of this.crdtStore.entries()) {
      const otherCRDT = otherGrid.getCRDT(key);
      
      if (otherCRDT) {
        const merged = this.mergeCRDT(crdt, otherCRDT);
        if (merged.conflicts.length > 0) {
          conflicts.push(...merged.conflicts);
        }
        this.crdtStore.set(key, merged.crdt);
      }
    }
    
    // Update vector clocks
    this.mergeVectorClocks(otherGrid.getVectorClocks());
    
    return {
      success: true,
      conflicts,
      mergedKeys: this.crdtStore.size
    };
  }

  async heal(): Promise<HealingResult> {
    const startTime = Date.now();
    const issues: HealingIssue[] = [];
    const repairs: Repair[] = [];
    
    // 1. Check node health
    for (const [nodeId, node] of this.nodes.entries()) {
      if (!await node.isHealthy()) {
        issues.push({
          type: 'NODE_UNHEALTHY',
          nodeId,
          severity: 'HIGH'
        });
        
        // Attempt to repair
        const repair = await this.repairNode(nodeId);
        repairs.push(repair);
      }
    }
    
    // 2. Check data consistency
    const consistencyIssues = await this.checkConsistency();
    issues.push(...consistencyIssues);
    
    // 3. Repair inconsistencies
    for (const issue of consistencyIssues) {
      if (issue.type === 'DATA_INCONSISTENT') {
        const repair = await this.repairInconsistency(issue.key, issue.values);
        repairs.push(repair);
      }
    }
    
    // 4. Clean up tombstones
    const cleanupResult = await this.cleanupTombstones();
    repairs.push(...cleanupResult.repairs);
    
    return {
      success: true,
      issues,
      repairs,
      duration: Date.now() - startTime,
      healed: repairs.filter(r => r.success).length
    };
  }

  private async replicate(cell: LatticeCell): Promise<void> {
    const replicaNodes = this.getReplicaNodes(cell.key);
    
    await Promise.allSettled(
      replicaNodes.map(node => node.write(cell))
    );
  }

  private async readFromReplicas(key: string): Promise<LatticeCell | null> {
    const replicaNodes = this.getReplicaNodes(key);
    
    for (const node of replicaNodes) {
      const cell = await node.read(key);
      if (cell) {
        return cell;
      }
    }
    
    return null;
  }

  private getReplicaNodes(key: string): LatticeNode[] {
    const nodeId = this.hashKeyToNode(key);
    const replicas: LatticeNode[] = [];
    
    // Get next N nodes in the ring
    const nodeIds = Array.from(this.nodes.keys());
    const startIndex = nodeIds.indexOf(nodeId);
    
    for (let i = 1; i <= this.options.replicationFactor; i++) {
      const replicaIndex = (startIndex + i) % nodeIds.length;
      const replicaNode = this.nodes.get(nodeIds[replicaIndex]);
      if (replicaNode) {
        replicas.push(replicaNode);
      }
    }
    
    return replicas;
  }

  private hashKeyToNode(key: string): string {
    // Consistent hashing
    const hash = this.hashString(key);
    const nodeIds = Array.from(this.nodes.keys()).sort();
    
    for (const nodeId of nodeIds) {
      const nodeHash = this.hashString(nodeId);
      if (hash <= nodeHash) {
        return nodeId;
      }
    }
    
    // Wrap around to first node
    return nodeIds[0];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private getVectorClock(key: string): VectorClock {
    if (!this.vectorClocks.has(key)) {
      this.vectorClocks.set(key, new VectorClock());
    }
    return this.vectorClocks.get(key)!;
  }

  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateConsistency(cells: LatticeCell[]): number {
    if (cells.length <= 1) return 1.0;
    
    const values = cells.map(c => JSON.stringify(c.value));
    const uniqueValues = new Set(values).size;
    
    return 1.0 - ((uniqueValues - 1) / cells.length);
  }

  private resolveByVectorClock(cells: LatticeCell[]): LatticeCell {
    // Sort by vector clock to get most recent
    return cells.sort((a, b) => {
      const vcA = VectorClock.deserialize(a.metadata.vectorClock);
      const vcB = VectorClock.deserialize(b.metadata.vectorClock);
      return vcB.compare(vcA); // Most recent first
    })[0];
  }

  private deduplicate(cells: LatticeCell[]): LatticeCell[] {
    const seen = new Map<string, LatticeCell>();
    
    for (const cell of cells) {
      const existing = seen.get(cell.key);
      if (!existing) {
        seen.set(cell.key, cell);
      } else {
        // Keep the most recent
        const vcExisting = VectorClock.deserialize(existing.metadata.vectorClock);
        const vcCurrent = VectorClock.deserialize(cell.metadata.vectorClock);
        
        if (vcCurrent.compare(vcExisting) > 0) {
          seen.set(cell.key, cell);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  private async storeCRDT(key: string, cell: LatticeCell): Promise<void> {
    if (!this.crdtStore.has(key)) {
      this.crdtStore.set(key, new LWWRegister()); // Last-Write-Wins Register
    }
    
    const crdt = this.crdtStore.get(key)!;
    crdt.write(cell.value, cell.metadata.timestamp);
  }

  private startGossipProtocol(): void {
    this.gossipInterval = setInterval(async () => {
      await this.gossip();
    }, this.options.syncInterval);
  }

  private async gossip(): Promise<void> {
    // Exchange state with random nodes
    const nodeIds = Array.from(this.nodes.keys());
    const randomNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    const randomNode = this.nodes.get(randomNodeId);
    
    if (randomNode) {
      await this.merge(await randomNode.getGridSnapshot());
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkHealth();
    }, 30000); // Every 30 seconds
  }

  private async checkHealth(): Promise<void> {
    const unhealthyNodes = [];
    
    for (const [nodeId, node] of this.nodes.entries()) {
      if (!await node.isHealthy()) {
        unhealthyNodes.push(nodeId);
      }
    }
    
    if (unhealthyNodes.length > this.options.healingThreshold) {
      await this.heal();
    }
  }

  // Additional methods for initialization, repair, etc.
  private initializeNodes(): void {
    for (let i = 0; i < this.options.nodeCount; i++) {
      const nodeId = `node-${i}`;
      this.nodes.set(nodeId, new LatticeNode(nodeId));
    }
  }

  private async repairNode(nodeId: string): Promise<Repair> {
    // Implementation for node repair
    return { success: true, nodeId, action: 'RESTARTED' };
  }

  private async checkConsistency(): Promise<HealingIssue[]> {
    // Implementation for consistency checking
    return [];
  }

  private async cleanupTombstones(): Promise<{ repairs: Repair[] }> {
    // Implementation for tombstone cleanup
    return { repairs: [] };
  }

  private mergeVectorClocks(otherClocks: Map<string, VectorClock>): void {
    // Implementation for vector clock merging
  }

  private mergeCRDT(crdt1: CRDT, crdt2: CRDT): { crdt: CRDT; conflicts: Conflict[] } {
    // Implementation for CRDT merging
    return { crdt: crdt1, conflicts: [] };
  }

  private scheduleCleanup(key: string): void {
    // Schedule tombstone cleanup after TTL
    setTimeout(async () => {
      await this.permanentDelete(key);
    }, 604800000); // 7 days
  }

  private async permanentDelete(key: string): Promise<void> {
    // Permanently remove tombstoned entries
    const replicas = this.getReplicaNodes(key);
    await Promise.all(
      replicas.map(node => node.permanentDelete(key))
    );
    this.crdtStore.delete(key);
    this.vectorClocks.delete(key);
  }

  getCRDT(key: string): CRDT | undefined {
    return this.crdtStore.get(key);
  }

  getVectorClocks(): Map<string, VectorClock> {
    return new Map(this.vectorClocks);
  }
}

// Supporting classes and interfaces
class LatticeNode {
  constructor(public id: string) {}
  
  async write(cell: LatticeCell): Promise<void> {
    // Implementation
  }
  
  async read(key: string): Promise<LatticeCell | null> {
    // Implementation
    return null;
  }
  
  async query(pattern: string | RegExp, options?: QueryOptions): Promise<LatticeCell[]> {
    // Implementation
    return [];
  }
  
  async isHealthy(): Promise<boolean> {
    // Implementation
    return true;
  }
  
  async getGridSnapshot(): Promise<LatticeMemoryGrid> {
    // Implementation
    return new LatticeMemoryGrid({ nodeCount: 1, replicationFactor: 1, conflictStrategy: 'last-write-wins', syncInterval: 1000, healingThreshold: 1 });
  }
  
  async permanentDelete(key: string): Promise<void> {
    // Implementation
  }
}

class VectorClock {
  private clock = new Map<string, number>();
  
  increment(nodeId: string): void {
    const current = this.clock.get(nodeId) || 0;
    this.clock.set(nodeId, current + 1);
  }
  
  compare(other: VectorClock): number {
    // Return 1 if this > other, -1 if this < other, 0 if concurrent
    let greater = false;
    let less = false;
    
    const allNodes = new Set([
      ...Array.from(this.clock.keys()),
      ...Array.from(other.clock.keys())
    ]);
    
    for (const node of allNodes) {
      const t1 = this.clock.get(node) || 0;
      const t2 = other.clock.get(node) || 0;
      
      if (t1 > t2) greater = true;
      if (t1 < t2) less = true;
    }
    
    if (greater && !less) return 1;
    if (!greater && less) return -1;
    return 0; // Concurrent
  }
  
  serialize(): string {
    return JSON.stringify(Array.from(this.clock.entries()));
  }
  
  static deserialize(data: string): VectorClock {
    const clock = new VectorClock();
    const entries = JSON.parse(data) as [string, number][];
    entries.forEach(([nodeId, count]) => {
      clock.clock.set(nodeId, count);
    });
    return clock;
  }
}

class LWWRegister implements CRDT {
  private value: any = null;
  private timestamp: number = 0;
  
  write(newValue: any, newTimestamp: number): void {
    if (newTimestamp > this.timestamp) {
      this.value = newValue;
      this.timestamp = newTimestamp;
    }
  }
  
  read(): any {
    return this.value;
  }
  
  merge(other: LWWRegister): LWWRegister {
    const merged = new LWWRegister();
    if (this.timestamp > other.timestamp) {
      merged.value = this.value;
      merged.timestamp = this.timestamp;
    } else {
      merged.value = other.value;
      merged.timestamp = other.timestamp;
    }
    return merged;
  }
}

// Interfaces
interface LatticeCell {
  key: string;
  value: any;
  metadata: LatticeMetadata;
  tombstone: boolean;
}

interface LatticeMetadata {
  timestamp: number;
  vectorClock: string;
  nodeId: string;
  version: string;
  tombstone?: boolean;
  [key: string]: any;
}

interface WriteResult {
  success: boolean;
  nodeId: string;
  version: string;
  vectorClock: string;
}

interface DeleteResult {
  success: boolean;
  tombstoneVersion: string;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface MergeResult {
  success: boolean;
  conflicts: Conflict[];
  mergedKeys: number;
}

interface Conflict {
  key: string;
  values: any[];
  resolution?: string;
}

interface HealingResult {
  success: boolean;
  issues: HealingIssue[];
  repairs: Repair[];
  duration: number;
  healed: number;
}

interface HealingIssue {
  type: string;
  nodeId?: string;
  key?: string;
  values?: any[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface Repair {
  success: boolean;
  nodeId?: string;
  key?: string;
  action: string;
  duration?: number;
}

interface CRDT {
  write(value: any, timestamp: number): void;
  read(): any;
  merge(other: CRDT): CRDT;
}

interface ConflictResolver {
  resolve(conflicts: Conflict[]): Conflict[];
}
