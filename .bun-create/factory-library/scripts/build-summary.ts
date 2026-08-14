// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
type Metafile = {
  inputs: Record<string, { bytes: number }>;
  outputs: Record<string, { bytes: number; entryPoint?: string }>;
};

const metafile = (await Bun.file('dist/metafile.json').json()) as Metafile;
const outputEntries = Object.entries(metafile.outputs);
const summary = {
  kind: 'build-summary',
  entry_points: outputEntries.filter(([, output]) => output.entryPoint).length,
  input_files: Object.keys(metafile.inputs).length,
  output_files: outputEntries.length,
  output_bytes: outputEntries.reduce((total, [, output]) => total + output.bytes, 0),
};

// One JSON line remains stable for pipes, CI parsers, and agent tooling.
console.log(JSON.stringify(summary));
