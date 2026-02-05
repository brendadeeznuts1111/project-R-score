import { Generator, Context } from "./unicode-generator";

// Mocking the unicode data for demonstration with more variety
// A-Z, a-z
const idStartPoints = [];
for (let i = 65; i <= 90; i++) idStartPoints.push(i);
for (let i = 97; i <= 122; i++) idStartPoints.push(i);

// A-Z, a-z, 0-9, _
const idContinuePoints = [...idStartPoints, 95];
for (let i = 48; i <= 57; i++) idContinuePoints.push(i);

const idStartESNextSet = new Set(idStartPoints);
const idContinueESNextSet = new Set(idContinuePoints);
const ID_Continue_mistake = new Set([0x30fb, 0xff65]);

function bitsToU64Array(bits: any[]): bigint[] {
  const result: bigint[] = [];
  for (let i = 0; i < bits.length; i += 64) {
    let value = 0n;
    for (let j = 0; j < 64 && i + j < bits.length; j++) {
      if (bits[i + j]) {
        value |= 1n << BigInt(j);
      }
    }
    result.push(value);
  }
  return result;
}

async function generateTable(table: string, name: string, checkFn: (cp: number) => boolean) {
  const context: Context<boolean> = {
    get: (cp: number) => checkFn(cp),
    eql: (a: boolean, b: boolean) => a === b,
  };

  const generator = new Generator(context);
  const tables = await generator.generate();

  // For demonstration, we'll show the first few non-zero entries to make it visible
  const stage1Str = tables.stage1.slice(0, 16).join(",") + (tables.stage1.length > 16 ? ",..." : "");
  const stage2U64 = bitsToU64Array(tables.stage2);
  const stage2Str = stage2U64.slice(0, 8).map(n => "0x" + n.toString(16)).join(",") + (stage2U64.length > 8 ? ",..." : "");

  return `
pub fn ${name}(cp: u21) bool {
    if (cp > 0x10FFFF) return false;
    const high = cp >> 8;
    const low = cp & 0xFF;
    const stage2_idx = ${table}.stage1[high];
    const bit_pos = @as(usize, stage2_idx) + low;
    return (${table}.stage2[bit_pos >> 6] & (@as(u64, 1) << @as(u6, @intCast(bit_pos & 63)))) != 0;
}

/// Vector-optimized lookup for 16 codepoints at once
/// This follows the pattern in Bun's src/string/immutable where SIMD is used for validation.
pub fn ${name}Vector(cps: @Vector(16, u21)) @Vector(16, bool) {
    // In Bun's immutable string implementation, we often use bitmasks and SIMD shuffles.
    // This conceptual implementation shows how the generated tables integrate.
    var mask: u16 = 0;
    const cps_array: [16]u21 = cps;
    inline for (cps_array, 0..16) |cp, i| {
        if (${name}(cp)) {
            mask |= (@as(u16, 1) << @as(u4, @intCast(i)));
        }
    }
    
    // Convert bitmask back to boolean vector
    var results: [16]bool = undefined;
    inline for (0..16) |i| {
        results[i] = (mask & (@as(u16, 1) << @as(u4, @intCast(i)))) != 0;
    }
    return results;
}

const ${table} = struct {
    pub const stage1 = [_]u16{
        ${stage1Str}
    };
    pub const stage2 = [_]u64{
        ${stage2Str}
    };
};
`;
}

async function runDemo() {
  const startTable = await generateTable("idStartESNext", "isIDStartESNext", (cp: number) => idStartESNextSet.has(cp));
  const continueTable = await generateTable("idContinueESNext", "isIDContinueESNext", (cp: number) => idContinueESNextSet.has(cp) && !ID_Continue_mistake.has(cp));
  
  // Additional Example: Whitespace
  const whitespaceSet = new Set([0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF]);
  const whitespaceTable = await generateTable("whitespace", "isWhitespace", (cp: number) => whitespaceSet.has(cp));

  // Additional Example: Emoji (Simplified range)
  const isEmoji = (cp: number) => (cp >= 0x1F600 && cp <= 0x1F64F) || (cp >= 0x1F300 && cp <= 0x1F5FF);
  const emojiTable = await generateTable("emoji", "isEmoji", isEmoji);

  // Additional Example: Currency Symbols (Sc)
  const currencySet = new Set([0x24, 0xA2, 0xA3, 0xA4, 0xA5, 0x058F, 0x060B, 0x09F2, 0x09F3, 0x0AF1, 0x0BF9, 0x0E3F, 0x17DB, 0x20A0, 0x20A1, 0x20A2, 0x20A3, 0x20A4, 0x20A5, 0x20A6, 0x20A7, 0x20A8, 0x20A9, 0x20AA, 0x20AB, 0x20AC, 0x20AD, 0x20AE, 0x20AF, 0x20B0, 0x20B1, 0x20B2, 0x20B3, 0x20B4, 0x20B5, 0x20B6, 0x20B7, 0x20B8, 0x20B9, 0x20BA, 0x20BB, 0x20BC, 0x20BD, 0x20BE, 0x20BF, 0xA748, 0xA749, 0x20C0]);
  const currencyTable = await generateTable("currency", "isCurrency", (cp: number) => currencySet.has(cp));

  // Additional Example: Math Symbols (Sm)
  const isMath = (cp: number) => (cp >= 0x2B && cp <= 0x2B) || (cp >= 0x3C && cp <= 0x3E) || (cp >= 0x7C && cp <= 0x7C) || (cp >= 0x7E && cp <= 0x7E) || (cp >= 0xAC && cp <= 0xAC) || (cp >= 0xB1 && cp <= 0xB1) || (cp >= 0xD7 && cp <= 0xD7) || (cp >= 0xF7 && cp <= 0xF7) || (cp >= 0x3F6 && cp <= 0x3F6) || (cp >= 0x2044 && cp <= 0x2044) || (cp >= 0x2052 && cp <= 0x2052) || (cp >= 0x2140 && cp <= 0x2144) || (cp >= 0x214B && cp <= 0x214B) || (cp >= 0x2190 && cp <= 0x2194) || (cp >= 0x219A && cp <= 0x219B) || (cp >= 0x21A0 && cp <= 0x21A0) || (cp >= 0x21A3 && cp <= 0x21A3) || (cp >= 0x21A6 && cp <= 0x21A6) || (cp >= 0x21AE && cp <= 0x21AE) || (cp >= 0x21CE && cp <= 0x21CF) || (cp >= 0x21D2 && cp <= 0x21D2) || (cp >= 0x21D4 && cp <= 0x21D4) || (cp >= 0x21F4 && cp <= 0x22FF);
  const mathTable = await generateTable("math", "isMath", isMath);

  console.log("--- Example: ID_Start Table ---");
  console.log(startTable);
  console.log("\n--- Example: ID_Continue Table ---");
  console.log(continueTable);
  console.log("\n--- Example: Whitespace Table ---");
  console.log(whitespaceTable);
  console.log("\n--- Example: Emoji Table ---");
  console.log(emojiTable);
  console.log("\n--- Example: Currency Table ---");
  console.log(currencyTable);
  console.log("\n--- Example: Math Table ---");
  console.log(mathTable);
}

runDemo().catch(console.error);
