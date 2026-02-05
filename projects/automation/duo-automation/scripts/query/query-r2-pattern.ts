#!/usr/bin/env bun
// query-r2-pattern.ts - URLPattern R2 QUERY (List + Classify + CLI Filter + Table)

import { config } from 'dotenv';
config({ path: '../../.env' });

import { createBunAWSClient } from '../../utils/bun-aws-client';
import { R2_PATTERNS, classifyPath } from '../../utils/urlpattern-r2';
import { parseCliFilters, filterData } from '../../utils/cli-filter';
import { superTableCli } from '../../utils/super-table';
import { BunR2AppleManager } from '../../src/storage/r2-apple-manager';
import { DuoPlusSDK } from '../../sdk/duoplus-sdk';
import { parseQueryOpts } from '../../utils/query-opts';

interface R2Object { Key: string; Size: number; LastModified: string; }

async function queryR2ByPattern(cliArgs: string[] = []) {
  const opts = parseQueryOpts(cliArgs);
  
  // Helper for console alignment
  // @ts-ignore
  const pad = (label: string, value: unknown, target = 12) => {
    const labelWidth = label.length;
    return `${label}${' '.repeat(Math.max(0, target - labelWidth))}${value}`;
  };

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 **R2 Pattern Query Engine (SUPER)**`);
  console.log(`${'═'.repeat(60)}`);
  console.log(pad('📦 BUCKET:', opts.bucket));
  console.log(pad('📁 PREFIX:', opts.prefix));
  console.log(pad('🔢 LIMIT:', opts.limit));
  console.log(pad('📊 FORMAT:', opts.format.toUpperCase()));
  
  const activeFilters = cliArgs.filter(a => a.includes('=') && !a.startsWith('--'));
  if (activeFilters.length > 0) {
    console.log(`🔧 FILTERS: ${activeFilters.join(', ')}`);
  }
  
  if (opts.minSize || opts.maxSize) console.log(`📏 SIZE:    ${opts.minSize || 0}B - ${opts.maxSize || '∞'}B`);
  if (opts.since || opts.until) console.log(`📅 RANGE:   ${opts.since || 'beginning'} ➔ ${opts.until || 'now'}`);
  console.log(`${'─'.repeat(60)}`);
  
  const startList = Bun.nanoseconds();
  
  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: Bun.env.S3_ENDPOINT || 'https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: Bun.env.S3_ACCESS_KEY_ID || '7b167456269e76046373ee13534df847',
        secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY || '2c5327753e3fa278a9274e1f1369498fa713d3acb18326bb2a97d16818ee5507'
      }
    });
    
    const listCommand = new ListObjectsV2Command({
      Bucket: opts.bucket,
      Prefix: opts.prefix,
      MaxKeys: opts.limit
    });
    
    const response = await s3Client.send(listCommand);
    let objects: R2Object[] = (response.Contents || []).map(obj => ({
      Key: obj.Key || '',
      Size: obj.Size || 0,
      LastModified: obj.LastModified?.toISOString() || new Date().toISOString()
    }));
    
    console.log(`📡 R2 Fetch: Found ${objects.length} total objects`);

    // Extended filters (Size and Date)
    if (opts.minSize !== undefined || opts.maxSize !== undefined || opts.since || opts.until) {
      const beforeFilter = objects.length;
      objects = objects.filter(obj => {
        if (opts.minSize !== undefined && obj.Size < opts.minSize) return false;
        if (opts.maxSize !== undefined && obj.Size > opts.maxSize) return false;
        
        if (opts.since || opts.until) {
          const date = new Date(obj.LastModified).getTime();
          if (opts.since && date < new Date(opts.since).getTime()) return false;
          if (opts.until && date > new Date(opts.until).getTime()) return false;
        }
        return true;
      });
      console.log(`🎯 Post-List Filter (Size/Date): ${beforeFilter} ➔ ${objects.length}`);
    }
    
    // Classify each Key and download JSON content for filtering with Concurrency Limit
    const classifyStart = Bun.nanoseconds();
    const CONCURRENCY_LIMIT = 20;
    const classified: any[] = [];
    
    for (let i = 0; i < objects.length; i += CONCURRENCY_LIMIT) {
      const chunk = objects.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.all(chunk.map(async (obj) => {
        let parsedData = null;
        
        // Download and parse JSON files for filtering
        if (obj.Key.includes('.json')) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: opts.bucket,
              Key: obj.Key
            });
            const response = await s3Client.send(getCommand);
            if (!response.Body) {
              throw new Error('Response body is undefined');
            }
            const buffer = await response.Body.transformToByteArray();
            
            // Handle compression (Zstandard magic bytes: 28 b5 2f fd)
            let body;
            if (buffer[0] === 0x28 && buffer[1] === 0xb5 && buffer[2] === 0x2f && buffer[3] === 0xfd) {
              try {
                const decompressed = Bun.zstdDecompressSync(buffer);
                body = new TextDecoder('utf-8').decode(decompressed);
              } catch (zstdError) {
                console.warn(`⚠️ Zstd decompression failed for ${obj.Key}, trying raw: ${zstdError instanceof Error ? zstdError.message : String(zstdError)}`);
                body = new TextDecoder('utf-8').decode(buffer);
              }
            } else {
              try {
                body = new TextDecoder('utf-8').decode(buffer);
                JSON.parse(body);
              } catch {
                body = new TextDecoder('utf-8').decode(buffer);
              }
            }
            parsedData = JSON.parse(body);
          } catch (error) {
            parsedData = {};
          }
        }
        
        return {
          ...obj,
          classification: classifyPath(obj.Key),
          parsedData
        };
      }));
      classified.push(...results);
      if (objects.length > CONCURRENCY_LIMIT) {
        process.stdout.write(`\r📡 Classifying: ${Math.min(i + CONCURRENCY_LIMIT, objects.length)}/${objects.length}...`);
      }
    }
    if (objects.length > CONCURRENCY_LIMIT) console.log(' Done.');

    const classifyTime = (Bun.nanoseconds() - classifyStart) / 1e6;

    // Pattern Filter (optional)
    let filtered = classified;
    const patternArg = cliArgs.find(a => a.startsWith('--pattern='))?.split('=')[1];
    if (patternArg !== undefined && patternArg !== '-1') {
      const patternIdx = parseInt(patternArg);
      const targetPattern = `PATTERN_${patternIdx + 1}`;
      filtered = classified.filter(item => item.classification?.pattern === targetPattern);
      console.log(`🎯 Pattern Filter: ${targetPattern} (${filtered.length} matches)`);
    }

    // CLI Filter (success=true country=US on parsedData)
    const filters = parseCliFilters(cliArgs);
    if (Object.keys(filters).length > 0) {
      const beforeFilter = filtered.length;
      filtered = filterData(filtered, filters);
      console.log(`🔧 CLI filters applied: ${beforeFilter} → ${filtered.length}`);
    }

    // Performance Summary
    const totalTime = (Bun.nanoseconds() - startList) / 1e6;
    console.log(`\n📈 **Performance Summary**`);
    console.log(`📊 Query Summary: ${objects.length} → ${filtered.length} (${totalTime.toFixed(0)}ms total)`);
    console.log(`  List: ${((classifyStart - startList) / 1e6).toFixed(0)}ms | Classify: ${classifyTime.toFixed(0)}ms | Throughput: ${(objects.length / (classifyTime / 1000)).toFixed(0)} objs/s`);

    // Output by format
    if (opts.format === 'table') {
      console.log(`\n📊 **Query Results (Table)**`);
      superTableCli(filtered, cliArgs);
    } else if (opts.format === 'csv') {
      // Dynamic CSV headers
      const allKeys = new Set(['Key', 'Size', 'LastModified', 'pattern']);
      filtered.forEach(f => {
        if (f.parsedData) {
          Object.keys(f.parsedData).forEach(k => allKeys.add(k));
        }
      });
      const headers = Array.from(allKeys);
      
      const rows = filtered.map(f => {
        return headers.map(h => {
          if (h === 'Key') return f.Key;
          if (h === 'Size') return f.Size;
          if (h === 'LastModified') return f.LastModified;
          if (h === 'pattern') return f.classification?.pattern || 'null';
          return f.parsedData?.[h] ?? 'N/A';
        }).join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const csvPath = 'query-results.csv';
      await Bun.write(csvPath, csv);
      console.log(`\n💾 Exported CSV to: ${csvPath} (${headers.length} columns)`);
    } else if (opts.format === 'json') {
      await Bun.write(opts.jsonOut, JSON.stringify(filtered, null, 2));
      console.log(`\n💾 Exported JSON to: ${opts.jsonOut}`);
    }

    // DuoPlus RPA integration
    if (filtered.length > 0) {
      const sdk = new DuoPlusSDK('https://api.duoplus.com', Bun.env.DUOPLUS_API_KEY || 'demo-key');
      await sdk.createRPATask({
        type: 'r2-query-process',
        metadata: { 
          queryCount: filtered.length, 
          prefix: opts.prefix,
          filters,
          totalTimeMs: totalTime
        }
      });
      console.log(`🤖 **DuoPlus RPA Task Created** (${filtered.length} items)`);
    }

    return filtered;
    
  } catch (error: any) {
    console.error(`❌ Query failed: ${error.message}`);
    return [];
  }
}

if (Bun.main === import.meta.path) {
  await queryR2ByPattern(Bun.argv);
}
