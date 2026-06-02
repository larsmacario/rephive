import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mobile-first SPA. `base: "./"` keeps asset paths relative so the build can be
// wrapped 1:1 by Capacitor (iOS/Android) later without a rewrite.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: true, port: 5173 },
});
