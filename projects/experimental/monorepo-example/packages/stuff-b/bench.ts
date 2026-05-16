import { bench, group, run } from 'mitata';
import { createDB } from './db';
import { generateUsers } from 'stuff-a/generate';
import { validateUser } from 'stuff-a';

const db = createDB(); // in-memory for benchmarks

// Pre-seed some data
const seedUsers = generateUsers(100);
db.insertMany(seedUsers.map(u => validateUser(u)));
const sampleId = seedUsers[0].id;

let counter = 1000;
function uniqueUser() {
  counter++;
  return validateUser({
    id: crypto.randomUUID(),
    name: `Bench User ${counter}`,
    email: `bench${counter}@test.dev`,
    role: 'user',
    createdAt: new Date(),
  });
}

group('SQLite single operations', () => {
  bench('insert one user', () => {
    db.insert(uniqueUser());
  });

  bench('get by ID', () => {
    db.get(sampleId);
  });

  bench('list (limit 50)', () => {
    db.list(50);
  });

  bench('count', () => {
    db.count();
  });

  bench('delete + re-insert', () => {
    const u = uniqueUser();
    db.insert(u);
    db.delete(u.id);
  });
});

group('SQLite batch operations', () => {
  bench('bulk insert 10 users', () => {
    const users = Array.from({ length: 10 }, () => uniqueUser());
    db.insertMany(users);
  });

  bench('bulk insert 100 users', () => {
    const users = Array.from({ length: 100 }, () => uniqueUser());
    db.insertMany(users);
  });
});

group('stats', () => {
  bench('db.stats()', () => {
    db.stats();
  });
});

await run();

db.close();
