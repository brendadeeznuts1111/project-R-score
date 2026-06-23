#!/usr/bin/env python3
"""ast-grep-helper: a thin LLM-friendly wrapper around `sg` (ast-grep).

Single-file Python 3 stdlib. No deps. Works on macOS, Linux, Windows, WSL.

WHAT IT ADDS over plain `sg`:
  1. Binary auto-resolution: cached -> @ast-grep/cli -> PATH -> Homebrew -> error with install hint
  2. Pattern hint validation: detects regex misuse (\\w, .*, |, [a-z]) and language-specific
     mistakes (Python trailing colon, JS/Go/Rust missing function body) BEFORE calling sg
  3. Two-pass replace: ast-grep silently ignores --update-all when --json is set, so we run
     a JSON pass to collect matches, then a separate --update-all pass to mutate files
  4. Stable JSON output: parses sg --json=compact, salvages truncated output, normalizes shape
  5. Cross-OS path handling: works the same on POSIX and Windows (uses pathlib + shutil)

USAGE
    ast_grep_helper.py search PATTERN [PATH...] [--lang LANG] [--globs GLOB ...] [-C N]
    ast_grep_helper.py replace PATTERN REWRITE [PATH...] [--lang LANG] [--apply] [--globs GLOB ...]
    ast_grep_helper.py scan RULE_FILE [PATH...] [--apply] [--report-style STYLE]
    ast_grep_helper.py test [-c CONFIG] [-t TEST_DIR] [-U]
    ast_grep_helper.py new {project,rule,test,util} [NAME] [--lang LANG]
    ast_grep_helper.py langs                # list 25 supported languages
    ast_grep_helper.py doctor [--fix]       # health check; --fix installs skill pin if missing
    ast_grep_helper.py fix [PATH...]        # apply bundled autofix rules (rules with fix: field)
    ast_grep_helper.py audit [--only SUBSTR]  # scan repo-map targets, summarize violations
    ast_grep_helper.py rules                # list bundled rules and autofix status
    ast_grep_helper.py codemods             # list named codemods from codemods.json
    ast_grep_helper.py codemod ID [--fix]   # run a named codemod (dry-run by default)
    ast_grep_helper.py test [-U]            # run rule snapshot tests (tests/)
    ast_grep_helper.py install              # delegate to ../install.sh / install.ps1
    ast_grep_helper.py outline [PATH...] [--view VIEW] [--items ITEMS] [--match REGEX]
    ast_grep_helper.py discover [--zone ZONE]         # unmapped monorepo candidates
    ast_grep_helper.py map [--only SUBSTR]              # monorepo repo-map.json targets
    ast_grep_helper.py zones [--stats]                # list zones + targets
    ast_grep_helper.py index [--name SUBSTR]          # cross-target symbol index
    ast_grep_helper.py nav --zone ZONE [--digest]     # guided read order per zone
    ast_grep_helper.py anchors [--zone ZONE]          # validate repo-map anchor symbols
    ast_grep_helper.py exports [--zone ZONE]          # exported symbol surface per target
    ast_grep_helper.py collisions [--zone ZONE]       # duplicate symbol names across targets
    ast_grep_helper.py graph [--zone ZONE]            # import edges between repo-map targets
    ast_grep_helper.py jump --name SYMBOL             # file:line jump hints for agents
    ast_grep_helper.py bun patterns                   # Bun native API pattern catalog
    ast_grep_helper.py bun bundles                  # named pattern bundles
    ast_grep_helper.py bun inventory [--zone ZONE]    # count Bun API usage per target
    ast_grep_helper.py bun score [--min-score N]    # adoption score per target
    ast_grep_helper.py bun migrate                  # anti-pattern -> Bun.native hints
    ast_grep_helper.py bun report                   # unified Bun intelligence report
    ast_grep_helper.py bun docs                       # official Bun API topic coverage
    ast_grep_helper.py bun roadmap                    # security integration backlog
    ast_grep_helper.py bun bundle-threat --zone agents  # Bun.Transpiler threat scan
    ast_grep_helper.py bun features                   # Bun release highlights (v1.3.13 test CLI)
    ast_grep_helper.py bun test-ci --profile ci       # bun test --parallel --isolate
    ast_grep_helper.py bun search PATTERN_ID          # run cataloged Bun pattern
    ast_grep_helper.py files PATTERN [--path PATH]      # paths-with-matches only
    ast_grep_helper.py validate PATTERN [--lang LANG]   # offline pattern hint check only
    ast_grep_helper.py --version
    ast_grep_helper.py --help

EXAMPLES
    # Find all console.log calls in TypeScript
    ast_grep_helper.py search 'console.log($MSG)' --lang ts src/

    # Migrate console.log -> logger.info (dry-run preview)
    ast_grep_helper.py replace 'console.log($MSG)' 'logger.info($MSG)' --lang ts src/

    # Apply the same replacement
    ast_grep_helper.py replace 'console.log($MSG)' 'logger.info($MSG)' --lang ts src/ --apply

    # Validate a pattern offline (no sg call, no filesystem access)
    ast_grep_helper.py validate '\\w+' --lang ts
    # -> exit 2, hint: "regex \\w not supported. Use $VAR for identifiers."

EXIT CODES
    0  Success (matches found OR replacement applied OR validation passed)
    1  Argument error
    2  Pattern hint failure (regex misuse, missing body, etc.) - call would have failed
    3  ast-grep binary not found and auto-install declined
    4  ast-grep call failed (returned non-zero, with stderr forwarded)
    5  Timeout (5 minutes per call by default)
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

VERSION = "0.26.0"
MAX_OUTPUT_LINES = 2_000
MAX_OUTPUT_BYTES = 50 * 1024

# 25 CLI languages supported by ast-grep, with their aliases (mirrors official docs)
LANGUAGES: dict[str, list[str]] = {
    "bash": [".bash", ".sh", ".zsh"],
    "c": [".c", ".h"],
    "cpp": [".cc", ".cpp", ".cxx", ".hpp", ".hxx"],
    "csharp": [".cs"],
    "css": [".css"],
    "elixir": [".ex", ".exs"],
    "go": [".go"],
    "haskell": [".hs"],
    "html": [".html", ".htm"],
    "java": [".java"],
    "javascript": [".js", ".jsx", ".cjs", ".mjs"],
    "json": [".json"],
    "kotlin": [".kt", ".kts"],
    "lua": [".lua"],
    "nix": [".nix"],
    "php": [".php"],
    "python": [".py", ".pyi"],
    "ruby": [".rb"],
    "rust": [".rs"],
    "scala": [".scala"],
    "solidity": [".sol"],
    "swift": [".swift"],
    "typescript": [".ts", ".cts", ".mts"],
    "tsx": [".tsx"],
    "yaml": [".yml", ".yaml"],
}

# Aliases that ast-grep CLI accepts; we normalize to the canonical name.
LANG_ALIASES: dict[str, str] = {
    "js": "javascript", "jsx": "javascript",
    "ts": "typescript",
    "py": "python", "py3": "python",
    "rb": "ruby",
    "rs": "rust",
    "kt": "kotlin",
    "ex": "elixir",
    "hs": "haskell",
    "sh": "bash", "zsh": "bash",
    "cc": "cpp", "c++": "cpp", "cxx": "cpp",
    "cs": "csharp",
    "yml": "yaml",
    "sol": "solidity",
    "golang": "go",
}

# Default search timeout (5 min). ast-grep calls can be slow on huge repos.
DEFAULT_TIMEOUT_S = 300

SEVERITY_RANK: dict[str, int] = {"hint": 0, "warning": 1, "error": 2}


# ---------- logging ----------

def trace(msg: str) -> None:
    """Print a trace line to stderr (suppressible via --quiet, default off)."""
    if not _QUIET:
        print(f"[ast-grep-helper] {msg}", file=sys.stderr, flush=True)


def err(msg: str) -> None:
    """Print an error line to stderr (always shown)."""
    print(f"[ast-grep-helper] error: {msg}", file=sys.stderr, flush=True)


_QUIET = False


# ---------- binary resolution ----------

def script_dir() -> Path:
    return Path(__file__).resolve().parent


def skill_root() -> Path:
    return script_dir().parent


def skill_node_binary() -> Optional[Path]:
    """Pinned @ast-grep/cli in skill node_modules."""
    binname = "ast-grep.exe" if os.name == "nt" else "ast-grep"
    p = skill_root() / "node_modules" / ".bin" / binname
    if p.is_file() and os.access(p, os.X_OK):
        return p
    return None


def cached_binary() -> Optional[Path]:
    """Look in <skill_root>/bin/ for a previously downloaded binary."""
    binname = "sg.exe" if os.name == "nt" else "sg"
    altname = "ast-grep.exe" if os.name == "nt" else "ast-grep"
    for name in (binname, altname):
        p = skill_root() / "bin" / name
        if p.is_file() and os.access(p, os.X_OK):
            return p
    return None


def outline_supported(binary: Path) -> bool:
    try:
        proc = subprocess.run(
            [str(binary), "outline", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return proc.returncode == 0
    except Exception:
        return False


def npm_binary() -> Optional[Path]:
    """If @ast-grep/cli is installed globally via npm, find its binary."""
    # `sg` shipped by @ast-grep/cli is on PATH when npm prefix bin is on PATH.
    # We rely on shutil.which for that case.
    return None  # handled by which_binary


def which_binary() -> Optional[Path]:
    """Use shutil.which to find sg or ast-grep on PATH.

    On Linux, plain `sg` collides with the setgroups command from util-linux
    (sometimes called via /usr/bin/sg) which has flag --version that returns
    non-zero, so we prefer `ast-grep` when both are on PATH and the `sg` we find
    is the wrong one.
    """
    for name in ("ast-grep", "sg"):
        found = shutil.which(name)
        if found:
            p = Path(found)
            # On Linux, double-check by trying --version. The util-linux `sg`
            # rejects --version, while ast-grep prints "ast-grep <version>".
            if name == "sg" and platform.system() == "Linux":
                try:
                    out = subprocess.run(
                        [str(p), "--version"],
                        capture_output=True,
                        text=True,
                        timeout=5,
                    )
                    if out.returncode != 0 or "ast-grep" not in (out.stdout + out.stderr).lower():
                        continue
                except Exception:
                    continue
            return p
    return None


def homebrew_binary() -> Optional[Path]:
    """Common Homebrew install paths."""
    candidates = [
        Path("/opt/homebrew/bin/ast-grep"),
        Path("/opt/homebrew/bin/sg"),
        Path("/usr/local/bin/ast-grep"),
        Path("/usr/local/bin/sg"),
    ]
    for p in candidates:
        if p.is_file() and os.access(p, os.X_OK):
            return p
    return None


# --- OMO runtime resolution (vendored patch) ---

def omo_env_binary() -> Optional[Path]:
    raw_path = os.environ.get("OMO_AST_GREP_SG_PATH")
    if not raw_path:
        return None
    path = Path(raw_path).expanduser()
    if path.is_file() and os.access(path, os.X_OK):
        return path
    return None


def omo_runtime_slug() -> str:
    if sys.platform.startswith("win"):
        os_slug = "win32"
    elif sys.platform == "darwin":
        os_slug = "darwin"
    else:
        os_slug = "linux"

    machine = platform.machine().lower()
    arch_slug = "arm64" if machine in {"arm64", "aarch64"} else "x64"
    return f"{os_slug}-{arch_slug}"


def omo_runtime_binary() -> Optional[Path]:
    binary_name = "sg.exe" if sys.platform.startswith("win") else "sg"
    slug = omo_runtime_slug()
    candidates: list[Path] = []

    codex_home = os.environ.get("CODEX_HOME")
    if codex_home:
        candidates.append(Path(codex_home) / "runtime" / "ast-grep" / slug / binary_name)
    candidates.append(Path.home() / ".omo" / "runtime" / "ast-grep" / slug / binary_name)

    for path in candidates:
        if path.is_file() and os.access(path, os.X_OK):
            return path
    return None


def resolve_binary(*, require_outline: bool = False) -> Optional[Path]:
    """Resolve ast-grep binary. Prefer outline-capable 0.44+ when require_outline."""
    candidates: list[Path] = []
    for fn in (omo_env_binary, omo_runtime_binary, skill_node_binary, cached_binary, which_binary, homebrew_binary):
        result = fn()
        if result and result not in candidates:
            candidates.append(result)
    if not candidates:
        return None
    if require_outline:
        for candidate in candidates:
            if outline_supported(candidate):
                return candidate
        return None
    return candidates[0]


def require_binary(*, require_outline: bool = False) -> Path:
    """Resolve binary, or print an actionable install hint and exit 3."""
    p = resolve_binary(require_outline=require_outline)
    if p:
        return p
    err("ast-grep binary not found." if not require_outline else "ast-grep 0.44+ with outline not found.")
    err("")
    err("Install via one of:")
    err(f"  bash {skill_root()}/scripts/install.sh    # skill pin (0.44)")
    err("  npm install -g @ast-grep/cli@0.44.0         # global")
    err("")
    err("Or manually:")
    err("  brew install ast-grep                      # may be <0.44 (no outline)")
    err("  cargo install ast-grep --locked            # any OS with Rust")
    sys.exit(3)


def git_root(start: Optional[Path] = None) -> Optional[Path]:
    start = start or Path.cwd()
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=str(start),
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode == 0:
            root = proc.stdout.strip()
            if root:
                return Path(root)
    except Exception:
        pass
    return None


def default_sgconfig() -> Optional[Path]:
    cfg = skill_root() / "sgconfig.yml"
    return cfg if cfg.is_file() else None


def safe_git_diff(paths: list[str], cwd: Path) -> str:
    try:
        subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        proc = subprocess.run(
            ["git", "diff", "--no-ext-diff", "--", *paths],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=30,
        )
        return proc.stdout.strip()
    except Exception:
        return ""


def truncate_output(text: str) -> tuple[str, bool]:
    lines = text.splitlines()
    truncated = len(lines) > MAX_OUTPUT_LINES
    body = "\n".join(lines[:MAX_OUTPUT_LINES])
    if len(body.encode("utf-8")) > MAX_OUTPUT_BYTES:
        body = body.encode("utf-8")[:MAX_OUTPUT_BYTES].decode("utf-8", errors="ignore")
        truncated = True
    if truncated:
        body += (
            f"\n\n[truncated: showing up to {MAX_OUTPUT_LINES} lines / "
            f"{MAX_OUTPUT_BYTES // 1024} KiB — narrow paths, --match, or --globs]"
        )
    return body, truncated


# ---------- pattern hint validation ----------

# Regex anti-patterns that ast-grep does NOT support but LLMs frequently emit.
# Each tuple: (regex_to_detect, hint_message)
REGEX_ANTIPATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\\w|\\d|\\s|\\b"),
     "Backslash escapes (\\w, \\d, \\s, \\b) are regex syntax, not ast-grep. "
     "Use $VAR to capture any identifier, or switch to grep for text patterns."),
    (re.compile(r"(?<!\$)\.\*|(?<!\$)\.\+"),
     "'.*' and '.+' are regex wildcards, not ast-grep. "
     "Use $$$ between AST fragments to match many nodes, or $VAR for one node."),
    (re.compile(r"\[[a-zA-Z0-9-]+\]"),
     "Character classes like '[a-z]' are regex syntax. "
     "ast-grep has no AST equivalent - use grep for character-level patterns."),
]


def find_alternation(pattern: str) -> bool:
    """Detect a literal '|' that is not inside a string/template literal.

    Heuristic - mark as alternation if `|` appears outside obvious string contexts.
    """
    # Strip simple string contents to reduce false positives in patterns like
    # `'a|b'` or `"x|y"`. This is a heuristic, not a parser.
    stripped = re.sub(r"'[^']*'|\"[^\"]*\"|`[^`]*`", "", pattern)
    # Require word chars on both sides to avoid catching bitwise or ||
    return bool(re.search(r"\w\s*\|\s*\w", stripped)) and "||" not in stripped


def lang_specific_hints(pattern: str, lang: Optional[str]) -> list[str]:
    """Return a list of hints for language-specific common mistakes."""
    if not lang:
        return []
    canonical = LANG_ALIASES.get(lang.lower(), lang.lower())
    hints: list[str] = []

    if canonical == "python":
        # def foo($$$):  <-- trailing colon breaks the parse
        if re.search(r"^\s*(def|class)\s+\$?\w+[^:]*:\s*$", pattern, re.MULTILINE):
            hints.append(
                "Python pattern has trailing ':'. ast-grep parses pattern as a complete "
                "definition - drop the trailing colon. Try: 'def $FUNC($$$)' or 'class $C($$$)'."
            )

    if canonical in ("javascript", "typescript", "tsx"):
        if re.search(r"^\s*(async\s+)?function\s+\$?\w+\s*$", pattern):
            hints.append(
                "JS/TS function pattern is incomplete. Add params and body: "
                "'function $NAME($$$) { $$$ }'."
            )

    if canonical == "go":
        if re.search(r"^\s*func\s+\$?\w+\s*$", pattern):
            hints.append(
                "Go function pattern is incomplete. Add params and body: "
                "'func $NAME($$$) { $$$ }'."
            )

    if canonical == "rust":
        if re.search(r"^\s*fn\s+\$?\w+\s*$", pattern):
            hints.append(
                "Rust fn pattern is incomplete. Add params, return type, and body: "
                "'fn $NAME($$$) -> $RET { $$$ }' (or '-> ()' if returning unit)."
            )

    return hints


def validate_pattern(pattern: str, lang: Optional[str]) -> list[str]:
    """Return a list of hints. Empty list = pattern looks plausible."""
    hints: list[str] = []

    for rx, msg in REGEX_ANTIPATTERNS:
        if rx.search(pattern):
            hints.append(msg)

    if find_alternation(pattern):
        hints.append(
            "Literal '|' alternation is regex syntax, not ast-grep. "
            "Run two separate ast-grep calls (one per alternative), or switch to grep."
        )

    hints.extend(lang_specific_hints(pattern, lang))

    return hints


def normalize_lang(lang: Optional[str]) -> Optional[str]:
    if not lang:
        return None
    canonical = LANG_ALIASES.get(lang.lower(), lang.lower())
    if canonical not in LANGUAGES:
        err(f"unknown language '{lang}'. Run 'ast_grep_helper.py langs' for the full list.")
        sys.exit(1)
    return canonical


# ---------- subprocess helpers ----------

def run_sg(
    binary: Path,
    args: list[str],
    *,
    timeout: int = DEFAULT_TIMEOUT_S,
    capture: bool = True,
) -> subprocess.CompletedProcess[str]:
    """Spawn `sg <args>` with a hard timeout. Capture stdout/stderr by default."""
    cmd = [str(binary), *args]
    trace(f"exec: {' '.join(cmd)}")
    try:
        return subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        err(f"ast-grep call timed out after {timeout}s")
        sys.exit(5)


# ---------- subcommands ----------

def _search_paths(args: argparse.Namespace) -> list[str]:
    """Resolve path list from positional paths and/or repeated --path."""
    explicit = list(args.paths or [])
    flagged = list(getattr(args, "path", None) or [])
    merged = explicit + flagged
    return merged if merged else ["."]


def _wants_apply(args: argparse.Namespace) -> bool:
    """--fix is an alias for --apply on scan/replace/fix commands."""
    return bool(getattr(args, "apply", False) or getattr(args, "fix", False))


def _skill_artifacts() -> dict[str, object]:
    root = skill_root()
    rules = sorted((root / "rules").glob("*.yml")) if (root / "rules").is_dir() else []
    fix_rules = []
    for rule in rules:
        try:
            text = rule.read_text(encoding="utf-8")
            if "\nfix:" in text or text.lstrip().startswith("fix:"):
                fix_rules.append(rule.name)
        except OSError:
            pass
    return {
        "sgconfig": (root / "sgconfig.yml").is_file(),
        "repo_map": (root / "repo-map.json").is_file(),
        "scan_profiles": (root / "scan-profiles.json").is_file(),
        "codemods": (root / "codemods.json").is_file(),
        "bun_patterns": (root / "bun-patterns.json").is_file(),
        "bun_releases": (root / "bun-releases.json").is_file(),
        "bun_install": (root / "bun-install.json").is_file(),
        "test_profiles": (root / "bun-test-profiles.json").is_file(),
        "install_profiles": (root / "bun-install-profiles.json").is_file(),
        "bundle_threat_rules": (root / "bundle-threat-rules.json").is_file(),
        "bundle_threat_profiles": (root / "bundle-threat-profiles.json").is_file(),
        "bundle_threat_scan": (root / "scripts" / "bundle-threat-scan.ts").is_file(),
        "zone_discovery": (root / "zone-discovery.json").is_file(),
        "supply_chain_layers": (root / "supply-chain-layers.json").is_file(),
        "transpiler_module": (root / "scripts" / "scan" / "transpiler" / "bundle-scanner.ts").is_file(),
        "security_policy": (root / "policies" / "security.policy.toml").is_file(),
        "threat_feed": (root / "threat-feed.json").is_file(),
        "semver_matcher": (root / "scripts" / "scan" / "transpiler" / "semver-matcher.ts").is_file(),
        "policy_loader": (root / "scripts" / "scan" / "transpiler" / "policy-loader.ts").is_file(),
        "registry_service": (root / "scripts" / "scan" / "transpiler" / "service.ts").is_file(),
        "scan_packages": (root / "scripts" / "scan-packages.ts").is_file(),
        "bun_cli": (root / "scripts" / "bun-cli.ts").is_file(),
        "outline_rules": (root / "outline-rules" / "bun-monorepo.yml").is_file(),
        "mcp": (root / "mcp" / "ast-grep-mcp.ts").is_file(),
        "skill_pin": (root / "node_modules" / ".bin" / "ast-grep").is_file(),
        "rules": [r.name for r in rules],
        "fix_rules": fix_rules,
    }


def _load_repo_map() -> dict:
    manifest = skill_root() / "repo-map.json"
    if not manifest.is_file():
        return {"targets": []}
    return json.loads(manifest.read_text(encoding="utf-8"))


def _load_zone_discovery() -> dict:
    path = skill_root() / "zone-discovery.json"
    if not path.is_file():
        return {"probes": [], "skip_dirs": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _zone_ids() -> list[str]:
    return list(_load_repo_map().get("zones", {}).keys())


def _zone_hint() -> str:
    ids = _zone_ids()
    return ", ".join(ids) if ids else "(none — run discover)"


def _norm_rel_path(root: Path, path: str) -> str:
    p = Path(path)
    if p.is_absolute():
        try:
            return p.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            return p.as_posix()
    return p.as_posix()


def _path_has_skip_part(rel: str, skip_dirs: set[str]) -> bool:
    return any(part in skip_dirs for part in rel.split("/"))


def _paths_overlap(a: str, b: str) -> bool:
    if a == b:
        return True
    return a.startswith(f"{b}/") or b.startswith(f"{a}/")


def _mapped_target_paths(data: dict, root: Path) -> set[str]:
    out: set[str] = set()
    for t in data.get("targets", []):
        rel = _norm_rel_path(root, t.get("path", "."))
        out.add(rel)
    return out


def _candidate_mapped(rel: str, mapped: set[str]) -> bool:
    return any(_paths_overlap(rel, m) for m in mapped)


def _suggest_target_id(zone: str, name: str, pkg_name: Optional[str] = None) -> str:
    slug = (pkg_name or name).split("/")[-1]
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", slug).strip("-").lower()
    prefix = zone.replace("_", "-")
    if slug.startswith(prefix):
        return slug
    return f"{prefix}-{slug}" if slug else prefix


def _discover_probe_candidates(root: Path, probe: dict, skip_dirs: set[str]) -> list[dict]:
    glob_pat = probe.get("glob", "")
    if not glob_pat:
        return []
    rows: list[dict] = []
    seen: set[str] = set()
    for hit in sorted(root.glob(glob_pat)):
        rel_hit = hit.relative_to(root).as_posix()
        if _path_has_skip_part(rel_hit, skip_dirs):
            continue
        path_from = probe.get("path_from", "self")
        candidate = hit.parent if path_from == "parent" else hit
        require_child = probe.get("require_child")
        if require_child and not (candidate / require_child).is_file():
            continue
        rel = candidate.relative_to(root).as_posix()
        if rel in seen:
            continue
        seen.add(rel)

        pkg_name: Optional[str] = None
        pkg_json = candidate / "package.json"
        if pkg_json.is_file():
            try:
                pkg_name = json.loads(pkg_json.read_text(encoding="utf-8")).get("name")
            except (OSError, json.JSONDecodeError):
                pkg_name = None

        entry: Optional[str] = None
        for eg in probe.get("entry_globs", []):
            ep = candidate / eg
            if ep.is_file():
                entry = ep.relative_to(root).as_posix()
                break

        rows.append({
            "path": rel,
            "kind": probe.get("kind", "unknown"),
            "zone": probe.get("zone", "?"),
            "probe": probe.get("id", "?"),
            "name": pkg_name or candidate.name,
            "entry": entry,
            "suggested_id": _suggest_target_id(probe.get("zone", "zone"), candidate.name, pkg_name),
        })
    return rows


def _discover_report(root: Path, *, zone_filter: str = "") -> dict:
    data = _load_repo_map()
    discovery = _load_zone_discovery()
    skip_dirs = set(discovery.get("skip_dirs", []))
    mapped = _mapped_target_paths(data, root)

    candidates: list[dict] = []
    for probe in discovery.get("probes", []):
        candidates.extend(_discover_probe_candidates(root, probe, skip_dirs))

    unmapped: list[dict] = []
    mapped_hits: list[dict] = []
    for c in candidates:
        if zone_filter and c.get("zone", "").lower() != zone_filter.lower():
            continue
        row = {**c, "mapped": _candidate_mapped(c["path"], mapped)}
        if row["mapped"]:
            mapped_hits.append(row)
        else:
            unmapped.append(row)

    stale: list[dict] = []
    for t in data.get("targets", []):
        if zone_filter and t.get("zone", "").lower() != zone_filter.lower():
            continue
        rel = _norm_rel_path(root, t.get("path", "."))
        full = root / rel
        if not full.exists():
            stale.append({
                "id": t.get("id"),
                "zone": t.get("zone"),
                "path": rel,
                "reason": "path missing on disk",
            })

    zones_meta = data.get("zones", {})
    unmapped_zones = sorted({c["zone"] for c in unmapped})
    return {
        "repo": str(root),
        "zones": list(zones_meta.keys()),
        "targets_mapped": len(data.get("targets", [])),
        "candidates": len(candidates),
        "mapped_hits": len(mapped_hits),
        "unmapped": unmapped,
        "stale": stale,
        "unmapped_by_zone": {z: sum(1 for c in unmapped if c["zone"] == z) for z in unmapped_zones},
    }


def _filter_repo_targets(
    targets: list[dict],
    *,
    only: str = "",
    zone: str = "",
) -> list[dict]:
    filtered = targets
    if zone:
        needle = zone.lower()
        filtered = [t for t in filtered if t.get("zone", "").lower() == needle]
    if only:
        needle = only.lower()
        filtered = [
            t for t in filtered
            if needle in t.get("id", "").lower()
            or needle in t.get("name", "").lower()
            or needle in t.get("zone", "").lower()
            or any(needle in tag.lower() for tag in t.get("tags", []))
        ]
    return filtered


def _resolve_repo_targets(args: argparse.Namespace) -> list[dict]:
    data = _load_repo_map()
    targets = data.get("targets", [])
    only = getattr(args, "only", None) or ""
    zone = getattr(args, "zone", None) or ""
    if only or zone:
        targets = _filter_repo_targets(targets, only=only, zone=zone)
    return targets


def _outline_rules_path(args: argparse.Namespace, target: Optional[dict] = None) -> Optional[str]:
    custom = getattr(args, "outline_rules", None)
    if custom:
        p = Path(custom)
        return str(p if p.is_file() else skill_root() / custom)
    use_bun = getattr(args, "bun_rules", False)
    if target and target.get("bun_rules"):
        use_bun = True
    if use_bun:
        return str(skill_root() / "outline-rules" / "bun-monorepo.yml")
    return None


def _build_outline_sg_args(
    args: argparse.Namespace,
    paths: list[str],
    target: Optional[dict] = None,
) -> list[str]:
    sg_args = ["outline", "--color", "never"]
    view = getattr(args, "view", None) or (target or {}).get("view")
    items = getattr(args, "items", None) or (target or {}).get("items")
    if view:
        sg_args.extend(["--view", view])
    if items:
        sg_args.extend(["--items", items])
    if getattr(args, "match", None):
        sg_args.extend(["--match", args.match])
    if getattr(args, "types", None):
        sg_args.extend(["--type", ",".join(args.types)])
    if getattr(args, "lang", None):
        sg_args.extend(["--lang", normalize_lang(args.lang) or args.lang])
    if getattr(args, "pub_members", False):
        sg_args.append("--pub-members")
    rules = _outline_rules_path(args, target)
    if rules:
        sg_args.extend(["--outline-rules", rules])
    json_style = getattr(args, "json_style", None)
    if getattr(args, "json_out", False):
        sg_args.append(f"--json={json_style or 'compact'}")
    globs: list[str] = list(getattr(args, "globs", None) or [])
    if target:
        for g in target.get("globs", []):
            if g not in globs:
                globs.append(g)
    for g in globs:
        sg_args.extend(["--globs", g])
    sg_args.extend(paths)
    return sg_args


def _summarize_outline_json(entries: list[dict]) -> dict:
    by_type: dict[str, int] = {}
    files: dict[str, int] = {}
    symbols: list[dict] = []
    for file_entry in entries:
        rel = file_entry.get("path", "?")
        for item in file_entry.get("items", []):
            st = item.get("symbolType", "?")
            by_type[st] = by_type.get(st, 0) + 1
            files[rel] = files.get(rel, 0) + 1
            symbols.append({
                "file": rel,
                "name": item.get("name"),
                "type": st,
                "exported": item.get("isExported", False),
                "line": item.get("range", {}).get("start", {}).get("line"),
            })
    return {
        "symbol_count": len(symbols),
        "file_count": len(files),
        "by_type": by_type,
        "files": files,
        "symbols": symbols,
    }


def _run_outline(
    binary: Path,
    args: argparse.Namespace,
    paths: list[str],
    target: Optional[dict] = None,
) -> tuple[int, str]:
    proc = run_sg(binary, _build_outline_sg_args(args, paths, target))
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def _outline_index_cache_path() -> Path:
    return skill_root() / ".outline-index.json"


def _path_mtime(path: Path) -> float:
    if not path.exists():
        return 0.0
    if path.is_file():
        return path.stat().st_mtime
    latest = path.stat().st_mtime
    for child in path.rglob("*"):
        if child.is_file():
            latest = max(latest, child.stat().st_mtime)
    return latest


def _index_stale_targets(cached: dict, root: Path, targets: list[dict]) -> list[str]:
    mtimes = cached.get("target_mtimes", {})
    stale: list[str] = []
    for target in targets:
        tid = target.get("id")
        if not tid:
            continue
        rel = target.get("path", ".")
        current = _path_mtime((root / rel).resolve())
        cached_mtime = mtimes.get(tid)
        if cached_mtime is None or current > cached_mtime + 0.5:
            stale.append(tid)
    return stale


def _target_symbols(index: dict, target_id: str) -> set[str]:
    names: set[str] = set()
    for sym_name, occs in index.get("symbols_by_name", {}).items():
        for occ in occs:
            if occ.get("target") == target_id:
                names.add(sym_name)
    return names


def _match_anchor(anchor: str, symbols: set[str]) -> tuple[bool, Optional[str]]:
    needle = anchor.lower()
    for sym in symbols:
        sym_l = sym.lower().strip("\"'")
        if sym_l == needle or needle in sym_l or sym_l in needle:
            return True, sym
    return False, None


def _resolve_import_path(import_spec: str, source_file: str, root: Path) -> Optional[Path]:
    imp = import_spec.strip("\"'")
    if not imp.startswith("."):
        return None
    src = (root / source_file).resolve()
    base = src.parent
    candidates = [
        base / imp,
        base / f"{imp}.ts",
        base / f"{imp}.tsx",
        base / imp / "index.ts",
        base / imp / "index.tsx",
    ]
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if resolved.exists():
                return resolved
        except OSError:
            continue
    try:
        return (base / imp).resolve()
    except OSError:
        return None


def _target_for_resolved_path(resolved: Path, root: Path, targets: list[dict]) -> Optional[str]:
    try:
        rel = resolved.relative_to(root.resolve())
    except ValueError:
        return None
    rel_s = str(rel).replace("\\", "/")
    best_id: Optional[str] = None
    best_len = -1
    for target in targets:
        tp = target.get("path", "").rstrip("/")
        if not tp:
            continue
        if rel_s == tp or rel_s.startswith(tp + "/") or tp in rel_s:
            if len(tp) > best_len:
                best_id = target.get("id")
                best_len = len(tp)
    return best_id


def _collect_import_edges(
    args: argparse.Namespace,
    root: Path,
    binary: Path,
    targets: list[dict],
) -> list[dict]:
    import_args = argparse.Namespace(**{
        **vars(args),
        "json_out": True,
        "json_style": "compact",
        "items": "imports",
        "view": "names",
    })
    edges: dict[tuple[str, str], dict] = {}
    targets_by_id = {t["id"]: t for t in targets if t.get("id")}

    for target in targets:
        tid = target.get("id")
        if not tid:
            continue
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        if not full.exists():
            continue
        code, out = _run_outline(binary, import_args, [str(full)], target)
        if code != 0:
            continue
        for file_entry in parse_compact_json(out):
            file_path = file_entry.get("path", "")
            for item in file_entry.get("items", []):
                if not item.get("isImport"):
                    continue
                imp_name = str(item.get("name", "")).strip("\"'")
                edge_to: Optional[str] = None
                edge_kind = "external"
                resolved = _resolve_import_path(imp_name, file_path, root)
                if resolved:
                    edge_to = _target_for_resolved_path(resolved, root, targets)
                    if edge_to and edge_to != tid:
                        edge_kind = "import"
                if not edge_to:
                    for other in targets:
                        oid = other.get("id")
                        op = other.get("path", "")
                        if not oid or oid == tid or not op:
                            continue
                        tail = op.rstrip("/").split("/")[-1]
                        if tail and tail in imp_name:
                            edge_to = oid
                            edge_kind = "inferred"
                            break
                if not edge_to or edge_to == tid:
                    continue
                key = (tid, edge_to)
                entry = edges.setdefault(key, {
                    "from": tid,
                    "to": edge_to,
                    "kind": edge_kind,
                    "imports": [],
                })
                if imp_name not in entry["imports"]:
                    entry["imports"].append(imp_name)
    for target in targets:
        tid = target.get("id")
        if not tid:
            continue
        for dep_id in target.get("depends_on", []):
            if dep_id == tid or dep_id not in targets_by_id:
                continue
            key = (tid, dep_id)
            entry = edges.setdefault(key, {
                "from": tid,
                "to": dep_id,
                "kind": "declared",
                "imports": [],
            })
            if "depends_on" not in entry["imports"]:
                entry["imports"].append("depends_on")
    return sorted(edges.values(), key=lambda e: (e["from"], e["to"]))


def _collect_symbol_index(
    args: argparse.Namespace,
    root: Path,
    binary: Path,
) -> dict:
    data = _load_repo_map()
    targets = _resolve_repo_targets(args)
    map_args = argparse.Namespace(**{
        **vars(args),
        "json_out": True,
        "json_style": "compact",
        "view": getattr(args, "view", None),
        "items": getattr(args, "items", None) or "all",
    })
    report: dict = {
        "version": data.get("version"),
        "repo": str(root),
        "repo_map": str(skill_root() / "repo-map.json"),
        "built_at": datetime.now(timezone.utc).isoformat(),
        "target_mtimes": {},
        "targets": [],
        "symbols_by_name": {},
        "total_symbols": 0,
    }
    for target in targets:
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        tid = target.get("id", rel)
        if not full.exists():
            continue
        report["target_mtimes"][tid] = _path_mtime(full)
        code, out = _run_outline(binary, map_args, [str(full)], target)
        if code != 0:
            continue
        summary = _summarize_outline_json(parse_compact_json(out))
        summary["target"] = tid
        summary["zone"] = target.get("zone")
        summary["path"] = rel
        report["targets"].append(summary)
        report["total_symbols"] += summary["symbol_count"]
        for sym in summary["symbols"]:
            name = sym.get("name")
            if not name:
                continue
            entry = {
                **sym,
                "target": tid,
                "zone": target.get("zone"),
                "target_path": rel,
            }
            report["symbols_by_name"].setdefault(name, []).append(entry)
    return report


def _load_symbol_index(args: argparse.Namespace, root: Path, binary: Path) -> dict:
    cache = _outline_index_cache_path()
    if not getattr(args, "refresh", False) and cache.is_file():
        try:
            cached = json.loads(cache.read_text(encoding="utf-8"))
            if cached.get("repo") == str(root):
                return cached
        except (OSError, json.JSONDecodeError):
            pass
    index = _collect_symbol_index(args, root, binary)
    try:
        cache.write_text(json.dumps(index, indent=2), encoding="utf-8")
    except OSError:
        pass
    return index


def _filter_index_symbols(index: dict, args: argparse.Namespace) -> list[dict]:
    name_q = getattr(args, "name", None) or ""
    type_q = getattr(args, "symbol_type", None) or ""
    exports_only = getattr(args, "exports_only", False)
    zone_q = (getattr(args, "zone", None) or "").lower()
    results: list[dict] = []
    for sym_name, occurrences in index.get("symbols_by_name", {}).items():
        if name_q and name_q.lower() not in sym_name.lower():
            continue
        for occ in occurrences:
            if exports_only and not occ.get("exported"):
                continue
            if type_q and occ.get("type") != type_q:
                continue
            if zone_q and (occ.get("zone") or "").lower() != zone_q:
                continue
            results.append({"name": sym_name, **occ})
    results.sort(key=lambda r: (r.get("name", ""), r.get("file", ""), r.get("line") or 0))
    return results


def _load_scan_profile(name: Optional[str]) -> Optional[dict]:
    if not name:
        return None
    path = skill_root() / "scan-profiles.json"
    if not path.is_file():
        err(f"scan profiles not found: {path}")
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    profiles = data.get("profiles", {})
    if name not in profiles:
        err(f"unknown scan profile '{name}' — choose: {', '.join(sorted(profiles))}")
        return None
    return profiles[name]


def _filter_matches_by_profile(matches: list[dict], profile: Optional[dict]) -> list[dict]:
    if not profile:
        return matches
    allowed = profile.get("rules")
    min_sev = profile.get("min_severity")
    min_rank = SEVERITY_RANK.get(min_sev, -1) if min_sev else -1
    kept: list[dict] = []
    for m in matches:
        rid = m.get("ruleId", "?")
        if allowed and rid not in allowed:
            continue
        sev = str(m.get("severity", "hint"))
        if min_rank >= 0 and SEVERITY_RANK.get(sev, 0) < min_rank:
            continue
        kept.append(m)
    return kept


def _expand_repo_map_only(args: argparse.Namespace, root: Path) -> None:
    """When --only is set and no explicit --path, expand paths from repo-map targets."""
    only = getattr(args, "only", None)
    if not only:
        return
    explicit = _search_paths(args)
    if explicit and explicit != ["."]:
        return
    zone = getattr(args, "zone", None) or ""
    targets = _filter_repo_targets(_load_repo_map().get("targets", []), only=only, zone=zone)
    paths: list[str] = []
    globs: list[str] = list(getattr(args, "globs", None) or [])
    for target in targets:
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        if full.exists():
            paths.append(str(full))
        for g in target.get("globs", []):
            if g not in globs:
                globs.append(g)
    if paths:
        args.path = paths
        args.paths = []
        args.globs = globs


def _load_codemods() -> list[dict]:
    path = skill_root() / "codemods.json"
    if not path.is_file():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("codemods", [])


def _summarize_matches(matches: list[dict]) -> tuple[dict[str, dict], dict[str, dict]]:
    by_rule: dict[str, dict] = {}
    by_file: dict[str, dict] = {}
    for m in matches:
        rid = m.get("ruleId", "?")
        file_path = m.get("file", "?")
        sev = m.get("severity", "?")
        line = m.get("range", {}).get("start", {}).get("line", "?")
        rule_entry = by_rule.setdefault(rid, {"count": 0, "severity": sev, "files": {}})
        rule_entry["count"] += 1
        rule_entry["files"][file_path] = rule_entry["files"].get(file_path, 0) + 1
        file_entry = by_file.setdefault(file_path, {"count": 0, "rules": set()})
        file_entry["count"] += 1
        file_entry["rules"].add(rid)
    return by_rule, by_file


def cmd_outline(args: argparse.Namespace) -> int:
    binary = require_binary(require_outline=True)
    root = git_root() or Path.cwd()
    paths = _search_paths(args)
    only = getattr(args, "only", None)
    zone = getattr(args, "zone", None)
    if (only or zone) and (not paths or paths == ["."]):
        targets = _resolve_repo_targets(args)
        if not targets:
            err("no map targets matched --only/--zone filter")
            return 1
        exit_code = 0
        for target in targets:
            rel = target.get("path", ".")
            full = (root / rel).resolve()
            if not full.exists():
                print(f"## {target.get('id', rel)}  SKIP (missing {rel})")
                print()
                continue
            if len(targets) > 1:
                print(f"## {target.get('name', rel)} ({rel})")
            code, out = _run_outline(binary, args, [str(full)], target)
            exit_code = max(exit_code, code)
            if code != 0:
                sys.stderr.write(out)
                print("(outline failed)")
                print()
                continue
            text = out.strip() or "(no outline entries)"
            if args.json_out:
                print(text)
            else:
                body, _ = truncate_output(text)
                print(body)
            if len(targets) > 1:
                print()
        return exit_code

    code, out = _run_outline(binary, args, paths)
    if code != 0:
        sys.stderr.write(out)
        return code
    text = out.strip() or "(no outline entries)"
    if args.json_out:
        print(text)
    else:
        body, _ = truncate_output(text)
        print(body)
    return 0


def cmd_map(args: argparse.Namespace) -> int:
    manifest = skill_root() / "repo-map.json"
    if not manifest.is_file():
        err(f"repo map not found: {manifest}")
        return 1
    data = json.loads(manifest.read_text(encoding="utf-8"))
    root = git_root() or Path.cwd()
    targets = _resolve_repo_targets(args)
    if not targets:
        err("no map targets matched filter")
        return 1

    list_only = getattr(args, "list_only", False) or getattr(args, "no_outline", False)
    compact = getattr(args, "compact", False)
    heatmap = getattr(args, "heatmap", False)
    json_out = getattr(args, "json_out", False)

    report: dict = {
        "version": data.get("version"),
        "zones": data.get("zones", {}),
        "repo": str(root),
        "targets": [],
    }

    if list_only and not json_out:
        print(f"repo: {root}")
        print(f"targets: {len(targets)}")
        zones = data.get("zones", {})
        if zones:
            print("zones:", ", ".join(f"{k}={v}" for k, v in zones.items()))
        print()
        for target in targets:
            rel = target.get("path", ".")
            exists = (root / rel).exists()
            tags = ", ".join(target.get("tags", [])) or "-"
            desc = target.get("description", "")
            print(f"  [{target.get('zone', '?')}] {target.get('id', rel)}")
            print(f"    path: {rel}  {'ok' if exists else 'MISSING'}")
            print(f"    view: {target.get('view', 'auto')}  tags: {tags}")
            if target.get("bun_rules"):
                print("    bun_rules: true")
            if desc:
                print(f"    {desc}")
        return 0

    binary = require_binary(require_outline=True)

    if heatmap:
        rows: list[tuple[dict, dict]] = []
        map_args = argparse.Namespace(**{**vars(args), "json_out": True, "json_style": "compact"})
        for target in targets:
            rel = target.get("path", ".")
            full = (root / rel).resolve()
            if not full.exists():
                continue
            code, out = _run_outline(binary, map_args, [str(full)], target)
            if code != 0:
                continue
            rows.append((target, _summarize_outline_json(parse_compact_json(out))))
        rows.sort(key=lambda row: -row[1]["symbol_count"])
        max_count = rows[0][1]["symbol_count"] if rows else 1
        print(f"repo: {root}")
        print(f"symbol heatmap ({len(rows)} targets)")
        print()
        for target, summary in rows:
            count = summary["symbol_count"]
            width = max(1, int(48 * count / max_count)) if count else 0
            bar = "#" * width
            zone = target.get("zone", "?")
            print(f"{count:5d} {bar:<48} [{zone}] {target.get('id')}")
        return 0

    if not json_out and not compact:
        print(f"repo: {root}")
        print(f"targets: {len(targets)}")
        if getattr(args, "only", None):
            print(f"filter: --only {args.only}")
        if getattr(args, "zone", None):
            print(f"filter: --zone {args.zone}")
        print()

    for target in targets:
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        tid = target.get("id", rel)
        name = target.get("name", rel)
        entry: dict = {
            "id": tid,
            "zone": target.get("zone"),
            "name": name,
            "path": rel,
            "exists": full.exists(),
            "tags": target.get("tags", []),
            "description": target.get("description"),
        }

        if not full.exists():
            entry["status"] = "missing"
            report["targets"].append(entry)
            if not json_out and not compact:
                print(f"## {name}")
                print(f"   path: {rel}")
                print("   (missing)")
                print()
            continue

        map_args = argparse.Namespace(**{
            **vars(args),
            "json_out": compact or json_out,
            "json_style": "compact",
        })
        code, out = _run_outline(binary, map_args, [str(full)], target)
        if code != 0:
            entry["status"] = "error"
            report["targets"].append(entry)
            if not json_out and not compact:
                print(f"## {name}")
                print(f"   path: {rel}")
                print("   (outline failed)")
                print()
            continue

        if compact or json_out:
            summary = _summarize_outline_json(parse_compact_json(out))
            entry["outline"] = summary
            entry["status"] = "ok"
            report["targets"].append(entry)
            if compact and not json_out:
                types = ", ".join(f"{k}:{v}" for k, v in sorted(summary["by_type"].items()))
                print(f"[{target.get('zone', '?')}] {tid}: {summary['symbol_count']} symbols in {summary['file_count']} files ({types})")
            continue

        entry["status"] = "ok"
        report["targets"].append(entry)
        print(f"## {name}")
        print(f"   path: {rel}")
        if target.get("zone"):
            print(f"   zone: {target['zone']}")
        body, truncated = truncate_output(out.strip() or "(no outline entries)")
        for line in body.splitlines():
            print(f"   {line}")
        if truncated:
            print("   [section truncated — run outline on path directly]")
        print()

    if json_out:
        json.dump(report, sys.stdout, indent=2)
        print()
    return 0


def cmd_discover(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    zone_filter = getattr(args, "zone", None) or ""
    report = _discover_report(root, zone_filter=zone_filter)

    if getattr(args, "json_out", False):
        json.dump(report, sys.stdout, indent=2)
        print()
        return 0

    print(
        f"discover: {report['candidates']} candidate(s)"
        f"  mapped_hits={report['mapped_hits']}"
        f"  unmapped={len(report['unmapped'])}"
        f"  stale={len(report['stale'])}"
    )
    print(f"zones: {', '.join(report['zones'])}")
    if report["unmapped_by_zone"]:
        print("unmapped by zone:", ", ".join(f"{k}={v}" for k, v in sorted(report["unmapped_by_zone"].items())))

    if report["stale"]:
        print("\n[stale targets — path missing]")
        for row in report["stale"][:40]:
            print(f"  [{row['zone']}] {row['id']}  {row['path']}")
        if len(report["stale"]) > 40:
            print(f"  ... {len(report['stale']) - 40} more")

    if report["unmapped"]:
        print("\n[unmapped candidates — add to repo-map.json]")
        for row in report["unmapped"][:60]:
            entry = f"  entry={row['entry']}" if row.get("entry") else ""
            print(
                f"  [{row['zone']}] {row['suggested_id']}  {row['path']}"
                f"  ({row['kind']}/{row['probe']}){entry}"
            )
        if len(report["unmapped"]) > 60:
            print(f"  ... {len(report['unmapped']) - 60} more")

    if getattr(args, "fail_on", False) and report["unmapped"]:
        return 1
    return 0


def cmd_zones(args: argparse.Namespace) -> int:
    if getattr(args, "discover", False):
        return cmd_discover(args)

    data = _load_repo_map()
    zones_meta = data.get("zones", {})
    targets = data.get("targets", [])
    by_zone: dict[str, list[dict]] = {}
    for t in targets:
        by_zone.setdefault(t.get("zone", "?"), []).append(t)

    stats: dict[str, int] = {}
    if getattr(args, "stats", False):
        root = git_root() or Path.cwd()
        binary = require_binary(require_outline=True)
        index = _load_symbol_index(args, root, binary)
        for t_summary in index.get("targets", []):
            z = t_summary.get("zone") or "?"
            stats[z] = stats.get(z, 0) + t_summary.get("symbol_count", 0)

    rows = []
    for zone_id, label in zones_meta.items():
        zone_targets = by_zone.get(zone_id, [])
        rows.append({
            "id": zone_id,
            "label": label,
            "targets": len(zone_targets),
            "symbols": stats.get(zone_id),
        })

    if getattr(args, "json_out", False):
        json.dump({"zones": rows}, sys.stdout, indent=2)
        print()
        return 0

    print(f"zones: {len(rows)}")
    for row in rows:
        sym = f"  symbols: {row['symbols']}" if row["symbols"] is not None else ""
        print(f"  {row['id']}: {row['label']}")
        print(f"    targets: {row['targets']}{sym}")
        for t in by_zone.get(row["id"], []):
            print(f"      - {t.get('id')}  {t.get('path')}")
    return 0


def cmd_index(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)

    if getattr(args, "status", False):
        cache = _outline_index_cache_path()
        targets = _resolve_repo_targets(args)
        if not cache.is_file():
            print("cache: missing (run: index --refresh)")
            return 0
        try:
            cached = json.loads(cache.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            print("cache: corrupt (run: index --refresh)")
            return 1
        if cached.get("repo") != str(root):
            print(f"cache: repo mismatch ({cached.get('repo')} vs {root})")
            return 1
        stale = _index_stale_targets(cached, root, targets)
        print(f"built_at: {cached.get('built_at', '?')}")
        print(f"symbols: {cached.get('total_symbols', 0)} across {len(cached.get('targets', []))} targets")
        print(f"cache: {cache}")
        print(f"stale: {', '.join(stale) if stale else 'none'}")
        if stale and getattr(args, "fail_on", False):
            return 1
        return 0

    index = _load_symbol_index(args, root, binary)
    matches = _filter_index_symbols(index, args)

    if getattr(args, "json_out", False):
        json.dump({"total_symbols": index.get("total_symbols"), "matches": matches}, sys.stdout, indent=2)
        print()
        return 0

    if getattr(args, "name", None) or getattr(args, "symbol_type", None) or getattr(args, "exports_only", False):
        if not matches:
            print("(no symbols matched filter)")
            return 0
        print(f"matches: {len(matches)}")
        current = ""
        for m in matches[:500]:
            header = f"{m['name']} ({m.get('type', '?')})"
            if header != current:
                current = header
                print(f"\n{header}")
            exp = " export" if m.get("exported") else ""
            print(f"  [{m.get('zone')}] {m.get('target')}  {m.get('file')}:{m.get('line')}{exp}")
        if len(matches) > 500:
            print(f"\n... {len(matches) - 500} more — narrow with --name or --zone")
        return 0

    print(f"symbol index: {index.get('total_symbols', 0)} symbols across {len(index.get('targets', []))} targets")
    print(f"unique names: {len(index.get('symbols_by_name', {}))}")
    print(f"cache: {_outline_index_cache_path()}")
    top = sorted(
        index.get("symbols_by_name", {}).items(),
        key=lambda kv: -len(kv[1]),
    )[:20]
    print("\ntop symbols by occurrence:")
    for name, occs in top:
        zones = sorted({o.get("zone", "?") for o in occs})
        print(f"  {name}: {len(occs)}x  zones={','.join(zones)}")
    return 0


def cmd_nav(args: argparse.Namespace) -> int:
    zone = getattr(args, "zone", None)
    if not zone:
        err(f"nav requires --zone ({_zone_hint()})")
        return 1
    data = _load_repo_map()
    navigation = data.get("navigation", {})
    order = navigation.get(zone)
    targets_by_id = {t["id"]: t for t in data.get("targets", []) if t.get("id")}
    if not order:
        order = [t["id"] for t in data.get("targets", []) if t.get("zone") == zone and t.get("id")]

    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)
    print(f"zone: {zone}")
    print(f"read order: {len(order)} steps")
    print()

    for step, tid in enumerate(order, 1):
        target = targets_by_id.get(tid)
        if not target:
            print(f"{step}. {tid}  (unknown target id)")
            continue
        rel = target.get("path", ".")
        print(f"{step}. {target.get('name', tid)}")
        print(f"   id: {tid}")
        print(f"   path: {rel}")
        if target.get("description"):
            print(f"   {target['description']}")
        anchors = target.get("anchors", [])
        if anchors:
            print(f"   anchors: {', '.join(anchors)}")
        cmd = f"python3 {Path(__file__).name} outline {rel}"
        if target.get("bun_rules"):
            cmd += " --bun-rules"
        if target.get("view"):
            cmd += f" --view {target['view']}"
        print(f"   cmd: {cmd}")
        full = (root / rel).resolve()
        if full.exists() and getattr(args, "digest", False):
            nav_args = argparse.Namespace(
                view=target.get("view") or "digest",
                items=target.get("items"),
                bun_rules=bool(target.get("bun_rules")),
                match=None, types=None, lang=None, globs=None,
                outline_rules=None, pub_members=False,
                json_out=False, json_style="compact",
            )
            code, out = _run_outline(binary, nav_args, [str(full)], target)
            if code == 0 and out.strip():
                preview = out.strip().splitlines()[:6]
                for line in preview:
                    print(f"   | {line}")
        print()
    return 0


def cmd_anchors(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)
    index = _load_symbol_index(args, root, binary)
    targets = _resolve_repo_targets(args)
    rows: list[dict] = []
    missing_total = 0

    for target in targets:
        tid = target.get("id", "?")
        anchors = target.get("anchors", [])
        if not anchors:
            continue
        symbols = _target_symbols(index, tid)
        for anchor in anchors:
            found, matched = _match_anchor(anchor, symbols)
            if not found:
                missing_total += 1
            rows.append({
                "target": tid,
                "zone": target.get("zone"),
                "anchor": anchor,
                "found": found,
                "matched": matched,
            })

    if getattr(args, "json_out", False):
        json.dump({"anchors": rows, "missing": missing_total}, sys.stdout, indent=2)
        print()
        return 1 if missing_total and getattr(args, "fail_on", False) else 0

    if not rows:
        print("(no anchors defined in matched targets)")
        return 0

    print(f"anchors: {len(rows)} checked, {missing_total} missing")
    current = ""
    for row in rows:
        header = row["target"]
        if header != current:
            current = header
            print(f"\n[{row.get('zone')}] {header}")
        mark = "ok" if row["found"] else "MISSING"
        match = f" -> {row['matched']}" if row["matched"] else ""
        print(f"  {row['anchor']}: {mark}{match}")
    if getattr(args, "fail_on", False) and missing_total:
        return 1
    return 0


def cmd_exports(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)
    index = _load_symbol_index(args, root, binary)
    targets = _resolve_repo_targets(args)
    target_ids = {t.get("id") for t in targets}
    by_target: dict[str, list[dict]] = {}

    for sym_name, occs in index.get("symbols_by_name", {}).items():
        for occ in occs:
            if not occ.get("exported"):
                continue
            tid = occ.get("target")
            if target_ids and tid not in target_ids:
                continue
            by_target.setdefault(tid or "?", []).append({"name": sym_name, **occ})

    if getattr(args, "json_out", False):
        json.dump({"exports": by_target}, sys.stdout, indent=2)
        print()
        return 0

    total = sum(len(v) for v in by_target.values())
    print(f"export surface: {total} symbols across {len(by_target)} targets")
    for tid in sorted(by_target):
        items = sorted(by_target[tid], key=lambda x: (x.get("type", ""), x.get("name", "")))
        zone = items[0].get("zone", "?") if items else "?"
        print(f"\n[{zone}] {tid} ({len(items)} exports)")
        for item in items[:80]:
            print(f"  {item.get('type', '?')}: {item.get('name')}  {item.get('file')}:{item.get('line')}")
        if len(items) > 80:
            print(f"  ... {len(items) - 80} more")
    return 0


def cmd_collisions(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)
    index = _load_symbol_index(args, root, binary)
    zone_q = (getattr(args, "zone", None) or "").lower()
    min_targets = max(2, int(getattr(args, "min_targets", 2) or 2))
    rows: list[dict] = []

    for sym_name, occs in index.get("symbols_by_name", {}).items():
        filtered = occs
        if zone_q:
            filtered = [o for o in occs if (o.get("zone") or "").lower() == zone_q]
        targets_set = {o.get("target") for o in filtered}
        zones_set = {o.get("zone") for o in filtered}
        if len(targets_set) < min_targets:
            continue
        rows.append({
            "name": sym_name,
            "count": len(filtered),
            "targets": sorted(targets_set),
            "zones": sorted(zones_set),
            "occurrences": filtered,
        })

    rows.sort(key=lambda r: (-r["count"], r["name"]))

    if getattr(args, "json_out", False):
        json.dump({"collisions": rows}, sys.stdout, indent=2)
        print()
        return 0

    print(f"collisions: {len(rows)} symbol names span {min_targets}+ targets")
    for row in rows[:60]:
        zones = ",".join(row["zones"])
        targets = ",".join(row["targets"])
        print(f"  {row['name']}: {row['count']}x  zones={zones}  targets={targets}")
    if len(rows) > 60:
        print(f"  ... {len(rows) - 60} more")
    return 0


def cmd_graph(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)
    targets = _resolve_repo_targets(args)
    edges = _collect_import_edges(args, root, binary, targets)

    if getattr(args, "json_out", False):
        json.dump({"edges": edges}, sys.stdout, indent=2)
        print()
        return 0

    print(f"import graph: {len(edges)} edges across {len(targets)} targets")
    for edge in edges:
        kinds = edge.get("kind", "?")
        imports = ", ".join(edge.get("imports", [])[:3])
        more = ""
        if len(edge.get("imports", [])) > 3:
            more = f" +{len(edge['imports']) - 3}"
        print(f"  {edge['from']} -> {edge['to']}  [{kinds}]  {imports}{more}")
    return 0


def _load_bun_patterns() -> dict:
    path = skill_root() / "bun-patterns.json"
    if not path.is_file():
        err(f"bun patterns not found: {path}")
        return {"patterns": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_bun_releases() -> dict:
    path = skill_root() / "bun-releases.json"
    if not path.is_file():
        err(f"bun releases not found: {path}")
        return {"releases": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_test_profiles() -> dict:
    path = skill_root() / "bun-test-profiles.json"
    if not path.is_file():
        err(f"test profiles not found: {path}")
        return {"profiles": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_bun_install() -> dict:
    path = skill_root() / "bun-install.json"
    if not path.is_file():
        err(f"bun install catalog not found: {path}")
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_install_profiles() -> dict:
    path = skill_root() / "bun-install-profiles.json"
    if not path.is_file():
        err(f"install profiles not found: {path}")
        return {"profiles": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_bundle_threat_profiles() -> dict:
    path = skill_root() / "bundle-threat-profiles.json"
    if not path.is_file():
        err(f"bundle-threat profiles not found: {path}")
        return {"profiles": {}}
    return json.loads(path.read_text(encoding="utf-8"))


_PKG_DEP_SECTIONS = (
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
)


def _classify_dep_spec(spec: str, catalog: dict) -> Optional[str]:
    if not isinstance(spec, str):
        return None
    if spec == "catalog:" or spec.startswith("catalog:"):
        return "pnpm-catalog"
    if spec.startswith("git@"):
        return "git-scp"
    for entry in catalog.get("non_npm_sources", []):
        eid = entry.get("id", "")
        prefix = entry.get("prefix", "")
        suffix = entry.get("suffix", "")
        if eid == "tarball":
            if spec.startswith(("https://", "http://")) and ".tgz" in spec:
                return eid
            continue
        if prefix and spec.startswith(prefix):
            return eid
    return None


def _iter_package_json_files(root: Path, scan_path: Path) -> list[Path]:
    skip = {"node_modules", ".git", "dist", "build", ".bun"}
    files: list[Path] = []
    if scan_path.is_file() and scan_path.name == "package.json":
        return [scan_path]
    for dirpath, dirnames, filenames in os.walk(scan_path):
        dirnames[:] = [d for d in dirnames if d not in skip and not d.startswith(".")]
        if "package.json" in filenames:
            files.append(Path(dirpath) / "package.json")
    return sorted(files)


def _scan_install_lockfiles(root: Path, scan_path: Path) -> list[dict]:
    """Detect bun/pnpm/yarn lockfiles and migration readiness."""
    names = {
        "bun.lock": "bun-text",
        "bun.lockb": "bun-legacy-binary",
        "pnpm-lock.yaml": "pnpm",
        "pnpm-workspace.yaml": "pnpm-workspace",
        "yarn.lock": "yarn",
    }
    hits: list[dict] = []
    base = scan_path if scan_path.is_dir() else scan_path.parent
    skip = {"node_modules", ".git"}
    for dirpath, dirnames, filenames in os.walk(base):
        depth = Path(dirpath).relative_to(base).parts if dirpath != str(base) else ()
        if len(depth) > 4:
            dirnames.clear()
            continue
        dirnames[:] = [d for d in dirnames if d not in skip]
        for name, kind in names.items():
            if name not in filenames:
                continue
            fp = Path(dirpath) / name
            rel = str(fp.relative_to(root)) if fp.is_relative_to(root) else str(fp)
            hits.append({"file": rel, "kind": kind, "name": name})
    pnpm = [h for h in hits if h["kind"] == "pnpm"]
    bun_text = [h for h in hits if h["kind"] == "bun-text"]
    bun_legacy = [h for h in hits if h["kind"] == "bun-legacy-binary"]
    migration: list[dict] = []
    if pnpm and not bun_text:
        migration.append({
            "id": "pnpm-auto-migrate",
            "message": "pnpm-lock.yaml without bun.lock — bun install will auto-migrate",
            "files": [h["file"] for h in pnpm],
        })
    if bun_legacy and not bun_text:
        migration.append({
            "id": "lockb-upgrade",
            "message": "bun.lockb without bun.lock — run profile lockfile-migrate",
            "command": "bun install --save-text-lockfile --frozen-lockfile --lockfile-only",
        })
    return hits, migration


def _scan_non_npm_dependencies(root: Path, scan_path: Path) -> dict:
    catalog = _load_bun_install()
    findings: list[dict] = []
    totals: dict[str, int] = {}
    for pkg_path in _iter_package_json_files(root, scan_path):
        try:
            data = json.loads(pkg_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        rel = str(pkg_path.relative_to(root)) if pkg_path.is_relative_to(root) else str(pkg_path)
        for section in _PKG_DEP_SECTIONS:
            block = data.get(section)
            if not isinstance(block, dict):
                continue
            for name, spec in block.items():
                kind = _classify_dep_spec(str(spec), catalog)
                if not kind:
                    continue
                totals[kind] = totals.get(kind, 0) + 1
                findings.append({
                    "file": rel,
                    "section": section,
                    "name": name,
                    "spec": spec,
                    "kind": kind,
                })
    bunfig_hits: list[dict] = []
    bunfig_name = "bunfig.toml"
    for dirpath, dirnames, filenames in os.walk(scan_path if scan_path.is_dir() else scan_path.parent):
        dirnames[:] = [d for d in dirnames if d not in {"node_modules", ".git"}]
        if bunfig_name not in filenames:
            continue
        bf = Path(dirpath) / bunfig_name
        try:
            text = bf.read_text(encoding="utf-8")
        except OSError:
            continue
        rel = str(bf.relative_to(root)) if bf.is_relative_to(root) else str(bf)
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("linker"):
                bunfig_hits.append({"file": rel, "key": "linker", "line": stripped})
            if stripped.startswith("minimumReleaseAge"):
                bunfig_hits.append({"file": rel, "key": "minimumReleaseAge", "line": stripped})
    lockfiles, migration = _scan_install_lockfiles(root, scan_path)
    return {
        "findings": findings,
        "totals": totals,
        "bunfig": bunfig_hits,
        "lockfiles": lockfiles,
        "migration": migration,
    }


def _resolve_bun_version() -> Optional[str]:
    if not shutil.which("bun"):
        return None
    try:
        proc = subprocess.run(
            ["bun", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if proc.returncode == 0:
            return proc.stdout.strip().lstrip("bun ").strip()
    except (subprocess.TimeoutExpired, OSError):
        pass
    return None


def _bun_version_gte(current: str, minimum: str) -> bool:
    def parts(v: str) -> list[int]:
        nums: list[int] = []
        for piece in v.split("."):
            digits = "".join(ch for ch in piece if ch.isdigit())
            nums.append(int(digits) if digits else 0)
        while len(nums) < 3:
            nums.append(0)
        return nums[:3]

    return parts(current) >= parts(minimum)


def _bun_native_targets(args: argparse.Namespace) -> list[dict]:
    targets = _resolve_repo_targets(args)
    if targets:
        return [t for t in targets if t.get("bun_rules") or "bun" in t.get("tags", [])]
    data = _load_repo_map()
    return [
        t for t in data.get("targets", [])
        if t.get("bun_rules") or "bun" in t.get("tags", [])
    ]


def _find_bun_pattern(patterns: list[dict], pattern_id: str) -> Optional[dict]:
    needle = pattern_id.lower()
    for p in patterns:
        if p.get("id", "").lower() == needle or p.get("name", "").lower() == needle:
            return p
    return None


def _filter_bun_patterns(
    patterns: list[dict],
    args: argparse.Namespace,
    data: Optional[dict] = None,
) -> list[dict]:
    bundle_q = getattr(args, "bundle", None) or ""
    if bundle_q:
        bundles = (data or {}).get("bundles", {})
        spec = bundles.get(bundle_q)
        if not spec:
            err(f"unknown bundle '{bundle_q}' — run: bun bundles")
            return []
        if spec.get("tier"):
            return [p for p in patterns if (p.get("tier") or "") == spec["tier"]]
        ids = set(spec.get("patterns", []))
        return [p for p in patterns if p.get("id") in ids]
    group_q = (getattr(args, "group", None) or getattr(args, "category", None) or "").lower()
    tier_q = (getattr(args, "tier", None) or "").lower()
    core_only = getattr(args, "core_only", False)
    filtered = patterns
    if group_q:
        filtered = [p for p in filtered if (p.get("group") or p.get("category", "")).lower() == group_q]
    if tier_q:
        filtered = [p for p in filtered if (p.get("tier") or "").lower() == tier_q]
    if core_only:
        filtered = [p for p in filtered if (p.get("tier") or "") == "core"]
    return filtered


def _bun_inventory_cache_path() -> Path:
    return skill_root() / ".bun-inventory-cache.json"


def _bun_adoption_grade(score: float) -> str:
    if score >= 95:
        return "A"
    if score >= 80:
        return "B"
    if score >= 60:
        return "C"
    if score >= 40:
        return "D"
    return "F"


def _bun_score_target(entry: dict, all_patterns: list[dict]) -> dict:
    anti_ids = {
        p["id"] for p in all_patterns
        if (p.get("group") or p.get("category")) == "anti-pattern"
    }
    native = 0
    anti = 0
    for pid, info in entry.get("patterns", {}).items():
        count = info.get("count", 0)
        if pid in anti_ids:
            anti += count
        else:
            native += count
    total = native + anti
    score = round(100.0 * native / total, 1) if total else (100.0 if native else 0.0)
    return {
        "id": entry.get("id"),
        "zone": entry.get("zone"),
        "native": native,
        "anti": anti,
        "score": score,
        "grade": _bun_adoption_grade(score),
    }


def _load_bun_inventory_cache(args: argparse.Namespace, data: dict, *, refresh: bool = False) -> dict:
    cache_path = _bun_inventory_cache_path()
    root = git_root() or Path.cwd()
    targets = _bun_native_targets(args)
    all_patterns = data.get("patterns", [])
    native_patterns = [p for p in all_patterns if (p.get("group") or p.get("category")) != "anti-pattern"]

    if not refresh and cache_path.is_file():
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            if cached.get("repo") == str(root):
                stale = _index_stale_targets(cached, root, targets)
                if not stale:
                    return cached
        except (OSError, json.JSONDecodeError):
            pass

    target_rows, totals, group_totals = _collect_bun_counts(
        args, data, native_patterns, include_anti=True,
    )
    mtimes: dict[str, float] = {}
    for target in targets:
        tid = target.get("id")
        if tid:
            mtimes[tid] = _path_mtime((root / target.get("path", ".")).resolve())

    cached = {
        "version": data.get("version"),
        "repo": str(root),
        "built_at": datetime.now(timezone.utc).isoformat(),
        "target_mtimes": mtimes,
        "targets": target_rows,
        "totals": totals,
        "group_totals": group_totals,
    }
    try:
        cache_path.write_text(json.dumps(cached, indent=2), encoding="utf-8")
    except OSError:
        pass
    return cached


def _filter_cached_targets(cached: dict, args: argparse.Namespace) -> list[dict]:
    rows = cached.get("targets", [])
    only = (getattr(args, "only", None) or "").lower()
    zone = (getattr(args, "zone", None) or "").lower()
    if zone:
        rows = [r for r in rows if (r.get("zone") or "").lower() == zone]
    if only:
        rows = [
            r for r in rows
            if only in (r.get("id") or "").lower()
            or only in (r.get("path") or "").lower()
        ]
    return rows


def _bun_pattern_groups(data: dict) -> dict[str, str]:
    groups = dict(data.get("groups", {}))
    for p in data.get("patterns", []):
        g = p.get("group") or p.get("category")
        if g and g not in groups:
            groups[g] = g
    return groups


def _collect_bun_counts(
    args: argparse.Namespace,
    data: dict,
    patterns: list[dict],
    include_anti: bool = False,
) -> tuple[list[dict], dict[str, int], dict[str, dict[str, int]]]:
    binary = require_binary()
    root = git_root() or Path.cwd()
    targets = _bun_native_targets(args)
    anti = [p for p in data.get("patterns", []) if (p.get("group") or p.get("category")) == "anti-pattern"]
    scan_patterns = patterns + (anti if include_anti else [])
    totals: dict[str, int] = {}
    group_totals: dict[str, dict[str, int]] = {}
    target_rows: list[dict] = []

    for target in targets:
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        tid = target.get("id", rel)
        if not full.exists():
            continue
        globs = list(target.get("globs") or [])
        entry: dict = {"id": tid, "zone": target.get("zone"), "path": rel, "patterns": {}, "groups": {}}
        for p in scan_patterns:
            pid = p.get("id", "?")
            count, files = _count_pattern_files(
                binary, p["pattern"], p.get("lang", "ts"), full, globs,
            )
            entry["patterns"][pid] = {"count": count, "files": files[:10]}
            totals[pid] = totals.get(pid, 0) + count
            grp = p.get("group") or p.get("category") or "?"
            entry["groups"][grp] = entry["groups"].get(grp, 0) + count
            group_totals.setdefault(grp, {})
            group_totals[grp][tid] = group_totals[grp].get(tid, 0) + count
        target_rows.append(entry)
    return target_rows, totals, group_totals


def _count_pattern_files(
    binary: Path,
    pattern: str,
    lang: str,
    path: Path,
    globs: Optional[list[str]] = None,
) -> tuple[int, list[str]]:
    sg_args = ["run", "-p", pattern, "--files-with-matches", "--color", "never", "--lang", lang]
    for g in globs or []:
        sg_args.extend(["--globs", g])
    sg_args.append(str(path))
    proc = run_sg(binary, sg_args)
    if proc.returncode not in (0, 1):
        trace(f"bun pattern count skipped ({proc.returncode}): {pattern}")
        return 0, []
    files = [line.strip() for line in (proc.stdout or "").splitlines() if line.strip()]
    return len(files), files


def cmd_bun_bundles(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    bundles = data.get("bundles", {})
    if getattr(args, "json_out", False):
        json.dump({"bundles": bundles}, sys.stdout, indent=2)
        print()
        return 0
    print(f"bun bundles: {len(bundles)}")
    for bid, spec in bundles.items():
        pats = spec.get("patterns")
        tier = spec.get("tier")
        detail = f"tier={tier}" if tier else f"{len(pats or [])} patterns"
        print(f"  {bid}: {spec.get('description', '')} ({detail})")
        if pats:
            print(f"    {', '.join(pats)}")
    print("\nrun: bun inventory --bundle server-boot")
    return 0


def cmd_bun_patterns(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    patterns = _filter_bun_patterns(data.get("patterns", []), args, data)
    groups = _bun_pattern_groups(data)
    if getattr(args, "json_out", False):
        json.dump({**data, "patterns": patterns}, sys.stdout, indent=2)
        print()
        return 0
    print(f"bun patterns: {len(patterns)} (bun-patterns.json v{data.get('version', '?')})")
    if groups:
        print("groups:", ", ".join(f"{k}" for k in sorted(groups)))
    by_grp: dict[str, list[dict]] = {}
    for p in patterns:
        by_grp.setdefault(p.get("group") or p.get("category", "?"), []).append(p)
    for grp in sorted(by_grp):
        label = groups.get(grp, grp)
        print(f"\n[{grp}] {label}")
        for p in by_grp[grp]:
            outline = "outline" if p.get("outline") else "search"
            tier = p.get("tier", "")
            tier_s = f" {tier}" if tier else ""
            docs = p.get("docs_path")
            docs_s = f"  docs:{docs}" if docs else ""
            print(f"  {p.get('id')}: {p.get('name')}  ({outline}{tier_s}) — {p.get('description', '')}{docs_s}")
    print("\nrun: bun docs | bun matrix | bun heatmap | bun search <id>")
    return 0


def cmd_bun_inventory(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    all_patterns = data.get("patterns", [])
    patterns = _filter_bun_patterns(
        [p for p in all_patterns if (p.get("group") or p.get("category")) != "anti-pattern"],
        args,
        data,
    )
    if not patterns:
        err("no patterns matched filter")
        return 1
    if not _bun_native_targets(args):
        err("no bun-native targets (set bun_rules or tag:bun on repo-map targets)")
        return 1

    if getattr(args, "bundle", None):
        target_rows, totals, _ = _collect_bun_counts(args, data, patterns, include_anti=True)
    else:
        cached = _load_bun_inventory_cache(args, data, refresh=getattr(args, "refresh", False))
        target_rows = _filter_cached_targets(cached, args)
        allowed = {p["id"] for p in patterns}
        totals = {k: v for k, v in cached.get("totals", {}).items() if k in allowed}
        for row in target_rows:
            row["patterns"] = {k: v for k, v in row.get("patterns", {}).items() if k in allowed}
    report = {"targets": target_rows, "totals": totals}

    if getattr(args, "json_out", False):
        json.dump(report, sys.stdout, indent=2)
        print()
        return 0

    print(f"bun inventory: {len(target_rows)} targets, {len(patterns)} patterns")
    rows = sorted(totals.items(), key=lambda kv: -kv[1])
    print("\nAPI totals:")
    for pid, count in rows:
        if count:
            p = _find_bun_pattern(all_patterns, pid) or {}
            print(f"  {p.get('name', pid)}: {count} file(s)")
    print()
    for entry in target_rows:
        hits = {k: v["count"] for k, v in entry["patterns"].items() if v["count"]}
        if not hits:
            continue
        summary = ", ".join(f"{k}={v}" for k, v in sorted(hits.items(), key=lambda x: -x[1])[:8])
        more = f" +{len(hits) - 8}" if len(hits) > 8 else ""
        print(f"[{entry.get('zone')}] {entry['id']}: {summary}{more}")
    return 0


def cmd_bun_matrix(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    patterns = _filter_bun_patterns(
        [p for p in data.get("patterns", []) if (p.get("group") or p.get("category")) != "anti-pattern"],
        args,
        data,
    )
    if not _bun_native_targets(args):
        err("no bun-native targets")
        return 1
    if getattr(args, "bundle", None):
        target_rows, _totals, group_totals = _collect_bun_counts(args, data, patterns, include_anti=False)
    else:
        cached = _load_bun_inventory_cache(args, data, refresh=getattr(args, "refresh", False))
        target_rows = _filter_cached_targets(cached, args)
        group_totals = cached.get("group_totals", {})
    tids = [r["id"] for r in target_rows]
    groups = sorted(group_totals.keys())

    if getattr(args, "json_out", False):
        json.dump({"groups": group_totals, "targets": tids}, sys.stdout, indent=2)
        print()
        return 0

    labels = [tid.split("-")[-1][:10] for tid in tids]
    col_w = 10
    print(f"bun matrix: {len(groups)} groups x {len(tids)} targets")
    print(f"  targets: {', '.join(tids)}")
    header = f"{'group':<14}" + "".join(f"{lb:>{col_w}}" for lb in labels)
    print(header)
    for grp in groups:
        row = f"{grp:<14}"
        for tid in tids:
            val = group_totals.get(grp, {}).get(tid, 0)
            row += f"{val:>{col_w}}" if val else f"{'·':>{col_w}}"
        print(row)
    return 0


def cmd_bun_heatmap(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    patterns = _filter_bun_patterns(
        [p for p in data.get("patterns", []) if (p.get("group") or p.get("category")) != "anti-pattern"],
        args,
        data,
    )
    if getattr(args, "bundle", None):
        _target_rows, totals, _ = _collect_bun_counts(args, data, patterns, include_anti=False)
    else:
        cached = _load_bun_inventory_cache(args, data, refresh=getattr(args, "refresh", False))
        totals = cached.get("totals", {})
        allowed = {p["id"] for p in patterns}
        totals = {k: v for k, v in totals.items() if k in allowed}
    rows = [(pid, count) for pid, count in totals.items() if count]
    rows.sort(key=lambda x: -x[1])
    if not rows:
        print("(no bun pattern matches)")
        return 0
    max_count = rows[0][1]

    if getattr(args, "json_out", False):
        json.dump({"heatmap": [{"id": pid, "count": c} for pid, c in rows]}, sys.stdout, indent=2)
        print()
        return 0

    print(f"bun heatmap: {len(rows)} patterns with matches")
    all_patterns = data.get("patterns", [])
    for pid, count in rows[:40]:
        p = _find_bun_pattern(all_patterns, pid) or {}
        width = max(1, int(40 * count / max_count))
        bar = "#" * width
        grp = p.get("group", "?")
        print(f"{count:4d} {bar:<40} [{grp}] {p.get('name', pid)}")
    if len(rows) > 40:
        print(f"... {len(rows) - 40} more — narrow with --group or --tier core")
    return 0


def cmd_bun_score(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    all_patterns = data.get("patterns", [])
    if not _bun_native_targets(args):
        err("no bun-native targets")
        return 1
    cached = _load_bun_inventory_cache(args, data, refresh=getattr(args, "refresh", False))
    rows = [_bun_score_target(r, all_patterns) for r in _filter_cached_targets(cached, args)]
    rows.sort(key=lambda r: -r["score"])
    min_score = float(getattr(args, "min_score", 0) or 0)

    if getattr(args, "json_out", False):
        json.dump({"scores": rows, "cache": str(_bun_inventory_cache_path())}, sys.stdout, indent=2)
        print()
        if min_score and any(r["score"] < min_score for r in rows):
            return 1
        return 0

    print(f"bun adoption score ({len(rows)} targets)")
    print(f"cache: {_bun_inventory_cache_path()}  built_at: {cached.get('built_at', '?')}")
    for row in rows:
        print(
            f"  [{row.get('zone')}] {row['id']}: {row['score']}% ({row['grade']})"
            f"  native={row['native']} anti={row['anti']}"
        )
    if min_score:
        failing = [r for r in rows if r["score"] < min_score]
        if failing:
            print(f"\n{len(failing)} target(s) below --min-score {min_score}")
            return 1
    return 0


def cmd_bun_migrate(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    all_patterns = data.get("patterns", [])
    anti = [p for p in all_patterns if (p.get("group") or p.get("category")) == "anti-pattern"]
    if not _bun_native_targets(args):
        err("no bun-native targets")
        return 1
    cached = _load_bun_inventory_cache(args, data, refresh=getattr(args, "refresh", False))
    findings: list[dict] = []
    for row in _filter_cached_targets(cached, args):
        for p in anti:
            pid = p.get("id", "?")
            info = row.get("patterns", {}).get(pid, {})
            if not info.get("count"):
                continue
            findings.append({
                "target": row.get("id"),
                "zone": row.get("zone"),
                "pattern": pid,
                "name": p.get("name"),
                "migrate_to": p.get("migrate_to"),
                "files": info.get("files", []),
                "count": info.get("count"),
            })

    if getattr(args, "json_out", False):
        json.dump({"migrations": findings}, sys.stdout, indent=2)
        print()
        return 1 if findings and getattr(args, "fail_on", False) else 0

    if not findings:
        print("(no anti-pattern matches — Bun-native clean)")
        return 0
    print(f"migrate: {len(findings)} anti-pattern hit(s)")
    for f in findings:
        hint = f" -> {f['migrate_to']}" if f.get("migrate_to") else ""
        print(f"\n[{f.get('zone')}] {f['target']}: {f.get('name')}{hint}")
        for fp in f.get("files", [])[:5]:
            print(f"  {fp}")
        if len(f.get("files", [])) > 5:
            print(f"  ... {len(f['files']) - 5} more")
    if getattr(args, "fail_on", False):
        return 1
    return 0


def cmd_bun_report(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    all_patterns = data.get("patterns", [])
    if not _bun_native_targets(args):
        err("no bun-native targets")
        return 1
    cached = _load_bun_inventory_cache(args, data, refresh=getattr(args, "refresh", False))
    target_rows = _filter_cached_targets(cached, args)
    scores = [_bun_score_target(r, all_patterns) for r in target_rows]
    anti_hits = sum(s["anti"] for s in scores)
    native_hits = sum(s["native"] for s in scores)
    group_totals = cached.get("group_totals", {})

    migrations: list[dict] = []
    anti = [p for p in all_patterns if (p.get("group") or p.get("category")) == "anti-pattern"]
    for row in target_rows:
        for p in anti:
            info = row.get("patterns", {}).get(p.get("id", ""), {})
            if info.get("count"):
                migrations.append({
                    "target": row.get("id"),
                    "pattern": p.get("id"),
                    "migrate_to": p.get("migrate_to"),
                    "count": info.get("count"),
                })

    report = {
        "built_at": cached.get("built_at"),
        "targets": len(target_rows),
        "native_hits": native_hits,
        "anti_hits": anti_hits,
        "scores": scores,
        "group_totals": group_totals,
        "migrations": migrations,
        "top_apis": sorted(
            [(k, v) for k, v in cached.get("totals", {}).items() if v],
            key=lambda x: -x[1],
        )[:10],
    }

    if getattr(args, "json_out", False):
        json.dump(report, sys.stdout, indent=2)
        print()
        return 0

    print("bun report")
    print(f"  cache: {_bun_inventory_cache_path()}")
    print(f"  built_at: {report['built_at']}")
    print(f"  targets: {report['targets']}  native_hits: {native_hits}  anti_hits: {anti_hits}")
    print("\nscores:")
    for s in scores:
        print(f"  {s['id']}: {s['score']}% ({s['grade']})")
    if group_totals:
        print("\ngroups:")
        for grp in sorted(group_totals):
            total = sum(group_totals[grp].values())
            if total:
                print(f"  {grp}: {total}")
    if migrations:
        print("\nmigrations:")
        for m in migrations:
            print(f"  {m['target']}: {m['pattern']} -> {m.get('migrate_to', '?')} ({m['count']} files)")
    print("\ntop APIs:")
    for pid, count in report["top_apis"]:
        p = _find_bun_pattern(all_patterns, pid) or {}
        if (p.get("group") or "") != "anti-pattern":
            print(f"  {p.get('name', pid)}: {count}")
    return 0


def _bun_roadmap_items(data: dict, args: argparse.Namespace) -> list[dict]:
    roadmap = data.get("roadmap", {})
    items = list(roadmap.get("items", []))
    patterns = {p.get("id"): p for p in data.get("patterns", [])}
    priority_q = (getattr(args, "priority", None) or "").lower()
    integration_q = (getattr(args, "integration", None) or "").lower()
    if priority_q:
        items = [i for i in items if (i.get("priority") or "").lower() == priority_q]
    if integration_q:
        items = [i for i in items if (i.get("integration") or "").lower() == integration_q]
    rows: list[dict] = []
    for item in items:
        pat = patterns.get(item.get("pattern", ""), {})
        rows.append({
            **item,
            "cataloged": bool(pat),
            "group": pat.get("group"),
            "tier": pat.get("tier"),
        })
    return rows


def cmd_bun_features(args: argparse.Namespace) -> int:
    catalog = _load_bun_releases()
    release_key = getattr(args, "release", None) or catalog.get("default", "1.3.13")
    releases = catalog.get("releases", {})
    rel = releases.get(release_key)
    if not rel:
        err(f"unknown release '{release_key}' — choose: {', '.join(sorted(releases))}")
        return 1

    bun_ver = _resolve_bun_version()
    patterns = _load_bun_patterns()
    pattern_ids = {p.get("id") for p in patterns.get("patterns", [])}
    min_bun = patterns.get("min_bun") or catalog.get("min_bun") or release_key

    if getattr(args, "json_out", False):
        json.dump({
            "release": release_key,
            "bun_version": bun_ver,
            "min_bun": min_bun,
            "release_meta": rel,
        }, sys.stdout, indent=2)
        print()
        return 0

    blog = rel.get("blog", "")
    print(f"bun features: v{release_key}  catalog min_bun={min_bun}")
    if bun_ver:
        ok = _bun_version_gte(bun_ver, str(min_bun).split("-")[0] if min_bun else "0")
        print(f"runtime: bun {bun_ver}  {'ok' if ok else f'upgrade: bun upgrade (need >={min_bun})'}")
    else:
        print("runtime: bun not on PATH")
    if rel.get("summary"):
        print(f"summary: {rel['summary']}")
    if blog:
        print(f"blog: {blog}")

    test_cli = rel.get("test_cli", [])
    if test_cli:
        print("\n[bun test CLI]")
        for item in test_cli:
            print(f"  {item.get('flag')}: {item.get('description', '')}")
            if item.get("example"):
                print(f"    {item['example']}")
            profs = item.get("profiles") or []
            if profs:
                print(f"    profiles: {', '.join(profs)}")

    runtime_feats = rel.get("runtime", [])
    if runtime_feats:
        print("\n[runtime APIs]")
        for feat in runtime_feats:
            pats = feat.get("patterns") or []
            mapped = [p for p in pats if p in pattern_ids]
            status = f"{len(mapped)}/{len(pats)} cataloged" if pats else "cli-only"
            print(f"  {feat.get('topic')}: {feat.get('description', '')} ({status})")

    test_profiles = _load_test_profiles().get("profiles", {})
    if test_profiles and not getattr(args, "release", None):
        print("\n[bun-test-profiles.json]")
        for pid, spec in test_profiles.items():
            args_s = " ".join(spec.get("args", []))
            print(f"  {pid}: {spec.get('description', '')}")
            print(f"    bun test {args_s}")

    print("\nrun: bun test-ci --profile ci --path ./tests | bun install-docs")
    return 0


def cmd_bun_install_docs(args: argparse.Namespace) -> int:
    data = _load_bun_install()
    if not data:
        return 1
    topic = (getattr(args, "topic", None) or "").lower()

    if getattr(args, "json_out", False):
        json.dump(data, sys.stdout, indent=2)
        print()
        return 0

    print("bun install catalog")
    if data.get("docs"):
        print(f"docs: {data['docs']}")
    if not topic or topic == "sources":
        print("\n[non-npm dependencies]")
        for src in data.get("non_npm_sources", []):
            print(f"  {src.get('id')}: {src.get('example', '')}")
    if not topic or topic == "linker":
        print("\n[linker strategies]")
        for strat in data.get("linker_strategies", []):
            print(f"  {strat.get('id')}: {strat.get('description', '')}")
            if strat.get("cli"):
                print(f"    {strat['cli']}")
        defaults = data.get("default_linker", {})
        if defaults and (not topic or topic == "linker"):
            print(f"  defaults: workspace={defaults.get('new_workspace')}, single={defaults.get('new_single_package')}")
    if not topic or topic == "security":
        age = data.get("minimum_release_age", {})
        if age:
            print("\n[minimum release age]")
            print(f"  {age.get('description', '')}")
            if age.get("cli_example"):
                print(f"  {age['cli_example']}")
            for note in age.get("notes", [])[:4]:
                print(f"  - {note}")
    if not topic or topic == "bunfig":
        bunfig = data.get("bunfig", {})
        if bunfig:
            print("\n[bunfig.toml]")
            for p in bunfig.get("search_paths", []):
                print(f"  search: {p}")
            print(f"  install keys: {', '.join(bunfig.get('install_keys', [])[:8])}...")
    if not topic or topic == "env":
        print("\n[environment variables]")
        for ev in data.get("env_vars", []):
            print(f"  {ev.get('name')}: {ev.get('description', '')}")
    if topic == "platform":
        plat = data.get("platform", {})
        if plat:
            print("\n[platform-specific optional deps]")
            print(f"  {plat.get('description', '')}")
            print(f"  cpu: {', '.join(plat.get('cpu_values', []))}")
            print(f"  os: {', '.join(plat.get('os_values', []))}")
            if plat.get("cli_example"):
                print(f"  {plat['cli_example']}")
            if plat.get("lockfile_note"):
                print(f"  note: {plat['lockfile_note']}")
    if topic == "lockfile":
        lf = data.get("lockfile", {})
        if lf:
            print("\n[lockfile]")
            print(f"  current: {lf.get('current')}  legacy: {lf.get('legacy_binary')}")
            if lf.get("upgrade_command"):
                print(f"  upgrade: {lf['upgrade_command']}")
            for k, v in (lf.get("flags") or {}).items():
                print(f"  {k}: {v}")
    if topic == "backends":
        print("\n[install backends]")
        for be in data.get("backends", []):
            default = f" (default: {be['default_on']})" if be.get("default_on") else ""
            print(f"  {be.get('id')}{default}: {be.get('description', '')}")
    if topic == "pnpm":
        pm = data.get("pnpm_migration", {})
        if pm:
            print("\n[pnpm migration]")
            print(f"  trigger: {pm.get('trigger')}")
            for item in pm.get("migrates", []):
                print(f"  - {item}")
            for req in pm.get("requirements", []):
                print(f"  requires: {req}")
    if topic == "peers":
        peers = data.get("peer_dependencies", {})
        if peers:
            print("\n[peer dependencies]")
            print(f"  {peers.get('description', '')}")
            if peers.get("optional_meta"):
                print(f"  {peers['optional_meta']}")
    if topic == "cache":
        cache = data.get("cache", {})
        if cache:
            print("\n[cache]")
            print(f"  path: {cache.get('path')}")
            for cmd in cache.get("clear_commands", []):
                print(f"  clear: {cmd}")
            meta = cache.get("registry_metadata", {})
            if meta:
                print(f"  registry cache: {meta.get('path_pattern')} ({meta.get('format')})")
    if topic == "cli":
        flags = data.get("cli_flags", {})
        if flags:
            print("\n[CLI flags]")
            for _key, spec in sorted(flags.items()):
                print(f"  {spec.get('flag')}: {spec.get('description', '')}")

    profiles = _load_install_profiles().get("profiles", {})
    if profiles and topic in ("", "profiles"):
        print("\n[bun-install-profiles.json]")
        for pid, spec in profiles.items():
            args_s = " ".join(spec.get("args", []))
            print(f"  {pid}: {spec.get('description', '')}")
            if args_s:
                print(f"    bun install {args_s}")

    print("\nrun: bun install-scan | bun install-ci --profile ci-isolated --dry-run")
    return 0


def cmd_bun_install_scan(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    scan_rel = getattr(args, "scan_path", None) or "."
    scan_path = (root / scan_rel).resolve() if not Path(scan_rel).is_absolute() else Path(scan_rel)
    if not scan_path.exists():
        err(f"path not found: {scan_path}")
        return 1
    report = _scan_non_npm_dependencies(root, scan_path)
    findings = report["findings"]
    if getattr(args, "json_out", False):
        json.dump(report, sys.stdout, indent=2)
        print()
        return 0
    print(f"bun install-scan: {len(findings)} non-npm dep(s) under {scan_rel}")
    if report["totals"]:
        print("totals:", ", ".join(f"{k}={v}" for k, v in sorted(report["totals"].items())))
    for f in findings[:50]:
        print(f"  [{f['kind']}] {f['name']} @ {f['file']} ({f['section']})")
        print(f"    {f['spec']}")
    if len(findings) > 50:
        print(f"  ... {len(findings) - 50} more")
    if report["bunfig"]:
        print("\nbunfig.toml:")
        for hit in report["bunfig"][:20]:
            print(f"  {hit['file']}: {hit['line']}")
    if report.get("lockfiles"):
        print("\nlockfiles:")
        for lf in report["lockfiles"][:30]:
            print(f"  [{lf['kind']}] {lf['file']}")
    if report.get("migration"):
        print("\nmigration hints:")
        for m in report["migration"]:
            print(f"  {m['id']}: {m['message']}")
            if m.get("command"):
                print(f"    {m['command']}")
    if getattr(args, "fail_on", False) and findings:
        return 1
    return 0


def cmd_bun_install_ci(args: argparse.Namespace) -> int:
    profiles_data = _load_install_profiles()
    profiles = profiles_data.get("profiles", {})
    profile_name = getattr(args, "profile", None) or "ci"
    spec = profiles.get(profile_name)
    if not spec:
        err(f"unknown install profile '{profile_name}' — choose: {', '.join(sorted(profiles))}")
        return 1
    root = git_root() or Path.cwd()
    cmd = ["bun", "install", *spec.get("args", [])]
    env_spec = profiles_data.get("env", {})
    cpu = getattr(args, "cpu", None) or os.environ.get(env_spec.get("cpu", "BUN_INSTALL_CPU"), "")
    os_target = getattr(args, "os_target", None) or os.environ.get(env_spec.get("os", "BUN_INSTALL_OS"), "")
    if cpu and not any(a.startswith("--cpu") for a in cmd):
        cmd.append(f"--cpu={cpu}")
    if os_target and not any(a.startswith("--os") for a in cmd):
        cmd.append(f"--os={os_target}")
    if getattr(args, "dry_run", False):
        print(" ".join(cmd))
        return 0
    if not shutil.which("bun"):
        err("bun required for install-ci (use --dry-run to preview)")
        return 1
    trace(f"install-ci: {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=str(root))
    return proc.returncode


def _bundle_threat_script() -> Path:
    return skill_root() / "scripts" / "bundle-threat-scan.ts"


def _scan_packages_script() -> Path:
    return skill_root() / "scripts" / "scan-packages.ts"


def _validate_snapshot_script() -> Path:
    return skill_root() / "scripts" / "validate-snapshot.ts"


def _load_supply_chain_layers() -> dict:
    path = skill_root() / "supply-chain-layers.json"
    if not path.is_file():
        return {"layers": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _build_supply_chain_cmd(args: argparse.Namespace, profile_name: str, root: Path) -> list[str]:
    script = _bundle_threat_script()
    cmd = ["bun", str(script), "--repo", str(root), "--profile", profile_name]
    only = getattr(args, "only", None) or ""
    zone = getattr(args, "zone", None) or ""
    if only:
        cmd.extend(["--only", only])
    if zone:
        cmd.extend(["--zone", zone])
    scan_path = getattr(args, "scan_path", None) or getattr(args, "path", None)
    if scan_path:
        cmd.extend(["--path", str(scan_path)])
    fmt = getattr(args, "format", None) or "json"
    if fmt:
        cmd.extend(["--format", str(fmt)])
    if getattr(args, "parallel", False):
        cmd.append("--parallel")
    workers = getattr(args, "workers", None)
    if workers:
        cmd.extend(["--workers", str(workers)])
    rules = getattr(args, "rules", None)
    if rules:
        cmd.extend(["--rules", str(rules)])
    integrity = getattr(args, "integrity_manifest", None)
    if integrity:
        cmd.extend(["--integrity-manifest", str(integrity)])
    if getattr(args, "dry_run", False):
        cmd.append("--dry-run")
    if getattr(args, "fail_on", False):
        cmd.append("--fail-on")
    if getattr(args, "threat_feed", False):
        cmd.append("--threat-feed")
    if getattr(args, "no_threat_feed", False):
        cmd.append("--no-threat-feed")
    if getattr(args, "watch", False):
        cmd.append("--watch")
    if getattr(args, "watch_interval", None):
        cmd.extend(["--watch-interval", str(args.watch_interval)])
    if getattr(args, "fix", False):
        cmd.append("--fix")
    if getattr(args, "dry_run_fix", False):
        cmd.append("--dry-run-fix")
    return cmd


def _render_supply_chain_report(payload: dict, profile_name: str, *, verbose: bool) -> int:
    if payload.get("dry_run"):
        targets = payload.get("targets", [])
        print(f"supply-chain scan (dry-run): profile={profile_name}  targets={len(targets)}")
        for t in targets:
            print(f"  {t.get('id', '?')}  {t.get('path', '.')}")
        return 0

    summary = payload.get("summary", {})
    print(
        f"supply-chain (Layer {payload.get('layer', '4.5')}): profile={profile_name}"
        f"  findings={summary.get('findings', 0)}"
        f"  files={summary.get('files', 0)}"
        f"  elapsed={payload.get('elapsed_ms', '?')}ms"
        f"  workers={payload.get('workers', 1)}"
    )
    if payload.get("integrity_enabled"):
        print("  integrity: enabled")
    if payload.get("threat_feed_enabled"):
        print(f"  threat-feed: {payload.get('advisories_matched', 0)} CVE match(es)")
    if payload.get("description"):
        print(f"  {payload['description']}")

    total_errors = 0
    total_warns = 0
    targets = payload.get("targets", [])
    for target in targets:
        tid = target.get("id", "?")
        rel = target.get("path", ".")
        if target.get("skipped"):
            print(f"\n## {tid}  SKIP (missing {rel})")
            continue
        findings = target.get("findings", [])
        files_scanned = target.get("files_scanned", 0)
        by_sev: dict[str, int] = {}
        for f in findings:
            sev = f.get("severity", "info")
            by_sev[sev] = by_sev.get(sev, 0) + 1
            if sev == "error":
                total_errors += 1
            elif sev == "warn":
                total_warns += 1
        sev_s = ", ".join(f"{k}={v}" for k, v in sorted(by_sev.items())) or "clean"
        print(f"\n## {tid}  ({rel})  files={files_scanned}  {sev_s}")
        shown = 0
        for f in findings:
            if not verbose and shown >= 40:
                break
            rid = f.get("ruleId") or f.get("rule", "?")
            loc = f"{f.get('file', '?')}:{f.get('line', '?')}"
            detail = f"  {f['detail']}" if f.get("detail") else ""
            snippet = f"  snippet: {f['snippet']}" if f.get("snippet") else ""
            print(f"  [{f.get('severity')}] {rid} @ {loc}: {f.get('message', '')}{detail}{snippet}")
            shown += 1
        if not verbose and len(findings) > shown:
            print(f"  ... {len(findings) - shown} more (use --verbose)")
    print(f"\ntotal errors={total_errors}  warns={total_warns}")
    return 1 if total_errors > 0 else 0


def _run_supply_chain_scan(args: argparse.Namespace, *, default_profile: str = "default") -> int:
    profiles_data = _load_bundle_threat_profiles()
    profiles = profiles_data.get("profiles", {})
    profile_name = getattr(args, "profile", None) or default_profile
    if profile_name not in profiles:
        err(f"unknown profile '{profile_name}' — choose: {', '.join(sorted(profiles))}")
        return 1

    root = git_root() or Path.cwd()
    if not _bundle_threat_script().is_file():
        err("bundle-threat-scan.ts missing")
        return 1

    cmd = _build_supply_chain_cmd(args, profile_name, root)
    if getattr(args, "dry_run", False) and not shutil.which("bun"):
        print(" ".join(cmd))
        return 0
    if not shutil.which("bun"):
        err("bun required for supply-chain scan (use --dry-run to preview)")
        return 1

    trace(f"supply-chain: {' '.join(cmd)}")
    fmt = getattr(args, "format", None) or "json"
    passthrough = fmt in ("html", "markdown") and not getattr(args, "json_out", False)

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=DEFAULT_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        err(f"supply-chain scan timed out after {DEFAULT_TIMEOUT_S}s")
        return 1
    if proc.returncode != 0 and not proc.stdout.strip():
        err(proc.stderr.strip() or "supply-chain scan failed")
        return proc.returncode

    if passthrough:
        sys.stdout.write(proc.stdout)
        return proc.returncode

    raw = proc.stdout.strip()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        sys.stdout.write(proc.stdout)
        return proc.returncode

    if getattr(args, "json_out", False):
        json.dump(payload, sys.stdout, indent=2)
        print()
        return proc.returncode

    code = _render_supply_chain_report(payload, profile_name, verbose=bool(getattr(args, "verbose", False)))
    return max(proc.returncode, code) if getattr(args, "fail_on", False) else proc.returncode


def cmd_bun_supply_chain(args: argparse.Namespace) -> int:
    action = getattr(args, "supply_action", None) or "scan"
    if action == "layers":
        data = _load_supply_chain_layers()
        if getattr(args, "json_out", False):
            json.dump(data, sys.stdout, indent=2)
            print()
            return 0
        print(f"supply-chain layers (v{data.get('version', '?')})")
        for layer in data.get("layers", []):
            status = layer.get("status", "?")
            print(f"\n[Layer {layer.get('id')}] {layer.get('name')} ({status})")
            print(f"  {', '.join(layer.get('components', []))}")
            if layer.get("entry"):
                print(f"  entry: {layer['entry']}")
            if layer.get("note"):
                print(f"  note: {layer['note']}")
        print("\nrun: bun supply-chain scan --zone agents | bun supply-chain scan --path dist --format markdown")
        return 0
    if action == "rules":
        policy = skill_root() / "policies" / "security.policy.toml"
        legacy = skill_root() / "bundle-threat-rules.json"
        print("supply-chain rules:")
        print(f"  TOML: {policy} ({'ok' if policy.is_file() else 'missing'})")
        print(f"  JSON: {legacy} ({'ok' if legacy.is_file() else 'missing'})")
        print("  module: scripts/scan/transpiler/rule-engine.ts")
        return 0
    if action == "semver":
        version = getattr(args, "semver_version", None) or ""
        range_spec = getattr(args, "semver_range", None) or ""
        if not version or not range_spec:
            err("semver requires --version and --range")
            return 1
        if not shutil.which("bun"):
            err("bun required for semver check")
            return 1
        script = (
            "const v=process.argv[1],r=process.argv[2];"
            "console.log(JSON.stringify({"
            "version:v,range:r,"
            "satisfies:Bun.semver.satisfies(v,r),"
            "docs:'https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string--boolean'"
            "}));"
        )
        proc = subprocess.run(
            ["bun", "-e", script, version, range_spec],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode != 0:
            err(proc.stderr.strip() or "semver check failed")
            return 1
        payload = json.loads(proc.stdout.strip())
        if getattr(args, "json_out", False):
            json.dump(payload, sys.stdout, indent=2)
            print()
            return 0
        sat = payload.get("satisfies")
        print(f"Bun.semver.satisfies({version!r}, {range_spec!r}) → {sat}")
        print(f"docs: {payload.get('docs')}")
        return 0
    if action == "advisories":
        feed_path = skill_root() / "threat-feed.json"
        if not feed_path.is_file():
            err("threat-feed.json missing")
            return 1
        data = json.loads(feed_path.read_text(encoding="utf-8"))
        if getattr(args, "json_out", False):
            json.dump(data, sys.stdout, indent=2)
            print()
            return 0
        print(f"threat-feed (v{data.get('version', '?')}): {len(data.get('advisories', []))} advisories")
        if data.get("semver_docs"):
            print(f"  matcher: Bun.semver.satisfies — {data['semver_docs']}")
        for adv in data.get("advisories", []):
            cve = f" {adv['cve']}" if adv.get("cve") else ""
            syms = f"  symbols={adv['symbols']}" if adv.get("symbols") else ""
            print(
                f"  [{adv.get('severity')}] {adv.get('id')}: {adv.get('package')} {adv.get('range')}{cve}{syms}"
            )
        print("\nrun: bun supply-chain scan --threat-feed --path .")
        return 0
    if action == "packages":
        return _run_packages_scan(args)
    return _run_supply_chain_scan(args, default_profile="supply-chain-ci")


def _run_packages_scan(args: argparse.Namespace) -> int:
    root = git_root() or Path.cwd()
    script = _scan_packages_script()
    if not script.is_file():
        err("scan-packages.ts missing")
        return 1
    if not shutil.which("bun"):
        err("bun required for supply-chain packages scan")
        return 1
    cmd = ["bun", str(script), "--repo", str(root)]
    domain = getattr(args, "domain", None) or getattr(args, "only", None)
    if domain:
        cmd.extend(["--domain", str(domain)])
    scan_path = getattr(args, "scan_path", None) or getattr(args, "path", None)
    if scan_path:
        cmd.extend(["--path", str(scan_path)])
    if getattr(args, "json_out", False):
        cmd.append("--json")
    if getattr(args, "fail_on", False):
        cmd.append("--fail-on")
    if getattr(args, "threat_feed", False):
        cmd.append("--threat-feed")
    if getattr(args, "no_threat_feed", False):
        cmd.append("--no-threat-feed")
    if getattr(args, "fix", False):
        cmd.append("--fix")
    if getattr(args, "dry_run", False):
        cmd.append("--dry-run")
    if getattr(args, "watch", False):
        cmd.append("--watch")
    if getattr(args, "watch_interval", None):
        cmd.extend(["--watch-interval", str(args.watch_interval)])
    trace(f"supply-chain packages: {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=str(root))
    return proc.returncode


def cmd_bun_bundle_threat(args: argparse.Namespace) -> int:
    return _run_supply_chain_scan(args, default_profile="default")


def cmd_bun_test_ci(args: argparse.Namespace) -> int:
    profiles_data = _load_test_profiles()
    profiles = profiles_data.get("profiles", {})
    profile_name = getattr(args, "profile", None) or "ci"
    spec = profiles.get(profile_name)
    if not spec:
        err(f"unknown test profile '{profile_name}' — choose: {', '.join(sorted(profiles))}")
        return 1

    root = git_root() or Path.cwd()

    if not getattr(args, "dry_run", False):
        if not shutil.which("bun"):
            err("bun required for test-ci")
            return 1
        min_bun = profiles_data.get("min_bun", "1.3.13")
        bun_ver = _resolve_bun_version()
        if bun_ver and not _bun_version_gte(bun_ver, min_bun):
            err(f"bun {bun_ver} < {min_bun} — run: bun upgrade")
            return 1
    test_path = getattr(args, "test_path", None) or "."
    full_path = (root / test_path).resolve() if not Path(test_path).is_absolute() else Path(test_path)

    cmd = ["bun", "test", *spec.get("args", [])]
    shard = getattr(args, "shard", None) or os.environ.get("BUN_TEST_SHARD", "")
    if shard or spec.get("shard"):
        shard_val = shard or os.environ.get("BUN_TEST_SHARD", "")
        if not shard_val:
            err("profile requires --shard M/N or BUN_TEST_SHARD env")
            return 1
        cmd.append(f"--shard={shard_val}")
    changed = getattr(args, "changed", None)
    if changed:
        cmd.append(f"--changed={changed}" if changed != "1" else "--changed")
    if getattr(args, "dry_run", False):
        cmd.append(str(full_path))
        print(" ".join(cmd))
        return 0

    cmd.append(str(full_path))
    trace(f"test-ci: {' '.join(cmd)}")
    if getattr(args, "json_out", False):
        started = time.time()
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(root))
        json.dump({
            "profile": profile_name,
            "command": cmd,
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "elapsed_ms": int((time.time() - started) * 1000),
        }, sys.stdout, indent=2)
        print()
        return proc.returncode

    proc = subprocess.run(cmd, cwd=str(root))
    return proc.returncode


def cmd_bun_roadmap(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    roadmap = data.get("roadmap", {})
    rows = _bun_roadmap_items(data, args)
    states = roadmap.get("integration_states", {})

    if getattr(args, "json_out", False):
        json.dump({
            "version": data.get("version"),
            "description": roadmap.get("description"),
            "integration_states": states,
            "items": rows,
            "cataloged": sum(1 for r in rows if r.get("cataloged")),
            "integrated": sum(1 for r in rows if r.get("integration") == "integrated"),
        }, sys.stdout, indent=2)
        print()
        return 0

    cataloged = sum(1 for r in rows if r.get("cataloged"))
    integrated = sum(1 for r in rows if r.get("integration") == "integrated")
    print(f"bun roadmap: {cataloged}/{len(rows)} cataloged, {integrated} integrated (v{data.get('version', '?')})")
    if roadmap.get("description"):
        print(roadmap["description"])
    if states:
        print("states:", ", ".join(f"{k}={v}" for k, v in states.items()))

    order = {"high": 0, "medium": 1, "low": 2, "nice": 3}
    rows.sort(key=lambda r: (order.get((r.get("priority") or "").lower(), 9), r.get("api", "")))
    current_pri = None
    for row in rows:
        pri = (row.get("priority") or "?").upper()
        if pri != current_pri:
            current_pri = pri
            print(f"\n[{pri}]")
        cat = "yes" if row.get("cataloged") else "MISSING"
        integ = row.get("integration", "?")
        print(f"  {row.get('api')}: {row.get('use_case')}")
        print(f"    pattern={row.get('pattern')}  cataloged={cat}  integration={integ}")
    print("\nrun: bun supply-chain scan --zone agents | bun supply-chain layers")
    return 0


def cmd_bun_docs(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    topics = data.get("docs_topics", [])
    patterns = data.get("patterns", [])
    pattern_ids = {p.get("id") for p in patterns}
    base = (data.get("docs_base") or "https://bun.sh/docs").rstrip("/")
    index_path = data.get("docs_index", "/runtime/bun-apis")
    topic_q = (getattr(args, "topic", None) or "").lower()

    if topic_q:
        topics = [
            t for t in topics
            if topic_q in (t.get("id") or "").lower()
            or topic_q in (t.get("topic") or "").lower()
        ]

    rows: list[dict] = []
    for t in topics:
        mapped = [pid for pid in t.get("patterns", []) if pid in pattern_ids]
        missing = [pid for pid in t.get("patterns", []) if pid not in pattern_ids]
        rows.append({
            "id": t.get("id"),
            "topic": t.get("topic"),
            "apis": t.get("apis", []),
            "patterns": mapped,
            "missing_patterns": missing,
            "docs_url": f"{base}{t.get('docs_path', '')}",
            "covered": len(mapped) == len(t.get("patterns", [])) and bool(mapped),
        })

    if getattr(args, "json_out", False):
        json.dump({
            "version": data.get("version"),
            "index_url": f"{base}{index_path}",
            "topics": rows,
            "coverage": sum(1 for r in rows if r["covered"]),
            "total": len(rows),
        }, sys.stdout, indent=2)
        print()
        return 0

    covered = sum(1 for r in rows if r["covered"])
    print(f"bun docs: {covered}/{len(rows)} topics covered (bun-patterns.json v{data.get('version', '?')})")
    print(f"index: {base}{index_path}")
    print(f"patterns: {len([p for p in patterns if (p.get('group') or '') != 'anti-pattern'])} native APIs")
    for row in rows:
        status = "ok" if row["covered"] else "gap"
        pats = ", ".join(row["patterns"]) or "(none)"
        apis = ", ".join(row["apis"][:4])
        more = f" +{len(row['apis']) - 4}" if len(row["apis"]) > 4 else ""
        print(f"\n[{status}] {row['topic']}")
        print(f"  apis: {apis}{more}")
        print(f"  patterns: {pats}")
        print(f"  docs: {row['docs_url']}")
        if row["missing_patterns"]:
            print(f"  missing: {', '.join(row['missing_patterns'])}")
    print("\nrun: bun patterns --group networking | bun search bun-build")
    return 0


def cmd_bun_search(args: argparse.Namespace) -> int:
    data = _load_bun_patterns()
    pattern_id = getattr(args, "pattern_id", None) or ""
    pat = _find_bun_pattern(data.get("patterns", []), pattern_id)
    if not pat:
        err(f"unknown bun pattern '{pattern_id}' — run: bun patterns")
        return 1
    search_args = argparse.Namespace(
        pattern=pat["pattern"],
        paths=[],
        path=getattr(args, "path", None) or [],
        lang=pat.get("lang", "ts"),
        globs=getattr(args, "globs", None),
        context=getattr(args, "context", None),
        json_out=getattr(args, "json_out", False),
        force=True,
    )
    root = git_root() or Path.cwd()
    if not search_args.path:
        targets = _bun_native_targets(args)
        for t in targets:
            rel = t.get("path", ".")
            full = (root / rel).resolve()
            if full.exists():
                search_args.path.append(str(full))
        if not search_args.path:
            search_args.path = ["."]
    return cmd_search(search_args)


def cmd_jump(args: argparse.Namespace) -> int:
    name = getattr(args, "name", None)
    if not name:
        err("jump requires --name SYMBOL")
        return 1
    root = git_root() or Path.cwd()
    binary = require_binary(require_outline=True)
    index = _load_symbol_index(args, root, binary)
    matches = _filter_index_symbols(index, args)
    if not matches:
        print(f"(no symbol matched '{name}')")
        return 1

    def rank(m: dict) -> tuple:
        exact = m.get("name", "").lower() == name.lower()
        exported = bool(m.get("exported"))
        line = m.get("line") or 99999
        return (0 if exact else 1, 0 if exported else 1, line)

    matches.sort(key=rank)
    best = matches[0]

    if getattr(args, "json_out", False):
        json.dump({"best": best, "candidates": matches[:20]}, sys.stdout, indent=2)
        print()
        return 0

    print(f"jump: {best.get('name')} ({best.get('type', '?')})")
    print(f"  file: {best.get('file')}")
    print(f"  line: {best.get('line')}")
    print(f"  target: [{best.get('zone')}] {best.get('target')}")
    if best.get("exported"):
        print("  exported: yes")
    if len(matches) > 1:
        print(f"\nalternates: {len(matches) - 1}")
        for alt in matches[1:6]:
            print(f"  [{alt.get('zone')}] {alt.get('target')}  {alt.get('file')}:{alt.get('line')}")
    return 0


def cmd_files(args: argparse.Namespace) -> int:
    pattern: str = args.pattern
    lang = normalize_lang(args.lang)
    hints = validate_pattern(pattern, lang)
    if hints and not args.force:
        err("pattern looks invalid for ast-grep:")
        for h in hints:
            err(f"  - {h}")
        err("(pass --force to call ast-grep anyway)")
        return 2

    binary = require_binary()
    sg_args = ["run", "-p", pattern, "--files-with-matches", "--color", "never"]
    if lang:
        sg_args.extend(["--lang", lang])
    for g in args.globs or []:
        sg_args.extend(["--globs", g])
    sg_args.extend(_search_paths(args))

    proc = run_sg(binary, sg_args)
    if proc.returncode not in (0, 1):
        sys.stderr.write(proc.stderr or "")
        return 4
    out = proc.stdout.strip()
    if not out:
        print("(no files with matches)")
        return 0
    print(out)
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    pattern: str = args.pattern
    lang = normalize_lang(args.lang)
    hints = validate_pattern(pattern, lang)
    if hints:
        err("pattern looks invalid for ast-grep:")
        for h in hints:
            err(f"  - {h}")
        if not args.force:
            err("(pass --force to call ast-grep anyway)")
            return 2

    binary = require_binary()
    sg_args = ["run", "-p", pattern, "--json=compact"]
    if lang:
        sg_args.extend(["--lang", lang])
    if args.context:
        sg_args.extend(["-C", str(args.context)])
    for g in args.globs or []:
        sg_args.extend(["--globs", g])
    sg_args.extend(_search_paths(args))

    proc = run_sg(binary, sg_args)
    if proc.returncode not in (0, 1):  # 0=match, 1=no match - both fine
        sys.stderr.write(proc.stderr or "")
        return 4

    matches = parse_compact_json(proc.stdout)
    if args.json_out:
        json.dump(matches, sys.stdout, indent=2)
        print()
    else:
        format_matches(matches)

    if not matches:
        # Re-run pattern hints in case empty result was caused by something subtle.
        # Already done above; here we just give a generic suggestion.
        trace("no matches. If you expected matches, double-check --lang and the pattern shape.")
    return 0


def cmd_replace(args: argparse.Namespace) -> int:
    pattern: str = args.pattern
    rewrite: str = args.rewrite
    lang = normalize_lang(args.lang)

    pattern_hints = validate_pattern(pattern, lang)
    rewrite_hints = validate_pattern(rewrite, lang)
    all_hints = []
    if pattern_hints:
        all_hints.append("pattern issues:")
        all_hints.extend(f"  - {h}" for h in pattern_hints)
    if rewrite_hints:
        all_hints.append("rewrite issues:")
        all_hints.extend(f"  - {h}" for h in rewrite_hints)
    if all_hints:
        err("input looks invalid for ast-grep:")
        for line in all_hints:
            err(line)
        if not args.force:
            err("(pass --force to call ast-grep anyway)")
            return 2

    binary = require_binary()

    # Pass 1: dry-run via JSON to collect what would change.
    sg_args1 = ["run", "-p", pattern, "-r", rewrite, "--json=compact"]
    if lang:
        sg_args1.extend(["--lang", lang])
    for g in args.globs or []:
        sg_args1.extend(["--globs", g])
    sg_args1.extend(_search_paths(args))

    proc1 = run_sg(binary, sg_args1)
    if proc1.returncode not in (0, 1):
        sys.stderr.write(proc1.stderr or "")
        return 4

    matches = parse_compact_json(proc1.stdout)
    if not matches:
        trace("no matches; nothing to replace.")
        return 0

    if not _wants_apply(args):
        # Show the dry-run preview and exit.
        print(f"DRY-RUN: would rewrite {len(matches)} match(es) across "
              f"{len({m['file'] for m in matches})} file(s):")
        format_matches(matches, show_replacement=True)
        print()
        print("Re-run with --apply or --fix to mutate files.")
        return 0

    # Pass 2: apply with --update-all (no --json; sg silently ignores --update-all
    # when --json is present, so we MUST run a second invocation).
    sg_args2 = ["run", "-p", pattern, "-r", rewrite, "--update-all"]
    if lang:
        sg_args2.extend(["--lang", lang])
    for g in args.globs or []:
        sg_args2.extend(["--globs", g])
    sg_args2.extend(_search_paths(args))

    proc2 = run_sg(binary, sg_args2)
    if proc2.returncode not in (0, 1):
        sys.stderr.write(proc2.stderr or "")
        return 4

    print(f"APPLIED: rewrote {len(matches)} match(es) across "
          f"{len({m['file'] for m in matches})} file(s).")
    root = git_root()
    if root:
        diff = safe_git_diff(_search_paths(args), root)
        if diff:
            print()
            print("[git diff after apply]")
            print(diff)
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    binary = require_binary()
    sg_args = ["scan", "--color", "never"]
    config = getattr(args, "config", None)
    if not config and not getattr(args, "rule", None):
        default = default_sgconfig()
        if default:
            config = str(default)
    if config:
        sg_args.extend(["-c", config])
    rule = getattr(args, "rule", None)
    if rule:
        sg_args.extend(["-r", rule])
    inline_rules = getattr(args, "inline_rules", None)
    if inline_rules:
        sg_args.extend(["--inline-rules", inline_rules])
    report_style = getattr(args, "report_style", None)
    if report_style:
        sg_args.extend(["--report-style", report_style])
    if _wants_apply(args):
        sg_args.append("-U")
    paths = _search_paths(args)
    sg_args.extend(paths)

    proc = run_sg(binary, sg_args, capture=not _wants_apply(args))
    if proc.returncode not in (0, 1):
        if proc.stderr:
            sys.stderr.write(proc.stderr)
        return proc.returncode
    if _wants_apply(args):
        root = git_root()
        if root:
            diff = safe_git_diff(paths, root)
            if diff:
                print("[git diff after scan apply]")
                print(diff)
        return proc.returncode
    out = (proc.stdout or "").strip()
    if out:
        body, _ = truncate_output(out)
        print(body)
    else:
        print("(no scan results)")
    return proc.returncode


def cmd_test(args: argparse.Namespace) -> int:
    binary = require_binary()
    sg_args = ["test"]
    config = args.config or default_sgconfig()
    if config:
        sg_args.extend(["-c", str(config)])
    if args.test_dir:
        sg_args.extend(["-t", args.test_dir])
    if args.update:
        sg_args.append("-U")
    proc = run_sg(binary, sg_args, capture=False)
    return proc.returncode


def cmd_new(args: argparse.Namespace) -> int:
    binary = require_binary()
    sg_args = ["new", args.what]
    if args.name:
        sg_args.append(args.name)
    if args.lang:
        sg_args.extend(["--lang", args.lang])
    if args.yes:
        sg_args.append("--yes")
    proc = run_sg(binary, sg_args, capture=False)
    return proc.returncode


def cmd_langs(_args: argparse.Namespace) -> int:
    print("ast-grep supported languages (25):")
    for lang, exts in sorted(LANGUAGES.items()):
        print(f"  {lang:<12} {' '.join(exts)}")
    print()
    print("Aliases accepted by --lang:")
    for alias, canonical in sorted(LANG_ALIASES.items()):
        print(f"  {alias:<8} -> {canonical}")
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    print(f"ast-grep-helper v{VERSION}")
    print(f"Python:   {sys.version.split()[0]}")
    print(f"Platform: {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"Skill:    {skill_root()}")
    print()
    issues: list[str] = []
    artifacts = _skill_artifacts()

    binary = resolve_binary()
    outline_bin = resolve_binary(require_outline=True)

    if not binary:
        print("ast-grep binary: NOT FOUND")
        issues.append("binary")
    else:
        print(f"ast-grep binary: {binary}")
        proc = run_sg(binary, ["--version"], timeout=5)
        if proc.returncode == 0:
            print(f"  version: {proc.stdout.strip()}")
        else:
            print(f"  --version failed: {proc.stderr.strip()}")
            issues.append("binary-version")

    if outline_bin:
        print(f"outline: supported ({outline_bin})")
    else:
        print("outline: MISSING (need @ast-grep/cli@0.44.0+)")
        issues.append("outline")

    print(f"skill-pin: {'ok' if artifacts['skill_pin'] else 'missing'}")
    if not artifacts["skill_pin"]:
        issues.append("skill-pin")

    print(f"sgconfig.yml: {'ok' if artifacts['sgconfig'] else 'missing'}")
    print(f"repo-map.json: {'ok' if artifacts['repo_map'] else 'missing'}")
    print(f"zone-discovery.json: {'ok' if artifacts['zone_discovery'] else 'missing'}")
    print(f"scan-profiles.json: {'ok' if artifacts['scan_profiles'] else 'missing'}")
    print(f"codemods.json: {'ok' if artifacts['codemods'] else 'missing'}")
    print(f"bun-patterns.json: {'ok' if artifacts['bun_patterns'] else 'missing'}")
    print(f"bun-releases.json: {'ok' if artifacts['bun_releases'] else 'missing'}")
    print(f"bun-test-profiles.json: {'ok' if artifacts['test_profiles'] else 'missing'}")
    print(f"bun-install.json: {'ok' if artifacts['bun_install'] else 'missing'}")
    print(f"bun-install-profiles.json: {'ok' if artifacts['install_profiles'] else 'missing'}")
    print(
        f"supply-chain L4.5: {'ok' if artifacts['transpiler_module'] else 'missing'}"
        f"  policy={'ok' if artifacts['security_policy'] else 'missing'}"
        f"  feed={'ok' if artifacts['threat_feed'] else 'missing'}"
        f"  semver={'ok' if artifacts['semver_matcher'] else 'missing'}"
        f"  L5={'ok' if artifacts['registry_service'] else 'missing'}"
    )
    if getattr(args, "validate_snapshot", None):
        snap = Path(args.validate_snapshot)
        if not snap.is_file():
            print(f"snapshot validation: missing file {snap}")
            issues.append("snapshot-file")
        elif not shutil.which("bun"):
            print("snapshot validation: bun required")
            issues.append("snapshot-bun")
        else:
            proc = subprocess.run(
                ["bun", str(_validate_snapshot_script()), str(snap)],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if proc.returncode == 0:
                print(f"snapshot validation: ok ({snap.name})")
            else:
                print(f"snapshot validation: FAIL ({snap.name})")
                if proc.stdout.strip():
                    print(proc.stdout.strip())
                issues.append("snapshot-version")
    bun_ver = _resolve_bun_version()
    if bun_ver:
        patterns = _load_bun_patterns()
        min_bun = patterns.get("min_bun", "1.3.13")
        ok = _bun_version_gte(bun_ver, str(min_bun))
        print(f"bun runtime: {bun_ver}  (min_bun={min_bun}, {'ok' if ok else 'upgrade'})")
    else:
        print("bun runtime: not on PATH")
    print(f"bun-cli.ts: {'ok' if artifacts['bun_cli'] else 'missing'}")
    print(f"outline-rules: {'ok' if artifacts['outline_rules'] else 'missing'}")
    print(f"mcp server: {'ok' if artifacts['mcp'] else 'missing'}")
    print(f"scan rules: {len(artifacts['rules'])} ({', '.join(artifacts['rules']) or 'none'})")
    fix_rules = artifacts["fix_rules"]
    print(f"autofix rules: {len(fix_rules)} ({', '.join(fix_rules) or 'none — use replace --fix for codemods'})")

    cache = _outline_index_cache_path()
    if cache.is_file():
        try:
            cached = json.loads(cache.read_text(encoding="utf-8"))
            root = git_root() or Path.cwd()
            stale = _index_stale_targets(cached, root, _load_repo_map().get("targets", []))
            age = cached.get("built_at", "?")
            stale_msg = f"stale ({len(stale)} targets)" if stale else "fresh"
            print(f"index cache: {stale_msg}  built_at={age}")
        except (OSError, json.JSONDecodeError):
            print("index cache: corrupt (run: index --refresh)")
    else:
        print("index cache: missing (run: index --refresh)")

    bun_cache = _bun_inventory_cache_path()
    if bun_cache.is_file():
        try:
            bc = json.loads(bun_cache.read_text(encoding="utf-8"))
            root = git_root() or Path.cwd()
            stale = _index_stale_targets(bc, root, _bun_native_targets(argparse.Namespace()))
            print(f"bun cache: {'stale' if stale else 'fresh'}  built_at={bc.get('built_at', '?')}")
        except (OSError, json.JSONDecodeError):
            print("bun cache: corrupt (run: bun score --refresh)")
    else:
        print("bun cache: missing (run: bun score --zone sports-terminal)")

    try:
        bun_data = _load_bun_patterns()
        roadmap = bun_data.get("roadmap", {})
        items = roadmap.get("items", [])
        if items:
            cataloged = sum(
                1 for i in items
                if _find_bun_pattern(bun_data.get("patterns", []), i.get("pattern", ""))
            )
            integrated = sum(1 for i in items if i.get("integration") == "integrated")
            print(
                f"security roadmap: {cataloged}/{len(items)} cataloged,"
                f" {integrated} integrated (run: bun roadmap)"
            )
    except (OSError, json.JSONDecodeError, KeyError):
        pass

    if getattr(args, "fix", False):
        if issues:
            print()
            print("Applying fixes...")
            if "skill-pin" in issues or "outline" in issues or "binary" in issues:
                code = cmd_install(argparse.Namespace())
                if code != 0:
                    return code
                outline_bin = resolve_binary(require_outline=True)
                if not outline_bin:
                    err("install completed but outline still missing")
                    return 1
                print("  installed skill pin via scripts/install.sh")
                issues = [i for i in issues if i not in ("skill-pin", "outline", "binary", "binary-version")]
            if getattr(args, "global_fix", False) and "outline" in issues:
                err("global install not attempted; use: npm install -g @ast-grep/cli@0.44.0 --force")
        else:
            print()
            print("No environment fixes needed.")

    if issues:
        print()
        print("Remediation:")
        if "outline" in issues or "binary" in issues or "skill-pin" in issues:
            print(f"  python3 {Path(__file__).name} doctor --fix")
            print(f"  bash {skill_root()}/scripts/install.sh")
            print("  npm install -g @ast-grep/cli@0.44.0 --force")
        return 1
    return 0


def cmd_fix(args: argparse.Namespace) -> int:
    """Apply autofixes from rules that define `fix:` (currently no-as-any)."""
    root = git_root() or Path.cwd()
    _expand_repo_map_only(args, root)
    if getattr(args, "dry_run", False):
        args.apply = False
        args.fix = False
    else:
        args.apply = True
        args.fix = True
    artifacts = _skill_artifacts()
    fix_rules = artifacts["fix_rules"]
    if not fix_rules:
        err("no autofix rules in rules/ — use replace --fix for codemods")
        return 1
    if args.rule:
        rule = Path(args.rule)
        if not rule.is_file():
            candidate = skill_root() / "rules" / args.rule
            if candidate.is_file():
                args.rule = str(candidate)
        return cmd_scan(args)
    # Run each autofix rule sequentially
    exit_code = 0
    for name in fix_rules:
        trace(f"autofix rule: {name}")
        rule_args = argparse.Namespace(**{**vars(args), "rule": str(skill_root() / "rules" / name)})
        code = cmd_scan(rule_args)
        exit_code = max(exit_code, code)
    return exit_code


def cmd_rules(args: argparse.Namespace) -> int:
    artifacts = _skill_artifacts()
    fix_set = set(artifacts["fix_rules"])
    rows = []
    for name in artifacts["rules"]:
        rows.append({
            "id": Path(name).stem,
            "file": name,
            "autofix": name in fix_set,
        })
    if getattr(args, "json_out", False):
        json.dump(rows, sys.stdout, indent=2)
        print()
        return 0
    print(f"rules: {len(rows)} ({len(fix_set)} autofix)")
    for row in rows:
        tag = "autofix" if row["autofix"] else "report"
        print(f"  [{tag}] {row['id']}  ({row['file']})")
    return 0


def _audit_pool_script() -> Path:
    return skill_root() / "scripts" / "audit-pool.ts"


def _run_audit_pool(
    args: argparse.Namespace,
    targets: list[dict],
    root: Path,
    binary: Path,
    config_path: Optional[str],
) -> Optional[list[dict]]:
    pool_script = _audit_pool_script()
    if not pool_script.is_file():
        err("audit-pool.ts missing — cannot use --parallel")
        return None
    if not shutil.which("bun"):
        err("bun required for --parallel audit (Worker pool)")
        return None

    workers = int(getattr(args, "workers", None) or os.cpu_count() or 4)
    cmd = [
        "bun",
        str(pool_script),
        "--repo",
        str(root),
        "--binary",
        str(binary),
        "--workers",
        str(max(1, workers)),
    ]
    if config_path:
        cmd.extend(["--config", config_path])
    if getattr(args, "rule", None):
        cmd.extend(["--rule", str(args.rule)])
    if getattr(args, "profile", None):
        cmd.extend(["--profile", str(args.profile)])
    only = getattr(args, "only", None) or ""
    zone = getattr(args, "zone", None) or ""
    if only:
        cmd.extend(["--only", only])
    if zone:
        cmd.extend(["--zone", zone])
    for g in getattr(args, "globs", None) or []:
        cmd.extend(["--globs", g])

    trace(f"audit pool: {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=DEFAULT_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        err(f"parallel audit timed out after {DEFAULT_TIMEOUT_S}s")
        return None
    if proc.returncode != 0:
        err(proc.stderr.strip() or proc.stdout.strip() or "audit-pool failed")
        return None
    try:
        payload = json.loads(proc.stdout.strip())
    except json.JSONDecodeError:
        err("audit-pool returned invalid JSON")
        return None
    rows = payload.get("targets", [])
    trace(
        f"audit pool done: {len(rows)} targets in {payload.get('elapsed_ms', '?')}ms"
        f" ({payload.get('workers', '?')} workers)"
    )
    return rows


def _audit_render_target(
    tid: str,
    rel: str,
    matches: list[dict],
    *,
    verbose: bool,
    skipped: bool = False,
    scan_error: Optional[str] = None,
    worker_ms: Optional[int] = None,
) -> tuple[dict, int]:
    if skipped:
        print(f"## {tid}  SKIP (missing {rel})")
        print()
        return {"id": tid, "path": rel, "total": 0, "skipped": True}, 0
    if scan_error:
        print(f"## {tid}  ERROR ({scan_error})")
        print()
        return {"id": tid, "path": rel, "total": 0, "error": scan_error}, 0

    by_rule, by_file = _summarize_matches(matches)
    target_total = len(matches)
    target_report: dict = {
        "id": tid,
        "path": rel,
        "total": target_total,
        "by_rule": {
            rid: {"count": info["count"], "severity": info["severity"]}
            for rid, info in by_rule.items()
        },
        "top_files": [],
    }
    if worker_ms is not None:
        target_report["worker_ms"] = worker_ms

    suffix = f"  {worker_ms}ms" if worker_ms is not None else ""
    print(f"## {tid}  ({rel})  {target_total} finding(s){suffix}")
    if not by_rule:
        print("   (clean)")
    else:
        for rid, info in sorted(by_rule.items()):
            print(f"   {rid}: {info['count']} [{info['severity']}]")
            if verbose:
                ranked = sorted(info["files"].items(), key=lambda kv: -kv[1])[:8]
                for file_path, count in ranked:
                    print(f"      {file_path}: {count}")
    if verbose and by_file:
        print("   top files:")
        for file_path, info in sorted(by_file.items(), key=lambda kv: -kv[1]["count"])[:8]:
            rules = ", ".join(sorted(info["rules"]))
            print(f"      {file_path}: {info['count']} ({rules})")
            target_report["top_files"].append({
                "file": file_path,
                "count": info["count"],
                "rules": sorted(info["rules"]),
            })
    print()
    return target_report, target_total


def _audit_scan_args(args: argparse.Namespace, config_path: Optional[str], profile: Optional[dict]) -> list[str]:
    fmt = getattr(args, "format", None)
    if fmt in ("github", "sarif"):
        sg_args = ["scan", "--color", "never", f"--format={fmt}"]
    else:
        sg_args = ["scan", "--json=compact", "--include-metadata", "--color", "never"]
    if getattr(args, "rule", None):
        rule = Path(args.rule)
        if not rule.is_file():
            candidate = skill_root() / "rules" / args.rule
            if candidate.is_file():
                rule = candidate
        sg_args.extend(["-r", str(rule)])
    elif config_path:
        sg_args.extend(["-c", config_path])
    if profile and profile.get("rules"):
        sg_args.extend(["--filter", "|".join(profile["rules"])])
    return sg_args


def cmd_audit(args: argparse.Namespace) -> int:
    data = _load_repo_map()
    root = git_root() or Path.cwd()
    only = getattr(args, "only", None) or ""
    zone = getattr(args, "zone", None) or ""
    targets = data.get("targets", [])
    if only or zone:
        targets = _filter_repo_targets(targets, only=only, zone=zone)
    if not targets:
        err("no map targets matched filter")
        return 1

    profile_name = getattr(args, "profile", None)
    profile = _load_scan_profile(profile_name) if profile_name else None
    if profile_name and profile is None:
        return 1

    binary = require_binary()
    config = getattr(args, "config", None) or default_sgconfig()
    config_path = str(config) if config else None
    fmt = getattr(args, "format", None)
    verbose = bool(getattr(args, "verbose", False))
    report: dict = {
        "repo": str(root),
        "profile": profile_name,
        "total": 0,
        "targets": [],
    }
    total_violations = 0

    parallel = bool(getattr(args, "parallel", False))
    if parallel and not shutil.which("bun"):
        trace("bun not found — falling back to sequential audit")
        parallel = False
    if parallel and fmt in ("github", "sarif"):
        err("--parallel does not support --format github|sarif yet")
        return 1

    if fmt not in ("github", "sarif"):
        print(f"repo: {root}")
        print(f"targets: {len(targets)}")
        if config_path:
            print(f"config: {config_path}")
        if profile_name:
            print(f"profile: {profile_name} — {profile.get('description', '')}")
        if parallel:
            workers = int(getattr(args, "workers", None) or os.cpu_count() or 4)
            print(f"parallel: {max(1, workers)} workers (Bun Worker pool)")
        print()

    pool_rows: Optional[list[dict]] = None
    if parallel:
        pool_rows = _run_audit_pool(args, targets, root, binary, config_path)
        if pool_rows is None:
            return 1
        pool_by_id = {row.get("id"): row for row in pool_rows}

    for target in targets:
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        tid = target.get("id", rel)

        if parallel:
            row = pool_by_id.get(tid, {})
            if row.get("skipped"):
                target_report, target_total = _audit_render_target(
                    tid, rel, [], skipped=True, verbose=verbose,
                )
                report["targets"].append(target_report)
                continue
            if row.get("scan_error"):
                target_report, target_total = _audit_render_target(
                    tid, rel, [], scan_error=row.get("scan_error"), verbose=verbose,
                )
                report["targets"].append(target_report)
                continue
            matches = _filter_matches_by_profile(
                parse_compact_json(row.get("stdout", "")), profile,
            )
            target_report, target_total = _audit_render_target(
                tid, rel, matches,
                verbose=verbose,
                worker_ms=row.get("worker_ms"),
            )
            total_violations += target_total
            report["targets"].append(target_report)
            continue

        if not full.exists():
            if fmt not in ("github", "sarif"):
                print(f"## {tid}  SKIP (missing {rel})")
                print()
            continue

        sg_args = _audit_scan_args(args, config_path, profile)
        for g in target.get("globs", []):
            sg_args.extend(["--globs", g])
        for g in getattr(args, "globs", None) or []:
            sg_args.extend(["--globs", g])
        sg_args.append(str(full))

        proc = run_sg(binary, sg_args)
        if proc.returncode not in (0, 1):
            sys.stderr.write(proc.stderr or "")
            if fmt not in ("github", "sarif"):
                print(f"## {tid}  ERROR (scan failed)")
                print()
            continue

        if fmt in ("github", "sarif"):
            out = (proc.stdout or "").strip()
            if out:
                print(out)
            if proc.returncode == 1:
                total_violations += 1
            continue

        matches = _filter_matches_by_profile(parse_compact_json(proc.stdout), profile)
        target_report, target_total = _audit_render_target(
            tid, rel, matches, verbose=verbose,
        )
        total_violations += target_total
        report["targets"].append(target_report)

    if fmt in ("github", "sarif"):
        if getattr(args, "fail_on", False) and total_violations > 0:
            return 1
        return 0

    print(f"total: {total_violations} finding(s) across {len(targets)} target(s)")
    report["total"] = total_violations
    if getattr(args, "json_out", False):
        json.dump(report, sys.stdout, indent=2)
        print()

    if getattr(args, "fail_on", False) and total_violations > 0:
        return 1
    return 0


def cmd_codemods(args: argparse.Namespace) -> int:
    rows = _load_codemods()
    if getattr(args, "json_out", False):
        json.dump(rows, sys.stdout, indent=2)
        print()
        return 0
    if not rows:
        err("no codemods in codemods.json")
        return 1
    print(f"codemods: {len(rows)}")
    for row in rows:
        lang = row.get("lang") or "any"
        print(f"  {row['id']}  [{lang}]  {row.get('description', '')}")
    return 0


def cmd_codemod(args: argparse.Namespace) -> int:
    rows = _load_codemods()
    mod = next((c for c in rows if c.get("id") == args.name), None)
    if not mod:
        ids = ", ".join(c.get("id", "?") for c in rows) or "(none)"
        err(f"unknown codemod '{args.name}' — choose: {ids}")
        return 1
    root = git_root() or Path.cwd()
    replace_args = argparse.Namespace(
        pattern=mod["pattern"],
        rewrite=mod["rewrite"],
        paths=list(getattr(args, "paths", None) or []),
        path=list(getattr(args, "path", None) or []),
        only=getattr(args, "only", None),
        lang=mod.get("lang"),
        globs=getattr(args, "globs", None),
        apply=_wants_apply(args),
        fix=_wants_apply(args),
        force=False,
    )
    _expand_repo_map_only(replace_args, root)
    return cmd_replace(replace_args)


def cmd_install(_args: argparse.Namespace) -> int:
    """Delegate to install.sh in scripts/."""
    if os.name == "nt":
        installer = skill_root() / "scripts" / "install.ps1"
        cmd = ["pwsh", "-File", str(installer)]
    else:
        installer = skill_root() / "scripts" / "install.sh"
        cmd = ["bash", str(installer)]
    if not installer.is_file():
        err(f"installer not found: {installer}")
        return 1
    trace(f"running installer: {' '.join(cmd)}")
    return subprocess.run(cmd).returncode


def cmd_validate(args: argparse.Namespace) -> int:
    """Offline pattern validation. No sg call. Useful for CI / quick checks."""
    lang = normalize_lang(args.lang) if args.lang else None
    hints = validate_pattern(args.pattern, lang)
    if hints:
        for h in hints:
            print(f"hint: {h}")
        return 2
    print("pattern looks plausible for ast-grep.")
    return 0


# ---------- output formatting ----------

def parse_compact_json(text: str) -> list[dict]:
    """Parse `sg --json=compact` output. Salvages partial output when truncated."""
    if not text.strip():
        return []
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        return []
    except json.JSONDecodeError:
        # Try line-by-line salvage for truncated output.
        results = []
        for line in text.splitlines():
            line = line.strip().rstrip(",")
            if not line.startswith("{"):
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    results.append(obj)
            except json.JSONDecodeError:
                continue
        return results


def format_matches(matches: list[dict], *, show_replacement: bool = False) -> None:
    if not matches:
        print("(no matches)")
        return
    by_file: dict[str, list[dict]] = {}
    for m in matches:
        by_file.setdefault(m.get("file", "?"), []).append(m)
    for path, items in sorted(by_file.items()):
        print(f"{path} ({len(items)} match{'es' if len(items) != 1 else ''})")
        for m in items:
            r = m.get("range", {})
            start = r.get("start", {})
            line = start.get("line", "?")
            col = start.get("column", "?")
            text = (m.get("text") or "").splitlines()
            preview = text[0] if text else ""
            print(f"  {path}:{line}:{col}  {preview}")
            if show_replacement and "replacement" in m:
                rep = (m.get("replacement") or "").splitlines()
                rep_preview = rep[0] if rep else ""
                print(f"    -> {rep_preview}")


# ---------- argparse ----------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="ast-grep-helper",
        description="LLM-friendly wrapper around ast-grep (sg).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--version", action="version", version=f"ast-grep-helper {VERSION}")
    p.add_argument("--quiet", "-q", action="store_true", help="Suppress trace lines on stderr.")
    sub = p.add_subparsers(dest="cmd", required=True, metavar="COMMAND")

    o = sub.add_parser("outline", help="Map code structure (requires ast-grep 0.44+).")
    o.add_argument("paths", nargs="*", help="Paths (default: '.')")
    o.add_argument("--only", help="Expand paths from repo-map targets (substring id/name/zone/tag).")
    o.add_argument("--zone", help=f"Filter repo-map targets by zone ({_zone_hint()}).")
    o.add_argument("--view", choices=["auto", "names", "signatures", "digest", "expanded"], help="Outline view.")
    o.add_argument("--items", choices=["auto", "structure", "exports", "imports", "all"], help="Item filter.")
    o.add_argument("--match", help="Regex filter on symbol names/signatures.")
    o.add_argument("--types", action="append", help="Symbol types (repeatable): class, function, enum, ...")
    o.add_argument("--lang", "-l", help="Language override.")
    o.add_argument("--globs", action="append", help="Include/exclude glob.")
    o.add_argument("--bun-rules", action="store_true", help="Load outline-rules/bun-monorepo.yml extractors.")
    o.add_argument("--outline-rules", help="Custom outline-rules YAML (path under skill or absolute).")
    o.add_argument("--pub-members", action="store_true", help="Show only public members in member views.")
    o.add_argument("--json-out", action="store_true", help="Emit outline JSON (no truncation).")
    o.add_argument("--json-style", choices=["compact", "pretty", "stream"], default="compact", help="With --json-out.")
    o.set_defaults(func=cmd_outline)

    m = sub.add_parser("map", help="Outline monorepo targets from repo-map.json.")
    m.add_argument("--only", help="Filter targets by id/name/zone/tag substring.")
    m.add_argument("--zone", help=f"Filter targets by zone ({_zone_hint()}).")
    m.add_argument("--list", dest="list_only", action="store_true", help="Inventory only — no outline run.")
    m.add_argument("--compact", action="store_true", help="Symbol counts per target (JSON outline under the hood).")
    m.add_argument("--heatmap", action="store_true", help="ASCII bar chart of symbol counts per target.")
    m.add_argument("--json-out", action="store_true", help="Structured map report with outline summaries.")
    m.add_argument("--no-outline", dest="no_outline", action="store_true", help="Alias for --list.")
    m.add_argument("--view", choices=["auto", "names", "signatures", "digest", "expanded"], help="Override all target views.")
    m.add_argument("--items", choices=["auto", "structure", "exports", "imports", "all"], help="Override items filter.")
    m.add_argument("--match", help="Regex filter passed to outline.")
    m.add_argument("--types", action="append", help="Symbol type filter for outline.")
    m.add_argument("--bun-rules", action="store_true", help="Force bun-monorepo outline rules on all targets.")
    m.add_argument("--outline-rules", help="Custom outline-rules YAML for all targets.")
    m.set_defaults(func=cmd_map)

    z = sub.add_parser("zones", help="List repo-map zones and targets.")
    z.add_argument("--stats", action="store_true", help="Include symbol counts (uses outline index cache).")
    z.add_argument("--discover", action="store_true", help="Find unmapped monorepo candidates (alias: discover).")
    z.add_argument("--zone", help=f"Filter by zone ({_zone_hint()}).")
    z.add_argument("--fail-on", action="store_true", help="With --discover: exit 1 when unmapped candidates exist.")
    z.add_argument("--json-out", action="store_true", help="Emit JSON.")
    z.set_defaults(func=cmd_zones)

    dc = sub.add_parser("discover", help="Scan monorepo for repo-map gaps (zone-discovery.json probes).")
    dc.add_argument("--zone", help=f"Filter candidates by zone ({_zone_hint()}).")
    dc.add_argument("--fail-on", action="store_true", help="Exit 1 when unmapped candidates exist.")
    dc.add_argument("--json-out", action="store_true", help="Emit JSON.")
    dc.set_defaults(func=cmd_discover)

    ix = sub.add_parser("index", help="Cross-target symbol index from repo-map outlines.")
    ix.add_argument("--name", help="Filter symbols by name substring.")
    ix.add_argument("--type", dest="symbol_type", help="Filter by symbol type (function, class, ...).")
    ix.add_argument("--exports", dest="exports_only", action="store_true", help="Exported symbols only.")
    ix.add_argument("--only", help="Filter repo-map targets.")
    ix.add_argument("--zone", help="Filter by zone.")
    ix.add_argument("--refresh", action="store_true", help="Rebuild .outline-index.json cache.")
    ix.add_argument("--status", action="store_true", help="Show cache age and stale targets.")
    ix.add_argument("--fail-on", action="store_true", help="With --status: exit 1 when cache is stale.")
    ix.add_argument("--json-out", action="store_true", help="Emit JSON.")
    ix.set_defaults(func=cmd_index)

    an = sub.add_parser("anchors", help="Validate repo-map anchor symbols against index.")
    an.add_argument("--only", help="Filter repo-map targets.")
    an.add_argument("--zone", help="Filter by zone.")
    an.add_argument("--fail-on", action="store_true", help="Exit 1 when anchors missing.")
    an.add_argument("--json-out", action="store_true", help="Emit JSON.")
    an.set_defaults(func=cmd_anchors)

    ex = sub.add_parser("exports", help="Exported symbol surface across repo-map targets.")
    ex.add_argument("--only", help="Filter repo-map targets.")
    ex.add_argument("--zone", help="Filter by zone.")
    ex.add_argument("--json-out", action="store_true", help="Emit JSON.")
    ex.set_defaults(func=cmd_exports)

    co = sub.add_parser("collisions", help="Symbol names duplicated across multiple targets.")
    co.add_argument("--only", help="Filter repo-map targets.")
    co.add_argument("--zone", help="Filter by zone.")
    co.add_argument("--min-targets", type=int, default=2, help="Minimum targets for a collision (default 2).")
    co.add_argument("--json-out", action="store_true", help="Emit JSON.")
    co.set_defaults(func=cmd_collisions)

    gr = sub.add_parser("graph", help="Import/depends_on edges between repo-map targets.")
    gr.add_argument("--only", help="Filter repo-map targets.")
    gr.add_argument("--zone", help="Filter by zone.")
    gr.add_argument("--json-out", action="store_true", help="Emit JSON.")
    gr.set_defaults(func=cmd_graph)

    jp = sub.add_parser("jump", help="Resolve symbol name to file:line for agent Read.")
    jp.add_argument("--name", required=True, help="Symbol name (substring match).")
    jp.add_argument("--type", dest="symbol_type", help="Filter by symbol type.")
    jp.add_argument("--exports", dest="exports_only", action="store_true", help="Exported symbols only.")
    jp.add_argument("--zone", help="Filter by zone.")
    jp.add_argument("--json-out", action="store_true", help="Emit JSON.")
    jp.set_defaults(func=cmd_jump)

    nv = sub.add_parser("nav", help="Guided read order for a repo-map zone.")
    nv.add_argument("--zone", required=True, help=f"Zone id ({_zone_hint()}).")
    nv.add_argument("--digest", action="store_true", help="Inline outline preview per step.")
    nv.set_defaults(func=cmd_nav)

    f = sub.add_parser("files", help="List files with at least one pattern match.")
    f.add_argument("pattern", help="AST pattern.")
    f.add_argument("--path", "-p", action="append", dest="path", help="Path (repeatable).")
    f.add_argument("paths", nargs="*", help=argparse.SUPPRESS)
    f.add_argument("--lang", "-l", help="Language.")
    f.add_argument("--globs", action="append", help="Include/exclude glob.")
    f.add_argument("--force", action="store_true", help="Skip pattern hint validation.")
    f.set_defaults(func=cmd_files, paths=[])

    s = sub.add_parser("search", help="Search code by AST pattern.")
    s.add_argument("pattern", help="AST pattern, e.g. 'console.log($MSG)'")
    s.add_argument("paths", nargs="*", help="Paths (before flags, or use --path). Default: '.'")
    s.add_argument("--path", "-p", action="append", dest="path", help="Path to search (repeatable).")
    s.add_argument("--lang", "-l", help="Language (e.g. ts, py, go, rust). See: langs subcommand.")
    s.add_argument("--globs", action="append", help="Include/exclude glob (repeat; prefix '!' to exclude).")
    s.add_argument("--context", "-C", type=int, help="Lines of context around each match.")
    s.add_argument("--json-out", action="store_true", help="Emit raw JSON instead of human format.")
    s.add_argument("--force", action="store_true", help="Skip pattern hint validation.")
    s.set_defaults(func=cmd_search)

    r = sub.add_parser("replace", help="Rewrite code by AST pattern (dry-run by default).")
    r.add_argument("pattern", help="AST pattern.")
    r.add_argument("rewrite", help="Replacement pattern (can reuse $VAR from pattern).")
    r.add_argument("paths", nargs="*", help="Paths (before flags, or use --path). Default: '.'")
    r.add_argument("--path", "-p", action="append", dest="path", help="Path to rewrite (repeatable).")
    r.add_argument("--lang", "-l", help="Language.")
    r.add_argument("--globs", action="append", help="Include/exclude glob.")
    r.add_argument("--apply", action="store_true", help="Mutate files (default: dry-run preview).")
    r.add_argument("--fix", action="store_true", help="Alias for --apply.")
    r.add_argument("--force", action="store_true", help="Skip pattern hint validation.")
    r.set_defaults(func=cmd_replace)

    sc = sub.add_parser("scan", help="Run YAML-rule-based scan.")
    sc.add_argument("paths", nargs="*", help="Paths (before flags, or use --path).")
    sc.add_argument("--path", "-p", action="append", dest="path", help="Path to scan (repeatable).")
    sc.add_argument("--config", "-c", help="Path to sgconfig.yml (defaults to skill sgconfig.yml).")
    sc.add_argument("--rule", "-r", help="Single rule file.")
    sc.add_argument("--inline-rules", help="Inline YAML rule string.")
    sc.add_argument("--report-style", choices=["rich", "medium", "short"], help="Report style.")
    sc.add_argument("--apply", "-U", action="store_true", help="Apply rule fixes (rules with fix: field).")
    sc.add_argument("--fix", action="store_true", help="Alias for --apply.")
    sc.set_defaults(func=cmd_scan)

    fx = sub.add_parser("fix", help="Apply bundled autofix rules (rules with fix: field).")
    fx.add_argument("paths", nargs="*", help=argparse.SUPPRESS)
    fx.add_argument("--path", "-p", action="append", dest="path", help="Path (repeatable).")
    fx.add_argument("--rule", "-r", help="Single autofix rule (default: all fix rules).")
    fx.add_argument("--globs", action="append", help="Include/exclude glob.")
    fx.add_argument("--dry-run", action="store_true", help="Preview violations only (no --fix).")
    fx.add_argument("--only", help="Expand paths from repo-map targets (when no --path).")
    fx.set_defaults(func=cmd_fix, paths=[])

    rl = sub.add_parser("rules", help="List bundled scan rules and autofix status.")
    rl.add_argument("--json-out", action="store_true", help="Emit JSON.")
    rl.set_defaults(func=cmd_rules)

    au = sub.add_parser("audit", help="Scan repo-map targets and summarize rule violations.")
    au.add_argument("--only", help="Filter targets by id/name/zone/tag substring.")
    au.add_argument("--zone", help="Filter targets by zone (sports-terminal, kimi, agents).")
    au.add_argument("--config", "-c", help="Path to sgconfig.yml (default: skill sgconfig.yml).")
    au.add_argument("--rule", "-r", help="Single rule file instead of full config.")
    au.add_argument("--globs", action="append", help="Extra include/exclude glob.")
    au.add_argument("--json-out", action="store_true", help="Emit JSON findings summary.")
    au.add_argument("--fail-on", action="store_true", help="Exit 1 when any violations found.")
    au.add_argument("--profile", help="Filter rules via scan-profiles.json (ci, autofix, strict).")
    au.add_argument("--verbose", "-v", action="store_true", help="Per-file violation breakdown.")
    au.add_argument("--format", choices=["github", "sarif"], help="CI output format (ignores summary table).")
    au.add_argument("--parallel", action="store_true", help="Scan targets in parallel via Bun Workers (requires bun).")
    au.add_argument("--workers", type=int, default=0, help="Worker count for --parallel (default: CPU count).")
    au.set_defaults(func=cmd_audit)

    cm = sub.add_parser("codemods", help="List named codemods from codemods.json.")
    cm.add_argument("--json-out", action="store_true", help="Emit JSON.")
    cm.set_defaults(func=cmd_codemods)

    cd = sub.add_parser("codemod", help="Run a named codemod (dry-run by default).")
    cd.add_argument("name", help="Codemod id from codemods.json.")
    cd.add_argument("paths", nargs="*", help=argparse.SUPPRESS)
    cd.add_argument("--path", "-p", action="append", dest="path", help="Path (repeatable).")
    cd.add_argument("--only", help="Expand paths from repo-map targets (when no --path).")
    cd.add_argument("--globs", action="append", help="Include/exclude glob.")
    cd.add_argument("--apply", action="store_true", help="Mutate files.")
    cd.add_argument("--fix", action="store_true", help="Alias for --apply.")
    cd.set_defaults(func=cmd_codemod, paths=[])

    t = sub.add_parser("test", help="Run ast-grep rule snapshot tests.")
    t.add_argument("--config", "-c", help="Path to sgconfig.yml.")
    t.add_argument("--test-dir", "-t", help="Test directory.")
    t.add_argument("--update", "-U", action="store_true", help="Update snapshots.")
    t.set_defaults(func=cmd_test)

    n = sub.add_parser("new", help="Scaffold a new project / rule / test / util.")
    n.add_argument("what", choices=["project", "rule", "test", "util"], help="What to create.")
    n.add_argument("name", nargs="?", help="Name of the artifact.")
    n.add_argument("--lang", "-l", help="Language.")
    n.add_argument("--yes", "-y", action="store_true", help="Accept defaults.")
    n.set_defaults(func=cmd_new)

    sub.add_parser("langs", help="List supported languages.").set_defaults(func=cmd_langs)
    d = sub.add_parser("doctor", help="Health check for binary, outline, skill bundle.")
    d.add_argument("--fix", action="store_true", help="Install skill pin if binary/outline missing.")
    d.add_argument("--global-fix", action="store_true", help="Hint npm global install when --fix is set.")
    d.add_argument(
        "--validate-snapshot",
        metavar="FILE",
        help="Validate snapshotVersion against policies/security.policy.toml [snapshot].",
    )
    d.set_defaults(func=cmd_doctor)
    sub.add_parser("install", help="Run the install script for this OS.").set_defaults(func=cmd_install)

    v = sub.add_parser("validate", help="Validate a pattern offline (pattern hint check only).")
    v.add_argument("pattern", help="AST pattern.")
    v.add_argument("--lang", "-l", help="Language for language-specific hints.")
    v.set_defaults(func=cmd_validate)

    bun = sub.add_parser("bun", help="Bun native API patterns, matrix, and inventory.")
    bun_sub = bun.add_subparsers(dest="bun_cmd", required=True, metavar="BUN_CMD")

    def _add_bun_filters(p: argparse.ArgumentParser) -> None:
        p.add_argument("--only", help="Filter repo-map targets.")
        p.add_argument("--zone", help="Filter by zone.")
        p.add_argument("--bundle", help="Filter patterns via bundles (server-boot, cli, core, hygiene, ...).")
        p.add_argument("--group", "--category", dest="group", help="Filter patterns by group (http, io, db, ...).")
        p.add_argument("--tier", choices=["core", "extended", "migrate"], help="Filter by pattern tier.")
        p.add_argument("--core-only", action="store_true", help="Shorthand for --tier core.")
        p.add_argument("--refresh", action="store_true", help="Rebuild .bun-inventory-cache.json.")

    bun_b = bun_sub.add_parser("bundles", help="List named pattern bundles.")
    bun_b.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_b.set_defaults(func=cmd_bun_bundles)

    bun_p = bun_sub.add_parser("patterns", help="List bun-patterns.json catalog.")
    _add_bun_filters(bun_p)
    bun_p.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_p.set_defaults(func=cmd_bun_patterns)

    bun_i = bun_sub.add_parser("inventory", help="Count Bun API usage across bun_rules targets.")
    _add_bun_filters(bun_i)
    bun_i.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_i.set_defaults(func=cmd_bun_inventory)

    bun_m = bun_sub.add_parser("matrix", help="Group x target usage grid.")
    _add_bun_filters(bun_m)
    bun_m.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_m.set_defaults(func=cmd_bun_matrix)

    bun_h = bun_sub.add_parser("heatmap", help="ASCII bar chart of Bun pattern counts.")
    _add_bun_filters(bun_h)
    bun_h.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_h.set_defaults(func=cmd_bun_heatmap)

    bun_sc = bun_sub.add_parser("score", help="Bun adoption score per target (native vs anti-pattern).")
    _add_bun_filters(bun_sc)
    bun_sc.add_argument("--min-score", type=float, default=0, help="Exit 1 if any target scores below this.")
    bun_sc.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_sc.set_defaults(func=cmd_bun_score)

    bun_mg = bun_sub.add_parser("migrate", help="Anti-pattern files with migrate_to suggestions.")
    _add_bun_filters(bun_mg)
    bun_mg.add_argument("--fail-on", action="store_true", help="Exit 1 when migrations needed.")
    bun_mg.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_mg.set_defaults(func=cmd_bun_migrate)

    bun_rp = bun_sub.add_parser("report", help="Unified Bun report: scores, groups, migrations, top APIs.")
    _add_bun_filters(bun_rp)
    bun_rp.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_rp.set_defaults(func=cmd_bun_report)

    bun_s = bun_sub.add_parser("search", help="Run a cataloged Bun pattern by id.")
    bun_s.add_argument("pattern_id", help="Pattern id from bun patterns (e.g. bun-serve).")
    bun_s.add_argument("--path", "-p", action="append", dest="path", help="Path override.")
    _add_bun_filters(bun_s)
    bun_s.add_argument("--globs", action="append", help="Include/exclude glob.")
    bun_s.add_argument("--context", "-C", type=int, help="Lines of context.")
    bun_s.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_s.set_defaults(func=cmd_bun_search)

    bun_d = bun_sub.add_parser("docs", help="Official Bun API topic coverage (bun.sh/docs/runtime/bun-apis).")
    bun_d.add_argument("--topic", help="Filter by topic id or name (http-server, PostgreSQL, ...).")
    bun_d.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_d.set_defaults(func=cmd_bun_docs)

    bun_r = bun_sub.add_parser("roadmap", help="Security integration backlog (catalog vs doctor/scan wiring).")
    bun_r.add_argument("--priority", choices=["high", "medium", "low", "nice"], help="Filter by priority tier.")
    bun_r.add_argument("--integration", choices=["catalog", "planned", "integrated"], help="Filter by integration state.")
    bun_r.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_r.set_defaults(func=cmd_bun_roadmap)

    bun_f = bun_sub.add_parser("features", help="Bun release highlights (default: v1.3.13 test CLI + runtime).")
    bun_f.add_argument("--release", help="Release key from bun-releases.json (default: 1.3.13).")
    bun_f.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_f.set_defaults(func=cmd_bun_features)

    bun_tc = bun_sub.add_parser("test-ci", help="Run bun test with bun-test-profiles.json (v1.3.13+ flags).")
    bun_tc.add_argument("--profile", default="ci", help="Profile: local, ci, fast, ci-shard, changed, ...")
    bun_tc.add_argument("--path", dest="test_path", default=".", help="Test path (default: repo root).")
    bun_tc.add_argument("--shard", help="Shard M/N for matrix jobs (or BUN_TEST_SHARD env).")
    bun_tc.add_argument("--changed", nargs="?", const="1", help="Pass --changed or --changed=REF.")
    bun_tc.add_argument("--dry-run", action="store_true", help="Print command without running.")
    bun_tc.add_argument("--json-out", action="store_true", help="Emit JSON result.")
    bun_tc.set_defaults(func=cmd_bun_test_ci)

    bun_id = bun_sub.add_parser("install-docs", help="Bun install: git/github/tarball deps, linker, bunfig, age gate.")
    bun_id.add_argument(
        "--topic",
        choices=["sources", "linker", "security", "bunfig", "env", "profiles", "platform", "lockfile", "backends", "pnpm", "peers", "cache", "cli"],
        help="Filter section.",
    )
    bun_id.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_id.set_defaults(func=cmd_bun_install_docs)

    bun_is = bun_sub.add_parser("install-scan", help="Scan package.json for non-npm dependency specs.")
    bun_is.add_argument("--path", "-p", dest="scan_path", default=".", help="Directory or package.json to scan.")
    bun_is.add_argument("--fail-on", action="store_true", help="Exit 1 when non-npm deps found.")
    bun_is.add_argument("--json-out", action="store_true", help="Emit JSON.")
    bun_is.set_defaults(func=cmd_bun_install_scan)

    bun_ic = bun_sub.add_parser("install-ci", help="Run bun install with bun-install-profiles.json.")
    bun_ic.add_argument("--profile", default="ci-isolated", help="Profile: hoisted, isolated, ci, cross-linux-x64, ...")
    bun_ic.add_argument("--cpu", help="Override --cpu= (or BUN_INSTALL_CPU).")
    bun_ic.add_argument("--os-target", dest="os_target", help="Override --os= (or BUN_INSTALL_OS).")
    bun_ic.add_argument("--dry-run", action="store_true", help="Print command without running.")
    bun_ic.set_defaults(func=cmd_bun_install_ci)

    def _add_supply_chain_scan_args(parser: argparse.ArgumentParser, *, default_profile: str) -> None:
        parser.add_argument("--profile", default=default_profile, help="bundle-threat-profiles.json key")
        parser.add_argument("--only", help="Filter repo-map targets (substring).")
        parser.add_argument("--zone", help=f"Filter repo-map zone ({_zone_hint()}).")
        parser.add_argument("--path", "-p", dest="scan_path", help="Scan explicit path instead of repo-map.")
        parser.add_argument("--format", choices=["json", "html", "markdown"], default="json", help="Report format.")
        parser.add_argument("--parallel", action="store_true", help="Worker pool per-file scan.")
        parser.add_argument("--workers", type=int, help="Parallel workers (default: CPU count).")
        parser.add_argument("--rules", help="Comma-separated rule ids from security.policy.toml.")
        parser.add_argument("--integrity-manifest", help="JSON manifest path for sha256 tamper check.")
        parser.add_argument("--threat-feed", action="store_true", help="Correlate bun.lock deps with threat-feed.json (Bun.semver).")
        parser.add_argument("--no-threat-feed", action="store_true", help="Disable threat-feed even when profile enables it.")
        parser.add_argument("--dry-run", action="store_true", help="List targets without scanning.")
        parser.add_argument("--verbose", "-v", action="store_true", help="Show per-finding details.")
        parser.add_argument("--fail-on", action="store_true", help="Exit 1 when error-level findings exist.")
        parser.add_argument("--json-out", action="store_true", help="Emit JSON (default for scan).")
        parser.add_argument("--watch", action="store_true", help="Re-scan on file changes (Ctrl+C to stop).")
        parser.add_argument("--watch-interval", dest="watch_interval", type=int, help="Watch poll ms (default 750).")
        parser.add_argument("--fix", action="store_true", help="Autofix source rules + bun add package upgrades.")
        parser.add_argument("--dry-run-fix", action="store_true", help="Preview autofix without writing files.")

    bun_bt = bun_sub.add_parser(
        "bundle-threat",
        help="Alias: Layer 4.5 supply-chain scan via Bun.Transpiler.",
    )
    _add_supply_chain_scan_args(bun_bt, default_profile="default")
    bun_bt.set_defaults(func=cmd_bun_bundle_threat)

    bun_sc = bun_sub.add_parser(
        "supply-chain",
        help="Layer 4.5 supply-chain security — transpiler scan, policies, integrity.",
    )
    sc_sub = bun_sc.add_subparsers(dest="supply_action", metavar="ACTION", required=True)
    sc_scan = sc_sub.add_parser("scan", help="Run bundle scanner (Bun.Transpiler + TOML rules).")
    _add_supply_chain_scan_args(sc_scan, default_profile="supply-chain-ci")
    sc_scan.set_defaults(func=cmd_bun_supply_chain)
    sc_layers = sc_sub.add_parser("layers", help="Show security layer stack (4 / 4.5 / 5).")
    sc_layers.add_argument("--json-out", action="store_true", help="Emit JSON.")
    sc_layers.set_defaults(func=cmd_bun_supply_chain, supply_action="layers")
    sc_rules = sc_sub.add_parser("rules", help="List policy file locations.")
    sc_rules.set_defaults(func=cmd_bun_supply_chain, supply_action="rules")
    sc_adv = sc_sub.add_parser("advisories", help="List CVE advisories from threat-feed.json.")
    sc_adv.add_argument("--json-out", action="store_true", help="Emit JSON.")
    sc_adv.set_defaults(func=cmd_bun_supply_chain, supply_action="advisories")
    sc_sem = sc_sub.add_parser(
        "semver",
        help="Probe Bun.semver.satisfies(version, range) — node-semver compatible.",
    )
    sc_sem.add_argument("--version", dest="semver_version", required=True, help="Installed or candidate version.")
    sc_sem.add_argument("--range", dest="semver_range", required=True, help="Advisory range (e.g. '<1.6.0', '^1.0.0').")
    sc_sem.add_argument("--json-out", action="store_true", help="Emit JSON.")
    sc_sem.set_defaults(func=cmd_bun_supply_chain, supply_action="semver")
    sc_pkg = sc_sub.add_parser(
        "packages",
        help="Layer 5 — check package versions against policy [[semver_rule]] (bun sp scan packages alias).",
    )
    sc_pkg.add_argument("--domain", help="repo-map target id (e.g. agents-ast-grep).")
    sc_pkg.add_argument("--path", "-p", dest="scan_path", help="Explicit path instead of domain.")
    sc_pkg.add_argument("--json-out", action="store_true", help="Emit JSON.")
    sc_pkg.add_argument("--fail-on", action="store_true", help="Exit 1 when violations exist.")
    sc_pkg.add_argument("--threat-feed", action="store_true", help="Include threat-feed.json matches (default on).")
    sc_pkg.add_argument("--no-threat-feed", action="store_true", help="Disable threat-feed correlation.")
    sc_pkg.add_argument("--fix", action="store_true", help="Apply bun add upgrades for suggested versions.")
    sc_pkg.add_argument("--dry-run", action="store_true", help="With --fix: print commands only.")
    sc_pkg.add_argument("--watch", action="store_true", help="Re-scan package.json/bun.lock on changes.")
    sc_pkg.add_argument("--watch-interval", dest="watch_interval", type=int, help="Watch poll ms (default 750).")
    sc_pkg.set_defaults(func=cmd_bun_supply_chain, supply_action="packages")

    return p


def main(argv: Optional[list[str]] = None) -> int:
    global _QUIET
    parser = build_parser()
    args = parser.parse_args(argv)
    _QUIET = bool(getattr(args, "quiet", False))
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
