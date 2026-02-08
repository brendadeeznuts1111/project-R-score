import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export function validateUser(input: unknown): User {
  return UserSchema.parse(input);
}

export function safeValidateUser(input: unknown) {
  return UserSchema.safeParse(input);
}
