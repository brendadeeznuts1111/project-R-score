#!/usr/bin/env bun
// [DUOPLUS][CLI][TS][META:{tty,ansi,hyperlink}][UTILITY][#REF:TTY-LINK-41][BUN:4.1]

/**
 * Terminal Hyperlink Utility for Bun TTY
 *
 * Uses OSC 8 ANSI escape codes to create clickable links in terminal.
 * Works in iTerm2, Hyper, VTE-based terminals (GNOME Terminal, Tilix),
 * Windows Terminal, and most modern terminal emulators.
 *
 * @see https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
 */

const OSC = '\x1b]';  // Operating System Command
const ST = '\x07';    // String Terminator (BEL)
const OSC_8 = `${OSC}8;;`; // Hyperlink escape sequence

/**
 * Check if terminal supports hyperlinks
 */
export function supportsHyperlinks(): boolean {
  // Check if we're in a TTY
  if (!process.stdout.isTTY) return false;

  // Check for known supporting terminals
  const term = process.env.TERM_PROGRAM || '';
  const termProgram = process.env.TERM || '';
  const wtSession = process.env.WT_SESSION;  // Windows Terminal

  const supportedTerminals = [
    'iTerm.app',
    'Hyper',
    'vscode',
    'Apple_Terminal',
    'WezTerm',
    'Alacritty',
  ];

  if (supportedTerminals.includes(term)) return true;
  if (wtSession) return true; // Windows Terminal
  if (termProgram.includes('xterm') || termProgram.includes('256color')) return true;

  // Default to true for modern terminals, they usually support OSC 8
  return true;
}

/**
 * Create a clickable hyperlink for terminal output
 *
 * @param text - Display text for the link
 * @param url - URL or file path to link to
 * @returns Formatted string with ANSI hyperlink codes (or plain text if unsupported)
 */
export function hyperlink(text: string, url: string): string {
  if (!supportsHyperlinks()) {
    return text;
  }

  return `${OSC_8}${url}${ST}${text}${OSC_8}${ST}`;
}

/**
 * Create a clickable file path link
 * Converts relative paths to absolute file:// URLs
 *
 * @param filePath - File path (relative or absolute)
 * @param displayText - Optional custom display text (defaults to filePath)
 * @returns Formatted string with clickable file link
 */
export function fileLink(filePath: string, displayText?: string): string {
  const absolutePath = filePath.startsWith('/')
    ? filePath
    : `${process.cwd()}/${filePath}`;

  const fileUrl = `file://${absolutePath}`;
  return hyperlink(displayText || filePath, fileUrl);
}

/**
 * Create a clickable file path with line number
 * Opens the file at the specified line in supported editors
 *
 * @param filePath - File path (relative or absolute)
 * @param line - Line number
 * @param displayText - Optional custom display text
 * @returns Formatted string with clickable file:line link
 */
export function fileLinkWithLine(filePath: string, line: number, displayText?: string): string {
  const absolutePath = filePath.startsWith('/')
    ? filePath
    : `${process.cwd()}/${filePath}`;

  // Use vscode:// protocol for VS Code integration
  // Falls back to file:// for other editors
  const vscodeUrl = `vscode://file${absolutePath}:${line}`;
  const display = displayText || `${filePath}:${line}`;

  return hyperlink(display, vscodeUrl);
}

/**
 * Create a clickable URL link
 *
 * @param url - Full URL (https://, http://, etc.)
 * @param displayText - Optional custom display text (defaults to URL)
 * @returns Formatted string with clickable URL
 */
export function urlLink(url: string, displayText?: string): string {
  return hyperlink(displayText || url, url);
}

/**
 * Create a clickable GitHub issue/PR link
 *
 * @param repo - Repository in format "owner/repo"
 * @param number - Issue or PR number
 * @param type - "issues" or "pull"
 * @returns Formatted string with clickable GitHub link
 */
export function githubLink(repo: string, number: number, type: 'issues' | 'pull' = 'issues'): string {
  const url = `https://github.com/${repo}/${type}/${number}`;
  const displayText = `#${number}`;
  return hyperlink(displayText, url);
}

/**
 * Create a clickable npm package link
 *
 * @param packageName - npm package name
 * @returns Formatted string with clickable npm link
 */
export function npmLink(packageName: string): string {
  const url = `https://www.npmjs.com/package/${packageName}`;
  return hyperlink(packageName, url);
}

/**
 * Format a commit SHA as a clickable link (if repo URL is provided)
 *
 * @param sha - Git commit SHA
 * @param repoUrl - Optional repository URL
 * @returns Formatted string with clickable commit link
 */
export function commitLink(sha: string, repoUrl?: string): string {
  const shortSha = sha.slice(0, 8);

  if (!repoUrl) {
    return shortSha;
  }

  // Normalize repo URL
  const baseUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
  const commitUrl = `${baseUrl}/commit/${sha}`;

  return hyperlink(shortSha, commitUrl);
}

// CLI demo
async function main() {
  console.log('🔗 Terminal Hyperlink Demo');
  console.log('═'.repeat(50));
  console.log();

  console.log('📁 File Links:');
  console.log(`   ${fileLink('./scripts/tty-hyperlink.ts')}`);
  console.log(`   ${fileLinkWithLine('./scripts/ai-tagger.ts', 50, 'ai-tagger.ts:50 (AITagger class)')}`);
  console.log();

  console.log('🌐 URL Links:');
  console.log(`   ${urlLink('https://bun.sh', 'Bun Documentation')}`);
  console.log(`   ${urlLink('https://github.com/oven-sh/bun')}`);
  console.log();

  console.log('📦 npm Links:');
  console.log(`   ${npmLink('commander')}`);
  console.log(`   ${npmLink('zod')}`);
  console.log();

  console.log('🐙 GitHub Links:');
  console.log(`   Issue: ${githubLink('duoplus/factorywager-cli', 42)}`);
  console.log(`   PR: ${githubLink('duoplus/factorywager-cli', 123, 'pull')}`);
  console.log();

  console.log('🔑 Commit Links:');
  console.log(`   ${commitLink('abc123def456', 'https://github.com/duoplus/factorywager-cli')}`);
  console.log();

  console.log('═'.repeat(50));
  console.log(`✅ Hyperlinks supported: ${supportsHyperlinks() ? 'Yes' : 'No'}`);
  console.log(`   Terminal: ${process.env.TERM_PROGRAM || process.env.TERM || 'unknown'}`);
}

if (import.meta.main) {
  main().catch(console.error);
}

export default { hyperlink, fileLink, fileLinkWithLine, urlLink, githubLink, npmLink, commitLink, supportsHyperlinks };
