#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/info — bun info
/**
 * Drop-in `bun info` with nullable-field fixes and safe `--registry` parsing.
 *
 *   bun tools/bun-info.ts react --json
 *   bun tools/bun-info.ts react dependencies
 *   bun tools/bun-info.ts react repository.url
 *   bun tools/bun-info.ts @factorywager/registry-client
 *   bun tools/bun-info.ts --registry http://127.0.0.1:3000 @factorywager/registry-client --json
 */
import {
  bunInfoField,
  fetchPackumentJson,
  parseBunInfoCli,
  runBunInfoPretty,
} from '../lib/registry/bun-info-field.ts';

let cli;
try {
  cli = parseBunInfoCli(process.argv.slice(2));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  console.error('');
  console.error('Examples:');
  console.error('  bun-info react --json');
  console.error('  bun-info react dependencies');
  console.error('  bun-info react repository.url');
  console.error('  bun-info @factorywager/registry-client');
  console.error('  bun-info --registry http://127.0.0.1:3000 @factorywager/registry-client --json');
  process.exit(1);
}

if (cli.json && !cli.property) {
  const meta = await fetchPackumentJson(cli.pkg, cli);
  console.log(JSON.stringify(meta, null, 2));
  process.exit(0);
}

if (!cli.property) {
  process.exit(await runBunInfoPretty(cli));
}

const out = await bunInfoField(cli.pkg, cli.property, cli);
if (!out.ok) {
  console.error(`error: ${out.error}`);
  process.exit(1);
}

if (cli.json) {
  try {
    console.log(JSON.stringify(JSON.parse(out.value), null, 2));
  } catch {
    console.log(JSON.stringify(out.value));
  }
} else {
  console.log(out.value);
}
