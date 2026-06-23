import type { EffectPlugin } from "../../../scripts/scan/transpiler/workflow-effects/plugin.ts";

let pingCount = 0;

export function resetPingCount(): void {
  pingCount = 0;
}

export function getPingCount(): number {
  return pingCount;
}

const PingEffect: EffectPlugin = {
  id: "ping",
  name: "Ping",
  description: "Test fixture — increments ping counter",
  async run() {
    pingCount++;
  },
};

export default PingEffect;