#!/usr/bin/env bun

const outdir = '/Users/nolarose/Projects/barbershop/dist';
const entrypoints = [
  '/Users/nolarose/Projects/barbershop/barbershop-dashboard.ts',
  '/Users/nolarose/Projects/barbershop/barber-server.ts',
  '/Users/nolarose/Projects/barbershop/barbershop-tickets.ts'
];

const result = await Bun.build({
  entrypoints,
  outdir,
  target: 'bun',
  sourcemap: 'none',
  metafile: true,
  minify: false
});

if (!result.success || !result.metafile) {
  console.error('[barbershop:meta] build failed');
  process.exit(1);
}

const metafilePath = `${outdir}/meta.json`;
await Bun.write(metafilePath, JSON.stringify(result.metafile, null, 2));

const inputCount = Object.keys(result.metafile.inputs).length;
const outputCount = Object.keys(result.metafile.outputs).length;
const outputBytes = Object.values(result.metafile.outputs).reduce((sum, item) => sum + item.bytes, 0);

console.log(`[barbershop:meta] inputs=${inputCount} outputs=${outputCount} totalBytes=${outputBytes}`);
console.log(`[barbershop:meta] wrote ${metafilePath}`);
