// council-factory-fixed.ts - Ultra-Scale Ticket Processing (Bun v1.3.x Compatible)
import { $, serve, watch, RedisClient } from 'bun';
import { Database } from 'bun:sqlite';
import { createHash, randomBytes } from 'node:crypto';

// ====================
// UTILITIES
// ====================
const sha256 = (input: string, encoding: 'hex' | 'base64' = 'hex'): string => 
  createHash('sha256').update(input).digest(encoding);

// ====================
// 1. TICKET FACTORY WITH DISPUTE SCOPES
// ====================
class CouncilTicketFactory {
  private static db: Database;
  
  static async initialize() {
    this.db = new Database('council-tickets.db');
    
    // Enable WAL for concurrent council access
    this.db.run(`PRAGMA journal_mode = WAL`);
    this.db.run(`PRAGMA synchronous = NORMAL`);
    this.db.run(`PRAGMA cache_size = -20000`);
    
    // Create optimized tables for ultra-scale (n=18-20)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tickets_v4 (
        id TEXT PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL,
        scope TEXT,
        factory TEXT,
        status TEXT CHECK(status IN ('pending', 'validated', 'disputed', 'resolved', 'archived')),
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        validated_at TEXT,
        resolved_at TEXT
      ) STRICT
    `);
    
    // Create indexes for ultra-fast queries
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_hash ON tickets_v4(hash)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_scope_status ON tickets_v4(scope, status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_factory ON tickets_v4(factory, created_at)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets_v4(created_at DESC)`);
    
    console.log('✅ Ticket factory initialized');
  }
  
  // Generate ticket with hash and scope
  static async createTicket(data: any, scope?: string): Promise<{
    id: string;
    hash: string;
    scope: string;
    factory: string;
    timestamp: string;
  }> {
    const ticketId = `ticket_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const factory = `[factory-${data?.type || 'default'}]`;
    const scopeWithBrackets = scope ? `[${scope}]` : '[DISPUTE-GENERAL]';
    const timestamp = Date.now();
    
    // Generate deterministic hash with sorted keys - include ALL fields used in validation
    const hashInput = JSON.stringify({
      id: ticketId,
      data,
      scope: scopeWithBrackets,
      factory,
      timestamp
    });
    
    const hash = sha256(hashInput, 'hex');
    
    // Insert with hash validation
    this.db.run(`
      INSERT INTO tickets_v4 (id, hash, scope, factory, status, data)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `, [ticketId, hash, scopeWithBrackets, factory, JSON.stringify(data)]);
    
    console.log(`🎫 Created ticket: ${ticketId} ${scopeWithBrackets} ${factory}`);
    console.log(`   Hash: ${hash.substring(0, 16)}...`);
    
    return {
      id: ticketId,
      hash,
      scope: scopeWithBrackets,
      factory,
      timestamp: new Date().toISOString()
    };
  }
  
  // Get stats for dashboard
  static getStats() {
    const total = this.db.query(`SELECT COUNT(*) as count FROM tickets_v4`).get() as { count: number };
    const pending = this.db.query(`SELECT COUNT(*) as count FROM tickets_v4 WHERE status = 'pending'`).get() as { count: number };
    const validated = this.db.query(`SELECT COUNT(*) as count FROM tickets_v4 WHERE status = 'validated'`).get() as { count: number };
    const disputed = this.db.query(`SELECT COUNT(*) as count FROM tickets_v4 WHERE status = 'disputed'`).get() as { count: number };
    
    return {
      totalTickets: total.count,
      pending: pending.count,
      validated: validated.count,
      disputed: disputed.count
    };
  }
  
  // Validate V4 tickets with multi-threading simulation
  static async validateTickets(threadCount: number = 4): Promise<{
    validated: number;
    errors: Array<{ ticketId: string; error: string }>;
    duration: number;
  }> {
    const startTime = Date.now();
    const pendingTickets = this.db.query(`
      SELECT id, hash, data, scope, factory 
      FROM tickets_v4 
      WHERE status = 'pending'
      LIMIT 1000
    `).all() as any[];
    
    if (pendingTickets.length === 0) {
      return { validated: 0, errors: [], duration: 0 };
    }
    
    // Split work across "threads" (parallel promises)
    const chunkSize = Math.ceil(pendingTickets.length / threadCount);
    const chunks: any[][] = [];
    
    for (let i = 0; i < pendingTickets.length; i += chunkSize) {
      chunks.push(pendingTickets.slice(i, i + chunkSize));
    }
    
    // Run validation in parallel
    const results = await Promise.all(
      chunks.map(chunk => this.validateChunk(chunk))
    );
    
    const validated = results.reduce((sum, r) => sum + r.validated, 0);
    const errors = results.flatMap(r => r.errors);
    
    return {
      validated,
      errors,
      duration: Date.now() - startTime
    };
  }
  
  private static async validateChunk(chunk: any[]): Promise<{
    validated: number;
    errors: Array<{ ticketId: string; error: string }>;
  }> {
    const errors: Array<{ ticketId: string; error: string }> = [];
    let validated = 0;
    
    for (const ticket of chunk) {
      try {
        // Parse stored data
        const data = JSON.parse(ticket.data || '{}');
        
        // Reconstruct hash input exactly as it was created
        // We need the original timestamp - it's in the ticket ID
        const idParts = ticket.id.split('_');
        const timestamp = idParts.length >= 2 ? parseInt(idParts[1]) : Date.now();
        
        // Validate hash with same fields as creation
        const hashInput = JSON.stringify({
          id: ticket.id,
          data,
          scope: ticket.scope,
          factory: ticket.factory,
          timestamp
        });
        
        const expectedHash = sha256(hashInput, 'hex');
        
        if (ticket.hash !== expectedHash) {
          throw new Error(`Hash mismatch: ${ticket.hash.substring(0, 16)}... vs ${expectedHash.substring(0, 16)}...`);
        }
        
        // Validate scope pattern
        if (!ticket.scope?.match(/^\[DISPUTE-[A-Z]+\]$/)) {
          throw new Error(`Invalid scope format: ${ticket.scope}`);
        }
        
        // Validate factory pattern
        if (!ticket.factory?.match(/^\[factory.*\]$/)) {
          throw new Error(`Invalid factory format: ${ticket.factory}`);
        }
        
        // Update status
        this.db.run(`
          UPDATE tickets_v4 
          SET status = 'validated', validated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [ticket.id]);
        
        validated++;
      } catch (error: any) {
        errors.push({
          ticketId: ticket.id,
          error: error.message
        });
        
        // Mark as disputed
        this.db.run(`
          UPDATE tickets_v4 
          SET status = 'disputed' 
          WHERE id = ?
        `, [ticket.id]);
      }
    }
    
    return { validated, errors };
  }
}

// ====================
// 2. ENHANCED SCRIPTS FOR ULTRA-SCALE
// ====================
export const CouncilScripts = {
  // Grep tickets by factory pattern
  async "grep:tickets"() {
    try {
      const result = await $`rg '\[factory[^\]]*\]' --type ts -c`.quiet();
      const matches = result.stdout.toString().split('\n').filter(Boolean);
      
      return {
        total: matches.length,
        matches: matches.slice(0, 10)
      };
    } catch {
      return { total: 0, matches: [] };
    }
  },
  
  // Find SHA-256 hashes with context
  async "grep:hash"() {
    try {
      const result = await $`rg -o '[a-f0-9]{64}' --type ts`.quiet();
      const hashes = result.stdout.toString().split('\n').filter(Boolean);
      const validHashes = hashes.filter(h => /^[a-f0-9]{64}$/.test(h));
      
      return {
        validHashes: validHashes.length,
        invalidHashes: hashes.length - validHashes.length,
        files: 0,
        matches: hashes.length
      };
    } catch {
      return { validHashes: 0, invalidHashes: 0, files: 0, matches: 0 };
    }
  },
  
  // Scope analysis
  async "grep:scope"() {
    try {
      const result = await $`rg '\[DISPUTE-[A-Z]+\]' --type ts`.quiet();
      const matches = result.stdout.toString().split('\n').filter(Boolean);
      
      const disputes = new Map<string, number>();
      matches.forEach(line => {
        const match = line.match(/\[(DISPUTE-[A-Z]+)\]/);
        if (match) {
          const type = match[1];
          disputes.set(type, (disputes.get(type) || 0) + 1);
        }
      });
      
      return {
        totalDisputes: matches.length,
        disputeTypes: Object.fromEntries(disputes.entries()),
        uniqueTypes: disputes.size
      };
    } catch {
      return { totalDisputes: 0, disputeTypes: {}, uniqueTypes: 0 };
    }
  },
  
  // Threaded validation script
  async "validate:tickets"() {
    console.log('🧪 Validating tickets...');
    
    // Use 4 threads by default
    const result = await CouncilTicketFactory.validateTickets(4);
    
    const report = {
      timestamp: new Date().toISOString(),
      threadCount: 4,
      ...result,
      throughput: result.duration > 0 ? result.validated / (result.duration / 1000) : 0,
      efficiency: result.validated + result.errors.length > 0 
        ? (result.validated / (result.validated + result.errors.length)) * 100 
        : 100
    };
    
    await Bun.write('validation-report.json', JSON.stringify(report, null, 2));
    
    console.log(`✅ Validated ${result.validated} tickets with ${result.errors.length} errors`);
    console.log(`   Throughput: ${report.throughput.toFixed(2)} tickets/sec`);
    console.log(`   Efficiency: ${report.efficiency.toFixed(1)}%`);
    
    return report;
  },
  
  // Build factory index from files
  async buildFactoryIndex(files: string[]) {
    const factories: Record<string, number> = {};
    
    for (const file of files.slice(0, 100)) { // Limit to 100 files
      try {
        const content = await Bun.file(file).text();
        const matches = content.match(/\[factory-([^\]]+)\]/g) || [];
        matches.forEach(match => {
          factories[match] = (factories[match] || 0) + 1;
        });
      } catch {}
    }
    
    return factories;
  },
  
  // Build dispute index
  async buildDisputeIndex(files: string[]) {
    const disputes: Record<string, number> = {};
    
    for (const file of files.slice(0, 100)) {
      try {
        const content = await Bun.file(file).text();
        const matches = content.match(/\[DISPUTE-([A-Z]+)\]/g) || [];
        matches.forEach(match => {
          disputes[match] = (disputes[match] || 0) + 1;
        });
      } catch {}
    }
    
    return disputes;
  },
  
  // Collect hashes from files
  async collectHashes(files: string[]) {
    const hashes: string[] = [];
    
    for (const file of files.slice(0, 100)) {
      try {
        const content = await Bun.file(file).text();
        const matches = content.match(/[a-f0-9]{64}/g) || [];
        hashes.push(...matches);
      } catch {}
    }
    
    return [...new Set(hashes)]; // Deduplicate
  },
  
  // Get CPU count for threading
  async getCPUCount() {
    return navigator?.hardwareConcurrency || 4;
  }
};

// ====================
// 3. COUNCIL DISPUTE RESOLUTION SYSTEM
// ====================
class CouncilDisputeResolution {
  private static db: Database;
  
  static async initialize() {
    this.db = new Database('council-tickets.db');
    
    // Dispute resolution tracking
    this.db.run(`
      CREATE TABLE IF NOT EXISTS disputes (
        dispute_id TEXT PRIMARY KEY,
        ticket_id TEXT,
        scope TEXT NOT NULL,
        council_members TEXT,
        votes TEXT,
        outcome TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets_v4(id)
      )
    `);
    
    console.log('✅ Dispute resolution initialized');
  }
  
  // Get stats for dashboard
  static getStats() {
    const active = this.db.query(`SELECT COUNT(*) as count FROM disputes WHERE outcome IS NULL`).get() as { count: number };
    const resolved = this.db.query(`SELECT COUNT(*) as count FROM disputes WHERE outcome IS NOT NULL`).get() as { count: number };
    
    return {
      activeDisputes: active.count,
      resolved: resolved.count,
      pendingVotes: active.count // Simplified
    };
  }
  
  // Create dispute with council members (n=18-20)
  static async createDispute(
    ticketId: string,
    scope: string,
    councilMembers: string[]
  ) {
    if (councilMembers.length < 18 || councilMembers.length > 20) {
      throw new Error('Council must have 18-20 members');
    }
    
    const disputeId = `dispute_${Date.now()}_${scope.replace(/[^A-Z]/g, '')}`;
    
    this.db.run(`
      INSERT INTO disputes (dispute_id, ticket_id, scope, council_members, votes)
      VALUES (?, ?, ?, ?, ?)
    `, [
      disputeId,
      ticketId,
      scope,
      JSON.stringify(councilMembers),
      JSON.stringify({})
    ]);
    
    console.log(`⚖️ Created dispute ${disputeId} with ${councilMembers.length} council members`);
    
    return disputeId;
  }
}

// ====================
// 4. MONITORING & ANALYTICS DASHBOARD
// ====================
const server = serve({
  port: 8088,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Dashboard
    if (url.pathname === '/council/dashboard') {
      const factoryStats = CouncilTicketFactory.getStats();
      const disputeStats = CouncilDisputeResolution.getStats();
      const hashStats = await CouncilScripts["grep:hash"]();
      
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>Council Dashboard</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: monospace; background: #0a0a0a; color: #00ff00; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .card { background: #1a1a1a; border: 1px solid #00ff00; padding: 20px; border-radius: 5px; }
        .stat { font-size: 32px; font-weight: bold; color: #00ff00; margin: 10px 0; }
        button { background: #00ff00; color: #000; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; font-family: monospace; font-weight: bold; }
        button:hover { background: #00cc00; }
    </style>
</head>
<body>
    <h1>⚖️ COUNCIL PROTOCOL DASHBOARD</h1>
    <p>n=18–20 Ultra | Ticket Factory v4</p>
    
    <div class="grid">
        <div class="card">
            <h3>🏭 Factory Status</h3>
            <div class="stat">${factoryStats.totalTickets}</div>
            <div>Pending: ${factoryStats.pending}</div>
            <div>Validated: ${factoryStats.validated}</div>
            <div>Disputed: ${factoryStats.disputed}</div>
        </div>
        
        <div class="card">
            <h3>⚖️ Dispute Resolution</h3>
            <div class="stat">${disputeStats.activeDisputes}</div>
            <div>Council Members: 18-20</div>
            <div>Resolved: ${disputeStats.resolved}</div>
            <div>Pending Votes: ${disputeStats.pendingVotes}</div>
        </div>
        
        <div class="card">
            <h3>🔐 Hash Integrity</h3>
            <div class="stat">${hashStats.validHashes}</div>
            <div>Valid Hashes: ${hashStats.validHashes}</div>
            <div>Invalid: ${hashStats.invalidHashes}</div>
            <div>Matches: ${hashStats.matches}</div>
        </div>
    </div>
    
    <div class="card">
        <h3>🚀 Quick Actions</h3>
        <button onclick="runScript('validate')">Validate Tickets</button>
        <button onclick="runScript('create')">Create Test Ticket</button>
        <button onclick="location.reload()">Refresh</button>
    </div>
    
    <script>
        function runScript(action) {
            fetch('/council/' + action, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    alert(JSON.stringify(data, null, 2));
                    location.reload();
                });
        }
    </script>
</body>
</html>`;
      
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    
    // API: Validate tickets
    if (url.pathname === '/council/validate' && req.method === 'POST') {
      const result = await CouncilScripts["validate:tickets"]();
      return Response.json(result);
    }
    
    // API: Create test ticket
    if (url.pathname === '/council/create' && req.method === 'POST') {
      const ticket = await CouncilTicketFactory.createTicket(
        { type: 'test', source: 'dashboard' },
        'DISPUTE-TEST'
      );
      return Response.json(ticket);
    }
    
    // API: Stats
    if (url.pathname === '/council/stats') {
      return Response.json({
        factory: CouncilTicketFactory.getStats(),
        disputes: CouncilDisputeResolution.getStats()
      });
    }
    
    return new Response('Council Protocol API - Use /council/dashboard', { status: 404 });
  }
});

// ====================
// 5. STARTUP & CLI
// ====================
async function startCouncilProtocol() {
  console.log(`
⚖️ COUNCIL PROTOCOL INITIALIZING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: ULTRA (n=18–20)
Version: v4.0.0
Database: SQLite (WAL mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // Initialize databases
  await CouncilTicketFactory.initialize();
  await CouncilDisputeResolution.initialize();
  
  // Start dashboard
  console.log(`📊 Dashboard: http://localhost:${server.port}/council/dashboard`);
  
  // Create sample ticket
  await CouncilTicketFactory.createTicket(
    { type: 'initialization', version: '4.0.0' },
    'DISPUTE-INIT'
  );
  
  // Auto-validate every 5 minutes
  setInterval(async () => {
    console.log('⏰ Running scheduled validation...');
    await CouncilScripts["validate:tickets"]();
  }, 5 * 60 * 1000);
}

// CLI argument parsing
const args = process.argv.slice(2);

if (args.includes('--validate')) {
  await CouncilTicketFactory.initialize();
  await CouncilScripts["validate:tickets"]();
  process.exit(0);
}

if (args.includes('--create')) {
  await CouncilTicketFactory.initialize();
  const ticket = await CouncilTicketFactory.createTicket(
    { type: 'cli', timestamp: Date.now() },
    'DISPUTE-CLI'
  );
  console.log(ticket);
  process.exit(0);
}

if (args.includes('--stats')) {
  await CouncilTicketFactory.initialize();
  console.log(CouncilTicketFactory.getStats());
  process.exit(0);
}

// Start server if no CLI args
if (args.length === 0) {
  startCouncilProtocol();
}

// Export for module usage
export { CouncilTicketFactory, CouncilDisputeResolution, sha256 };
