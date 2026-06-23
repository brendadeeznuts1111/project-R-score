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
    ast_grep_helper.py map [--only SUBSTR]              # monorepo repo-map.json targets
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
from pathlib import Path
from typing import Optional

VERSION = "0.7.0"
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
    print(f"scan-profiles.json: {'ok' if artifacts['scan_profiles'] else 'missing'}")
    print(f"codemods.json: {'ok' if artifacts['codemods'] else 'missing'}")
    print(f"outline-rules: {'ok' if artifacts['outline_rules'] else 'missing'}")
    print(f"mcp server: {'ok' if artifacts['mcp'] else 'missing'}")
    print(f"scan rules: {len(artifacts['rules'])} ({', '.join(artifacts['rules']) or 'none'})")
    fix_rules = artifacts["fix_rules"]
    print(f"autofix rules: {len(fix_rules)} ({', '.join(fix_rules) or 'none — use replace --fix for codemods'})")

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

    if fmt not in ("github", "sarif"):
        print(f"repo: {root}")
        print(f"targets: {len(targets)}")
        if config_path:
            print(f"config: {config_path}")
        if profile_name:
            print(f"profile: {profile_name} — {profile.get('description', '')}")
        print()

    for target in targets:
        rel = target.get("path", ".")
        full = (root / rel).resolve()
        tid = target.get("id", rel)
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
        by_rule, by_file = _summarize_matches(matches)
        target_total = len(matches)
        total_violations += target_total

        target_report = {
            "id": tid,
            "path": rel,
            "total": target_total,
            "by_rule": {
                rid: {"count": info["count"], "severity": info["severity"]}
                for rid, info in by_rule.items()
            },
            "top_files": [],
        }

        print(f"## {tid}  ({rel})  {target_total} finding(s)")
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
        report["targets"].append(target_report)
        print()

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
    o.add_argument("--zone", help="Filter repo-map targets by zone (sports-terminal, kimi, agents).")
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
    m.add_argument("--zone", help="Filter targets by zone (sports-terminal, kimi, agents).")
    m.add_argument("--list", dest="list_only", action="store_true", help="Inventory only — no outline run.")
    m.add_argument("--compact", action="store_true", help="Symbol counts per target (JSON outline under the hood).")
    m.add_argument("--json-out", action="store_true", help="Structured map report with outline summaries.")
    m.add_argument("--no-outline", dest="no_outline", action="store_true", help="Alias for --list.")
    m.add_argument("--view", choices=["auto", "names", "signatures", "digest", "expanded"], help="Override all target views.")
    m.add_argument("--items", choices=["auto", "structure", "exports", "imports", "all"], help="Override items filter.")
    m.add_argument("--match", help="Regex filter passed to outline.")
    m.add_argument("--types", action="append", help="Symbol type filter for outline.")
    m.add_argument("--bun-rules", action="store_true", help="Force bun-monorepo outline rules on all targets.")
    m.add_argument("--outline-rules", help="Custom outline-rules YAML for all targets.")
    m.set_defaults(func=cmd_map)

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
    d.set_defaults(func=cmd_doctor)
    sub.add_parser("install", help="Run the install script for this OS.").set_defaults(func=cmd_install)

    v = sub.add_parser("validate", help="Validate a pattern offline (pattern hint check only).")
    v.add_argument("pattern", help="AST pattern.")
    v.add_argument("--lang", "-l", help="Language for language-specific hints.")
    v.set_defaults(func=cmd_validate)

    return p


def main(argv: Optional[list[str]] = None) -> int:
    global _QUIET
    parser = build_parser()
    args = parser.parse_args(argv)
    _QUIET = bool(getattr(args, "quiet", False))
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
