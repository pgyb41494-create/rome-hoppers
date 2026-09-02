import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/rome-hoppers/" : "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
