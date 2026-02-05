import { Generator, Context } from "./unicode-generator";

/**
 * Unicode Identifier Generator for T3-Lattice
 * Generates optimized lookup tables for JS identifier validation.
 * Note: Requires @unicode/unicode-X.X.X packages to be installed for full generation.
 * This script provides the structure and logic as requested.
 */

// Mocking the unicode data for demonstration if packages aren't present
// In a real environment, these would be: require("@unicode/unicode-15.1.0/Binary_Property/ID_Start/code-points")
const mockPoints = [0x41, 0x42, 0x43]; // A, B, C

const idStartESNextSet = new Set(mockPoints);
const idContinueESNextSet = new Set([...mockPoints, 0x30, 0x31]); // A, B, C, 0, 1

// Mocking additional categories for T3-Lattice v3.3
const currencySet = new Set([0x24, 0xa2, 0xa3, 0xa4, 0xa5, 0x20ac]); // $, ¢, £, ¤, ¥, €
const mathSet = new Set([0x2b, 0x2212, 0x3d, 0x2260]); // +, −, =, ≠
const emojiSet = new Set([0x1f600, 0x1f601, 0x1f602]); // 😀, 😁, 😂
const whitespaceSet = new Set([0x20, 0x09, 0x0a, 0x0d, 0xa0, 0x2028, 0x2029]); // space, tab, nl, cr, nbsp, ls, ps

// Exclude known problematic codepoints
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

  return `
pub fn ${name}(cp: u21) bool {
    if (cp > 0x10FFFF) return false;
    const high = cp >> 8;
    const low = cp & 0xFF;
    const stage2_idx = ${table}.stage1[high];
    const bit_pos = stage2_idx + low;
    const u64_idx = bit_pos >> 6;
    const bit_idx = @as(u6, @intCast(bit_pos & 63));
    return (${table}.stage2[u64_idx] & (@as(u64, 1) << bit_idx)) != 0;
}
const ${table} = struct {
    pub const stage1 = [_]u16{${tables.stage1.join(",")}};
    pub const stage2 = [_]u64{${bitsToU64Array(tables.stage2)
      .map(n => n.toString())
      .join(",")}};
};
`;
}

async function main() {
  console.log("🧬 Generating Unicode identifier tables...");
  
  const functions = [
    {
      name: "isIDStartESNext",
      table: "idStartESNext",
      check: (cp: number) => idStartESNextSet.has(cp),
    },
    {
      name: "isIDContinueESNext",
      table: "idContinueESNext",
      check: (cp: number) => idContinueESNextSet.has(cp) && !ID_Continue_mistake.has(cp),
    },
    {
      name: "isCurrency",
      table: "currency",
      check: (cp: number) => currencySet.has(cp),
    },
    {
      name: "isMath",
      table: "math",
      check: (cp: number) => mathSet.has(cp),
    },
    {
      name: "isEmoji",
      table: "emoji",
      check: (cp: number) => emojiSet.has(cp),
    },
    {
      name: "isWhitespace",
      table: "whitespace",
      check: (cp: number) => whitespaceSet.has(cp),
    },
  ];

  const results = await Promise.all(
    functions.map(async ({ name, check, table }) => {
      return await generateTable(table, name, check);
    }),
  );

  const output = `/// This file is auto-generated. Do not edit.
${results.join("\n\n")}`;

  await Bun.write(import.meta.dir + "/unicode-identifiers.zig", output);
  console.log(`✅ Unicode tables generated and saved to ${import.meta.dir}/unicode-identifiers.zig`);
}

main().catch(console.error);
