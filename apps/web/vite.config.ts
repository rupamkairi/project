import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const composes = {
  platform: "../../composes/platform/web/src",
};

const packages = {
  ui: "../../packages/ui/src",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@projectx/platform-web": path.resolve(__dirname, composes.platform),
      "@projectx/ui": path.resolve(__dirname, packages.ui),
    },
  },
});
