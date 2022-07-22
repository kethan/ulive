import * as path from "path";
import { defineConfig } from 'vite';
export default defineConfig({
    build: {
        terserOptions: {
            module: true,
            toplevel: true
        },
        minify: "terser",
        lib: {
            entry: path.resolve(__dirname, "./src/index.ts"),
            name: "index",
            formats: ["es", "umd", "cjs", "iife"]
        }
    }
});