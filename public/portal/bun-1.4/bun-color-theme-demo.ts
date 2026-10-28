// Demo: validate theme color tokens with Bun.color
import themeDoc from "../theme.xml";

const theme = (themeDoc as any).theme;
const colors = Array.isArray(theme.color) ? theme.color : [theme.color];

let ok = 0, bad = 0;
for (const c of colors) {
  const v = c["@value"];
  if (typeof v === "string" && (v.startsWith("var(") || v.startsWith("radial-gradient"))) {
    console.log("SKIP", c["@name"] ?? c["@group"], "(non-color)");
    continue;
  }
  const hex = Bun.color(v, "hex");
  if (hex) { ok++; console.log("OK  ", (c["@group"] ? c["@group"]+"." : "") + c["@name"], v, "->", hex); }
  else { bad++; console.log("BAD ", (c["@group"] ? c["@group"]+"." : "") + c["@name"], v); }
}
console.log(`\n${ok} valid, ${bad} invalid via Bun.color`);
