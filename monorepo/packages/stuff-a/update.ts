import { z } from 'zod';

export const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
}).refine(
  (data) => data.name !== undefined || data.email !== undefined || data.role !== undefined,
  { message: 'At least one field (name, email, role) must be provided' },
);

export type UserUpdate = z.infer<typeof UserUpdateSchema>;
