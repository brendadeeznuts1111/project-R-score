// src/build/analyzer-url.ts
// esbuild analyzer URL helper for interactive treemap visualization
import type { BuildMetafile } from './types';

export const ESBUILD_ANALYZER_URL = 'https://esbuild.github.io/analyze/';

export function getAnalyzerUrl(metafile: BuildMetafile): string {
  return ESBUILD_ANALYZER_URL;
}

export async function saveForAnalyzer(
  metafile: BuildMetafile,
  outputPath: string,
): Promise<{ filePath: string; analyzerUrl: string; instructions: string }> {
  const json = JSON.stringify(metafile, null, 2);
  await Bun.write(outputPath, json);

  const instructions = [
    `Metafile saved to: ${outputPath}`,
    `Open ${ESBUILD_ANALYZER_URL} in your browser`,
    `Upload ${outputPath} to visualize your bundle as an interactive treemap`,
  ].join('\n');

  return { filePath: outputPath, analyzerUrl: ESBUILD_ANALYZER_URL, instructions };
}
