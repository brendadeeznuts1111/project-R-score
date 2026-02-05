// [DUOPLUS][DASHBOARD][SERVER][V56][FEAT] [BUN:6.1-NATIVE]

const port = Number(Bun.env.bunport || Bun.env.BUN_PORT || Bun.env.PORT || 8090);

const routes: Record<string, string> = {
  "/vendor/tailwindcss.js": "vendor/tailwindcss.js",
  "/vendor/lucide.js": "vendor/lucide.js",
  "/dist/venmo-family-webui-demo/index.html": "dist/venmo-family-webui-demo/index.html",
  "/dist/unified-dashboard-demo/index.html": "dist/unified-dashboard-demo/index.html"
};

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Singularity Portal v9.0</title>
    <script src="/vendor/tailwindcss.js"></script>
    <script src="/vendor/lucide.js"></script>
    <style>
      :root {
        --cyber-snap: cubic-bezier(0.16, 1, 0.3, 1);
        --quantum-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
        --data-flow: cubic-bezier(0.4, 0, 0.2, 1);
        --bg-ink: #0b0f1a;
        --bg-glow: #0f2334;
        --ink: #e7edf6;
        --accent: #1fd18a;
        --accent-2: #5bd6ff;
        --grid: rgba(99, 125, 163, 0.18);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Avenir Next", "Avenir", "Trebuchet MS", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(1200px 800px at 20% 20%, rgba(31, 209, 138, 0.18), transparent 60%),
          radial-gradient(900px 700px at 80% 20%, rgba(91, 214, 255, 0.14), transparent 55%),
          linear-gradient(135deg, #06070f 0%, #0b1221 45%, #0b0f1a 100%);
        min-height: 100vh;
        overflow-x: hidden;
      }

      .portal {
        perspective: 1800px;
        position: relative;
        overflow: hidden;
      }

      .lattice {
        position: absolute;
        inset: -20vh 0 0 0;
        background-image:
          linear-gradient(transparent 93%, var(--grid) 100%),
          linear-gradient(90deg, transparent 93%, var(--grid) 100%);
        background-size: 120px 120px;
        opacity: 0.5;
        transform: translateZ(-900px) scale(1.6);
        transform-origin: center;
        pointer-events: none;
      }

      .singularity-stream {
        position: relative;
        height: 100vh;
        display: grid;
        place-items: center;
        transform-style: preserve-3d;
      }

      .portal-headline {
        text-align: center;
        max-width: 720px;
        padding: 48px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(10, 16, 30, 0.5);
        backdrop-filter: blur(18px);
        transform: translateZ(120px);
        box-shadow: 0 40px 120px rgba(7, 10, 18, 0.6);
      }

      .portal-headline h1 {
        font-size: clamp(2.8rem, 6vw, 4.2rem);
        margin: 0 0 12px 0;
        letter-spacing: -0.02em;
      }

      .portal-headline p {
        margin: 0;
        color: rgba(231, 237, 246, 0.72);
        font-size: 1.1rem;
      }

      .quantum-grid {
        position: relative;
        padding: 120px 8vw 180px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 28px;
        transform-style: preserve-3d;
      }

      .quantum-object {
        position: relative;
        padding: 28px;
        border-radius: 20px;
        background: rgba(12, 20, 36, 0.8);
        border: 1px solid rgba(31, 209, 138, 0.2);
        box-shadow: 0 24px 60px rgba(4, 8, 18, 0.6);
        will-change: transform, opacity, filter;
        transform-style: preserve-3d;
        transition: transform 0.6s var(--cyber-snap), filter 0.3s var(--data-flow);
      }

      .quantum-object h3 {
        margin: 0 0 8px;
        font-size: 1.2rem;
        letter-spacing: 0.02em;
      }

      .quantum-object p {
        margin: 0;
        color: rgba(231, 237, 246, 0.6);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .portal-footer {
        padding: 60px 8vw 120px;
        text-align: center;
        color: rgba(231, 237, 246, 0.6);
      }

      .velocity-skew {
        transform: skewY(clamp(-5deg, var(--scroll-velocity) * 0.1, 5deg));
      }

      @media (max-width: 720px) {
        .portal-headline {
          padding: 32px;
          margin: 0 20px;
        }
        .quantum-grid {
          padding: 80px 6vw 140px;
        }
      }
    </style>
  </head>
  <body>
    <main class="portal">
      <div class="lattice"></div>
      <section class="singularity-stream" data-depth>
        <div class="portal-headline quantum-object" data-magnetic>
          <h1>Singularity Portal v9.0</h1>
          <p>Navigate the infinite data stream. No external CDN. Z-space enabled.</p>
        </div>
      </section>
      <section class="quantum-grid" data-depth>
        <article class="quantum-object" data-magnetic>
          <h3>Z-Axis Sovereignty</h3>
          <p>Sections materialize from depth as the lattice flows past the viewport.</p>
        </article>
        <article class="quantum-object" data-magnetic>
          <h3>Breathing Baseline</h3>
          <p>UI elements drift with noise-driven offsets for a living interface.</p>
        </article>
        <article class="quantum-object" data-magnetic>
          <h3>Latency-Zero Feedback</h3>
          <p>Magnetic hover zones lean into proximity before interaction.</p>
        </article>
        <article class="quantum-object" data-magnetic>
          <h3>Live Dashboards</h3>
          <p><a href="/dist/venmo-family-webui-demo/index.html">Venmo Family</a> and <a href="/dist/unified-dashboard-demo/index.html">Unified</a> are staged locally.</p>
        </article>
      </section>
      <footer class="portal-footer">
        Singularity Portal v9.0 ready. Data stream stabilized.
      </footer>
    </main>
    <script>
      const root = document.documentElement;
      const depthNodes = Array.from(document.querySelectorAll("[data-depth]"));
      const magneticNodes = Array.from(document.querySelectorAll("[data-magnetic]"));

      let lastScrollY = window.scrollY;
      let velocity = 0;

      const noise = (() => {
        const seed = Math.random() * 1000;
        return (x, y) => {
          const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
          return n - Math.floor(n);
        };
      })();

      const updateDepth = () => {
        const scrollY = window.scrollY;
        velocity = velocity * 0.8 + (scrollY - lastScrollY) * 0.2;
        lastScrollY = scrollY;
        root.style.setProperty("--scroll-velocity", velocity.toFixed(2));

        depthNodes.forEach((node, index) => {
          const rect = node.getBoundingClientRect();
          const progress = Math.min(Math.max((window.innerHeight - rect.top) / window.innerHeight, 0), 1);
          const z = -5000 + progress * 5000;
          const opacity = Math.min(1, Math.max(progress * 1.2, 0));
          node.style.transform = `translateZ(${z}px)`;
          node.style.opacity = opacity.toFixed(2);
        });
      };

      const applyBreathing = () => {
        const time = performance.now() * 0.0002;
        magneticNodes.forEach((node, index) => {
          const driftX = (noise(index, time) - 0.5) * 6;
          const driftY = (noise(index + 7, time) - 0.5) * 8;
          const driftZ = (noise(index + 13, time) - 0.5) * 12;
          node.style.transform += ` translate3d(${driftX}px, ${driftY}px, ${driftZ}px)`;
        });
      };

      const update = () => {
        updateDepth();
        applyBreathing();
        requestAnimationFrame(update);
      };

      const onPointerMove = (event) => {
        magneticNodes.forEach((node) => {
          const rect = node.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = event.clientX - cx;
          const dy = event.clientY - cy;
          const distance = Math.hypot(dx, dy);
          if (distance < 100) {
            const pull = (100 - distance) / 100;
            node.style.filter = `brightness(${1 + pull * 0.2})`;
            node.style.transform += ` translate3d(${dx * 0.06}px, ${dy * 0.06}px, ${pull * 40}px)`;
          } else {
            node.style.filter = "brightness(1)";
          }
        });
      };

      window.addEventListener("scroll", updateDepth, { passive: true });
      window.addEventListener("pointermove", onPointerMove);
      update();
    </script>
  </body>
</html>
`;

Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", port });
    }
    if (url.pathname === "/") {
      return new Response(indexHtml, { headers: { "Content-Type": "text/html" } });
    }

    const filePath = routes[url.pathname];
    if (filePath) {
      const asset = Bun.file(filePath);
      return asset.exists().then((exists) => {
        if (!exists) {
          return new Response("Not Found", { status: 404 });
        }
        return new Response(asset);
      });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`[DUOPLUS][DASHBOARD][V56][READY] http://localhost:${port}`);
