import { PhoneSanitizer } from '../core/phone-sanitizer';
import { CacheManager } from '../core/cache-manager';

export interface IdentityNode {
  phone: string;
  connections: IdentityConnection[];
  syntheticScore: number; // 0-1
  isSynthetic: boolean;
  confidence: number;
  lastAnalyzed: number;
  metadata?: Record<string, any>;
}

export interface IdentityConnection {
  type: 'DEVICE' | 'PAYMENT' | 'EMAIL' | 'IP' | 'LOCATION';
  value: string;
  strength: number; // 0-1
  verified: boolean;
  discoveredAt: number;
}

export interface IdentityGraph {
  nodes: Map<string, IdentityNode>;
  edges: Map<string, IdentityConnection[]>;
  syntheticClusters: string[];
  lastUpdated: number;
}

export interface SyntheticIdentityResult {
  phone: string;
  syntheticScore: number; // 0-1
  isSynthetic: boolean;
  connections: IdentityConnection[];
  riskFactors: string[];
  confidence: number;
  analyzedAt: number;
}

export class CrossPlatformIdentityResolver {
  private sanitizer = new PhoneSanitizer();
  private cache: CacheManager;
  private graph: IdentityGraph;

  constructor() {
    this.cache = new CacheManager({
      defaultTTL: 600000, // 10 minutes
      maxMemoryEntries: 10000,
      cleanupInterval: 30000,
      enableRedis: true,
      enableR2: true,
      r2Bucket: 'empire-pro-identity'
    });

    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      syntheticClusters: [],
      lastUpdated: Date.now()
    };
  }

  async resolveIdentity(phone: string): Promise<SyntheticIdentityResult> {
    const sanitized = this.sanitizer.sanitize(phone);
    if (!sanitized.isValid) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    const cacheKey = `identity:${sanitized.e164}`;

    // Check cache first
    const cached = await this.cache.get<SyntheticIdentityResult>(cacheKey);
    if (cached) {
      console.log(`Cache hit for identity: ${sanitized.e164}`);
      return cached;
    }

    console.log(`Resolving identity for: ${sanitized.e164}`);

    try {
      // Build identity graph
      const node = await this.buildIdentityNode(sanitized.e164);
      
      // Analyze for synthetic patterns
      const syntheticAnalysis = await this.analyzeSyntheticPatterns(node);
      
      // Create result
      const result: SyntheticIdentityResult = {
        phone: sanitized.e164,
        syntheticScore: syntheticAnalysis.score,
        isSynthetic: syntheticAnalysis.isSynthetic,
        connections: node.connections,
        riskFactors: syntheticAnalysis.riskFactors,
        confidence: syntheticAnalysis.confidence,
        analyzedAt: Date.now()
      };

      // Cache the result
      await this.cache.set(cacheKey, result, 600000);

      // Store in graph
      this.graph.nodes.set(sanitized.e164, node);
      this.graph.lastUpdated = Date.now();

      // Store in R2 for persistence
      this.storeInR2(result).catch(console.error);

      return result;
    } catch (error) {
      console.error(`Failed to resolve identity for ${sanitized.e164}:`, error);
      
      return {
        phone: sanitized.e164,
        syntheticScore: 0.5, // Unknown
        isSynthetic: false,
        connections: [],
        riskFactors: ['Identity resolution failed'],
        confidence: 0,
        analyzedAt: Date.now()
      };
    }
  }

  private async buildIdentityNode(phone: string): Promise<IdentityNode> {
    const connections: IdentityConnection[] = [];
    
    // Simulate discovering connections across platforms
    // In production, this would query real data sources
    
    // Device connections
    const devices = await this.findDeviceConnections(phone);
    connections.push(...devices);
    
    // Payment connections
    const payments = await this.findPaymentConnections(phone);
    connections.push(...payments);
    
    // Email connections
    const emails = await this.findEmailConnections(phone);
    connections.push(...emails);
    
    // IP connections
    const ips = await this.findIPConnections(phone);
    connections.push(...ips);
    
    // Location connections
    const locations = await this.findLocationConnections(phone);
    connections.push(...locations);

    return {
      phone,
      connections,
      syntheticScore: 0, // Will be calculated
      isSynthetic: false, // Will be determined
      confidence: this.calculateConnectionConfidence(connections),
      lastAnalyzed: Date.now()
    };
  }

  private async findDeviceConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate device discovery
    const deviceCount = Math.floor(Math.random() * 3) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < deviceCount; i++) {
      connections.push({
        type: 'DEVICE',
        value: `device-${phone.replace(/\D/g, '')}-${i}`,
        strength: Math.random() * 0.5 + 0.5,
        verified: Math.random() > 0.3,
        discoveredAt: Date.now() - Math.random() * 86400000 * 30 // Last 30 days
      });
    }
    
    return connections;
  }

  private async findPaymentConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate payment account discovery
    const paymentCount = Math.floor(Math.random() * 2) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < paymentCount; i++) {
      connections.push({
        type: 'PAYMENT',
        value: `$${phone.replace(/\D/g, '').slice(-4)}${Math.random().toString(36).substr(2, 5)}`,
        strength: Math.random() * 0.4 + 0.6,
        verified: Math.random() > 0.2,
        discoveredAt: Date.now() - Math.random() * 86400000 * 90 // Last 90 days
      });
    }
    
    return connections;
  }

  private async findEmailConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate email discovery
    const emailCount = Math.floor(Math.random() * 2) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < emailCount; i++) {
      connections.push({
        type: 'EMAIL',
        value: `user${phone.replace(/\D/g, '').slice(-4)}${i}@example.com`,
        strength: Math.random() * 0.3 + 0.4,
        verified: Math.random() > 0.4,
        discoveredAt: Date.now() - Math.random() * 86400000 * 180 // Last 180 days
      });
    }
    
    return connections;
  }

  private async findIPConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate IP discovery
    const ipCount = Math.floor(Math.random() * 3) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < ipCount; i++) {
      connections.push({
        type: 'IP',
        value: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        strength: Math.random() * 0.2 + 0.3,
        verified: Math.random() > 0.5,
        discoveredAt: Date.now() - Math.random() * 86400000 * 7 // Last 7 days
      });
    }
    
    return connections;
  }

  private async findLocationConnections(phone: string): Promise<IdentityConnection[]> {
    // Simulate location discovery
    const locationCount = Math.floor(Math.random() * 2) + 1;
    const connections: IdentityConnection[] = [];
    
    for (let i = 0; i < locationCount; i++) {
      connections.push({
        type: 'LOCATION',
        value: `${(Math.random() * 90 - 90).toFixed(4)},${(Math.random() * 180 - 90).toFixed(4)}`,
        strength: Math.random() * 0.3 + 0.5,
        verified: Math.random() > 0.3,
        discoveredAt: Date.now() - Math.random() * 86400000 * 30 // Last 30 days
      });
    }
    
    return connections;
  }

  private calculateConnectionConfidence(connections: IdentityConnection[]): number {
    if (connections.length === 0) return 0;
    
    const avgStrength = connections.reduce((sum, conn) => sum + conn.strength, 0) / connections.length;
    const verifiedRatio = connections.filter(conn => conn.verified).length / connections.length;
    
    return (avgStrength * 0.7) + (verifiedRatio * 0.3);
  }

  private async analyzeSyntheticPatterns(node: IdentityNode): Promise<{
    score: number;
    isSynthetic: boolean;
    riskFactors: string[];
    confidence: number;
  }> {
    const riskFactors: string[] = [];
    let syntheticScore = 0;
    
    // Analyze connection patterns
    const deviceConnections = node.connections.filter(c => c.type === 'DEVICE');
    const paymentConnections = node.connections.filter(c => c.type === 'PAYMENT');
    const emailConnections = node.connections.filter(c => c.type === 'EMAIL');
    
    // Risk factor 1: Too many devices for a single identity
    if (deviceConnections.length > 3) {
      riskFactors.push('Excessive device count');
      syntheticScore += 0.3;
    }
    
    // Risk factor 2: No verified connections
    const verifiedConnections = node.connections.filter(c => c.verified);
    if (verifiedConnections.length === 0) {
      riskFactors.push('No verified connections');
      syntheticScore += 0.4;
    }
    
    // Risk factor 3: All connections created recently
    const recentConnections = node.connections.filter(c => 
      Date.now() - c.discoveredAt < 86400000 * 7 // Last 7 days
    );
    if (recentConnections.length === node.connections.length && node.connections.length > 2) {
      riskFactors.push('All connections recently created');
      syntheticScore += 0.2;
    }
    
    // Risk factor 4: Low connection strength
    const avgStrength = node.connections.reduce((sum, c) => sum + c.strength, 0) / node.connections.length;
    if (avgStrength < 0.3) {
      riskFactors.push('Low connection strength');
      syntheticScore += 0.2;
    }
    
    // Risk factor 5: Suspicious patterns in payment accounts
    if (paymentConnections.length > 2) {
      riskFactors.push('Multiple payment accounts');
      syntheticScore += 0.1;
    }
    
    // Cap score at 1.0
    syntheticScore = Math.min(syntheticScore, 1.0);
    
    // Determine if synthetic
    const isSynthetic = syntheticScore > 0.6;
    
    // Calculate confidence based on data quality
    const confidence = node.confidence * (1 - (riskFactors.length * 0.1));
    
    return {
      score: syntheticScore,
      isSynthetic,
      riskFactors,
      confidence: Math.max(0, confidence)
    };
  }

  async findRelatedIdentities(phone: string, maxDepth: number = 2): Promise<string[]> {
    const visited = new Set<string>();
    const queue: string[] = [phone];
    const related: string[] = [];
    
    while (queue.length > 0 && maxDepth > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      // Get connections for current phone
      const node = await this.buildIdentityNode(current);
      
      // Extract connected phone numbers (simplified)
      for (const connection of node.connections) {
        // In production, this would extract actual related phone numbers
        // For demo, we'll simulate some related numbers
        if (connection.type === 'DEVICE' && connection.verified) {
          const relatedPhone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
          if (!visited.has(relatedPhone)) {
            queue.push(relatedPhone);
            related.push(relatedPhone);
          }
        }
      }
      
      maxDepth--;
    }
    
    return related;
  }

  async getIdentityGraph(phone: string): Promise<IdentityGraph> {
    // Build a local graph around the phone
    const centralNode = await this.buildIdentityNode(phone);
    const relatedPhones = await this.findRelatedIdentities(phone, 2);
    
    const graph: IdentityGraph = {
      nodes: new Map(),
      edges: new Map(),
      syntheticClusters: [],
      lastUpdated: Date.now()
    };
    
    // Add central node
    graph.nodes.set(phone, centralNode);
    graph.edges.set(phone, centralNode.connections);
    
    // Add related nodes
    for (const relatedPhone of relatedPhones) {
      const relatedNode = await this.buildIdentityNode(relatedPhone);
      graph.nodes.set(relatedPhone, relatedNode);
      graph.edges.set(relatedPhone, relatedNode.connections);
    }
    
    return graph;
  }

  private async storeInR2(result: SyntheticIdentityResult): Promise<void> {
    try {
      const r2 = (globalThis as any).R2_BUCKET;
      if (r2) {
        await r2.put(
          `identities/${result.phone}.json`,
          JSON.stringify(result),
          {
            httpMetadata: {
              contentType: 'application/json'
            },
            customMetadata: {
              syntheticScore: result.syntheticScore.toString(),
              isSynthetic: result.isSynthetic.toString(),
              confidence: result.confidence.toString()
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to store identity in R2:', error);
    }
  }

  async getStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      cache: cacheStats,
      graphSize: this.graph.nodes.size,
      syntheticClusters: this.graph.syntheticClusters.length,
      lastUpdated: this.graph.lastUpdated
    };
  }
}
