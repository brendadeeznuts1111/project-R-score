// @bun
import {
  DB,
  LIMITS
} from "./index-kqsbh0ty.js";
import"./index-7ed6y08k.js";

// db.ts
import { Database } from "bun:sqlite";
function createDB(path = DB.DEFAULT_PATH) {
  return new UserDB(path);
}

class UserDB {
  db;
  constructor(path) {
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
  insert(user) {
    this.db.run("INSERT INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)", [user.id, user.name, user.email, user.role, user.createdAt.toISOString()]);
    return user;
  }
  insertMany(users) {
    const stmt = this.db.prepare("INSERT OR IGNORE INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)");
    const tx = this.db.transaction((rows) => {
      let count = 0;
      for (const u of rows) {
        const result = stmt.run(u.id, u.name, u.email, u.role, u.createdAt.toISOString());
        if (result.changes > 0)
          count++;
      }
      return count;
    });
    return tx(users);
  }
  get(id) {
    const row = this.db.query("SELECT * FROM users WHERE id = ?").get(id);
    return row ? this.rowToUser(row) : null;
  }
  list(limit = LIMITS.DEFAULT_LIST_LIMIT, offset = 0) {
    const rows = this.db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
    return rows.map(this.rowToUser);
  }
  delete(id) {
    const result = this.db.run("DELETE FROM users WHERE id = ?", [id]);
    return result.changes > 0;
  }
  count() {
    return this.db.query("SELECT COUNT(*) as n FROM users").get().n;
  }
  stats() {
    return {
      count: this.count(),
      sizeBytes: this.db.query("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get().size,
      path: this.db.filename
    };
  }
  close() {
    this.db.close();
  }
  rowToUser(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: new Date(row.created_at)
    };
  }
}
export {
  createDB,
  UserDB
};
