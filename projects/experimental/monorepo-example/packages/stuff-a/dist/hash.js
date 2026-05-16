// @bun
import {
  UserSchema
} from "./index-5994g40z.js";
import"./index-jggxa8p5.js";
import"./index-77q09zgs.js";

// hash.ts
function hashUser(user) {
  const canonical = JSON.stringify(user, Object.keys(user).sort());
  return Bun.hash.crc32(canonical).toString(16).padStart(8, "0");
}
async function persistUsers(users, path) {
  const data = JSON.stringify(users, null, 2);
  await Bun.write(path, data);
  return users.length;
}
async function loadUsers(path) {
  const file = Bun.file(path);
  if (!await file.exists())
    return [];
  const raw = await file.json();
  return raw.map((u) => UserSchema.parse(u));
}
export {
  persistUsers,
  loadUsers,
  hashUser
};
