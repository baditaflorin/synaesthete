import { defineConfig } from 'vite';

// GitHub Pages serves the project at /<repo-name>/ by default.
// The repo on github.com is https://github.com/baditaflorin/synaesthete so the
// production base path matches. For local dev we want '/'.
const repoBase = '/synaesthete/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? repoBase : '/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Hashed filenames for cache busting.
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
}));
