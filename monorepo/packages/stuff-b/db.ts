import { Database } from 'bun:sqlite';
import type { User } from 'stuff-a';
import type { UserQuery } from 'stuff-a/query';
import type { UserUpdate } from 'stuff-a/update';
import { DB, LIMITS } from 'stuff-a/config';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export function createDB(path = DB.DEFAULT_PATH): UserDB {
  return new UserDB(path);
}

export class UserDB {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.run(`PRAGMA journal_mode = ${DB.PRAGMA.JOURNAL_MODE}`);
    this.db.run(`PRAGMA foreign_keys = ${DB.PRAGMA.FOREIGN_KEYS}`);
    this.db.run(`PRAGMA synchronous = ${DB.PRAGMA.SYNCHRONOUS}`);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      )
    `);
  }

  insert(user: User): User {
    this.db.run(
      'INSERT INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.name, user.email, user.role, user.createdAt.toISOString()],
    );
    return user;
  }

  insertMany(users: User[]): number {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    const tx = this.db.transaction((rows: User[]) => {
      let count = 0;
      for (const u of rows) {
        const result = stmt.run(u.id, u.name, u.email, u.role, u.createdAt.toISOString());
        if (result.changes > 0) count++;
      }
      return count;
    });
    return tx(users);
  }

  get(id: string): User | null {
    const row = this.db.query('SELECT * FROM users WHERE id = ?').get(id) as UserRow | null;
    return row ? this.rowToUser(row) : null;
  }

  list(limit = LIMITS.DEFAULT_LIST_LIMIT, offset = 0): User[] {
    const rows = this.db.query('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as UserRow[];
    return rows.map(this.rowToUser);
  }

  delete(id: string): boolean {
    const result = this.db.run('DELETE FROM users WHERE id = ?', [id]);
    return result.changes > 0;
  }

  count(): number {
    return (this.db.query('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  }

  stats(): { count: number; sizeBytes: number; path: string } {
    return {
      count: this.count(),
      sizeBytes: (this.db.query('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number }).size,
      path: this.db.filename,
    };
  }

  search(query: UserQuery): User[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }
    if (query.role) {
      conditions.push('role = ?');
      params.push(query.role);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM users ${where} ORDER BY ${query.sort} ${query.order} LIMIT ? OFFSET ?`;
    params.push(query.limit, query.offset);

    const rows = this.db.query(sql).all(...params) as UserRow[];
    return rows.map(this.rowToUser);
  }

  update(id: string, changes: UserUpdate): User | null {
    const sets: string[] = [];
    const params: any[] = [];

    if (changes.name !== undefined) { sets.push('name = ?'); params.push(changes.name); }
    if (changes.email !== undefined) { sets.push('email = ?'); params.push(changes.email); }
    if (changes.role !== undefined) { sets.push('role = ?'); params.push(changes.role); }

    if (sets.length === 0) return null;

    params.push(id);
    const result = this.db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    if (result.changes === 0) return null;
    return this.get(id);
  }

  close(): void {
    this.db.close();
  }

  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as User['role'],
      createdAt: new Date(row.created_at),
    };
  }
}
