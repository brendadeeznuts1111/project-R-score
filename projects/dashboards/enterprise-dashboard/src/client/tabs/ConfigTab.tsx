import React, { useState, useEffect, useMemo, useCallback } from "react";
import { showGlobalToast } from "../hooks/useToast";
import { useConfigs, useValidation, useRepoInfo } from "./config/hooks";
import { ConfigEditor, ValidationPanel, RepoInfo } from "./config/components";
import type { ConfigFile } from "./config/types";

// Keyboard shortcuts definition
const SHORTCUTS = [
  { key: "c", description: "Copy config to clipboard", modifier: false },
  { key: "g", description: "Open in GitHub", modifier: false },
  { key: "r", description: "Reload configs", modifier: false },
  { key: "1-9", description: "Switch to config tab", modifier: false },
  { key: "j/k", description: "Next/Previous config", modifier: false },
  { key: "?", description: "Toggle shortcuts help", modifier: false },
  { key: "Esc", description: "Close shortcuts panel", modifier: false },
] as const;

export function ConfigTab() {
  const [activeConfig, setActiveConfig] = useState<string>("fetch-preconnect");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Hooks
  const { configs, loading, error, loadConfigs, reloadConfigs } = useConfigs(activeConfig, setActiveConfig);
  const { validating, validationResults, validateAllConfigs, validateCurrentConfig } = useValidation();
  const { repoInfo, loadRepoInfo } = useRepoInfo();

  // Load data on mount
  useEffect(() => {
    loadRepoInfo();
    loadConfigs();
  }, []);

  // Memoize current config lookup
  const currentConfig = useMemo(
    () => configs.find((c) => c.name === activeConfig),
    [configs, activeConfig]
  );

  // Callbacks
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showGlobalToast("Copied to clipboard", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showGlobalToast(`Failed to copy: ${errorMessage}`, "error");
      console.error("Clipboard error:", error);
    }
  }, []);

  const copyGitHubUrl = useCallback(async (path: string) => {
    const url = `${repoInfo.repoUrl}/blob/${repoInfo.branch}/${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(path);
      showGlobalToast("GitHub URL copied to clipboard", "success");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showGlobalToast(`Failed to copy URL: ${errorMessage}`, "error");
      console.error("URL copy error:", error);
    }
  }, [repoInfo.repoUrl, repoInfo.branch]);

  const getGitHubUrl = useCallback((path: string): string => {
    return `${repoInfo.repoUrl}/blob/${repoInfo.branch}/${path}`;
  }, [repoInfo.repoUrl, repoInfo.branch]);

  const openInGitHub = useCallback((path: string) => {
    try {
      const url = `${repoInfo.repoUrl}/blob/${repoInfo.branch}/${path}`;
      const newWindow = window.open(url, "_blank");
      if (!newWindow) {
        showGlobalToast("Popup blocked. Please allow popups for this site.", "error");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showGlobalToast(`Failed to open GitHub: ${errorMessage}`, "error");
      console.error("GitHub open error:", error);
    }
  }, [repoInfo.repoUrl, repoInfo.branch]);

  // Validation handlers
  const handleValidateAll = useCallback(() => {
    validateAllConfigs(configs);
  }, [validateAllConfigs, configs]);

  const handleValidateCurrent = useCallback(() => {
    validateCurrentConfig(configs, activeConfig);
  }, [validateCurrentConfig, configs, activeConfig]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentConfig = configs.find((c) => c.name === activeConfig);
      const configIndex = configs.findIndex((c) => c.name === activeConfig);

      switch (e.key.toLowerCase()) {
        case "c":
          if (currentConfig) {
            copyToClipboard(currentConfig.content);
          }
          break;

        case "g":
          if (currentConfig) {
            openInGitHub(currentConfig.path);
          }
          break;

        case "r":
          reloadConfigs();
          break;

        case "v":
          handleValidateCurrent();
          break;

        case "j": // Next config
          if (configs.length > 0 && configIndex < configs.length - 1) {
            setActiveConfig(configs[configIndex + 1].name);
          }
          break;

        case "k": // Previous config
          if (configs.length > 0 && configIndex > 0) {
            setActiveConfig(configs[configIndex - 1].name);
          }
          break;

        case "?":
          setShowShortcuts((prev) => !prev);
          break;

        case "escape":
          setShowShortcuts(false);
          break;

        default:
          // Number keys 1-9 for tab switching
          if (/^[1-9]$/.test(e.key)) {
            const index = parseInt(e.key) - 1;
            if (index < configs.length) {
              setActiveConfig(configs[index].name);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [configs, activeConfig, copyToClipboard, openInGitHub, reloadConfigs, handleValidateCurrent]);

  // Loading state
  if (loading) {
    return (
      <section className="tab-content">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="tab-content">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={loadConfigs}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tab-content">
      {/* Header */}
      <RepoInfo repoInfo={repoInfo} />

      {/* Config Tabs and Validation Panel */}
      <ValidationPanel
        configs={configs}
        activeConfig={activeConfig}
        validating={validating}
        validationResults={validationResults}
        onValidateAll={handleValidateAll}
        onValidateCurrent={handleValidateCurrent}
        onReload={reloadConfigs}
        onTabChange={setActiveConfig}
      />

      {/* Config Content */}
      {currentConfig && (
        <ConfigEditor
          config={currentConfig}
          onCopy={copyToClipboard}
          onCopyUrl={copyGitHubUrl}
          onOpenGitHub={openInGitHub}
          getGitHubUrl={getGitHubUrl}
          copiedUrl={copiedUrl}
        />
      )}

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <a
          href={`${repoInfo.repoUrl}/blob/${repoInfo.branch}/examples/50-col-matrix.ts`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-theme-secondary rounded-xl border border-theme hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-theme-primary">50-Col Matrix</div>
              <div className="text-xs text-theme-secondary">Bun.inspect.table demo</div>
            </div>
          </div>
        </a>

        <a
          href={`${repoInfo.repoUrl}/blob/${repoInfo.branch}/src/server/startup-optimizations.ts`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-theme-secondary rounded-xl border border-theme hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-theme-primary">Startup Optimizations</div>
              <div className="text-xs text-theme-secondary">startup-optimizations.ts</div>
            </div>
          </div>
        </a>

        <a
          href={`${repoInfo.repoUrl}/blob/${repoInfo.branch}/src/server/config.ts`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-theme-secondary rounded-xl border border-theme hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-theme-primary">Server Config</div>
              <div className="text-xs text-theme-secondary">config.ts</div>
            </div>
          </div>
        </a>

        <a
          href={`${repoInfo.repoUrl}/tree/${repoInfo.branch}/scripts/bench`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-theme-secondary rounded-xl border border-theme hover:border-green-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-theme-primary">Benchmark Scripts</div>
              <div className="text-xs text-theme-secondary">scripts/bench/</div>
            </div>
          </div>
        </a>
      </div>

      {/* Keyboard Shortcuts Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-theme-secondary">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">c</kbd>
            <span>Copy</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">g</kbd>
            <span>GitHub</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">r</kbd>
            <span>Reload</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">j</kbd>
            <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">k</kbd>
            <span>Navigate</span>
          </span>
        </div>
        <button
          onClick={() => setShowShortcuts(true)}
          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors"
        >
          <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">?</kbd>
          <span>All shortcuts</span>
        </button>
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-theme-secondary rounded-xl border border-theme p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-theme-primary">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 hover:bg-theme-tertiary rounded transition-colors"
              >
                <svg className="w-5 h-5 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-theme-secondary text-sm">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-theme-tertiary rounded text-xs font-mono text-theme-primary">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-theme">
              <p className="text-xs text-theme-secondary text-center">
                Press <kbd className="px-1.5 py-0.5 bg-theme-tertiary rounded text-[10px] font-mono">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
