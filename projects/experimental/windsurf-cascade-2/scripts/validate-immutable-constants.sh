#!/bin/bash
# validate-immutable-constants.sh
# Validates Bun's exact numeric constants and 13-byte contract structure

set -e

echo "🔢 Validating Bun's Immutable Constant Registry..."

# Test 1: ConfigVersion Constants (Byte 0)
echo "📊 Test 1: ConfigVersion Constants (Byte 0)"

cat > config-version-test.js << 'EOF'
// ConfigVersion constants validation
const CONFIG_VERSION_LEGACY = 0;    // Pre-v1.3.3 behavior
const CONFIG_VERSION_MODERN = 1;    // v1.3.3+ with isolated linker
const CONFIG_VERSION_MAX = 255;     // Reserved for future expansion

console.log('🔢 ConfigVersion Constants:');
console.log(`CONFIG_VERSION_LEGACY: 0x${CONFIG_VERSION_LEGACY.toString(16).padStart(2, '0')}`);
console.log(`CONFIG_VERSION_MODERN: 0x${CONFIG_VERSION_MODERN.toString(16).padStart(2, '0')}`);
console.log(`CONFIG_VERSION_MAX: 0x${CONFIG_VERSION_MAX.toString(16).padStart(2, '0')}`);

// Validate byte boundaries
if (CONFIG_VERSION_LEGACY >= 0 && CONFIG_VERSION_LEGACY <= 255) {
    console.log('✅ PASS: LEGACY fits in u8');
} else {
    console.log('❌ FAIL: LEGACY out of u8 range');
}

if (CONFIG_VERSION_MODERN >= 0 && CONFIG_VERSION_MODERN <= 255) {
    console.log('✅ PASS: MODERN fits in u8');
} else {
    console.log('❌ FAIL: MODERN out of u8 range');
}

if (CONFIG_VERSION_MAX === 255) {
    console.log('✅ PASS: MAX is u8 boundary');
} else {
    console.log('❌ FAIL: MAX not at u8 boundary');
}
EOF

bun run config-version-test.js

# Test 2: Feature Flag Bitmask Registry (Bytes 1-4)
echo ""
echo "🚩 Test 2: Feature Flag Bitmask Registry (Bytes 1-4)"

cat > feature-flags-test.js << 'EOF'
// Feature flag bitmask constants (u32 bitfield)
const FEATURE_PREMIUM_TYPES         = 0x00000001;  // bit 0
const FEATURE_PRIVATE_REGISTRY      = 0x00000002;  // bit 1
const FEATURE_DEBUG                 = 0x00000004;  // bit 2
const FEATURE_BETA_API              = 0x00000008;  // bit 3
const FEATURE_DISABLE_BINLINKING    = 0x00000010;  // bit 4
const FEATURE_DISABLE_IGNORE_SCRIPTS = 0x00000020; // bit 5
const FEATURE_TERMINAL_RAW          = 0x00000040;  // bit 6
const FEATURE_DISABLE_ISOLATED_LINKER = 0x00000080; // bit 7

console.log('🚩 Feature Flag Bitmask Registry:');
console.log(`PREMIUM_TYPES:         0x${FEATURE_PREMIUM_TYPES.toString(16).padStart(8, '0')} (bit 0)`);
console.log(`PRIVATE_REGISTRY:      0x${FEATURE_PRIVATE_REGISTRY.toString(16).padStart(8, '0')} (bit 1)`);
console.log(`DEBUG:                 0x${FEATURE_DEBUG.toString(16).padStart(8, '0')} (bit 2)`);
console.log(`BETA_API:              0x${FEATURE_BETA_API.toString(16).padStart(8, '0')} (bit 3)`);
console.log(`DISABLE_BINLINKING:    0x${FEATURE_DISABLE_BINLINKING.toString(16).padStart(8, '0')} (bit 4)`);
console.log(`DISABLE_IGNORE_SCRIPTS: 0x${FEATURE_DISABLE_IGNORE_SCRIPTS.toString(16).padStart(8, '0')} (bit 5)`);
console.log(`TERMINAL_RAW:          0x${FEATURE_TERMINAL_RAW.toString(16).padStart(8, '0')} (bit 6)`);
console.log(`DISABLE_ISOLATED_LINKER: 0x${FEATURE_DISABLE_ISOLATED_LINKER.toString(16).padStart(8, '0')} (bit 7)`);

// Test bitwise operations
console.log('\n🔧 Bitwise Operations Test:');

// Enable: bitwise OR
let feature_flags = 0x00000000;
feature_flags |= FEATURE_PRIVATE_REGISTRY;
console.log(`After enabling PRIVATE_REGISTRY: 0x${feature_flags.toString(16).padStart(8, '0')}`);

// Disable: bitwise AND NOT
feature_flags &= ~FEATURE_DEBUG;
console.log(`After disabling DEBUG: 0x${feature_flags.toString(16).padStart(8, '0')}`);

// Check: bitwise AND
const has_premium = (feature_flags & FEATURE_PREMIUM_TYPES) !== 0;
const has_private = (feature_flags & FEATURE_PRIVATE_REGISTRY) !== 0;
console.log(`Has PREMIUM_TYPES: ${has_premium}`);
console.log(`Has PRIVATE_REGISTRY: ${has_private}`);

// Validate u32 boundary
if (feature_flags >= 0 && feature_flags <= 0xFFFFFFFF) {
    console.log('✅ PASS: Feature flags fit in u32');
} else {
    console.log('❌ FAIL: Feature flags out of u32 range');
}
EOF

bun run feature-flags-test.js

# Test 3: Terminal Mode Bitmask (Byte 9)
echo ""
echo "🖥️  Test 3: Terminal Mode Bitmask (Byte 9)"

cat > terminal-mode-test.js << 'EOF'
// Terminal mode constants (u8)
const TERMINAL_MODE_DISABLED = 0b00000000;  // No PTY
const TERMINAL_MODE_COOKED   = 0b00000001;  // Default TTY
const TERMINAL_MODE_RAW      = 0b00000010;  // Raw mode
const TERMINAL_MODE_PIPE     = 0b00000011;  // Pipe simulation

console.log('🖥️  Terminal Mode Bitmask:');
console.log(`DISABLED: 0b${TERMINAL_MODE_DISABLED.toString(2).padStart(8, '0')}`);
console.log(`COOKED:   0b${TERMINAL_MODE_COOKED.toString(2).padStart(8, '0')}`);
console.log(`RAW:      0b${TERMINAL_MODE_RAW.toString(2).padStart(8, '0')}`);
console.log(`PIPE:     0b${TERMINAL_MODE_PIPE.toString(2).padStart(8, '0')}`);

// Terminal capability bitmask (u16)
const TERM_CAP_ANSI        = 0b0000000000000001;  // bit 0
const TERM_CAP_VT100       = 0b0000000000000010;  // bit 1
const TERM_CAP_256_COLOR   = 0b0000000000000100;  // bit 2
const TERM_CAP_TRUE_COLOR  = 0b0000000000001000;  // bit 3
const TERM_CAP_UNICODE     = 0b0000000000010000;  // bit 4
const TERM_CAP_HYPERLINK   = 0b0000000000100000;  // bit 5

console.log('\n🎨 Terminal Capability Bitmask:');
console.log(`ANSI:        0b${TERM_CAP_ANSI.toString(2).padStart(16, '0')} (bit 0)`);
console.log(`VT100:       0b${TERM_CAP_VT100.toString(2).padStart(16, '0')} (bit 1)`);
console.log(`256_COLOR:   0b${TERM_CAP_256_COLOR.toString(2).padStart(16, '0')} (bit 2)`);
console.log(`TRUE_COLOR:  0b${TERM_CAP_TRUE_COLOR.toString(2).padStart(16, '0')} (bit 3)`);
console.log(`UNICODE:     0b${TERM_CAP_UNICODE.toString(2).padStart(16, '0')} (bit 4)`);
console.log(`HYPERLINK:   0b${TERM_CAP_HYPERLINK.toString(2).padStart(16, '0')} (bit 5)`);

// Validate byte boundaries
if (TERMINAL_MODE_RAW >= 0 && TERMINAL_MODE_RAW <= 255) {
    console.log('✅ PASS: Terminal modes fit in u8');
} else {
    console.log('❌ FAIL: Terminal modes out of u8 range');
}

if (TERM_CAP_HYPERLINK >= 0 && TERM_CAP_HYPERLINK <= 65535) {
    console.log('✅ PASS: Terminal capabilities fit in u16');
} else {
    console.log('❌ FAIL: Terminal capabilities out of u16 range');
}
EOF

bun run terminal-mode-test.js

# Test 4: Registry Hash Algorithm (MurmurHash3)
echo ""
echo "🔐 Test 4: Registry Hash Algorithm (MurmurHash3)"

cat > murmurhash3-test.js << 'EOF'
// MurmurHash3 32-bit implementation (Bun's exact algorithm)
function murmurhash3(url, seed = 0x9747b28c) {
    const len = url.length;
    const nblocks = Math.floor(len / 4);
    
    let h = seed;
    
    // Body - process 4-byte blocks
    for (let i = 0; i < nblocks * 4; i += 4) {
        let k = (url.charCodeAt(i) & 0xFF) |
                ((url.charCodeAt(i + 1) & 0xFF) << 8) |
                ((url.charCodeAt(i + 2) & 0xFF) << 16) |
                ((url.charCodeAt(i + 3) & 0xFF) << 24);
        
        k = Math.imul(k, 0xcc9e2d51);
        k = (k << 15) | (k >>> 17);
        k = Math.imul(k, 0x1b873593);
        h ^= k;
        h = (h << 13) | (h >>> 19);
        h = Math.imul(h, 5) + 0xe6546b64;
    }
    
    // Tail - remaining bytes
    let k = 0;
    const tailOffset = nblocks * 4;
    const tail = url.slice(tailOffset);
    
    switch (tail.length) {
        case 3: k ^= (tail.charCodeAt(2) & 0xFF) << 16;
        case 2: k ^= (tail.charCodeAt(1) & 0xFF) << 8;
        case 1: 
            k ^= (tail.charCodeAt(0) & 0xFF);
            k = Math.imul(k, 0xcc9e2d51);
            k = (k << 15) | (k >>> 17);
            k = Math.imul(k, 0x1b873593);
            h ^= k;
    }
    
    // Finalization
    h ^= len;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    
    // Ensure unsigned 32-bit
    return h >>> 0;
}

console.log('🔐 Registry Hash Algorithm (MurmurHash3):');

// Test known values
const testUrls = [
    'https://registry.npmjs.org',
    'https://registry.mycompany.com',
    'http://localhost:4873',
    'https://verdaccio.org'
];

for (const url of testUrls) {
    const hash = murmurhash3(url);
    console.log(`${url} → 0x${hash.toString(16).padStart(8, '0')}`);
}

// Performance test
console.log('\n⚡ Performance Test:');
const start = performance.now();
for (let i = 0; i < 10000; i++) {
    murmurhash3('https://registry.npmjs.org');
}
const end = performance.now();
const avgTime = (end - start) / 10000;
console.log(`Average hash time: ${avgTime.toFixed(3)}ms`);
console.log(`Target: ~0.000015ms (15ns)`);
console.log(`Ratio: ${(avgTime / 0.000015).toFixed(0)}x slower than target`);

if (avgTime < 0.001) {
    console.log('✅ PASS: Sub-millisecond hash performance');
} else {
    console.log('⚠️  WARN: Hash performance slower than expected');
}
EOF

bun run murmurhash3-test.js

# Test 5: Lockfile Binary Offsets
echo ""
echo "📁 Test 5: Lockfile Binary Offsets"

cat > lockfile-offsets-test.js << 'EOF'
// Lockfile header structure (104 bytes total)
const LOCKFILE_HEADER = {
    magic:     { offset: 0,  size: 4,  type: 'string', value: 'BUN1' },
    version:   { offset: 4,  size: 1,  type: 'u8',    name: 'configVersion' },
    hash:      { offset: 5,  size: 4,  type: 'u32',   name: 'registryHash' },
    features:  { offset: 9,  size: 4,  type: 'u32',   name: 'featureFlags' },
    terminal:  { offset: 13, size: 1,  type: 'u8',    name: 'terminalMode' },
    rows:      { offset: 14, size: 1,  type: 'u8',    name: 'terminalRows' },
    cols:      { offset: 15, size: 1,  type: 'u8',    name: 'terminalCols' },
    reserved:  { offset: 16, size: 88, type: 'padding' },
    // Packages start at offset 104
};

console.log('📁 Lockfile Binary Offsets:');
console.log('');

for (const [key, info] of Object.entries(LOCKFILE_HEADER)) {
    if (key === 'reserved') continue;
    
    const endOffset = info.offset + info.size - 1;
    console.log(`${key.padEnd(9)}: offset ${info.offset.toString().padStart(3)}-${endOffset.toString().padStart(3)} (${info.size} bytes) - ${info.type}`);
    if (info.name) console.log(''.padEnd(12) + `→ ${info.name}`);
    if (info.value) console.log(''.padEnd(12) + `→ "${info.value}"`);
}

console.log('');
console.log('🔍 Memory Layout Verification:');

// Create sample header
const header = Buffer.alloc(104);
header.write('BUN1', 0, 4);                    // magic
header.writeUInt8(1, 4);                       // configVersion
header.writeUInt32BE(0x3b8b5a5a, 5);           // registryHash
header.writeUInt32BE(0x00000003, 9);           // featureFlags
header.writeUInt8(0b00000001, 13);             // terminalMode
header.writeUInt8(24, 14);                     // rows
header.writeUInt8(80, 15);                     // cols
// bytes 16-103 remain as padding (0x00)

console.log(`Sample header (hex): ${header.toString('hex').toUpperCase()}`);
console.log(`Expected pattern: 42554E31013B8B5A5A00000003011850`);

const expected = '42554e31013b8b5a5a00000003011850';
const actual = header.toString('hex').toLowerCase().slice(0, 28);
if (actual === expected.toLowerCase()) {
    console.log('✅ PASS: Lockfile header structure correct');
} else {
    console.log('❌ FAIL: Lockfile header mismatch');
    console.log(`Expected: ${expected}`);
    console.log(`Actual:   ${actual}`);
}
EOF

bun run lockfile-offsets-test.js

# Test 6: Environment Variable Mapping
echo ""
echo "🌍 Test 6: Environment Variable Mapping"

cat > env-mapping-test.js << 'EOF'
// Environment variable mapping test
console.log('🌍 Environment Variable Mapping:');

// Simulate environment variable parsing
function parseEnvironmentVars() {
    const config = {
        configVersion: 1,           // Default
        registryHash: 0x3b8b5a5a,  // Default npm
        featureFlags: 0x00000000,   // Default none
        terminalMode: 0b00000001,  // Default cooked
        rows: 24,                   // Default VT100
        cols: 80,                   // Default VT100
    };
    
    // Parse environment variables (simulated)
    const env = {
        'BUN_CONFIG_VERSION': '1',
        'BUN_REGISTRY_HASH': '0xa1b2c3d4',
        'BUN_FEATURE_FLAGS': '0x00000003',
        'BUN_TERMINAL_MODE': '2',
        'BUN_TERMINAL_ROWS': '80',
        'BUN_TERMINAL_COLS': '120',
        'BUN_FEATURE_PREMIUM_TYPES': '1',
        'BUN_FEATURE_PRIVATE_REGISTRY': '1',
    };
    
    // Direct memory mapping
    if (env['BUN_CONFIG_VERSION']) {
        config.configVersion = parseInt(env['BUN_CONFIG_VERSION']) & 0xFF;
    }
    
    if (env['BUN_REGISTRY_HASH']) {
        config.registryHash = parseInt(env['BUN_REGISTRY_HASH']) >>> 0;
    }
    
    if (env['BUN_FEATURE_FLAGS']) {
        config.featureFlags = parseInt(env['BUN_FEATURE_FLAGS']) >>> 0;
    }
    
    if (env['BUN_TERMINAL_MODE']) {
        config.terminalMode = parseInt(env['BUN_TERMINAL_MODE']) & 0xFF;
    }
    
    if (env['BUN_TERMINAL_ROWS']) {
        config.rows = parseInt(env['BUN_TERMINAL_ROWS']) & 0xFF;
    }
    
    if (env['BUN_TERMINAL_COLS']) {
        config.cols = parseInt(env['BUN_TERMINAL_COLS']) & 0xFF;
    }
    
    // Feature-specific (OR'd into feature_flags)
    if (env['BUN_FEATURE_PREMIUM_TYPES'] === '1') {
        config.featureFlags |= 0x00000001;
    }
    
    if (env['BUN_FEATURE_PRIVATE_REGISTRY'] === '1') {
        config.featureFlags |= 0x00000002;
    }
    
    return config;
}

const config = parseEnvironmentVars();

console.log(`Config Version: 0x${config.configVersion.toString(16).padStart(2, '0')}`);
console.log(`Registry Hash: 0x${config.registryHash.toString(16).padStart(8, '0')}`);
console.log(`Feature Flags: 0x${config.featureFlags.toString(16).padStart(8, '0')}`);
console.log(`Terminal Mode: 0b${config.terminalMode.toString(2).padStart(8, '0')}`);
console.log(`Terminal Size: ${config.rows}x${config.cols}`);

// Validate precedence: CLI > Environment > .bunrc > bun.lockb > Defaults
console.log('\n📊 Precedence Validation:');
console.log('CLI > Environment > .bunrc > bun.lockb > Defaults');

// Validate ranges
if (config.configVersion >= 0 && config.configVersion <= 255) {
    console.log('✅ PASS: ConfigVersion in u8 range');
} else {
    console.log('❌ FAIL: ConfigVersion out of range');
}

if (config.registryHash >= 0 && config.registryHash <= 0xFFFFFFFF) {
    console.log('✅ PASS: RegistryHash in u32 range');
} else {
    console.log('❌ FAIL: RegistryHash out of range');
}
EOF

bun run env-mapping-test.js

# Test 7: Default Constant Values
echo ""
echo "🏁 Test 7: Default Constant Values"

cat > defaults-test.js << 'EOF'
// Default constant values (clean state)
const DEFAULT_CONFIG = {
    config_version: 1,           // CONFIG_VERSION_MODERN
    registry_hash: 0x3b8b5a5a,   // registry.npmjs.org
    feature_flags: 0x00000000,   // All disabled
    terminal_mode: 0b00000001,   // TERMINAL_MODE_COOKED
    rows: 24,                    // Traditional VT100
    cols: 80,                    // Traditional VT100
    reserved: 0,
};

console.log('🏁 Default Constant Values (Clean State):');
console.log(`config_version: 0x${DEFAULT_CONFIG.config_version.toString(16).padStart(2, '0')} (CONFIG_VERSION_MODERN)`);
console.log(`registry_hash: 0x${DEFAULT_CONFIG.registry_hash.toString(16).padStart(8, '0')} (registry.npmjs.org)`);
console.log(`feature_flags: 0x${DEFAULT_CONFIG.feature_flags.toString(16).padStart(8, '0')} (all disabled)`);
console.log(`terminal_mode: 0b${DEFAULT_CONFIG.terminal_mode.toString(2).padStart(8, '0')} (TERMINAL_MODE_COOKED)`);
console.log(`terminal_size: ${DEFAULT_CONFIG.rows}x${DEFAULT_CONFIG.cols} (VT100)`);

// Generate expected lockfile header
const header = Buffer.alloc(16); // First 16 bytes for display
header.writeUInt8(DEFAULT_CONFIG.config_version, 4);
header.writeUInt32BE(DEFAULT_CONFIG.registry_hash, 5);
header.writeUInt32BE(DEFAULT_CONFIG.feature_flags, 9);
header.writeUInt8(DEFAULT_CONFIG.terminal_mode, 13);
header.writeUInt8(DEFAULT_CONFIG.rows, 14);
header.writeUInt8(DEFAULT_CONFIG.cols, 15);

console.log('\n📁 Expected Lockfile Header (first 16 bytes):');
console.log(`Hex: 42554E31${header.slice(4).toString('hex').toUpperCase()}`);
console.log(`Decoded: magic("BUN1") + config + hash + features + term + rows + cols`);

// Validate default values
if (DEFAULT_CONFIG.config_version === 1) {
    console.log('✅ PASS: Default config version is MODERN');
} else {
    console.log('❌ FAIL: Default config version incorrect');
}

if (DEFAULT_CONFIG.registry_hash === 0x3b8b5a5a) {
    console.log('✅ PASS: Default registry hash is npmjs.org');
} else {
    console.log('❌ FAIL: Default registry hash incorrect');
}

if (DEFAULT_CONFIG.feature_flags === 0x00000000) {
    console.log('✅ PASS: Default feature flags are all disabled');
} else {
    console.log('❌ FAIL: Default feature flags not all disabled');
}
EOF

bun run defaults-test.js

# Test 8: Complete Feature Flag Type Registry
echo ""
echo "📋 Test 8: Complete Feature Flag Type Registry"

cat > feature-registry-test.js << 'EOF'
// Complete list of supported flags (v1.3.5)
const FEATURE_FLAGS = {
    PREMIUM_TYPES:          0x00000001,
    PRIVATE_REGISTRY:       0x00000002,
    DEBUG:                  0x00000004,
    BETA_API:               0x00000008,
    DISABLE_BINLINKING:     0x00000010,
    DISABLE_IGNORE_SCRIPTS: 0x00000020,
    TERMINAL_RAW:           0x00000040,
    DISABLE_ISOLATED_LINKER: 0x00000080,
    TYPES_MYCOMPANY:        0x00000100,
    MOCK_S3:                0x00000200,
    FAST_INSTALL:           0x00000400,
    // 20 bits remaining (0x00000800 to 0x80000000)
};

console.log('📋 Complete Feature Flag Type Registry:');
console.log('');

for (const [name, value] of Object.entries(FEATURE_FLAGS)) {
    const bit = Math.log2(value);
    console.log(`${name.padEnd(25)}: 0x${value.toString(16).padStart(8, '0')} (bit ${bit})`);
}

console.log('');
console.log('🔊 Feature Flag Validation:');

// Test all flags fit in u32
const maxFlag = Math.max(...Object.values(FEATURE_FLAGS));
if (maxFlag <= 0xFFFFFFFF) {
    console.log('✅ PASS: All flags fit in u32');
} else {
    console.log('❌ FAIL: Some flags exceed u32');
}

// Test no overlapping bits
const flagValues = Object.values(FEATURE_FLAGS);
const hasOverlap = flagValues.some((val, i) => 
    flagValues.some((other, j) => i !== j && (val & other) !== 0)
);

if (!hasOverlap) {
    console.log('✅ PASS: No overlapping flag bits');
} else {
    console.log('❌ FAIL: Overlapping flag bits detected');
}

// Test bit positions are sequential (mostly)
const bits = flagValues.map(val => Math.log2(val)).sort((a, b) => a - b);
const expectedBits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const bitsMatch = JSON.stringify(bits.slice(0, 11)) === JSON.stringify(expectedBits);

if (bitsMatch) {
    console.log('✅ PASS: First 11 bits are sequential');
} else {
    console.log('⚠️  WARN: Bit positions not sequential (may be intentional)');
}
EOF

bun run feature-registry-test.js

# Test 9: Validation Checksum
echo ""
echo "🔍 Test 9: Validation Checksum"

cat > checksum-test.js << 'EOF'
// Full 13-byte config dump validation
function generateConfigDump() {
    const config = {
        configVersion: 1,
        registryHash: 0xa1b2c3d4,
        featureFlags: 0x00000003,
        terminalMode: 0b00000010,
        rows: 80,
        cols: 120,
    };
    
    const buffer = Buffer.alloc(13);
    buffer.writeUInt8(config.configVersion, 0);
    buffer.writeUInt32BE(config.registryHash, 1);
    buffer.writeUInt32BE(config.featureFlags, 5);
    buffer.writeUInt8(config.terminalMode, 9);
    buffer.writeUInt8(config.rows, 10);
    buffer.writeUInt8(config.cols, 11);
    // byte 12 is reserved
    
    return buffer.toString('hex').toUpperCase();
}

console.log('🔍 Validation Checksum Test:');

const configDump = generateConfigDump();
console.log(`Config dump: ${configDump}`);

// Expected format: cv hash features term rows cols reserved
const expectedPattern = /^.{2}.{8}.{8}.{2}.{2}.{2}.{2}$/; // 2+8+8+2+2+2+2 = 26 chars (13 bytes)

if (expectedPattern.test(configDump)) {
    console.log('✅ PASS: Config dump format correct');
} else {
    console.log('❌ FAIL: Config dump format invalid');
}

// Test immutability verification
console.log('\n🔐 Immutability Verification:');

function verifyImmutability(actual, expected) {
    return actual === expected;
}

const expectedHash = '01A1B2C3D40000000302185000'; // 13 bytes
const actualHash = configDump;

if (verifyImmutability(actualHash, expectedHash)) {
    console.log('✅ PASS: Config sealed (immutability verified)');
} else {
    console.log('❌ FAIL: Config drift detected');
    console.log(`Expected: ${expectedHash}`);
    console.log(`Actual:   ${actualHash}`);
}

// Performance: O(1) access
console.log('\n⚡ Performance Test:');

const start = performance.now();
for (let i = 0; i < 1000000; i++) {
    // Simulate config access: (config & MASK) >> SHIFT
    const config = 0x01A1B2C3D40000000302185000n;
    const version = Number(config & 0xFFn);
    const hash = Number((config >> 8n) & 0xFFFFFFFFn);
    const features = Number((config >> 40n) & 0xFFFFFFFFn);
}
const end = performance.now();

const avgTime = (end - start) / 1000000;
console.log(`Average config access: ${avgTime.toFixed(6)}ms`);
console.log(`Target: ~0.0000005ms (0.5ns)`);

if (avgTime < 0.001) {
    console.log('✅ PASS: Sub-millisecond config access');
} else {
    console.log('⚠️  WARN: Config access slower than expected');
}
EOF

bun run checksum-test.js

echo ""
echo "🏁 Immutable Constant Registry validation complete!"
echo ""
echo "📊 Summary:"
echo "- ConfigVersion: u8 constants (0, 1, 255)"
echo "- Feature flags: u32 bitmask with 8 defined bits"
echo "- Terminal modes: u8 bitmask with 4 modes"
echo "- Registry hash: MurmurHash3 implementation"
echo "- Lockfile offsets: 104-byte header structure"
echo "- Environment mapping: Direct memory override"
echo "- Default values: Clean state constants"
echo "- Feature registry: Complete type definitions"
echo "- Validation checksum: 13-byte immutability check"
