/**
 * 🔒 Safe Filename Utility - Sanitizes filenames for cross-platform compatibility
 * 
 * Features:
 * - Removes invalid characters
 * - Collapses multiple separators
 * - Handles Unicode characters
 * - Enforces length limits
 * - Preserves file extensions
 */

export function safeFilename(input: string, maxLength = 255): string {
  if (!input || typeof input !== 'string') {
    return 'untitled';
  }

  let clean = input.trim();

  // Remove or replace invalid characters (Windows, Unix, macOS compatibility)
  clean = clean.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

  // Replace multiple spaces/hyphens/underscores into single hyphen
  clean = clean.replace(/[\s\-_]+/g, '-').replace(/-+/g, '-');

  // Trim leading/trailing dots and hyphens
  clean = clean.replace(/^[\-\.]+|[\-\.]+$/g, '');

  // Handle empty result after cleaning
  if (!clean) {
    return 'untitled';
  }

  // Ensure valid length (reserve space for extension if present)
  const lastDot = clean.lastIndexOf('.');
  const name = lastDot > 0 ? clean.substring(0, lastDot) : clean;
  const extension = lastDot > 0 ? clean.substring(lastDot) : '';
  
  const maxNameLength = maxLength - extension.length;
  if (name.length > maxNameLength) {
    return name.substring(0, maxNameLength) + extension;
  }

  return clean;
}

export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  return path
    .split(/[\/\\]/)
    .map(segment => safeFilename(segment))
    .filter(Boolean)
    .join('/');
}

export function isValidFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for invalid characters
  if (/[<>:"/\\|?*\x00-\x1f]/.test(filename)) {
    return false;
  }

  // Check reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameWithoutExt = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return false;
  }

  // Check length
  if (filename.length > 255) {
    return false;
  }

  return true;
}
