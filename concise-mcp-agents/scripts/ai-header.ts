#!/usr/bin/env bun

// [AI][HEADER][GENERATOR][AI-HDR-001][v3.0.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-B3E][v3.0.0][ACTIVE]

// Note: Using manual version increment since Semver.inc might not be available

// Enhanced Fuzzy Mapping with 200+ keywords and comprehensive synonyms
const FUZZY_MAP = {
  // Domain mapping with extensive synonyms and related terms (50+ entries)
  domain: {
    // Core technical domains (expanded)
    bun: ["bun", "runtime", "javascript", "js", "typescript", "ts", "node", "deno", "fullstack", "web", "server", "backend", "frontend", "bundler", "package", "npm", "yarn"],
    git: ["git", "vcs", "version", "control", "repository", "repo", "branch", "commit", "merge", "push", "pull", "pr", "pull-request", "github", "gitlab", "bitbucket", "clone", "fork", "rebase", "stash"],
    telegram: ["telegram", "tg", "bot", "chat", "message", "notification", "alert", "channel", "group", "crm", "communication", "messaging", "webhook", "api", "token", "send", "receive"],
    agent: ["agent", "rule", "gov", "governance", "policy", "regulation", "compliance", "standard", "trading", "bet", "profit", "risk", "strategy", "pool", "syndicate", "broker", "dealer"],
    datapipe: ["datapipe", "dp", "pipeline", "etl", "extract", "transform", "load", "data", "stream", "flow", "processing", "analytics", "batch", "real-time", "streaming", "filter", "map", "reduce"],
    mcp: ["mcp", "tool", "mcp-tool", "context", "protocol", "model", "ai", "intelligence", "llm", "chatgpt", "openai", "anthropic", "claude", "gpt", "assistant", "automation"],
    websocket: ["websocket", "ws", "socket", "connection", "live", "realtime", "streaming", "push", "broadcast", "subscribe", "publish", "channel", "room", "event", "signal"],
    database: ["database", "db", "sql", "sqlite", "postgres", "postgresql", "mysql", "mariadb", "mongo", "mongodb", "redis", "cache", "store", "persistence", "query", "table", "collection"],
    security: ["security", "auth", "authentication", "authorization", "encryption", "secret", "token", "key", "password", "ssl", "https", "tls", "oauth", "jwt", "session", "login"],
    dashboard: ["dashboard", "ui", "interface", "view", "display", "visualization", "chart", "graph", "metrics", "analytics", "report", "kpi", "widget", "panel", "monitor"],
    api: ["api", "endpoint", "rest", "http", "request", "response", "client", "server", "integration", "webhook", "callback", "middleware", "proxy", "gateway", "route"],
    test: ["test", "testing", "spec", "unit", "integration", "e2e", "coverage", "assert", "verify", "validate", "mock", "stub", "fixture", "suite", "runner", "framework"],
    deploy: ["deploy", "deployment", "build", "ci", "cd", "pipeline", "release", "production", "staging", "docker", "kubernetes", "k8s", "container", "image", "registry"],
    log: ["log", "logging", "trace", "debug", "info", "warn", "error", "audit", "monitor", "observability", "telemetry", "metrics", "alert", "notification", "event"],
    config: ["config", "configuration", "setting", "parameter", "option", "preference", "setup", "initialization", "bootstrap", "environment", "variable", "flag", "switch"],
    cache: ["cache", "memory", "redis", "store", "performance", "speed", "optimization", "ttl", "eviction", "hit", "miss", "warm", "cold", "layer"],
    file: ["file", "filesystem", "fs", "storage", "upload", "download", "sync", "backup", "archive", "compress", "zip", "tar", "stream", "buffer", "path"],
    network: ["network", "http", "tcp", "udp", "connection", "protocol", "internet", "web", "dns", "proxy", "firewall", "vpn", "latency", "bandwidth"],
    email: ["email", "mail", "smtp", "notification", "communication", "alert", "sendgrid", "mailgun", "ses", "template", "inbox", "spam", "bounce"],
    mobile: ["mobile", "phone", "ios", "android", "app", "responsive", "touch", "gesture", "native", "hybrid", "pwa", "flutter", "react-native", "cordova"],
    cloud: ["cloud", "aws", "azure", "gcp", "serverless", "lambda", "function", "hosting", "cdn", "storage", "compute", "instance", "scale", "auto"],
    ml: ["ml", "machine", "learning", "ai", "neural", "network", "model", "training", "prediction", "dataset", "feature", "accuracy", "loss", "gradient"],
    blockchain: ["blockchain", "crypto", "web3", "smart", "contract", "decentralized", "ethereum", "bitcoin", "wallet", "transaction", "gas", "mining"],
    iot: ["iot", "internet", "things", "device", "sensor", "embedded", "hardware", "raspberry", "arduino", "mqtt", "zigbee", "bluetooth", "wifi"],
    game: ["game", "gaming", "unity", "unreal", "engine", "3d", "graphics", "physics", "animation", "level", "character", "multiplayer", "vr"],
    finance: ["finance", "financial", "money", "payment", "transaction", "banking", "stripe", "paypal", "currency", "exchange", "wallet", "ledger"],
    health: ["health", "medical", "patient", "doctor", "ehr", "clinical", "record", "diagnosis", "treatment", "prescription", "vital", "monitor"],
    education: ["education", "learning", "student", "teacher", "course", "training", "classroom", "lesson", "assignment", "grade", "certificate"],
    social: ["social", "community", "user", "profile", "feed", "network", "friend", "follow", "like", "comment", "share", "timeline"],
    ecommerce: ["ecommerce", "shop", "store", "cart", "product", "order", "payment", "checkout", "inventory", "shipping", "tax", "discount"],
    cms: ["cms", "content", "management", "blog", "article", "editor", "wordpress", "drupal", "joomla", "page", "post", "category"],
    analytics: ["analytics", "tracking", "metrics", "insight", "report", "dashboard", "google", "mixpanel", "segment", "event", "conversion"],
    search: ["search", "index", "elasticsearch", "solr", "query", "find", "filter", "ranking", "relevance", "autocomplete", "facet"],
    media: ["media", "video", "audio", "image", "stream", "player", "upload", "transcode", "thumbnail", "format", "codec", "resolution"],
    notification: ["notification", "alert", "push", "email", "sms", "webhook", "slack", "discord", "in-app", "banner", "toast", "modal"]
  },

  // Scope with expanded functional context (40+ entries)
  scope: {
    function: ["function", "method", "utility", "helper", "tool", "script", "command", "cli", "handler", "callback", "middleware", "service", "worker", "task", "job", "process", "routine"],
    global: ["global", "system", "universal", "enterprise", "organization", "company", "platform", "ecosystem", "infrastructure", "architecture", "framework", "library", "sdk"],
    component: ["component", "module", "feature", "widget", "element", "part", "section", "block", "panel", "card", "modal", "dialog", "form", "table", "chart", "graph"],
    local: ["local", "specific", "targeted", "focused", "narrow", "limited", "scoped", "contextual", "bounded", "constrained", "isolated", "contained", "regional"]
  },

  // Type with expanded implementation context (35+ entries)
  type: {
    implementation: ["implement", "create", "build", "develop", "code", "program", "write", "construct", "assemble", "fabricate", "produce", "generate", "compose", "craft"],
    rule: ["rule", "policy", "guideline", "standard", "requirement", "constraint", "regulation", "law", "principle", "directive", "mandate", "edict", "decree"],
    query: ["query", "search", "find", "filter", "select", "retrieve", "fetch", "lookup", "seek", "discover", "explore", "investigate", "examine", "analyze"],
    script: ["script", "automation", "batch", "workflow", "process", "task", "job", "routine", "procedure", "sequence", "chain", "pipeline", "orchestration"],
    configuration: ["config", "setup", "setting", "parameter", "option", "preference", "customization", "adjustment", "tuning", "optimization", "calibration"],
    documentation: ["doc", "document", "readme", "guide", "manual", "tutorial", "instruction", "reference", "handbook", "encyclopedia", "wiki", "help"],
    test: ["test", "spec", "validate", "verify", "check", "assert", "examine", "prove", "confirm", "substantiate", "authenticate", "certify"],
    deployment: ["deploy", "release", "publish", "distribute", "rollout", "launch", "ship", "deliver", "propagate", "disseminate", "broadcast"]
  },

  // Meta with expanded priority and importance (25+ entries)
  meta: {
    core: ["core", "essential", "fundamental", "critical", "key", "main", "primary", "central", "vital", "crucial", "indispensable", "requisite"],
    advanced: ["advanced", "complex", "sophisticated", "expert", "pro", "premium", "elite", "superior", "refined", "polished", "master", "guru"],
    required: ["required", "mandatory", "must", "essential", "needed", "necessary", "obligatory", "compulsory", "imperative", "vital", "critical"],
    optional: ["optional", "extra", "bonus", "additional", "supplemental", "supplementary", "auxiliary", "secondary", "minor", "peripheral"]
  },

  // Status with expanded lifecycle context (20+ entries)
  status: {
    active: ["active", "live", "production", "current", "working", "operational", "running", "enabled", "activated", "engaged", "functioning"],
    experimental: ["experimental", "beta", "test", "trial", "preview", "alpha", "pilot", "prototype", "proof-of-concept", "exploratory", "investigative"],
    stable: ["stable", "mature", "proven", "reliable", "solid", "robust", "dependable", "trustworthy", "sound", "firm", "steady", "constant"],
    deprecated: ["deprecated", "obsolete", "old", "legacy", "outdated", "retired", "archaic", "antiquated", "outmoded", "superseded", "discontinued"]
  }
};

// Enhanced fuzzy scoring with multiple algorithms
function fuzzyScore(haystack: string, needle: string): number {
  haystack = haystack.toLowerCase();
  needle = needle.toLowerCase();

  if (haystack === needle) return 1.0; // Exact match
  if (haystack.includes(needle)) return 0.9; // Substring match
  if (needle.includes(haystack)) return 0.8; // Contains match

  // Levenshtein distance similarity
  const distance = levenshteinDistance(haystack, needle);
  const maxLength = Math.max(haystack.length, needle.length);
  const levenshteinScore = 1 - (distance / maxLength);

  // Jaccard similarity for word overlap
  const haystackWords = new Set(haystack.split(/[^a-z0-9]+/));
  const needleWords = new Set(needle.split(/[^a-z0-9]+/));
  const intersection = new Set([...haystackWords].filter(x => needleWords.has(x)));
  const union = new Set([...haystackWords, ...needleWords]);
  const jaccardScore = intersection.size / union.size;

  // Weighted combination
  return (levenshteinScore * 0.6) + (jaccardScore * 0.4);
}

// Levenshtein distance for similarity calculation
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}

// Find best fuzzy match
function findBestMatch(word: string, categoryMap: Record<string, string[]>): { key: string; score: number } | null {
  let bestMatch: { key: string; score: number } | null = null;

  for (const [key, synonyms] of Object.entries(categoryMap)) {
    for (const synonym of synonyms) {
      const distance = levenshteinDistance(word.toLowerCase(), synonym.toLowerCase());
      const maxLength = Math.max(word.length, synonym.length);
      const score = 1 - (distance / maxLength); // Similarity score 0-1

      if (score > 0.7 && (!bestMatch || score > bestMatch.score)) { // 70% similarity threshold
        bestMatch = { key, score };
      }

      // Exact match gets perfect score
      if (word.toLowerCase() === synonym.toLowerCase()) {
        return { key, score: 1.0 };
      }
    }
  }

  return bestMatch;
}

// Extract meaningful keywords from prompt
function extractKeywords(prompt: string): string[] {
  // Remove common stop words and punctuation
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'as', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'how', 'why', 'what', 'which'];

  return prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/[\s\-_]+/) // Split on spaces, hyphens, underscores
    .filter(word => word.length > 2 && !stopWords.includes(word)) // Filter meaningful words
    .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
}

// Generate unique ID with counter
async function generateUniqueId(baseId: string, domain: string): Promise<string> {
  // Load existing headers to avoid collisions
  const existingHeaders = new Set<string>();

  try {
    // Read existing files to check for header collisions
    const fs = await import("fs");
    const path = await import("path");

    function scanDirectory(dir: string) {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.')) {
          scanDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.md')) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const headerMatch = content.match(/^\s*\/\/\s*\[([^\]]+)\]/m);
            if (headerMatch) {
              existingHeaders.add(headerMatch[1]);
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    }

    scanDirectory('./scripts');
    scanDirectory('./templates');
    scanDirectory('./dashboards');
  } catch (error) {
    // If scanning fails, continue with basic ID generation
  }

  // Find next available counter
  let counter = 1;
  let candidateId: string;

  do {
    candidateId = `${baseId}-${String(counter).padStart(3, '0')}`;
    counter++;
  } while (existingHeaders.has(`[${domain}][FUNCTION][IMPLEMENTATION][CORE][${candidateId}][v3.0.0][ACTIVE]`));

  return candidateId;
}

// Enhanced AI header generation with fuzzy matching
export async function generateAIHeader(prompt: string): Promise<string> {
  const keywords = extractKeywords(prompt);

  // Fuzzy matching for all categories with confidence scoring
  const findBestFuzzyMatch = (category: keyof typeof FUZZY_MAP): { key: string; confidence: number } => {
    let bestMatch = { key: 'unknown', confidence: 0 };

    for (const [mapKey, synonyms] of Object.entries(FUZZY_MAP[category])) {
      for (const keyword of keywords) {
        for (const synonym of synonyms) {
          const score = fuzzyScore(keyword, synonym);
          if (score > bestMatch.confidence && score > 0.6) { // 60% minimum confidence
            bestMatch = { key: mapKey, confidence: score };
          }
        }
      }
    }

    return bestMatch.confidence > 0 ? bestMatch : { key: getDefaultForCategory(category), confidence: 0.5 };
  };

  const getDefaultForCategory = (category: keyof typeof FUZZY_MAP): string => {
    const defaults = {
      domain: 'mcp',
      scope: 'function',
      type: 'implementation',
      meta: 'core',
      status: 'active'
    };
    return defaults[category];
  };

  // Get best matches for each category
  const domain = findBestFuzzyMatch('domain');
  const scope = findBestFuzzyMatch('scope');
  const type = findBestFuzzyMatch('type');
  const meta = findBestFuzzyMatch('meta');
  const status = findBestFuzzyMatch('status');

  // Calculate overall confidence
  const avgConfidence = (domain.confidence + scope.confidence + type.confidence + meta.confidence + status.confidence) / 5;

  console.log(`🤖 Fuzzy matching confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Domain: ${domain.key} (${(domain.confidence * 100).toFixed(1)}%)`);
  console.log(`   Scope: ${scope.key} (${(scope.confidence * 100).toFixed(1)}%)`);
  console.log(`   Type: ${type.key} (${(type.confidence * 100).toFixed(1)}%)`);
  console.log(`   Meta: ${meta.key} (${(meta.confidence * 100).toFixed(1)}%)`);
  console.log(`   Status: ${status.key} (${(status.confidence * 100).toFixed(1)}%)`);

  // Capitalize appropriately
  const domainUpper = domain.key.toUpperCase();
  const scopeUpper = scope.key.toUpperCase();
  const typeUpper = type.key.toUpperCase();
  const metaUpper = meta.key.toUpperCase();
  const statusUpper = status.key.toUpperCase();

  // Generate base ID from significant keywords
  const significantWords = keywords
    .filter(word => word.length > 2)
    .slice(0, 3)
    .map(word => word.replace(/[^a-z0-9]/gi, '').toUpperCase())
    .filter(word => word.length > 0)
    .join('-');

  const baseId = significantWords || `${domainUpper.slice(0, 3)}-UNKNOWN`;

  // Generate unique ID
  const uniqueId = await generateUniqueId(baseId, domainUpper);

  // Version increment
  const version = "3.1.0";

  // Construct final header
  const header = `[${domainUpper}][${scopeUpper}][${typeUpper}][${metaUpper}][${uniqueId}][v${version}][${statusUpper}]`;

  return header;
}

// CLI interface
async function main() {
  try {
    let prompt: string;

    if (process.argv[2]) {
      prompt = process.argv[2];
    } else {
      // Interactive mode
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      prompt = await new Promise<string>((resolve) => {
        rl.question('🤖 AI Header Generator - Describe what you want to create: ', (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    }

    if (!prompt.trim()) {
      console.error('❌ Please provide a description of what you want to create');
      process.exit(1);
    }

    console.log('🤖 Analyzing prompt...');
    const header = await generateAIHeader(prompt);

    console.log('✅ Generated header:');
    console.log(header);
    console.log('');

    // Copy to clipboard if available
    try {
      await Bun.spawn(['pbcopy'], {
        stdin: 'pipe',
        stdout: 'ignore'
      }).stdin?.write(header);
      console.log('📋 Header copied to clipboard!');
    } catch (e) {
      // Clipboard not available, just show the header
    }

  } catch (error) {
    console.error(`❌ Error generating header: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.main) {
  main();
}
