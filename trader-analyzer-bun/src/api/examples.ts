/**
 * [API.EXAMPLES.RG] API Examples Endpoint
 * Provides code examples for key Bun APIs and integrations used in NEXUS
 */

export interface APIExample {
	category: string;
	name: string;
	description: string;
	api: string;
	docsUrl: string;
	code: string;
	output?: string;
	related?: string[];
	filePath?: string;
	classRef?: string;
	functionRef?: string;
	lineNumber?: number;
}

export const apiExamples: APIExample[] = [
	{
		category: "Bun Runtime",
		name: "Bun.CookieMap",
		description: "Parse and manage HTTP cookies",
		api: "Bun.CookieMap",
		docsUrl: "https://bun.com/reference",
		code: `// Parse cookies from request header
const cookies = new Bun.CookieMap(req.headers.get('cookie') || '');

// Get cookie value
const sessionId = cookies.get('session');

// Set cookie
cookies.set('session', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600
});

// Delete cookie
cookies.delete('oldSession');

// Generate Set-Cookie headers
const headers = cookies.toSetCookieHeaders();`,
		related: ["URLSearchParams", "Bun.serve"],
	},
	{
		category: "Bun Runtime",
		name: "URLSearchParams",
		description: "Build and parse URL query parameters",
		api: "URLSearchParams",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		code: `// Create from URL
const myURL = new URL('https://example.org/?a=b&c=d');
myURL.searchParams.forEach((value, name, searchParams) => {
  console.log(name, value, myURL.searchParams === searchParams);
});
// Prints: a b true, c d true

// Build query string
const params = new URLSearchParams();
params.set('category', 'crypto');
params.set('minSpread', '0.01');
const queryString = params.toString(); // "category=crypto&minSpread=0.01"

// Use with fetch
const response = await fetch(\`/api/arbitrage/opportunities?\${params}\`);

// NOTE: HTML entities in URLs are parsed as separators
// Standard entities: &#x26; (hex), &#38; (decimal), &amp; (named)
// Malformed entities with spaces (e.g., &#x26 ;) are still parsed
// See CorrectedForensicLogger for entity handling`,
		output: `a b true
c d true`,
		related: ["Bun.CookieMap", "fetch"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.serve()",
		description: "Create HTTP/WebSocket server",
		api: "Bun.serve",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		code: `// HTTP server
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }
    return new Response('Not Found', { status: 404 });
  }
});

// WebSocket server
const wsServer = Bun.serve({
  port: 8080,
  websocket: {
    message(ws, message) {
      ws.send(\`Echo: \${message}\`);
    },
    open(ws) {
      console.log('Client connected');
    }
  },
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('WebSocket server');
  }
});`,
		related: ["Bun.CookieMap", "URLSearchParams"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.file()",
		description: "Read and write files",
		api: "Bun.file",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		code: `// Read file
const file = Bun.file('data/trades.json');
const content = await file.text();
const json = await file.json();

// Write file
await Bun.write('output.json', JSON.stringify(data, null, 2));

// Check if file exists
if (await file.exists()) {
  const size = file.size;
  const type = file.type;
}

// Stream file
const stream = file.stream();
const reader = stream.getReader();`,
		related: ["Bun.write", "Bun.read"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.secrets",
		description: "Secure credential storage",
		api: "Bun.secrets",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		code: `// Get secret (set via: bun secret set TELEGRAM_BOT_TOKEN)
const botToken = Bun.secrets.TELEGRAM_BOT_TOKEN;

// Use with fallback
const token = Bun.secrets.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

// Check if secret exists
if (Bun.secrets.TELEGRAM_BOT_TOKEN) {
  // Use secret
}

// List all secrets (for debugging, be careful!)
console.log(Object.keys(Bun.secrets));`,
		related: ["process.env"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.shell ($)",
		description: "Execute shell commands safely",
		api: "Bun.shell",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		code: `import { $ } from 'bun';

// Execute command
await $\`echo "Hello World"\`;

// Get output
const output = await $\`git rev-parse HEAD\`.text();

// Pipe commands
const result = await $\`ls src/**/*.ts | wc -l\`.text();

// With environment variables
await $\`FOO=bar bun -e 'console.log(process.env.FOO)'\`.env({ FOO: 'bar' });

// Redirect to file
await $\`echo "data" > output.txt\`;

// Error handling
try {
  await $\`invalid-command\`;
} catch (error) {
  console.error('Command failed:', error);
}`,
		related: ["Bun.file", "process.env"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.nanoseconds()",
		description: "High-precision timing",
		api: "Bun.nanoseconds",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		code: `// Measure execution time
const start = Bun.nanoseconds();
await expensiveOperation();
const end = Bun.nanoseconds();
const duration = (end - start) / 1_000_000; // Convert to milliseconds

// Benchmark function
function benchmark(fn: () => void) {
  const start = Bun.nanoseconds();
  fn();
  const end = Bun.nanoseconds();
  return (end - start) / 1_000_000;
}

const time = benchmark(() => {
  // Your code here
});`,
		related: ["Bun.sleep", "Date.now"],
	},
	{
		category: "Telegram API",
		name: "sendMessage",
		description: "Send message to Telegram chat",
		api: "Telegram Bot API",
		docsUrl: "https://core.telegram.org/bots/api#sendmessage",
		code: `// Using TelegramBotApi class
import { TelegramBotApi } from './api/telegram-ws';

const bot = new TelegramBotApi(Bun.secrets.TELEGRAM_BOT_TOKEN);
const chatId = Bun.secrets.TELEGRAM_CHAT_ID;

// Send simple message
await bot.sendMessage(chatId, 'Hello from NEXUS!');

// Send with options
await bot.sendMessage(chatId, 'Formatted message', {
  parse_mode: 'Markdown',
  disable_web_page_preview: true
});

// Send to forum topic
await bot.sendMessage(chatId, 'Topic message', {
  message_thread_id: 12345
});`,
		related: ["Bun.secrets", "fetch", "URLSearchParams"],
	},
	{
		category: "Telegram API",
		name: "getForumTopics",
		description: "List forum topics in supergroup",
		api: "Telegram Bot API",
		docsUrl: "https://core.telegram.org/bots/api#getforumtopics",
		code: `// Get all forum topics
const topics = await bot.getForumTopics(chatId);

// Iterate topics
for (const topic of topics.topics) {
  console.log(\`Topic: \${topic.name}, ID: \${topic.message_thread_id}\`);
}

// Find topic by name
const topic = topics.topics.find(t => t.name === 'Trading Alerts');

if (topic) {
  await bot.sendMessage(chatId, 'Alert!', {
    message_thread_id: topic.message_thread_id
  });
}`,
		related: ["sendMessage", "Bun.secrets"],
	},
	{
		category: "HTTP",
		name: "fetch with URLSearchParams",
		description: "Make HTTP requests with query parameters",
		api: "fetch",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		code: `// Build query parameters
const params = new URLSearchParams();
params.set('category', 'crypto');
params.set('minSpread', '0.01');
params.set('status', 'active');

// Make request
const response = await fetch(\`http://localhost:3000/api/arbitrage/opportunities?\${params}\`);

if (response.ok) {
  const data = await response.json();
  console.log(\`Found \${data.opportunities.length} opportunities\`);
}

// With headers
const response2 = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${token}\`
  },
  body: JSON.stringify({ data: 'value' })
});`,
		related: ["URLSearchParams", "Bun.serve"],
	},
	{
		category: "Database",
		name: "bun:sqlite",
		description: "SQLite database operations",
		api: "bun:sqlite",
		docsUrl: "https://bun.com/reference",
		code: `import { Database } from 'bun:sqlite';

// Open database
const db = new Database('data/trades.db');

// Create table
db.exec(\`
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    symbol TEXT,
    price REAL,
    quantity REAL,
    timestamp INTEGER
  )
\`);

// Insert data
const insert = db.prepare('INSERT INTO trades VALUES (?, ?, ?, ?, ?)');
insert.run(uuid, 'BTC/USD', 50000, 0.1, Date.now());

// Query data
const query = db.prepare('SELECT * FROM trades WHERE symbol = ?');
const trades = query.all('BTC/USD');

// Transaction
const insertMany = db.transaction((trades) => {
  for (const trade of trades) {
    insert.run(trade.id, trade.symbol, trade.price, trade.quantity, trade.timestamp);
  }
});

insertMany([trade1, trade2, trade3]);`,
		related: ["Bun.file", "Bun.randomUUIDv5"],
	},
	{
		category: "Security & Research",
		name: "URLSearchParams.forEach() - HTML Entity Parsing",
		description:
			"URLSearchParams parses HTML entities as parameter separators - critical security discovery",
		api: "URLSearchParams",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		filePath: "src/research/fingerprinting/url-encoding-anomalies.ts",
		classRef: "UrlAnomalyDetector",
		functionRef: "testBookmakerEncoding",
		code: `// Bun Native APIs Used:
// - URLSearchParams (global) - https://bun.com/reference/globals/URLSearchParams
// - URL (global) - https://bun.com/reference/globals/URL
// - fetch (global) - Bun native fetch API
// - Database (bun:sqlite) - https://bun.com/reference
//
// #REF:src/research/fingerprinting/url-encoding-anomalies.ts:UrlAnomalyDetector

import { Database } from 'bun:sqlite';

export class UrlAnomalyDetector {
  /**
   * Uses: URLSearchParams.forEach(), URL.searchParams, fetch()
   * @see Bun API: URLSearchParams - https://bun.com/reference/globals/URLSearchParams
   */
  async testBookmakerEncoding(bookmaker: string): Promise<{
    handlesHtmlEntities: boolean,
    entityVariants: string[],
    securityRisk: 'low' | 'medium' | 'high',
    errorDetails?: Array<{ encoding: string; httpError?: { status: number; statusText: string; category: string } }>
  }> {
    // URLSearchParams behavior: HTML entities parsed as separators
    const testCases = [
      '?team=NE&amp;spread=-3',        // &amp; entity
      '?a=b&#x26;c=d',                // Hex entity &#x26;
      '?a=b&#38;c=d',                 // Decimal entity &#38;
      '?a=b&undefined=c',             // JavaScript undefined
      '?a=b&%26=c',                   // URL encoded &
    ];

    // Bun native fetch() - https://bun.com/docs/runtime/bun-apis
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const testUrl = \`https://api.\${bookmaker}.com/test\${testCase}\`;
        try {
          // Bun.fetch() - native implementation
          const response = await fetch(testUrl, { method: 'HEAD' });
          
          // Enhanced error details for non-200 responses
          if (!response.ok) {
            const category = response.status >= 400 && response.status < 500 
              ? 'client_error' 
              : response.status >= 500 
              ? 'server_error' 
              : 'unknown';
            
            return {
              encoding: testCase,
              status: response.status,
              error: null,
              httpError: {
                status: response.status,
                statusText: response.statusText,
                category
              }
            };
          }
          
          return {
            encoding: testCase,
            status: response.status,
            error: null
          };
        } catch (error) {
          // Network errors (DNS, connection refused, etc.)
          return {
            encoding: testCase,
            status: 'error',
            error: error.message,
            httpError: {
              status: 0,
              statusText: 'Network Error',
              category: 'network_error'
            }
          };
        }
      })
    );

    // Extract error details for analysis
    const errorDetails = results
      .filter(r => r.status !== 200)
      .map(r => ({
        encoding: r.encoding,
        httpError: r.httpError
      }));

    return {
      handlesHtmlEntities: results.some(r => r.status === 200 && r.encoding.includes('entity')),
      entityVariants: results.filter(r => r.status === 200 && r.encoding.includes('entity')).map(p => p.encoding),
      securityRisk: results.filter(r => r.status === 200 && r.encoding.includes('entity')).length > 2 ? 'high' 
                  : results.some(r => r.status === 200 && r.encoding.includes('entity')) ? 'medium' 
                  : 'low',
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    };
  }

  /**
   * Uses: Database.query(), Database.all(), URL.searchParams, URLSearchParams.length
   * @see Bun API: Database (bun:sqlite) - https://bun.com/reference
   * 
   * NOTE: Threshold is now dynamic based on endpoint configuration
   * See CorrectedForensicLogger.auditForensicLogs() for production implementation
   */
  auditForensicCapture(
    db: Database, 
    endpointConfig?: { endpoint: string; expectedParamCount: number }
  ): Array<{ auditId: string; raw_url: string; paramCount: number; threshold: number }> {
    // Database.query() - bun:sqlite native method
    // Type: Database from bun:sqlite
    const suspiciousUrls = db.query(\`
      SELECT auditId, raw_url, bookmaker
      FROM line_movement_audit_v2
      WHERE raw_url LIKE '%amp;%' 
         OR raw_url LIKE '%&#%'
    \`).all() as Array<{ auditId: string; raw_url: string; bookmaker: string }>;

    const results: Array<{ auditId: string; raw_url: string; paramCount: number; threshold: number }> = [];
    
    // Dynamic threshold based on endpoint configuration
    const threshold = endpointConfig 
      ? endpointConfig.expectedParamCount + 2  // Allow 2 parameter variation
      : 5; // Default threshold if no config

    for (const { auditId, raw_url } of suspiciousUrls) {
      // URL constructor - Bun native global
      const parsed = new URL(raw_url);
      
      // URLSearchParams - property of URL
      // searchParams.length - number of parameters
      const paramCount = [...parsed.searchParams].length;
      
      if (paramCount > threshold) {
        results.push({ auditId, raw_url, paramCount, threshold });
        this.flagForReview(auditId, raw_url, paramCount);
      }
    }
    
    return results;
  }
}`,
		output: `a b true
c d true`,
		related: ["URLSearchParams", "Bun.serve", "fetch"],
	},
	{
		category: "Security & Research",
		name: "Bookmaker Profile Registry - Endpoint Parameter Configuration",
		description:
			"Profile bookmaker endpoints and store expected parameter counts in registry for forensic logging",
		api: "Database.run() + BookmakerProfile",
		docsUrl: "https://bun.com/reference",
		filePath: "src/logging/bookmaker-profile.ts",
		classRef: "profileBookmakerEndpoint",
		functionRef: "profileBookmakerEndpoint",
		code: `// Bun Native APIs Used:
// - Database.run() - https://bun.com/reference
// - Database.query() - https://bun.com/reference
// - JSON.stringify() - JavaScript native
// - Map - JavaScript native
//
// #REF:src/logging/bookmaker-profile.ts:profileBookmakerEndpoint

import { profileBookmakerEndpoint, updateBookmakerProfile, loadBookmakerProfile, buildEndpointConfig } from '../logging/bookmaker-profile';
import { Database } from 'bun:sqlite';

/**
 * Uses: Database operations, BookmakerProfile
 * Profile bookmaker endpoints and store expected parameter counts
 * @see Security: Bookmaker Profile Registry - src/logging/bookmaker-profile.ts
 */

const db = new Database('security.db');

// During bookmaker profiling phase, record expected parameter counts per endpoint
// Profile endpoint: /v2/events/:id/odds expects 2 parameters (eventId, format)
await profileBookmakerEndpoint(db, 'draftkings', '/v2/events/:id/odds', 2);

// Profile endpoint: /v2/events/:id/markets expects 3 parameters (eventId, marketType, format)
await profileBookmakerEndpoint(db, 'draftkings', '/v2/events/:id/markets', 3);

// Update full profile with URL encoding behavior
updateBookmakerProfile(db, {
  bookmaker: 'draftkings',
  name: 'DraftKings',
  endpoints: new Map([
    ['/v2/events/:id/odds', 2],
    ['/v2/events/:id/markets', 3],
    ['/v2/events/:id/live', 4]
  ]),
  defaultThreshold: 5,
  urlEncodingBehavior: {
    handlesHtmlEntities: false,
    entityVariants: [],
    securityRisk: 'low'
  },
  lastProfiled: Date.now()
});

// Load profile for use in CorrectedForensicLogger
const profile = loadBookmakerProfile(db, 'draftkings');
if (profile) {
  const endpointConfig = buildEndpointConfig(profile);
  console.log(\`Loaded profile: \${profile.name}\`);
  console.log(\`Endpoints: \${profile.endpoints.size}\`);
  
  // Use endpointConfig in CorrectedForensicLogger
  const logger = new CorrectedForensicLogger(config, {
    endpointConfig
  });
}`,
		related: ["Database.run", "Database.query", "CorrectedForensicLogger"],
	},
	{
		category: "Security & Research",
		name: "URLSearchParams + Database.run() - Malicious Query Detection",
		description:
			"Detect HTML entities using URLSearchParams and log to bun:sqlite Database",
		api: "URLSearchParams + Database",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		filePath: "src/security/malicious-query-detection.ts",
		classRef: "MaliciousQueryDetector",
		functionRef: "sanitizeUrlForLogging",
		code: `// Bun Native APIs Used:
// - URLSearchParams (global) - https://bun.com/reference/globals/URLSearchParams
// - URL (global) - https://bun.com/reference/globals/URL
// - Database.run() (bun:sqlite) - https://bun.com/reference
// - String.match() - JavaScript native
// - Date.now() - JavaScript native
//
// #REF:src/security/malicious-query-detection.ts:MaliciousQueryDetector

import { Database } from 'bun:sqlite';

export class MaliciousQueryDetector {
  // RegExp patterns - JavaScript native
  private readonly ENTITY_PATTERNS = [
    /&amp;/gi,           // HTML entity &
    /&#[xX]?26[^;]*;/gi, // Hex/decimal & entity
    /&colon;/gi,        // HTML entity :
    /&lt;/gi,           // HTML entity <
    /&gt;/gi,           // HTML entity >
  ];

  /**
   * Uses: URL constructor, URL.searchParams, URLSearchParams.length
   * @see Bun API: URL - https://bun.com/reference/globals/URL
   * @see Bun API: URLSearchParams - https://bun.com/reference/globals/URLSearchParams
   */
  sanitizeUrlForLogging(url: string): {
    original: string,
    sanitized: string,
    threatLevel: 'none' | 'suspicious' | 'malicious',
    parametersCaptured: number
  } {
    let threatLevel: 'none' | 'suspicious' | 'malicious' = 'none';
    let sanitized = url;

    // String.match() - JavaScript native, returns array or null
    const entityCount = this.ENTITY_PATTERNS.reduce(
      (count, pattern) => {
        const matches = url.match(pattern);
        return count + (matches?.length || 0);
      },
      0
    );

    if (entityCount > 2) {
      threatLevel = 'malicious';
      sanitized = url.replace(/&[^;]+;/g, '[ENTITY]');
    } else if (entityCount > 0) {
      threatLevel = 'suspicious';
    }

    // URL constructor - Bun native global
    const parsed = new URL(url);
    
    // URLSearchParams - property of URL
    // Spread operator converts URLSearchParams to array
    // .length property gives parameter count
    const paramCount = [...parsed.searchParams].length;

    return {
      original: url,
      sanitized,
      threatLevel,
      parametersCaptured: paramCount
    };
  }

  /**
   * Uses: Database.run() - bun:sqlite native method
   * @see Bun API: Database.run() - https://bun.com/reference
   */
  async validateBookmakerRequest(
    url: string, 
    bookmaker: string,
    db: Database
  ): Promise<{
    allowed: boolean,
    reason?: string,
    quarantine?: boolean
  }> {
    const detection = this.sanitizeUrlForLogging(url);

    // Database.run() - bun:sqlite native method
    // Parameters: SQL string, ...values
    if (detection.threatLevel !== 'none') {
      db.run(\`
        INSERT INTO security_audit_log (url, threat_level, parameters_captured, detected_at)
        VALUES (?1, ?2, ?3, ?4)
      \`, url, detection.threatLevel, detection.parametersCaptured, Date.now());
    }

    if (detection.threatLevel === 'malicious') {
      return {
        allowed: false,
        reason: 'Malicious query parameters detected',
        quarantine: true
      };
    }

    return { allowed: true };
  }
}`,
		related: ["URLSearchParams", "fetch", "Bun.serve"],
	},
	{
		category: "Security & Research",
		name: "CorrectedForensicLogger - URL Entity Parsing Correction",
		description:
			"Detect and correct HTML entity encoding in URLs that causes parameter splitting",
		api: "CorrectedForensicLogger",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		filePath: "src/logging/corrected-forensic-logger.ts",
		classRef: "CorrectedForensicLogger",
		functionRef: "fetchCompressedOdds",
		code: `// Bun Native APIs Used:
// - Bun.randomUUIDv7() - https://bun.com/docs/runtime/bun-apis
// - URLSearchParams (global) - https://bun.com/reference/globals/URLSearchParams
// - URL (global) - https://bun.com/reference/globals/URL
// - Map (JavaScript native) - for corrected parameter storage
// - Database (bun:sqlite) - https://bun.com/reference
// - fetch() - Bun native HTTP client
//
// #REF:src/logging/corrected-forensic-logger.ts:CorrectedForensicLogger

import { CorrectedForensicLogger } from '../logging/corrected-forensic-logger';
import { RuntimeSecurityMonitor } from '../security/runtime-monitor';

/**
 * Uses: CorrectedForensicLogger - URL entity parsing correction
 * Detect and correct HTML entity encoding in URLs that causes parameter splitting
 * @see Security: CorrectedForensicLogger - src/logging/corrected-forensic-logger.ts
 */
const bookmakerConfig = new Map([
  ['bookmaker', {
    baseUrl: 'https://api.bookmaker.com',
    apiKey: 'your-api-key',
    headers: { 'Authorization': 'Bearer your-token' }
  }]
]);

const securityMonitor = new RuntimeSecurityMonitor();
const logger = new CorrectedForensicLogger(
  { bookmakers: bookmakerConfig },
  { securityMonitor }
);

// Fetch odds - automatically detects and corrects entity encoding
try {
  const odds = await logger.fetchCompressedOdds('bookmaker', 'event-123');
  console.log('Odds fetched:', odds);
} catch (error) {
  console.error('Fetch failed:', error);
}

// Audit existing logs for anomalies
logger.auditForensicLogs();

logger.close();
securityMonitor.destroy();

// Example: Override fetchCompressedOdds to detect URL parsing anomalies
override async fetchCompressedOdds(bookmaker: string, eventId: string): Promise<any> {
  const baseUrl = this.config.bookmakers.get(bookmaker)!.baseUrl;
  const url = \`\${baseUrl}/v2/events/\${eventId}/odds\`;
  
  // URL constructor - Bun native global
  const previewParsed = new URL(url);
  
  // URLSearchParams - property of URL
  // Spread operator converts to array for .length
  const expectedParams = this.getExpectedParameterCount(url);
  const actualParams = [...previewParsed.searchParams].length;

  if (actualParams > expectedParams) {
    // Use custom parser
    const correctedParams = this.parseUrlWithEntities(url);
    
    this.logUrlParsingAnomaly({
      bookmaker,
      eventId,
      originalUrl: url,
      parsedParams: [...previewParsed.searchParams],
      correctedParams,
      threatLevel: 'suspicious'
    });
  }

  return super.fetchCompressedOdds(bookmaker, eventId);
}

// Example: Parse URL with entity encoding correction
private parseUrlWithEntities(url: string): Map<string, string> {
  // String.replace() - JavaScript native regex replacement
  // Escapes HTML entities temporarily
  const escaped = url.replace(/&([^;]+);/g, '__ENTITY__$1__');
  
  // URL constructor - Bun native global
  const parsed = new URL(escaped);
  
  // Map constructor - JavaScript native
  const corrected = new Map<string, string>();
  
  // URLSearchParams iteration - for...of loop
  // URLSearchParams is iterable, yields [key, value] pairs
  for (const [key, value] of parsed.searchParams) {
    // String.replace() - restore entities
    const restoredKey = key.replace(/__ENTITY__([^_]+)__/g, '&$1;');
    const restoredValue = value.replace(/__ENTITY__([^_]+)__/g, '&$1;');
    
    // Map.set() - JavaScript native method
    corrected.set(restoredKey, restoredValue);
  }
  
  return corrected;
}

// Example: Log URL parsing anomaly to database
private logUrlParsingAnomaly(anomaly: {
  bookmaker: string,
  eventId: string,
  originalUrl: string,
  parsedParams: [string, string][],
  correctedParams: Map<string, string>,
  threatLevel: string
}): void {
  // Database.run() - bun:sqlite native method
  // Map.size - JavaScript native property
  this.db.run(\`
    INSERT INTO url_anomaly_audit (
      bookmaker, eventId, original_url, parsed_param_count, corrected_param_count,
      threat_level, detected_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
  \`, anomaly.bookmaker, anomaly.eventId, anomaly.originalUrl,
       anomaly.parsedParams.length, anomaly.correctedParams.size,
       anomaly.threatLevel, Date.now());
}`,
		related: ["URLSearchParams", "bun:sqlite", "fetch"],
	},
	{
		category: "Security & Research",
		name: "Database.run() + JSON.stringify() - Bookmaker Registry Update",
		description:
			"Update bookmaker profiles with URL encoding behavior using bun:sqlite Database.run()",
		api: "Database.run() + JSON.stringify()",
		docsUrl: "https://bun.com/reference",
		filePath: "src/security/bookmaker-url-profile.ts",
		classRef: "updateRegistryWithUrlBehavior",
		functionRef: "updateRegistryWithUrlBehavior",
		code: `// Bun Native APIs Used:
// - Database.run() (bun:sqlite) - https://bun.com/reference
// - JSON.stringify() - JavaScript native
// - Date.now() - JavaScript native
//
// #REF:src/security/bookmaker-url-profile.ts:updateRegistryWithUrlBehavior

import { Database } from 'bun:sqlite';

/**
 * Uses: Database.run(), JSON.stringify(), Date.now()
 * Updates bookmaker registry with URL encoding behavior profile
 * @see Bun API: Database.run() - https://bun.com/reference
 */
export async function updateRegistryWithUrlBehavior(
  bookmaker: string,
  db: Database
): Promise<void> {
  // UrlAnomalyDetector.testBookmakerEncoding() - returns test results
  const testResults = await new UrlAnomalyDetector().testBookmakerEncoding(bookmaker);
  
  // Database.run() - bun:sqlite native method
  // JSON.stringify() - JavaScript native - converts object to JSON string
  // Date.now() - JavaScript native - returns current timestamp
  db.run(\`
    UPDATE bookmaker_registry 
    SET url_encoding_behavior = ?1,
        security_risk_level = ?2,
        requires_url_escaping = ?3
    WHERE bookmaker = ?4
  \`, 
    // Parameter 1: JSON string of encoding behavior
    JSON.stringify({
      handlesHtmlEntities: testResults.handlesHtmlEntities,
      entityVariants: testResults.entityVariants,
      lastTested: Date.now()
    }),
    // Parameter 2: Security risk level string
    testResults.securityRisk,
    // Parameter 3: Boolean - requires escaping if risk is not low
    testResults.securityRisk !== 'low',
    // Parameter 4: Bookmaker name
    bookmaker
  );
}

// Usage
await updateRegistryWithUrlBehavior('DraftKings', db);
// Updates registry with DraftKings' URL encoding behavior profile`,
		related: ["Database.run", "JSON.stringify", "Date.now"],
	},
	{
		category: "Security & Research",
		name: "String.match() + RegExp - Alert Rule Evaluator",
		description:
			"Custom alert rule using String.match() and RegExp to detect URL anomalies",
		api: "String.match() + RegExp",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		filePath: ".hyper-bun/config/alerts.v1.yaml",
		classRef: "url_encoding_anomaly",
		functionRef: "evaluator",
		code: `// Bun Native APIs Used:
// - String.match() - JavaScript native regex matching
// - RegExp - JavaScript native regular expressions
// - Object property access - JavaScript native
//
// #REF:.hyper-bun/config/alerts.v1.yaml:url_encoding_anomaly

// Alert configuration file (YAML)
alerts:
  url_encoding_anomaly:
    rule_type: custom
    severity: high
    evaluator: |
      // Custom evaluator function
      // Runs for each audit log entry
      (audit) => {
        // String.match() - JavaScript native method
        // /&[^;]+;/g - RegExp pattern matching HTML entities
        // Returns array of matches or null
        const entityCount = (audit.raw_url.match(/&[^;]+;/g) || []).length;
        
        // Object property access - JavaScript native
        // Check if entity count > 1 AND bookmaker has high risk level
        return entityCount > 1 && audit.bookmaker.security_risk_level === 'high';
      }
    actions:
      - quarantine_request: true
      - alert_trader: { priority: "urgent", message: "Potential injection attempt" }
      - log: { level: "security", tags: ["url-anomaly", "injection"] }

// How it works:
// 1. For each audit log entry, runs the evaluator function
// 2. String.match() finds all HTML entities in the URL
// 3. If entity count > 1 AND bookmaker is high-risk → trigger alert
// 4. Actions: quarantine request, alert trader, log security event`,
		related: ["String.match", "RegExp"],
	},
	{
		category: "Security & Research",
		name: "Bun.shell ($) - Production Hardening Scripts",
		description:
			"Use Bun.shell ($) to run production hardening scripts for URL anomaly detection",
		api: "Bun.shell ($)",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "scripts/audit-url-anomalies.ts",
		classRef: "ProductionHardening",
		functionRef: "runHardeningChecklist",
		code: `// Bun Native APIs Used:
// - Bun.shell ($) - https://bun.com/docs/runtime/bun-apis
// - Bun.file() - https://bun.com/docs/runtime/bun-apis
// - process.argv - Node.js/Bun process arguments
//
// #REF:scripts/audit-url-anomalies.ts:ProductionHardening

import { $ } from 'bun';

/**
 * Uses: Bun.shell ($), Bun.file(), process.argv
 * Production hardening checklist for URL anomaly detection
 * @see Bun API: Bun.shell - https://bun.com/docs/runtime/bun-apis
 */
export class ProductionHardening {
  /**
   * 1. Audit existing forensic logs for URL anomalies
   * Uses: Bun.shell ($) to execute TypeScript script
   */
  async auditForensicLogs(): Promise<void> {
    // Bun.shell ($) - native Bun shell command execution
    // Template literal syntax for command interpolation
    await $\`bun run scripts/audit-url-anomalies.ts \\
      --db=.hyper-bun/data/forensic-audit-v2.db \\
      --output=suspicious-urls.json\`;
  }

  /**
   * 2. Test all bookmaker APIs for entity handling
   * Uses: Bun.shell ($) with multiple bookmakers
   */
  async testBookmakerEncoding(): Promise<void> {
    // Bun.shell ($) - execute script with comma-separated bookmakers
    await $\`bun run scripts/test-bookmaker-encoding.ts \\
      --bookmakers=DraftKings,FanDuel,BetMGM,Caesars \\
      --output=encoding-profile.json\`;
  }

  /**
   * 3. Update registry with URL behavior profiles
   * Uses: Bun.shell ($) with input file
   */
  async updateRegistry(): Promise<void> {
    // Bun.shell ($) - pass input file as argument
    await $\`bun run scripts/update-registry-url-behavior.ts \\
      --input=encoding-profile.json\`;
  }

  /**
   * 4. Deploy corrected forensic logger
   * Uses: Bun.build() - Bun native build API
   */
  async deployLogger(): Promise<void> {
    // Bun.build() - Bun native compilation API
    // Compiles TypeScript to executable binary
    // Note: Now throws AggregateError by default on failure
    try {
      await Bun.build({
        entrypoints: ['./src/logging/corrected-forensic-logger.ts'],
        outdir: './dist',
        target: 'bun',
        format: 'esm'
      });
    } catch (error) {
      if (error instanceof AggregateError) {
        console.error('Build failed:', error.errors);
      } else {
        console.error('Build failed:', error);
      }
      throw error;
    }
  }

  /**
   * 5. Enable URL anomaly alerts
   * Uses: Bun.shell ($) to run MCP tool
   */
  async enableAlerts(): Promise<void> {
    // Bun.shell ($) - execute MCP alert management tool
    await $\`bun run mcp/alert-management create-rule --file=alerts/url-anomaly.yaml\`;
  }

  /**
   * Run complete hardening checklist
   */
  async runHardeningChecklist(): Promise<void> {
    console.log('🔒 Starting production hardening...');
    
    await this.auditForensicLogs();
    await this.testBookmakerEncoding();
    await this.updateRegistry();
    await this.deployLogger();
    await this.enableAlerts();
    
    console.log('✅ Production hardening complete!');
  }
}

// Usage
const hardening = new ProductionHardening();
await hardening.runHardeningChecklist();`,
		related: ["Bun.shell", "Bun.build", "Bun.file"],
	},
	{
		category: "Security & Research",
		name: "Array.filter() + String.includes() - Pattern Detection",
		description:
			"Detect URL artifact patterns in line movement data using Array.filter() and String.includes()",
		api: "Array.filter() + String.includes()",
		docsUrl: "https://bun.com/reference/globals/URLSearchParams",
		filePath: "src/research/patterns/url-artifact-patterns.ts",
		classRef: "detectUrlArtifactPatterns",
		functionRef: "detectUrlArtifactPatterns",
		code: `// Bun Native APIs Used:
// - Array.filter() - JavaScript native array method
// - String.includes() - JavaScript native string method
// - Array.length - JavaScript native property
// - Date.now() - JavaScript native
//
// #REF:src/research/patterns/url-artifact-patterns.ts:detectUrlArtifactPatterns

/**
 * Uses: Array.filter(), String.includes(), Array.length, Date.now()
 * Detect patterns created by URL encoding bugs in line movement data
 * @see JavaScript: Array.filter() - native array method
 * @see JavaScript: String.includes() - native string method
 */
export function detectUrlArtifactPatterns(movements: Array<{
  raw_url: string;
  bookmaker: string;
  timestamp: number;
  [key: string]: any;
}>): Array<{
  patternId: string;
  pattern_name: string;
  discovered_at: number;
  pre_conditions: Record<string, any>;
  expected_outcome: string;
  backtest_accuracy: number;
  confidence_level: number;
  is_active: boolean;
  is_validated: boolean;
  notes: string;
}> {
  // Array.filter() - JavaScript native method
  // String.includes() - JavaScript native method
  // Filters movements that contain HTML entities in URLs
  const artifacts = movements.filter(m => 
    m.raw_url.includes('amp;') || 
    m.raw_url.includes('&#')
  );

  // Array.length - JavaScript native property
  // Check if artifacts represent >10% of movements
  if (artifacts.length > movements.length * 0.1) {
    // Date.now() - JavaScript native - returns current timestamp
    return [{
      patternId: \`url_artifact_\${Date.now()}\`,
      pattern_name: 'URL Entity Artifact - Duplicate Moves',
      discovered_at: Date.now(),
      pre_conditions: {
        bookmaker: artifacts[0].bookmaker,
        url_contains: '&amp;'
      },
      expected_outcome: 'Duplicate line movements within 100ms',
      // Calculate accuracy: artifacts / total movements
      backtest_accuracy: artifacts.length / movements.length,
      confidence_level: 0.8,
      is_active: true,
      is_validated: false,
      notes: 'Caused by bookmaker API parsing HTML entities as parameter separators'
    }];
  }

  // Return empty array if pattern not detected
  return [];
}

// Usage
const movements = [
  { raw_url: 'https://api.com/odds?event=123&amp;spread=5', bookmaker: 'DraftKings', timestamp: Date.now() },
  { raw_url: 'https://api.com/odds?event=123&spread=5', bookmaker: 'FanDuel', timestamp: Date.now() },
  // ... more movements
];

const patterns = detectUrlArtifactPatterns(movements);
console.log('Detected patterns:', patterns);`,
		related: ["Array.filter", "String.includes", "Date.now"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.shell ($) + Bun.file() - Native Log Viewer",
		description:
			"Read and stream log files using Bun.shell ($) with tail/grep piping and Bun.file()",
		api: "Bun.shell ($) + Bun.file()",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/logs-native.ts",
		classRef: "NativeLogViewer",
		functionRef: "readLogs",
		code: `// Bun Native APIs Used:
// - Bun.shell ($) - https://bun.com/docs/runtime/bun-apis
// - Bun.file() - https://bun.com/docs/runtime/bun-apis
// - Bun.spawn() - https://bun.com/docs/runtime/bun-apis
// - TextDecoder - JavaScript native
//
// #REF:src/utils/logs-native.ts:NativeLogViewer

import { $ } from 'bun';

export class NativeLogViewer {
  /**
   * Uses: Bun.shell ($), template literals for command building
   * Read log file with filtering using Bun Shell piping
   * @see Bun API: Bun.shell - https://bun.com/docs/runtime/bun-apis
   */
  async readLogs(filePath: string, filter?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    source?: string;
    search?: string;
    limit?: number;
  }): Promise<Array<{ timestamp: string; level: string; message: string }>> {
    // Bun.shell ($) - native Bun shell command execution
    // Template literal builds command with piping
    let command = \`tail -n \${filter?.limit || 100} \${filePath}\`;

    // Apply filters using grep piping
    if (filter?.level) {
      command += \` | grep -i "\${filter.level}"\`;
    }
    if (filter?.source) {
      command += \` | grep "\${filter.source}"\`;
    }
    if (filter?.search) {
      command += \` | grep -i "\${filter.search}"\`;
    }

    // Execute command and get text output
    const result = await $\`\${command}\`.text();
    const lines = result.trim().split('\\n').filter(Boolean);

    // Parse log lines
    return lines.map((line) => {
      const match = line.match(/^(\\d{4}-\\d{2}-\\d{2}T[\\d:.-]+Z)\\s+\\[(\\w+)\\]\\s+(.+)$/);
      if (match) {
        return {
          timestamp: match[1],
          level: match[2],
          message: match[3],
        };
      }
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: line,
      };
    });
  }

  /**
   * Uses: Bun.spawn(), TextDecoder, AsyncGenerator
   * Stream logs using Bun.spawn() with tail -f
   * @see Bun API: Bun.spawn() - https://bun.com/docs/runtime/bun-apis
   */
  async *streamLogs(filePath: string): AsyncGenerator<{
    timestamp: string;
    level: string;
    message: string;
  }> {
    // Bun.spawn() - native Bun process spawning
    const proc = Bun.spawn(['tail', '-f', filePath], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const reader = proc.stdout.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // TextDecoder - JavaScript native
        const text = new TextDecoder().decode(value);
        const lines = text.split('\\n').filter(Boolean);

        for (const line of lines) {
          const match = line.match(/^(\\d{4}-\\d{2}-\\d{2}T[\\d:.-]+Z)\\s+\\[(\\w+)\\]\\s+(.+)$/);
          if (match) {
            yield {
              timestamp: match[1],
              level: match[2],
              message: match[3],
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
      proc.kill();
    }
  }

  /**
   * Uses: Bun.shell ($) with grep and wc
   * Count log entries by level
   */
  async countLogsByLevel(filePath: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const level of ['error', 'warn', 'info', 'debug']) {
      // Bun.shell ($) - pipe grep to wc -l for counting
      const result = await $\`grep -i "\\\\[\${level}\\\\]" \${filePath} | wc -l\`.text();
      counts[level] = parseInt(result.trim(), 10) || 0;
    }

    return counts;
  }
}

// Usage
const viewer = new NativeLogViewer();
const logs = await viewer.readLogs('logs/app.log', { level: 'error', limit: 50 });
const counts = await viewer.countLogsByLevel('logs/app.log');

// Stream logs in real-time
for await (const log of viewer.streamLogs('logs/app.log')) {
  console.log(\`[\${log.level}] \${log.message}\`);
}`,
		related: ["Bun.shell", "Bun.file", "Bun.spawn"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.file() + Bun.write() - JSONL Logging",
		description:
			"Write structured logs in JSONL format using Bun.file() and Bun.write()",
		api: "Bun.file() + Bun.write()",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/cli/telegram.ts",
		classRef: "TelegramLogger",
		functionRef: "log",
		code: `// Bun Native APIs Used:
// - Bun.file() - https://bun.com/docs/runtime/bun-apis
// - Bun.write() - https://bun.com/docs/runtime/bun-apis
// - Date.toISOString() - JavaScript native
// - JSON.stringify() - JavaScript native
//
// #REF:src/cli/telegram.ts:TelegramLogger

import { join } from 'path';
import { mkdir } from 'node:fs/promises';

export class TelegramLogger {
  private logDir: string;
  private logFile: string;

  constructor(logDir: string) {
    this.logDir = logDir;
    // Date.toISOString() - JavaScript native
    const today = new Date().toISOString().split('T')[0];
    this.logFile = join(logDir, \`telegram-\${today}.jsonl\`);
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDirFile = Bun.file(this.logDir);
    if (!(await logDirFile.exists())) {
      await mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Uses: Bun.file(), Bun.write(), JSON.stringify()
   * Write log entry to JSONL file
   * @see Bun API: Bun.file() - https://bun.com/docs/runtime/bun-apis
   * @see Bun API: Bun.write() - https://bun.com/docs/runtime/bun-apis
   */
  async log(message: {
    timestamp: number;
    threadId?: number;
    messageId: number;
    text: string;
    [key: string]: any;
  }): Promise<void> {
    // JSON.stringify() - JavaScript native
    const line = JSON.stringify(message) + '\\n';
    
    // Bun.file() - native Bun file API
    const file = Bun.file(this.logFile);
    
    // Bun.write() - native Bun write API
    // createPath: true - creates directory if it doesn't exist
    await Bun.write(file, line, { createPath: true });
  }

  /**
   * Uses: Bun.file(), Bun.file().text()
   * Read log history from JSONL file
   */
  async getHistory(limit = 50): Promise<Array<Record<string, any>>> {
    // Bun.file() - native Bun file API
    const file = Bun.file(this.logFile);
    
    // Check if file exists
    if (!(await file.exists())) {
      return [];
    }

    // Bun.file().text() - read file as text
    const text = await file.text();
    const lines = text.trim().split('\\n').filter(Boolean);
    
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line))
      .reverse();
  }

  /**
   * Uses: Array.filter(), Array.slice()
   * Get history for specific thread
   */
  async getThreadHistory(threadId: number, limit = 20): Promise<Array<Record<string, any>>> {
    const history = await this.getHistory(1000);
    
    // Array.filter() - JavaScript native
    return history
      .filter((log) => log.threadId === threadId)
      .slice(0, limit);
  }
}

// Usage
const logger = new TelegramLogger('./logs');
await logger.log({
  timestamp: Date.now(),
  threadId: 12345,
  messageId: 67890,
  text: 'Hello from NEXUS!'
});

const history = await logger.getHistory(50);
const threadHistory = await logger.getThreadHistory(12345);`,
		related: ["Bun.file", "Bun.write", "JSON.stringify"],
	},
	{
		category: "Testing & Benchmarking",
		name: "Bun.nanoseconds() - Performance Benchmarking",
		description:
			"Measure performance using Bun.nanoseconds() for high-precision timing",
		api: "Bun.nanoseconds()",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/api/routes.ts",
		classRef: "benchmark",
		functionRef: "POST /ticks/benchmark",
		code: `// Bun Native APIs Used:
// - Bun.nanoseconds() - https://bun.com/docs/runtime/bun-apis
// - Date.now() - JavaScript native
// - Math.random() - JavaScript native
// - Array.sort() - JavaScript native
// - Array.reduce() - JavaScript native
//
// #REF:src/ticks/profiler.ts:benchmark
// #REF:src/api/routes.ts:POST /ticks/benchmark

import { benchmark } from '../ticks/profiler';

/**
 * Uses: Bun.nanoseconds(), benchmark() helper
 * Run performance benchmark for tick processing
 * @see Bun API: Bun.nanoseconds() - https://bun.com/docs/runtime/bun-apis
 */
export async function runTickBenchmark(
  iterations: number = 1000,
  ticksPerBatch: number = 10
): Promise<{
  benchmark: string;
  iterations: number;
  totalTicks: number;
  avgNsPerBatch: string;
  avgNsPerTick: string;
  opsPerSec: string;
}> {
  const processor = createTickProcessor();

  // Create sample tick
  const sampleTick = {
    venue: 'benchmark',
    instrumentId: 'TEST',
    timestamp: Date.now(),
    // Bun.nanoseconds() - high-precision timing
    receivedAt: Bun.nanoseconds(),
    bid: 100,
    ask: 100.01,
  };

  // benchmark() helper function (from profiler.ts)
  // Internally uses Bun.nanoseconds() for timing:
  // 1. Warmup phase (10% of iterations)
  // 2. Measure phase - records start/end with Bun.nanoseconds()
  // 3. Calculates: avgNs, minNs, maxNs, opsPerSec
  const result = await benchmark(
    'tick-processing',
    () => {
      for (let i = 0; i < ticksPerBatch; i++) {
        processor.processTick({
          ...sampleTick,
          timestamp: Date.now(),
          // Bun.nanoseconds() - measure receive time
          receivedAt: Bun.nanoseconds(),
          bid: 100 + Math.random() * 0.1,
          ask: 100.01 + Math.random() * 0.1,
        });
      }
    },
    iterations
  );

  return {
    benchmark: result.name,
    iterations,
    totalTicks: iterations * ticksPerBatch,
    avgNsPerBatch: formatNs(result.avgNs),
    avgNsPerTick: formatNs(result.avgNs / ticksPerBatch),
    opsPerSec: (result.opsPerSec * ticksPerBatch).toFixed(0) + ' ticks/s',
  };
}

// Usage via API endpoint
// POST /api/ticks/benchmark
// Body: { iterations: 1000, ticksPerBatch: 10 }
// Returns: { benchmark, iterations, totalTicks, avgNsPerBatch, opsPerSec, ... }

// Usage in code
const results = await runTickBenchmark(1000, 10);
console.log(\`Processed \${results.totalTicks} ticks at \${results.opsPerSec}\`);`,
		related: ["Bun.nanoseconds", "Date.now"],
	},
	{
		category: "Testing & Benchmarking",
		name: "SeededRandom + generateTestData() - Deterministic Tests",
		description:
			"Use SeededRandom class for reproducible test data generation with seed values",
		api: "SeededRandom + generateTestData()",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/bun.ts",
		classRef: "SeededRandom",
		functionRef: "generateTestData",
		code: `// Bun Native APIs Used:
// - Date.now() - JavaScript native (for default seed)
// - Math.floor() - JavaScript native
// - Array.from() - JavaScript native
//
// #REF:src/utils/bun.ts:SeededRandom

/**
 * Seeded random number generator for deterministic tests
 * Uses linear congruential generator (LCG) algorithm
 */
export class SeededRandom {
  private seed: number;

  /**
   * Constructor with optional seed
   * @param seed - Seed value (defaults to Date.now())
   */
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Generate next random integer [0, max)
   * Uses LCG: seed = (seed * 9301 + 49297) % 233280
   */
  nextInt(max: number): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    // Math.floor() - JavaScript native
    return Math.floor((this.seed / 233280) * max);
  }

  /**
   * Generate next random float [0, 1)
   */
  nextFloat(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * Uses: SeededRandom, Array.from()
 * Generate test data with deterministic randomness
 * @see JavaScript: Array.from() - native array method
 */
export function generateTestData(seed: number, count: number): Array<{
  id: number;
  value: string;
  nested: { data: number };
}> {
  // SeededRandom - deterministic random generator
  const random = new SeededRandom(seed);
  
  // Array.from() - JavaScript native
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    value: \`test-\${random.nextInt(1000)}\`,
    nested: { data: random.nextInt(100000) },
  }));
}

// Usage with seed
const testData1 = generateTestData(12345, 10);
const testData2 = generateTestData(12345, 10);
// testData1 === testData2 (deterministic!)

// Usage in tests
test('arbitrage detection with seed', () => {
  const seed = 42; // Fixed seed for reproducibility
  const opportunities = generateTestData(seed, 100);
  
  // Test with deterministic data
  const results = detectArbitrage(opportunities);
  expect(results.length).toBe(5); // Always same result with same seed
});

// Usage with Bun test --seed flag
// bun test --seed=12345
// Uses seed from command line for test reproducibility`,
		related: ["Date.now", "Math.floor", "Array.from"],
	},
	{
		category: "Testing & Benchmarking",
		name: "bench() + group() - Mitata Benchmark Runner",
		description:
			"Use mitata benchmark runner with bench() and group() for performance testing",
		api: "bench() + group()",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "bench/runner.ts",
		classRef: "benchmark runner",
		functionRef: "execute",
		code: `// Bun Native APIs Used:
// - Bun.nanoseconds() - https://bun.com/docs/runtime/bun-apis (used internally by mitata)
// - process.env - Node.js/Bun process environment
//
// #REF:bench/runner.ts:execute

import { bench, group, execute } from 'mitata';

/**
 * Uses: bench(), group(), execute()
 * Run performance benchmarks using mitata (Bun-native benchmarking)
 * @see mitata: https://github.com/evanwashere/mitata
 */
async function runBenchmarks() {
  // group() - organize benchmarks into groups
  group('URLSearchParams operations', () => {
    // bench() - define a benchmark
    bench('new URLSearchParams()', () => {
      new URLSearchParams('a=1&b=2&c=3');
    });

    bench('URLSearchParams.get()', () => {
      const params = new URLSearchParams('a=1&b=2&c=3');
      params.get('b');
    });

    bench('URLSearchParams.forEach()', () => {
      const params = new URLSearchParams('a=1&b=2&c=3');
      params.forEach((value, name) => {
        // Do something
      });
    });
  });

  group('Database operations', () => {
    bench('Database.query()', () => {
      db.query('SELECT * FROM trades LIMIT 10').all();
    });

    bench('Database.prepare()', () => {
      const stmt = db.prepare('SELECT * FROM trades WHERE id = ?');
      stmt.get('test-id');
    });
  });

  // execute() - run all benchmarks
  // Returns results with timing (uses Bun.nanoseconds() internally)
  const results = await execute();
  
  return results;
}

// Usage
// Run: bun run bench/runner.ts
// Or: bun run bench
const results = await runBenchmarks();
console.log(results);`,
		related: ["Bun.nanoseconds", "process.env"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.serve() - HTTP + WebSocket Server (TypeScript Generic)",
		description:
			"Create HTTP server with WebSocket support using Bun.serve() with TypeScript generic types (Latest)",
		api: "Bun.serve",
		docsUrl: "https://bun.com/docs/api/http-server",
		filePath: "src/index.ts",
		classRef: "Bun.serve",
		functionRef: "server",
		code: `// Bun Native APIs Used:
// - Bun.serve<T>() - https://bun.com/docs/api/http-server
// - Bun.Server<T> - Generic server type with WebSocket data type
// - URL (global) - https://bun.com/reference/globals/URL
// - ServerWebSocket<T> - Bun native WebSocket server with typed data
//
// #REF:src/index.ts:Bun.serve
// #REF:docs/BUN-LATEST-BREAKING-CHANGES.md:Bun.serve() TypeScript Types

/**
 * Define WebSocket data interface
 * Uses XState-style pattern for type safety
 */
interface WebSocketData {
  userId: number;
  username?: string;
  connectedAt: number;
  sessionId: string;
}

/**
 * Uses: Bun.serve<T>() with TypeScript generic type parameter
 * Create HTTP server with WebSocket support and type safety
 * 
 * @see Bun API: Bun.serve() - https://bun.com/docs/api/http-server
 * @see Bun Latest Breaking Changes - docs/BUN-LATEST-BREAKING-CHANGES.md
 */
const server = Bun.serve<WebSocketData>({
  port: 3001,
  
  // HTTP request handler
  // server parameter is typed as Bun.Server<WebSocketData>
  fetch(req, server) {
    const url = new URL(req.url);
    
    // Handle WebSocket upgrade
    if (url.pathname === '/ws' || url.pathname === '/telegram/ws') {
      // server.upgrade() - upgrade HTTP to WebSocket
      // data must match WebSocketData interface
      if (server.upgrade(req, {
        data: {
          userId: 123,
          connectedAt: Date.now(),
          sessionId: crypto.randomUUID()
        }
      })) {
        return; // Upgrade successful
      }
      return new Response('Upgrade failed', { status: 400 });
    }
    
    // Handle regular HTTP requests
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }
    
    return new Response('Not Found', { status: 404 });
  },
  
  // WebSocket handler configuration
  websocket: {
    // Called when WebSocket connection opens
    // ws.data is typed as WebSocketData
    open(ws) {
      console.log('WebSocket opened:', ws.data.userId); // ✅ Type-safe
      console.log('Session:', ws.data.sessionId); // ✅ Type-safe
      ws.send('Welcome!');
    },
    
    // Called when message received
    message(ws, message) {
      // ws.data is typed as WebSocketData
      // message can be string, ArrayBuffer, or Uint8Array
      if (typeof message === 'string') {
        ws.send(\`Echo: \${message}\`);
      }
    },
    
    // Called when connection closes
    close(ws, code, message) {
      console.log('WebSocket closed:', ws.data.userId, code, message);
    },
    
    // Optional: handle errors
    error(ws, error) {
      console.error('WebSocket error:', ws.data.userId, error);
    }
  },
  
  // Development mode (enables HMR)
  development: true
});

// For servers without WebSockets, use undefined or unknown
const httpOnlyServer = Bun.serve<undefined>({
  port: 3002,
  fetch(req) {
    return new Response("HTTP only");
  }
  // No websocket configuration
});

console.log(\`Server running on port \${server.port}\`);`,
		related: ["Bun.serve", "URL", "ServerWebSocket"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.build() - Bundler & Compiler",
		description: "Bundle and compile TypeScript/JavaScript using Bun.build()",
		api: "Bun.build",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "scripts/deploy-prod.ts",
		classRef: "Bun.build",
		functionRef: "build",
		code: `// Bun Native APIs Used:
// - Bun.build() - https://bun.com/docs/runtime/bun-apis
// - Bun.file() - https://bun.com/docs/runtime/bun-apis
//
// #REF:scripts/deploy-prod.ts:Bun.build

/**
 * Uses: Bun.build() - native Bun bundler
 * Bundle TypeScript to executable or ESM
 * 
 * @see Bun API: Bun.build() - https://bun.com/docs/runtime/bun-apis
 * @see Bun Latest Breaking Changes - docs/BUN-LATEST-BREAKING-CHANGES.md
 * 
 * Note: Bun.build() now throws AggregateError by default on failure.
 * Use try-catch or { throw: false } option to handle errors.
 */
async function buildProduction() {
  // Option 1: Try-catch (default behavior - throws AggregateError)
  try {
    const result = await Bun.build({
      // Entry points
      entrypoints: ['./src/index.ts'],
      
      // Output directory
      outdir: './dist',
      
      // Target platform
      target: 'bun', // 'bun', 'node', 'browser'
      
      // Output format
      format: 'esm', // 'esm' or 'cjs'
      
      // Minify output (removes unused function/class names by default)
      minify: true,
      // Use --keep-names flag to preserve names: bun build --keep-names
      
      // Source maps
      sourcemap: 'external', // 'inline', 'external', or 'none'
      
      // External dependencies (don't bundle)
      external: ['hono', '@hono/node-server'],
      
      // Splitting (code splitting)
      splitting: true,
      
      // Plugins
      plugins: [],
      
      // Define environment variables
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    // Build successful
    // result.outputs - array of output files
    for (const output of result.outputs) {
      console.log(\`Built: \${output.path} (\${output.size} bytes)\`);
      
      // Bun.file() - access output file
      const file = Bun.file(output.path);
      console.log(\`Type: \${file.type}\`);
    }

    return result;
  } catch (error) {
    // error is AggregateError (default behavior)
    if (error instanceof AggregateError) {
      console.error('Build failed with multiple errors:');
      for (const err of error.errors) {
        console.error(\`  - \${err.message}\`);
      }
    } else {
      console.error('Build failed:', error);
    }
    throw error;
  }

  // Option 2: Use throw: false (old behavior)
  // const result = await Bun.build({...}, { throw: false });
  // if (!result.success) {
  //   console.error('Build failed:');
  //   for (const log of result.logs) {
  //     console.error(\`  - \${log.message}\`);
  //   }
  // }

}

// Usage
const buildResult = await buildProduction();`,
		related: ["Bun.build", "Bun.file"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.hash() + Bun.CryptoHasher - Hashing",
		description:
			"Hash data using Bun.hash() or Bun.CryptoHasher for different algorithms",
		api: "Bun.hash + Bun.CryptoHasher",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/bun.ts",
		classRef: "Bun.hash",
		functionRef: "hash",
		code: `// Bun Native APIs Used:
// - Bun.hash() - https://bun.com/docs/runtime/bun-apis
// - Bun.CryptoHasher - https://bun.com/docs/runtime/bun-apis
// - Bun.file() - https://bun.com/docs/runtime/bun-apis
//
// #REF:src/utils/bun.ts:Bun.hash

/**
 * Uses: Bun.hash() - simple hash function
 * Quick hash for strings or buffers
 * @see Bun API: Bun.hash() - https://bun.com/docs/runtime/bun-apis
 */
function quickHash(data: string | Uint8Array): number {
  // Bun.hash() - native Bun hash function
  // Returns 32-bit integer hash
  return Bun.hash(data);
}

/**
 * Uses: Bun.CryptoHasher - advanced hashing with multiple algorithms
 * Supports: md5, sha1, sha224, sha256, sha384, sha512
 * @see Bun API: Bun.CryptoHasher - https://bun.com/docs/runtime/bun-apis
 */
function advancedHash(data: string | Uint8Array, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
  // Bun.CryptoHasher - native Bun crypto hasher
  const hasher = new Bun.CryptoHasher(algorithm);
  
  // Update with data
  hasher.update(data);
  
  // Get hash as hex string
  return hasher.digest('hex');
  
  // Other digest formats:
  // hasher.digest('base64') - base64 encoded
  // hasher.digest() - Uint8Array
}

/**
 * Uses: Bun.file() + Bun.CryptoHasher
 * Hash file contents
 */
async function hashFile(filePath: string): Promise<string> {
  // Bun.file() - native Bun file API
  const file = Bun.file(filePath);
  
  // Read file as ArrayBuffer
  const buffer = await file.arrayBuffer();
  
  // Hash buffer
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(buffer);
  return hasher.digest('hex');
}

// Usage
const quick = quickHash('hello world'); // 32-bit integer
const sha256 = advancedHash('hello world', 'sha256'); // hex string
const fileHash = await hashFile('./data/trades.json'); // file hash`,
		related: ["Bun.hash", "Bun.CryptoHasher", "Bun.file"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.randomUUIDv7() - UUID Generation",
		description:
			"Generate UUIDs using Bun.randomUUIDv7() for deterministic or random UUIDs",
		api: "Bun.randomUUIDv7",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/canonical/uuidv5.ts",
		classRef: "Bun.randomUUIDv7",
		functionRef: "randomUUIDv7",
		code: `// Bun Native APIs Used:
// - Bun.randomUUIDv7() - https://bun.com/docs/runtime/bun-apis
// - Bun.randomUUIDv5() - https://bun.com/docs/runtime/bun-apis (deterministic)
//
// #REF:src/canonical/uuidv5.ts:Bun.randomUUIDv7

/**
 * Uses: Bun.randomUUIDv7() - time-based UUID
 * Generates UUID v7 (time-ordered, sortable)
 * @see Bun API: Bun.randomUUIDv7() - https://bun.com/docs/runtime/bun-apis
 */
function generateTimeOrderedUUID(): string {
  // Bun.randomUUIDv7() - native Bun UUID v7 generator
  // UUID v7 is time-ordered and sortable
  return Bun.randomUUIDv7();
}

/**
 * Uses: Bun.randomUUIDv5() - deterministic UUID
 * Same input always produces same UUID
 * @see Bun API: Bun.randomUUIDv5() - https://bun.com/docs/runtime/bun-apis
 */
function generateDeterministicUUID(namespace: string, name: string): string {
  // Bun.randomUUIDv5() - deterministic UUID v5
  // namespace: UUID namespace (or string)
  // name: unique name
  const namespaceUUID = Bun.randomUUIDv5(namespace, Bun.randomUUIDv5.DNS);
  return Bun.randomUUIDv5(name, namespaceUUID);
}

// Usage
const timeUUID = generateTimeOrderedUUID(); // Time-ordered, sortable
const deterministicUUID = generateDeterministicUUID('nexus', 'trade-123'); // Always same

// Example: Generate UUID for trade
const tradeId = Bun.randomUUIDv7();
console.log(\`Trade ID: \${tradeId}\`);`,
		related: ["Bun.randomUUIDv7", "Bun.randomUUIDv5"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.sleep() - Async Delays",
		description: "Use Bun.sleep() for async delays instead of setTimeout",
		api: "Bun.sleep",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/enterprise-retry.ts",
		classRef: "Bun.sleep",
		functionRef: "sleep",
		code: `// Bun Native APIs Used:
// - Bun.sleep() - https://bun.com/docs/runtime/bun-apis
// - Bun.sleepSync() - https://bun.com/docs/runtime/bun-apis (synchronous)
//
// #REF:src/utils/enterprise-retry.ts:Bun.sleep

/**
 * Uses: Bun.sleep() - async sleep
 * Wait asynchronously without blocking event loop
 * @see Bun API: Bun.sleep() - https://bun.com/docs/runtime/bun-apis
 */
async function wait(ms: number): Promise<void> {
  // Bun.sleep() - native Bun async sleep
  // Takes milliseconds, returns Promise
  await Bun.sleep(ms);
}

/**
 * Uses: Bun.sleep() with exponential backoff
 * Retry with increasing delays
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff: 100ms, 200ms, 400ms...
      const delayMs = 100 * Math.pow(2, i);
      await Bun.sleep(delayMs);
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Uses: Bun.sleepSync() - synchronous sleep
 * Blocks thread (use sparingly!)
 */
function waitSync(ms: number): void {
  // Bun.sleepSync() - synchronous sleep
  // Blocks the thread - use only when necessary
  Bun.sleepSync(ms);
}

// Usage
await wait(1000); // Wait 1 second
await retryWithBackoff(async () => {
  return await fetch('https://api.example.com/data');
});`,
		related: ["Bun.sleep", "Bun.sleepSync"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.inspect() - Object Inspection",
		description:
			"Pretty print objects with colors and formatting using Bun.inspect()",
		api: "Bun.inspect",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/bun.ts",
		classRef: "Bun.inspect",
		functionRef: "inspect",
		code: `// Bun Native APIs Used:
// - Bun.inspect() - https://bun.com/docs/runtime/bun-apis
//
// #REF:src/utils/bun.ts:inspect

/**
 * Uses: Bun.inspect() - pretty print objects
 * Format objects with colors and indentation
 * @see Bun API: Bun.inspect() - https://bun.com/docs/runtime/bun-apis
 */
function inspect(value: unknown, options: {
  colors?: boolean;
  depth?: number;
  sorted?: boolean;
  compact?: boolean;
} = {}): string {
  // Bun.inspect() - native Bun object inspector
  return Bun.inspect(value, {
    colors: options.colors ?? true,    // ANSI colors
    depth: options.depth ?? 4,         // Max depth
    sorted: options.sorted ?? true,    // Sort keys
    compact: options.compact ?? false  // Compact format
  });
}

// Usage
const obj = {
  name: 'NEXUS',
  version: '1.0.0',
  config: {
    port: 3001,
    features: ['arbitrage', 'analytics']
  }
};

// Pretty print with colors
console.log(inspect(obj));
// Output: {
//   config: {
//     features: [ 'arbitrage', 'analytics' ],
//     port: 3001
//   },
//   name: 'NEXUS',
//   version: '1.0.0'
// }

// Compact format
console.log(inspect(obj, { compact: true }));
// Output: { config: { features: [ 'arbitrage', 'analytics' ], port: 3001 }, name: 'NEXUS', version: '1.0.0' }`,
		related: ["Bun.inspect"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.peek() - Promise Peeking",
		description:
			"Check if promise is already resolved without consuming it using Bun.peek()",
		api: "Bun.peek",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/bun.ts",
		classRef: "Bun.peek",
		functionRef: "peek",
		code: `// Bun Native APIs Used:
// - Bun.peek() - https://bun.com/docs/runtime/bun-apis
//
// #REF:src/utils/bun.ts:peek

/**
 * Uses: Bun.peek() - peek at promise value
 * Check if promise is resolved without consuming it
 * @see Bun API: Bun.peek() - https://bun.com/docs/runtime/bun-apis
 */
function peek<T>(promise: Promise<T>): T | Promise<T> {
  // Bun.peek() - native Bun promise peeker
  // If promise is resolved, returns value immediately
  // If not resolved, returns the promise
  return Bun.peek(promise);
}

/**
 * Uses: Bun.peek() for optimization
 * Avoid unnecessary awaits if value is ready
 */
async function getCachedOrFetch<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  let promise = cache.get(key);
  
  if (!promise) {
    promise = fetcher();
    cache.set(key, promise);
  }
  
  // Bun.peek() - check if already resolved
  const peeked = Bun.peek(promise);
  
  // If resolved, return value directly
  if (peeked !== promise) {
    return peeked as T;
  }
  
  // Otherwise await the promise
  return await promise;
}

// Usage
const promise = fetch('https://api.example.com/data').then(r => r.json());

// Peek without consuming
const peeked = Bun.peek(promise);
if (peeked !== promise) {
  // Already resolved!
  console.log('Value:', peeked);
} else {
  // Still pending, need to await
  const value = await promise;
  console.log('Value:', value);
}`,
		related: ["Bun.peek"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.deepEquals() - Deep Equality",
		description: "Compare objects deeply using Bun.deepEquals()",
		api: "Bun.deepEquals",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/bun.ts",
		classRef: "Bun.deepEquals",
		functionRef: "deepEquals",
		code: `// Bun Native APIs Used:
// - Bun.deepEquals() - https://bun.com/docs/runtime/bun-apis
//
// #REF:src/utils/bun.ts:deepEquals

/**
 * Uses: Bun.deepEquals() - deep object comparison
 * Compare objects recursively
 * @see Bun API: Bun.deepEquals() - https://bun.com/docs/runtime/bun-apis
 */
function deepEquals(a: unknown, b: unknown): boolean {
  // Bun.deepEquals() - native Bun deep equality check
  // Recursively compares objects, arrays, primitives
  return Bun.deepEquals(a, b);
}

// Usage
const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };

console.log(Bun.deepEquals(obj1, obj2)); // true
console.log(Bun.deepEquals(obj1, obj3)); // false

// Works with arrays
console.log(Bun.deepEquals([1, 2, 3], [1, 2, 3])); // true
console.log(Bun.deepEquals([1, 2, 3], [1, 2, 4])); // false

// Works with nested structures
const trade1 = {
  id: '123',
  price: 100.50,
  metadata: { source: 'binance', timestamp: 1234567890 }
};

const trade2 = {
  id: '123',
  price: 100.50,
  metadata: { source: 'binance', timestamp: 1234567890 }
};

console.log(Bun.deepEquals(trade1, trade2)); // true`,
		related: ["Bun.deepEquals"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.Glob - File Pattern Matching",
		description: "Match files using glob patterns with Bun.Glob",
		api: "Bun.Glob",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/utils/bun.ts",
		classRef: "Bun.Glob",
		functionRef: "Glob",
		code: `// Bun Native APIs Used:
// - Bun.Glob - https://bun.com/docs/runtime/bun-apis
// - Bun.file() - https://bun.com/docs/runtime/bun-apis
//
// #REF:src/utils/bun.ts:Bun.Glob

/**
 * Uses: Bun.Glob - file pattern matching
 * Match files using glob patterns
 * @see Bun API: Bun.Glob - https://bun.com/docs/runtime/bun-apis
 */
async function findFiles(pattern: string): Promise<string[]> {
  // Bun.Glob - native Bun glob matcher
  const glob = new Bun.Glob(pattern);
  
  // Scan current directory
  const files: string[] = [];
  for await (const file of glob.scan('.')) {
    files.push(file);
  }
  
  return files;
}

/**
 * Uses: Bun.Glob with specific directory
 */
async function findTypeScriptFiles(dir: string = 'src'): Promise<string[]> {
  const glob = new Bun.Glob('**/*.ts');
  const files: string[] = [];
  
  // Scan specific directory
  for await (const file of glob.scan(dir)) {
    files.push(file);
  }
  
  return files;
}

/**
 * Uses: Bun.Glob.match() - check if path matches pattern
 */
function matchesPattern(path: string, pattern: string): boolean {
  const glob = new Bun.Glob(pattern);
  return glob.match(path);
}

// Usage
const tsFiles = await findTypeScriptFiles('src');
// Returns: ['src/index.ts', 'src/api/routes.ts', ...]

const testFiles = await findFiles('**/*.test.ts');
// Returns: ['test/api.test.ts', 'test/utils.test.ts', ...]

// Check if path matches
console.log(matchesPattern('src/api/routes.ts', '**/*.ts')); // true
console.log(matchesPattern('src/api/routes.js', '**/*.ts')); // false`,
		related: ["Bun.Glob", "Bun.file"],
	},
	{
		category: "Bun Runtime",
		name: "Bun.generateHeapSnapshot() - Memory Profiling",
		description:
			"Generate heap snapshots for memory profiling using Bun.generateHeapSnapshot()",
		api: "Bun.generateHeapSnapshot",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/ticks/profiler.ts",
		classRef: "Bun.generateHeapSnapshot",
		functionRef: "takeHeapSnapshot",
		code: `// Bun Native APIs Used:
// - Bun.generateHeapSnapshot() - https://bun.com/docs/runtime/bun-apis
// - Bun.write() - https://bun.com/docs/runtime/bun-apis
// - JSON.stringify() - JavaScript native
//
// #REF:src/ticks/profiler.ts:takeHeapSnapshot

/**
 * Uses: Bun.generateHeapSnapshot() - memory profiling
 * Generate heap snapshot for memory analysis
 * @see Bun API: Bun.generateHeapSnapshot() - https://bun.com/docs/runtime/bun-apis
 */
async function takeHeapSnapshot(path?: string): Promise<string> {
  // Bun.generateHeapSnapshot() - native Bun heap snapshot generator
  // Returns heap snapshot object
  const snapshot = Bun.generateHeapSnapshot();
  
  // Save to file
  const snapshotPath = path || \`./data/heap-\${Date.now()}.heapsnapshot\`;
  
  // Bun.write() - write snapshot as JSON
  await Bun.write(snapshotPath, JSON.stringify(snapshot));
  
  console.log(\`Heap snapshot saved to \${snapshotPath}\`);
  return snapshotPath;
}

/**
 * Uses: Bun.gc() - force garbage collection
 * Manually trigger garbage collection (if available)
 */
function forceGarbageCollection(): void {
  // Bun.gc() - native Bun garbage collection
  // Takes boolean: true = full GC, false = incremental
  if (typeof Bun.gc === 'function') {
    Bun.gc(true); // Force full GC
    console.log('Garbage collection triggered');
  }
}

// Usage
// Take snapshot before memory-intensive operation
await takeHeapSnapshot('./data/heap-before.heapsnapshot');

// Do memory-intensive work
// ... process large dataset ...

// Force GC
forceGarbageCollection();

// Take snapshot after
await takeHeapSnapshot('./data/heap-after.heapsnapshot');

// Analyze snapshots in Chrome DevTools:
// chrome://inspect -> Load -> Select .heapsnapshot file`,
		related: ["Bun.generateHeapSnapshot", "Bun.gc", "Bun.write"],
	},
	{
		category: "Bun Runtime",
		name: "new Worker() - Parallel Processing",
		description:
			"Create worker threads using new Worker() for parallel processing",
		api: "new Worker()",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/api/workers.ts",
		classRef: "Worker",
		functionRef: "new Worker",
		code: `// Bun Native APIs Used:
// - new Worker() - https://bun.com/docs/runtime/bun-apis
// - Worker.postMessage() - JavaScript native
// - Worker.onmessage - JavaScript native
//
// #REF:src/api/workers.ts:Worker

/**
 * Uses: new Worker() - create worker thread
 * Run code in parallel worker thread
 * @see Bun API: Worker - https://bun.com/docs/runtime/bun-apis
 */

// worker.ts - Worker script
// This file runs in the worker thread
self.onmessage = (event) => {
  const { data } = event;
  
  // Process data
  const result = processData(data);
  
  // Send result back to main thread
  self.postMessage({ result });
};

function processData(data: any): any {
  // Heavy computation here
  return { processed: true, data };
}

// main.ts - Main thread
async function processInWorker(data: any): Promise<any> {
  // new Worker() - create worker thread
  // Pass path to worker script
  const worker = new Worker('./worker.ts', {
    // Worker options
    smol: false,        // Use full V8 isolate (not smol)
    minify: false,     // Don't minify worker code
  });
  
  return new Promise((resolve, reject) => {
    // Listen for messages from worker
    worker.onmessage = (event) => {
      resolve(event.data.result);
      worker.terminate(); // Clean up
    };
    
    // Listen for errors
    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };
    
    // Send data to worker
    worker.postMessage({ data });
  });
}

// Usage
const result = await processInWorker({ trades: [...] });
console.log('Processed:', result);`,
		related: ["Worker", "Worker.postMessage"],
	},
	{
		category: "Testing & Benchmarking",
		name: "bun:test - Test Framework",
		description: "Write and run tests using bun:test framework",
		api: "bun:test",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "test",
		classRef: "bun:test",
		functionRef: "test",
		code: `// Bun Native APIs Used:
// - bun:test - https://bun.com/docs/runtime/bun-apis
// - Bun.nanoseconds() - https://bun.com/docs/runtime/bun-apis (for timing)
//
// #REF:test/*.test.ts:bun:test

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';

/**
 * Uses: test(), expect(), describe()
 * Write tests using Bun's native test framework
 * @see Bun API: bun:test - https://bun.com/docs/runtime/bun-apis
 */

describe('Arbitrage Detection', () => {
  // beforeAll() - run before all tests
  beforeAll(() => {
    console.log('Setting up test environment');
  });
  
  // test() - define a test
  test('detects arbitrage opportunity', () => {
    const opportunity = {
      buy: { venue: 'binance', price: 100 },
      sell: { venue: 'coinbase', price: 101 },
      spread: 1
    };
    
    // expect() - assertions
    expect(opportunity.spread).toBeGreaterThan(0);
    expect(opportunity.buy.venue).not.toBe(opportunity.sell.venue);
  });
  
  // test() with async
  test('fetches market data', async () => {
    const response = await fetch('http://localhost:3001/api/health');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
  
  // test() with timeout
  test('processes ticks quickly', async () => {
    const start = Bun.nanoseconds();
    await processTicks([...]);
    const end = Bun.nanoseconds();
    
    const duration = (end - start) / 1_000_000; // Convert to ms
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  }, { timeout: 5000 }); // 5 second timeout
  
  // afterAll() - cleanup after all tests
  afterAll(() => {
    console.log('Cleaning up test environment');
  });
});

// Run tests:
// bun test                    # Run all tests
// bun test --seed=42          # Run with seed for reproducibility
// bun test test/api.test.ts   # Run specific test file
// bun test --timeout=10000    # Set timeout
// bun test --bail             # Stop on first failure`,
		related: ["bun:test", "Bun.nanoseconds"],
	},
	{
		category: "Testing & Benchmarking",
		name: "Snapshot Testing - toMatchSnapshot & toMatchInlineSnapshot",
		description:
			"Snapshot testing with automatic indentation and better diffs (Bun 1.3+)",
		api: "bun:test",
		docsUrl: "https://bun.com/docs/test",
		filePath: "test/snapshot-examples.test.ts",
		classRef: "bun:test",
		functionRef: "toMatchSnapshot",
		code: `// Bun Native APIs Used:
// - bun:test - Snapshot testing with automatic indentation
// - Bun 1.3+ Enhanced snapshots
//
// #REF:test/snapshot-examples.test.ts:snapshot-testing
// #REF:4.2.1.0.0.0.0:Snapshot Testing UI Integration
//
// @fileoverview Snapshot Testing Examples
// @module test/snapshot-examples
// @description Comprehensive examples of Bun's snapshot testing features
// @version 1.3.0
// @see {@link https://bun.com/docs/test|Bun Test Documentation}
// @see {@link ./docs/BUN-1.3-TEST-IMPROVEMENTS.md|Bun 1.3 Test Improvements}
// @see {@link ./docs/4.0.0.0.0.0.0-MCP-ALERTING.md#42100000|MCP Snapshot Testing Integration}

import { test, expect, describe } from 'bun:test';

/**
 * Snapshot Testing Examples
 * Bun 1.3+ includes automatic indentation and improved diffs
 * 
 * @example
 * // File-based snapshot
 * expect(data).toMatchSnapshot();
 * 
 * @example
 * // Inline snapshot with auto-indentation
 * expect(data).toMatchInlineSnapshot(\`
 *   {
 *     "name": "Bun"
 *   }
 * \`);
 * 
 * @see {@link https://bun.com/docs/test|Bun Test API}
 * @see {@link ./docs/BUN-1.3-TEST-IMPROVEMENTS.md|Test Improvements Guide}
 */

describe('Snapshot Testing', () => {
  // File-based snapshots (stored in __snapshots__/ directory)
  test('object snapshot', () => {
    const data = {
      name: "Bun",
      version: "1.3",
      features: ["fast", "native", "typescript"],
    };
    expect(data).toMatchSnapshot();
    // Creates: __snapshots__/snapshot-examples.test.ts.snap
  });

  // Inline snapshots (embedded in test file, auto-indented)
  test('inline snapshot with auto-indentation', () => {
    const data = {
      name: "Bun",
      version: "1.3",
      features: ["fast", "native"],
    };
    
    // Bun automatically indents to match code indentation
    expect(data).toMatchInlineSnapshot(\`
      {
        "name": "Bun",
        "version": "1.3",
        "features": [
          "fast",
          "native"
        ]
      }
    \`);
  });

  // Error snapshots
  test('error message snapshot', () => {
    expect(() => {
      throw new Error("Something went wrong");
    }).toThrowErrorMatchingInlineSnapshot(\`"Something went wrong"\`);
  });

  // Variable substitution in test.each (Bun 1.3+)
  test.each([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ])("User $name is $age years old", ({ name, age }) => {
    const user = { name, age };
    expect(user).toMatchInlineSnapshot(\`
      {
        "name": "\${name}",
        "age": \${age}
      }
    \`);
  });
});

// Snapshot commands:
// bun test test/snapshot-examples.test.ts              # Run snapshot tests
// bun test --update-snapshots                          # Update snapshots
// bun test -u                                          # Short form
// CI=true bun test                                     # Stricter CI mode (errors on new snapshots)`,
		related: ["bun:test", "toMatchSnapshot", "toMatchInlineSnapshot"],
	},
	{
		category: "Security & Research",
		name: "RuntimeSecurityMonitor - Threat Detection",
		description:
			"Monitor system resources and detect security threats using Bun native APIs",
		api: "RuntimeSecurityMonitor",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/security/runtime-monitor.ts",
		classRef: "RuntimeSecurityMonitor",
		functionRef: "monitorNetworkEgress",
		code: `// Bun Native APIs Used:
// - Bun.hash() - https://bun.com/docs/runtime/bun-apis
// - Bun.spawn() - https://bun.com/docs/runtime/bun-apis
// - Bun.gc() - https://bun.com/docs/runtime/bun-apis
// - process.memoryUsage() - Node.js/Bun process API
// - Database (bun:sqlite) - https://bun.com/reference
//
// #REF:src/security/runtime-monitor.ts:RuntimeSecurityMonitor

import { RuntimeSecurityMonitor } from '../security/runtime-monitor';

/**
 * Uses: RuntimeSecurityMonitor - runtime threat detection
 * Monitor system resources, network egress, and authentication failures
 * @see Security: RuntimeSecurityMonitor - src/security/runtime-monitor.ts
 */
const monitor = new RuntimeSecurityMonitor();

// Monitor network egress for suspicious patterns
monitor.monitorNetworkEgress(
  'https://api.bookmaker.com/odds?event=123',
  'bookmaker'
);

// Track authentication failures
monitor.onAuthFailure('bookmaker', 401);

// Get recent threats
const threats = monitor.getRecentThreats(24); // Last 24 hours
console.log('Recent threats:', threats);

// Cleanup
monitor.destroy();`,
		related: ["Bun.hash", "Bun.spawn", "Bun.gc", "bun:sqlite"],
	},
	{
		category: "Security & Research",
		name: "ComplianceLogger - SOC2/GDPR Audit Trail",
		description: "Log all MCP tool invocations and data access for compliance",
		api: "ComplianceLogger",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/security/compliance-logger.ts",
		classRef: "ComplianceLogger",
		functionRef: "logMCPInvocation",
		code: `// Bun Native APIs Used:
// - Bun.randomUUIDv7() - https://bun.com/docs/runtime/bun-apis
// - Bun.gzipSync() - https://bun.com/docs/runtime/bun-apis
// - Database (bun:sqlite) - https://bun.com/reference
// - JSON.stringify() - JavaScript native
//
// #REF:src/security/compliance-logger.ts:ComplianceLogger

import { ComplianceLogger } from '../security/compliance-logger';

/**
 * Uses: ComplianceLogger - immutable audit trail
 * Log all MCP tool invocations and data access for SOC2/GDPR compliance
 * @see Security: ComplianceLogger - src/security/compliance-logger.ts
 */
const logger = new ComplianceLogger();

// Log MCP tool invocation
logger.logMCPInvocation(
  'research-pattern-discovery',
  'user123',
  { eventId: 'event-456', patternType: 'arbitrage' },
  { patterns: [...], count: 5 },
  '192.168.1.1'
);

// Log data access for GDPR compliance
logger.logDataAccess(
  'user123',
  'event-456',
  'odds',
  'legitimate_interest'
);

// Generate compliance report
const report = await logger.generateComplianceReport(
  '2024-01-01',
  '2024-01-31'
);
// Returns: Uint8Array (gzipped JSON)

// Get compliance statistics
const stats = logger.getComplianceStats(30); // Last 30 days
console.log('Compliance stats:', stats);

logger.close();`,
		related: ["Bun.randomUUIDv7", "Bun.gzipSync", "bun:sqlite"],
	},
	{
		category: "Security & Research",
		name: "IncidentResponseOrchestrator - Automated Threat Response",
		description: "Automatically respond to security threats with playbooks",
		api: "IncidentResponseOrchestrator",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/security/incident-response.ts",
		classRef: "IncidentResponseOrchestrator",
		functionRef: "onThreatDetected",
		code: `// Bun Native APIs Used:
// - Bun.randomUUIDv7() - https://bun.com/docs/runtime/bun-apis
// - Bun.generateHeapSnapshot() - https://bun.com/docs/runtime/bun-apis
// - Bun.gc() - https://bun.com/docs/runtime/bun-apis
// - Bun.write() - https://bun.com/docs/runtime/bun-apis
// - Database (bun:sqlite) - https://bun.com/reference
//
// #REF:src/security/incident-response.ts:IncidentResponseOrchestrator

import { IncidentResponseOrchestrator } from '../security/incident-response';

/**
 * Uses: IncidentResponseOrchestrator - automated incident response
 * Execute containment playbooks when threats are detected
 * @see Security: IncidentResponseOrchestrator - src/security/incident-response.ts
 */
const orchestrator = new IncidentResponseOrchestrator();

// Trigger incident response for detected threat
orchestrator.onThreatDetected({
  type: 'entity_encoding_detected',
  severity: 10, // CRITICAL
  context: {
    url: 'https://api.example.com/?a=b&#x26;c=d',
    bookmaker: 'bookmaker',
    ip: '192.168.1.1'
  }
});

// Get active incidents
const activeIncidents = orchestrator.getActiveIncidents();
console.log('Active incidents:', activeIncidents);

orchestrator.close();`,
		related: [
			"Bun.randomUUIDv7",
			"Bun.generateHeapSnapshot",
			"Bun.gc",
			"bun:sqlite",
		],
	},
	{
		category: "Security & Research",
		name: "UrlAnomalyPatternEngine - Pattern Discovery",
		description:
			"Discover patterns caused by URL parsing anomalies that create false line movements",
		api: "UrlAnomalyPatternEngine",
		docsUrl: "https://bun.com/docs/runtime/bun-apis",
		filePath: "src/research/patterns/url-anomaly-patterns.ts",
		classRef: "UrlAnomalyPatternEngine",
		functionRef: "discoverAnomalyPatterns",
		code: `// Bun Native APIs Used:
// - Bun.hash() - https://bun.com/docs/runtime/bun-apis
// - Database (bun:sqlite) - https://bun.com/reference
// - SQL Window Functions - SQLite native
//
// #REF:src/research/patterns/url-anomaly-patterns.ts:UrlAnomalyPatternEngine

import { UrlAnomalyPatternEngine } from '../research/patterns/url-anomaly-patterns';

/**
 * Uses: UrlAnomalyPatternEngine - URL anomaly pattern discovery
 * Discover patterns caused by URL parsing bugs that create false steam signals
 * @see Research: UrlAnomalyPatternEngine - src/research/patterns/url-anomaly-patterns.ts
 */
const engine = new UrlAnomalyPatternEngine('research.db');

// Discover patterns for NBA
const patterns = await engine.discoverAnomalyPatterns('NBA', 24);
console.log(\`Discovered \${patterns.length} URL anomaly patterns\`);

// Calculate false steam rate for a bookmaker
const falseSteamRate = engine.calculateFalseSteamRate('draftkings', 24);
console.log(\`False steam rate: \${(falseSteamRate * 100).toFixed(2)}%\`);

// Get bookmaker-specific anomalies
const anomalies = engine.getBookmakerAnomalies('draftkings', 24);
anomalies.forEach(anomaly => {
  console.log(\`Anomaly: \${anomaly.anomaly_type} - \${anomaly.market_impact.false_steam_probability * 100}% false steam prob\`);
});

engine.close();`,
		related: ["Bun.hash", "bun:sqlite", "ResearchPattern"],
	},
];

/**
 * Get examples by category
 */
export function getExamplesByCategory(category: string): APIExample[] {
	return apiExamples.filter((ex) => ex.category === category);
}

/**
 * Get example by name
 */
export function getExampleByName(name: string): APIExample | undefined {
	return apiExamples.find((ex) => ex.name === name);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
	return [...new Set(apiExamples.map((ex) => ex.category))];
}
