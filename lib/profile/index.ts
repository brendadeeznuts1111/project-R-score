/**
 * Profile Module
 *
 * Per-terminal-session profile management with R2 auto-upload.
 * Handles Bun v1.3.7+ --cpu-prof-md and --heap-prof-md outputs.
 */

export {
  ProfileSessionUploader,
  resolveUploaderConfig,
  type TerminalIdentity,
  type ProfileEntry,
  type SessionManifest,
  type ProfileUploaderConfig,
} from './session-uploader';

export { type ProfileType } from '../core/fw-types';
