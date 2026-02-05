/**
 * CLI Tools Tab
 * Interactive interface for /analyze, /diagnose, and /! commands
 */

import React, { useState, useEffect } from "react";
import { showGlobalToast } from "../hooks/useToast";

interface CLIResponse {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  command?: string;
  args?: string[];
}

export function CLIToolsTab() {
  const [activeTool, setActiveTool] = useState<"analyze" | "diagnose" | "bang">("analyze");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [output, setOutput] = useState<CLIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableCommands, setAvailableCommands] = useState<any>(null);

  // Listen for tool selection from shortcuts
  useEffect(() => {
    const handleToolSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail && ["analyze", "diagnose", "bang"].includes(customEvent.detail)) {
        setActiveTool(customEvent.detail as "analyze" | "diagnose" | "bang");
        setCommand("");
        setArgs("");
        setOutput(null);
      }
    };

    window.addEventListener("cli-tool-select", handleToolSelect);
    return () => window.removeEventListener("cli-tool-select", handleToolSelect);
  }, []);

  // Load available commands on mount
  useEffect(() => {
    fetch("/api/cli/commands")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setAvailableCommands(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const executeCommand = async () => {
    if (!command.trim()) {
      showGlobalToast("Please enter a command", "error");
      return;
    }

    setLoading(true);
    setOutput(null);

    try {
      const endpoint = `/api/cli/${activeTool}`;
      const body: any = { command };

      // Parse args
      if (args.trim()) {
        const parsedArgs = args.split(" ").filter(Boolean);
        if (activeTool === "bang") {
          body.action = command;
          body.args = parsedArgs;
        } else {
          // Parse key=value args for analyze/diagnose
          parsedArgs.forEach((arg) => {
            if (arg.includes("=")) {
              const [key, value] = arg.split("=");
              body[key] = value;
            } else if (arg.startsWith("--")) {
              const key = arg.slice(2);
              body[key] = true;
            }
          });
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.data) {
        setOutput(data.data);
        if (data.data.success) {
          showGlobalToast("Command executed successfully", "success");
        } else {
          showGlobalToast(`Command failed: ${data.data.error || "Unknown error"}`, "error");
        }
      } else {
        showGlobalToast("Failed to execute command", "error");
      }
    } catch (error) {
      showGlobalToast(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const getToolCommands = () => {
    if (!availableCommands) return [];
    switch (activeTool) {
      case "analyze":
        return availableCommands.analyze?.commands || [];
      case "diagnose":
        return availableCommands.diagnose?.commands || [];
      case "bang":
        return availableCommands.bang?.actions || [];
      default:
        return [];
    }
  };

  const getToolDescription = () => {
    if (!availableCommands) return "";
    switch (activeTool) {
      case "analyze":
        return availableCommands.analyze?.description || "";
      case "diagnose":
        return availableCommands.diagnose?.description || "";
      case "bang":
        return availableCommands.bang?.description || "";
      default:
        return "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-theme">CLI Tools</h2>
          <p className="text-sm text-theme-muted mt-1">
            Execute code analysis, health diagnostics, and quick actions
          </p>
        </div>
      </div>

      {/* Tool Selector */}
      <div className="flex gap-2 border-b border-theme pb-4">
        {(["analyze", "diagnose", "bang"] as const).map((tool) => (
          <button
            key={tool}
            onClick={() => {
              setActiveTool(tool);
              setCommand("");
              setArgs("");
              setOutput(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTool === tool
                ? "bg-blue-500 text-white"
                : "bg-theme-tertiary text-theme-secondary hover:bg-theme-secondary"
            }`}
          >
            {tool === "bang" ? "!" : tool}
          </button>
        ))}
      </div>

      {/* Tool Info */}
      <div className="bg-theme-tertiary rounded-lg p-4">
        <h3 className="font-semibold text-theme mb-2 capitalize">{activeTool}</h3>
        <p className="text-sm text-theme-muted">{getToolDescription()}</p>
        <div className="mt-3">
          <span className="text-xs text-theme-muted">Available commands: </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {getToolCommands().map((cmd: string | { name: string; aliases?: string[]; description: string }, idx: number) => {
              const name = typeof cmd === "string" ? cmd : cmd.name;
              const aliases = typeof cmd === "string" ? [] : cmd.aliases || [];
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setCommand(name);
                    if (activeTool === "bang" && typeof cmd !== "string") {
                      setArgs(aliases.length > 0 ? aliases[0] : "");
                    }
                  }}
                  className="px-2 py-1 text-xs bg-theme-secondary rounded hover:bg-blue-500 hover:text-white transition-colors"
                  title={typeof cmd === "string" ? "" : cmd.description}
                >
                  {name}
                  {aliases.length > 0 && ` (${aliases.join(", ")})`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Command Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-theme mb-2">
            Command {activeTool === "bang" ? "(action)" : ""}
          </label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={
              activeTool === "bang"
                ? "e.g., health, test, dev"
                : activeTool === "analyze"
                ? "e.g., scan, types, classes"
                : "e.g., health, painpoints, grade"
            }
            className="w-full px-4 py-2 bg-theme-secondary border border-theme rounded-lg text-theme focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                executeCommand();
              }
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-theme mb-2">
            Arguments (optional)
          </label>
          <input
            type="text"
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            placeholder={
              activeTool === "bang"
                ? "e.g., --latest=5"
                : activeTool === "analyze"
                ? "e.g., src/ --depth=3 --format=json"
                : "e.g., --top=5 --format=json"
            }
            className="w-full px-4 py-2 bg-theme-secondary border border-theme rounded-lg text-theme focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                executeCommand();
              }
            }}
          />
        </div>

        <button
          onClick={executeCommand}
          disabled={loading || !command.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Executing..." : "Execute"}
        </button>
      </div>

      {/* Output */}
      {output && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-theme">Output</h3>
            <div className="flex items-center gap-4 text-xs text-theme-muted">
              <span className={output.success ? "text-green-500" : "text-red-500"}>
                {output.success ? "✓ Success" : "✗ Failed"}
              </span>
              <span>Exit: {output.exitCode}</span>
              <span>{output.duration}ms</span>
            </div>
          </div>
          <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
            <pre className="text-sm text-theme font-mono whitespace-pre-wrap overflow-x-auto">
              {output.output || output.error || "No output"}
            </pre>
          </div>
          {output.error && (
            <div className="mt-2 text-sm text-red-500">
              <strong>Error:</strong> {output.error}
            </div>
          )}
        </div>
      )}

      {/* Quick Examples */}
      <div className="mt-8 border-t border-theme pt-6">
        <h3 className="font-semibold text-theme mb-4">Quick Examples</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTool === "analyze" && (
            <>
              <ExampleCard
                title="Scan Codebase"
                command="scan"
                args="src/ --depth=3"
                onClick={() => {
                  setCommand("scan");
                  setArgs("src/ --depth=3");
                }}
              />
              <ExampleCard
                title="List Types"
                command="types"
                args="--exported-only"
                onClick={() => {
                  setCommand("types");
                  setArgs("--exported-only");
                }}
              />
              <ExampleCard
                title="Find Classes"
                command="classes"
                args="--inheritance"
                onClick={() => {
                  setCommand("classes");
                  setArgs("--inheritance");
                }}
              />
            </>
          )}
          {activeTool === "diagnose" && (
            <>
              <ExampleCard
                title="Health Check"
                command="health"
                args="--quick"
                onClick={() => {
                  setCommand("health");
                  setArgs("--quick");
                }}
              />
              <ExampleCard
                title="Top Painpoints"
                command="painpoints"
                args="--top=5"
                onClick={() => {
                  setCommand("painpoints");
                  setArgs("--top=5");
                }}
              />
              <ExampleCard
                title="Project Grade"
                command="grade"
                args="--all"
                onClick={() => {
                  setCommand("grade");
                  setArgs("--all");
                }}
              />
            </>
          )}
          {activeTool === "bang" && (
            <>
              <ExampleCard
                title="Health Check"
                command="health"
                onClick={() => {
                  setCommand("health");
                  setArgs("");
                }}
              />
              <ExampleCard
                title="Run Tests"
                command="test"
                onClick={() => {
                  setCommand("test");
                  setArgs("");
                }}
              />
              <ExampleCard
                title="Bun News"
                command="news"
                args="--latest=5"
                onClick={() => {
                  setCommand("news");
                  setArgs("--latest=5");
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleCard({
  title,
  command,
  args = "",
  onClick,
}: {
  title: string;
  command: string;
  args?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 bg-theme-tertiary rounded-lg hover:bg-theme-secondary transition-colors border border-theme hover:border-blue-500"
    >
      <div className="font-semibold text-theme mb-1">{title}</div>
      <div className="text-xs font-mono text-theme-muted">
        <div>{command}</div>
        {args && <div className="mt-1">{args}</div>}
      </div>
    </button>
  );
}