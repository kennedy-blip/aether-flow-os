import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import tailwindcss from "tailwindcss";
export default defineConfig({
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  preview: { allowedHosts: [".e2b.app"] },
  build: {
    rollupOptions: {
      onwarn(warn, handle) {
        if (!(
          warn.code === "MODULE_LEVEL_DIRECTIVE" &&
          warn.message.includes("use client")
        ))
          handle(warn);
      },
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            )
              return "react-vendor";
            if (id.includes("/framer-motion/") || id.includes("/motion-"))
              return "motion-vendor";
            if (id.includes("/dexie")) return "storage-vendor";
          }
        },
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ["./index.html", "./src/**/*.{ts,tsx}"],
          corePlugins: { preflight: false },
        }),
      ],
    },
  },
  plugins: [
    {
      name: "offline-shell",
      apply: "build",
      generateBundle(_, bundle) {
        const hash = createHash("sha256");
        for (const [name, file] of Object.entries(bundle)) {
          hash.update(name);
          hash.update(file.type === "asset" ? file.source : file.code);
        }
        const cache = "aether-shell-" + hash.digest("hex").slice(0, 16);
        const urls = [
          "/index.html",
          "/nebula.jpg",
          "/releases/android-installation-guide.txt",
          ...Object.keys(bundle)
            .filter((k) => k.startsWith("assets/"))
            .map((k) => "/" + k),
        ];
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `const CACHE=${JSON.stringify(cache)};const URLS=${JSON.stringify(urls)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('aether-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;if(e.request.mode==='navigate'&&!u.pathname.startsWith('/releases/')){e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));return;}if(URLS.includes(u.pathname))e.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname)).then(r=>r||fetch(e.request)));});`,
        });
      },
    },
  ],
});
