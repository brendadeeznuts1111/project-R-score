// css/lightning-processor.ts
import { transform, browserslistToTargets } from "lightningcss";

export class LightningCSSProcessor {
  private targets = browserslistToTargets([
    "> 0.25%",
    "not dead",
    "supports css-nesting",
  ]);

  async optimize(
    css: string | Buffer,
    filename = "app.css"
  ): Promise<{ code: string; map?: string }> {
    const input = typeof css === "string" ? Buffer.from(css) : css;

    const result = transform({
      filename,
      code: input,
      minify: true,
      sourceMap: process.env.NODE_ENV !== "production",
      targets: this.targets,
      drafts: { nesting: true, customMedia: true },
      cssModules: process.env.USE_CSS_MODULES === "true"
        ? { pattern: "tier1380__[local]" }
        : undefined,
    });

    if (result.warnings.length > 0) {
      console.warn("LightningCSS warnings:", result.warnings);
    }

    return {
      code: result.code.toString(),
      map: result.map?.toString(),
    };
  }

  static async middleware(req: Request): Promise<Response | null> {
    if (!req.url.endsWith(".css")) return null;

    const url = new URL(req.url);
    const file = Bun.file(
      `${import.meta.dir}/public${url.pathname}`
    );
    if (!(await file.exists())) return null;

    const processor = new LightningCSSProcessor();
    const { code } = await processor.optimize(
      await file.text(),
      url.pathname
    );

    return new Response(code, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
}
