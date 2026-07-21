declare const DEBUG: boolean;

export function probe(): string {
  if (DEBUG) {
    return 'DEBUG_PATH_MARKER';
  }
  return 'RELEASE_PATH_MARKER';
}

probe();
