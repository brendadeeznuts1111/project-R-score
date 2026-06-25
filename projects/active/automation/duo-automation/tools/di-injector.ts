// plugins/di-injector.ts
import type { BunPlugin } from "bun";

export const diInjector: BunPlugin = {
  name: "DI Injector",
  setup(build) {
    build.onLoad({ filter: /s3Exports\.ts$/ }, async (args) => {
      const contents = await Bun.file(args.path).text();
      
      // Auto-inject PROD_DEPS as default parameter in non-test environments
      if (process.env.NODE_ENV !== "test") {
        const injected = contents
          .replace(
            /export async function uploadUserReport\(\s*userId: string,\s*scope: string,\s*buffer: Uint8Array\s*\): Promise<void>/g,
            "export async function uploadUserReport(userId: string, scope: string, buffer: Uint8Array, deps: Dependencies = PROD_DEPS): Promise<void>"
          )
          .replace(
            /export async function uploadDebugLogs\(\s*logData: Uint8Array\s*\): Promise<void>/g,
            "export async function uploadDebugLogs(logData: Uint8Array, deps: Dependencies = PROD_DEPS): Promise<void>"
          )
          .replace(
            /export async function uploadTenantExport\(\s*csv: Uint8Array,\s*isPremium: boolean = false\s*\): Promise<void>/g,
            "export async function uploadTenantExport(csv: Uint8Array, isPremium: boolean = false, deps: Dependencies = PROD_DEPS): Promise<void>"
          )
          .replace(
            /export async function uploadFile\(\s*key: string,\s*data: Uint8Array,\s*options: UploadOptions = {}\s*\): Promise<void>/g,
            "export async function uploadFile(key: string, data: Uint8Array, options: UploadOptions = {}, deps: Dependencies = PROD_DEPS): Promise<void>"
          )
          .replace(
            /export async function uploadBatch\(\s*files: Array<{\s*key: string;\s*data: Uint8Array;\s*options\?: UploadOptions;\s*}>\s*\): Promise<void>/g,
            "export async function uploadBatch(files: Array<{key: string; data: Uint8Array; options?: UploadOptions;}>, deps: Dependencies = PROD_DEPS): Promise<void>"
          )
          .replace(
            /export async function exportUserData\(\s*userId: string,\s*data: {\s*json\?: Uint8Array;\s*csv\?: Uint8Array;\s*pdf\?: Uint8Array;\s*},\s*scope: string = "PRODUCTION"\s*\): Promise<void>/g,
            "export async function exportUserData(userId: string, data: {json?: Uint8Array; csv?: Uint8Array; pdf?: Uint8Array;}, scope: string = \"PRODUCTION\", deps: Dependencies = PROD_DEPS): Promise<void>"
          )
          .replace(
            /export async function uploadWithScopeStrategy\(\s*key: string,\s*data: Uint8Array,\s*scope: keyof typeof SCOPE_STRATEGIES,\s*filename\?: string\s*\): Promise<void>/g,
            "export async function uploadWithScopeStrategy(key: string, data: Uint8Array, scope: keyof typeof SCOPE_STRATEGIES, filename?: string, deps: Dependencies = PROD_DEPS): Promise<void>"
          );
        
        return { contents: injected, loader: "ts" };
      }
      
      return { contents, loader: "ts" };
    });
  },
};
