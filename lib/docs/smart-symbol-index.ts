import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const SOURCE_GLOBS = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs'];
const EXCLUDE_GLOBS = [
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/.git/**',
  '!**/coverage/**',
  '!**/*.min.js',
  '!**/*.bundle.js',
];

export type SymbolSearchKind =
  | 'any'
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'import'
  | 'export'
  | 'call'
  | 'callers'
  | 'callees';

type StoredSymbolKind = Exclude<SymbolSearchKind, 'any' | 'callers'>;

export interface SymbolIndexBuildResult {
  dbPath: string;
  rootDir: string;
  totalFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  totalSymbols: number;
  totalEdges: number;
  elapsedMs: number;
}

export interface SymbolSearchHit {
  file: string;
  line: number;
  column: number;
  name: string;
  kind: StoredSymbolKind;
  context: string;
  score: number;
  reason: string[];
}

interface DiscoveredSymbol {
  name: string;
  kind: StoredSymbolKind;
  line: number;
  column: number;
  context: string;
}

interface DiscoveredEdge {
  callerName: string;
  calleeName: string;
  line: number;
  column: number;
  context: string;
}

interface DiscoverResult {
  symbols: DiscoveredSymbol[];
  edges: DiscoveredEdge[];
}

function ensureParentDir(filePath: string): void {
  const parent = dirname(filePath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
}

function openDb(dbPath: string): Database {
  ensureParentDir(dbPath);
  const db = new Database(dbPath, { create: true });

  db.exec(`
    PRAGMA busy_timeout = 3000;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      mtime_ms INTEGER NOT NULL,
      size_bytes INTEGER NOT NULL,
      indexed_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      line INTEGER NOT NULL,
      col INTEGER NOT NULL,
      context TEXT NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS symbol_edges (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL,
      caller_name TEXT NOT NULL,
      callee_name TEXT NOT NULL,
      line INTEGER NOT NULL,
      col INTEGER NOT NULL,
      context TEXT NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
    CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
    CREATE INDEX IF NOT EXISTS idx_symbols_file_line ON symbols(file_id, line);

    CREATE INDEX IF NOT EXISTS idx_edges_callee ON symbol_edges(callee_name);
    CREATE INDEX IF NOT EXISTS idx_edges_caller ON symbol_edges(caller_name);
    CREATE INDEX IF NOT EXISTS idx_edges_file_line ON symbol_edges(file_id, line);
  `);

  return db;
}

function listSourceFiles(rootDir: string): string[] {
  const args = ['rg', '--files', rootDir];
  for (const glob of SOURCE_GLOBS) {
    args.push('-g', glob);
  }
  for (const glob of EXCLUDE_GLOBS) {
    args.push('-g', glob);
  }

  const proc = Bun.spawnSync(args, {
    stdout: 'pipe',
    stderr: 'ignore',
  });

  if (!proc.success || !proc.stdout) {
    return [];
  }

  return proc.stdout
    .toString()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getNodeName(node: ts.Node): string | null {
  if ('name' in node && node.name) {
    const nameNode = (node as { name?: ts.Node }).name;
    if (nameNode && ts.isIdentifier(nameNode)) {
      return nameNode.text;
    }
    if (nameNode && ts.isStringLiteral(nameNode)) {
      return nameNode.text;
    }
  }
  return null;
}

function getCallName(node: ts.CallExpression): string | null {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }
  if (ts.isPropertyAccessExpression(node.expression)) {
    return node.expression.name.text;
  }
  return null;
}

function getConstructName(node: ts.NewExpression): string | null {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text;
  }
  if (ts.isPropertyAccessExpression(node.expression)) {
    return node.expression.name.text;
  }
  return null;
}

function lineText(lines: string[], line: number): string {
  if (line < 1 || line > lines.length) {
    return '';
  }
  return lines[line - 1]?.trim() || '';
}

function discoverSymbolsAndEdges(code: string, filePath: string): DiscoverResult {
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines = code.split(/\r?\n/);
  const symbols: DiscoveredSymbol[] = [];
  const edges: DiscoveredEdge[] = [];
  const scopeStack: string[] = [];

  function addSymbol(node: ts.Node, name: string, kind: StoredSymbolKind): void {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false));
    const line = pos.line + 1;
    const column = pos.character + 1;

    symbols.push({
      name,
      kind,
      line,
      column,
      context: lineText(lines, line),
    });
  }

  function addEdge(node: ts.Node, callerName: string, calleeName: string): void {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false));
    const line = pos.line + 1;
    const column = pos.character + 1;

    edges.push({
      callerName,
      calleeName,
      line,
      column,
      context: lineText(lines, line),
    });
  }

  function withScope(name: string | null, callback: () => void): void {
    if (name) {
      scopeStack.push(name);
    }
    callback();
    if (name) {
      scopeStack.pop();
    }
  }

  function currentScopeName(): string {
    return scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : '<module>';
  }

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node)) {
      const name = getNodeName(node);
      if (name) {
        addSymbol(node, name, 'function');
      }
      withScope(name, () => ts.forEachChild(node, visit));
      return;
    }

    if (ts.isMethodDeclaration(node)) {
      const name = getNodeName(node);
      if (name) {
        addSymbol(node, name, 'function');
      }
      withScope(name, () => ts.forEachChild(node, visit));
      return;
    }

    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      withScope('<anonymous>', () => ts.forEachChild(node, visit));
      return;
    }

    if (ts.isClassDeclaration(node)) {
      const name = getNodeName(node);
      if (name) {
        addSymbol(node, name, 'class');
      }
      withScope(name, () => ts.forEachChild(node, visit));
      return;
    }

    if (ts.isInterfaceDeclaration(node)) {
      const name = getNodeName(node);
      if (name) {
        addSymbol(node, name, 'interface');
      }
    }

    if (ts.isTypeAliasDeclaration(node)) {
      const name = getNodeName(node);
      if (name) {
        addSymbol(node, name, 'type');
      }
    }

    if (ts.isEnumDeclaration(node)) {
      const name = getNodeName(node);
      if (name) {
        addSymbol(node, name, 'enum');
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      addSymbol(node, node.name.text, 'variable');
    }

    if (ts.isImportSpecifier(node) && ts.isIdentifier(node.name)) {
      addSymbol(node, node.name.text, 'import');
    }

    if (ts.isImportClause(node) && node.name && ts.isIdentifier(node.name)) {
      addSymbol(node, node.name.text, 'import');
    }

    if (ts.isNamespaceImport(node) && ts.isIdentifier(node.name)) {
      addSymbol(node, node.name.text, 'import');
    }

    if (ts.isExportSpecifier(node) && ts.isIdentifier(node.name)) {
      addSymbol(node, node.name.text, 'export');
    }

    if (ts.isCallExpression(node)) {
      const callee = getCallName(node);
      if (callee) {
        addSymbol(node, callee, 'call');
        addEdge(node, currentScopeName(), callee);
      }
    }

    if (ts.isNewExpression(node)) {
      const callee = getConstructName(node);
      if (callee) {
        addSymbol(node, callee, 'call');
        addEdge(node, currentScopeName(), callee);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { symbols, edges };
}

function getFileStat(path: string): { mtimeMs: number; size: number } | null {
  try {
    const stat = statSync(path);
    return { mtimeMs: stat.mtimeMs, size: stat.size };
  } catch {
    return null;
  }
}

export function resolveSymbolIndexPath(customPath?: string): string {
  return resolve(customPath || '.cache/smart-search/symbols.sqlite');
}

export async function buildSymbolIndex(options: {
  rootDir?: string;
  dbPath?: string;
  rebuild?: boolean;
} = {}): Promise<SymbolIndexBuildResult> {
  const rootDir = resolve(options.rootDir || '.');
  const dbPath = resolveSymbolIndexPath(options.dbPath);

  const start = performance.now();
  const db = openDb(dbPath);

  if (options.rebuild) {
    db.exec(`
      DELETE FROM symbol_edges;
      DELETE FROM symbols;
      DELETE FROM files;
    `);
  }

  const getFileRow = db.query('SELECT id, mtime_ms, size_bytes FROM files WHERE path = ?');
  const upsertFile = db.query(`
    INSERT INTO files(path, mtime_ms, size_bytes, indexed_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(path)
    DO UPDATE SET
      mtime_ms = excluded.mtime_ms,
      size_bytes = excluded.size_bytes,
      indexed_at = excluded.indexed_at
  `);
  const getFileId = db.query('SELECT id FROM files WHERE path = ?');
  const deleteSymbols = db.query('DELETE FROM symbols WHERE file_id = ?');
  const deleteEdges = db.query('DELETE FROM symbol_edges WHERE file_id = ?');
  const insertSymbol = db.query(
    'INSERT INTO symbols(file_id, name, kind, line, col, context) VALUES(?, ?, ?, ?, ?, ?)'
  );
  const insertEdge = db.query(
    'INSERT INTO symbol_edges(file_id, caller_name, callee_name, line, col, context) VALUES(?, ?, ?, ?, ?, ?)'
  );
  const countSymbolsStmt = db.query('SELECT COUNT(*) as count FROM symbols');
  const countEdgesStmt = db.query('SELECT COUNT(*) as count FROM symbol_edges');

  const files = listSourceFiles(rootDir);
  let indexedFiles = 0;
  let skippedFiles = 0;

  const upsertFileData = db.transaction((fileId: number, result: DiscoverResult) => {
    deleteSymbols.run(fileId);
    deleteEdges.run(fileId);

    for (const symbol of result.symbols) {
      insertSymbol.run(fileId, symbol.name, symbol.kind, symbol.line, symbol.column, symbol.context);
    }

    for (const edge of result.edges) {
      insertEdge.run(fileId, edge.callerName, edge.calleeName, edge.line, edge.column, edge.context);
    }
  });

  for (const filePath of files) {
    const absolutePath = resolve(filePath);
    const stat = getFileStat(absolutePath);
    if (!stat) {
      continue;
    }

    const existing = getFileRow.get(absolutePath) as
      | { id: number; mtime_ms: number; size_bytes: number }
      | null;

    if (existing && existing.mtime_ms === stat.mtimeMs && existing.size_bytes === stat.size) {
      skippedFiles += 1;
      continue;
    }

    let code: string;
    try {
      code = await Bun.file(absolutePath).text();
    } catch {
      continue;
    }

    const discovered = discoverSymbolsAndEdges(code, absolutePath);
    const now = Date.now();

    upsertFile.run(absolutePath, stat.mtimeMs, stat.size, now);
    const row = getFileId.get(absolutePath) as { id: number } | null;
    if (!row) {
      continue;
    }

    upsertFileData(row.id, discovered);
    indexedFiles += 1;
  }

  const totalSymbols = Number((countSymbolsStmt.get() as { count: number }).count || 0);
  const totalEdges = Number((countEdgesStmt.get() as { count: number }).count || 0);
  db.close();

  return {
    dbPath,
    rootDir,
    totalFiles: files.length,
    indexedFiles,
    skippedFiles,
    totalSymbols,
    totalEdges,
    elapsedMs: performance.now() - start,
  };
}

function tokenizeQuery(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._\-/]+/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 2);
}

function scoreSymbolHit(hit: Omit<SymbolSearchHit, 'score' | 'reason'>, query: string, tokens: string[]): SymbolSearchHit {
  const queryLower = query.toLowerCase();
  const nameLower = hit.name.toLowerCase();
  const contextLower = hit.context.toLowerCase();
  const fileLower = hit.file.toLowerCase();

  const reasons: string[] = [];
  let score = 0;

  if (nameLower === queryLower) {
    score += 45;
    reasons.push('exact symbol match');
  } else if (nameLower.includes(queryLower)) {
    score += 30;
    reasons.push('name contains query');
  }

  if (fileLower.includes(queryLower)) {
    score += 16;
    reasons.push('file contains query');
  }

  for (const token of tokens) {
    if (nameLower.includes(token)) {
      score += 8;
    }
    if (contextLower.includes(token)) {
      score += 4;
    }
    if (fileLower.includes(token)) {
      score += 5;
    }
  }

  if (hit.kind !== 'call' && hit.kind !== 'import') {
    score += 4;
    reasons.push('definition bias');
  }

  return {
    ...hit,
    score,
    reason: reasons.length ? reasons : ['symbol token match'],
  };
}

export function searchCallersBySymbol(
  symbolName: string,
  options: {
    rootDir?: string;
    dbPath?: string;
    limit?: number;
  } = {}
): SymbolSearchHit[] {
  const dbPath = resolveSymbolIndexPath(options.dbPath);
  if (!existsSync(dbPath)) {
    return [];
  }

  let db: Database;
  try {
    db = openDb(dbPath);
  } catch {
    return [];
  }

  try {
    const params: Array<string | number> = [];
    const predicates: string[] = ['LOWER(e.callee_name) LIKE ?'];
    params.push(`%${symbolName.toLowerCase()}%`);

    if (options.rootDir) {
      predicates.push('f.path LIKE ?');
      params.push(`${resolve(options.rootDir)}%`);
    }

    const whereClause = `WHERE ${predicates.join(' AND ')}`;
    const limit = Math.max(25, (options.limit || 50) * 3);

    const stmt = db.query(`
      SELECT
        f.path as file,
        e.line as line,
        e.col as col,
        e.caller_name as caller_name,
        e.callee_name as callee_name,
        e.context as context,
        (
          SELECT COUNT(*)
          FROM symbol_edges e2
          WHERE e2.caller_name = e.caller_name
        ) as out_degree
      FROM symbol_edges e
      JOIN files f ON f.id = e.file_id
      ${whereClause}
      ORDER BY e.line ASC
      LIMIT ${limit}
    `);

    const rows = stmt.all(...params) as Array<{
      file: string;
      line: number;
      col: number;
      caller_name: string;
      callee_name: string;
      context: string;
      out_degree: number;
    }>;

    const queryTokens = tokenizeQuery(symbolName);

    const hits = rows.map((row) => {
      let score = 30;
      const reasons: string[] = ['call edge'];

      const calleeLower = row.callee_name.toLowerCase();
      const callerLower = row.caller_name.toLowerCase();

      if (calleeLower === symbolName.toLowerCase()) {
        score += 28;
        reasons.push('exact callee match');
      } else if (calleeLower.includes(symbolName.toLowerCase())) {
        score += 18;
        reasons.push('callee contains query');
      }

      for (const token of queryTokens) {
        if (calleeLower.includes(token)) {
          score += 7;
        }
        if (callerLower.includes(token)) {
          score += 5;
        }
        if (row.context.toLowerCase().includes(token)) {
          score += 3;
        }
      }

      // Graph proximity proxy: high out-degree callers are central call hubs.
      const centralityBoost = Math.min(20, Math.floor(Math.log2((row.out_degree || 1) + 1) * 4));
      score += centralityBoost;
      reasons.push(`graph proximity +${centralityBoost}`);

      return {
        file: row.file,
        line: row.line,
        column: row.col,
        name: row.caller_name,
        kind: 'call' as const,
        context: row.context,
        score,
        reason: reasons,
      };
    });

    return hits
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line)
      .slice(0, options.limit || 50);
  } finally {
    db.close();
  }
}

export function searchCalleesBySymbol(
  symbolName: string,
  options: {
    rootDir?: string;
    dbPath?: string;
    limit?: number;
  } = {}
): SymbolSearchHit[] {
  const dbPath = resolveSymbolIndexPath(options.dbPath);
  if (!existsSync(dbPath)) {
    return [];
  }

  let db: Database;
  try {
    db = openDb(dbPath);
  } catch {
    return [];
  }

  try {
    const params: Array<string | number> = [];
    const predicates: string[] = ['LOWER(e.caller_name) LIKE ?'];
    params.push(`%${symbolName.toLowerCase()}%`);

    if (options.rootDir) {
      predicates.push('f.path LIKE ?');
      params.push(`${resolve(options.rootDir)}%`);
    }

    const whereClause = `WHERE ${predicates.join(' AND ')}`;
    const limit = Math.max(25, (options.limit || 50) * 3);

    const stmt = db.query(`
      SELECT
        f.path as file,
        e.line as line,
        e.col as col,
        e.caller_name as caller_name,
        e.callee_name as callee_name,
        e.context as context,
        (
          SELECT COUNT(*)
          FROM symbol_edges e2
          WHERE e2.callee_name = e.callee_name
        ) as in_degree
      FROM symbol_edges e
      JOIN files f ON f.id = e.file_id
      ${whereClause}
      ORDER BY e.line ASC
      LIMIT ${limit}
    `);

    const rows = stmt.all(...params) as Array<{
      file: string;
      line: number;
      col: number;
      caller_name: string;
      callee_name: string;
      context: string;
      in_degree: number;
    }>;

    const queryTokens = tokenizeQuery(symbolName);

    const hits = rows.map((row) => {
      let score = 30;
      const reasons: string[] = ['call edge'];

      const callerLower = row.caller_name.toLowerCase();
      const calleeLower = row.callee_name.toLowerCase();

      if (callerLower === symbolName.toLowerCase()) {
        score += 28;
        reasons.push('exact caller match');
      } else if (callerLower.includes(symbolName.toLowerCase())) {
        score += 18;
        reasons.push('caller contains query');
      }

      for (const token of queryTokens) {
        if (callerLower.includes(token)) {
          score += 7;
        }
        if (calleeLower.includes(token)) {
          score += 5;
        }
        if (row.context.toLowerCase().includes(token)) {
          score += 3;
        }
      }

      // Graph proximity proxy: high in-degree callees are widely reused targets.
      const centralityBoost = Math.min(20, Math.floor(Math.log2((row.in_degree || 1) + 1) * 4));
      score += centralityBoost;
      reasons.push(`graph proximity +${centralityBoost}`);

      return {
        file: row.file,
        line: row.line,
        column: row.col,
        name: row.callee_name,
        kind: 'call' as const,
        context: row.context,
        score,
        reason: reasons,
      };
    });

    return hits
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line)
      .slice(0, options.limit || 50);
  } finally {
    db.close();
  }
}

export function searchSymbolIndex(
  query: string,
  options: {
    rootDir?: string;
    dbPath?: string;
    kind?: SymbolSearchKind;
    limit?: number;
  } = {}
): SymbolSearchHit[] {
  if (options.kind === 'callers') {
    return searchCallersBySymbol(query, {
      rootDir: options.rootDir,
      dbPath: options.dbPath,
      limit: options.limit,
    });
  }
  if (options.kind === 'callees') {
    return searchCalleesBySymbol(query, {
      rootDir: options.rootDir,
      dbPath: options.dbPath,
      limit: options.limit,
    });
  }

  const dbPath = resolveSymbolIndexPath(options.dbPath);
  if (!existsSync(dbPath)) {
    return [];
  }

  const tokens = Array.from(new Set(tokenizeQuery(query))).slice(0, 8);
  if (tokens.length === 0) {
    return [];
  }

  let db: Database;
  try {
    db = openDb(dbPath);
  } catch {
    return [];
  }

  try {
    const predicates: string[] = [];
    const params: Array<string | number> = [];

    for (const token of tokens) {
      predicates.push('(LOWER(s.name) LIKE ? OR LOWER(s.context) LIKE ? OR LOWER(f.path) LIKE ?)');
      const wildcard = `%${token}%`;
      params.push(wildcard, wildcard, wildcard);
    }

    if (options.kind && options.kind !== 'any') {
      predicates.push('s.kind = ?');
      params.push(options.kind);
    }

    if (options.rootDir) {
      predicates.push('f.path LIKE ?');
      params.push(`${resolve(options.rootDir)}%`);
    }

    const whereClause = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';
    const limit = Math.max(20, (options.limit || 50) * 3);

    const queryStmt = db.query(`
      SELECT
        f.path as file,
        s.line as line,
        s.col as col,
        s.name as name,
        s.kind as kind,
        s.context as context
      FROM symbols s
      JOIN files f ON f.id = s.file_id
      ${whereClause}
      ORDER BY s.line ASC
      LIMIT ${limit}
    `);

    const rows = queryStmt.all(...params) as Array<{
      file: string;
      line: number;
      col: number;
      name: string;
      kind: StoredSymbolKind;
      context: string;
    }>;

    const scored = rows.map((row) =>
      scoreSymbolHit(
        {
          file: row.file,
          line: row.line,
          column: row.col,
          name: row.name,
          kind: row.kind,
          context: row.context,
        },
        query,
        tokens
      )
    );

    return scored
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line)
      .slice(0, options.limit || 50);
  } finally {
    db.close();
  }
}
