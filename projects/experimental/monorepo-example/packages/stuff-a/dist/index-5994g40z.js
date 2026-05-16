// @bun
import {
  exports_external
} from "./index-jggxa8p5.js";

// index.ts
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

export { UserSchema, validateUser, safeValidateUser };
