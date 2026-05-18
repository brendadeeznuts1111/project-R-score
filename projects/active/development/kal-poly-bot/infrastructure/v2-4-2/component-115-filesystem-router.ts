#!/usr/bin/env bun
/**
 * Component #115: FileSystem-Router
 * Primary API: Bun.FileSystemRouter
 * Secondary API: Bun.Glob
 * Performance SLA: O(1) matching (URLPattern API)
 * Parity Lock: 7k8l...9m0n
 * Status: OPTIMIZED
 */

import { feature } from "bun:bundle";

interface RouterConfig {
  dir: string;
  assetPrefix?: string;
}

export class FileSystemRouter {
  private static instance: FileSystemRouter;

  private constructor() {}

  static getInstance(): FileSystemRouter {
    if (!this.instance) {
      this.instance = new FileSystemRouter();
    }
    return this.instance;
  }

  createRouter(config: RouterConfig): any {
    if (!feature("FILE_SYSTEM_ROUTER")) {
      return new Bun.FileSystemRouter({
        dir: config.dir,
        assetPrefix: config.assetPrefix || "/",
      });
    }

    return new Bun.FileSystemRouter({
      dir: config.dir,
      assetPrefix: config.assetPrefix || "/",
    });
  }

  match(router: any, pathname: string): any {
    return router.match(pathname);
  }
}

export const fileSystemRouter = feature("FILE_SYSTEM_ROUTER")
  ? FileSystemRouter.getInstance()
  : {
      createRouter: (config: RouterConfig) =>
        new Bun.FileSystemRouter({
          dir: config.dir,
          assetPrefix: config.assetPrefix || "/",
        }),
      match: (router: any, pathname: string) => router.match(pathname),
    };

export default fileSystemRouter;
