// @bun
import {
  exports_external
} from "./index-7ed6y08k.js";

// ../stuff-a/index.ts
var UserSchema = exports_external.object({
  id: exports_external.string().uuid(),
  name: exports_external.string().min(1),
  email: exports_external.string().email(),
  role: exports_external.enum(["admin", "user", "viewer"]),
  createdAt: exports_external.coerce.date()
});
function validateUser(input) {
  return UserSchema.parse(input);
}
function safeValidateUser(input) {
  return UserSchema.safeParse(input);
}

// index.ts
function createUserService() {
  const users = [];
  return {
    create(input) {
      const user = validateUser(input);
      users.push(user);
      return user;
    },
    list() {
      return [...users];
    }
  };
}
function bulkValidate(inputs) {
  const valid = [];
  let errors = 0;
  for (const input of inputs) {
    const result = safeValidateUser(input);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors++;
    }
  }
  return { valid, errors };
}
export {
  createUserService,
  bulkValidate
};
