#!/usr/bin/env bun
/**
 * Plugin System for Kimi Shell Bridge
 * 
 * Allows extending MCP tools with custom plugins
 */

import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PLUGIN_DIR = join(homedir(), ".kimi", "plugins");

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  tools: PluginTool[];
  hooks?: {
    onInit?: () => Promise<void>;
    onShutdown?: () => Promise<void>;
  };
}

export interface PluginTool {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private tools = new Map<string, PluginTool>();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    for (const tool of plugin.tools) {
      this.tools.set(`${plugin.name}/${tool.name}`, tool);
    }
    if (plugin.hooks?.onInit) {
      plugin.hooks.onInit();
    }
  }

  getTool(name: string): PluginTool | undefined {
    return this.tools.get(name);
  }

  list(): Array<{ name: string; version: string; tools: number }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      tools: p.tools.length,
    }));
  }
}

// Example plugin
const examplePlugin: Plugin = {
  name: "example",
  version: "1.0.0",
  description: "Example plugin",
  tools: [{
    name: "hello",
    description: "Say hello",
    parameters: [{ name: "name", type: "string", description: "Name", required: true }],
    handler: async (args) => ({ message: `Hello, ${args.name}!` }),
  }],
};

async function main(): Promise<void> {
  const registry = new PluginRegistry();
  registry.register(examplePlugin);
  
  console.log("🔌 Plugin System Demo\n");
  console.log("Plugins:", registry.list());
  
  const tool = registry.getTool("example/hello");
  if (tool) {
    const result = await tool.handler({ name: "World" });
    console.log("Result:", result);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { PluginRegistry };
