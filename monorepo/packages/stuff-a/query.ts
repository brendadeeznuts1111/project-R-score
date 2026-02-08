import { z } from 'zod';

export const UserQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  sort: z.enum(['name', 'email', 'created_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type UserQuery = z.infer<typeof UserQuerySchema>;

export function parseQuery(params: URLSearchParams): UserQuery {
  return UserQuerySchema.parse({
    search: params.get('search') ?? undefined,
    role: params.get('role') ?? undefined,
    sort: params.get('sort') ?? undefined,
    order: params.get('order') ?? undefined,
    limit: params.get('limit') ?? undefined,
    offset: params.get('offset') ?? undefined,
  });
}
