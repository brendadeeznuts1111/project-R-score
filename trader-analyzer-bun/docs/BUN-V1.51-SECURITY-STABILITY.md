# Bun v1.51: Security & Stability Features

## ✅ Updated Root Certificates (Mozilla NSS 3.117)

**Impact**: No SSL/TLS breakage with legacy bookmaker APIs

### Automatic Certificate Management

Bun v1.51 includes updated Mozilla NSS 3.117 root certificates. All HTTPS requests automatically use the latest certificates:

```typescript
// Your API calls to bookmakers now use latest Mozilla NSS 3.117
const response = await fetch('https://api.bookmaker.com/odds', {
  tls: {
    // Bun v1.51's updated certs ensure no TLS handshake failures
    ca: undefined // Uses built-in Mozilla NSS automatically
  }
});
```

**No action required**: Certificates are automatically updated and used for all HTTPS requests.

---

## ✅ YAML Config Performance Fix

**Impact**: Fixed exponential complexity in YAML parsing

### Leading Zero Handling

Bun v1.51 fixes YAML parsing to correctly handle leading zeros in strings:

**Before (Bun v1.50)**:
```yaml
market_codes:
  nfl: "01234"  # Serialized as number 1234 ❌
  nba: "02345"  # Serialized as number 2345 ❌
```

**After (Bun v1.51)**:
```yaml
market_codes:
  nfl: "01234"  # Correctly serialized as string "01234" ✅
  nba: "02345"  # Correctly serialized as string "02345" ✅
```

### Performance Improvement

```typescript
// Load without performance hang
const config = await Bun.file('config.yml').text();
const yaml = Bun.YAML.parse(config); // Fixed exponential complexity

// Leading zeros are now preserved as strings
console.log(yaml.market_codes.nfl); // "01234" (string, not number)
```

**Performance Impact**:
- **Before**: Exponential complexity on large YAML files (could hang)
- **After**: Linear complexity (fast parsing)

---

## Usage Examples

### Bookmaker API with Updated Certificates

```typescript
// src/clients/BookmakerApiClient17.ts
async fetchMarketData(endpoint: string): Promise<any> {
  // Automatically uses latest Mozilla NSS 3.117 certificates
  const response = await fetch(`https://api.bookmaker.com${endpoint}`, {
    headers: {
      'User-Agent': 'NEXUS/1.0',
    },
    // No need to specify ca - uses built-in certificates
  });
  
  return response.json();
}
```

### YAML Config Loading

```typescript
// config/market-codes.yml
const configFile = Bun.file('config/market-codes.yml');
const configText = await configFile.text();
const config = Bun.YAML.parse(configText);

// Leading zeros preserved
const nflCode = config.market_codes.nfl; // "01234" (string)
const nbaCode = config.market_codes.nba; // "02345" (string)
```

---

## Migration Notes

### No Breaking Changes

Both features are **backward compatible**:
- ✅ Certificate updates are automatic (no code changes needed)
- ✅ YAML parsing fixes preserve existing behavior (strings remain strings)

### Verification

```typescript
// Verify certificate update
const response = await fetch('https://api.bookmaker.com/health');
console.log('TLS handshake successful:', response.ok);

// Verify YAML parsing
const yaml = Bun.YAML.parse('market_code: "01234"');
console.log('Type preserved:', typeof yaml.market_code === 'string'); // true
```

---

**Status**: ✅ Both features are automatically enabled in Bun v1.51
**Action Required**: None - features work automatically
