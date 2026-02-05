/**
 * FactoryWager Tabular v4.2.1 - Simple Test Output
 * Demonstrates default value enforcement without complex table formatting
 */

// Column definitions with explicit defaults
const COLUMNS = [
  { name: "key",      key: "key",     default: "unnamed" },
  { name: "value",    key: "value",   default: "" },
  { name: "type",     key: "type",    default: "unknown" },
  { name: "version",  key: "version", default: "none" },
  { name: "bunVer",   key: "bun",     default: "any" },
  { name: "author",   key: "author",  default: "anonymous" },
  { name: "status",   key: "status",  default: "active" },
  { name: "modified", key: "date_iso",default: "never" }
] as const;

/**
 * Simple demonstration of default value enforcement
 */
function demoDefaultEnforcement() {
  console.log('📊 FactoryWager Tabular v4.2.1 - Default Value Enforcement Demo');
  console.log('=' .repeat(70));

  const sampleData = [
    {
      key: "title",
      value: "FactoryWager API Guide",
      author: "nolarose",
      date_iso: "2026-02-01T08:10:00Z"
    },
    {
      key: "draft",
      value: false,
      // Missing author, modified - will show defaults
    },
    {
      key: "bunVersion",
      value: "1.3.8",
      author: "system"
      // Missing date_iso - will show default
    },
    {
      key: "tags",
      value: ["api", "cli", "registry"]
      // Missing author, date_iso - will show defaults
    },
    {
      key: "deprecated",
      value: true,
      author: "admin",
      status: "deprecated",
      date_iso: "2026-01-15T00:00:00Z"
    },
    {
      key: "version",
      value: "4.2.1",
      version: "4.2.1",
      author: "nolarose"
    },
    {
      key: "emptyValue",
      value: null
      // Will show empty string default for value
    },
    {
      key: "missingFields"
      // All fields missing - will show all defaults
    }
  ];

  console.log('\n🔍 Default Value Processing:');
  console.log('-' .repeat(50));

  sampleData.forEach((entry, idx) => {
    const processed = processWithDefaults(entry, idx);

    console.log(`\n${idx + 1}. ${processed.key}`);
    console.log(`   value: "${processed.value}" ${processed.value === "" ? '(default empty)' : ''}`);
    console.log(`   type: ${processed.type} ${processed.type === "unknown" ? '(default)' : ''}`);
    console.log(`   version: ${processed.version} ${processed.version === "none" ? '(default)' : ''}`);
    console.log(`   bunVer: ${processed.bun} ${processed.bun === "any" ? '(default)' : ''}`);
    console.log(`   author: ${processed.author} ${processed.author === "anonymous" ? '(default)' : ''}`);
    console.log(`   status: ${processed.status} ${processed.status === "active" ? '(default)' : ''}`);
    console.log(`   modified: ${processed.date_iso} ${processed.date_iso === "never" ? '(default)' : ''}`);
  });

  console.log('\n📋 Default Value Contract:');
  console.log('-' .repeat(30));
  console.log('• value: "" (empty string)');
  console.log('• type: "unknown"');
  console.log('• version: "none"');
  console.log('• bunVer: "any"');
  console.log('• author: "anonymous"');
  console.log('• status: "active"');
  console.log('• modified: "never"');

  console.log('\n✅ Every cell guaranteed to have a value!');
  console.log('🚀 No nulls, no undefined, no "—" dashes!');
}

/**
 * Process entry with default value enforcement
 */
function processWithDefaults(entry: any, idx: number) {
  const value = entry.value;
  let type: string = typeof value;
  if (type === "object") type = Array.isArray(value) ? "array" : "object";
  if (value === null) type = "null";

  // Compute author hash if author exists
  let authorHash = entry.authorHash;
  if (!authorHash && entry.author) {
    const hash = Bun.hash.crc32(entry.author);
    authorHash = (hash >>> 0).toString(16).padStart(8, '0').slice(0, 10);
  }

  return {
    key: entry.key || "unnamed",
    value: value === null || value === undefined ? "" : String(value),
    type: type,
    version: entry.version || entry.ver || entry.v || "none",
    bun: entry.bun || entry.bunVersion || entry["bun-version"] || "any",
    author: entry.author || entry.creator || entry.by || "anonymous",
    authorHash: authorHash || "----------",
    status: entry.status || (entry.draft === true ? "draft" : entry.draft === false ? "active" : "active"),
    date_iso: entry.date_iso || entry.modified || entry.updated || "never"
  };
}

// Export for use in other modules
export { processWithDefaults, COLUMNS, demoDefaultEnforcement };

// Run demo if executed directly
if (import.meta.main) {
  demoDefaultEnforcement();
}
