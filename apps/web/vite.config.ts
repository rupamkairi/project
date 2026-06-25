import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const composes = {
  platform: "../../composes/platform/web/src",
  erp: "../../composes/erp/web/src",
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
      "@projectx/erp-web": path.resolve(__dirname, composes.erp),
      "@projectx/ui": path.resolve(__dirname, packages.ui),
    },
  },
});
