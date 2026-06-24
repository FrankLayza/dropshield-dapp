import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("wagmi") ||
              id.includes("viem") ||
              id.includes("@rainbow-me") ||
              id.includes("@walletconnect") ||
              id.includes("@metamask") ||
              id.includes("metamask-sdk")
            ) {
              return "vendor-wallet";
            }
            if (
              id.includes("@zama-fhe") ||
              id.includes("@tokenops")
            ) {
              return "vendor-fhe";
            }
            if (
              id.includes("gsap") ||
              id.includes("@gsap") ||
              id.includes("framer-motion") ||
              id.includes("lenis")
            ) {
              return "vendor-anim";
            }
          }
        },
      },
    },
  },
});
