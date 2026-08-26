import { asReleaseAssetId } from '../../lib/types/branded.ts';
import { validateMp4Container } from './media-validation.ts';

export const PALETTE_VIDEO_PATH = 'public/portal/bun-1.4/media/factorywager-bun-color-palette.mp4';
export const PALETTE_POSTER_PATH = 'public/portal/bun-1.4/media/factorywager-bun-color-palette.png';
export const PALETTE_REGISTRY_PATH = 'public/registry/bun-1.4-project-media.json';

export type ProjectMediaRegistry = {
  schemaVersion: number;
  publisher?: { name?: string };
  media?: Array<{
    id?: string; // brand-ok — untrusted registry field checked against the branded literal below
    videoSha256?: string;
    posterSha256?: string;
  }>;
};

export function validatePaletteVideo(videoBytes: Uint8Array): void {
  validateMp4Container(
    {
      id: asReleaseAssetId('factorywager-bun-color-palette'),
      kind: 'video',
      sourceUrl: 'https://bun.com/docs/runtime/color',
      alt: 'FactoryWager Bun.color palette proof',
      section: 'Repository-generated proofs',
      width: 960,
      height: 540,
      lazyLoad: true,
    },
    videoBytes
  );
}

export function paletteFfmpegArgs(ffmpeg: string, scratch: string, fps: number): string[] {
  return [
    ffmpeg,
    '-hide_banner',
    '-loglevel',
    'error',
    '-framerate',
    String(fps),
    '-i',
    `${scratch}/frame-%03d.png`,
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-y',
    PALETTE_VIDEO_PATH,
  ];
}

export function paletteRegistry(input: {
  generatedAt: string;
  bunVersion: string;
  bunRevision: string;
  ffmpegVersion: string;
  fps: number;
  frameCount: number;
  videoBytes: number;
  videoSha256: string;
  posterBytes: number;
  posterSha256: string;
  posterFormat: string;
}): object {
  return {
    schemaVersion: 1,
    publisher: { name: 'FactoryWager', url: 'https://score.factory-wager.com/' },
    sourceApi: 'Bun.color',
    sourceDocs: 'https://bun.com/docs/runtime/color',
    generatedAt: input.generatedAt,
    runtime: {
      bunVersion: input.bunVersion,
      bunRevision: input.bunRevision,
      ffmpeg: input.ffmpegVersion,
    },
    rights: 'FactoryWager-generated proof; contains no Bun blog or press-kit media.',
    media: [
      {
        id: 'factorywager-bun-color-palette',
        title: 'Bun.color palette proof',
        description: 'Deterministic six-format palette clip captured with Bun.WebView.',
        videoUrl: `/${PALETTE_VIDEO_PATH.replace('public/', '')}`,
        posterUrl: `/${PALETTE_POSTER_PATH.replace('public/', '')}`,
        width: 960,
        height: 540,
        fps: input.fps,
        durationSeconds: input.frameCount / input.fps,
        videoBytes: input.videoBytes,
        videoSha256: input.videoSha256,
        posterBytes: input.posterBytes,
        posterSha256: input.posterSha256,
        posterFormat: input.posterFormat,
      },
    ],
  };
}
