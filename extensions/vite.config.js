import { defineConfig } from 'vite';

// Builds the shared vision runtime as one ES module (dist/vision-runtime.js).
// The extension scripts themselves are plain files copied by scripts/assemble.mjs.
// js-aruco2 (AprilTag reading for Codes & Cards) is written as browser scripts that put
// AR and CV on `this`. Wrap each file in a function that fills in the object it is given.
const scriptGlobals = {
  name: 'js-aruco2-script-globals',
  enforce: 'pre',
  transform(code, id) {
    if (!/js-aruco2[\\/]src[\\/]/.test(id)) return null;
    const body = code.replace("require('./cv').CV", 'scope.CV');
    return `export default function run(scope) {
  var AR = scope.AR;
  (function () {
${body}
  }).call(scope);
}
`;
  },
};

export default defineConfig({
  plugins: [scriptGlobals],
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
