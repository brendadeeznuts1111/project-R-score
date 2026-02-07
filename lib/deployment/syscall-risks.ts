// lib/deployment/syscall-risks.ts — Syscall risk score constants by platform

export const SYSCALL_RISKS = {
  LINUX_COPY_FILE_RANGE: 1.0000005 as const, // Zero-copy
  LINUX_SENDFILE: 1.000001 as const, // Pipe transfer
  LINUX_SPLICE: 1.0000015 as const, // Pipe splice
  DARWIN_CLONEFILE: 1.0000003 as const, // APFS CoW
  DARWIN_FCOPYFILE: 1.0000008 as const, // Existing CoW
  FALLBACK_WRITE: 1.000002 as const, // Standard
  FILESINK_STREAM: 1.500002 as const, // Incremental
} as const;
