// lib/syscall-risks.ts
export const SYSCALL_RISKS = {
  LINUX_COPY_FILE_RANGE: 1.000000500 as const,  // Zero-copy
  LINUX_SENDFILE: 1.000001000 as const,          // Pipe transfer
  LINUX_SPLICE: 1.000001500 as const,            // Pipe splice
  DARWIN_CLONEFILE: 1.000000300 as const,        // APFS CoW
  DARWIN_FCOPYFILE: 1.000000800 as const,        // Existing CoW
  FALLBACK_WRITE: 1.000002000 as const,          // Standard
  FILESINK_STREAM: 1.500002000 as const          // Incremental
} as const;
