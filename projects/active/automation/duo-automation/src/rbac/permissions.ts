export const PERMISSIONS = {
  OPS: {
    METRICS: 'ops:metrics',
    CLEANUP: 'storage:delete', // Aligned with feedback
  },
  TASKS: {
    CREATE: 'tasks:create',
    PUSH: 'tasks:push',
  },
  STORAGE: {
    READ: 'storage:read',
    WRITE: 'storage:write',
    DELETE: 'storage:delete',
  },
  USER: {
    MANAGE: 'user:manage',
  }
} as const;
