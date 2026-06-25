/**
 * useConfigStatusPoll
 * Poll /api/config/status and on integrity change dispatch config:updated + refresh theme CSS.
 * Integrates config HMR with the main dashboard when running `bun run dev` with --hot.
 */

import { useEffect, useRef } from "react";

const POLL_MS = 15_000;

export function useConfigStatusPoll(): void {
  const lastIntegrity = useRef<string | null>(null);
  const reloadCount = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const poll = async () => {
      try {
        const res = await fetch("/api/config/status");
        if (!res.ok) return;
        const data = (await res.json()) as { integrity?: string };
        const integrity = data.integrity ?? null;
        if (integrity == null) return;

        if (lastIntegrity.current !== null && lastIntegrity.current !== integrity) {
          reloadCount.current += 1;
          window.dispatchEvent(
            new CustomEvent("config:updated", {
              detail: { reloadCount: reloadCount.current },
            }),
          );
          const link = document.getElementById("themes-css") as HTMLLinkElement | null;
          if (link) link.href = `/themes.css?t=${Date.now()}`;
        }
        lastIntegrity.current = integrity;
      } catch {
        /* ignore */
      }
    };

    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, []);
}
