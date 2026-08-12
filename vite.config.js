import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: { host: true },
  // No ssr.noExternal: every map code path is client-only (dynamic import
  // behind ssr=false), and bundling it server-side balloons the function.
  optimizeDeps: {
    // The om:// protocol's OMfile reader is an Emscripten module that locates
    // its binary with `new URL('om_reader_wasm.web.wasm', import.meta.url)`.
    // esbuild's dep pre-bundle rewrites the glue into node_modules/.vite/deps
    // without copying the sibling .wasm, so that URL 404s and every tile
    // decode fails. Serving these packages unbundled keeps import.meta.url
    // pointing at their real dist/ directory, where the .wasm actually lives.
    // Dev-only concern: the production Rollup build already emits the asset.
    exclude: [
      '@openmeteo/weather-map-layer',
      '@openmeteo/file-reader',
      '@openmeteo/file-format-wasm'
    ]
  }
});
