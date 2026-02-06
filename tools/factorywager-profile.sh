#!/bin/bash
# factorywager-profile.sh - Dual profiling with color animations

# ANSI color animation helpers
animate_progress() {
  local message=$1
  local colors=("primary" "success" "accent")
  for i in {1..3}; do
    for color in "${colors[@]}"; do
      printf "\r%s" $(bun run - <(echo "
        import { styled } from '../lib/theme/colors.ts';
        console.log(styled('${message} ${"▁▂▃▄▅▆▇█":$i:8}', '${color}'));
      "))
      sleep 0.1
    done
  done
  echo
}

# CPU Profile
animate_progress "🔍 Profiling CPU"
CPU_OUTPUT=$(bun --cpu-prof-md worker.ts 2>/dev/null)

# Colorize and save CPU profile
echo "$CPU_OUTPUT" | bun run - <(echo '
  import { styled } from "../lib/theme/colors.ts";
  const md = await new Response(Bun.stdin).text();
  const colored = Bun.color(md, "ansi256"); // Convert markdown to ANSI
  Bun.write("cpu-profile.md", md);
  Bun.write("cpu-profile-ansi.md", colored);
') > cpu-profile-colored.md

# Heap Profile with visual severity detection
animate_progress "🧠 Profiling Heap"
bun --heap-prof-md leak.ts 2>/dev/null | \
  bun run - <(echo '
    import { styled, log, FW_COLORS } from "../lib/theme/colors.ts";
    
    const md = await new Response(Bun.stdin).text();
    
    // Analyze heap profile for severity
    const leakMatch = md.match(/potential leak.*?(\d+\.?\d*)([KMGT]B)/i);
    const totalMatch = md.match(/total heap.*?(\d+\.?\d*)([KMGT]B)/i);
    
    let severity = "success";
    if (leakMatch) {
      const leakMB = parseFloat(leakMatch[1]) * 
        ({K: 0.001, M: 1, G: 1000, T: 1000000}[leakMatch[2].toUpperCase()] || 1);
      severity = leakMB > 100 ? "error" : leakMB > 10 ? "warning" : "success";
    }
    
    // Create visual metadata
    const themeColor = FW_COLORS[severity];
    const visualTags = {
      hex: Bun.color(themeColor, "hex"),
      rgb: Bun.color(themeColor, "rgb"),
      hsl: Bun.color(themeColor, "hsl"),
      ansi: Bun.color(themeColor, "ansi256")
    };
    
    // Upload with rich metadata
    const zst = Bun.zstdCompressSync(md);
    const timestamp = Date.now();
    const key = `profiles/dual-${timestamp}.md.zst`;
    
    await env.R2_BUCKET.put(key, zst, {
      customMetadata: {
        "profile:type": "dual-cpu-heap",
        "profile:timestamp": timestamp.toString(),
        "profile:severity": severity,
        "visual:theme": `factorywager-${severity}`,
        "visual:color-hex": visualTags.hex,
        "visual:color-rgb": visualTags.rgb,
        "visual:color-hsl": visualTags.hsl,
        "visual:ansi-example": visualTags.ansi + "█" + Bun.color("reset", "ansi256"),
        "system:compression-ratio": `${(md.length / zst.length).toFixed(1)}x`,
        "factorywager:version": "4.0-color"
      }
    });
    
    const signed = await env.R2_BUCKET.createSignedUrl(key, { expiresInSeconds: 7200 });
    
    // Terminal report with color bars
    const colorBar = visualTags.ansi + "━━━━━━━━━━" + Bun.color("reset", "ansi256");
    console.log(styled("\n📊 FACTORYWAGER PROFILE REPORT", "accent"));
    console.log(colorBar);
    console.log(styled("   Severity: ", "muted") + styled(severity.toUpperCase(), severity));
    console.log(styled("   Color: ", "muted") + styled(visualTags.hex, "accent"));
    console.log(styled("   URL: ", "muted") + styled(signed, "primary"));
    console.log(styled("   Expires: ", "muted") + styled("2 hours", "success"));
    console.log(colorBar);
  ') \
  --env R2_BUCKET=scanner-cookies
