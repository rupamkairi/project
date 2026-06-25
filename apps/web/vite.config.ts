import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const composes = {
  platform: "../../composes/platform/web/src",
  restaurant: "../../composes/restaurant/web/src",
};

const packages = {
  ui: "../../packages/ui/src",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.VITE_PORT) || 10060,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@projectx/platform-web": path.resolve(__dirname, composes.platform),
      "@projectx/restaurant-web": path.resolve(__dirname, composes.restaurant),
      "@projectx/ui": path.resolve(__dirname, packages.ui),
    },
  },
});
