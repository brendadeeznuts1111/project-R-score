import type { RefsJson } from "../refs-schema";
import type { UrlCheckResult } from "./url-checker";
import { isUrlCheckSuccess } from "./url-checker";

export async function applyFix(
  refsPath: string,
  data: RefsJson,
  urlChecks: UrlCheckResult[],
  timestamp: string
): Promise<void> {
  const checkById = new Map(urlChecks.map((c) => [c.id, c]));

  data.meta.lastAudit = timestamp;
  data.meta.totalRefs = data.refs.length;

  for (const ref of data.refs) {
    if (ref.kind === "internal") {
      ref.status = "internal";
      continue;
    }
    const check = checkById.get(ref.id);
    if (check && isUrlCheckSuccess(check.classification)) {
      ref.lastChecked = timestamp;
      ref.status = check.classification === "redirect" ? "redirect" : "ok";
    } else if (check) {
      ref.status = check.classification;
    }
  }

  await Bun.write(refsPath, JSON.stringify(data, null, 2) + "\n");
}
