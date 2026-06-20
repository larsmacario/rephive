import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

// Mobile-first SPA. `base: "./"` keeps asset paths relative so the build can be
// wrapped 1:1 by Capacitor (iOS/Android) later without a rewrite.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // Expose the package.json version to the app (stays in sync automatically).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  optimizeDeps: {
    // Capacitor sync copies production bundles under ios/ — don't scan them for dev pre-bundling.
    entries: ["index.html"],
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: ["**/ios/**", "**/android/**", "**/dist/**"],
    },
  },
});
