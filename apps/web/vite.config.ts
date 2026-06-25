import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const composes = {
  platform: "../../composes/platform/web/src",
  ecommerceAdmin: "../../composes/ecommerce/web/admin/src",
  ecommerceStorefront: "../../composes/ecommerce/web/storefront/src",
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
      "@projectx/ecommerce-admin": path.resolve(__dirname, composes.ecommerceAdmin),
      "@projectx/ecommerce-storefront": path.resolve(__dirname, composes.ecommerceStorefront),
      "@projectx/platform-web": path.resolve(__dirname, composes.platform),
      "@projectx/ui": path.resolve(__dirname, packages.ui),
    },
  },
});
