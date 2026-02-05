
import React, { useState } from 'react';
import { Terminal, Package, Edit3, Trash2, Wrench, ChevronRight, Command, Info, Copy, Check, Play, Hash, Code2, Share2, Layers, FileDiff, Scissors, Save, RefreshCw, List, UploadCloud, Globe, Zap, FileText, Lock, FileJson, AlertTriangle, GitBranch, Download, Hammer, FastForward, Cpu, Settings, FolderOpen, ArrowRight, ArrowDown, Box, ExternalLink, GitCommit, Split, LayoutGrid, Network } from 'lucide-react';

const SUBCOMMANDS = [
    {
        cmd: 'get',
        args: '[key...]',
        desc: 'Retrieves one or more properties from package.json. Supports dot notation for nested objects and bracket notation for arrays.',
        icon: <Terminal size={18} className="text-sky-500" />,
        examples: [
            'bun pm pkg get name',
            'bun pm pkg get name version',
            'bun pm pkg get scripts.build',
            'bun pm pkg get contributors[0]'
        ]
    },
    {
        cmd: 'set',
        args: '<key=value...> [--json]',
        desc: 'Sets or updates properties in package.json. Supports multiple key-value pairs and JSON input via flag.',
        icon: <Edit3 size={18} className="text-emerald-500" />,
        examples: [
            'bun pm pkg set name="my-package"',
            'bun pm pkg set scripts.test="jest" version=2.0.0',
            'bun pm pkg set \'{"private": true}\' --json',
            'bun pm pkg set keywords[999]="bun-runtime" keywords[999]="zero-config"'
        ]
    },
    {
        cmd: 'delete',
        args: '<key...>',
        desc: 'Removes specified properties from package.json. Handles nested keys via dot notation.',
        icon: <Trash2 size={18} className="text-rose-500" />,
        examples: [
            'bun pm pkg delete description',
            'bun pm pkg delete scripts.test contributors[0]'
        ]
    },
    {
        cmd: 'fix',
        args: '',
        desc: 'Automatically corrects common issues in package.json (e.g., formatting, validity).',
        icon: <Wrench size={18} className="text-amber-500" />,
        examples: [
            'bun pm pkg fix'
        ]
    }
];

const PEER_DEP_EXAMPLES = [
    {
        title: "Adding Single Peer Dependencies",
        cmds: [
            '# Add React 18',
            'bun pm pkg set peerDependencies.react="^18.0.0"',
            '',
            '# Add TypeScript exact version',
            'bun pm pkg set peerDependencies.typescript="5.6.2"'
        ]
    },
    {
        title: "Adding Multiple Peer Dependencies",
        cmds: [
            'bun pm pkg set \\',
            '  peerDependencies.react="^18.2.0" \\',
            '  peerDependencies."react-dom"="^18.2.0" \\',
            '  peerDependencies.typescript=">=5.0.0" \\',
            '  peerDependencies.zod="^3.22.0"'
        ]
    },
    {
        title: "Updating Existing Peer Dependencies",
        cmds: [
            '# Update React to latest 18.x',
            'bun pm pkg set peerDependencies.react="^18.3.0"',
            '',
            '# Loosen TypeScript requirement',
            'bun pm pkg set peerDependencies.typescript=">=4.5.0"'
        ]
    },
    {
        title: "Removing Peer Dependencies",
        cmds: [
            '# Remove single',
            'bun pm pkg delete peerDependencies.zod',
            '',
            '# Remove multiple',
            'bun pm pkg delete peerDependencies.next peerDependencies.tailwindcss'
        ]
    },
    {
        title: "Real-World Library Setup",
        cmds: [
            'bun pm pkg set \\',
            '  name="@myorg/button" \\',
            '  version="1.0.0" \\',
            '  peerDependencies.react="^18.0.0" \\',
            '  peerDependencies."react-dom"="^18.0.0" \\',
            '  peerDependencies.tailwindcss="^3.0.0" \\',
            '  description="Accessible button component"'
        ]
    },
    {
        title: "Multi-Host Tool Compatibility",
        cmds: [
            '# ESLint plugin for v8 or v9',
            'bun pm pkg set \\',
            '  peerDependencies.eslint="^8.0.0 || ^9.0.0" \\',
            '  peerDependencies.typescript=">=4.0.0"'
        ]
    },
    {
        title: "Monorepo Component Library",
        cmds: [
            'bun pm pkg set \\',
            '  name="@company/ui" \\',
            '  private=false \\',
            '  peerDependencies.react="^18.2.0" \\',
            '  peerDependencies."react-dom"="^18.2.0" \\',
            '  peerDependencies."@company/theme"="^2.0.0" \\',
            '  peerDependencies."@company/icons"="^1.5.0"'
        ]
    },
    {
        title: "Version Range Best Practices",
        cmds: [
            '# Conservative (Recommended)',
            'bun pm pkg set peerDependencies.react="^18.2.0"',
            '',
            '# Flexible (Broad compat)',
            'bun pm pkg set peerDependencies.react=">=17.0.0 <19.0.0"',
            '',
            '# Multiple Major Versions',
            'bun pm pkg set peerDependencies.next="13 || 14"'
        ]
    },
    {
        title: "Complete New Package Setup",
        cmds: [
            'bun pm pkg set \\',
            '  name="my-awesome-library" \\',
            '  version="1.0.0" \\',
            '  description="A powerful utility library" \\',
            '  license="MIT" \\',
            '  peerDependencies.react="^18.0.0" \\',
            '  peerDependencies."react-dom"="^18.0.0" \\',
            '  peerDependencies.typescript=">=5.0.0"'
        ]
    }
];

const PATCH_STEPS = [
    {
        title: "1. Initiate Patch",
        cmd: "bun pm patch <package>",
        desc: "Clones package source to a temp dir and opens $EDITOR.",
        icon: <Scissors size={18} className="text-rose-500" />,
        color: "bg-rose-500"
    },
    {
        title: "2. Edit Source",
        cmd: "vim /tmp/lodash-patch/index.js",
        desc: "Fix bugs or add features directly in the dependency files.",
        icon: <Edit3 size={18} className="text-amber-500" />,
        color: "bg-amber-500"
    },
    {
        title: "3. Auto-Commit",
        cmd: ":wq (Save & Exit)",
        desc: "Bun generates a .patch file and updates package.json.",
        icon: <Save size={18} className="text-emerald-500" />,
        color: "bg-emerald-500"
    },
    {
        title: "4. Apply",
        cmd: "bun install",
        desc: "Patches are verified and applied during every installation.",
        icon: <RefreshCw size={18} className="text-sky-500" />,
        color: "bg-sky-500"
    }
];

const PATCH_COMMANDS = [
    {
        cmd: 'bun pm patch <pkg>',
        desc: 'Create a new patch for a dependency.',
        example: 'bun pm patch lodash'
    },
    {
        cmd: 'bun pm patch --commit <path>',
        desc: 'Commit changes from a specific directory as a patch.',
        example: 'bun pm patch --commit ./node_modules/lodash'
    },
     {
        cmd: 'bun pm patch --list',
        desc: 'List all active patches in the project.',
        example: 'bun pm patch --list'
    },
    {
        cmd: 'bun pm patch <pkg> --remove',
        desc: 'Remove a patch and revert the dependency.',
        example: 'bun pm patch lodash --remove'
    }
];

const PUBLISH_OPTIONS = [
    {
        title: "Registry & Auth",
        icon: <Globe size={18} className="text-sky-500" />,
        color: "bg-sky-500",
        opts: [
            { flag: '--otp <code>', desc: 'One-time password for 2FA.' },
            { flag: '--access <level>', desc: 'public or restricted.' },
            { flag: '--ca <string>', desc: 'Inline CA signing certificate.' },
            { flag: '--cafile <path>', desc: 'Path to CA certificate file.' }
        ]
    },
    {
        title: "Lifecycle Scripts",
        icon: <Zap size={18} className="text-amber-500" />,
        color: "bg-amber-500",
        opts: [
            { flag: '--ignore-scripts', desc: 'Skip prepublish/prepack scripts.' },
            { flag: '--trust', desc: 'Run scripts from trusted dependencies.' },
            { flag: '--concurrent-scripts <n>', desc: 'Max concurrent scripts (default: 5).' }
        ]
    },
    {
        title: "File Management",
        icon: <FileText size={18} className="text-emerald-500" />,
        color: "bg-emerald-500",
        opts: [
            { flag: '--frozen-lockfile', desc: 'Disallow lockfile updates.' },
            { flag: '--no-save', desc: 'Prevent package.json updates.' },
            { flag: '--production', desc: 'Exclude devDependencies.' },
            { flag: '--omit <type>', desc: 'Omit dev, optional, or peer deps.' }
        ]
    },
    {
        title: "Output & Performance",
        icon: <Terminal size={18} className="text-purple-500" />,
        color: "bg-purple-500",
        opts: [
            { flag: '--verbose', desc: 'Show detailed debug logging.' },
            { flag: '--silent', desc: 'Suppress all output.' },
            { flag: '--no-summary', desc: 'Hide the publish summary table.' },
            { flag: '--network-concurrency <n>', desc: 'Max requests (default: 48).' }
        ]
    }
];

const INSTALL_MECHANICS = [
    {
        title: "Optimized Hashing",
        desc: "Semver versions with pre-release/build suffixes (e.g. 1.0.0-beta.0) are hashed to shorten file paths and prevent FS errors.",
        icon: <Hash size={16} />
    },
    {
        title: "Lazy JSON Parsing",
        desc: "Custom parser stops reading package.json immediately after extracting 'name' and 'version' for maximum speed.",
        icon: <FileJson size={16} />
    },
    {
        title: "Smart Cache",
        desc: "Missing compatible modules are installed from the global cache if available, skipping redundant downloads.",
        icon: <Zap size={16} />
    }
];

// New data for bun create
const CREATE_FLOWS = [
    {
        type: 'remote',
        title: 'Remote Template',
        icon: <Globe size={18} className="text-sky-500" />,
        steps: [
            'GET registry.npmjs.org/@bun-examples/${template}/latest',
            'GET registry.npmjs.org/@bun-examples/${template}/-/${template}-${ver}.tgz',
            'Decompress & extract .tgz into ${destination}',
            'Check for file overwrites (Exit unless --force)'
        ]
    },
    {
        type: 'github',
        title: 'GitHub Repo',
        icon: <GitBranch size={18} className="text-purple-500" />,
        steps: [
            'Download tarball from GitHub API',
            'Decompress & extract into ${destination}',
            'Check for file overwrites (Exit unless --force)'
        ]
    },
    {
        type: 'local',
        title: 'Local Template',
        icon: <Layers size={18} className="text-amber-500" />,
        steps: [
            'Open local template folder',
            'Recursively delete destination directory',
            'Recursively copy using fastest syscalls (fcopyfile/copy_file_range)',
            'Skip node_modules folder',
            'Parse & Update package.json (set name, remove bun-create config)'
        ]
    }
];

const CREATE_FLAGS = [
    { flag: '--force', desc: 'Overwrite files if destination exists.', icon: <AlertTriangle size={14}/>, color: 'text-rose-500', border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
    { flag: '--no-install', desc: 'Skip npm dependency installation.', icon: <Box size={14}/>, color: 'text-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
    { flag: '--no-git', desc: 'Skip git repository initialization.', icon: <GitBranch size={14}/>, color: 'text-purple-500', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
    { flag: '--verbose', desc: 'Enable detailed debug logging.', icon: <Terminal size={14}/>, color: 'text-sky-500', border: 'border-sky-500/20', bg: 'bg-sky-500/5' },
];

const GITHUB_PATTERNS = [
    { 
        label: 'Default Branch', 
        syntax: 'bun create user/repo my-app', 
        note: 'Downloads latest from main/master' 
    },
    { 
        label: 'Specific Branch/Tag', 
        syntax: 'bun create user/repo#branch my-app', 
        note: 'Targets branch, tag, or commit' 
    },
    { 
        label: 'Sub-directory', 
        syntax: 'bun create user/repo/subdir my-app', 
        note: 'Monorepo extraction support' 
    }
];

const CREATE_EXAMPLES = [
    {
        cmd: 'bun create next ./my-app',
        desc: 'Auto-resolves to @bun-examples/next',
        type: 'NPM'
    },
    {
        cmd: 'bun create react ./my-app',
        desc: 'Official React template',
        type: 'NPM'
    },
    {
        cmd: 'bun create user/repo ./app',
        desc: 'GitHub user/repo extraction',
        type: 'GitHub'
    },
    {
        cmd: 'bun create ./local-tpl ./app',
        desc: 'Local filesystem clone',
        type: 'Local'
    }
];

const CATALOG_SCENARIOS = [
    {
        id: 'standard',
        title: "Standard Catalog",
        desc: "Share versions across all packages by default.",
        file: "bunfig.toml",
        config: `[catalog]
react = "^18.2.0"
react-dom = "^18.2.0"
zod = "^3.22.4"
"date-fns" = "^2.30.0"`,
        usage: `{
  "name": "@app/core",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "zod": "catalog:"
  }
}`
    },
    {
        id: 'named',
        title: "Named Catalogs",
        desc: "Group dependencies for specific use cases (e.g., internal tools).",
        file: "bunfig.toml",
        config: `[catalog.internal]
"shared-ui" = "workspace:*"
"logger" = "workspace:*"

[catalog.react19]
react = "^19.0.0-rc"
react-dom = "^19.0.0-rc"`,
        usage: `{
  "name": "@app/dashboard",
  "dependencies": {
    "shared-ui": "catalog:internal",
    "react": "catalog:react19",
    "react-dom": "catalog:react19"
  }
}`
    }
];

export const PackageManagerCLI: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'pkg' | 'patch' | 'publish' | 'create' | 'workspaces'>('pkg');
  const [activeCatalog, setActiveCatalog] = useState('standard');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const currentCatalog = CATALOG_SCENARIOS.find(c => c.id === activeCatalog) || CATALOG_SCENARIOS[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Mode Switcher */}
      <div className="flex justify-center mb-2">
            <div className="bg-slate-200 dark:bg-slate-900/50 p-1.5 rounded-xl flex gap-1 border border-slate-300 dark:border-slate-800 relative flex-wrap justify-center">
                <button 
                    onClick={() => setActiveMode('pkg')}
                    className={`px-4 lg:px-6 py-2.5 rounded-lg text-xs lg:text-sm font-black uppercase tracking-widest transition-all z-10 ${activeMode === 'pkg' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    bun pm pkg
                </button>
                <button 
                    onClick={() => setActiveMode('patch')}
                    className={`px-4 lg:px-6 py-2.5 rounded-lg text-xs lg:text-sm font-black uppercase tracking-widest transition-all z-10 ${activeMode === 'patch' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    bun pm patch
                </button>
                <button 
                    onClick={() => setActiveMode('workspaces')}
                    className={`px-4 lg:px-6 py-2.5 rounded-lg text-xs lg:text-sm font-black uppercase tracking-widest transition-all z-10 ${activeMode === 'workspaces' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Catalogs
                </button>
                <button 
                    onClick={() => setActiveMode('publish')}
                    className={`px-4 lg:px-6 py-2.5 rounded-lg text-xs lg:text-sm font-black uppercase tracking-widest transition-all z-10 ${activeMode === 'publish' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    bun publish
                </button>
                <button 
                    onClick={() => setActiveMode('create')}
                    className={`px-4 lg:px-6 py-2.5 rounded-lg text-xs lg:text-sm font-black uppercase tracking-widest transition-all z-10 ${activeMode === 'create' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    bun create
                </button>
            </div>
      </div>

      {activeMode === 'pkg' && (
        <>
        {/* Header */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-orange-500/5 blur-3xl rounded-full -z-10"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-[0.3em]">
                        <Package size={14} /> Package Manager CLI
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">bun pm pkg</h2>
                    <p className="text-slate-500 text-sm max-w-xl">
                        Precise, programmatic management of package metadata directly from the command line. Support for dot and bracket notation accessors.
                    </p>
                </div>
                
                <div className="glass-panel p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 text-center min-w-[140px]">
                    <div className="text-[10px] font-black text-orange-600 uppercase mb-1">CLI Syntax</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Native Speed</div>
                    <div className="text-[10px] font-mono text-orange-500 mt-1">{"Bun Native"}</div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
            {SUBCOMMANDS.map((item, idx) => (
                <div key={item.cmd} className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 hover:border-orange-500/30 transition-all group">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-950 transition-colors">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {item.cmd} <span className="text-xs font-mono font-normal text-slate-400">{item.args}</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800">
                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Command size={10} /> Examples
                                </span>
                            </div>
                            <div className="p-4 space-y-2">
                                {item.examples.map((ex, i) => (
                                    <div key={i} className="group/code flex items-center justify-between gap-4 font-mono text-[11px]">
                                        <span className="text-emerald-400">
                                            <span className="text-slate-500 select-none mr-2">$</span>
                                            {ex}
                                        </span>
                                        <button 
                                            onClick={() => copyToClipboard(ex, `${item.cmd}-${i}`)}
                                            className="text-slate-600 hover:text-white transition-colors opacity-0 group-hover/code:opacity-100"
                                        >
                                            {copiedIndex === `${item.cmd}-${i}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Installation Internals */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Zap size={20} /></div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Installation Mechanics</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Under the hood of <code>bun install</code></p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {INSTALL_MECHANICS.map((mech, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wide">
                            {mech.icon} {mech.title}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            {mech.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>

        {/* Peer Dependencies Section */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><Share2 size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Peer Dependency Workflows</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Managing complex dependency graphs with bun pm pkg</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {PEER_DEP_EXAMPLES.map((ex, i) => (
                        <div key={i} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden group hover:border-pink-500/30 transition-all flex flex-col">
                                <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ex.title}</span>
                                    <button onClick={() => copyToClipboard(ex.cmds.join('\n'), `peer-${i}`)} className="text-slate-500 hover:text-pink-500 transition-colors">
                                        {copiedIndex === `peer-${i}` ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                                    </button>
                                </div>
                                <div className="p-4 overflow-x-auto flex-1 custom-scrollbar">
                                    <pre className="text-[10px] font-mono leading-relaxed text-slate-300 whitespace-pre">
                                        {ex.cmds.map((cmd, j) => (
                                            <div key={j} className={cmd.startsWith('#') ? 'text-slate-500 italic mb-1' : cmd.trim() === '' ? 'h-2' : 'text-emerald-400'}>
                                                {cmd.startsWith('#') || cmd.trim() === '' ? cmd : <><span className="text-slate-600 mr-2 select-none">$</span>{cmd}</>}
                                            </div>
                                        ))}
                                    </pre>
                                </div>
                        </div>
                    ))}
                </div>
            </div>

        {/* Common Options */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Info size={20} /></div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Common Options</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Applied contextually across subcommands</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { flag: '--quiet', desc: 'Suppresses output' },
                    { flag: '--dry-run', desc: 'Simulates actions without changes' },
                    { flag: '--force', desc: 'Bypass version/tag checks' },
                    { flag: '--no-git-tag-version', desc: 'Skip automatic git tagging' },
                ].map(opt => (
                    <div key={opt.flag} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <code className="text-xs font-bold text-indigo-500 block mb-1">{opt.flag}</code>
                        <span className="text-[10px] text-slate-500">{opt.desc}</span>
                    </div>
                ))}
            </div>
        </div>
        </>
      )}

      {activeMode === 'patch' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             {/* Patch Hero */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-rose-500/5 blur-3xl rounded-full -z-10"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <FileDiff size={14} /> Dependency Patcher
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">bun pm patch</h2>
                        <p className="text-slate-500 text-sm max-w-xl">
                            Zero-overhead patching for <code>node_modules</code>. Fix bugs, apply experimental changes, or adapt third-party libraries instantly without forking.
                        </p>
                    </div>
                    
                    <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center min-w-[140px]">
                        <div className="text-[10px] font-black text-rose-600 uppercase mb-1">Workflow</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Zero Config</div>
                        <div className="text-[10px] font-mono text-rose-500 mt-1">{"Auto-Applied"}</div>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PATCH_STEPS.map((step, i) => (
                    <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                        <div className={`absolute inset-x-0 top-0 h-1 ${step.color}`}></div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-900`}>{step.icon}</div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{step.title}</span>
                        </div>
                        <code className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mb-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded border border-slate-200 dark:border-slate-800">{step.cmd}</code>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            {step.desc}
                        </p>
                    </div>
                ))}
            </div>

            {/* Config & Commands */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500"><Layers size={20} /></div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Persistent Config</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Patches are tracked in package.json</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs flex-1">
                        <div className="text-slate-400 mb-2">// package.json</div>
                        <div className="text-slate-300">
                            <span>{"{"}</span>
                            <div className="pl-4">
                                <span className="text-sky-400">"name"</span>: <span className="text-amber-400">"my-project"</span>,
                            </div>
                            <div className="pl-4">
                                <span className="text-sky-400">"dependencies"</span>: <span>{"{"}</span>
                                <div className="pl-4">
                                    <span className="text-sky-400">"lodash"</span>: <span className="text-amber-400">"^4.17.21"</span>
                                </div>
                                <span>{"}"}</span>,
                            </div>
                            <div className="pl-4">
                                <span className="text-sky-400">"bun-patches"</span>: <span>{"{"}</span>
                                <div className="pl-4">
                                    <span className="text-sky-400">"lodash"</span>: <span className="text-emerald-400">"patches/lodash+4.17.21.patch"</span>
                                </div>
                                <span>{"}"}</span>
                            </div>
                            <span>{"}"}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Terminal size={20} /></div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Command Reference</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Patch management utilities</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                         {PATCH_COMMANDS.map((cmd, idx) => (
                             <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 group hover:border-emerald-500/30 transition-all">
                                 <div className="flex justify-between items-center mb-1">
                                    <code className="text-[10px] font-bold text-indigo-500 bg-indigo-500/5 px-1.5 py-0.5 rounded">{cmd.cmd}</code>
                                    <button 
                                        onClick={() => copyToClipboard(cmd.example, `patch-cmd-${idx}`)}
                                        className="text-slate-400 hover:text-emerald-500 transition-colors"
                                    >
                                        {copiedIndex === `patch-cmd-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                 </div>
                                 <p className="text-[10px] text-slate-500 font-medium mb-1">{cmd.desc}</p>
                                 <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                                    <span className="text-slate-600 select-none">$</span> {cmd.example}
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeMode === 'workspaces' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Catalog Hero */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <LayoutGrid size={14} /> Workspace Catalogs
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">catalog:</h2>
                        <p className="text-slate-500 text-sm max-w-xl">
                            Deduplicate dependencies across your monorepo. Define version sets in <code>bunfig.toml</code> and reference them via the <code>catalog:</code> protocol.
                        </p>
                    </div>
                    
                    <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center min-w-[140px]">
                        <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">State</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Synced</div>
                        <div className="text-[10px] font-mono text-indigo-500 mt-1">One Version Rule</div>
                    </div>
                </div>
            </div>

            {/* Catalog Configurator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
                        {CATALOG_SCENARIOS.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => setActiveCatalog(s.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeCatalog === s.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {s.title}
                            </button>
                        ))}
                    </div>

                    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Settings size={12} /> {currentCatalog.file}
                            </span>
                            <span className="text-[9px] text-slate-400">Workspace Root</span>
                        </div>
                        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-auto relative group">
                            <button 
                                onClick={() => copyToClipboard(currentCatalog.config, 'catalog-config')}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                {copiedIndex === 'catalog-config' ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                            <pre className="text-slate-300">
                                {currentCatalog.config.split('\n').map((line, i) => (
                                    <div key={i} className={line.startsWith('[') ? 'text-indigo-400 font-bold' : line.includes('=') ? 'text-emerald-400' : 'text-slate-300'}>
                                        {line}
                                    </div>
                                ))}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-[52px]"> {/* Align with tabs */}
                    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-[400px] flex flex-col bg-indigo-500/5 border-indigo-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                <Package size={12} /> package.json
                            </span>
                            <span className="text-[9px] text-indigo-400">Workspace Member</span>
                        </div>
                        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-auto relative group">
                            <button 
                                onClick={() => copyToClipboard(currentCatalog.usage, 'catalog-usage')}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                {copiedIndex === 'catalog-usage' ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                            <pre className="text-slate-300">
                                {currentCatalog.usage.split('\n').map((line, i) => (
                                    <div key={i}>
                                        <span className={line.includes('catalog:') ? 'text-sky-400 font-bold' : 'text-slate-300'}>{line}</span>
                                    </div>
                                ))}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Topology */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500"><Network size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Resolution Topology</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">How bun install maps catalogs</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                        <Settings size={24} className="text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">bunfig.toml</span>
                        <div className="text-[9px] font-mono text-slate-500 bg-white dark:bg-slate-950 px-2 py-1 rounded">react = "^18.2.0"</div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight size={24} className="text-slate-300 hidden md:block" />
                        <ArrowDown size={24} className="text-slate-300 md:hidden" />
                        <span className="text-[9px] font-black uppercase text-emerald-500 mt-2">Injects</span>
                    </div>

                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded">Lockfile</div>
                        <Lock size={24} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">bun.lock</span>
                        <div className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">react@18.2.0</div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight size={24} className="text-slate-300 hidden md:block" />
                        <ArrowDown size={24} className="text-slate-300 md:hidden" />
                        <span className="text-[9px] font-black uppercase text-sky-500 mt-2">Resolves</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                            <Box size={16} className="text-slate-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">packages/ui</span>
                                <span className="text-[8px] font-mono text-sky-500">"react": "catalog:"</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                            <Box size={16} className="text-slate-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">packages/web</span>
                                <span className="text-[8px] font-mono text-sky-500">"react": "catalog:"</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeMode === 'publish' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             {/* Publish Hero */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-sky-500/5 blur-3xl rounded-full -z-10"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sky-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <UploadCloud size={14} /> Registry Publisher
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">bun publish</h2>
                        <p className="text-slate-500 text-sm max-w-xl">
                            Pack and publish packages to npm or any compatible registry. Includes native support for 2FA, scoped registries, and automated lifecycle script management.
                        </p>
                    </div>
                    
                    <div className="glass-panel p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-center min-w-[140px]">
                        <div className="text-[10px] font-black text-sky-600 uppercase mb-1">Capability</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">CI Ready</div>
                        <div className="text-[10px] font-mono text-sky-500 mt-1">{"Env-Aware"}</div>
                    </div>
                </div>
            </div>

            {/* Registry Configuration Info */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-amber-500/5 border-amber-500/20 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold text-sm uppercase tracking-wide">
                        <AlertTriangle size={16} /> Registry Configuration
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong>Important:</strong> <code>bun publish</code> does <span className="underline decoration-amber-500/50 decoration-2 underline-offset-2">not</span> support a <code>--registry</code> flag.
                        The target registry must be defined in your configuration files.
                    </p>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Method 1: .npmrc (Recommended)</span>
                        <code className="text-[10px] font-mono text-indigo-500 block bg-slate-50 dark:bg-slate-900 p-1.5 rounded">registry=https://my-registry.com/</code>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Method 2: bunfig.toml</span>
                        <code className="text-[10px] font-mono text-emerald-500 block bg-slate-50 dark:bg-slate-900 p-1.5 rounded">scopes = &#123; "@myorg" = "..." &#125;</code>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Environment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500"><Lock size={20} /></div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Auth & CI</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Environment Variable Support</p>
                        </div>
                     </div>
                     <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400">
                         <div className="text-slate-500 mb-2"># CI/CD Workflow Example</div>
                         <div>export NPM_CONFIG_TOKEN="npm_..."</div>
                         <div>bun publish</div>
                     </div>
                     <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                         Bun respects standard environment variables like <code className="text-indigo-500 font-bold">NPM_CONFIG_TOKEN</code> and <code className="text-indigo-500 font-bold">NPM_CONFIG_REGISTRY</code>, making it a drop-in replacement for npm in GitHub Actions.
                     </p>
                 </div>

                 <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Terminal size={20} /></div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Common Commands</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Publishing Workflows</p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        {[
                            { cmd: 'bun publish --dry-run', desc: 'Preview package contents without uploading' },
                            { cmd: 'bun publish --otp 123456', desc: 'Publish with 2FA one-time password' },
                            { cmd: 'bun publish --access public', desc: 'Explicitly set public access for scoped pkgs' },
                        ].map((c, i) => (
                             <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                                 <div>
                                     <code className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">{c.cmd}</code>
                                     <span className="text-[9px] text-slate-500">{c.desc}</span>
                                 </div>
                                 <button onClick={() => copyToClipboard(c.cmd, `pub-${i}`)} className="text-slate-400 hover:text-indigo-500">
                                     {copiedIndex === `pub-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                 </button>
                             </div>
                        ))}
                     </div>
                 </div>
            </div>

            {/* Options Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PUBLISH_OPTIONS.map((section, idx) => (
                    <div key={idx} className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-full hover:border-sky-500/30 transition-all group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${section.color} bg-opacity-10 text-white`}>
                                {section.icon}
                            </div>
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{section.title}</h3>
                        </div>
                        <div className="space-y-3 flex-1">
                            {section.opts.map((opt, i) => (
                                <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50">
                                    <code className="text-[10px] font-bold text-indigo-500 block mb-0.5">{opt.flag}</code>
                                    <p className="text-[9px] text-slate-500 leading-tight">{opt.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeMode === 'create' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Create Hero */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-amber-500/5 blur-3xl rounded-full -z-10"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <Hammer size={14} /> Scaffolding Engine
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">bun create</h2>
                        <p className="text-slate-500 text-sm max-w-xl">
                            Fastest way to start a new project. Intelligently scaffolds from remote templates, GitHub repositories, or local folders with auto-detection for frameworks.
                        </p>
                    </div>
                    
                    <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center min-w-[140px]">
                        <div className="text-[10px] font-black text-amber-600 uppercase mb-1">Architecture</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Native Syscalls</div>
                        <div className="text-[10px] font-mono text-amber-500 mt-1">{"fcopyfile / copy_file_range"}</div>
                    </div>
                </div>
            </div>

            {/* Source Resolution Logic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CREATE_FLOWS.map((flow, i) => (
                    <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-full hover:border-amber-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 group-hover:bg-amber-500/10 transition-colors">
                                {flow.icon}
                            </div>
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{flow.title}</h3>
                        </div>
                        <div className="space-y-3 flex-1 relative">
                            {/* Vertical line connecting steps */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800"></div>
                            {flow.steps.map((step, j) => (
                                <div key={j} className="flex gap-3 relative">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 z-10 text-[8px] font-mono text-slate-500">
                                        {j + 1}
                                    </div>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight pt-0.5">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* GitHub Source Patterns */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><GitBranch size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">From GitHub</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Remote extraction patterns</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {GITHUB_PATTERNS.map((p, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 group hover:border-purple-500/30 transition-all">
                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">{p.label}</div>
                            <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 mb-2">
                                <code className="block text-[10px] font-mono text-purple-600 dark:text-purple-400 truncate flex-1" title={p.syntax}>{p.syntax}</code>
                                <button onClick={() => copyToClipboard(p.syntax, `gh-pat-${i}`)} className="ml-2 text-slate-400 hover:text-purple-500">
                                    {copiedIndex === `gh-pat-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                            <div className="text-[9px] text-slate-400">{p.note}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CLI Flags Section */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500"><Terminal size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">CLI Flags</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Initialization arguments</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CREATE_FLAGS.map((flag, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${flag.border} ${flag.bg} transition-all`}>
                            <div className="flex items-center gap-2 mb-2">
                                {flag.icon}
                                <code className={`text-[10px] font-bold ${flag.color}`}>{flag.flag}</code>
                            </div>
                            <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-tight">{flag.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Setup Logic / Manifest Transformation */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><FileJson size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Setup Logic: Manifest Transformation</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Automatic package.json mutation rules</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Before */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                        <div className="text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">Template Source</div>
                        <div className="space-y-1 text-slate-300">
                            <div><span className="text-sky-500">"name"</span>: <span className="text-amber-500">"bun-template"</span>,</div>
                            <div><span className="text-sky-500">"version"</span>: <span className="text-amber-500">"1.0.0"</span>,</div>
                            <div className="bg-rose-500/10 -mx-2 px-2 rounded border border-rose-500/20"><span className="text-sky-500">"bun-create"</span>: &#123; ... &#125;</div>
                        </div>
                    </div>

                    {/* Logic */}
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="h-px w-full bg-slate-200 dark:bg-slate-800 md:hidden"></div>
                        <ArrowRight size={24} className="hidden md:block text-slate-300" />
                        <ArrowDown size={24} className="md:hidden text-slate-300" />
                        <div className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">Processing</div>
                    </div>

                    {/* After */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                        <div className="text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">Destination (./my-app)</div>
                        <div className="space-y-1 text-slate-300">
                            <div className="bg-emerald-500/10 -mx-2 px-2 rounded border border-emerald-500/20"><span className="text-sky-500">"name"</span>: <span className="text-amber-500">"my-app"</span>,</div>
                            <div className="bg-emerald-500/10 -mx-2 px-2 rounded border border-emerald-500/20"><span className="text-sky-500">"version"</span>: <span className="text-amber-500">"0.1.0"</span>,</div>
                            <div className="bg-emerald-500/10 -mx-2 px-2 rounded border border-emerald-500/20"><span className="text-sky-500">"private"</span>: <span className="text-purple-500">true</span></div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <Check size={16} className="text-emerald-500 mt-0.5" />
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">Sanitization</span>
                            <p className="text-[9px] text-slate-500 leading-relaxed">The <code>bun-create</code> configuration object is automatically stripped from the final manifest to keep production dependencies clean.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <Play size={16} className="text-indigo-500 mt-0.5" />
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">Hooks</span>
                            <p className="text-[9px] text-slate-500 leading-relaxed">Scripts defined in <code>bun-create.preinstall</code> and <code>bun-create.postinstall</code> are executed during the scaffolding process.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Execution Logic Flow */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Split size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Setup Logic Flow</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Runtime Decision Tree</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800"></div>
                    <div className="space-y-8">
                        {/* Source Phase */}
                        <div className="relative pl-14">
                            <div className="absolute left-4 top-0 w-4 h-4 -ml-2 rounded-full border-4 border-white dark:border-slate-950 bg-indigo-500 shadow-sm z-10"></div>
                            <h4 className="text-xs font-black text-indigo-500 uppercase mb-3">1. Source Resolution</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] shadow-sm">
                                    <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1">IF Remote</span>
                                    <div className="text-slate-500 leading-tight">GET registry.npmjs.org/@bun-examples/...</div>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] shadow-sm">
                                    <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1">IF GitHub</span>
                                    <div className="text-slate-500 leading-tight">Download tarball from GitHub API</div>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] shadow-sm">
                                    <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1">ELSE Local</span>
                                    <div className="text-slate-500 leading-tight">Recursively copy via <code className="text-emerald-500">fcopyfile</code></div>
                                </div>
                            </div>
                        </div>

                        {/* Framework Detection */}
                        <div className="relative pl-14">
                            <div className="absolute left-4 top-0 w-4 h-4 -ml-2 rounded-full border-4 border-white dark:border-slate-950 bg-amber-500 shadow-sm z-10"></div>
                            <h4 className="text-xs font-black text-amber-500 uppercase mb-3">2. Auto-Configuration</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="text-[9px] font-bold text-slate-500 w-24 shrink-0">IF Next.js</div>
                                    <ArrowRight size={12} className="text-slate-400" />
                                    <div className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">add bun-framework-next</div>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="text-[9px] font-bold text-slate-500 w-24 shrink-0">IF CRA</div>
                                    <ArrowRight size={12} className="text-slate-400" />
                                    <div className="text-[10px] font-mono text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded">inject public/index.html</div>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="text-[9px] font-bold text-slate-500 w-24 shrink-0">IF Relay</div>
                                    <ArrowRight size={12} className="text-slate-400" />
                                    <div className="text-[10px] font-mono text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">add bun-macro-relay</div>
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Execution */}
                        <div className="relative pl-14">
                            <div className="absolute left-4 top-0 w-4 h-4 -ml-2 rounded-full border-4 border-white dark:border-slate-950 bg-emerald-500 shadow-sm z-10"></div>
                            <h4 className="text-xs font-black text-emerald-500 uppercase mb-3">3. Lifecycle & Git</h4>
                            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                        <span className="text-indigo-400">Run</span> bun-create:preinstall
                                    </div>
                                    <div className="flex items-center gap-3 pl-3 border-l-2 border-slate-800">
                                        <div className="flex-1 p-2 rounded bg-slate-900 border border-slate-800">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Thread A</div>
                                            <div className="text-[10px] font-mono text-emerald-400">bun install</div>
                                        </div>
                                        <div className="text-xs text-slate-600 font-black">+</div>
                                        <div className="flex-1 p-2 rounded bg-slate-900 border border-slate-800">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Thread B</div>
                                            <div className="text-[10px] font-mono text-orange-400">git init & commit</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                        <span className="text-indigo-400">Run</span> bun-create:postinstall
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                                        <GitCommit size={12} /> Rename gitignore → .gitignore
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage Examples & Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500"><Terminal size={20} /></div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest italic">Quick Start</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Common instantiation patterns</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CREATE_EXAMPLES.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 group hover:border-amber-500/30 transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <code className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">{ex.cmd}</code>
                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider opacity-60">{ex.type}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500">{ex.desc}</p>
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(ex.cmd, `create-ex-${i}`)}
                                    className="text-slate-400 hover:text-amber-500 transition-colors"
                                >
                                    {copiedIndex === `create-ex-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-indigo-500/5 border-indigo-500/20 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wide">
                        <FolderOpen size={16} /> Global Template Dir
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        Customize where <code className="font-bold text-indigo-500">bun create</code> looks for local templates by setting the environment variable.
                    </p>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[9px] text-slate-300 relative group">
                        <button 
                            onClick={() => copyToClipboard('export BUN_CREATE_DIR="$HOME/.bun-templates"', 'bun-create-dir')}
                            className="absolute top-2 right-2 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {copiedIndex === 'bun-create-dir' ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        <div className="text-slate-500 mb-1"># Add to .bashrc / .zshrc</div>
                        <div className="text-indigo-400 break-all">export BUN_CREATE_DIR="$HOME/.bun-templates"</div>
                        
                        <div className="mt-3 text-slate-500 mb-1"># Usage</div>
                        <div>
                            bun create <span className="text-emerald-400">my-tpl</span> ./app
                        </div>
                        <div className="text-slate-500 text-[8px] mt-1"># Resolves to ~/.bun-templates/my-tpl</div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
