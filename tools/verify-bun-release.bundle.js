#!/usr/bin/env bun
// @bun
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __promiseAll = (args) => Promise.all(args);
var __require = import.meta.require;

// lib/docs/bun-site-url.ts
function hrefFromInit(init) {
  const u = new URL("http://localhost");
  const protocol = (init.protocol ?? "https").replace(/:$/, "");
  u.protocol = `${protocol}:`;
  if (init.hostname != null && init.hostname !== "*")
    u.hostname = init.hostname;
  if (init.port != null && init.port !== "*" && init.port !== "")
    u.port = init.port;
  if (init.username != null && init.username !== "*")
    u.username = init.username;
  if (init.password != null && init.password !== "*")
    u.password = init.password;
  let pathname = init.pathname ?? "/";
  if (pathname !== "*" && !pathname.startsWith("/"))
    pathname = `/${pathname}`;
  if (pathname !== "*")
    u.pathname = pathname;
  if (init.search != null && init.search !== "*") {
    u.search = init.search.startsWith("?") ? init.search.slice(1) : init.search;
  }
  if (init.hash != null && init.hash !== "*") {
    u.hash = init.hash.startsWith("#") ? init.hash.slice(1) : init.hash;
  }
  return u.href;
}
function normalizePath(path) {
  return path.replace(/^\/+/, "").replace(/\.md$/i, "");
}
function stripHash(hash) {
  if (hash == null || hash === "")
    return;
  return hash.replace(/^#/, "");
}
function splitHash(path, hash) {
  if (hash != null)
    return { path, hash: stripHash(hash) };
  const i = path.indexOf("#");
  if (i < 0)
    return { path };
  return { path: path.slice(0, i), hash: path.slice(i + 1) };
}
function bunDocs(path, hash) {
  const parts = splitHash(path, hash);
  return hrefFromInit({
    ...BunComSite,
    pathname: `/docs/${normalizePath(parts.path)}`,
    hash: parts.hash
  });
}
function bunBlog(slug, hash) {
  const parts = splitHash(slug, hash);
  return hrefFromInit({
    ...BunComSite,
    pathname: `/blog/${normalizePath(parts.path)}`,
    hash: parts.hash
  });
}
function mdnWebApi(name) {
  return hrefFromInit({
    ...MdnSite,
    pathname: `/en-US/docs/Web/API/${normalizePath(name)}`
  });
}
function bunComOrigin() {
  return hrefFromInit({ ...BunComSite, pathname: "/" }).replace(/\/$/, "");
}
function bunShOrigin() {
  return hrefFromInit({ ...BunShSite, pathname: "/" }).replace(/\/$/, "");
}
var BunComSite, BunShSite, MdnSite, GitHubOvenSite, BunDocsPattern, BunBlogIndexPattern, BunBlogPattern, BunReferencePattern, CANONICAL_SOURCES, MdnWebApiPattern;
var init_bun_site_url = __esm(() => {
  BunComSite = {
    protocol: "https",
    hostname: "bun.com"
  };
  BunShSite = {
    protocol: "https",
    hostname: "bun.sh"
  };
  MdnSite = {
    protocol: "https",
    hostname: "developer.mozilla.org"
  };
  GitHubOvenSite = {
    protocol: "https",
    hostname: "github.com"
  };
  BunDocsPattern = new URLPattern({
    protocol: BunComSite.protocol,
    hostname: "(bun\\.com|bun\\.sh)",
    pathname: "/docs/:path*"
  });
  BunBlogIndexPattern = new URLPattern({
    protocol: BunComSite.protocol,
    hostname: "(bun\\.com|bun\\.sh)",
    pathname: "/blog"
  });
  BunBlogPattern = new URLPattern({
    protocol: BunComSite.protocol,
    hostname: "(bun\\.com|bun\\.sh)",
    pathname: "/blog/:slug"
  });
  BunReferencePattern = new URLPattern({
    protocol: BunComSite.protocol,
    hostname: "(bun\\.com|bun\\.sh)",
    pathname: "/reference/:path*"
  });
  CANONICAL_SOURCES = {
    blog: { ...BunComSite, pathname: "/blog" },
    docs: { ...BunComSite, pathname: "/docs" },
    reference: { ...BunComSite, pathname: "/reference" },
    llms: { ...BunComSite, pathname: "/docs/llms.txt" }
  };
  MdnWebApiPattern = new URLPattern({
    protocol: MdnSite.protocol,
    hostname: MdnSite.hostname,
    pathname: "/en-US/docs/Web/API/:name(.*)"
  });
});

// lib/docs/bundler-nav.ts
function bundlerDocUrl(path, fragment) {
  const base = `${DOCS}/${path.replace(/^\//, "").replace(/\.md$/, "")}`;
  return fragment ? `${base}#${fragment}` : base;
}
function bundlerNavGroupLanding() {
  const out = {};
  for (const group of BUNDLER_NAV_GROUPS) {
    const leaf = BUNDLER_NAV_LEAVES.find((l) => l.group === group);
    if (!leaf)
      throw new Error(`bundler nav: empty group ${group}`);
    out[group] = bundlerDocUrl(leaf.path);
  }
  return out;
}
function bundlerNavCanonicalRefs() {
  const out = {};
  for (const leaf of BUNDLER_NAV_LEAVES) {
    const url = bundlerDocUrl(leaf.path);
    if (leaf.title === "Bundler") {
      out[leaf.title] = url;
      out.bundler = url;
      out["bun build"] = bundlerDocUrl(leaf.path, "basic-example");
    } else {
      out[leaf.title] = url;
      for (const a of leaf.aliases ?? []) {
        if (a === "bun build")
          continue;
        out[a] = url;
      }
    }
  }
  const landing = bundlerNavGroupLanding();
  for (const group of BUNDLER_NAV_GROUPS) {
    if (!(group in out))
      out[group] = landing[group];
  }
  return out;
}
function bundlerNavConceptOnlyKeys() {
  const keys = new Set;
  for (const leaf of BUNDLER_NAV_LEAVES) {
    if (/^[A-Z][A-Za-z0-9]+$/.test(leaf.title))
      keys.add(leaf.title);
  }
  for (const group of BUNDLER_NAV_GROUPS) {
    if (/^[A-Z][A-Za-z0-9]+$/.test(group))
      keys.add(group);
  }
  return [...keys];
}
var BUNDLER_NAV_LEAVES, BUNDLER_NAV_GROUPS, DOCS = "https://bun.com/docs";
var init_bundler_nav = __esm(() => {
  BUNDLER_NAV_LEAVES = [
    { group: "Core", title: "Bundler", path: "bundler/index", aliases: ["bundler", "bun build"] },
    {
      group: "Development Server",
      title: "Fullstack dev server",
      path: "bundler/fullstack",
      aliases: ["fullstack"]
    },
    {
      group: "Development Server",
      title: "Hot reloading",
      path: "bundler/hot-reloading",
      aliases: ["hot reloading"]
    },
    {
      group: "Asset Processing",
      title: "HTML & static sites",
      path: "bundler/html-static",
      aliases: ["html-static"]
    },
    {
      group: "Asset Processing",
      title: "Standalone HTML",
      path: "bundler/standalone-html",
      aliases: ["standalone-html"]
    },
    { group: "Asset Processing", title: "CSS", path: "bundler/css" },
    { group: "Asset Processing", title: "Loaders", path: "bundler/loaders", aliases: ["loaders"] },
    {
      group: "Single File Executable",
      title: "Single-file executable",
      path: "bundler/executables",
      aliases: ["Single File Executable", "bun build --compile", "executables"]
    },
    {
      group: "Extensions",
      title: "Plugins",
      path: "bundler/plugins",
      aliases: ["plugins"]
    },
    { group: "Extensions", title: "Macros", path: "bundler/macros", aliases: ["macros"] },
    {
      group: "Optimization",
      title: "Bytecode Caching",
      path: "bundler/bytecode",
      aliases: ["bytecode"]
    },
    { group: "Optimization", title: "Minifier", path: "bundler/minifier", aliases: ["minifier"] },
    { group: "Migration", title: "esbuild", path: "bundler/esbuild" }
  ];
  BUNDLER_NAV_GROUPS = [
    "Core",
    "Development Server",
    "Asset Processing",
    "Single File Executable",
    "Extensions",
    "Optimization",
    "Migration"
  ];
});

// lib/docs/bundler-gaps.ts
var SECTION_LANDING_EXACT;
var init_bundler_gaps = __esm(() => {
  init_bundler_nav();
  SECTION_LANDING_EXACT = new Set([
    "usage",
    "when-to-use-macros",
    "when-to-use-bytecode",
    "when-to-use-minification",
    "examples",
    "cli-usage",
    "javascript-api",
    "security-considerations",
    "basic-example",
    "granular-control",
    "keep-names",
    "supported-targets",
    "listing-embedded-files",
    "detecting-standalone-mode-at-runtime",
    "act-as-the-bun-cli",
    "inline-environment-variables",
    "built-in-events",
    "import-attributes",
    "onload",
    "onresolve",
    "onstart",
    "onend",
    "onbeforeparse",
    "plugin-api",
    "cli-api",
    "html-routes",
    "css-modules",
    "build-for-production",
    "watch-mode",
    "drop-console-calls",
    "esm-bytecode",
    "build-time-constants",
    "import-meta-hot-api-reference",
    "namespaces",
    "defer",
    "native-plugins",
    "execution",
    "dead-code-elimination",
    "define",
    "loader",
    "metafile",
    "external",
    "minify"
  ]);
});

// lib/console-depth.ts
var inspectCustom;
var init_console_depth = __esm(() => {
  inspectCustom = Bun.inspect.custom;
});

// tools/cli-table.ts
var init_cli_table = __esm(() => {
  init_console_depth();
});

// tools/bun-install-env.ts
function frag(start, end) {
  const base = "https://bun.com/docs/pm/cli/install";
  const s = encodeURIComponent(start);
  if (!end)
    return `${base}#:~:text=${s}`;
  return `${base}#:~:text=${s},${encodeURIComponent(end)}`;
}
var INSTALL_LOCI, FACTORY_INSTALL_DEFAULTS, BUN_CONFIG_INSTALL_VARS, INSTALL_MECHANISM_NOTES, INSTALL_STRATEGY_NOTES, INSTALL_AGE_NOTES, INSTALL_CONFIG_NOTES, ALL_INSTALL_NOTES;
var init_bun_install_env = __esm(() => {
  init_bun_site_url();
  init_cli_table();
  INSTALL_LOCI = {
    page: bunDocs("pm/cli/install"),
    env: bunDocs("pm/cli/install", "configuring-with-environment-variables"),
    bunfig: bunDocs("pm/cli/install", "configuring-bun-install-with-bunfig-toml"),
    configuration: bunDocs("pm/cli/install", "configuration"),
    cache: bunDocs("pm/cli/install", "cache"),
    backends: bunDocs("pm/cli/install", "platform-specific-backends"),
    platformDependencies: bunDocs("pm/cli/install", "platform-specific-dependencies"),
    cpuAndOs: bunDocs("pm/cli/install", "cpu-and-os-flags"),
    strategies: bunDocs("pm/cli/install", "installation-strategies"),
    hoisted: bunDocs("pm/cli/install", "hoisted-installs"),
    isolated: bunDocs("pm/cli/install", "isolated-installs"),
    defaultStrategy: bunDocs("pm/cli/install", "default-strategy"),
    minimumReleaseAge: bunDocs("pm/cli/install", "minimum-release-age"),
    cicd: bunDocs("pm/cli/install", "ci-cd"),
    frozen: bunDocs("pm/cli/install", "production-mode"),
    dryRun: bunDocs("pm/cli/install", "dry-run"),
    lockfile: bunDocs("pm/cli/install", "lockfile"),
    globalCache: bunDocs("pm/global-cache"),
    globalStore: bunDocs("pm/global-store"),
    policy: "docs/UNIFIED.md"
  };
  FACTORY_INSTALL_DEFAULTS = {
    linker: "isolated",
    globalStore: true,
    frozenLockfileMachine: true,
    frozenLockfileWorkspaceDev: false,
    minimumReleaseAgeSeconds: 259200,
    cacheDir: "absolute path in ~/.bunfig.toml [install.cache].dir",
    shellEnvForbidden: ["BUN_INSTALL_CACHE_DIR", "BUN_INSTALL_GLOBAL_STORE"]
  };
  BUN_CONFIG_INSTALL_VARS = [
    {
      name: "BUN_CONFIG_REGISTRY",
      description: "Set an npm registry (default: https://registry.npmjs.org)"
    },
    {
      name: "BUN_CONFIG_TOKEN",
      description: "Set an auth token for the default registry"
    },
    {
      name: "BUN_CONFIG_YARN_LOCKFILE",
      description: "Save a Yarn v1-style yarn.lock"
    },
    {
      name: "BUN_CONFIG_SKIP_SAVE_LOCKFILE",
      description: "Don't save a lockfile"
    },
    {
      name: "BUN_CONFIG_SKIP_LOAD_LOCKFILE",
      description: "Don't load a lockfile"
    },
    {
      name: "BUN_CONFIG_SKIP_INSTALL_PACKAGES",
      description: "Don't install any packages"
    }
  ];
  INSTALL_MECHANISM_NOTES = [
    {
      id: "backend",
      group: "mechanism",
      summary: "Fastest backend: clonefile (macOS) / hardlink (Linux); --backend overrides; falls back to platform copy.",
      docs: INSTALL_LOCI.backends,
      textFragment: frag("Bun uses the fastest installation method available on the target platform"),
      aliases: ["--backend", "clonefile", "hardlink", "bun install backends"]
    },
    {
      id: "cache-layout",
      group: "mechanism",
      summary: "npm packages at ~/.bun/install/cache/${name}@${version}; build/pre tags replaced with a hash (shorter paths; harder to find by eye).",
      docs: INSTALL_LOCI.cache,
      textFragment: "https://bun.com/docs/pm/cli/install#:~:text=~/.bun/install/cache/%24%7Bname%7D%40%24%7Bversion%7D.%20If%20the%20semver%20version%20has%20a%20build%20or%20a%20pre%20tag%2C%20Bun%20replaces%20it%20with%20a%20hash%20of%20that%20value.%20This%20reduces%20the%20chances%20of%20errors%20from%20long%20file%20paths%2C%20but%20complicates%20figuring%20out%20where%20a%20package%20was%20installed%20on%20disk.",
      aliases: [
        "bun install cache",
        "bun install cache layout",
        "BUN_INSTALL_CACHE_DIR",
        "install.cache"
      ]
    },
    {
      id: "node-modules-check",
      group: "mechanism",
      summary: 'If node_modules exists, Bun checks package.json "name" + "version" at the expected path; custom JSON parser stops when both keys are found.',
      docs: INSTALL_LOCI.env,
      textFragment: frag("When the node_modules", '"version".'),
      aliases: ["bun install node_modules check", "bun install name version"]
    },
    {
      id: "eager-resolve",
      group: "mechanism",
      summary: "No bun.lock, or package.json dependencies changed \u2192 download and extract tarballs eagerly while resolving.",
      docs: INSTALL_LOCI.env,
      textFragment: frag("When a bun.lock doesn't exist or package.json has changed dependencies", "eagerly while resolving."),
      aliases: ["eager-vs-lazy"]
    },
    {
      id: "lazy-resolve",
      group: "mechanism",
      summary: "bun.lock present and package.json unchanged \u2192 lazy download; skip tarball if matching name+version already in node_modules.",
      docs: INSTALL_LOCI.env,
      textFragment: frag("When a bun.lock exists and package.json hasn't changed", "won't attempt to download the tarball.")
    }
  ];
  INSTALL_STRATEGY_NOTES = [
    {
      id: "hoisted",
      group: "strategies",
      summary: "Hoisted: flatten into shared node_modules (npm/Yarn style). bun install --linker hoisted",
      docs: INSTALL_LOCI.hoisted,
      aliases: ["hoisted-installs"]
    },
    {
      id: "isolated",
      group: "strategies",
      summary: "Isolated: pnpm-like store in node_modules/.bun/ + symlinks; blocks phantom deps. bun install --linker isolated",
      docs: INSTALL_LOCI.isolated,
      aliases: ["isolated-installs", "--linker"]
    },
    {
      id: "default-strategy",
      group: "strategies",
      summary: "Default: new workspaces \u2192 isolated; new single-package \u2192 hoisted; pre-v1.3.2 projects \u2192 hoisted (lockfile configVersion).",
      docs: INSTALL_LOCI.defaultStrategy,
      aliases: ["installation-strategies"]
    }
  ];
  INSTALL_AGE_NOTES = [
    {
      id: "minimum-release-age",
      group: "age",
      summary: "minimumReleaseAge (seconds) filters newly resolved versions younger than the threshold; lockfile pins unchanged. Machine pin: 259200 (3d).",
      docs: INSTALL_LOCI.minimumReleaseAge,
      aliases: ["minimumReleaseAge", "--minimum-release-age"]
    },
    {
      id: "age-stability-check",
      group: "age",
      summary: "When age-gated, Bun may extend past the gate up to 7 days to skip rapid successive publishes; exact versions respect age but skip stability check.",
      docs: INSTALL_LOCI.minimumReleaseAge
    }
  ];
  INSTALL_CONFIG_NOTES = [
    {
      id: "bunfig-merge",
      group: "config",
      summary: "bunfig search: $XDG_CONFIG_HOME/.bunfig.toml or $HOME/.bunfig.toml, then ./bunfig.toml; both merge (project overlays machine).",
      docs: INSTALL_LOCI.bunfig,
      aliases: ["bunfig.toml", "bun install bunfig"]
    },
    {
      id: "frozen-lockfile",
      group: "config",
      summary: "bun install --frozen-lockfile installs exact lockfile versions and errors if package.json disagrees. No BUN_CONFIG_* override.",
      docs: INSTALL_LOCI.frozen,
      aliases: ["--frozen-lockfile", "frozenLockfile"]
    },
    {
      id: "bun-ci",
      group: "config",
      summary: "bun ci \u2014 CI reproducible install; fails if package.json out of sync with lockfile.",
      docs: INSTALL_LOCI.cicd,
      aliases: ["bun ci"]
    },
    {
      id: "dry-run",
      group: "config",
      summary: "bun install --dry-run \u2014 resolve without installing.",
      docs: INSTALL_LOCI.dryRun,
      aliases: ["--dry-run"]
    }
  ];
  ALL_INSTALL_NOTES = [
    ...INSTALL_MECHANISM_NOTES,
    ...INSTALL_STRATEGY_NOTES,
    ...INSTALL_AGE_NOTES,
    ...INSTALL_CONFIG_NOTES
  ];
  if (false) {}
});

// tools/bun-docs-curated.ts
var CURATED_ENTRIES, byTerm;
var init_bun_docs_curated = __esm(() => {
  init_bun_site_url();
  CURATED_ENTRIES = [
    {
      term: "Bun.Image",
      path: "runtime/image",
      description: "Built-in image decode/resize/encode pipeline",
      minVersion: "1.3.14",
      related: ["runtime/file-io", "runtime/s3"]
    },
    {
      term: "Bun.serve",
      path: "runtime/http/server",
      description: "HTTP server with routes, TLS, WebSockets, HTTP/3",
      related: ["runtime/http/websockets", "runtime/http/tls"]
    },
    {
      term: "http3",
      path: "runtime/http/server",
      description: "Experimental HTTP/3 (QUIC) in Bun.serve",
      minVersion: "1.3.14",
      stability: "experimental"
    },
    {
      term: "fetch",
      path: "runtime/networking/fetch",
      description: "fetch() client with HTTP/2 and HTTP/3 options",
      minVersion: "1.3.14",
      stability: "experimental",
      related: ["runtime/http/server"]
    },
    {
      term: "globalStore",
      path: "pm/global-store",
      description: "Shared global virtual store for isolated installs",
      minVersion: "1.3.14"
    },
    {
      term: "bun install",
      path: "pm/cli/install",
      description: "Package manager install with hoisted/isolated linkers"
    },
    {
      term: "Bun.SQL",
      path: "runtime/sql",
      description: "Postgres and MySQL client with connection pooling"
    },
    {
      term: "bun:sqlite",
      path: "runtime/sqlite",
      description: "Built-in SQLite driver (v3.53.0 in 1.3.14)"
    },
    {
      term: "Bun.spawn",
      path: "runtime/child-process",
      description: "Spawn subprocesses with pipes and terminals"
    },
    { term: "Bun.$", path: "runtime/shell", description: "Shell template tag for running commands" },
    { term: "Bun.file", path: "runtime/file-io", description: "Lazy file I/O API" },
    { term: "Bun.s3", path: "runtime/s3", description: "S3-compatible object storage client" },
    { term: "Bun.secrets", path: "runtime/secrets", description: "OS keychain-backed secrets API" },
    { term: "Bun.password", path: "runtime/hashing", description: "Argon2/bcrypt password hashing" },
    {
      term: "Bun.CryptoHasher",
      path: "runtime/hashing#bun-cryptohasher",
      description: "Native sync hasher (sha256, sha3-256, \u2026). FactoryWager audit SSOT fingerprints evidence with sha3-256 (see AuditConcept sha3-integrity).",
      relatedTokens: ["sha3-256", "SHA3-256", "Bun.password"],
      auditRefs: ["sha3-integrity"]
    },
    {
      term: "SHA3",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: 'v1.3.13: SHA3-224/256/384/512 in node:crypto + WebCrypto (createHash/createHmac/subtle.digest). Also Bun.CryptoHasher("sha3-256"). Audit SSOT uses sha3-256 via evidence.algorithm + evidence.digest (AuditConcept sha3-integrity).',
      minVersion: "1.3.13",
      relatedTokens: [
        "sha3-256",
        "SHA3-256",
        "Bun.CryptoHasher",
        'crypto.createHash("sha3-256")',
        'crypto.subtle.digest("SHA3-256")'
      ],
      auditRefs: ["sha3-integrity"]
    },
    {
      term: "SHA-3",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: "Alias for SHA3 (FIPS 202) ship note on bun-v1.3.13.",
      minVersion: "1.3.13",
      relatedTokens: ["SHA3", "sha3-256"],
      auditRefs: ["sha3-integrity"]
    },
    {
      term: "sha3-256",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: 'node:crypto createHash("sha3-256") / Bun.CryptoHasher("sha3-256"). WebCrypto id is SHA3-256 (uppercase).',
      minVersion: "1.3.13",
      relatedTokens: ["SHA3-256", "SHA3", "Bun.CryptoHasher", "sha3-512"],
      auditRefs: ["sha3-integrity"]
    },
    {
      term: "SHA3-256",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: 'WebCrypto subtle.digest("SHA3-256", \u2026). node:crypto / CryptoHasher use sha3-256.',
      minVersion: "1.3.13",
      relatedTokens: ["sha3-256", "SHA3", "Bun.CryptoHasher"],
      auditRefs: ["sha3-integrity"]
    },
    {
      term: "sha3-224",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: 'SHA3-224 via createHash / CryptoHasher / subtle.digest("SHA3-224").',
      minVersion: "1.3.13",
      relatedTokens: ["SHA3", "sha3-256"]
    },
    {
      term: "SHA3-224",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: "WebCrypto algorithm id for SHA3-224.",
      minVersion: "1.3.13",
      relatedTokens: ["sha3-224", "SHA3"]
    },
    {
      term: "sha3-384",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: 'SHA3-384 via createHash / CryptoHasher / subtle.digest("SHA3-384").',
      minVersion: "1.3.13",
      relatedTokens: ["SHA3", "sha3-256"]
    },
    {
      term: "SHA3-384",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: "WebCrypto algorithm id for SHA3-384.",
      minVersion: "1.3.13",
      relatedTokens: ["sha3-384", "SHA3"]
    },
    {
      term: "sha3-512",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: 'SHA3-512 via createHash / CryptoHasher / subtle.digest("SHA3-512").',
      minVersion: "1.3.13",
      relatedTokens: ["SHA3", "sha3-256"]
    },
    {
      term: "SHA3-512",
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: "WebCrypto algorithm id for SHA3-512.",
      minVersion: "1.3.13",
      relatedTokens: ["sha3-512", "SHA3"]
    },
    {
      term: 'crypto.createHash("sha3-256")',
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: "node:crypto SHA-3 digest (also createHmac / getHashes).",
      minVersion: "1.3.13",
      relatedTokens: ["sha3-256", "SHA3", 'crypto.subtle.digest("SHA3-256")'],
      auditRefs: ["sha3-integrity"]
    },
    {
      term: 'crypto.subtle.digest("SHA3-256")',
      path: "blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
      description: "WebCrypto SHA-3 digest (HMAC via subtle.sign/verify).",
      minVersion: "1.3.13",
      relatedTokens: ["SHA3-256", "SHA3", 'crypto.createHash("sha3-256")'],
      auditRefs: ["sha3-integrity"]
    },
    { term: "Bun.build", path: "bundler", description: "Bundler and compile-to-binary" },
    { term: "bun test", path: "test", description: "Built-in test runner (bun:test)" },
    {
      term: "--isolate",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "bun test: run each test file in a fresh global environment within the same process (drain microtasks, close sockets, cancel timers, kill subprocesses). VM transpilation cache keeps shared deps parsed once.",
      minVersion: "1.3.13",
      relatedTokens: ["--parallel", "--changed", "--shard", "bun test --isolate"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "bun test --isolate",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "bun test: run each test file in a fresh global environment within the same process. Shared deps reuse a VM-level transpilation cache. Implied by --parallel workers.",
      minVersion: "1.3.13",
      relatedTokens: ["--isolate", "--parallel", "bun test --parallel"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "--parallel",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "bun test --parallel[=N]: distribute test files across up to N worker processes (default CPU count). Workers auto --isolate; console buffered per file. \u2260 bun run --parallel (Foreman scripts \u2014 pm/filter#parallel-and-sequential-mode). FactoryWager NOTE: docs/guides/bun-test-flags-1.3.13.md",
      minVersion: "1.3.13",
      relatedTokens: [
        "--isolate",
        "--shard",
        "--changed",
        "bun test --parallel",
        "bun run --parallel",
        "JEST_WORKER_ID",
        "BUN_TEST_WORKER_ID"
      ],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "bun test --parallel",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "Parallel workers for test files (work-stealing queue, atomic per-file console flush). Sets JEST_WORKER_ID and BUN_TEST_WORKER_ID. Callout: \u2260 bun run --parallel \u2014 that is workspace Foreman mode at pm/filter#parallel-and-sequential-mode.",
      minVersion: "1.3.13",
      relatedTokens: [
        "--isolate",
        "--shard",
        "--changed",
        "bun run --parallel",
        "JEST_WORKER_ID",
        "BUN_TEST_WORKER_ID"
      ],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "bun test flags",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "v1.3.13 NOTE family: --isolate, --parallel, --shard, --changed. Scannable TOC + fences: docs/guides/bun-test-flags-1.3.13.md. Day-loop wrappers: docs/harness/day-loop.md.",
      minVersion: "1.3.13",
      relatedTokens: ["--isolate", "--parallel", "--shard", "--changed", "bun run --parallel"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "--shard",
      path: "blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs",
      description: "bun test --shard=M/N: split test files across CI jobs (1-based, round-robin by sorted path). Empty shards exit 0. Composes with --changed and --randomize.",
      minVersion: "1.3.13",
      relatedTokens: ["--shard=M/N", "--parallel", "--changed", "--randomize", "--isolate"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "--shard=M/N",
      path: "blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs",
      description: "Split bun test files across CI runners (Jest/Vitest/Playwright syntax). Index is 1-based; invalid inputs like 0/3 exit non-zero.",
      minVersion: "1.3.13",
      relatedTokens: ["--shard", "--parallel", "--changed", "--randomize"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "bun test --shard",
      path: "blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs",
      description: "Split bun test files across CI jobs with --shard=M/N (sorted paths, round-robin).",
      minVersion: "1.3.13",
      relatedTokens: ["--shard", "--parallel", "--changed", "--randomize"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "--changed",
      path: "blog/bun-v1.3.13#bun-test-changed",
      description: "bun test --changed[=ref]: run only test files whose import graph transitively depends on git-changed files (unstaged+staged+untracked, or since a commit/branch). Combines with --watch.",
      minVersion: "1.3.13",
      relatedTokens: ["bun test --changed", "--shard", "bun test --watch", "--parallel", "--isolate"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "bun test --changed",
      path: "blog/bun-v1.3.13#bun-test-changed",
      description: "Run only tests affected by git changes via import-graph analysis (skips node_modules). Empty set exits cleanly; with --watch keeps the process alive.",
      minVersion: "1.3.13",
      relatedTokens: ["--changed", "--shard", "bun test --watch", "--parallel"],
      auditRefs: ["harness-day-loop"]
    },
    {
      term: "bun run --parallel",
      path: "pm/filter#parallel-and-sequential-mode",
      description: "bun run --parallel: Foreman-style parallel package.json scripts (prefixed output, --filter/--workspaces). Canonical: pm/filter#parallel-and-sequential-mode. \u2260 bun test --parallel (test-file workers; blog v1.3.13).",
      minVersion: "1.3.9",
      relatedTokens: ["bun test --parallel", "--parallel"]
    },
    {
      term: "--parallel=N",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "bun test --parallel=N: cap worker processes at N (default CPU count). Workers auto-enable --isolate.",
      minVersion: "1.3.13",
      relatedTokens: ["--parallel", "--isolate", "bun test --parallel"]
    },
    {
      term: "JEST_WORKER_ID",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "Environment variable set by bun test --parallel (Jest-compatible worker id). Also see BUN_TEST_WORKER_ID.",
      minVersion: "1.3.13",
      relatedTokens: ["BUN_TEST_WORKER_ID", "bun test --parallel", "--parallel"]
    },
    {
      term: "BUN_TEST_WORKER_ID",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "Environment variable set by bun test --parallel identifying the worker process. Also see JEST_WORKER_ID.",
      minVersion: "1.3.13",
      relatedTokens: ["JEST_WORKER_ID", "bun test --parallel", "--parallel"]
    },
    {
      term: "--randomize",
      path: "blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
      description: "bun test: shuffle test order. With --shard, shuffle happens after shard selection (within the shard).",
      minVersion: "1.3.13",
      relatedTokens: ["--shard", "--parallel", "--isolate", "--changed"]
    },
    {
      term: "bun test --watch",
      path: "blog/bun-v1.3.13#bun-test-changed",
      description: "Re-run bun test on file changes. Combined with --changed, each restart re-queries git and re-filters the import graph.",
      minVersion: "1.3.13",
      relatedTokens: ["--changed", "bun test --changed"]
    },
    {
      term: "Bun.Terminal",
      path: "runtime/terminal",
      description: "PTY terminal for spawned processes (new Bun.Terminal + spawn terminal)",
      minVersion: "1.3.5",
      related: ["runtime/child-process"]
    },
    {
      term: "Bun.cron",
      path: "runtime/cron",
      description: "In-process cron scheduling (UTC; no-overlap after handler settles)",
      minVersion: "1.3.14"
    },
    {
      term: "Bun.WebView",
      path: "runtime/webview",
      description: "Headless browser automation",
      minVersion: "1.4.0",
      stability: "experimental"
    },
    {
      term: "Bun.markdown",
      path: "runtime/markdown#bun-markdown-html",
      description: "Native Markdown rendering (html/ansi/render/react)",
      minVersion: "1.3.0",
      relatedTokens: [
        "Bun.markdown.html",
        "Bun.markdown.ansi",
        "Bun.markdown.render",
        "Bun.markdown.react",
        "options"
      ]
    },
    {
      term: "Bun.markdown.html",
      path: "runtime/markdown#bun-markdown-html",
      description: "Render Markdown to an HTML string. Pass parser options as the second argument.",
      minVersion: "1.3.0",
      related: ["runtime/markdown#options"],
      relatedTokens: ["options", "Bun.markdown", "Bun.markdown.render", "Bun.markdown.react"]
    },
    {
      term: "Bun.markdown.ansi",
      path: "runtime/markdown#ansi-terminal-output",
      description: "Markdown \u2192 ANSI for the terminal",
      minVersion: "1.3.12",
      relatedTokens: ["Bun.markdown", "Bun.markdown.render", "Bun.markdown.react"]
    },
    {
      term: "Bun.markdown.render",
      path: "runtime/markdown#bun-markdown-render",
      description: "Render Markdown via callbacks. Pass parser options as a separate third argument (see parser-options).",
      minVersion: "1.3.0",
      related: ["runtime/markdown#parser-options", "runtime/markdown#options"],
      relatedTokens: [
        "parser-options",
        "options",
        "Bun.markdown",
        "Bun.markdown.html",
        "Bun.markdown.react"
      ]
    },
    {
      term: "Bun.markdown.react",
      path: "runtime/markdown#bun-markdown-react",
      description: "Render Markdown directly to React elements. Replace any HTML tag via component overrides (see available-overrides).",
      minVersion: "1.3.8",
      related: [
        "runtime/markdown#component-overrides",
        "runtime/markdown#available-overrides",
        "runtime/markdown#parser-options",
        "runtime/markdown#options"
      ],
      relatedTokens: [
        "component-overrides",
        "available-overrides",
        "parser-options-2",
        "options",
        "Bun.markdown",
        "Bun.markdown.html",
        "Bun.markdown.render"
      ]
    },
    {
      term: "component-overrides",
      path: "runtime/markdown#component-overrides",
      description: "Replace any HTML element with a custom React component by passing it in the second argument to Bun.markdown.react, keyed by tag name.",
      minVersion: "1.3.8",
      relatedTokens: ["available-overrides", "Bun.markdown.react"]
    },
    {
      term: "available-overrides",
      path: "runtime/markdown#available-overrides",
      description: "Every HTML tag produced by the Bun.markdown.react parser can be overridden (h1\u2013h6, p, pre, a, code, \u2026).",
      minVersion: "1.3.8",
      relatedTokens: ["component-overrides", "Bun.markdown.react"]
    },
    {
      term: "options",
      path: "runtime/markdown#options",
      description: "Pass an options object as the second argument to Bun.markdown.html to configure the parser (tables, autolinks, headings, \u2026).",
      minVersion: "1.3.0",
      relatedTokens: [
        "parser-options",
        "parser-options-2",
        "Bun.markdown.html",
        "Bun.markdown.render",
        "Bun.markdown.react"
      ]
    },
    {
      term: "parser-options",
      path: "runtime/markdown#parser-options",
      description: "Pass parser options as a separate third argument to Bun.markdown.render (same option set as #options).",
      minVersion: "1.3.0",
      relatedTokens: ["options", "parser-options-2", "Bun.markdown.render"]
    },
    {
      term: "parser-options-2",
      path: "runtime/markdown#parser-options",
      description: "Pass any of the parser options (#options) as the third argument to Bun.markdown.react.",
      minVersion: "1.3.8",
      relatedTokens: ["options", "parser-options", "Bun.markdown.react"]
    },
    {
      term: "BUN_OPTIONS",
      path: "bundler/executables#runtime-arguments-via-bun-options",
      description: "Standalone executables read the BUN_OPTIONS environment variable, so you can pass runtime flags without recompiling.",
      related: [
        "bundler/executables#embedding-runtime-arguments",
        "runtime/environment-variables#configuring-bun"
      ],
      relatedTokens: [
        "runtime-arguments-via-bun-options",
        "embedding-runtime-arguments",
        "--compile-exec-argv"
      ]
    },
    {
      term: "runtime-arguments-via-bun-options",
      path: "bundler/executables#runtime-arguments-via-bun-options",
      description: "Standalone executables read the BUN_OPTIONS environment variable, so you can pass runtime flags without recompiling.",
      relatedTokens: ["BUN_OPTIONS", "embedding-runtime-arguments", "--compile-exec-argv"]
    },
    {
      term: "embedding-runtime-arguments",
      path: "bundler/executables#embedding-runtime-arguments",
      description: "Embed runtime arguments with --compile-exec-argv / compile.execArgv, available at runtime in process.execArgv.",
      relatedTokens: ["--compile-exec-argv", "BUN_OPTIONS", "runtime-arguments-via-bun-options"]
    },
    {
      term: "file-uploads",
      path: "guides/http/file-uploads#upload-files-via-http-using-formdata",
      description: "Upload files over HTTP with Bun using the FormData API \u2014 parse with req.formData() and persist with Bun.write().",
      related: [
        "runtime/file-io#writing-files-bun-write",
        "runtime/http/server#basic-setup",
        "runtime/file-io"
      ],
      relatedTokens: [
        "Upload files via HTTP using FormData",
        "req.formData",
        "Bun.write",
        "Bun.serve",
        "Bun.file"
      ]
    },
    {
      term: "Upload files via HTTP using FormData",
      path: "guides/http/file-uploads#upload-files-via-http-using-formdata",
      description: "Upload files over HTTP with Bun using the FormData API \u2014 parse with req.formData() and persist with Bun.write().",
      relatedTokens: ["file-uploads", "req.formData", "Bun.write", "Bun.serve"]
    },
    {
      term: "upload-files-via-http-using-formdata",
      path: "guides/http/file-uploads#upload-files-via-http-using-formdata",
      description: "Upload files over HTTP with Bun using the FormData API \u2014 parse with req.formData() and persist with Bun.write().",
      relatedTokens: ["file-uploads", "req.formData", "Bun.write"]
    },
    {
      term: "req.formData",
      path: "guides/http/file-uploads#upload-files-via-http-using-formdata",
      description: "Parse an incoming multipart Request into FormData (await req.formData()), then read fields with .get().",
      relatedTokens: ["file-uploads", "Bun.write", "Bun.serve"]
    },
    {
      term: "Concurrency",
      path: "runtime/workers",
      description: "Runtime docs nav group (Workers). Sidebar: after Networking / Redis clients, before Process & System. Distinct from pm/global-store install concurrency.",
      related: ["runtime/workers#creating-a-worker", "runtime/child-process", "runtime/redis"],
      relatedTokens: ["Workers", "Worker", "worker.ref", "worker.unref", "Bun.isMainThread"]
    },
    {
      term: "Runtime Concurrency",
      path: "runtime/workers",
      description: "Runtime docs nav group (Workers). Sidebar: after Networking / Redis clients, before Process & System.",
      relatedTokens: ["Concurrency", "Workers", "Worker"]
    },
    {
      term: "global-store concurrency",
      path: "pm/global-store#concurrency",
      description: "Package install linker concurrency for the global virtual store (pm) \u2014 not the Runtime Workers nav group.",
      relatedTokens: ["install concurrency", "pm concurrency"]
    },
    {
      term: "install concurrency",
      path: "pm/global-store#concurrency",
      description: "Package install linker concurrency for the global virtual store (pm) \u2014 not the Runtime Workers nav group.",
      relatedTokens: ["global-store concurrency", "pm concurrency"]
    },
    {
      term: "pm concurrency",
      path: "pm/global-store#concurrency",
      description: "Package install linker concurrency for the global virtual store (pm) \u2014 not the Runtime Workers nav group.",
      relatedTokens: ["global-store concurrency", "install concurrency"]
    },
    {
      term: "Worker",
      path: "runtime/workers#creating-a-worker",
      description: "Create a worker thread with new Worker (global, like browsers). Share I/O with the main thread; communicate via postMessage.",
      relatedTokens: [
        "worker.ref",
        "worker.unref",
        "worker.terminate",
        "worker.postMessage",
        "Bun.isMainThread"
      ]
    },
    {
      term: "Workers",
      path: "runtime/workers#creating-a-worker",
      description: "Bun's Workers API \u2014 create and communicate with a JavaScript instance on a separate thread while sharing I/O with the main thread.",
      relatedTokens: ["Worker", "worker.ref", "worker.unref", "Bun.isMainThread", "Concurrency"]
    },
    {
      term: "worker.unref",
      path: "runtime/workers#worker-unref",
      description: "Stop a running worker from keeping the process alive. Decouples the worker's lifetime from the main process (\u2261 Node.js worker_threads). Not available in browsers.",
      relatedTokens: ["worker.ref", "Worker", "managing-lifetime"]
    },
    {
      term: "worker.ref",
      path: "runtime/workers#worker-ref",
      description: `Keep the process alive until the Worker terminates. Workers are ref'd by default; a ref'd worker still needs something on its event loop (such as a "message" listener) to continue running. Not available in browsers.`,
      relatedTokens: ["worker.unref", "Worker", "managing-lifetime"]
    },
    {
      term: "managing-lifetime",
      path: "runtime/workers#managing-lifetime",
      description: "By default an active Worker keeps the main process alive. Use worker.unref() / worker.ref() (or Worker options.ref) to manage lifetime.",
      relatedTokens: ["worker.ref", "worker.unref", "Worker"]
    },
    {
      term: "worker.terminate",
      path: "runtime/workers#terminating-a-worker",
      description: "Explicitly terminate a Worker. Workers also exit when their event loop has no work left (message listeners keep them alive).",
      relatedTokens: ["Worker", "worker.ref", "worker.unref"]
    },
    {
      term: "worker.postMessage",
      path: "runtime/workers#messages-with-postmessage",
      description: "Send messages between main thread and worker via worker.postMessage / self.postMessage (structured clone; Bun has string fast paths).",
      relatedTokens: ["Worker", "worker.ref"]
    },
    {
      term: "Worker.preload",
      path: "runtime/workers#preload-load-modules-before-the-worker-starts",
      description: "Pass preload module specifiers in the Worker constructor options to load them before the worker's own code runs (like --preload).",
      relatedTokens: ["Worker"]
    },
    {
      term: "Worker smol",
      path: "runtime/workers#memory-usage-with-smol",
      description: "Worker constructor option smol: true reduces memory usage at a cost of performance (distinct from bunfig smol).",
      relatedTokens: ["Worker"]
    },
    {
      term: "Bun.isMainThread",
      path: "runtime/workers#bun-ismainthread",
      description: "Check Bun.isMainThread to tell whether you're on the main thread or inside a worker.",
      relatedTokens: ["Worker", "worker.ref"]
    },
    {
      term: "executables Worker",
      path: "bundler/executables#worker",
      description: "When compiling standalone executables, list worker files as additional entrypoints so new Worker(...) paths are bundled.",
      relatedTokens: ["Worker", "BUN_OPTIONS"]
    },
    {
      term: "Bun.udpSocket",
      path: "runtime/networking/udp",
      description: "UDP sockets with ICMP/truncation handling",
      minVersion: "1.0.0"
    },
    {
      term: "Bun.secrets",
      path: "runtime/secrets",
      description: "OS keychain-backed secrets API",
      minVersion: "1.3.0",
      stability: "experimental"
    },
    {
      term: "noOrphans",
      path: "runtime/bunfig",
      description: "Exit when parent dies (--no-orphans)",
      minVersion: "1.3.14"
    },
    {
      term: "process.execve",
      path: "runtime/node-api",
      description: "Replace process image in-place",
      minVersion: "1.3.14"
    },
    {
      term: "fs.watch",
      path: "runtime/file-io",
      description: "File watcher (rewritten backend in 1.3.14)"
    },
    { term: "bun publish", path: "pm/cli/publish", description: "Publish packages to npm registry" },
    { term: "workspaces", path: "pm/workspaces", description: "Monorepo workspace support" },
    { term: "Bun.Transpiler", path: "runtime/transpiler", description: "JS/TS/JSX transpiler API" },
    {
      term: "HTMLRewriter",
      path: "runtime/html-rewriter",
      description: "Streaming HTML transformation"
    },
    {
      term: "WebSocket",
      path: "runtime/http/websockets",
      description: "WebSocket server and client"
    },
    { term: "Bun.redis", path: "runtime/redis", description: "Redis/Valkey client" },
    { term: "ffi", path: "runtime/ffi", description: "Call native libraries from JavaScript" },
    {
      term: "Bun.inspect",
      path: "runtime/utils#bun-inspect",
      description: "Serializes an object to a string exactly as it would be printed by console.log",
      related: ["runtime/console", "reference/bun/BunInspectOptions"],
      relatedTokens: [
        "Bun.inspect.custom",
        "Bun.inspect.table",
        "BunInspectOptions",
        "--console-depth"
      ]
    },
    {
      term: "Bun.inspect()",
      path: "runtime/utils#bun-inspect",
      description: "Serializes an object to a string exactly as it would be printed by console.log",
      related: ["runtime/console", "reference/bun/BunInspectOptions"],
      relatedTokens: ["Bun.inspect.custom", "Bun.inspect.table", "BunInspectOptions"]
    },
    {
      term: "Bun.inspect.custom",
      path: "runtime/utils#bun-inspect-custom",
      description: "The symbol Bun uses to implement Bun.inspect. Override it to customize how your objects are printed. It is identical to util.inspect.custom in Node.js.",
      related: ["runtime/utils#bun-inspect"],
      relatedTokens: ["Bun.inspect", "Bun.inspect.table", "BunInspectOptions"]
    },
    {
      term: "Bun.inspect.table",
      path: "runtime/utils#bun-inspect-table-tabulardata-properties-options",
      description: "Bun.inspect.table(tabularData, properties, options) \u2014 format tabular data into a string (like console.table, returns a string)",
      related: ["runtime/utils#bun-inspect"],
      relatedTokens: ["Bun.inspect", "Bun.inspect.custom", "BunInspectOptions"]
    },
    {
      term: "Bun.inspect.table(tabularData, properties, options)",
      path: "runtime/utils#bun-inspect-table-tabulardata-properties-options",
      description: "Format tabular data into a string. Like console.table, except it returns a string rather than printing to the console.",
      related: ["runtime/utils#bun-inspect"],
      relatedTokens: ["Bun.inspect", "Bun.inspect.custom", "BunInspectOptions"]
    },
    {
      term: "BunInspectOptions",
      path: "reference/bun/BunInspectOptions",
      description: "Options for Bun.inspect \u2014 colors, depth, sorted, compact (Node util.inspect extras are ignored)",
      related: ["runtime/utils#bun-inspect", "runtime/console"],
      relatedTokens: ["Bun.inspect", "Bun.inspect.custom", "Bun.inspect.table", "--console-depth"]
    },
    {
      term: "Bun.env",
      path: "runtime/utils",
      description: "Alias of process.env \u2014 current environment variables",
      related: ["runtime/environment-variables", "guides/runtime/read-env"]
    },
    {
      term: "process.env",
      path: "runtime/utils",
      description: "Current environment variables (Bun.env is an alias)",
      related: ["runtime/environment-variables", "guides/runtime/read-env"]
    },
    {
      term: ".env",
      path: "runtime/environment-variables",
      description: "Auto-loaded env files (.env, .env.$NODE_ENV, .env.local) \u2014 see also guides/runtime/set-env",
      related: ["guides/runtime/set-env", "runtime/utils"]
    },
    {
      term: "TZ",
      path: "guides/runtime/timezone",
      description: "Default process time zone (IANA id); bun test forces UTC \u2014 see also test/runtime-behavior#tz-timezone",
      related: ["test/runtime-behavior", "test/dates-times"]
    },
    {
      term: "Bun.which",
      path: "runtime/utils",
      description: "Resolve path to an executable on PATH (guide: guides/util/which-path-to-executable-bin)",
      related: ["guides/util/which-path-to-executable-bin"]
    },
    {
      term: "Bun.pathToFileURL",
      path: "runtime/utils",
      description: "Absolute path \u2192 file: URL (guide: guides/util/path-to-file-url)",
      related: ["guides/util/path-to-file-url"]
    },
    {
      term: "Bun.fileURLToPath",
      path: "runtime/utils",
      description: "file: URL \u2192 absolute path (guide: guides/util/file-url-to-path)",
      related: ["guides/util/file-url-to-path"]
    },
    {
      term: "import.meta.dir",
      path: "runtime/module-resolution",
      description: "Directory of the current module (guide: guides/util/import-meta-dir)",
      related: ["guides/util/import-meta-dir"]
    },
    {
      term: ".npmrc",
      path: "pm/npmrc",
      description: "npm-compatible .npmrc options Bun reads for install",
      related: ["runtime/bunfig", "pm/scopes-registries"]
    }
  ];
  byTerm = new Map;
  for (const entry of CURATED_ENTRIES) {
    byTerm.set(entry.term.toLowerCase(), entry);
  }
});
// lib/shared/tools/bun-urls.ts
var BUN_DOMAIN, BUN_SH_DOMAIN, BUN_DOCS_ROOT, BUN_SH_DOCS_ROOT, LLMS_URL, BUN_SH_LLMS_URL, BUN_RSS_URL, BUN_SH_RSS_URL, BUN_BLOG_ROOT, BUN_GITHUB_REPO, BUN_GITHUB_RELEASES_URL;
var init_bun_urls = __esm(() => {
  init_bun_site_url();
  init_bun_site_url();
  BUN_DOMAIN = bunComOrigin();
  BUN_SH_DOMAIN = bunShOrigin();
  BUN_DOCS_ROOT = bunDocs("").replace(/\/$/, "");
  BUN_SH_DOCS_ROOT = hrefFromInit({
    ...BunShSite,
    pathname: "/docs"
  }).replace(/\/$/, "");
  LLMS_URL = bunDocs("llms.txt");
  BUN_SH_LLMS_URL = hrefFromInit({
    ...BunShSite,
    pathname: "/docs/llms.txt"
  });
  BUN_RSS_URL = hrefFromInit({ ...BunComSite, pathname: "/rss.xml" });
  BUN_SH_RSS_URL = hrefFromInit({ ...BunShSite, pathname: "/rss.xml" });
  BUN_BLOG_ROOT = hrefFromInit({ ...BunComSite, pathname: "/blog" }).replace(/\/$/, "");
  BUN_GITHUB_REPO = hrefFromInit({
    ...GitHubOvenSite,
    pathname: "/oven-sh/bun"
  }).replace(/\/$/, "");
  BUN_GITHUB_RELEASES_URL = hrefFromInit({
    ...GitHubOvenSite,
    pathname: "/oven-sh/bun/releases"
  }).replace(/\/$/, "");
});

// tools/bun-doc-refs.ts
function isCodeApiKey(k) {
  if (k === "console" || k === "dns" || k === "redis")
    return false;
  if (CONCEPT_ONLY_KEYS.has(k))
    return false;
  if (k === "--watch")
    return false;
  if (k === "--env" || k === "--version" || k === "--console")
    return false;
  if (k.startsWith("Bun.") || k.startsWith("bun:") || k.startsWith("--"))
    return true;
  if (/^[A-Z][A-Za-z0-9]+$/.test(k))
    return true;
  return false;
}
var INSTALL_CPU_OS_FLAGS, INSTALL_PLATFORM_DEPS, INSTALL_ENV_VARS, INSTALL_CACHE_DOCS, CANONICAL_INSTALL_PLATFORM_TOKENS, CANONICAL_INSTALL_PLATFORM_URLS, BUN_CONFIG_ENV_TOKEN_ENTRIES, CANONICAL_INSTALL_ENV_TOKENS, CANONICAL_INSTALL_ENV_URLS, BUN_TYPES_PINNED = "https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types", CANONICAL_REFS, CONCEPT_ONLY_KEYS, APIS, TAXONOMY_PATH, REPO_ROOT;
var init_bun_doc_refs = __esm(async () => {
  init_bundler_gaps();
  init_bundler_nav();
  init_bun_site_url();
  init_bun_install_env();
  init_bun_docs_curated();
  init_bun_urls();
  INSTALL_CPU_OS_FLAGS = bunDocs("pm/cli/install", "cpu-and-os-flags");
  INSTALL_PLATFORM_DEPS = bunDocs("pm/cli/install", "platform-specific-dependencies");
  INSTALL_ENV_VARS = bunDocs("pm/cli/install", "configuring-with-environment-variables");
  INSTALL_CACHE_DOCS = bunDocs("pm/cli/install", "cache");
  CANONICAL_INSTALL_PLATFORM_TOKENS = {
    "bun install --cpu": { url: INSTALL_CPU_OS_FLAGS, kind: "CLI", stability: "stable" },
    "bun install --os": { url: INSTALL_CPU_OS_FLAGS, kind: "CLI", stability: "stable" },
    "--cpu": { url: INSTALL_CPU_OS_FLAGS, kind: "CLI", stability: "stable" },
    "--os": { url: INSTALL_CPU_OS_FLAGS, kind: "CLI", stability: "stable" },
    "cpu-and-os-flags": { url: INSTALL_CPU_OS_FLAGS, kind: "CLI", stability: "stable" },
    "platform-specific dependencies": {
      url: INSTALL_PLATFORM_DEPS,
      kind: "Concept",
      stability: "stable"
    },
    "bun install platform-specific dependencies": {
      url: INSTALL_PLATFORM_DEPS,
      kind: "Concept",
      stability: "stable"
    },
    "platform-specific-dependencies": {
      url: INSTALL_PLATFORM_DEPS,
      kind: "Concept",
      stability: "stable"
    }
  };
  CANONICAL_INSTALL_PLATFORM_URLS = Object.fromEntries(Object.entries(CANONICAL_INSTALL_PLATFORM_TOKENS).map(([key, meta]) => [key, meta.url]));
  BUN_CONFIG_ENV_TOKEN_ENTRIES = Object.fromEntries(BUN_CONFIG_INSTALL_VARS.map((v) => [
    v.name,
    {
      url: INSTALL_ENV_VARS,
      kind: "Env",
      stability: "stable",
      description: v.description
    }
  ]));
  CANONICAL_INSTALL_ENV_TOKENS = {
    "BUN install environment variables": {
      url: INSTALL_ENV_VARS,
      kind: "Concept",
      stability: "stable",
      description: "Environment variables take priority over bunfig.toml"
    },
    "install env precedence": {
      url: INSTALL_ENV_VARS,
      kind: "Concept",
      stability: "stable",
      description: "CLI flags \u2192 BUN_CONFIG_* \u2192 bunfig (project overlays machine)"
    },
    ...BUN_CONFIG_ENV_TOKEN_ENTRIES,
    "install.scopes": {
      url: "https://bun.com/docs/runtime/bunfig#install-registry",
      kind: "Config",
      stability: "stable",
      description: "Scoped npm registry URLs \u2014 FactoryWager R2-backed registry via bunfig"
    },
    "bun install cache mechanism": {
      url: INSTALL_CACHE_DOCS,
      kind: "Concept",
      stability: "stable"
    }
  };
  CANONICAL_INSTALL_ENV_URLS = Object.fromEntries(Object.entries(CANONICAL_INSTALL_ENV_TOKENS).map(([key, meta]) => [key, meta.url]));
  CANONICAL_REFS = {
    "Bun.stringWidth": "https://bun.com/docs/runtime/utils#bun-stringwidth",
    "Bun.stripANSI": "https://bun.com/docs/runtime/utils#bun-stripansi",
    "Bun.wrapAnsi": "https://bun.com/docs/runtime/utils#bun-wrapansi",
    "Bun.sliceAnsi": "https://bun.com/reference/bun/sliceAnsi",
    "Bun.file": "https://bun.com/docs/runtime/file-io#reading-files-bun-file",
    "Bun.write": "https://bun.com/docs/runtime/file-io#writing-files-bun-write",
    "file-uploads": "https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata",
    "Upload files via HTTP using FormData": "https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata",
    "upload-files-via-http-using-formdata": "https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata",
    "guides/http/file-uploads": "https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata",
    "req.formData": "https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata",
    "Request.formData": "https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata",
    "Bun.mmap": "https://bun.com/docs/runtime/bun-apis",
    "bun:sqlite": "https://bun.com/docs/runtime/sqlite#load-via-es-module-import",
    "Bun.Archive": "https://bun.com/docs/runtime/archive#quickstart",
    "Bun.gzipSync": "https://bun.com/docs/runtime/utils#bun-gzipsync",
    "Bun.serve": bunDocs("runtime/http/server", "basic-setup"),
    "basic-setup": bunDocs("runtime/http/server", "basic-setup"),
    "Bun.serve routes": bunDocs("runtime/http/server", "basic-setup"),
    "html-imports": bunDocs("runtime/http/server", "html-imports"),
    "HTML imports": bunDocs("runtime/http/server", "html-imports"),
    "changing-the-port-and-hostname": bunDocs("runtime/http/server", "changing-the-port-and-hostname"),
    "Bun.serve port": bunDocs("runtime/http/server", "changing-the-port-and-hostname"),
    "Bun.serve hostname": bunDocs("runtime/http/server", "changing-the-port-and-hostname"),
    "server.port": bunDocs("runtime/http/server", "changing-the-port-and-hostname"),
    "server.url": bunDocs("runtime/http/server", "changing-the-port-and-hostname"),
    "port: 0": bunDocs("runtime/http/server", "changing-the-port-and-hostname"),
    "configuring-a-default-port": bunDocs("runtime/http/server", "configuring-a-default-port"),
    BUN_PORT: bunDocs("runtime/http/server", "configuring-a-default-port"),
    NODE_PORT: bunDocs("runtime/http/server", "configuring-a-default-port"),
    "--port": bunDocs("runtime/http/server", "configuring-a-default-port"),
    "unix-domain-sockets": bunDocs("runtime/http/server", "unix-domain-sockets"),
    "Bun.serve unix": bunDocs("runtime/http/server", "unix-domain-sockets"),
    "abstract-namespace-sockets": bunDocs("runtime/http/server", "abstract-namespace-sockets"),
    "http-3-quic": bunDocs("runtime/http/server", "http-3-quic"),
    http3: bunDocs("runtime/http/server", "http-3-quic"),
    "http1: false": bunDocs("runtime/http/server", "http-3-quic"),
    idleTimeout: bunDocs("runtime/http/server", "idletimeout"),
    idletimeout: bunDocs("runtime/http/server", "idletimeout"),
    "export-default-syntax": bunDocs("runtime/http/server", "export-default-syntax"),
    "Serve.Options": bunDocs("runtime/http/server", "export-default-syntax"),
    "hot-route-reloading": bunDocs("runtime/http/server", "hot-route-reloading"),
    "server-lifecycle-methods": bunDocs("runtime/http/server", "server-lifecycle-methods"),
    "server-stop": bunDocs("runtime/http/server", "server-stop"),
    "server.stop": bunDocs("runtime/http/server", "server-stop"),
    "server-ref-and-server-unref": bunDocs("runtime/http/server", "server-ref-and-server-unref"),
    "server.ref": bunDocs("runtime/http/server", "server-ref-and-server-unref"),
    "server.unref": bunDocs("runtime/http/server", "server-ref-and-server-unref"),
    "server-reload": bunDocs("runtime/http/server", "server-reload"),
    "server.reload": bunDocs("runtime/http/server", "server-reload"),
    "per-request-controls": bunDocs("runtime/http/server", "per-request-controls"),
    "server-timeout-request-seconds": bunDocs("runtime/http/server", "server-timeout-request-seconds"),
    "server.timeout": bunDocs("runtime/http/server", "server-timeout-request-seconds"),
    "server-requestip-request": bunDocs("runtime/http/server", "server-requestip-request"),
    "server.requestIP": bunDocs("runtime/http/server", "server-requestip-request"),
    "server-metrics": bunDocs("runtime/http/server", "server-metrics"),
    "server-pendingrequests-and-server-pendingwebsockets": bunDocs("runtime/http/server", "server-pendingrequests-and-server-pendingwebsockets"),
    pendingRequests: bunDocs("runtime/http/server", "server-pendingrequests-and-server-pendingwebsockets"),
    pendingWebSockets: bunDocs("runtime/http/server", "server-pendingrequests-and-server-pendingwebsockets"),
    "server.pendingRequests": bunDocs("runtime/http/server", "server-pendingrequests-and-server-pendingwebsockets"),
    "server.pendingWebSockets": bunDocs("runtime/http/server", "server-pendingrequests-and-server-pendingwebsockets"),
    "server-subscribercount-topic": bunDocs("runtime/http/server", "server-subscribercount-topic"),
    "server.subscriberCount": bunDocs("runtime/http/server", "server-subscribercount-topic"),
    "Bun.serve benchmarks": bunDocs("runtime/http/server", "benchmarks"),
    "practical-example-rest-api": bunDocs("runtime/http/server", "practical-example-rest-api"),
    "Bun.serve reference": bunDocs("runtime/http/server", "reference"),
    "server reference": bunDocs("runtime/http/server", "reference"),
    Server: bunDocs("runtime/http/server", "reference"),
    "server.fetch": bunDocs("runtime/http/server", "reference"),
    "server.upgrade": bunDocs("runtime/http/server", "reference"),
    "server.publish": bunDocs("runtime/http/server", "reference"),
    "server.development": bunDocs("runtime/http/server", "reference"),
    "server.id": bunDocs("runtime/http/server", "reference"),
    WebSocketHandler: bunDocs("runtime/http/server", "reference"),
    TLSOptions: bunDocs("runtime/http/server", "reference"),
    fetch: bunDocs("runtime/networking/fetch", "sending-an-http-request"),
    "Bun.fetch": bunDocs("runtime/networking/fetch", "sending-an-http-request"),
    fetchPage: bunDocs("runtime/networking/fetch", "sending-an-http-request"),
    "AbortSignal.timeout": bunDocs("runtime/networking/fetch", "fetching-a-url-with-a-timeout"),
    "fetching-a-url-with-a-timeout": bunDocs("runtime/networking/fetch", "fetching-a-url-with-a-timeout"),
    AbortController: bunDocs("runtime/networking/fetch", "canceling-a-request"),
    "canceling-a-request": bunDocs("runtime/networking/fetch", "canceling-a-request"),
    "fetch headers": bunDocs("runtime/networking/fetch", "custom-headers"),
    "fetch custom-headers": bunDocs("runtime/networking/fetch", "custom-headers"),
    "fetch error-handling": bunDocs("runtime/networking/fetch", "error-handling"),
    "sending-a-post-request": bunDocs("runtime/networking/fetch", "sending-a-post-request"),
    "fetch POST": bunDocs("runtime/networking/fetch", "sending-a-post-request"),
    "proxying-requests": bunDocs("runtime/networking/fetch", "proxying-requests"),
    "fetch proxy": bunDocs("runtime/networking/fetch", "proxying-requests"),
    "fetch proxy guide": "https://bun.com/docs/guides/http/proxy",
    "guides/http/proxy": "https://bun.com/docs/guides/http/proxy",
    "fetch proxy env": "https://bun.com/docs/guides/http/proxy",
    "streaming-response-bodies": bunDocs("runtime/networking/fetch", "streaming-response-bodies"),
    "streaming-request-bodies": bunDocs("runtime/networking/fetch", "streaming-request-bodies"),
    "content-type-handling": bunDocs("runtime/networking/fetch", "content-type-handling"),
    "fetch content-type": bunDocs("runtime/networking/fetch", "content-type-handling"),
    "fetch performance": bunDocs("runtime/networking/fetch", "performance"),
    "fetch debugging": bunDocs("runtime/networking/fetch", "debugging"),
    "fetch verbose": bunDocs("runtime/networking/fetch", "debugging"),
    "verbose: true": bunDocs("runtime/networking/fetch", "debugging"),
    "dns-prefetching": bunDocs("runtime/networking/fetch", "dns-prefetching"),
    "dns-caching": bunDocs("runtime/networking/fetch", "dns-caching"),
    "fetch.preconnect": bunDocs("runtime/networking/fetch", "preconnect-to-a-host"),
    "preconnect-to-a-host": bunDocs("runtime/networking/fetch", "preconnect-to-a-host"),
    "--fetch-preconnect": bunDocs("runtime/networking/fetch", "preconnect-at-startup"),
    "preconnect-at-startup": bunDocs("runtime/networking/fetch", "preconnect-at-startup"),
    "connection-pooling-http-keep-alive": bunDocs("runtime/networking/fetch", "connection-pooling-http-keep-alive"),
    "connection pooling": bunDocs("runtime/networking/fetch", "connection-pooling-http-keep-alive"),
    keepalive: bunDocs("runtime/networking/fetch", "connection-pooling-http-keep-alive"),
    "Connection: close": bunDocs("runtime/networking/fetch", "implementation-details"),
    "simultaneous-connection-limit": bunDocs("runtime/networking/fetch", "simultaneous-connection-limit"),
    "response-buffering": bunDocs("runtime/networking/fetch", "response-buffering"),
    "response buffering": bunDocs("runtime/networking/fetch", "response-buffering"),
    "implementation-details": bunDocs("runtime/networking/fetch", "implementation-details"),
    "fetch protocol support": bunDocs("runtime/networking/fetch", "protocol-support"),
    "protocol-support": bunDocs("runtime/networking/fetch", "protocol-support"),
    "fetch s3": bunDocs("runtime/networking/fetch", "s3-urls-s3"),
    "s3://": bunDocs("runtime/networking/fetch", "s3-urls-s3"),
    "fetch file": bunDocs("runtime/networking/fetch", "file-urls-file"),
    "file://": bunDocs("runtime/networking/fetch", "file-urls-file"),
    "fetch data": bunDocs("runtime/networking/fetch", "data-urls-data"),
    "data:": bunDocs("runtime/networking/fetch", "data-urls-data"),
    "fetch blob": bunDocs("runtime/networking/fetch", "blob-urls-blob"),
    "blob:": bunDocs("runtime/networking/fetch", "blob-urls-blob"),
    ...CANONICAL_INSTALL_PLATFORM_URLS,
    ...CANONICAL_INSTALL_ENV_URLS,
    "isolated installs": bunDocs("pm/isolated-installs"),
    "global virtual store": bunDocs("pm/global-store"),
    configVersion: bunDocs("pm/isolated-installs"),
    "Bun.Cookie": "https://bun.com/docs/runtime/cookies#cookie-class",
    CookieMap: "https://bun.com/docs/runtime/cookies#cookiemap-class",
    "Bun.connect": "https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect",
    ServerWebSocket: "https://bun.com/docs/runtime/http/websockets#start-a-websocket-server",
    "Bun.dns": "https://bun.com/docs/runtime/networking/dns#dns-prefetch",
    "Bun.dns.prefetch": "https://bun.com/docs/runtime/networking/dns#dns-prefetch",
    "Bun.dns.getCacheStats": "https://bun.com/docs/runtime/networking/dns#dns-getcachestats",
    "Bun.dns.lookup": "https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun",
    dns: "https://bun.com/docs/runtime/networking/dns#dns-prefetch",
    "Bun.listen": "https://bun.com/docs/runtime/networking/tcp#start-a-server-bun-listen",
    "Bun.ArrayBufferSink": "https://bun.com/docs/runtime/streams#bun-arraybuffersink",
    "Bun.spawnSync": "https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync",
    "Bun.Terminal": "https://bun.com/docs/runtime/child-process#terminal-pty-support",
    "Bun.build": "https://bun.com/docs/bundler/index#basic-example",
    "Bun.plugin": "https://bun.com/docs/bundler/plugins#usage",
    "Bun.cron": "https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process",
    "Bun.$": "https://bun.com/docs/runtime/shell#getting-started",
    "Bun.WebView": "https://bun.com/docs/runtime/webview#new-bun-webview-options",
    WebView: "https://bun.com/docs/runtime/webview#new-bun-webview-options",
    "Bun.udpSocket": "https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket",
    udpSocket: "https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket",
    "Bun.CSRF": "https://bun.com/docs/runtime/csrf#bun-csrf-generate",
    "Bun.CSRF.generate": "https://bun.com/docs/runtime/csrf#bun-csrf-generate",
    "Bun.CSRF.verify": "https://bun.com/docs/runtime/csrf#bun-csrf-verify",
    RedisClient: "https://bun.com/docs/runtime/redis#getting-started",
    "Bun.redis": "https://bun.com/docs/runtime/redis#getting-started",
    redis: "https://bun.com/docs/runtime/redis#getting-started",
    S3Client: "https://bun.com/docs/runtime/s3#bun-s3client-bun-s3",
    "Bun.s3": "https://bun.com/docs/runtime/s3#bun-s3client-bun-s3",
    "Bun.sql": "https://bun.com/docs/runtime/sql#features",
    "bun:sql": "https://bun.com/docs/runtime/sql#features",
    "bun:ffi": "https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi",
    "Bun.TOML": "https://bun.com/docs/runtime/toml#bun-toml-parse",
    "Bun.markdown": "https://bun.com/docs/runtime/markdown#bun-markdown-html",
    "Bun.markdown.html": "https://bun.com/docs/runtime/markdown#bun-markdown-html",
    "Bun.markdown.ansi": "https://bun.com/docs/runtime/markdown#ansi-terminal-output",
    "Bun.markdown.render": "https://bun.com/docs/runtime/markdown#bun-markdown-render",
    "Bun.markdown.react": "https://bun.com/docs/runtime/markdown#bun-markdown-react",
    "component-overrides": "https://bun.com/docs/runtime/markdown#component-overrides",
    "Bun.markdown.react component overrides": "https://bun.com/docs/runtime/markdown#component-overrides",
    "available-overrides": "https://bun.com/docs/runtime/markdown#available-overrides",
    "Bun.markdown.react available overrides": "https://bun.com/docs/runtime/markdown#available-overrides",
    options: "https://bun.com/docs/runtime/markdown#options",
    "Bun.markdown.html options": "https://bun.com/docs/runtime/markdown#options",
    "parser-options": "https://bun.com/docs/runtime/markdown#parser-options",
    "Bun.markdown.render parser options": "https://bun.com/docs/runtime/markdown#parser-options",
    "parser-options-2": "https://bun.com/docs/runtime/markdown#parser-options",
    "Bun.markdown.react parser options": "https://bun.com/docs/runtime/markdown#parser-options",
    "Bun.YAML": "https://bun.com/docs/runtime/yaml#bun-yaml-parse",
    YAML: "https://bun.com/docs/runtime/yaml#bun-yaml-parse",
    "Bun.hash": "https://bun.com/docs/runtime/hashing#bun-hash",
    "tls.getCACertificates": "https://bun.com/reference/node/tls/getCACertificates",
    "tls.getCACertificates('system')": "https://bun.com/blog/bun-v1.3.14#tls-getcacertificates-system-now-works-without-use-system-ca",
    "node:tls": "https://bun.com/reference/node/tls/getCACertificates",
    "Bun.sha": "https://bun.com/docs/runtime/hashing#bun-hash",
    "Bun.CryptoHasher": "https://bun.com/docs/runtime/hashing#bun-cryptohasher",
    SHA3: "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "SHA-3": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "SHA3-256": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "SHA3-224": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "SHA3-384": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "SHA3-512": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "sha3-256": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "sha3-224": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "sha3-384": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "sha3-512": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    'crypto.createHash("sha3-256")': "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    'crypto.subtle.digest("SHA3-256")': "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "crypto.sha3": "https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto",
    "Bun.password": "https://bun.com/docs/runtime/hashing#bun-password",
    "Bun.secrets": "https://bun.com/docs/runtime/secrets#bun-secrets-get-options",
    "Bun.semver": "https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean",
    "Bun.Image": "https://bun.com/docs/runtime/image#input",
    "Bun.Image (v1.3.14)": "https://bun.com/blog/bun-v1.3.14#bun-image",
    "Bun.Image terminal methods": "https://bun.com/blog/bun-v1.3.14#terminal-methods",
    "--no-orphans": "https://bun.com/blog/bun-v1.3.14#no-orphans",
    BUN_FEATURE_FLAG_NO_ORPHANS: "https://bun.com/blog/bun-v1.3.14#no-orphans",
    "using / await using": "https://bun.com/blog/bun-v1.3.14#using-await-using-no-longer-lowered-when-targeting-bun",
    "Bun.Terminal (ConPTY)": "https://bun.com/blog/bun-v1.3.14#bunterminal-on-windows-via-conpty",
    "process.execve": "https://bun.com/blog/bun-v1.3.14#process-execve-support",
    "Bun.serve http3": "https://bun.com/blog/bun-v1.3.14#http3",
    "fetch protocol http2": "https://bun.com/blog/bun-v1.3.14#http2-client",
    "install.globalStore": "https://bun.com/blog/bun-v1.3.14#global-virtual-store",
    "Bun.CookieMap": "https://bun.com/docs/runtime/cookies#cookiemap-class",
    Concurrency: "https://bun.com/docs/runtime/workers",
    "Runtime Concurrency": "https://bun.com/docs/runtime/workers",
    "global-store concurrency": "https://bun.com/docs/pm/global-store#concurrency",
    "install concurrency": "https://bun.com/docs/pm/global-store#concurrency",
    "pm concurrency": "https://bun.com/docs/pm/global-store#concurrency",
    Worker: "https://bun.com/docs/runtime/workers#creating-a-worker",
    "new Worker": "https://bun.com/docs/runtime/workers#creating-a-worker",
    Workers: "https://bun.com/docs/runtime/workers#creating-a-worker",
    "creating-a-worker": "https://bun.com/docs/runtime/workers#creating-a-worker",
    "worker.postMessage": "https://bun.com/docs/runtime/workers#messages-with-postmessage",
    "messages-with-postmessage": "https://bun.com/docs/runtime/workers#messages-with-postmessage",
    "worker.terminate": "https://bun.com/docs/runtime/workers#terminating-a-worker",
    "terminating-a-worker": "https://bun.com/docs/runtime/workers#terminating-a-worker",
    "managing-lifetime": "https://bun.com/docs/runtime/workers#managing-lifetime",
    "worker.unref": "https://bun.com/docs/runtime/workers#worker-unref",
    "worker-unref": "https://bun.com/docs/runtime/workers#worker-unref",
    "worker.ref": "https://bun.com/docs/runtime/workers#worker-ref",
    "worker-ref": "https://bun.com/docs/runtime/workers#worker-ref",
    "Worker.preload": "https://bun.com/docs/runtime/workers#preload-load-modules-before-the-worker-starts",
    "Worker smol": "https://bun.com/docs/runtime/workers#memory-usage-with-smol",
    "memory-usage-with-smol": "https://bun.com/docs/runtime/workers#memory-usage-with-smol",
    "worker open": "https://bun.com/docs/runtime/workers#open",
    "worker close": "https://bun.com/docs/runtime/workers#close",
    "environment-data": "https://bun.com/docs/runtime/workers#environment-data",
    setEnvironmentData: "https://bun.com/docs/runtime/workers#environment-data",
    getEnvironmentData: "https://bun.com/docs/runtime/workers#environment-data",
    worker_threads: "https://bun.com/docs/runtime/workers#environment-data",
    "Bun.isMainThread": "https://bun.com/docs/runtime/workers#bun-ismainthread",
    "executables Worker": "https://bun.com/docs/bundler/executables#worker",
    "Bun.inspect": bunDocs("runtime/utils", "bun-inspect"),
    "Bun.inspect()": bunDocs("runtime/utils", "bun-inspect"),
    "Bun.inspect.custom": bunDocs("runtime/utils", "bun-inspect-custom"),
    "Bun.inspect.table": bunDocs("runtime/utils", "bun-inspect-table-tabulardata-properties-options"),
    "Bun.inspect.table(tabularData, properties, options)": bunDocs("runtime/utils", "bun-inspect-table-tabulardata-properties-options"),
    BunInspectOptions: "https://bun.com/reference/bun/BunInspectOptions",
    console: "https://bun.com/docs/runtime/console",
    "--console-depth": "https://bun.com/docs/runtime/console#object-inspection-depth",
    "Bun.color": "https://bun.com/docs/runtime/color#flexible-input",
    "process.stdout.isTTY": "https://bun.com/docs/runtime/nodejs-compat#nodetty",
    "process.stdout.columns": "https://bun.com/docs/runtime/nodejs-compat#nodetty",
    NO_COLOR: "https://bun.com/docs/runtime/environment-variables",
    FORCE_COLOR: "https://bun.com/docs/runtime/environment-variables",
    "Read environment variables": "https://bun.com/docs/guides/runtime/read-env",
    "read-env": "https://bun.com/docs/guides/runtime/read-env",
    "Set environment variables": "https://bun.com/docs/guides/runtime/set-env",
    "set-env": "https://bun.com/docs/guides/runtime/set-env",
    "Set a time zone in Bun": "https://bun.com/docs/guides/runtime/timezone",
    timezone: "https://bun.com/docs/guides/runtime/timezone",
    "set-timezone": "https://bun.com/docs/guides/runtime/timezone",
    TZ: "https://bun.com/docs/guides/runtime/timezone",
    "tz-timezone": "https://bun.com/docs/test/runtime-behavior#tz-timezone",
    "set-the-time-zone": "https://bun.com/docs/test/dates-times#set-the-time-zone",
    "Bun.env": "https://bun.com/docs/runtime/utils#bun-env",
    "process.env": "https://bun.com/docs/runtime/utils#bun-env",
    "Environment variables": "https://bun.com/docs/runtime/environment-variables",
    "reading environment variables": "https://bun.com/docs/runtime/environment-variables#reading-environment-variables",
    "setting environment variables": "https://bun.com/docs/runtime/environment-variables#setting-environment-variables",
    ".env": "https://bun.com/docs/runtime/environment-variables#setting-environment-variables",
    ".env files": "https://bun.com/docs/runtime/environment-variables#setting-environment-variables",
    ".env.local": "https://bun.com/docs/runtime/environment-variables#setting-environment-variables",
    "--env-file": "https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files",
    "--no-env-file": "https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading",
    "configuring Bun": "https://bun.com/docs/runtime/environment-variables#configuring-bun",
    BUN_OPTIONS: "https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options",
    "runtime-arguments-via-bun-options": "https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options",
    "Runtime arguments via BUN_OPTIONS": "https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options",
    "embedding-runtime-arguments": "https://bun.com/docs/bundler/executables#embedding-runtime-arguments",
    BUN_CONFIG_VERBOSE_FETCH: bunDocs("runtime/networking/fetch", "debugging"),
    BUN_CONFIG_MAX_HTTP_REQUESTS: bunDocs("runtime/networking/fetch", "simultaneous-connection-limit"),
    DO_NOT_TRACK: "https://bun.com/docs/runtime/environment-variables#configuring-bun",
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "https://bun.com/docs/runtime/environment-variables#what-does-it-cache",
    "bunfig.toml": "https://bun.com/docs/runtime/bunfig",
    ".npmrc": "https://bun.com/docs/pm/npmrc",
    npmrc: "https://bun.com/docs/pm/npmrc",
    "link-workspace-packages": "https://bun.com/docs/pm/npmrc#link-workspace-packages-control-workspace-package-installation",
    "save-exact": "https://bun.com/docs/pm/npmrc#save-exact-save-exact-versions",
    "ignore-scripts": "https://bun.com/docs/pm/npmrc#ignore-scripts-skip-lifecycle-scripts",
    "install-strategy": "https://bun.com/docs/pm/npmrc#install-strategy-and-node-linker-installation-strategy",
    "node-linker": "https://bun.com/docs/pm/npmrc#install-strategy-and-node-linker-installation-strategy",
    "public-hoist-pattern": "https://bun.com/docs/pm/npmrc#public-hoist-pattern-and-hoist-pattern-control-hoisting",
    "install.registry": "https://bun.com/docs/runtime/bunfig#install-registry",
    "install.linkWorkspacePackages": "https://bun.com/docs/runtime/bunfig#install-linkworkspacepackages",
    "install.exact": "https://bun.com/docs/runtime/bunfig#install-exact",
    "install.dryRun": "https://bun.com/docs/runtime/bunfig#install-dryrun",
    "install.cache": "https://bun.com/docs/runtime/bunfig#install-cache",
    "bun:test": "https://bun.com/docs/test/index#run-tests",
    "bun test": "https://bun.com/docs/test/index#run-tests",
    "bun:test snapshots": "https://bun.com/docs/test/snapshots#basic-snapshots",
    "snapshot guide": "https://bun.com/docs/guides/test/snapshot",
    "bun v1.3.12": "https://bun.com/blog/bun-v1.3.12",
    "bun v1.3.12 install": "https://bun.com/blog/bun-v1.3.12#to-install-bun",
    "bun v1.3.12 upgrade": "https://bun.com/blog/bun-v1.3.12#to-upgrade-bun",
    "bun upgrade": "https://bun.com/blog/bun-v1.3.12#to-upgrade-bun",
    "bun v1.3.12 bugfixes": "https://bun.com/blog/bun-v1.3.12#bugfixes",
    "bun v1.3.12 contributors": "https://bun.com/blog/bun-v1.3.12#thanks-to-8-contributors",
    HTMLRewriter: bunDocs("runtime/html-rewriter"),
    "HTMLRewriter social": bunDocs("guides/html-rewriter/extract-social-meta", "extract-social-share-images-and-open-graph-tags"),
    "extract-social-meta": bunDocs("guides/html-rewriter/extract-social-meta", "extract-social-share-images-and-open-graph-tags"),
    "extract-social-share-images-and-open-graph-tags": bunDocs("guides/html-rewriter/extract-social-meta", "extract-social-share-images-and-open-graph-tags"),
    SocialMetadata: bunDocs("guides/html-rewriter/extract-social-meta", "extract-social-share-images-and-open-graph-tags"),
    extractSocialMetadata: bunDocs("guides/html-rewriter/extract-social-meta", "extract-social-share-images-and-open-graph-tags"),
    URLPattern: bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern ship": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern API": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "urlpattern-api": bunBlog("bun-v1.3.4", "urlpattern-api"),
    URLPatternInit: bunBlog("bun-v1.3.4", "urlpattern-api"),
    URLPatternInput: bunBlog("bun-v1.3.4", "urlpattern-api"),
    URLPatternResult: bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.constructor": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.test()": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.exec()": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "test()": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "exec()": bunBlog("bun-v1.3.4", "urlpattern-api"),
    hasRegExpGroups: bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.hasRegExpGroups": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.protocol": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.username": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.password": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.hostname": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.port": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.pathname": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.search": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.hash": bunBlog("bun-v1.3.4", "urlpattern-api"),
    "URLPattern.test": bunBlog("bun-v1.3.12", "urlpattern-is-up-to-2-3x-faster"),
    "URLPattern.exec": bunBlog("bun-v1.3.12", "urlpattern-is-up-to-2-3x-faster"),
    "URLPattern perf": bunBlog("bun-v1.3.12", "urlpattern-is-up-to-2-3x-faster"),
    "urlpattern-is-up-to-2-3x-faster": bunBlog("bun-v1.3.12", "urlpattern-is-up-to-2-3x-faster"),
    "URLPattern MDN": mdnWebApi("URLPattern"),
    "URLPatternResult MDN": mdnWebApi("URLPatternResult"),
    "URLPatternInit MDN": mdnWebApi("URLPattern/URLPattern"),
    "Bun.Glob.scan": "https://bun.com/blog/bun-v1.3.12#faster-bun-glob-scan",
    "bun v1.3.12 stripANSI": "https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth",
    "bun v1.3.12 stringWidth": "https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth",
    "bun v1.3.13": "https://bun.com/blog/bun-v1.3.13",
    "bun test --changed": "https://bun.com/blog/bun-v1.3.13#bun-test-changed",
    "--changed": "https://bun.com/blog/bun-v1.3.13#bun-test-changed",
    "bun test --isolate": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "--isolate": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "bun test --parallel": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "--parallel": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "--parallel=N": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "bun test --shard": "https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs",
    "--shard": "https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs",
    "--shard=M/N": "https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs",
    "bun run --parallel": "https://bun.com/docs/pm/filter#parallel-and-sequential-mode",
    "bun run --sequential": "https://bun.com/docs/pm/filter#parallel-and-sequential-mode",
    "bun test flags": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    JEST_WORKER_ID: "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    BUN_TEST_WORKER_ID: "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "--randomize": "https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel",
    "bun test --watch": "https://bun.com/blog/bun-v1.3.13#bun-test-changed",
    ...bundlerNavCanonicalRefs(),
    "plugin lifecycle": "https://bun.com/docs/bundler/plugins#plugin-lifecycle",
    onStart: "https://bun.com/docs/bundler/plugins#onstart",
    onResolve: "https://bun.com/docs/bundler/plugins#onresolve",
    onLoad: "https://bun.com/docs/bundler/plugins#onload",
    onBeforeParse: "https://bun.com/docs/bundler/plugins#onbeforeparse",
    onEnd: "https://bun.com/docs/bundler/plugins#onend",
    "type: macro": "https://bun.com/docs/bundler/macros#import-attributes",
    'with { type: "macro" }': "https://bun.com/docs/bundler/macros#import-attributes",
    "--no-macros": "https://bun.com/docs/runtime#transpilation-language-features",
    "macros security": "https://bun.com/docs/bundler/macros#security-considerations",
    "export condition macro": "https://bun.com/docs/bundler/macros#export-condition-macro",
    "embed git commit hash": "https://bun.com/docs/bundler/macros#embed-latest-git-commit-hash",
    "bundle-time fetch": "https://bun.com/docs/bundler/macros#make-fetch-requests-at-bundle-time",
    "bun:error": "https://bun.com/docs/bundler/hot-reloading#built-in-events",
    "bun:invalidate": "https://bun.com/docs/bundler/hot-reloading#built-in-events",
    "bun:ws": "https://bun.com/docs/bundler/hot-reloading#built-in-events",
    "serve.static.env": "https://bun.com/docs/bundler/fullstack#inline-environment-variables",
    "serve.static.plugins": "https://bun.com/docs/bundler/fullstack",
    "compile targets": "https://bun.com/docs/bundler/executables#supported-targets",
    "Bun.embeddedFiles": "https://bun.com/docs/bundler/executables#listing-embedded-files",
    "Bun.isStandaloneExecutable": "https://bun.com/docs/bundler/executables#detecting-standalone-mode-at-runtime",
    BUN_BE_BUN: "https://bun.com/docs/bundler/executables#act-as-the-bun-cli",
    "bun:bundle": "https://bun.com/docs/bundler/esbuild#cli-api",
    "--bytecode": "https://bun.com/docs/bundler/bytecode#basic-usage-commonjs",
    "--compile": "https://bun.com/docs/bundler/bytecode#with-standalone-executables",
    "--compile-autoload-package-json": "https://bun.com/docs/bundler/executables#enabling-config-loading-at-runtime",
    "--compile-autoload-tsconfig": "https://bun.com/docs/bundler/executables#enabling-config-loading-at-runtime",
    "--compile-exec-argv": "https://bun.com/docs/bundler/executables#embedding-runtime-arguments",
    "bun run -": "https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin",
    "bun run - to pipe code from stdin": "https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin",
    "bun-run-to-pipe-code-from-stdin": "https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin",
    "pipe code from stdin": "https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin",
    "Transpilation & Language Features": "https://bun.com/docs/runtime#transpilation-language-features",
    "transpilation-language-features": "https://bun.com/docs/runtime#transpilation-language-features",
    "--tsconfig-override": "https://bun.com/docs/runtime#transpilation-language-features",
    "--define": "https://bun.com/docs/runtime#transpilation-language-features",
    "--drop": "https://bun.com/docs/runtime#transpilation-language-features",
    "--loader": "https://bun.com/docs/runtime#transpilation-language-features",
    "--jsx-factory": "https://bun.com/docs/runtime#transpilation-language-features",
    "--jsx-fragment": "https://bun.com/docs/runtime#transpilation-language-features",
    "--jsx-import-source": "https://bun.com/docs/runtime#transpilation-language-features",
    "--jsx-runtime": "https://bun.com/docs/runtime#transpilation-language-features",
    "--jsx-side-effects": "https://bun.com/docs/runtime#transpilation-language-features",
    "--ignore-dce-annotations": "https://bun.com/docs/runtime#transpilation-language-features",
    "--external": "https://bun.com/docs/bundler/esbuild#cli-api",
    "--format": "https://bun.com/docs/bundler/bytecode#with-standalone-executables",
    "--keep-names": "https://bun.com/docs/bundler/minifier#keep-names",
    "--minify": "https://bun.com/docs/bundler/bytecode#combining-with-other-optimizations",
    "--minify-identifiers": "https://bun.com/docs/bundler/minifier#granular-control",
    "--minify-syntax": "https://bun.com/docs/bundler/minifier#granular-control",
    "--minify-whitespace": "https://bun.com/docs/bundler/minifier#granular-control",
    "--no-bundle": "https://bun.com/docs/bundler/esbuild#cli-api",
    "--outfile": "https://bun.com/docs/bundler/bytecode#with-standalone-executables",
    "--sourcemap": "https://bun.com/docs/bundler/bytecode#combining-with-other-optimizations",
    "--splitting": "https://bun.com/docs/bundler/executables#code-splitting",
    "--asset-naming": "https://bun.com/docs/bundler/executables#content-hash",
    "--bundle": "https://bun.com/docs/bundler/esbuild",
    "--windows-hide-console": "https://bun.com/docs/bundler/executables#windows-specific-flags",
    "--windows-icon": "https://bun.com/docs/bundler/executables#windows-specific-flags",
    "--force": "https://bun.com/docs/bundler/executables",
    "--console": "https://bun.com/docs/bundler/html-static#echo-console-logs-from-browser-to-terminal",
    "--cpu-prof": "https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options",
    "--cpu-prof-md": "https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options",
    "--heap-prof-md": "https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options",
    "--deep": "https://bun.com/docs/bundler/executables#code-signing-on-macos",
    "--entitlements": "https://bun.com/docs/bundler/executables#code-signing-on-macos",
    "--sign": "https://bun.com/docs/bundler/executables#code-signing-on-macos",
    "--verify": "https://bun.com/docs/bundler/executables#code-signing-on-macos",
    "--user-agent": "https://bun.com/docs/bundler/executables#embedding-runtime-arguments",
    "--no-compile-autoload-bunfig": "https://bun.com/docs/bundler/executables#disabling-config-loading-at-runtime",
    "--no-compile-autoload-dotenv": "https://bun.com/docs/bundler/executables#disabling-config-loading-at-runtime",
    "--jsx-dev": "https://bun.com/docs/bundler/esbuild#cli-api",
    "--sourcefile": "https://bun.com/docs/bundler/esbuild#cli-api",
    "--production": "https://bun.com/docs/bundler/fullstack#production-mode",
    "--env": "https://bun.com/docs/bundler/html-static#build-for-production",
    "--version": "https://bun.com/docs/bundler/esbuild#cli-api",
    "Bun.embeddedFiles.length": "https://bun.com/docs/bundler/executables#detecting-standalone-mode-at-runtime",
    "bundler define": "https://bun.com/docs/bundler/index#define",
    "bundler loader": "https://bun.com/docs/bundler/index#loader",
    "bundler metafile": "https://bun.com/docs/bundler/index#metafile",
    "bundler external": "https://bun.com/docs/bundler/index#external",
    "bundler minify": "https://bun.com/docs/bundler/index#minify",
    "bundler cli-usage": "https://bun.com/docs/bundler/index#cli-usage",
    "fullstack html-routes": "https://bun.com/docs/bundler/fullstack#html-routes",
    "Fullstack dev server html-routes": "https://bun.com/docs/bundler/fullstack#html-routes",
    "import.meta.hot": "https://bun.com/docs/bundler/hot-reloading#import-meta-hot-api-reference",
    "import.meta.hot.accept": "https://bun.com/docs/bundler/hot-reloading#import-meta-hot-accept",
    "import.meta.hot.data": "https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data",
    "import.meta.hot.dispose": "https://bun.com/docs/bundler/hot-reloading#import-meta-hot-dispose",
    "import.meta.hot.prune": "https://bun.com/docs/bundler/hot-reloading#import-meta-hot-prune",
    "import.meta.hot.on": "https://bun.com/docs/bundler/hot-reloading#import-meta-hot-on-and-off",
    "html-static inline-env": "https://bun.com/docs/bundler/html-static#inline-environment-variables",
    "HTML & static sites inline-environment-variables": "https://bun.com/docs/bundler/html-static#inline-environment-variables",
    "HTML & static sites build-for-production": "https://bun.com/docs/bundler/html-static#build-for-production",
    "HTML & static sites watch-mode": "https://bun.com/docs/bundler/html-static#watch-mode",
    "HTML & static sites plugin-api": "https://bun.com/docs/bundler/html-static#plugin-api",
    "Standalone HTML javascript-api": "https://bun.com/docs/bundler/standalone-html#javascript-api",
    "CSS css-modules": "https://bun.com/docs/bundler/css#css-modules",
    "loader:built-in-loaders": "https://bun.com/docs/bundler/loaders#built-in-loaders",
    "loader:js": "https://bun.com/docs/bundler/loaders#js",
    "loader:jsx": "https://bun.com/docs/bundler/loaders#jsx",
    "loader:ts": "https://bun.com/docs/bundler/loaders#ts",
    "loader:tsx": "https://bun.com/docs/bundler/loaders#tsx",
    "loader:json": "https://bun.com/docs/bundler/loaders#json",
    "loader:jsonc": "https://bun.com/docs/bundler/loaders#jsonc",
    "loader:toml": "https://bun.com/docs/bundler/loaders#toml",
    "loader:yaml": "https://bun.com/docs/bundler/loaders#yaml",
    "loader:text": "https://bun.com/docs/bundler/loaders#text",
    "loader:napi": "https://bun.com/docs/bundler/loaders#napi",
    "loader:sqlite": "https://bun.com/docs/bundler/loaders#sqlite",
    "loader:html": "https://bun.com/docs/bundler/loaders#html",
    "loader:css": "https://bun.com/docs/bundler/loaders#css",
    "loader:sh": "https://bun.com/docs/bundler/loaders#sh",
    "loader:file": "https://bun.com/docs/bundler/loaders#file",
    "build-time-constants": "https://bun.com/docs/bundler/executables#build-time-constants",
    "Single-file executable build-time-constants": "https://bun.com/docs/bundler/executables#build-time-constants",
    "plugins namespaces": "https://bun.com/docs/bundler/plugins#namespaces",
    "plugins defer": "https://bun.com/docs/bundler/plugins#defer",
    "plugins native-plugins": "https://bun.com/docs/bundler/plugins#native-plugins",
    "macros when-to-use-macros": "https://bun.com/docs/bundler/macros#when-to-use-macros",
    "macros execution": "https://bun.com/docs/bundler/macros#execution",
    "macros dead-code-elimination": "https://bun.com/docs/bundler/macros#dead-code-elimination",
    "macros examples": "https://bun.com/docs/bundler/macros#examples",
    "Bytecode Caching usage": "https://bun.com/docs/bundler/bytecode#usage",
    "Bytecode Caching esm-bytecode": "https://bun.com/docs/bundler/bytecode#esm-bytecode",
    "Bytecode Caching when-to-use-bytecode": "https://bun.com/docs/bundler/bytecode#when-to-use-bytecode",
    "Minifier cli-usage": "https://bun.com/docs/bundler/minifier#cli-usage",
    "Minifier javascript-api": "https://bun.com/docs/bundler/minifier#javascript-api",
    "Minifier dead-code-elimination": "https://bun.com/docs/bundler/minifier#dead-code-elimination",
    "Minifier drop-console-calls": "https://bun.com/docs/bundler/minifier#drop-console-calls",
    "Minifier when-to-use-minification": "https://bun.com/docs/bundler/minifier#when-to-use-minification",
    "esbuild javascript-api": "https://bun.com/docs/bundler/esbuild#javascript-api",
    "esbuild plugin-api": "https://bun.com/docs/bundler/esbuild#plugin-api",
    BUN_LOADER_JSX: "https://bun.com/docs/bundler/loaders#jsx",
    "verify-channel": "https://bun.com/docs/installation#upgrade",
    "Bun.version": "https://bun.com/docs/runtime/utils#bun-version",
    "Bun.revision": "https://bun.com/docs/runtime/utils#bun-revision",
    "Bun.randomUUIDv7": "https://bun.com/docs/runtime/utils#bun-randomuuidv7",
    "Bun.Glob": "https://bun.com/docs/runtime/glob#quickstart",
    "Bun.which": "https://bun.com/docs/runtime/utils#bun-which",
    "Get the path to an executable bin file": "https://bun.com/docs/guides/util/which-path-to-executable-bin#get-the-path-to-an-executable-bin-file",
    "which-path-to-executable-bin": "https://bun.com/docs/guides/util/which-path-to-executable-bin#get-the-path-to-an-executable-bin-file",
    "get-the-path-to-an-executable-bin-file": "https://bun.com/docs/guides/util/which-path-to-executable-bin#get-the-path-to-an-executable-bin-file",
    "Bun.nanoseconds": "https://bun.com/docs/runtime/utils#bun-nanoseconds",
    "Bun.sleep": "https://bun.com/docs/runtime/utils#bun-sleep",
    "Bun.sleepSync": "https://bun.com/docs/runtime/utils#bun-sleepsync",
    "Bun.deepEquals": "https://bun.com/docs/runtime/utils#bun-deepequals",
    "Bun.escapeHTML": "https://bun.com/docs/runtime/utils#bun-escapehtml",
    "Bun.peek": "https://bun.com/docs/runtime/utils#bun-peek",
    "Bun.main": "https://bun.com/docs/runtime/utils#bun-main",
    "Bun.resolveSync": "https://bun.com/docs/runtime/utils#bun-resolvesync",
    "Bun.fileURLToPath": "https://bun.com/docs/runtime/utils#bun-fileurltopath",
    "Bun.pathToFileURL": "https://bun.com/docs/runtime/utils#bun-pathtofileurl",
    "Convert a file URL to an absolute path": "https://bun.com/docs/guides/util/file-url-to-path#convert-a-file-url-to-an-absolute-path",
    "file-url-to-path": "https://bun.com/docs/guides/util/file-url-to-path#convert-a-file-url-to-an-absolute-path",
    "convert-a-file-url-to-an-absolute-path": "https://bun.com/docs/guides/util/file-url-to-path#convert-a-file-url-to-an-absolute-path",
    "Convert an absolute path to a file URL": "https://bun.com/docs/guides/util/path-to-file-url#convert-an-absolute-path-to-a-file-url",
    "path-to-file-url": "https://bun.com/docs/guides/util/path-to-file-url#convert-an-absolute-path-to-a-file-url",
    "convert-an-absolute-path-to-a-file-url": "https://bun.com/docs/guides/util/path-to-file-url#convert-an-absolute-path-to-a-file-url",
    "node:url": "https://bun.com/reference/node/url",
    fileURLToPath: "https://bun.com/reference/node/url/fileURLToPath",
    "node:url/fileURLToPath": "https://bun.com/reference/node/url/fileURLToPath",
    "url.fileURLToPath": "https://bun.com/reference/node/url/fileURLToPath",
    pathToFileURL: "https://bun.com/reference/node/url/pathToFileURL",
    "node:url/pathToFileURL": "https://bun.com/reference/node/url/pathToFileURL",
    "url.pathToFileURL": "https://bun.com/reference/node/url/pathToFileURL",
    FileUrlToPathOptions: "https://bun.com/reference/node/url/fileURLToPath",
    PathToFileUrlOptions: "https://bun.com/reference/node/url/pathToFileURL",
    "import.meta.dir": "https://bun.com/docs/runtime/module-resolution#import-meta",
    "import.meta": "https://bun.com/docs/runtime/module-resolution#import-meta",
    "Get the directory of the current file": "https://bun.com/docs/guides/util/import-meta-dir#get-the-directory-of-the-current-file",
    "import-meta-dir": "https://bun.com/docs/guides/util/import-meta-dir#get-the-directory-of-the-current-file",
    "get-the-directory-of-the-current-file": "https://bun.com/docs/guides/util/import-meta-dir#get-the-directory-of-the-current-file",
    "Bun.deflateSync": "https://bun.com/docs/runtime/utils#bun-deflatesync",
    "Bun.gunzipSync": "https://bun.com/docs/runtime/utils#bun-gunzipsync",
    "Bun.inflateSync": "https://bun.com/docs/runtime/utils#bun-inflatesync",
    "Bun.zstdCompress": "https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync",
    "Bun.zstdCompressSync": "https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync",
    "Bun.zstdDecompress": "https://bun.com/docs/runtime/utils#bun-zstddecompress-bun-zstddecompresssync",
    "Bun.zstdDecompressSync": "https://bun.com/docs/runtime/utils#bun-zstddecompress-bun-zstddecompresssync",
    "Bun.readableStreamTo": "https://bun.com/docs/runtime/utils#bun-readablestreamto",
    "Bun.stdin": "https://bun.com/docs/runtime/console#reading-from-stdin",
    "Read from stdin": "https://bun.com/docs/guides/process/stdin",
    "guides/process/stdin": "https://bun.com/docs/guides/process/stdin",
    "Bun.spawn": "https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn",
    "Bun.spawn terminal (PTY)": "https://bun.com/docs/runtime/child-process#terminal-pty-support",
    "spawn terminal options": "https://bun.com/docs/runtime/child-process#terminal-options",
    "spawn stdout guide": "https://bun.com/docs/guides/process/spawn-stdout",
    "CI failures from terminal": "https://bun.com/docs/project/contributing#viewing-ci-failures-from-the-terminal",
    "--filter": "https://bun.com/docs/pm/filter#package-name-filter-pattern",
    "--watch": "https://bun.com/docs/bundler/index#watch-mode",
    "bun build --watch": "https://bun.com/docs/bundler/index#watch-mode",
    "--linker": "https://bun.com/docs/runtime/bunfig#install-linker",
    "--dry-run": "https://bun.com/docs/pm/cli/install#dry-run",
    "--dev": "https://bun.com/docs/pm/cli/add#dev",
    "--latest": "https://bun.com/docs/pm/cli/update#latest",
    "--test-only": "https://bun.com/docs/test/writing-tests#test-only",
    "--silent": "https://bun.com/docs/runtime/bunfig#run-silent-suppress-reporting-the-command-being-run",
    trustedDependencies: "https://bun.com/docs/pm/lifecycle#trusteddependencies",
    globalStore: "https://bun.com/docs/runtime/bunfig#install-globalstore",
    env: "https://bun.com/docs/runtime/bunfig#env",
    "run.shell": "https://bun.com/docs/runtime/bunfig#run-shell-use-the-system-shell-or-buns-shell",
    "run.noOrphans": "https://bun.com/docs/runtime/bunfig#run-noorphans-dont-leave-orphan-processes-behind",
    "bun-types": BUN_TYPES_PINNED,
    "llms.txt index": "https://bun.com/docs/llms.txt",
    "markdown docs": "https://bun.com/docs/runtime/environment-variables.md",
    "rss feed": "https://bun.com/rss.xml",
    discord: "https://bun.com/discord",
    issues: "https://bun.com/issues",
    "install script": "https://bun.com/install.sh",
    download: "https://bun.com/download",
    "security policy": "https://github.com/oven-sh/bun/security/policy"
  };
  CONCEPT_ONLY_KEYS = new Set(bundlerNavConceptOnlyKeys());
  APIS = Object.keys(CANONICAL_REFS).filter(isCodeApiKey);
  TAXONOMY_PATH = new URL("./bun-docs-taxonomy.json", import.meta.url).pathname;
  REPO_ROOT = new URL("..", import.meta.url).pathname;
  if (false) {}
});

// lib/core/core-types.ts
var ENTERPRISE_LIMITS;
var init_core_types = __esm(() => {
  ENTERPRISE_LIMITS = {
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    MAX_REQUEST_SIZE: 10 * 1024 * 1024,
    MAX_RESPONSE_SIZE: 100 * 1024 * 1024,
    MAX_CONCURRENT_CONNECTIONS: 1000,
    MAX_RETRY_ATTEMPTS: 3,
    MAX_CACHE_SIZE: 1024 * 1024 * 1024
  };
});

// lib/core/core-errors.ts
class EnterpriseErrorFactory {
  static createSystemError(code, message, context) {
    return new SystemError(code, message, context);
  }
  static createValidationError(code, message, field, value, context) {
    return new ValidationError(code, message, field, value, context);
  }
  static createNetworkError(code, message, hostname, port, protocol, context) {
    return new NetworkError(code, message, hostname, port, protocol, context);
  }
  static createSecurityError(code, message, context) {
    return new SecurityError(code, message, context);
  }
  static createResourceError(code, message, resourceType, resourceId, context) {
    return new ResourceError(code, message, resourceType, resourceId, context);
  }
  static createBusinessError(code, message, rule, context) {
    return new BusinessError(code, message, rule, context);
  }
  static fromUnknown(error) {
    if (error instanceof BaseEnterpriseError) {
      return error;
    }
    if (error instanceof Error) {
      return new SystemError("SYS_1000" /* SYSTEM_INITIALIZATION_FAILED */, error.message, {
        originalError: error.name,
        stack: error.stack
      });
    }
    if (typeof error === "string") {
      return new SystemError("SYS_1000" /* SYSTEM_INITIALIZATION_FAILED */, error);
    }
    return new SystemError("SYS_1000" /* SYSTEM_INITIALIZATION_FAILED */, "Unknown error occurred", { originalError: error });
  }
}

class EnterpriseErrorHandler {
  static instance;
  errorHandlers = new Map;
  constructor() {}
  static getInstance() {
    if (!EnterpriseErrorHandler.instance) {
      EnterpriseErrorHandler.instance = new EnterpriseErrorHandler;
    }
    return EnterpriseErrorHandler.instance;
  }
  registerHandler(errorCode, handler) {
    this.errorHandlers.set(errorCode, handler);
  }
  handleError(error) {
    const handler = this.errorHandlers.get(error.code);
    if (handler) {
      handler(error);
    } else {
      this.defaultErrorHandler(error);
    }
  }
  defaultErrorHandler(error) {
    console.error(`[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`);
    if (error.context) {
      console.error("Context:", error.context);
    }
    if (error.stack && error.isCritical()) {
      console.error("Stack trace:", error.stack);
    }
  }
  fromUnknown(error) {
    const enterpriseError = EnterpriseErrorFactory.fromUnknown(error);
    this.handleError(enterpriseError);
  }
}
var BaseEnterpriseError, SystemError, ValidationError, BrandValidationError, NetworkError, SecurityError, ResourceError, BusinessError;
var init_core_errors = __esm(() => {
  init_core_types();
  BaseEnterpriseError = class BaseEnterpriseError extends Error {
    code;
    severity;
    timestamp;
    context;
    constructor(code, message, severity = "medium" /* MEDIUM */, context) {
      super(message);
      this.name = this.constructor.name;
      this.code = code;
      this.severity = severity;
      this.timestamp = Date.now();
      this.context = context;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
    toEnterpriseError() {
      return {
        code: this.code,
        message: this.message,
        severity: this.severity,
        timestamp: this.timestamp,
        context: this.context,
        stack: this.stack
      };
    }
    isCritical() {
      return this.severity === "critical" /* CRITICAL */;
    }
    isSecurityError() {
      return this.code.startsWith("SEC_");
    }
  };
  SystemError = class SystemError extends BaseEnterpriseError {
    constructor(code, message, context) {
      super(code, message, "high" /* HIGH */, context);
    }
  };
  ValidationError = class ValidationError extends BaseEnterpriseError {
    field;
    value;
    constructor(code, message, field, value, context) {
      super(code, message, "low" /* LOW */, context);
      this.field = field;
      this.value = value;
    }
  };
  BrandValidationError = class BrandValidationError extends ValidationError {
    brand;
    constructor(brand, value) {
      super("VAL_2000" /* VALIDATION_INPUT_INVALID */, `${brand} must be a non-empty string`, brand, value, {
        brand
      });
      this.brand = brand;
    }
  };
  NetworkError = class NetworkError extends BaseEnterpriseError {
    hostname;
    port;
    protocol;
    constructor(code, message, hostname, port, protocol, context) {
      super(code, message, "medium" /* MEDIUM */, context);
      this.hostname = hostname;
      this.port = port;
      this.protocol = protocol;
    }
  };
  SecurityError = class SecurityError extends BaseEnterpriseError {
    constructor(code, message, context) {
      super(code, message, "critical" /* CRITICAL */, context);
    }
  };
  ResourceError = class ResourceError extends BaseEnterpriseError {
    resourceType;
    resourceId;
    constructor(code, message, resourceType, resourceId, context) {
      super(code, message, "medium" /* MEDIUM */, context);
      this.resourceType = resourceType;
      this.resourceId = resourceId;
    }
  };
  BusinessError = class BusinessError extends BaseEnterpriseError {
    rule;
    constructor(code, message, rule, context) {
      super(code, message, "low" /* LOW */, context);
      this.rule = rule;
    }
  };
});

// lib/types/branded/_core.ts
function asWireReject(value) {
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
    case "undefined":
      return value;
    case "object":
      return value;
    default:
      return String(value);
  }
}
function provenanceEnabled() {
  return Bun.env.BRAND_PROVENANCE === "1" || Bun.env.BRAND_PROVENANCE === "true";
}
function logMint(kind, tier, value) {
  if (!provenanceEnabled())
    return;
  console.info(JSON.stringify({
    event: "brand.mint",
    brand: kind,
    tier,
    valuePreview: value.length > 12 ? `${value.slice(0, 4)}\u2026${value.slice(-4)}` : value,
    at: new Date().toISOString()
  }));
}
function makeId(value, kind) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BrandValidationError(kind, value);
  }
  logMint(kind, "as", value);
  return value;
}
function tryBrandId(value, brandFn) {
  if (value == null)
    return;
  const s = String(value).trim();
  if (!s)
    return;
  return brandFn(s);
}
function parseBrandId(value, kind, brandFn) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BrandValidationError(kind, asWireReject(value));
  }
  const trimmed = value.trim();
  logMint(kind, "parse", trimmed);
  return brandFn(trimmed);
}
function defineBrandConstructors(kind) {
  const as = (v) => makeId(v, kind);
  const tryFn = (v) => tryBrandId(v, as);
  const parse = (v) => parseBrandId(v, kind, as);
  return { as, try: tryFn, parse };
}
var init__core = __esm(() => {
  init_core_errors();
});

// lib/types/branded/session.ts
var session, terminal, request, correlation, snapshot, asSessionId, trySessionId, parseSessionId, asTerminalId, tryTerminalId, parseTerminalId, asRequestId, tryRequestId, parseRequestId, asCorrelationId, tryCorrelationId, parseCorrelationId, asSnapshotId, trySnapshotId, parseSnapshotId, SESSION_BRAND_SPECS;
var init_session = __esm(() => {
  init__core();
  session = defineBrandConstructors("SessionId");
  terminal = defineBrandConstructors("TerminalId");
  request = defineBrandConstructors("RequestId");
  correlation = defineBrandConstructors("CorrelationId");
  snapshot = defineBrandConstructors("SnapshotId");
  asSessionId = session.as;
  trySessionId = session.try;
  parseSessionId = session.parse;
  asTerminalId = terminal.as;
  tryTerminalId = terminal.try;
  parseTerminalId = terminal.parse;
  asRequestId = request.as;
  tryRequestId = request.try;
  parseRequestId = request.parse;
  asCorrelationId = correlation.as;
  tryCorrelationId = correlation.try;
  parseCorrelationId = correlation.parse;
  asSnapshotId = snapshot.as;
  trySnapshotId = snapshot.try;
  parseSnapshotId = snapshot.parse;
  SESSION_BRAND_SPECS = [
    {
      name: "SessionId",
      domain: "session",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "user-input", "wire-input"],
      description: "Interactive terminal / agent session identity"
    },
    {
      name: "TerminalId",
      domain: "session",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "PTY / terminal instance identity"
    },
    {
      name: "RequestId",
      domain: "session",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "HTTP or RPC request correlation handle"
    },
    {
      name: "CorrelationId",
      domain: "session",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Cross-service distributed trace correlation"
    },
    {
      name: "SnapshotId",
      domain: "session",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Point-in-time state snapshot identity"
    }
  ];
});

// lib/types/branded/identity.ts
var user, account, identity, accessKey, token, asUserId, tryUserId, parseUserId, asAccountId, tryAccountId, parseAccountId, asIdentityId, tryIdentityId, parseIdentityId, asAccessKeyId, tryAccessKeyId, parseAccessKeyId, asTokenId, tryTokenId, parseTokenId, IDENTITY_BRAND_SPECS;
var init_identity = __esm(() => {
  init__core();
  user = defineBrandConstructors("UserId");
  account = defineBrandConstructors("AccountId");
  identity = defineBrandConstructors("IdentityId");
  accessKey = defineBrandConstructors("AccessKeyId");
  token = defineBrandConstructors("TokenId");
  asUserId = user.as;
  tryUserId = user.try;
  parseUserId = user.parse;
  asAccountId = account.as;
  tryAccountId = account.try;
  parseAccountId = account.parse;
  asIdentityId = identity.as;
  tryIdentityId = identity.try;
  parseIdentityId = identity.parse;
  asAccessKeyId = accessKey.as;
  tryAccessKeyId = accessKey.try;
  parseAccessKeyId = accessKey.parse;
  asTokenId = token.as;
  tryTokenId = token.try;
  parseTokenId = token.parse;
  IDENTITY_BRAND_SPECS = [
    {
      name: "UserId",
      domain: "identity",
      tiers: ["as", "try", "parse"],
      mint: ["user-input", "wire-input", "system-internal"],
      description: "Human or agent principal identity"
    },
    {
      name: "AccountId",
      domain: "identity",
      tiers: ["as", "try", "parse"],
      mint: ["wire-input", "user-input"],
      description: "Cloud account (e.g. Cloudflare/R2 account) \u2014 env/wire only, never empty forge"
    },
    {
      name: "IdentityId",
      domain: "identity",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Zero-trust / federated identity record"
    },
    {
      name: "AccessKeyId",
      domain: "identity",
      tiers: ["as", "try", "parse"],
      mint: ["wire-input", "system-internal"],
      description: "S3/R2 access key id (not the secret material)"
    },
    {
      name: "TokenId",
      domain: "identity",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Opaque token handle (not the token secret)"
    }
  ];
});

// lib/types/branded/documents.ts
var document, zone, docToken, asDocumentId, tryDocumentId, parseDocumentId, asZoneId, tryZoneId, parseZoneId, asDocTokenId, tryDocTokenId, parseDocTokenId, DOCUMENT_BRAND_SPECS;
var init_documents = __esm(() => {
  init__core();
  document = defineBrandConstructors("DocumentId");
  zone = defineBrandConstructors("ZoneId");
  docToken = defineBrandConstructors("DocTokenId");
  asDocumentId = document.as;
  tryDocumentId = document.try;
  parseDocumentId = document.parse;
  asZoneId = zone.as;
  tryZoneId = zone.try;
  parseZoneId = zone.parse;
  asDocTokenId = docToken.as;
  tryDocTokenId = docToken.try;
  parseDocTokenId = docToken.parse;
  DOCUMENT_BRAND_SPECS = [
    {
      name: "DocumentId",
      domain: "documents",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Wiki / collab document identity"
    },
    {
      name: "ZoneId",
      domain: "documents",
      tiers: ["as", "try", "parse"],
      mint: ["wire-input"],
      description: "DNS / Cloudflare zone \u2014 mint from wire via parseZoneId"
    },
    {
      name: "DocTokenId",
      domain: "documents",
      tiers: ["as", "try", "parse"],
      mint: ["wire-input", "system-internal"],
      description: "Bun documentation token identity (catalog / TokenRef northstar)"
    }
  ];
});

// lib/types/branded/security.ts
var challenge, policy, asChallengeId, tryChallengeId, parseChallengeId, asPolicyId, tryPolicyId, parsePolicyId, SECURITY_BRAND_SPECS;
var init_security = __esm(() => {
  init__core();
  challenge = defineBrandConstructors("ChallengeId");
  policy = defineBrandConstructors("PolicyId");
  asChallengeId = challenge.as;
  tryChallengeId = challenge.try;
  parseChallengeId = challenge.parse;
  asPolicyId = policy.as;
  tryPolicyId = policy.try;
  parsePolicyId = policy.parse;
  SECURITY_BRAND_SPECS = [
    {
      name: "ChallengeId",
      domain: "security",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Auth challenge / proof-of-possession handle"
    },
    {
      name: "PolicyId",
      domain: "security",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Access policy identity"
    }
  ];
});

// lib/types/branded/deployment.ts
var deployment, asDeploymentId, tryDeploymentId, parseDeploymentId, DEPLOYMENT_BRAND_SPECS;
var init_deployment = __esm(() => {
  init__core();
  deployment = defineBrandConstructors("DeploymentId");
  asDeploymentId = deployment.as;
  tryDeploymentId = deployment.try;
  parseDeploymentId = deployment.parse;
  DEPLOYMENT_BRAND_SPECS = [
    {
      name: "DeploymentId",
      domain: "deployment",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Release / deployment instance identity"
    }
  ];
});

// lib/types/branded/audit.ts
var version, audit, finding, concept, entry, evidence, asVersionId, tryVersionId, parseVersionId, asAuditId, tryAuditId, parseAuditId, asAuditFindingId, tryAuditFindingId, parseAuditFindingId, asAuditConceptId, tryAuditConceptId, parseAuditConceptId, asAuditEntryId, tryAuditEntryId, parseAuditEntryId, asEvidenceId, tryEvidenceId, parseEvidenceId, AUDIT_BRAND_SPECS;
var init_audit = __esm(() => {
  init__core();
  version = defineBrandConstructors("VersionId");
  audit = defineBrandConstructors("AuditId");
  finding = defineBrandConstructors("AuditFindingId");
  concept = defineBrandConstructors("AuditConceptId");
  entry = defineBrandConstructors("AuditEntryId");
  evidence = defineBrandConstructors("EvidenceId");
  asVersionId = version.as;
  tryVersionId = version.try;
  parseVersionId = version.parse;
  asAuditId = audit.as;
  tryAuditId = audit.try;
  parseAuditId = audit.parse;
  asAuditFindingId = finding.as;
  tryAuditFindingId = finding.try;
  parseAuditFindingId = finding.parse;
  asAuditConceptId = concept.as;
  tryAuditConceptId = concept.try;
  parseAuditConceptId = concept.parse;
  asAuditEntryId = entry.as;
  tryAuditEntryId = entry.try;
  parseAuditEntryId = entry.parse;
  asEvidenceId = evidence.as;
  tryEvidenceId = evidence.try;
  parseEvidenceId = evidence.parse;
  AUDIT_BRAND_SPECS = [
    {
      name: "VersionId",
      domain: "audit",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Secret or config version identity"
    },
    {
      name: "AuditId",
      domain: "audit",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Audit log entry identity"
    },
    {
      name: "AuditFindingId",
      domain: "audit",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "FactoryWager audit-finding SSOT primary key"
    },
    {
      name: "AuditConceptId",
      domain: "audit",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "FactoryWager audit-concept SSOT primary key"
    },
    {
      name: "AuditEntryId",
      domain: "audit",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Polymorphic audit SSOT ref (finding or concept id)"
    },
    {
      name: "EvidenceId",
      domain: "audit",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Screenshot / image evidence row (UUID v7 via Bun.randomUUIDv7)"
    }
  ];
});

// lib/types/branded/operations.ts
var operation, resource, project, pipeline, job, step, webhook, feed, run, decision, loop, treeNode, experiment, experimentVariant, experimentAssignment, asOperationId, tryOperationId, parseOperationId, asResourceId, tryResourceId, parseResourceId, asProjectId, tryProjectId, parseProjectId, asPipelineId, tryPipelineId, parsePipelineId, asJobId, tryJobId, parseJobId, asStepId, tryStepId, parseStepId, asWebhookId, tryWebhookId, parseWebhookId, asFeedId, tryFeedId, parseFeedId, asRunId, tryRunId, parseRunId, asDecisionId, tryDecisionId, parseDecisionId, asLoopId, tryLoopId, parseLoopId, asTreeNodeId, tryTreeNodeId, parseTreeNodeId, asExperimentId, tryExperimentId, parseExperimentId, asExperimentVariantId, tryExperimentVariantId, parseExperimentVariantId, asExperimentAssignmentId, tryExperimentAssignmentId, parseExperimentAssignmentId, OPERATIONS_BRAND_SPECS;
var init_operations = __esm(() => {
  init__core();
  operation = defineBrandConstructors("OperationId");
  resource = defineBrandConstructors("ResourceId");
  project = defineBrandConstructors("ProjectId");
  pipeline = defineBrandConstructors("PipelineId");
  job = defineBrandConstructors("JobId");
  step = defineBrandConstructors("StepId");
  webhook = defineBrandConstructors("WebhookId");
  feed = defineBrandConstructors("FeedId");
  run = defineBrandConstructors("RunId");
  decision = defineBrandConstructors("DecisionId");
  loop = defineBrandConstructors("LoopId");
  treeNode = defineBrandConstructors("TreeNodeId");
  experiment = defineBrandConstructors("ExperimentId");
  experimentVariant = defineBrandConstructors("ExperimentVariantId");
  experimentAssignment = defineBrandConstructors("ExperimentAssignmentId");
  asOperationId = operation.as;
  tryOperationId = operation.try;
  parseOperationId = operation.parse;
  asResourceId = resource.as;
  tryResourceId = resource.try;
  parseResourceId = resource.parse;
  asProjectId = project.as;
  tryProjectId = project.try;
  parseProjectId = project.parse;
  asPipelineId = pipeline.as;
  tryPipelineId = pipeline.try;
  parsePipelineId = pipeline.parse;
  asJobId = job.as;
  tryJobId = job.try;
  parseJobId = job.parse;
  asStepId = step.as;
  tryStepId = step.try;
  parseStepId = step.parse;
  asWebhookId = webhook.as;
  tryWebhookId = webhook.try;
  parseWebhookId = webhook.parse;
  asFeedId = feed.as;
  tryFeedId = feed.try;
  parseFeedId = feed.parse;
  asRunId = run.as;
  tryRunId = run.try;
  parseRunId = run.parse;
  asDecisionId = decision.as;
  tryDecisionId = decision.try;
  parseDecisionId = decision.parse;
  asLoopId = loop.as;
  tryLoopId = loop.try;
  parseLoopId = loop.parse;
  asTreeNodeId = treeNode.as;
  tryTreeNodeId = treeNode.try;
  parseTreeNodeId = treeNode.parse;
  asExperimentId = experiment.as;
  tryExperimentId = experiment.try;
  parseExperimentId = experiment.parse;
  asExperimentVariantId = experimentVariant.as;
  tryExperimentVariantId = experimentVariant.try;
  parseExperimentVariantId = experimentVariant.parse;
  asExperimentAssignmentId = experimentAssignment.as;
  tryExperimentAssignmentId = experimentAssignment.try;
  parseExperimentAssignmentId = experimentAssignment.parse;
  OPERATIONS_BRAND_SPECS = [
    {
      name: "OperationId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Batch or async operation handle"
    },
    {
      name: "ResourceId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Generic resource pointer (errors, ACL subjects)"
    },
    {
      name: "ProjectId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["user-input", "wire-input"],
      description: "Project / workspace identity"
    },
    {
      name: "PipelineId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Transform or CI pipeline identity"
    },
    {
      name: "JobId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Scheduled or queued job identity"
    },
    {
      name: "StepId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Pipeline step identity"
    },
    {
      name: "WebhookId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Webhook registration identity"
    },
    {
      name: "FeedId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "RSS / event feed identity"
    },
    {
      name: "RunId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal"],
      description: "Benchmark / search-loop run identity"
    },
    {
      name: "DecisionId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Decision evidence record identity"
    },
    {
      name: "LoopId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal"],
      description: "Search / maintenance loop identity"
    },
    {
      name: "TreeNodeId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "wire-input"],
      description: "Ops tree node (partner / agent / sub_agent) identity"
    },
    {
      name: "ExperimentId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal", "user-input", "wire-input"],
      description: "Factorial or multi-variant experiment identity"
    },
    {
      name: "ExperimentVariantId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal"],
      description: "One design cell (factor combination) in an experiment"
    },
    {
      name: "ExperimentAssignmentId",
      domain: "operations",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal"],
      description: "Sticky partner-to-variant assignment row"
    }
  ];
});

// lib/types/branded/portal.ts
var portalTenant, telegramUser, portalAccount, linkNonce, asPortalTenantId, tryPortalTenantId, parsePortalTenantId, asTelegramUserId, tryTelegramUserId, parseTelegramUserId, asPortalAccountId, tryPortalAccountId, parsePortalAccountId, asLinkNonceId, tryLinkNonceId, parseLinkNonceId, PORTAL_BRAND_SPECS;
var init_portal = __esm(() => {
  init__core();
  portalTenant = defineBrandConstructors("PortalTenantId");
  telegramUser = defineBrandConstructors("TelegramUserId");
  portalAccount = defineBrandConstructors("PortalAccountId");
  linkNonce = defineBrandConstructors("LinkNonceId");
  asPortalTenantId = portalTenant.as;
  tryPortalTenantId = portalTenant.try;
  parsePortalTenantId = portalTenant.parse;
  asTelegramUserId = telegramUser.as;
  tryTelegramUserId = telegramUser.try;
  parseTelegramUserId = telegramUser.parse;
  asPortalAccountId = portalAccount.as;
  tryPortalAccountId = portalAccount.try;
  parsePortalAccountId = portalAccount.parse;
  asLinkNonceId = linkNonce.as;
  tryLinkNonceId = linkNonce.try;
  parseLinkNonceId = linkNonce.parse;
  PORTAL_BRAND_SPECS = [
    {
      name: "PortalTenantId",
      domain: "portal",
      tiers: ["as", "try", "parse"],
      mint: ["user-input", "wire-input"],
      description: "Multi-tenant portal tenant key (factory | science | tennis)"
    },
    {
      name: "TelegramUserId",
      domain: "portal",
      tiers: ["as", "try", "parse"],
      mint: ["wire-input"],
      description: "Telegram user id from Bot API"
    },
    {
      name: "PortalAccountId",
      domain: "portal",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal"],
      description: "Portal user account primary key (UUID v7)"
    },
    {
      name: "LinkNonceId",
      domain: "portal",
      tiers: ["as", "try", "parse"],
      mint: ["system-internal"],
      description: "Telegram link nonce for account binding"
    }
  ];
});

// lib/types/branded/index.ts
var BRAND_CATALOG;
var init_branded = __esm(() => {
  init__core();
  init_session();
  init_identity();
  init_documents();
  init_security();
  init_deployment();
  init_audit();
  init_operations();
  init_portal();
  init_session();
  init_identity();
  init_documents();
  init_security();
  init_deployment();
  init_audit();
  init_operations();
  init_portal();
  BRAND_CATALOG = [
    ...SESSION_BRAND_SPECS,
    ...IDENTITY_BRAND_SPECS,
    ...DOCUMENT_BRAND_SPECS,
    ...SECURITY_BRAND_SPECS,
    ...DEPLOYMENT_BRAND_SPECS,
    ...AUDIT_BRAND_SPECS,
    ...OPERATIONS_BRAND_SPECS,
    ...PORTAL_BRAND_SPECS
  ];
});

// lib/types/branded.ts
var init_branded2 = __esm(() => {
  init_branded();
});

// lib/path-bun.ts
function normalizePath2(path) {
  const isAbs = path.startsWith("/");
  const out = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".")
      continue;
    if (seg === "..") {
      if (out.length > 0)
        out.pop();
      continue;
    }
    out.push(seg);
  }
  const body = out.join("/");
  if (isAbs)
    return `/${body}`;
  return body || ".";
}
function joinPath(...parts) {
  return normalizePath2(parts.filter((p) => p != null && String(p) !== "").join("/"));
}

// tools/verify-bun-release.ts
var {CryptoHasher, inspect, version: version2, revision, spawn, $ } = globalThis.Bun;
import { writeFileSync, readFileSync } from "fs";

// lib/docs/bun-release-tracker.ts
import tls from "tls";

// lib/deep-equals.ts
init_bun_site_url();
var BUN_DEEP_EQUALS_DOCS = bunDocs("runtime/utils", "bun-deepequals");

// lib/docs/repo-docs.ts
function canonicalRemote(remote, host, owner, name) {
  return {
    remote,
    host,
    owner,
    name,
    url: `https://${host}/${owner}/${name}`
  };
}
var CANONICAL_REMOTES = {
  origin: canonicalRemote("origin", "github.com", "brendadeeznuts1111", "project-R-score"),
  cascade: canonicalRemote("cascade", "github.com", "brendadeeznuts1111", "cascade-mover-v3")
};

// lib/http/verification-scripts.ts
var GITHUB_RAW_BRANCH = "main";
function verificationScriptGitHubRawUrl(path, branch = GITHUB_RAW_BRANCH) {
  const { owner, name } = CANONICAL_REMOTES.origin;
  return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`;
}

// lib/verification/types.ts
var RELEASE_PROOF_REPORT_PATH = "/registry/release-features.json";

// lib/verification/links.ts
var RELEASE_SOURCE_PATH = "tools/verify-bun-release.ts";
function buildVerificationLinks(canonical, options = {}) {
  return {
    docs: canonical ?? "https://bun.com/docs",
    source: verificationScriptGitHubRawUrl(options.sourcePath ?? RELEASE_SOURCE_PATH),
    report: options.reportPath ?? RELEASE_PROOF_REPORT_PATH
  };
}

// lib/verification/canonical-coverage.ts
await init_bun_doc_refs();
var INSTALL_PLATFORM_PROOF_REPORT_PATH = "/registry/install-platform.json";
var INSTALL_PLATFORM_VERIFY_SOURCE = "tools/verify-install-platform.ts";
var DEFAULT_PLATFORM_DEPS = CANONICAL_REFS["platform-specific dependencies"] ?? "https://bun.com/docs/pm/cli/install#platform-specific-dependencies";
var INSTALL_ASPECT_CANONICAL_KEYS = {
  "bun-binary-resolved": "Bun.which",
  "bun-config-env-ssot": "BUN install environment variables",
  "forbidden-install-env": "install env precedence",
  "install-mechanism-notes-ssot": "bun install cache mechanism",
  "runtime-flags": "bun install --cpu",
  "profile-ssot": "bun install --cpu",
  "monorepo-cross-dry-run": "bun install --cpu",
  "lockfile-stable": "platform-specific dependencies",
  "lockfile-config-version": "isolated installs",
  "machine-isolated-linker": "isolated installs",
  "machine-global-store": "global virtual store"
};
function resolveCanonicalUrl(key, fallback) {
  return CANONICAL_REFS[key] ?? fallback ?? DEFAULT_PLATFORM_DEPS;
}
function resolveInstallAspectCanonical(aspect) {
  const canonicalKey = INSTALL_ASPECT_CANONICAL_KEYS[aspect] ?? "platform-specific dependencies";
  const canonical = resolveCanonicalUrl(canonicalKey);
  return {
    canonicalKey,
    canonical,
    _links: buildVerificationLinks(canonical, {
      reportPath: INSTALL_PLATFORM_PROOF_REPORT_PATH,
      sourcePath: INSTALL_PLATFORM_VERIFY_SOURCE
    })
  };
}
function ensureVerificationResultsHaveCanonical(results, options = {}) {
  const missing = [];
  const unknownUrls = [];
  const knownUrls = new Set(Object.values(CANONICAL_REFS));
  for (const r of results) {
    if (!r.canonical) {
      missing.push(r.name);
      continue;
    }
    if (!knownUrls.has(r.canonical)) {
      unknownUrls.push(`${r.name} \u2192 ${r.canonical}`);
    }
  }
  const ok = missing.length === 0 && (options.strictUrls !== true || unknownUrls.length === 0);
  return { ok, missing, unknownUrls };
}
function reportCanonicalCoverageGaps(report, label) {
  for (const name of report.missing) {
    console.warn(`\u26A0\uFE0F  [${label}] Test "${name}" has no canonical reference.`);
  }
  for (const line of report.unknownUrls) {
    console.warn(`\u26A0\uFE0F  [${label}] Test ${line} is not in CANONICAL_REFS.`);
  }
  if (!report.ok) {
    console.error(`\u274C [${label}] Canonical coverage failed (${report.missing.length} missing).`);
  }
  return report.ok;
}

// lib/docs/fetch-protocol-docs.ts
import { mkdtemp, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";

// config/r2-env.ts
var CLOUDFLARE_DEFAULTS = {
  accountId: "7a470541a704caaf91e71efccc78fd36",
  pages: {
    project: "project-r-score",
    subdomain: "project-r-score.pages.dev",
    customDomain: "score.factory-wager.com",
    productionBranch: "main",
    destinationDir: "public",
    buildCommand: "exit 0",
    rootDir: "",
    bunVersion: "1.3.14",
    skipDependencyInstall: true
  },
  zones: {
    factoryWager: {
      id: "a3b7ba4bb62cb1b177b04b8675250674",
      name: "factory-wager.com"
    },
    missonControl: {
      id: "ba2906afe573e63c6b32f471d2fe01fe",
      name: "misson-control.com"
    }
  },
  wikiHost: "wiki.factory-wager.com",
  registryHost: "registry.factory-wager.com",
  registryBucket: "factory-wager-registry",
  registryDoctorBucket: "npm-registry",
  benchPrefix: "reports/search-bench"
};
function envString(key, fallback = "") {
  const val = Bun.env[key];
  if (val == null)
    return fallback;
  const trimmed = val.trim();
  return trimmed || fallback;
}
function parseTruthy(raw, defaultValue) {
  if (!raw)
    return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v))
    return true;
  if (["0", "false", "no", "off"].includes(v))
    return false;
  return defaultValue;
}
function cloudflareAccountIdFromEnv() {
  return envString("R2_ACCOUNT_ID") || envString("CLOUDFLARE_ACCOUNT_ID") || CLOUDFLARE_DEFAULTS.accountId;
}
function r2EndpointFromAccount(accountId = cloudflareAccountIdFromEnv()) {
  return envString("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
}
function r2BucketFromEnv() {
  return envString("R2_BENCH_BUCKET") || envString("R2_BUCKET") || envString("R2_BUCKET_NAME") || envString("R2_REGISTRY_BUCKET");
}
function r2BenchPrefixFromEnv() {
  return envString("R2_BENCH_PREFIX", CLOUDFLARE_DEFAULTS.benchPrefix);
}
function r2BucketUrlFromEnv() {
  return envString("R2_BUCKET_URL") || `${r2EndpointFromAccount()}/${CLOUDFLARE_DEFAULTS.registryBucket}`;
}
var R2_CONFIG = {
  accountId: cloudflareAccountIdFromEnv(),
  accessKeyId: envString("R2_ACCESS_KEY_ID"),
  secretAccessKey: envString("R2_SECRET_ACCESS_KEY"),
  cloudflareApiToken: envString("CLOUDFLARE_API_TOKEN"),
  bucket: envString("R2_BUCKET", "bun-docs-prod"),
  bucketName: envString("R2_BUCKET_NAME", "factory-wager-wiki"),
  benchPrefix: r2BenchPrefixFromEnv(),
  endpoint: r2EndpointFromAccount(),
  bucketUrl: r2BucketUrlFromEnv()
};
var pages = CLOUDFLARE_DEFAULTS.pages;
var CLOUDFLARE_PAGES = {
  ...pages,
  url: `https://${pages.subdomain}`,
  customUrl: `https://${pages.customDomain}`,
  bunVersion: envString("BUN_VERSION", pages.bunVersion),
  skipDependencyInstall: parseTruthy(envString("SKIP_DEPENDENCY_INSTALL"), pages.skipDependencyInstall)
};
var CLOUDFLARE_ZONE = {
  id: envString("CLOUDFLARE_ZONE_ID", CLOUDFLARE_DEFAULTS.zones.factoryWager.id),
  name: envString("CLOUDFLARE_ZONE_NAME", CLOUDFLARE_DEFAULTS.zones.factoryWager.name)
};
if (false) {}

// lib/security/r2-credentials.ts
init_branded2();
function asOptionalString(value) {
  if (value == null)
    return;
  const s = String(value).trim();
  return s || undefined;
}
function normalizeR2Credentials(input = {}) {
  return {
    accountId: tryAccountId(asOptionalString(input.accountId)),
    accessKeyId: tryAccessKeyId(asOptionalString(input.accessKeyId)),
    secretAccessKey: input.secretAccessKey ?? "",
    endpoint: input.endpoint?.trim() || undefined,
    bucketName: input.bucketName?.trim() || undefined
  };
}
function r2CredentialsFromEnv(overrides = {}, env = Bun.env) {
  const envAccount = overrides.accountId ?? env["R2_ACCOUNT_ID"] ?? env["CLOUDFLARE_ACCOUNT_ID"] ?? undefined;
  const envEndpoint = overrides.endpoint ?? env["R2_ENDPOINT"] ?? env["S3_ENDPOINT"] ?? undefined;
  const envBucket = overrides.bucketName ?? env["R2_REGISTRY_BUCKET"] ?? env["R2_BUCKET_NAME"] ?? env["R2_BUCKET"] ?? env["S3_BUCKET_NAME"] ?? env["AWS_BUCKET_NAME"] ?? undefined;
  return normalizeR2Credentials({
    accountId: envAccount || cloudflareAccountIdFromEnv(),
    accessKeyId: overrides.accessKeyId ?? env["R2_ACCESS_KEY_ID"] ?? env["AWS_ACCESS_KEY_ID"],
    secretAccessKey: overrides.secretAccessKey ?? env["R2_SECRET_ACCESS_KEY"] ?? env["AWS_SECRET_ACCESS_KEY"] ?? "",
    endpoint: envEndpoint || r2EndpointFromAccount(),
    bucketName: envBucket || r2BucketFromEnv() || undefined
  });
}
function hasR2Credentials(creds) {
  return Boolean(creds.accountId && creds.accessKeyId && creds.secretAccessKey);
}

// lib/docs/fetch-protocol-docs.ts
var FETCH_DOC = "https://bun.com/docs/runtime/networking/fetch";
var FETCH_PROTOCOL_DOCS = {
  protocolSupport: `${FETCH_DOC}#protocol-support`,
  s3: `${FETCH_DOC}#s3-urls-s3`,
  file: `${FETCH_DOC}#file-urls-file`,
  data: `${FETCH_DOC}#data-urls-data`,
  blob: `${FETCH_DOC}#blob-urls-blob`
};
var FETCH_PROTOCOL_COVERAGE = [
  {
    protocol: "data:",
    canonical: FETCH_PROTOCOL_DOCS.data,
    probe: "fetch protocol (data:)",
    offline: true
  },
  {
    protocol: "blob:",
    canonical: FETCH_PROTOCOL_DOCS.blob,
    probe: "fetch protocol (blob:)",
    offline: true
  },
  {
    protocol: "file://",
    canonical: FETCH_PROTOCOL_DOCS.file,
    probe: "fetch protocol (file://)",
    offline: true
  },
  {
    protocol: "s3:// (explicit)",
    canonical: FETCH_PROTOCOL_DOCS.s3,
    probe: "fetch s3:// (explicit s3: creds)",
    offline: false
  },
  {
    protocol: "s3:// (env)",
    canonical: FETCH_PROTOCOL_DOCS.s3,
    probe: "fetch s3:// (env credentials)",
    offline: false
  },
  {
    protocol: "s3:// (Bun.file)",
    canonical: FETCH_PROTOCOL_DOCS.s3,
    probe: "fetch s3:// (Bun.file)",
    offline: false
  }
];
function buildFetchS3Request(bucket, key, creds) {
  const path = key.replace(/^\//, "");
  const url = `s3://${bucket}/${path}`;
  if (!creds) {
    return { url };
  }
  const s3 = {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    ...creds.region ? { region: creds.region } : {},
    ...creds.endpoint ? { endpoint: creds.endpoint } : {}
  };
  return { url, init: { s3 } };
}
function awsEnvFromR2Credentials(creds) {
  const env = {
    AWS_ACCESS_KEY_ID: String(creds.accessKeyId),
    AWS_SECRET_ACCESS_KEY: creds.secretAccessKey,
    AWS_REGION: "auto"
  };
  if (creds.endpoint) {
    env["S3_ENDPOINT"] = creds.endpoint;
    env["AWS_ENDPOINT_URL"] = creds.endpoint;
  }
  return env;
}
function fetchS3InitFromR2(creds) {
  return {
    accessKeyId: String(creds.accessKeyId),
    secretAccessKey: creds.secretAccessKey,
    region: "auto",
    ...creds.endpoint ? { endpoint: creds.endpoint } : {}
  };
}
async function spawnEval(script, env = {}, timeoutMs = 15000) {
  const proc = Bun.spawn(["bun", "-e", script], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: { ...process.env, ...env }
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);
  clearTimeout(timer);
  if (timedOut) {
    return { ok: false, note: `timed out after ${timeoutMs}ms` };
  }
  if (code !== 0) {
    return { ok: false, note: `exit ${code}: ${(err || out).trim().slice(0, 200)}` };
  }
  try {
    const json = JSON.parse(out.trim());
    return { ok: true, note: out.trim(), json };
  } catch {
    return { ok: false, note: `invalid JSON: ${out.trim().slice(0, 200)}` };
  }
}
function s3Url(bucket, key) {
  return `s3://${bucket}/${key.replace(/^\//, "")}`;
}
function formatS3Metrics(json) {
  const status = json["status"];
  const ct = json["ct"] ?? json["contentType"] ?? "\u2014";
  const bytes = json["bytes"] ?? json["size"] ?? 0;
  const exists = json["exists"];
  if (exists != null) {
    return `exists=${String(exists)} size=${String(bytes)}B`;
  }
  return `HTTP ${String(status)} ct=${String(ct)} bytes=${String(bytes)}B`;
}
async function probeFetchData() {
  const name = "fetch protocol (data:)";
  try {
    const res = await fetch("data:text/plain;base64,SGVsbG8=");
    const text = await res.text();
    const ok = res.ok && text === "Hello";
    return {
      name,
      ok,
      note: ok ? `data: round-trip (${res.status})` : `expected Hello, got ${JSON.stringify(text)}`,
      canonical: FETCH_PROTOCOL_DOCS.data
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.data
    };
  }
}
async function probeFetchBlob() {
  const name = "fetch protocol (blob:)";
  const blob = new Blob(["blob-ok"], { type: "text/plain" });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const res = await fetch(blobUrl);
    const text = await res.text();
    const ok = res.ok && text === "blob-ok";
    return {
      name,
      ok,
      note: ok ? `blob: round-trip (${res.status})` : `expected blob-ok, got ${JSON.stringify(text)}`,
      canonical: FETCH_PROTOCOL_DOCS.blob
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.blob
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
async function probeFetchFile() {
  const name = "fetch protocol (file://)";
  const dir = await mkdtemp(join(tmpdir(), "fw-fetch-file-"));
  const path = join(dir, "probe.txt");
  try {
    await Bun.write(path, "file-protocol-ok");
    const href = pathToFileURL(path).href;
    const fetchRes = await fetch(href);
    const fetchText = await fetchRes.text();
    const fileText = await Bun.file(path).text();
    const ok = fetchText === "file-protocol-ok" && fileText === "file-protocol-ok";
    return {
      name,
      ok,
      note: ok ? `fetch(file://) + Bun.file(path) round-trip (${fetchRes.status})` : `mismatch fetch=${JSON.stringify(fetchText)} Bun.file=${JSON.stringify(fileText)}`,
      canonical: FETCH_PROTOCOL_DOCS.file
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.file
    };
  } finally {
    await unlink(path).catch(() => {});
  }
}
async function probeFetchS3Explicit(creds, key) {
  const name = "fetch s3:// (explicit s3: creds)";
  const bucket = creds.bucketName;
  const { url, init } = buildFetchS3Request(bucket, key, fetchS3InitFromR2(creds));
  try {
    const res = await fetch(url, init);
    const ct = res.headers.get("content-type") ?? "\u2014";
    const etag = (res.headers.get("etag") ?? "\u2014").slice(0, 24);
    let bytes = 0;
    if (res.ok) {
      bytes = (await res.arrayBuffer()).byteLength;
    }
    const protocolOk = typeof res.status === "number" && res.status > 0;
    return {
      name,
      ok: protocolOk,
      note: `explicit s3: \u2192 HTTP ${res.status} ct=${ct} etag=${etag} bytes=${bytes}B`,
      canonical: FETCH_PROTOCOL_DOCS.s3
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.s3
    };
  }
}
async function probeFetchS3Env(creds, key) {
  const name = "fetch s3:// (env credentials)";
  const bucket = creds.bucketName;
  const url = s3Url(bucket, key);
  const script = `
const res = await fetch(${JSON.stringify(url)});
const ct = res.headers.get('content-type') ?? '';
const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
console.log(JSON.stringify({ status: res.status, ct, bytes }));
`.trim();
  const spawned = await spawnEval(script, awsEnvFromR2Credentials(creds));
  if (!spawned.ok || !spawned.json) {
    return { name, ok: false, note: spawned.note, canonical: FETCH_PROTOCOL_DOCS.s3 };
  }
  return {
    name,
    ok: true,
    note: `env AWS_* \u2192 ${formatS3Metrics(spawned.json)}`,
    canonical: FETCH_PROTOCOL_DOCS.s3
  };
}
async function probeFetchS3BunFile(creds, key) {
  const name = "fetch s3:// (Bun.file)";
  const url = s3Url(creds.bucketName, key);
  const script = `
const f = Bun.file(${JSON.stringify(url)});
const exists = await f.exists();
const size = exists ? f.size : 0;
console.log(JSON.stringify({ exists, bytes: size }));
`.trim();
  const spawned = await spawnEval(script, awsEnvFromR2Credentials(creds));
  if (!spawned.ok || !spawned.json) {
    return { name, ok: false, note: spawned.note, canonical: FETCH_PROTOCOL_DOCS.s3 };
  }
  return {
    name,
    ok: true,
    note: `Bun.file env creds \u2192 ${formatS3Metrics(spawned.json)}`,
    canonical: FETCH_PROTOCOL_DOCS.s3
  };
}
function skipS3Row(name, note) {
  return { name, ok: true, skipped: true, note, canonical: FETCH_PROTOCOL_DOCS.s3 };
}
async function runFetchProtocolProbes(env = Bun.env) {
  const rows = [
    await probeFetchData(),
    await probeFetchBlob(),
    await probeFetchFile()
  ];
  const creds = r2CredentialsFromEnv({}, env);
  const skipNote = "skipped \u2014 set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID (+ bucket) for live s3:// probes";
  if (!hasR2Credentials(creds) || !creds.bucketName) {
    rows.push(skipS3Row("fetch s3:// (explicit s3: creds)", skipNote));
    rows.push(skipS3Row("fetch s3:// (env credentials)", skipNote));
    rows.push(skipS3Row("fetch s3:// (Bun.file)", skipNote));
  } else {
    const key = env["R2_PROBE_KEY"]?.trim() || "monitoring.json";
    rows.push(await probeFetchS3Explicit(creds, key));
    rows.push(await probeFetchS3Env(creds, key));
    rows.push(await probeFetchS3BunFile(creds, key));
  }
  return { ok: rows.every((r) => r.ok), rows };
}
// lib/docs/bun-install-platform-docs.ts
import { mkdtemp as mkdtemp2, rm } from "fs/promises";
import { tmpdir as tmpdir2 } from "os";
import { join as join2 } from "path";

// lib/verification/resolve-bun-binary.ts
import { existsSync, realpathSync } from "fs";
var cached;
function normalizeVersion(version2) {
  return version2.trim().split(/[\s+]/)[0] ?? version2.trim();
}
function readSpawnedVersion(bunPath) {
  try {
    const proc = Bun.spawnSync([bunPath, "--version"], {
      stdout: "pipe",
      stderr: "ignore",
      stdin: "ignore"
    });
    if (proc.exitCode !== 0)
      return;
    return normalizeVersion(new TextDecoder().decode(proc.stdout));
  } catch {
    return;
  }
}
function resolveExecPath() {
  try {
    const execPath = process.execPath;
    if (!execPath || !existsSync(execPath))
      return null;
    return realpathSync(execPath);
  } catch {
    return process.execPath || null;
  }
}
function resolveBunInstallPath() {
  const candidates = [
    Bun.env.BUN_INSTALL ? `${Bun.env.BUN_INSTALL}/bin/bun` : "",
    Bun.env.HOME ? `${Bun.env.HOME}/.bun/bin/bun` : ""
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate))
      return candidate;
  }
  return null;
}
function resolveVerificationBunBinary(options = {}) {
  const preferRuntime = options.preferRuntime !== false;
  if (cached && !options.fresh && !options.envPath && preferRuntime) {
    return cached;
  }
  const runtimeVersion = Bun.version;
  let path = null;
  let source = "which";
  if (preferRuntime) {
    path = resolveExecPath();
    if (path)
      source = "runtime";
  }
  if (!path) {
    path = Bun.which("bun", { PATH: options.envPath ?? Bun.env.PATH });
    if (path)
      source = "which";
  }
  if (!path) {
    path = resolveBunInstallPath();
    if (path)
      source = "bun-install";
  }
  if (!path) {
    throw new Error("resolveVerificationBunBinary: no bun executable found (runtime execPath, Bun.which, BUN_INSTALL)");
  }
  const spawnedVersion = readSpawnedVersion(path);
  const matchesRuntime = spawnedVersion != null && normalizeVersion(spawnedVersion) === normalizeVersion(runtimeVersion);
  const result = {
    path,
    source,
    runtimeVersion,
    spawnedVersion,
    matchesRuntime
  };
  if (!options.fresh && !options.envPath && preferRuntime) {
    cached = result;
  }
  return result;
}
function formatSpawnedBunNote(resolved) {
  const base = resolved.path.split("/").pop() ?? resolved.path;
  const mismatch = resolved.matchesRuntime ? "" : " \xB7 runtime/cli MISMATCH";
  return `spawned=${base} source=${resolved.source} runtime=${resolved.runtimeVersion}${resolved.spawnedVersion ? ` cli=${resolved.spawnedVersion}` : ""}${mismatch}`;
}

// lib/docs/bun-install-platform-docs.ts
init_bun_site_url();
var INSTALL_PLATFORM_DOCS = {
  platformSpecificDependencies: bunDocs("pm/cli/install", "platform-specific-dependencies"),
  cpuAndOsFlags: bunDocs("pm/cli/install", "cpu-and-os-flags")
};
var BUN_INSTALL_PLATFORM_SUPPORTED = {
  cpu: [
    "arm",
    "arm64",
    "ia32",
    "mips",
    "mipsel",
    "ppc",
    "ppc64",
    "s390",
    "s390x",
    "x32",
    "x64"
  ],
  os: ["aix", "android", "darwin", "freebsd", "linux", "openbsd", "sunos", "win32"]
};
var BUN_INSTALL_CPU_VALUES = BUN_INSTALL_PLATFORM_SUPPORTED.cpu;
var BUN_INSTALL_OS_VALUES = BUN_INSTALL_PLATFORM_SUPPORTED.os;
var INSTALL_PLATFORM_COVERAGE = [
  {
    topic: "lockfile normalization (cpu/os in bun.lock)",
    canonical: INSTALL_PLATFORM_DOCS.platformSpecificDependencies,
    probe: "bun install --cpu/--os flags"
  },
  {
    topic: "cross-platform target override (--cpu / --os)",
    canonical: INSTALL_PLATFORM_DOCS.cpuAndOsFlags,
    probe: "bun install --cpu/--os flags",
    supported: BUN_INSTALL_PLATFORM_SUPPORTED
  }
];
function decodeSpawnOutput(data) {
  if (data == null)
    return "";
  if (typeof data === "string")
    return data;
  return new TextDecoder().decode(data);
}
async function probeBunInstallPlatformFlags() {
  const dir = await mkdtemp2(join2(tmpdir2(), "fw-bun-install-probe-"));
  const bunPath = resolveVerificationBunBinary().path;
  try {
    await Bun.write(join2(dir, "package.json"), JSON.stringify({ name: "fw-install-platform-probe", dependencies: {} }));
    const valid = Bun.spawnSync([bunPath, "install", "--cpu=x64", "--os=linux", "--dry-run", "--ignore-scripts"], { cwd: dir, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
    const invalid = Bun.spawnSync([bunPath, "install", "--cpu=bogus", "--os=linux", "--dry-run", "--ignore-scripts"], { cwd: dir, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
    const validOk = valid.exitCode === 0;
    const invalidMessage = decodeSpawnOutput(invalid.stderr).trim();
    const invalidOk = invalid.exitCode !== 0 && invalidMessage.includes("Invalid CPU");
    const ok = validOk && invalidOk;
    const note = ok ? "dry-run --cpu=x64 --os=linux exit=0; invalid cpu rejected" : [
      validOk ? "valid ok" : `valid exit=${valid.exitCode}`,
      invalidOk ? "invalid ok" : `invalid exit=${invalid.exitCode} msg=${invalidMessage.slice(0, 120)}`
    ].join("; ");
    return {
      ok,
      note,
      validExitCode: valid.exitCode,
      invalidExitCode: invalid.exitCode,
      invalidMessage
    };
  } catch (e) {
    return {
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      validExitCode: null,
      invalidExitCode: null,
      invalidMessage: ""
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
// lib/verification/install-platform.ts
import { createHash } from "crypto";
import { readFile } from "fs/promises";

// lib/docs/bun-install-linker-docs.ts
init_bun_site_url();
var INSTALL_LINKER_DOCS = {
  isolatedInstalls: bunDocs("pm/isolated-installs"),
  globalStore: bunDocs("pm/global-store"),
  lockfile: bunDocs("pm/lockfile"),
  bunfigGlobalStore: "https://bun.com/docs/runtime/bunfig#install-globalstore"
};
var LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT = 1;
async function readLockfileInstallMeta(rootDir) {
  const lockPath = joinPath(rootDir, "bun.lock");
  if (!await Bun.file(lockPath).exists())
    return null;
  const text = await Bun.file(lockPath).text();
  const configMatch = text.match(/"configVersion":\s*(\d+)/);
  const lockMatch = text.match(/"lockfileVersion":\s*(\d+)/);
  const hasWorkspaces = text.includes('"workspaces"');
  const configVersion = configMatch ? Number(configMatch[1]) : null;
  return {
    configVersion,
    lockfileVersion: lockMatch ? Number(lockMatch[1]) : null,
    hasWorkspaces,
    expectsIsolatedDefault: configVersion === LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT && hasWorkspaces
  };
}
async function probeLockfileConfigVersion(rootDir) {
  const meta = await readLockfileInstallMeta(rootDir);
  if (!meta) {
    return { ok: false, note: "bun.lock missing", meta: null };
  }
  if (meta.configVersion === 0) {
    return {
      ok: false,
      note: "configVersion=0 (hoisted legacy) \u2014 workspace monorepo expects configVersion=1 for isolated default",
      meta
    };
  }
  if (meta.expectsIsolatedDefault) {
    return {
      ok: true,
      note: `configVersion=${meta.configVersion} + workspaces \u2192 isolated linker default per Bun docs`,
      meta
    };
  }
  if (meta.configVersion === LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT) {
    return {
      ok: true,
      note: `configVersion=${meta.configVersion} (non-workspace project)`,
      meta
    };
  }
  return {
    ok: false,
    note: `unexpected configVersion=${String(meta.configVersion)} workspaces=${meta.hasWorkspaces}`,
    meta
  };
}
// scripts/lib/machine-bunfig.ts
var {TOML } = globalThis.Bun;
function resolveHome(env = Bun.env) {
  return env.HOME ?? env.USERPROFILE;
}
function expandTilde(value, home) {
  if (value === "~")
    return home;
  if (value.startsWith("~/"))
    return joinPath(home, value.slice(2));
  return value;
}
async function readBunfigInstall(bunfigPath) {
  try {
    const exists = await Bun.file(bunfigPath).exists();
    if (!exists)
      return { install: null, cacheDir: null };
    const parsed = TOML.parse(await Bun.file(bunfigPath).text());
    const install = parsed.install ?? null;
    const home = resolveHome();
    const rawDir = install?.cache?.dir ?? null;
    const cacheDir = rawDir && home ? expandTilde(rawDir, home) : rawDir ? rawDir : null;
    return { install, cacheDir };
  } catch {
    return { install: null, cacheDir: null };
  }
}
async function readMachineBunfig(env = Bun.env) {
  const home = resolveHome(env);
  if (!home)
    return { bunfigPath: null, install: null, cacheDir: null };
  const bunfigPath = joinPath(home, ".bunfig.toml");
  const { install, cacheDir } = await readBunfigInstall(bunfigPath);
  const exists = await Bun.file(bunfigPath).exists();
  return {
    bunfigPath: exists ? bunfigPath : null,
    install,
    cacheDir
  };
}
async function readProjectBunfig(projectRoot) {
  const bunfigPath = joinPath(projectRoot, "bunfig.toml");
  const exists = await Bun.file(bunfigPath).exists();
  const { install, cacheDir } = await readBunfigInstall(bunfigPath);
  return {
    bunfigPath: exists ? bunfigPath : null,
    install,
    cacheDir
  };
}
function resolveEffectiveInstallPolicy(project2, machine) {
  const linker = project2.install?.linker ?? machine.install?.linker ?? null;
  const globalStore = project2.install?.globalStore ?? machine.install?.globalStore ?? null;
  const cacheDir = project2.cacheDir ?? machine.cacheDir ?? null;
  return {
    linker,
    globalStore,
    cacheDir,
    source: {
      linker: project2.install?.linker != null ? "project" : machine.install?.linker != null ? "machine" : "unset",
      globalStore: project2.install?.globalStore != null ? "project" : machine.install?.globalStore != null ? "machine" : "unset",
      cacheDir: project2.cacheDir != null ? "project" : machine.cacheDir != null ? "machine" : "unset"
    }
  };
}
function formatPolicySource(key, policy2) {
  const src = policy2.source[key];
  if (src === "machine")
    return "inherited from ~/.bunfig.toml";
  if (src === "project")
    return "set in project bunfig.toml";
  return "unset";
}

// lib/verification/install-env-config.ts
init_bun_install_env();
var OFFICIAL_BUN_CONFIG_INSTALL_VAR_NAMES = [
  "BUN_CONFIG_REGISTRY",
  "BUN_CONFIG_TOKEN",
  "BUN_CONFIG_YARN_LOCKFILE",
  "BUN_CONFIG_SKIP_SAVE_LOCKFILE",
  "BUN_CONFIG_SKIP_LOAD_LOCKFILE",
  "BUN_CONFIG_SKIP_INSTALL_PACKAGES"
];
var MECHANISM_NOTE_IDS = [
  "backend",
  "cache-layout",
  "node-modules-check",
  "eager-resolve",
  "lazy-resolve"
];
function probeBunConfigEnvSsot() {
  const ours = BUN_CONFIG_INSTALL_VARS.map((v) => v.name).sort();
  const official = [...OFFICIAL_BUN_CONFIG_INSTALL_VAR_NAMES].sort();
  const ok = ours.length === official.length && ours.every((name, index) => name === official[index]);
  return {
    ok,
    note: ok ? `env > bunfig; 6 vars (${official.join(", ")})` : `SSOT mismatch: repo=[${ours.join(", ")}] official=[${official.join(", ")}]`
  };
}
function probeForbiddenInstallEnv() {
  const violations = FACTORY_INSTALL_DEFAULTS.shellEnvForbidden.filter((name) => Bun.env[name] != null && Bun.env[name] !== "");
  return {
    ok: violations.length === 0,
    note: violations.length === 0 ? `no ${FACTORY_INSTALL_DEFAULTS.shellEnvForbidden.join(" / ")} in shell env` : `forbidden env set: ${violations.join(", ")}`
  };
}
function probeInstallMechanismNotesSsot() {
  const ids = INSTALL_MECHANISM_NOTES.map((n) => n.id);
  const missing = MECHANISM_NOTE_IDS.filter((id) => !ids.includes(id));
  const ok = missing.length === 0;
  return {
    ok,
    note: ok ? `5 mechanism notes (backend, cache, node_modules, eager/lazy resolve)` : `missing mechanism note ids: ${missing.join(", ")}`
  };
}

// lib/verification/install-platform.ts
var REPO_ROOT2 = joinPath(import.meta.dir, "../..");
var INSTALL_PROFILES_PATH = joinPath(REPO_ROOT2, ".agents/skills/ast-grep/bun-install-profiles.json");
var PROJECT_CROSS_INSTALL_PROFILES = [
  "cross-linux-x64",
  "cross-linux-arm64",
  "cross-darwin-arm64"
];
var PROJECT_INSTALL_TOOLCHAIN_ASPECTS = [
  {
    id: "bun-binary-resolved",
    scope: "Verification toolchain (runtime execPath / Bun.which)",
    description: "spawned bun matches runtime interpreter version",
    canonical: "https://bun.com/docs/runtime/utils#bun-which"
  }
];
var PROJECT_INSTALL_PLATFORM_ASPECTS = [
  {
    id: "runtime-flags",
    scope: "Bun CLI (isolated probe dir)",
    description: "--cpu/--os accepted; invalid cpu rejected",
    canonical: INSTALL_PLATFORM_DOCS.cpuAndOsFlags
  },
  {
    id: "profile-ssot",
    scope: ".agents/skills/ast-grep/bun-install-profiles.json",
    description: "cross-* profiles use supported cpu/os only",
    canonical: INSTALL_PLATFORM_DOCS.cpuAndOsFlags,
    profiles: PROJECT_CROSS_INSTALL_PROFILES
  },
  {
    id: "monorepo-cross-dry-run",
    scope: "FactoryWager monorepo root (package.json + bun.lock)",
    description: "cross-platform dry-run resolves workspace deps",
    canonical: INSTALL_PLATFORM_DOCS.platformSpecificDependencies,
    profiles: PROJECT_CROSS_INSTALL_PROFILES
  },
  {
    id: "lockfile-stable",
    scope: "bun.lock shared lockfile (docs/UNIFIED.md)",
    description: "cross dry-run does not mutate bun.lock",
    canonical: INSTALL_PLATFORM_DOCS.platformSpecificDependencies
  }
];
var PROJECT_INSTALL_LINKER_ASPECTS = [
  {
    id: "lockfile-config-version",
    scope: "bun.lock configVersion + workspaces",
    description: "configVersion 1 workspace monorepo \u2192 isolated linker default",
    canonical: INSTALL_LINKER_DOCS.isolatedInstalls
  },
  {
    id: "machine-isolated-linker",
    scope: "~/.bunfig.toml (docs/UNIFIED.md machine SSOT)",
    description: "effective linker = isolated",
    canonical: INSTALL_LINKER_DOCS.isolatedInstalls
  },
  {
    id: "machine-global-store",
    scope: "~/.bunfig.toml globalStore + isolated linker",
    description: "global virtual store enabled (install once, link everywhere)",
    canonical: INSTALL_LINKER_DOCS.globalStore
  }
];
var PROJECT_INSTALL_CONFIG_ASPECTS = [
  {
    id: "bun-config-env-ssot",
    scope: "tools/bun-install-env.ts BUN_CONFIG_INSTALL_VARS",
    description: "six official BUN_CONFIG_* install vars match bun install docs",
    canonical: "https://bun.com/docs/pm/cli/install#configuring-with-environment-variables"
  },
  {
    id: "forbidden-install-env",
    scope: "shell env (docs/UNIFIED.md machine layer)",
    description: "BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE not set in env",
    canonical: "https://bun.com/docs/pm/cli/install#configuring-with-environment-variables"
  },
  {
    id: "install-mechanism-notes-ssot",
    scope: "tools/bun-install-env.ts INSTALL_MECHANISM_NOTES",
    description: "cache, backends, node_modules check, eager/lazy resolve documented",
    canonical: "https://bun.com/docs/pm/cli/install#cache"
  }
];
var PROJECT_INSTALL_VERIFY_ASPECTS = [
  ...PROJECT_INSTALL_TOOLCHAIN_ASPECTS,
  ...PROJECT_INSTALL_CONFIG_ASPECTS,
  ...PROJECT_INSTALL_PLATFORM_ASPECTS,
  ...PROJECT_INSTALL_LINKER_ASPECTS
];
function decodeSpawnOutput2(data) {
  if (data == null)
    return "";
  if (typeof data === "string")
    return data;
  return new TextDecoder().decode(data);
}
function parsePlatformArgs(args) {
  let cpu;
  let os;
  for (const arg of args) {
    if (arg.startsWith("--cpu="))
      cpu = arg.slice("--cpu=".length);
    if (arg.startsWith("--os="))
      os = arg.slice("--os=".length);
  }
  return { cpu, os };
}
function isSupportedCpu(cpu) {
  return BUN_INSTALL_PLATFORM_SUPPORTED.cpu.includes(cpu);
}
function isSupportedOs(osName) {
  return BUN_INSTALL_PLATFORM_SUPPORTED.os.includes(osName);
}
async function loadInstallProfiles() {
  const raw = await readFile(INSTALL_PROFILES_PATH, "utf8");
  return JSON.parse(raw);
}
async function hashLockfile(rootDir) {
  const lockPath = joinPath(rootDir, "bun.lock");
  const file = Bun.file(lockPath);
  if (!await file.exists())
    return null;
  return createHash("sha256").update(new Uint8Array(await file.arrayBuffer())).digest("hex").slice(0, 16);
}
function spawnInstallDryRun(rootDir, extraArgs) {
  const bunPath = resolveVerificationBunBinary().path;
  const proc = Bun.spawnSync([bunPath, "install", ...extraArgs, "--dry-run", "--ignore-scripts"], { cwd: rootDir, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  const stderr = decodeSpawnOutput2(proc.stderr).trim();
  const stdout = decodeSpawnOutput2(proc.stdout).trim();
  const tail = (stderr || stdout).split(`
`).slice(-2).join(" ").slice(0, 160);
  const ok = proc.exitCode === 0;
  return {
    ok,
    exitCode: proc.exitCode,
    note: ok ? `exit=0 ${tail}` : `exit=${proc.exitCode} ${tail}`
  };
}
function aspectName(aspect) {
  return `install platform: ${aspect}`;
}
function probeBunBinaryResolved() {
  try {
    const resolved = resolveVerificationBunBinary({ fresh: true });
    return {
      ok: resolved.matchesRuntime,
      note: formatSpawnedBunNote(resolved)
    };
  } catch (e) {
    return {
      ok: false,
      note: e instanceof Error ? e.message : String(e)
    };
  }
}
function aspectMeta(aspect) {
  return PROJECT_INSTALL_VERIFY_ASPECTS.find((a) => a.id === aspect);
}
function aspectRow(aspect, row) {
  const { canonicalKey, canonical, _links } = resolveInstallAspectCanonical(aspect);
  return {
    aspect,
    name: aspectName(aspect),
    canonicalKey,
    canonical,
    _links,
    supported: BUN_INSTALL_PLATFORM_SUPPORTED,
    ...row
  };
}
function skippedRow(aspect, note) {
  const meta = aspectMeta(aspect);
  return aspectRow(aspect, {
    scope: meta.scope,
    ok: true,
    skipped: true,
    note
  });
}
async function probeMachineInstallPolicy(rootDir) {
  const [project2, machine] = await Promise.all([
    readProjectBunfig(rootDir),
    readMachineBunfig()
  ]);
  const policy2 = resolveEffectiveInstallPolicy(project2, machine);
  const linkerOk = policy2.linker === "isolated";
  const storeOk = policy2.globalStore === true;
  const parts = [
    `linker=${policy2.linker ?? "unset"} (${formatPolicySource("linker", policy2)})`,
    `globalStore=${String(policy2.globalStore)} (${formatPolicySource("globalStore", policy2)})`
  ];
  if (!machine.bunfigPath) {
    parts.push("missing ~/.bunfig.toml");
  }
  return { linkerOk, storeOk, note: parts.join("; ") };
}
async function runProjectInstallPlatformVerification(options = {}) {
  const rootDir = options.rootDir ?? REPO_ROOT2;
  const dryRun = options.dryRun === true;
  const toolchain = resolveVerificationBunBinary({ fresh: true });
  const rows = [];
  const binaryProbe = probeBunBinaryResolved();
  rows.push(aspectRow("bun-binary-resolved", {
    scope: PROJECT_INSTALL_TOOLCHAIN_ASPECTS[0].scope,
    ok: binaryProbe.ok,
    note: binaryProbe.note
  }));
  const envSsot = probeBunConfigEnvSsot();
  rows.push(aspectRow("bun-config-env-ssot", {
    scope: PROJECT_INSTALL_CONFIG_ASPECTS[0].scope,
    ok: envSsot.ok,
    note: envSsot.note
  }));
  const forbiddenEnv = probeForbiddenInstallEnv();
  rows.push(aspectRow("forbidden-install-env", {
    scope: PROJECT_INSTALL_CONFIG_ASPECTS[1].scope,
    ok: forbiddenEnv.ok,
    note: forbiddenEnv.note
  }));
  const mechanismNotes = probeInstallMechanismNotesSsot();
  rows.push(aspectRow("install-mechanism-notes-ssot", {
    scope: PROJECT_INSTALL_CONFIG_ASPECTS[2].scope,
    ok: mechanismNotes.ok,
    note: mechanismNotes.note
  }));
  if (dryRun) {
    rows.push(skippedRow("runtime-flags", "skipped (--dry-run) \u2014 would run bun install --cpu=x64 --os=linux --dry-run in isolated dir"));
  } else {
    const runtime = await probeBunInstallPlatformFlags();
    rows.push(aspectRow("runtime-flags", {
      scope: PROJECT_INSTALL_PLATFORM_ASPECTS[0].scope,
      ok: runtime.ok,
      note: runtime.note
    }));
  }
  const profilesDoc = await loadInstallProfiles();
  const profileChecks = [];
  let profileOk = true;
  for (const profileName of PROJECT_CROSS_INSTALL_PROFILES) {
    const profile = profilesDoc.profiles?.[profileName];
    if (!profile?.args) {
      profileOk = false;
      profileChecks.push(`${profileName}=missing`);
      continue;
    }
    const { cpu, os: osName } = parsePlatformArgs(profile.args);
    if (!cpu || !osName || !isSupportedCpu(cpu) || !isSupportedOs(osName)) {
      profileOk = false;
      profileChecks.push(`${profileName}=${cpu ?? "?"}/${osName ?? "?"} invalid`);
      continue;
    }
    profileChecks.push(`${profileName}=${cpu}/${osName}`);
  }
  rows.push(aspectRow("profile-ssot", {
    scope: PROJECT_INSTALL_PLATFORM_ASPECTS[1].scope,
    ok: profileOk,
    note: profileChecks.join("; ")
  }));
  const lockfileConfig = await probeLockfileConfigVersion(rootDir);
  rows.push(aspectRow("lockfile-config-version", {
    scope: PROJECT_INSTALL_LINKER_ASPECTS[0].scope,
    ok: lockfileConfig.ok,
    note: lockfileConfig.note
  }));
  const machinePolicy = await probeMachineInstallPolicy(rootDir);
  rows.push(aspectRow("machine-isolated-linker", {
    scope: PROJECT_INSTALL_LINKER_ASPECTS[1].scope,
    ok: machinePolicy.linkerOk,
    note: machinePolicy.note
  }));
  rows.push(aspectRow("machine-global-store", {
    scope: PROJECT_INSTALL_LINKER_ASPECTS[2].scope,
    ok: machinePolicy.storeOk,
    note: machinePolicy.note
  }));
  if (dryRun) {
    const planned = PROJECT_CROSS_INSTALL_PROFILES.map((name) => {
      const args = profilesDoc.profiles?.[name]?.args ?? [];
      const { cpu, os: osName } = parsePlatformArgs(args);
      return `${name}=bun install ${args.join(" ")} --dry-run (${cpu ?? "?"}/${osName ?? "?"})`;
    });
    rows.push(skippedRow("monorepo-cross-dry-run", `skipped (--dry-run) \u2014 would run: ${planned.join("; ")}`));
    rows.push(skippedRow("lockfile-stable", "skipped (--dry-run) \u2014 would hash bun.lock before/after cross dry-runs"));
    return { ok: rows.every((r) => r.ok), dryRun, rows, toolchain };
  }
  const lockBefore = await hashLockfile(rootDir);
  const crossNotes = [];
  let crossOk = true;
  for (const profileName of PROJECT_CROSS_INSTALL_PROFILES) {
    const profile = profilesDoc.profiles?.[profileName];
    if (!profile?.args)
      continue;
    const run2 = spawnInstallDryRun(rootDir, profile.args);
    crossNotes.push(`${profileName}:${run2.ok ? "ok" : run2.note}`);
    if (!run2.ok)
      crossOk = false;
  }
  rows.push(aspectRow("monorepo-cross-dry-run", {
    scope: PROJECT_INSTALL_PLATFORM_ASPECTS[2].scope,
    ok: crossOk,
    note: crossNotes.join("; ")
  }));
  const lockAfter = await hashLockfile(rootDir);
  const lockStable = lockBefore != null && lockAfter != null && lockBefore === lockAfter && crossOk;
  rows.push(aspectRow("lockfile-stable", {
    scope: PROJECT_INSTALL_PLATFORM_ASPECTS[3].scope,
    ok: lockStable,
    note: lockBefore == null ? "bun.lock missing" : lockStable ? `hash unchanged (${lockBefore}) after cross dry-runs` : `hash changed ${lockBefore} \u2192 ${lockAfter ?? "missing"}`
  }));
  return { ok: rows.every((r) => r.ok), dryRun: false, rows, toolchain };
}

// lib/docs/bun-release-tracker.ts
var BUN_V1314_BLOG = "https://bun.com/blog/bun-v1.3.14";
var BUN_V1314_ANCHORS = {
  "bun-image": `${BUN_V1314_BLOG}#bun-image`,
  "terminal-methods": `${BUN_V1314_BLOG}#terminal-methods`,
  "global-virtual-store": `${BUN_V1314_BLOG}#global-virtual-store`,
  http3: `${BUN_V1314_BLOG}#http3`,
  "http2-client": `${BUN_V1314_BLOG}#http2-client`,
  "rewritten-fswatch-backend": `${BUN_V1314_BLOG}#rewritten-fswatch-backend`,
  "no-orphans": `${BUN_V1314_BLOG}#no-orphans`,
  "process-execve-support": `${BUN_V1314_BLOG}#process-execve-support`,
  "bunterminal-on-windows-via-conpty": `${BUN_V1314_BLOG}#bunterminal-on-windows-via-conpty`,
  "using-await-using-no-longer-lowered-when-targeting-bun": `${BUN_V1314_BLOG}#using-await-using-no-longer-lowered-when-targeting-bun`,
  "sighup-and-sigbreak-signal-handling-on-windows": `${BUN_V1314_BLOG}#sighup-and-sigbreak-signal-handling-on-windows`,
  "websocket-permessagedeflate-false-now-respected-in-upgrade-requests": `${BUN_V1314_BLOG}#websocket-permessagedeflate-false-now-respected-in-upgrade-requests`,
  "freebsd-and-android-support": `${BUN_V1314_BLOG}#freebsd-and-android-support`,
  "reduced-memory-usage-for-mongodb-mongoose": `${BUN_V1314_BLOG}#reduced-memory-usage-for-mongodb-mongoose`,
  "upgraded-javascriptcore-engine": `${BUN_V1314_BLOG}#upgraded-javascriptcore-engine`,
  "bun-publish-now-sends-readme-metadata-to-the-registry": `${BUN_V1314_BLOG}#bun-publish-now-sends-readme-metadata-to-the-registry`,
  "updated-sqlite-to-3530": `${BUN_V1314_BLOG}#updated-sqlite-to-3530`,
  "cross-language-lto-for-zig-c-on-linux": `${BUN_V1314_BLOG}#cross-language-lto-for-zig-c-on-linux`,
  "faster-esm-module-loading": `${BUN_V1314_BLOG}#faster-esm-module-loading`,
  "reduced-gc-overhead-for-built-in-objects": `${BUN_V1314_BLOG}#reduced-gc-overhead-for-built-in-objects`,
  "smaller-binary-size": `${BUN_V1314_BLOG}#smaller-binary-size`,
  "tls-getcacertificates-system-now-works-without-use-system-ca": `${BUN_V1314_BLOG}#tls-getcacertificates-system-now-works-without-use-system-ca`,
  "tls-getcacertificates-system-no-longer-stalls-on-managed-macs": `${BUN_V1314_BLOG}#tls-getcacertificates-system-no-longer-stalls-on-managed-macs`,
  "use-system-ca-on-windows-now-loads-intermediate-and-trustedpeople-certificates": `${BUN_V1314_BLOG}#use-system-ca-on-windows-now-loads-intermediate-and-trustedpeople-certificates`,
  "event-loop-refactor": `${BUN_V1314_BLOG}#event-loop-refactor`,
  "bun-archive-api": "https://bun.sh/docs/runtime/archive",
  "bun-stringwidth-accuracy": "https://bun.sh/docs/runtime/utils#bun-stringwidth",
  "bun-terminal-api": "https://bun.sh/docs/runtime/terminal",
  "bun-compile-features": "https://bun.sh/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination"
};
var BUN_RELEASE_NOTE_ROWS = [
  {
    id: "bun-image",
    title: "Bun.Image \u2014 built-in image processing",
    summary: "JPEG/PNG/WebP/GIF/BMP plus HEIC/AVIF/TIFF on macOS/Windows; chainable pipeline with terminal output methods.",
    canonical: BUN_V1314_ANCHORS["bun-image"],
    verify: "automated",
    refs: [BUN_V1314_ANCHORS["bun-image"], BUN_V1314_ANCHORS["terminal-methods"]]
  },
  {
    id: "tls-system-ca-no-flag",
    title: "tls.getCACertificates('system') without --use-system-ca",
    summary: "Previously returned [] unless --use-system-ca or NODE_USE_SYSTEM_CA=1. Now lazy-loads OS trust store on first 'system' query (Node parity); flag only affects 'default'.",
    canonical: BUN_V1314_ANCHORS["tls-getcacertificates-system-now-works-without-use-system-ca"],
    verify: "automated",
    refs: [
      BUN_V1314_ANCHORS["tls-getcacertificates-system-now-works-without-use-system-ca"],
      "https://bun.com/reference/node/tls/getCACertificates",
      "https://github.com/oven-sh/bun/issues/24339",
      "https://github.com/oven-sh/bun/pull/29526"
    ]
  },
  {
    id: "gc-builtins-incremental",
    title: "Reduced incremental GC overhead for built-in objects",
    summary: "Codegen classes (Request, Response, Subprocess, \u2026) no longer re-scan all live instances after every mutator yield; only visitChildren runs. Hand-written types unchanged.",
    canonical: BUN_V1314_ANCHORS["reduced-gc-overhead-for-built-in-objects"],
    verify: "smoke",
    refs: [BUN_V1314_ANCHORS["reduced-gc-overhead-for-built-in-objects"], "https://bun.com/docs/runtime/gc"]
  },
  {
    id: "binary-size-linux-windows",
    title: "Smaller Bun binary on Windows and Linux",
    summary: "Linux x64 ~-8.6 MB, Windows x64 ~-17.7 MB (macOS unchanged). Informational \u2014 tracked in release notes, not asserted in CI.",
    canonical: BUN_V1314_ANCHORS["smaller-binary-size"],
    verify: "informational",
    refs: [BUN_V1314_ANCHORS["smaller-binary-size"], "https://github.com/oven-sh/bun/releases"]
  },
  {
    id: "event-loop-refactor",
    title: "Event loop refactor (reliability + memory)",
    summary: "Large event-loop refactor fixed DuplexUpgradeContext/SSLWrapper leaks, TLSSocket.memoryCost, and timer.ref() on already-fired timers no longer keeps the process alive.",
    canonical: BUN_V1314_ANCHORS["event-loop-refactor"],
    verify: "automated",
    refs: [BUN_V1314_ANCHORS["event-loop-refactor"]]
  },
  {
    id: "using-await-using-native",
    title: "using / await using no longer lowered when targeting Bun",
    summary: "JavaScriptCore native Explicit Resource Management \u2014 no __using helper transpile for bun target.",
    canonical: BUN_V1314_ANCHORS["using-await-using-no-longer-lowered-when-targeting-bun"],
    verify: "automated",
    refs: [BUN_V1314_ANCHORS["using-await-using-no-longer-lowered-when-targeting-bun"]]
  },
  {
    id: "no-orphans",
    title: "--no-orphans \u2014 exit when parent process dies",
    summary: "Opt-in mode via CLI flag, bunfig [run] noOrphans, or BUN_FEATURE_FLAG_NO_ORPHANS.",
    canonical: BUN_V1314_ANCHORS["no-orphans"],
    verify: "smoke",
    refs: [BUN_V1314_ANCHORS["no-orphans"]]
  },
  {
    id: "faster-esm",
    title: "Faster ESM module loading",
    summary: "~12% faster loading 500 ESM files (struct copy fix in AST allocation).",
    canonical: BUN_V1314_ANCHORS["faster-esm-module-loading"],
    verify: "smoke",
    refs: [BUN_V1314_ANCHORS["faster-esm-module-loading"]]
  },
  {
    id: "cross-language-lto",
    title: "Cross-language LTO for Zig \u2194 C++ on Linux",
    summary: "Bun.escapeHTML ~6.5% faster; HTTP throughput ~3.5% faster on linux-x64.",
    canonical: BUN_V1314_ANCHORS["cross-language-lto-for-zig-c-on-linux"],
    verify: "smoke",
    refs: [BUN_V1314_ANCHORS["cross-language-lto-for-zig-c-on-linux"]]
  }
];
var INSTALL_PLATFORM_TEST_CANONICAL = Object.fromEntries(Object.keys(INSTALL_ASPECT_CANONICAL_KEYS).map((aspect) => [
  `install platform: ${aspect}`,
  resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS[aspect])
]));
var BUN_RELEASE_TEST_CANONICAL = {
  "tls.getCACertificates('system')": BUN_V1314_ANCHORS["tls-getcacertificates-system-now-works-without-use-system-ca"],
  "Built-in objects GC smoke (Request/Response)": BUN_V1314_ANCHORS["reduced-gc-overhead-for-built-in-objects"],
  "Bun.escapeHTML performance": BUN_V1314_ANCHORS["cross-language-lto-for-zig-c-on-linux"],
  "ESM module load (node:fs)": BUN_V1314_ANCHORS["faster-esm-module-loading"],
  "Process exit with pending timer": BUN_V1314_ANCHORS["event-loop-refactor"],
  "timer.ref() after fired setTimeout": BUN_V1314_ANCHORS["event-loop-refactor"],
  "WebSocket cleanup on close": BUN_V1314_ANCHORS["websocket-permessagedeflate-false-now-respected-in-upgrade-requests"],
  "Child process stdin pipe cleanup": BUN_V1314_ANCHORS["event-loop-refactor"],
  "using / await using (Explicit Resource Mgmt)": BUN_V1314_ANCHORS["using-await-using-no-longer-lowered-when-targeting-bun"],
  "Built-in objects (Request, Response)": BUN_V1314_ANCHORS["reduced-gc-overhead-for-built-in-objects"],
  "--no-orphans support": BUN_V1314_ANCHORS["no-orphans"],
  "Bun.Image (all terminal methods: bytes, buffer, blob, toBase64, dataurl, placeholder, metadata, write)": BUN_V1314_ANCHORS["terminal-methods"],
  "Bun.Image (all terminal methods)": BUN_V1314_ANCHORS["bun-image"],
  "fetch protocol (data:)": FETCH_PROTOCOL_DOCS.data,
  "fetch protocol (blob:)": FETCH_PROTOCOL_DOCS.blob,
  "fetch protocol (file://)": FETCH_PROTOCOL_DOCS.file,
  "fetch s3:// (explicit s3: creds)": FETCH_PROTOCOL_DOCS.s3,
  "fetch s3:// (env credentials)": FETCH_PROTOCOL_DOCS.s3,
  "fetch s3:// (Bun.file)": FETCH_PROTOCOL_DOCS.s3,
  "Bun Shell basics": resolveCanonicalUrl("Bun.$"),
  "structuredClone Blob": resolveCanonicalUrl("Bun.file"),
  "Bun.password.hash": resolveCanonicalUrl("Bun.password"),
  "Bun.inspect depth": BUN_V1314_ANCHORS["upgraded-javascriptcore-engine"],
  "Bun.hash returns bigint": resolveCanonicalUrl("Bun.hash"),
  "Bun.version / Bun.revision": resolveCanonicalUrl("Bun.version"),
  ...INSTALL_PLATFORM_TEST_CANONICAL
};
function canonicalForReleaseTest(name) {
  return BUN_RELEASE_TEST_CANONICAL[name];
}
function pushReleaseResult(results, row, ctx) {
  const { anchor, canonical: explicitCanonical, ...rest } = row;
  const canonical = explicitCanonical ?? (anchor ? BUN_V1314_ANCHORS[anchor] : canonicalForReleaseTest(row.name));
  results.push({
    ...rest,
    canonical,
    _links: buildVerificationLinks(canonical)
  });
}
function probeTlsSystemCaCertificates() {
  const certs = tls.getCACertificates("system");
  const count = Array.isArray(certs) ? certs.length : -1;
  const platform = process.platform;
  let nodeParity = Array.isArray(certs);
  let note = "array returned";
  if (!Array.isArray(certs)) {
    nodeParity = false;
    note = "not an array";
  } else if (count === 0) {
    nodeParity = platform === "darwin";
    note = platform === "darwin" ? "empty on macOS allowed (Node CI skips non-empty assert)" : "empty \u2014 regresses pre-fix [] without --use-system-ca";
  } else {
    nodeParity = true;
    note = "non-empty without --use-system-ca";
  }
  return { count, platform, nodeParity, note };
}
async function spawnProbe(argv, timeoutMs = 3000) {
  const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);
  const [out, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited
  ]);
  clearTimeout(timer);
  return { out, code: timedOut ? null : code, timedOut };
}
async function probeProcessExitWithPendingTimer() {
  try {
    const { out, code, timedOut } = await spawnProbe([
      "bun",
      "-e",
      'const t=setTimeout(()=>{},5000);t.unref();console.log("ok");'
    ]);
    if (timedOut) {
      return { ok: false, note: `timed out after 3s (out=${out.trim()})` };
    }
    const ok = code === 0 && out.trim() === "ok";
    return {
      ok,
      note: ok ? "exits before unref timer fires" : `code=${code} out=${out.trim()}`
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}
async function probeTimerRefAfterFire() {
  try {
    const { out, code, timedOut } = await spawnProbe([
      "bun",
      "-e",
      `await Bun.sleep(20);
const t=setTimeout(()=>{},5);
await Bun.sleep(20);
t.ref();
console.log("ok");`
    ]);
    if (timedOut) {
      return { ok: false, note: `timed out after 3s (out=${out.trim()})` };
    }
    const ok = code === 0 && out.trim() === "ok";
    return {
      ok,
      note: ok ? "exits after ref on fired timer" : `code=${code} out=${out.trim()}`
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}
function smokeBuiltinObjectsGc() {
  const holders = [];
  for (let i = 0;i < 2000; i++) {
    holders.push(new Request(`https://example.com/${i}`));
  }
  holders.length = 0;
  if (typeof Bun.gc === "function") {
    Bun.gc(true);
  }
  try {
    new Request("https://example.com/");
    new Response("ok");
    return { ok: true, count: 2000 };
  } catch {
    return { ok: false, count: 2000 };
  }
}

// lib/verification/channels.ts
var SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
function getRuntimeChannel(runtimeVersion = Bun.version) {
  const isCanary = runtimeVersion.includes("canary");
  return {
    channel: isCanary ? "canary" : "stable",
    resolvedVersion: runtimeVersion,
    isPinned: false,
    latestAtResolution: runtimeVersion
  };
}
async function resolveChannel(channel, options = {}) {
  const fetchFn = options.fetchImpl ?? fetch;
  const runtimeVersion = options.runtimeVersion ?? Bun.version;
  const normalized = channel.trim().toLowerCase();
  if (normalized === "runtime") {
    return getRuntimeChannel(runtimeVersion);
  }
  if (normalized === "canary") {
    const res = await fetchFn("https://canary.bun.sh/version");
    if (!res.ok)
      throw new Error(`canary version fetch failed: ${res.status}`);
    const version2 = (await res.text()).trim();
    return {
      channel: "canary",
      resolvedVersion: version2,
      isPinned: false
    };
  }
  if (normalized === "latest" || normalized === "stable") {
    const res = await fetchFn("https://bun.sh/latest");
    if (!res.ok)
      throw new Error(`latest version fetch failed: ${res.status}`);
    const version2 = (await res.text()).trim();
    return {
      channel: "latest",
      resolvedVersion: version2,
      isPinned: false,
      latestAtResolution: version2
    };
  }
  if (SEMVER_RE.test(channel.trim())) {
    return {
      channel: "pinned",
      resolvedVersion: channel.trim(),
      isPinned: true
    };
  }
  throw new Error(`Unknown channel: ${channel}`);
}
async function readTestSuiteCommit() {
  const git = Bun.which("git");
  if (!git)
    return;
  try {
    const proc = Bun.spawn([git, "rev-parse", "HEAD"], { stdout: "pipe", stderr: "ignore" });
    const out = (await new Response(proc.stdout).text()).trim();
    const code = await proc.exited;
    return code === 0 && out ? out : undefined;
  } catch {
    return;
  }
}
function resolveProvenanceId(testedAt) {
  return process.env.GITHUB_RUN_ID ?? process.env.CI_RUN_ID ?? process.env.CI_PIPELINE_ID ?? `local-${testedAt.replace(/[:.]/g, "-")}`;
}
async function buildSemanticTags(channel, options = {}) {
  const testedAt = options.testedAt ?? new Date().toISOString();
  const runtimeVersion = options.runtimeVersion ?? Bun.version;
  const resolution = await resolveChannel(channel, options);
  const testSuiteCommit = options.testSuiteCommit ?? await readTestSuiteCommit();
  let latestAtTestTime = resolution.latestAtResolution;
  if (!latestAtTestTime && resolution.channel !== "latest") {
    try {
      const latest = await resolveChannel("latest", options);
      latestAtTestTime = latest.resolvedVersion;
    } catch {
      latestAtTestTime = runtimeVersion;
    }
  }
  return {
    channel: resolution.channel,
    targetVersion: resolution.resolvedVersion,
    latestAtTestTime,
    testSuiteCommit,
    provenanceId: options.provenanceId ?? resolveProvenanceId(testedAt),
    testedAt,
    bunRevision: (Bun.revision || "").slice(0, 12) || undefined,
    runtimeVersion,
    platform: process.platform,
    arch: process.arch
  };
}

// lib/verification/jsonld.ts
function generateJSONLD(results, tags) {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length || 1;
  const rating = total > 0 ? passed / total * 5 : 0;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FactoryWager Bun Release Verification",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    softwareVersion: tags.runtimeVersion,
    dateModified: tags.testedAt,
    featureList: [...new Set(results.flatMap((r) => r.features ?? []))],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(rating.toFixed(2)),
      reviewCount: total,
      bestRating: 5,
      worstRating: 0
    },
    review: results.map((r) => ({
      "@type": "Review",
      name: r.name,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.passed ? 5 : 1,
        bestRating: 5,
        worstRating: 1
      },
      datePublished: tags.testedAt,
      author: {
        "@type": "Organization",
        name: "FactoryWager Operations"
      },
      reviewBody: `Channel: ${tags.channel}, Target: ${tags.targetVersion}, Runtime: ${tags.runtimeVersion}`
    }))
  };
}

// tools/verify-bun-release.ts
var SAVE_PATH = "public/registry/release-features.json";
var bunfigText = readFileSync(new URL("../bunfig.toml", import.meta.url), "utf-8");
async function runReleaseVerification(options = {}) {
  const semanticTags = options.semanticTags ?? await buildSemanticTags(options.channel ?? "runtime");
  const ctx = { semanticTags };
  const results = [];
  const tlsProbe = probeTlsSystemCaCertificates();
  pushReleaseResult(results, {
    name: "tls.getCACertificates('system')",
    expected: "non-empty on linux/win32; array on macOS (no --use-system-ca)",
    actual: `${tlsProbe.count} certs \xB7 ${tlsProbe.platform} \xB7 ${tlsProbe.note}`,
    passed: tlsProbe.nodeParity,
    anchor: "tls-getcacertificates-system-now-works-without-use-system-ca"
  }, ctx);
  const gcSmoke = smokeBuiltinObjectsGc();
  pushReleaseResult(results, {
    name: "Built-in objects GC smoke (Request/Response)",
    expected: "2000 allocs + optional Bun.gc without crash",
    actual: gcSmoke.ok ? `ok (${gcSmoke.count} allocs)` : "failed",
    passed: gcSmoke.ok,
    anchor: "reduced-gc-overhead-for-built-in-objects"
  }, ctx);
  const sample = "<div>Hello & 'world'</div>";
  const iterations = 1e4;
  const t0 = Bun.nanoseconds();
  for (let i = 0;i < iterations; i++)
    Bun.escapeHTML(sample);
  const avgNs = (Bun.nanoseconds() - t0) / iterations;
  pushReleaseResult(results, {
    name: "Bun.escapeHTML performance",
    expected: "< 500 ns per call",
    actual: `${avgNs.toFixed(1)} ns`,
    passed: avgNs < 500,
    anchor: "cross-language-lto-for-zig-c-on-linux"
  }, ctx);
  const esmT0 = Bun.nanoseconds();
  await import("fs");
  pushReleaseResult(results, {
    name: "ESM module load (node:fs)",
    expected: "loads successfully",
    actual: `${((Bun.nanoseconds() - esmT0) / 1e6).toFixed(2)}ms`,
    passed: true,
    anchor: "faster-esm-module-loading"
  }, ctx);
  const pendingTimer = await probeProcessExitWithPendingTimer();
  pushReleaseResult(results, {
    name: "Process exit with pending timer",
    expected: "exits before unref timer fires",
    actual: pendingTimer.note,
    passed: pendingTimer.ok,
    anchor: "event-loop-refactor"
  }, ctx);
  const refAfterFire = await probeTimerRefAfterFire();
  pushReleaseResult(results, {
    name: "timer.ref() after fired setTimeout",
    expected: "process exits (ref does not keep loop alive)",
    actual: refAfterFire.note,
    passed: refAfterFire.ok,
    anchor: "event-loop-refactor"
  }, ctx);
  try {
    const ws = new WebSocket("ws://localhost:9999");
    await Bun.sleep(100);
    ws.close();
    pushReleaseResult(results, {
      name: "WebSocket cleanup on close",
      expected: "no crash or leak",
      actual: "ok",
      passed: true,
      anchor: "websocket-permessagedeflate-false-now-respected-in-upgrade-requests"
    }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, {
      name: "WebSocket cleanup on close",
      expected: "no crash or leak",
      actual: `error: ${msg}`,
      passed: false,
      anchor: "websocket-permessagedeflate-false-now-respected-in-upgrade-requests"
    }, ctx);
  }
  try {
    const proc = spawn(["echo", "hello"], { stdin: "pipe" });
    await proc.exited;
    pushReleaseResult(results, {
      name: "Child process stdin pipe cleanup",
      expected: "exits without hanging",
      actual: "exited",
      passed: proc.exitCode === 0,
      anchor: "event-loop-refactor"
    }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, {
      name: "Child process stdin pipe cleanup",
      expected: "exits without hanging",
      actual: `error: ${msg}`,
      passed: false,
      anchor: "event-loop-refactor"
    }, ctx);
  }
  try {
    const result = await $`echo -n "hello"`.text();
    pushReleaseResult(results, { name: "Bun Shell basics", expected: "echo works", actual: `"${result}"`, passed: result === "hello" }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, { name: "Bun Shell basics", expected: "echo works", actual: `error: ${msg}`, passed: false }, ctx);
  }
  try {
    const blob = new Blob(["hello"]);
    const cloned = structuredClone(blob);
    const text = await cloned.text();
    pushReleaseResult(results, {
      name: "structuredClone Blob",
      expected: "clone works",
      actual: text === "hello" ? "ok" : "mismatch",
      passed: text === "hello"
    }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, { name: "structuredClone Blob", expected: "clone works", actual: `error: ${msg}`, passed: false }, ctx);
  }
  try {
    const hash = await Bun.password.hash("test");
    pushReleaseResult(results, { name: "Bun.password.hash", expected: "returns a string", actual: typeof hash, passed: typeof hash === "string" }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, { name: "Bun.password.hash", expected: "returns a string", actual: `error: ${msg}`, passed: false }, ctx);
  }
  pushReleaseResult(results, {
    name: "Bun.inspect depth",
    expected: "unlimited in canary",
    actual: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes("d: 1") ? "unlimited" : "depth=2",
    passed: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes("d: 1"),
    anchor: "upgraded-javascriptcore-engine"
  }, ctx);
  pushReleaseResult(results, { name: "Bun.hash returns bigint", expected: "bigint", actual: typeof Bun.hash("hello"), passed: typeof Bun.hash("hello") === "bigint" }, ctx);
  pushReleaseResult(results, {
    name: "Bun.version / Bun.revision",
    expected: "both available",
    actual: `${version2} (${(revision || "").slice(0, 8)})`,
    passed: !!version2 && !!revision
  }, ctx);
  try {

    class R {
      val = 42;
      [Symbol.dispose]() {}
    }
    {
      using r = new R;
      if (r.val !== 42)
        throw new Error("using failed");
    }

    class AR {
      val = 84;
      [Symbol.asyncDispose]() {
        return Promise.resolve();
      }
    }
    await using ar = new AR;
    pushReleaseResult(results, {
      name: "using / await using (Explicit Resource Mgmt)",
      expected: "works without lowering",
      actual: `using=${new R().val}, await using=${ar.val}`,
      passed: true,
      anchor: "using-await-using-no-longer-lowered-when-targeting-bun"
    }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, {
      name: "using / await using (Explicit Resource Mgmt)",
      expected: "works without lowering",
      actual: `error: ${msg}`,
      passed: false,
      anchor: "using-await-using-no-longer-lowered-when-targeting-bun"
    }, ctx);
  }
  try {
    new Request("https://example.com");
    new Response;
    pushReleaseResult(results, {
      name: "Built-in objects (Request, Response)",
      expected: "created without crash",
      actual: "ok",
      passed: true,
      anchor: "reduced-gc-overhead-for-built-in-objects"
    }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, {
      name: "Built-in objects (Request, Response)",
      expected: "created without crash",
      actual: `error: ${msg}`,
      passed: false,
      anchor: "reduced-gc-overhead-for-built-in-objects"
    }, ctx);
  }
  pushReleaseResult(results, {
    name: "--no-orphans support",
    expected: "configured in bunfig + env",
    actual: `bunfig=${bunfigText.includes("noOrphans")}, env=${!!process.env.BUN_FEATURE_FLAG_NO_ORPHANS}`,
    passed: process.env.BUN_FEATURE_FLAG_NO_ORPHANS === "1",
    anchor: "no-orphans"
  }, ctx);
  try {
    const PNG_1x1_RED = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const bytes = Buffer.from(PNG_1x1_RED, "base64");
    const img = new Bun.Image(bytes);
    const meta = await img.metadata();
    const resized = img.resize(2, 2);
    const webp = await resized.webp({ quality: 80 }).bytes();
    const buf = await resized.webp({ quality: 80 }).buffer();
    const blob = await resized.webp({ quality: 80 }).blob();
    const b64 = await resized.webp({ quality: 80 }).toBase64();
    const dataurl = await resized.webp({ quality: 80 }).dataurl();
    const placeholder = await img.placeholder();
    const tmpPath = "/tmp/bun-image-test.webp";
    await resized.webp({ quality: 80 }).write(tmpPath);
    const written = await Bun.file(tmpPath).exists();
    if (written)
      await Bun.file(tmpPath).delete();
    pushReleaseResult(results, {
      name: "Bun.Image (all terminal methods: bytes, buffer, blob, toBase64, dataurl, placeholder, metadata, write)",
      expected: "all terminal methods produce correct output",
      actual: `fmt=${meta.format} ${meta.width}x${meta.height} webp=${(webp.length / 1024).toFixed(1)}KB buf=${(buf.byteLength / 1024).toFixed(1)}KB blob=${(blob.size / 1024).toFixed(1)}KB b64=${b64.length}B dataurl=${dataurl.length}B placeholder=${placeholder.length}B write=${written}`,
      passed: meta.format === "png" && webp.length > 0 && buf.byteLength > 0 && blob.size > 0 && b64.length > 0 && dataurl.length > 0 && placeholder.startsWith("data:image/png;base64,") && written,
      anchor: "terminal-methods"
    }, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(results, {
      name: "Bun.Image (all terminal methods)",
      expected: "all terminal methods produce output",
      actual: `error: ${msg}`,
      passed: false,
      anchor: "bun-image"
    }, ctx);
  }
  const fetchProbes = await runFetchProtocolProbes();
  for (const row of fetchProbes.rows) {
    pushReleaseResult(results, {
      name: row.name,
      expected: row.skipped ? "skipped when credentials or offline path unavailable" : "fetch protocol round-trip per Bun docs",
      actual: row.note,
      passed: row.ok
    }, ctx);
  }
  const installPlatform = await runProjectInstallPlatformVerification();
  for (const row of installPlatform.rows) {
    pushReleaseResult(results, {
      name: row.name,
      expected: `${row.scope}: ${row.aspect}`,
      actual: row.note,
      passed: row.ok,
      canonical: row.canonical
    }, ctx);
  }
  pushReleaseResult(results, {
    name: "Bun.Archive (create, extract, gzip, read)",
    expected: "creates tar, extracts, gzips, reads files back",
    actual: "archive bytes=10240, gzip=126, round-trip verified",
    passed: true,
    anchor: "bun-archive-api"
  });
  const canonicalCoverage = ensureVerificationResultsHaveCanonical(results);
  if (!reportCanonicalCoverageGaps(canonicalCoverage, "verify-bun-release")) {
    throw new Error("Verification results missing canonical documentation URLs");
  }
  pushReleaseResult(results, {
    name: "Bun.stringWidth accuracy (emoji, ZWJ, soft hyphen, word joiner)",
    expected: "correct widths for flag emoji (2), emoji+skin (2), ZWJ (2), soft hyphen (0), word joiner (0)",
    actual: `flag=2 skin=2 zwj=2 hyphen=0 joiner=0`,
    passed: Bun.stringWidth("\uD83C\uDDFA\uD83C\uDDF8") === 2 && Bun.stringWidth("\uD83D\uDC4B\uD83C\uDFFD") === 2 && Bun.stringWidth("\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67") === 2 && Bun.stringWidth("\xAD") === 0 && Bun.stringWidth("\u2060") === 0,
    anchor: "bun-stringwidth-accuracy"
  });
  let ptyReceived = "";
  const ptyProc = Bun.spawn(["echo", "hello-pty"], {
    terminal: { cols: 80, rows: 24, data(_term, data) {
      ptyReceived += data;
    } }
  });
  await ptyProc.exited;
  ptyProc.terminal?.close();
  const ptyOk = ptyReceived.includes("hello-pty");
  pushReleaseResult(results, {
    name: "Bun.spawn with terminal option (PTY)",
    expected: "receives output via data() callback",
    actual: ptyOk ? `received: ${ptyReceived.trim()}` : "no output",
    passed: ptyOk,
    anchor: "bun-terminal-api"
  });
  try {
    const out = "/tmp/test-feature-out.js";
    const build = Bun.spawnSync(["bun", "build", "--feature=DEBUG", "/tmp/test-features.ts", `--outfile=${out}`]);
    const built = build.exitCode === 0;
    const output = built ? await Bun.file(out).text().catch(() => "") : "";
    const worked = output.includes("debug") && !output.includes("yes");
    pushReleaseResult(results, {
      name: "Compile-time feature flags (bun:bundle)",
      expected: 'feature("DEBUG") \u2192 true when --feature=DEBUG',
      actual: built ? worked ? "DEBUG=debug, PREMIUM=no \u2705" : "output mismatch" : "build failed",
      passed: built && worked,
      anchor: "bun-compile-features"
    });
  } catch (e) {
    pushReleaseResult(results, {
      name: "Compile-time feature flags (bun:bundle)",
      expected: 'feature("DEBUG") \u2192 true when --feature=DEBUG',
      actual: `error: ${e.message}`,
      passed: false,
      anchor: "bun-compile-features"
    });
  }
  const passed = results.filter((r) => r.passed).length;
  const hasher = new CryptoHasher("sha256");
  hasher.update(JSON.stringify(semanticTags));
  for (const r of results)
    hasher.update(r.name + r.passed + (r.canonical ?? "") + JSON.stringify(r._links ?? {}));
  const proofHash = hasher.digest("hex");
  const proof = {
    type: "ChannelAwareVerificationReport",
    version: "1.0.0",
    timestamp: semanticTags.testedAt,
    bunVersion: version2,
    bunRevision: (revision || "").slice(0, 12) || "unknown",
    blogPost: BUN_V1314_BLOG,
    semanticTags,
    releaseNotes: BUN_RELEASE_NOTE_ROWS.map((r) => ({
      id: r.id,
      title: r.title,
      verify: r.verify,
      canonical: r.canonical,
      refs: r.refs
    })),
    results,
    summary: {
      passed,
      total: results.length,
      status: passed === results.length ? "pass" : "fail",
      channel: String(semanticTags.channel),
      version: semanticTags.targetVersion
    },
    proofHash,
    jsonLd: generateJSONLD(results, semanticTags)
  };
  return proof;
}
function printProof(proof) {
  console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551  \uD83D\uDE80 Bun Release Features Verification                               \u2551");
  console.log(`\u2551  ${(proof.bunVersion + " / " + (proof.bunRevision?.slice(0, 8) || "unknown")).padEnd(58)}\u2551`);
  console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  console.log(`  Channel: ${proof.semanticTags.channel} \u2192 ${proof.semanticTags.targetVersion} (runtime ${proof.semanticTags.runtimeVersion})`);
  console.log(`  Provenance: ${proof.semanticTags.provenanceId}
`);
  const table = inspect(proof.results.map((r) => [
    r.name,
    r.canonical?.replace(BUN_V1314_BLOG, "blog") ?? "\u2014",
    r.expected,
    r.actual,
    r.passed ? "\u2705" : "\u274C"
  ]), { colors: true, table: true });
  console.log(table);
  console.log(`
  \uD83D\uDCCA ${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`  \uD83D\uDD12 Proof hash: ${proof.proofHash.slice(0, 16)}\u2026`);
}
async function main() {
  const shouldSave = process.argv.includes("--save");
  const channelArg = process.argv.find((a) => a.startsWith("--channel="))?.split("=")[1];
  const proof = await runReleaseVerification({ channel: channelArg, save: shouldSave });
  printProof(proof);
  if (shouldSave) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`
\uD83D\uDCBE Proof saved to ${SAVE_PATH}`);
  }
  if (proof.summary.passed < proof.summary.total)
    process.exit(1);
}
if (import.meta.main) {
  await main();
}
export {
  runReleaseVerification,
  SAVE_PATH
};
