import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  AlertEffect,
  FixEffect,
  LogEffect,
  ReportEffect,
} from "./builtins/index.ts";
import type { EffectConfig, EffectContext, EffectPlugin } from "./plugin.ts";

export class EffectRegistry {
  private readonly plugins = new Map<string, EffectPlugin>();
  private readonly configs = new Map<string, EffectConfig>();

  constructor(registerBuiltins = true) {
    if (registerBuiltins) {
      this.register(LogEffect);
      this.register(AlertEffect);
      this.register(FixEffect);
      this.register(ReportEffect);
    }
  }

  register(plugin: EffectPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  configure(id: string, config: EffectConfig): void {
    this.configs.set(id, config);
  }

  configureAll(configs: Record<string, EffectConfig>): void {
    for (const [id, cfg] of Object.entries(configs)) {
      this.configure(id, cfg);
    }
  }

  list(): EffectPlugin[] {
    return [...this.plugins.values()];
  }

  getConfig(id: string): EffectConfig | undefined {
    return this.configs.get(id);
  }

  /** Built-in effects default off unless configured; log defaults on when unconfigured. */
  private resolveEnabled(id: string, plugin: EffectPlugin): boolean {
    const config = this.configs.get(id);
    if (config !== undefined) return config.enabled;
    if (id === "log") return true;
    return false;
  }

  async runAll(
    ctx: Omit<EffectContext, "options" | "deps"> & {
      options?: Record<string, unknown>;
      deps?: EffectContext["deps"];
    },
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [id, plugin] of this.plugins) {
      if (!this.resolveEnabled(id, plugin)) continue;

      const config = this.configs.get(id);
      const pluginCtx: EffectContext = {
        domain: ctx.domain,
        skillRoot: ctx.skillRoot,
        repo: ctx.repo,
        results: ctx.results,
        drift: ctx.drift,
        seedState: ctx.seedState,
        dryRun: ctx.dryRun,
        failOnSeverity: ctx.failOnSeverity,
        bun: ctx.bun,
        bunDrift: ctx.bunDrift,
        tls: ctx.tls,
        includeBunVersion: ctx.includeBunVersion,
        options: { ...config?.params, ...ctx.options },
        deps: { ...ctx.deps, tls: ctx.tls ?? ctx.deps?.tls },
      };

      if (plugin.condition && !plugin.condition(pluginCtx)) continue;

      promises.push(
        plugin.run(pluginCtx).catch((err) => {
          console.error(`[${ctx.domain}] effect ${id} failed:`, err);
        }),
      );
    }

    await Promise.all(promises);
  }

  async loadFromDirectory(dir: string): Promise<number> {
    const abs = resolve(dir);
    const glob = new Bun.Glob("*.ts");
    let loaded = 0;

    for await (const rel of glob.scan({ cwd: abs, absolute: false })) {
      if (rel.startsWith("_") || rel.endsWith(".test.ts")) continue;
      const file = join(abs, rel);
      const mod = await import(pathToFileURL(file).href) as {
        default?: EffectPlugin;
        plugin?: EffectPlugin;
      };
      const plugin = mod.default ?? mod.plugin;
      if (plugin?.id && typeof plugin.run === "function") {
        this.register(plugin);
        loaded++;
      }
    }

    return loaded;
  }
}