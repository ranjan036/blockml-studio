import { defineConfig } from 'vite';

// Builds the shared vision runtime as one ES module (dist/vision-runtime.js).
// The extension scripts themselves are plain files copied by scripts/assemble.mjs.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: 'src/runtime/index.js',
      formats: ['es'],
      fileName: () => 'vision-runtime.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4000,
  },
});
