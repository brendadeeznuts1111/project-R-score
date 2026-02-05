// deploy-script.ts
import { gzipBundle } from "./quantum-toolkit-patch";
const gz = gzipBundle(await Bun.file("dist.tar").arrayBuffer());
await Bun.write("bundle.tar.gz", gz); // 30 % smaller
