#!/usr/bin/env bun
// dashboards/analytics/token-management-dashboard.ts
import { serve } from "bun";
import { readFileSync, writeFileSync } from "fs";

interface TokenInfo {
  team: string;
  token: string;
  status: "active" | "revoked" | "expired";
  lastUsed: string;
}

class TokenManagementDashboard {
  private tokens: TokenInfo[] = [
    { team: "Team A", token: process.env.TEAM_A_TOKEN || "********", status: "active", lastUsed: new Date().toISOString() },
    { team: "Team B", token: process.env.TEAM_B_TOKEN || "********", status: "active", lastUsed: new Date().toISOString() },
  ];

  generateHTML() {
    const tokensList = this.tokens.map((t, i) => `
            <div class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex items-center justify-between hover:border-blue-500/50 transition group">
                <div class="flex items-center space-x-6">
                    <div class="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-bold text-blue-400 border border-slate-700">
                        ${t.team[0]}
                    </div>
                    <div>
                        <h3 class="text-xl font-bold">${t.team}</h3>
                        <p class="text-slate-500 font-mono text-xs mt-1">Last used: ${new Date(t.lastUsed).toLocaleString()}</p>
                    </div>
                </div>
                
                <div class="flex items-center space-x-8">
                    <div class="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 font-mono text-sm text-slate-400">
                        ${t.status === 'active' ? '••••••••••••••••' : t.token}
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${t.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">
                            ${t.status.toUpperCase()}
                        </span>
                    </div>

                    <div class="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                        <button class="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
                            👁️
                        </button>
                        <button class="p-2 hover:bg-red-900/40 rounded-lg text-slate-400 hover:text-red-400 transition">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
            `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🔑 Token Management Hub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .token-gradient { background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%); }
        .glow-blue { text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
    </style>
</head>
<body class="token-gradient text-white min-h-screen font-sans">
    <div class="max-w-7xl mx-auto px-4 py-8">
        <header class="flex justify-between items-center mb-12 border-b border-slate-700 pb-6">
            <div class="flex items-center space-x-4">
                <span class="text-5xl">🔑</span>
                <div>
                    <h1 class="text-4xl font-black tracking-tight glow-blue text-blue-400">TOKEN HUB</h1>
                    <p class="text-slate-400 font-mono text-sm">Secure Multi-Team Credential Storage</p>
                </div>
            </div>
            <div class="flex space-x-4">
                <button onclick="addNewToken()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-xl transition shadow-lg shadow-blue-500/20">
                    + NEW TOKEN
                </button>
            </div>
        </header>

        <div class="grid grid-cols-1 gap-6">
            ${tokensList}
        </div>

        <div class="mt-12 bg-blue-900/20 border border-blue-500/20 rounded-2xl p-8">
            <h2 class="text-xl font-bold mb-4 flex items-center text-blue-300">
                <span class="mr-2">ℹ️</span> Security Guidelines
            </h2>
            <ul class="text-sm text-slate-400 space-y-2 list-disc list-inside">
                <li>Tokens are expanded from environment variables for maximum security.</li>
                <li>Team prefixes (<code>TEAM_A_*</code>, <code>TEAM_B_*</code>) allow for clean isolation.</li>
                <li>Production tokens should be stored in the OS-level Keychain via <code>Bun.password</code>.</li>
                <li>Always use environment expansion in <code>.npmrc</code> to prevent accidental leaks.</li>
            </ul>
        </div>
    </div>

    <script>
        function addNewToken() {
            const team = prompt("Team Name:");
            if (team) {
                alert("Expansion added to .npmrc. Please set the environment variable.");
            }
        }
    </script>
</body>
</html>
    `;
  }

  start(port: number = 3009) {
    console.log(`🔑 Token Management Dashboard starting on port ${port}...`);
    serve({
      port,
      fetch: (req) => {
        const url = new URL(req.url);
        if (url.pathname === "/") {
          return new Response(this.generateHTML(), { headers: { "Content-Type": "text/html" } });
        }
        return new Response("Not Found", { status: 404 });
      }
    });
  }
}

const dashboard = new TokenManagementDashboard();
dashboard.start();
