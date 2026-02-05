
import React from 'react';
import { Settings, Lock, Shield, FileText, Globe, Info, Copy } from 'lucide-react';

export const PrivateRegistryConfig: React.FC = () => {
  const codeSnippet = `[install.scopes]
# Primary Organization Scope
"@myorg1" = "https://usertitle:password@registry.myorg.com/"

# Scope with Environment Variables (Hardened)
"@myorg2" = {
  username = "myusername",
  password = "$npm_pass",
  url = "https://registry.myorg.com/"
}

# Token-based Authentication
"@myorg3" = { 
  token = "$npm_token", 
  url = "https://registry.myorg.com/" 
}`;

  return (
    <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-300">
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings size={18} className="text-emerald-500" />
          Private Registry Scopes (bunfig.toml)
        </h3>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">Enhanced Security</span>
      </div>
      
      <div className="p-4 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
           <div className="p-3 bg-black/95 rounded-lg border border-slate-800 relative group">
              <button 
                onClick={() => navigator.clipboard.writeText(codeSnippet)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy Config"
              >
                <Copy size={14} />
              </button>
              <pre className="text-[11px] font-mono leading-relaxed text-slate-300 overflow-x-auto">
                {codeSnippet.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="w-4 text-slate-600 select-none text-right">{i + 1}</span>
                    <span className={line.startsWith('#') ? 'text-slate-500 italic' : line.includes('=') ? 'text-emerald-400' : 'text-slate-300'}>
                        {line}
                    </span>
                  </div>
                ))}
              </pre>
           </div>
           
           <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <Info size={14} className="text-blue-500 shrink-0" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Bun automatically loads environment variables from <code className="text-blue-400">.env.local</code> and others. Reference them using <code className="text-emerald-400">$variable</code> syntax.
                </p>
           </div>
        </div>

        <div className="w-full md:w-64 space-y-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 mb-2">
                    <Lock size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">Auth Hardening</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    Credentials are now isolated from the main registry fetch stream using PTY session proxies.
                </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 mb-2">
                    <Shield size={14} className="text-sky-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">Scope Isolation</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    Prevent dependency confusion by strictly pinning organization scopes to internal registries.
                </p>
            </div>
        </div>
      </div>
      
      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex justify-center">
         <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">Deployment compliant with v1.3.6 Security Layer</span>
      </div>
    </div>
  );
};
