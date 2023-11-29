import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig(() => {
  return {
    root: "src",
    publicDir: "../public",
    base: "/fluid-simulation/",
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      assetsDir: "assets",
    },
    plugins: [glsl()],
    server: {
      host: true,
    },
  };
});