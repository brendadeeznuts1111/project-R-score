// Binary CSV parsing benchmark - Uint8Array vs string parsing
import { bench, group, execute } from "./runner";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

const csvPath = join(import.meta.dir, "..", "bitmex_executions.csv");

// Pre-load both formats
const csvString = readFileSync(csvPath, "utf-8");
const csvBuffer = readFileSync(csvPath); // Returns Buffer (Uint8Array)
const csvArrayBuffer = Bun.file(csvPath).stream();

console.log(`✅ Loaded ${csvString.length.toLocaleString()} chars / ${csvBuffer.byteLength.toLocaleString()} bytes`);

// Binary CSV parser - fast Uint8Array parsing
function parseCsvBinary(data: Uint8Array): Record<string, string | number>[] {
  const decoder = new TextDecoder();
  const records: Record<string, string | number>[] = [];

  // Find header end
  let headerEnd = 0;
  while (headerEnd < data.length && data[headerEnd] !== 10) headerEnd++;

  // Parse header
  const headerLine = decoder.decode(data.subarray(0, headerEnd));
  const headers = headerLine.split(",").map(h => h.trim());

  // Parse rows
  let i = headerEnd + 1;
  while (i < data.length) {
    const record: Record<string, string | number> = {};

    for (let col = 0; col < headers.length && i < data.length; col++) {
      const start = i;

      // Find field end (comma or newline)
      while (i < data.length && data[i] !== 44 && data[i] !== 10 && data[i] !== 13) {
        i++;
      }

      const value = decoder.decode(data.subarray(start, i));
      const num = Number(value);
      record[headers[col]] = isNaN(num) || value === "" ? value : num;

      // Skip comma
      if (data[i] === 44) i++;
    }

    // Skip newline(s)
    while (i < data.length && (data[i] === 10 || data[i] === 13)) i++;

    if (Object.keys(record).length > 0) {
      records.push(record);
    }
  }

  return records;
}

// Fast native split parser
function parseCsvNative(content: string): Record<string, string>[] {
  const lines = content.split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(",");
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] || "";
    }
    return obj;
  });
}

group("File Read", () => {
  bench("Bun.file().text()", async () => {
    await Bun.file(csvPath).text();
  });

  bench("Bun.file().arrayBuffer()", async () => {
    await Bun.file(csvPath).arrayBuffer();
  });

  bench("fs.readFileSync (string)", () => {
    readFileSync(csvPath, "utf-8");
  });

  bench("fs.readFileSync (buffer)", () => {
    readFileSync(csvPath);
  });
});

group("CSV Parsing (from memory)", () => {
  bench("csv-parse/sync (string)", () => {
    parse(csvString, { columns: true, skip_empty_lines: true });
  });

  bench("native split (string)", () => {
    parseCsvNative(csvString);
  });

  bench("binary Uint8Array parser", () => {
    parseCsvBinary(csvBuffer);
  });
});

group("Full Pipeline: Read + Parse", () => {
  bench("Bun.file().text() + csv-parse", async () => {
    const csv = await Bun.file(csvPath).text();
    parse(csv, { columns: true });
  });

  bench("Bun.file().text() + native split", async () => {
    const csv = await Bun.file(csvPath).text();
    parseCsvNative(csv);
  });

  bench("Bun.file().arrayBuffer() + binary", async () => {
    const buf = await Bun.file(csvPath).arrayBuffer();
    parseCsvBinary(new Uint8Array(buf));
  });

  bench("fs.readFileSync + binary", () => {
    const buf = readFileSync(csvPath);
    parseCsvBinary(buf);
  });
});

await execute();

// Verify output
const testResult = parseCsvBinary(csvBuffer);
console.log(`\n✅ Binary parser produced ${testResult.length} records`);
console.log("Sample:", testResult[0]);
