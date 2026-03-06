import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { nodePolyfills } from "vite-plugin-node-polyfills"

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node:async_hooks": path.resolve(__dirname, "./src/polyfills/async_hooks.ts"),
    },
  },
  define: {
    global: "globalThis",
  },
  // 多入口配置
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        background: path.resolve(__dirname, "src/background/background.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // background 保持独立文件名
          if (chunkInfo.name === "background") {
            return "background.js"
          }
          return "assets/[name]-[hash].js"
        },
      },
    },
  },
})
