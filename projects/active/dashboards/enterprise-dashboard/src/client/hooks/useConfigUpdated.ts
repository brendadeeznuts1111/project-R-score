/**
 * useConfigUpdated
 * Subscribe to config:updated (HMR) and refresh theme/config when config dev-server reloads.
 *
 * Use with config dev-server (bun run dev:config) or when the client runs with HMR
 * and imports the config module.
 */

import { useEffect } from "react";

export interface ConfigUpdatedDetail {
  reloadCount: number;
}

export type ConfigUpdatedHandler = (detail: ConfigUpdatedDetail) => void;

/**
 * Listen for config:updated events (e.g. from config HMR dev-server).
 * Call onUpdate when config is reloaded so you can refresh theme/shortcuts.
 */
export function useConfigUpdated(onUpdate?: ConfigUpdatedHandler): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handle = (e: Event) => {
      const detail = (e as CustomEvent<ConfigUpdatedDetail>).detail;
      onUpdate?.(detail ?? { reloadCount: 0 });
    };

    window.addEventListener("config:updated", handle);
    return () => window.removeEventListener("config:updated", handle);
  }, [onUpdate]);
}
