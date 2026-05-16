// @bun
import"./index-77q09zgs.js";

// generate.ts
var FIRST_NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank", "Ivy", "Jack"];
var LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Lopez", "Wilson"];
var DOMAINS = ["example.com", "test.io", "demo.dev", "local.net"];
var ROLES = ["admin", "user", "viewer"];
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function generateUser(overrides = {}) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const domain = pick(DOMAINS);
  return {
    id: crypto.randomUUID(),
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    role: pick(ROLES),
    createdAt: new Date,
    ...overrides
  };
}
function generateUsers(count, overrides = {}) {
  return Array.from({ length: count }, (_, i) => {
    const user = generateUser(overrides);
    const [local, domain] = user.email.split("@");
    return { ...user, email: `${local}+${i}@${domain}` };
  });
}
export {
  generateUsers,
  generateUser
};
